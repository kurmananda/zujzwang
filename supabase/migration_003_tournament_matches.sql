-- Run this in the Supabase SQL editor after migration_002.
-- Adds: tournament start/end dates, a roster table, a generated match schedule
-- (round robin or Swiss), and admin RPCs to create tournaments with players,
-- record per-match results, advance Swiss rounds, and finalize standings.

alter table public.tournaments alter column date drop not null;
alter table public.tournaments add column if not exists start_date date;
alter table public.tournaments add column if not exists end_date date;

update public.tournaments set start_date = date where start_date is null;
update public.tournaments set end_date = date where end_date is null;

-- ============================================================
-- ROSTER
-- ============================================================
create table if not exists public.tournament_players (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.profiles(id),
  seed int,
  primary key (tournament_id, player_id)
);
alter table public.tournament_players enable row level security;
create policy "tournament players are readable by authenticated users"
  on public.tournament_players for select to authenticated using (true);

-- ============================================================
-- GENERATED MATCH SCHEDULE
-- ============================================================
create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round int not null,
  board_no int not null,
  white_id uuid references public.profiles(id),
  black_id uuid references public.profiles(id), -- null = bye
  result text check (result in ('white', 'black', 'draw')),
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  game_id uuid references public.games(id),
  created_at timestamptz not null default now()
);
alter table public.tournament_matches enable row level security;
create policy "tournament matches are readable by authenticated users"
  on public.tournament_matches for select to authenticated using (true);

-- ============================================================
-- Create a tournament with a chosen roster + generated schedule.
-- p_format: 'round_robin' generates the full schedule up front (circle method).
--           'swiss' generates only round 1 (random pairing); call
--           admin_generate_next_swiss_round() once a round is fully confirmed.
-- ============================================================
create or replace function public.admin_create_tournament_full(
  p_name text,
  p_start_date date,
  p_end_date date,
  p_format text,
  p_time_control text,
  p_player_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
  v_ids uuid[];
  v_n int;
  v_rounds int;
  v_round int;
  v_board int;
  v_i int;
  v_a uuid; v_b uuid;
  v_arr uuid[];
begin
  if not public.is_admin(auth.uid()) then raise exception 'admin only'; end if;
  if array_length(p_player_ids, 1) is null or array_length(p_player_ids, 1) < 2 then
    raise exception 'pick at least 2 players';
  end if;

  insert into public.tournaments (name, date, start_date, end_date, format, time_control, created_by, status)
  values (p_name, p_start_date, p_start_date, p_end_date, p_format, p_time_control, auth.uid(), 'upcoming')
  returning id into v_tournament_id;

  insert into public.tournament_players (tournament_id, player_id, seed)
  select v_tournament_id, pid, ord
  from unnest(p_player_ids) with ordinality as t(pid, ord);

  v_ids := p_player_ids;
  v_n := array_length(v_ids, 1);

  if p_format = 'round_robin' then
    -- circle method: fix player 1, rotate the rest. Add a NULL "bye" slot if odd.
    if v_n % 2 = 1 then
      v_ids := v_ids || array[null::uuid];
      v_n := v_n + 1;
    end if;
    v_rounds := v_n - 1;
    v_arr := v_ids;

    for v_round in 1..v_rounds loop
      v_board := 1;
      for v_i in 1..(v_n / 2) loop
        v_a := v_arr[v_i];
        v_b := v_arr[v_n - v_i + 1];
        if v_a is not null and v_b is not null then
          insert into public.tournament_matches (tournament_id, round, board_no, white_id, black_id)
          values (v_tournament_id, v_round, v_board,
                  case when v_round % 2 = 1 then v_a else v_b end,
                  case when v_round % 2 = 1 then v_b else v_a end);
          v_board := v_board + 1;
        end if;
      end loop;
      -- rotate all but the first fixed element
      v_arr := array[v_arr[1]] || v_arr[v_n] || v_arr[2:v_n - 1];
    end loop;

  else
    -- swiss round 1: shuffle and pair sequentially
    select array_agg(pid order by random()) into v_arr from unnest(v_ids) as t(pid);
    v_board := 1;
    v_i := 1;
    while v_i + 1 <= v_n loop
      insert into public.tournament_matches (tournament_id, round, board_no, white_id, black_id)
      values (v_tournament_id, 1, v_board, v_arr[v_i], v_arr[v_i + 1]);
      v_board := v_board + 1;
      v_i := v_i + 2;
    end loop;
    if v_i <= v_n then
      -- odd one out: a bye (no opponent, no game row)
      insert into public.tournament_matches (tournament_id, round, board_no, white_id, black_id, status)
      values (v_tournament_id, 1, v_board, v_arr[v_i], null, 'confirmed');
    end if;
  end if;

  return v_tournament_id;
end;
$$;

-- Pair the next Swiss round by current score, avoiding rematches where possible.
-- Requires every match in the current round to be confirmed first.
create or replace function public.admin_generate_next_swiss_round(p_tournament_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_round int;
  v_next_round int;
  v_pending int;
  v_ranked uuid[];
  v_played boolean[][]; -- not used; rematch-avoidance done via EXISTS check below
  v_remaining uuid[];
  v_a uuid; v_b uuid;
  v_board int := 1;
  v_pick int;
begin
  if not public.is_admin(auth.uid()) then raise exception 'admin only'; end if;

  select max(round) into v_current_round from public.tournament_matches where tournament_id = p_tournament_id;
  if v_current_round is null then raise exception 'no rounds yet'; end if;

  select count(*) into v_pending from public.tournament_matches
    where tournament_id = p_tournament_id and round = v_current_round and status = 'pending';
  if v_pending > 0 then raise exception 'current round is not fully recorded yet'; end if;

  v_next_round := v_current_round + 1;

  -- rank players by points (win=1, draw=0.5), byes count as 1 point
  select array_agg(player_id order by points desc, random())
    into v_ranked
  from (
    select tp.player_id,
      coalesce(sum(case
        when tm.white_id = tp.player_id and tm.result = 'white' then 1
        when tm.black_id = tp.player_id and tm.result = 'black' then 1
        when tm.result = 'draw' and (tm.white_id = tp.player_id or tm.black_id = tp.player_id) then 0.5
        when tm.black_id is null and tm.white_id = tp.player_id then 1
        else 0
      end), 0) as points
    from public.tournament_players tp
    left join public.tournament_matches tm
      on tm.tournament_id = p_tournament_id
     and (tm.white_id = tp.player_id or tm.black_id = tp.player_id)
    where tp.tournament_id = p_tournament_id
    group by tp.player_id
  ) s;

  v_remaining := v_ranked;
  while array_length(v_remaining, 1) >= 2 loop
    v_a := v_remaining[1];
    v_pick := 2;
    -- find the highest-ranked remaining opponent v_a hasn't already played
    while v_pick <= array_length(v_remaining, 1) and exists (
      select 1 from public.tournament_matches
      where tournament_id = p_tournament_id
        and ((white_id = v_a and black_id = v_remaining[v_pick]) or (white_id = v_remaining[v_pick] and black_id = v_a))
    ) loop
      v_pick := v_pick + 1;
    end loop;
    if v_pick > array_length(v_remaining, 1) then v_pick := 2; end if; -- everyone's been played: rematch it
    v_b := v_remaining[v_pick];

    if v_b is null then
      insert into public.tournament_matches (tournament_id, round, board_no, white_id, black_id, status)
      values (p_tournament_id, v_next_round, v_board, v_a, null, 'confirmed');
    else
      insert into public.tournament_matches (tournament_id, round, board_no, white_id, black_id)
      values (p_tournament_id, v_next_round, v_board, v_a, v_b);
    end if;
    v_board := v_board + 1;
    v_remaining := array_remove(v_remaining, v_a);
    v_remaining := array_remove(v_remaining, v_b);
  end loop;
  if array_length(v_remaining, 1) = 1 then
    insert into public.tournament_matches (tournament_id, round, board_no, white_id, black_id, status)
    values (p_tournament_id, v_next_round, v_board, v_remaining[1], null, 'confirmed');
  end if;

  update public.tournaments set status = 'live' where id = p_tournament_id and status = 'upcoming';

  return v_next_round;
end;
$$;

-- Record a result for one scheduled match: creates the underlying game (rating-applied)
-- and marks the match confirmed.
create or replace function public.admin_record_match_result(
  p_match_id uuid, p_result text, p_game_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  t record;
  v_game_id uuid;
begin
  if not public.is_admin(auth.uid()) then raise exception 'admin only'; end if;

  select * into m from public.tournament_matches where id = p_match_id;
  if m is null then raise exception 'match not found'; end if;
  if m.status = 'confirmed' then raise exception 'result already recorded'; end if;
  if m.black_id is null then raise exception 'this board is a bye'; end if;

  select * into t from public.tournaments where id = m.tournament_id;

  insert into public.games (white_id, black_id, result, time_control, source, tournament_id, reporter_id, status, game_url)
  values (m.white_id, m.black_id, p_result, t.time_control, 'tournament', m.tournament_id, auth.uid(), 'pending', nullif(trim(p_game_url), ''))
  returning id into v_game_id;

  perform public._apply_elo(v_game_id);

  update public.tournament_matches set result = p_result, status = 'confirmed', game_id = v_game_id where id = p_match_id;
  update public.tournaments set status = 'live' where id = m.tournament_id and status = 'upcoming';

  return v_game_id;
end;
$$;

-- Compute final standings from confirmed matches, mark the top scorer(s) as winner,
-- and close out the tournament.
create or replace function public.admin_finalize_tournament(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_top numeric;
begin
  if not public.is_admin(auth.uid()) then raise exception 'admin only'; end if;

  with scored as (
    select tp.player_id,
      coalesce(sum(case
        when tm.white_id = tp.player_id and tm.result = 'white' then 1
        when tm.black_id = tp.player_id and tm.result = 'black' then 1
        when tm.result = 'draw' and (tm.white_id = tp.player_id or tm.black_id = tp.player_id) then 0.5
        when tm.black_id is null and tm.white_id = tp.player_id then 1
        else 0
      end), 0) as points
    from public.tournament_players tp
    left join public.tournament_matches tm
      on tm.tournament_id = p_tournament_id
     and (tm.white_id = tp.player_id or tm.black_id = tp.player_id)
    where tp.tournament_id = p_tournament_id
    group by tp.player_id
  ),
  ranked as (
    select player_id, points, rank() over (order by points desc) as rnk
    from scored
  )
  select max(points) into v_top from scored;

  insert into public.tournament_standings (tournament_id, player_id, rank, points, is_winner)
  select p_tournament_id, player_id, rnk, points, points = v_top
  from ranked
  on conflict (tournament_id, player_id)
  do update set rank = excluded.rank, points = excluded.points, is_winner = excluded.is_winner;

  update public.tournaments set status = 'completed' where id = p_tournament_id;
end;
$$;
