-- College Chess Club — Supabase schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES  (one row per app user, 1:1 with auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  sc_code text not null unique,                 -- college/student code, unique per person
  chess_com_username text not null unique,       -- Chess.com username, globally unique -> our unique key too
  photo_url text,                                -- pulled from Chess.com profile at signup
  is_admin boolean not null default false,
  ratings jsonb not null default '{"classical":1200,"rapid":1200,"blitz":1200}'::jsonb,
  games_played jsonb not null default '{"classical":0,"rapid":0,"blitz":0}'::jsonb,
  chesscom_ratings jsonb default '{}'::jsonb,     -- cached last-known chess.com rapid/blitz/bullet
  chesscom_synced_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone signed in can read all profiles (search / leaderboard / directory).
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- No direct client-side INSERT/UPDATE — done via SECURITY DEFINER functions below.

-- ============================================================
-- GAMES  (friendly matches + tournament games, one unified table)
-- ============================================================
create table public.games (
  id uuid primary key default gen_random_uuid(),
  white_id uuid not null references public.profiles(id),
  black_id uuid not null references public.profiles(id),
  result text not null check (result in ('white', 'black', 'draw')),
  time_control text not null check (time_control in ('classical', 'rapid', 'blitz')),
  source text not null check (source in ('friendly', 'tournament')),
  tournament_id uuid, -- FK added below, after tournaments table exists
  reporter_id uuid not null references public.profiles(id), -- who submitted the claim / admin who entered it
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  rating_delta_white int,
  rating_delta_black int,
  game_url text,       -- optional link to the actual game (Chess.com/Lichess). NULL -> "Open Match" disabled in UI.
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table public.games enable row level security;

create policy "games are readable by authenticated users"
  on public.games for select
  to authenticated
  using (true);

-- No direct INSERT/UPDATE — done via RPC functions below (keeps rating math atomic & trusted).

-- ============================================================
-- TOURNAMENTS
-- ============================================================
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  format text not null default 'Swiss',
  time_control text not null check (time_control in ('classical', 'rapid', 'blitz')),
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'completed')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.games
  add constraint games_tournament_fk foreign key (tournament_id) references public.tournaments(id);

alter table public.tournaments enable row level security;

create policy "tournaments are readable by authenticated users"
  on public.tournaments for select
  to authenticated
  using (true);

create table public.tournament_standings (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.profiles(id),
  rank int,
  points numeric not null default 0,
  is_winner boolean not null default false,
  unique (tournament_id, player_id)
);

alter table public.tournament_standings enable row level security;

create policy "standings are readable by authenticated users"
  on public.tournament_standings for select
  to authenticated
  using (true);

-- ============================================================
-- CANDIDATES / ANNOUNCEMENTS / NEWS / MATERIAL LINKS
-- (simple admin-managed content tables)
-- ============================================================
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.profiles(id),
  display_name text not null,
  tournament_name text not null,
  photo_url text,
  sort_order int not null default 0
);
alter table public.candidates enable row level security;
create policy "candidates readable by authenticated users" on public.candidates for select to authenticated using (true);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  scope text not null check (scope in ('in-college', 'outside-college')),
  event_date date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
create policy "announcements readable by authenticated users" on public.announcements for select to authenticated using (true);

create table public.news_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text,
  url text,
  published_at date,
  created_at timestamptz not null default now()
);
alter table public.news_items enable row level security;
create policy "news readable by authenticated users" on public.news_items for select to authenticated using (true);

create table public.material_links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  created_by uuid references public.profiles(id)
);
alter table public.material_links enable row level security;
create policy "materials readable by authenticated users" on public.material_links for select to authenticated using (true);

-- ============================================================
-- HELPERS
-- ============================================================
create or replace function public.is_admin(p_user_id uuid)
returns boolean language sql stable as $$
  select coalesce((select is_admin from public.profiles where id = p_user_id), false);
$$;

-- ============================================================
-- SIGNUP: auto-create a profile row from auth.users metadata
-- (Next.js /api/signup route sets these via supabase.auth.admin.createUser)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, sc_code, chess_com_username, photo_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'sc_code',
    new.raw_user_meta_data ->> 'chess_com_username',
    new.raw_user_meta_data ->> 'photo_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ELO CORE  (mirrors src/lib/elo.js — kept in sync manually)
-- ============================================================
create or replace function public._expected_score(rating_a int, rating_b int)
returns numeric language sql immutable as $$
  select 1.0 / (1 + power(10, (rating_b - rating_a) / 400.0));
$$;

create or replace function public._k_factor(games_played int, rating int)
returns int language sql immutable as $$
  select case
    when games_played < 20 then 40
    when rating < 2000 then 20
    else 10
  end;
$$;

-- Applies Elo to both players for a given game row and marks it confirmed.
-- SECURITY DEFINER so it can update profiles despite no client UPDATE policy existing.
create or replace function public._apply_elo(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
  w_rating int; b_rating int; w_games int; b_games int;
  expected_w numeric; expected_b numeric;
  score_w numeric; score_b numeric;
  k_w int; k_b int;
  delta_w int; delta_b int;
begin
  select * into g from public.games where id = p_game_id for update;
  if g is null then raise exception 'game not found'; end if;

  select (ratings ->> g.time_control)::int, (games_played ->> g.time_control)::int
    into w_rating, w_games from public.profiles where id = g.white_id;
  select (ratings ->> g.time_control)::int, (games_played ->> g.time_control)::int
    into b_rating, b_games from public.profiles where id = g.black_id;

  score_w := case g.result when 'white' then 1 when 'draw' then 0.5 else 0 end;
  score_b := 1 - score_w;

  expected_w := public._expected_score(w_rating, b_rating);
  expected_b := 1 - expected_w;

  k_w := public._k_factor(w_games, w_rating);
  k_b := public._k_factor(b_games, b_rating);

  delta_w := round(k_w * (score_w - expected_w));
  delta_b := round(k_b * (score_b - expected_b));

  update public.profiles
    set ratings = jsonb_set(ratings, array[g.time_control], to_jsonb(w_rating + delta_w)),
        games_played = jsonb_set(games_played, array[g.time_control], to_jsonb(w_games + 1))
    where id = g.white_id;

  update public.profiles
    set ratings = jsonb_set(ratings, array[g.time_control], to_jsonb(b_rating + delta_b)),
        games_played = jsonb_set(games_played, array[g.time_control], to_jsonb(b_games + 1))
    where id = g.black_id;

  update public.games
    set status = 'confirmed',
        rating_delta_white = delta_w,
        rating_delta_black = delta_b,
        confirmed_at = now()
    where id = p_game_id;
end;
$$;

-- ============================================================
-- FRIENDLY MATCHES: submit -> opponent confirms/rejects
-- ============================================================

-- p_i_played_white: true if the caller played white
-- p_my_result: 'win' | 'loss' | 'draw' from the caller's perspective
create or replace function public.submit_friendly_game(
  p_opponent_id uuid,
  p_i_played_white boolean,
  p_my_result text,
  p_time_control text,
  p_game_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_white uuid; v_black uuid; v_result text; v_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if auth.uid() = p_opponent_id then raise exception 'cannot play yourself'; end if;

  if p_i_played_white then
    v_white := auth.uid(); v_black := p_opponent_id;
    v_result := case p_my_result when 'win' then 'white' when 'loss' then 'black' else 'draw' end;
  else
    v_white := p_opponent_id; v_black := auth.uid();
    v_result := case p_my_result when 'win' then 'black' when 'loss' then 'white' else 'draw' end;
  end if;

  insert into public.games (white_id, black_id, result, time_control, source, reporter_id, status, game_url)
  values (v_white, v_black, v_result, p_time_control, 'friendly', auth.uid(), 'pending', nullif(trim(p_game_url), ''))
  returning id into v_id;

  return v_id;
end;
$$;

-- Opponent (not the reporter) confirms -> ratings applied atomically.
create or replace function public.confirm_friendly_game(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare g record;
begin
  select * into g from public.games where id = p_game_id;
  if g is null then raise exception 'game not found'; end if;
  if g.status <> 'pending' then raise exception 'game already decided'; end if;
  if g.source <> 'friendly' then raise exception 'not a friendly game'; end if;
  if auth.uid() is null or auth.uid() = g.reporter_id then
    raise exception 'only the other player can confirm this result';
  end if;
  if auth.uid() <> g.white_id and auth.uid() <> g.black_id then
    raise exception 'not a participant in this game';
  end if;

  perform public._apply_elo(p_game_id);
end;
$$;

create or replace function public.reject_friendly_game(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare g record;
begin
  select * into g from public.games where id = p_game_id;
  if g is null then raise exception 'game not found'; end if;
  if g.status <> 'pending' then raise exception 'game already decided'; end if;
  if auth.uid() is null or auth.uid() = g.reporter_id then
    raise exception 'only the other player can reject this result';
  end if;

  update public.games set status = 'rejected' where id = p_game_id;
end;
$$;

-- ============================================================
-- ADMIN: tournament creation + recording tournament game wins
-- (auto-verified: an admin is the one entering the result)
-- ============================================================
create or replace function public.admin_create_tournament(
  p_name text, p_date date, p_format text, p_time_control text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_admin(auth.uid()) then raise exception 'admin only'; end if;
  insert into public.tournaments (name, date, format, time_control, created_by)
  values (p_name, p_date, p_format, p_time_control, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_record_tournament_game(
  p_tournament_id uuid, p_white_id uuid, p_black_id uuid, p_result text, p_time_control text,
  p_game_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_admin(auth.uid()) then raise exception 'admin only'; end if;

  insert into public.games (white_id, black_id, result, time_control, source, tournament_id, reporter_id, status, game_url)
  values (p_white_id, p_black_id, p_result, p_time_control, 'tournament', p_tournament_id, auth.uid(), 'pending', nullif(trim(p_game_url), ''))
  returning id into v_id;

  perform public._apply_elo(v_id);
  return v_id;
end;
$$;

create or replace function public.admin_set_tournament_status(p_tournament_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'admin only'; end if;
  update public.tournaments set status = p_status where id = p_tournament_id;
end;
$$;

create or replace function public.admin_upsert_standing(
  p_tournament_id uuid, p_player_id uuid, p_rank int, p_points numeric, p_is_winner boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'admin only'; end if;
  insert into public.tournament_standings (tournament_id, player_id, rank, points, is_winner)
  values (p_tournament_id, p_player_id, p_rank, p_points, p_is_winner)
  on conflict (tournament_id, player_id)
  do update set rank = excluded.rank, points = excluded.points, is_winner = excluded.is_winner;
end;
$$;

-- ============================================================
-- ADMIN UNLOCK: simple shared password -> flips is_admin for the caller.
-- Good enough for a small club site; change the password below if needed.
-- ============================================================
create or replace function public.claim_admin(p_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_password <> 'iamadmin' then
    return false;
  end if;
  update public.profiles set is_admin = true where id = auth.uid();
  return true;
end;
$$;

-- Grant the first admin manually after signup, e.g.:
--   update public.profiles set is_admin = true where sc_code = 'YOUR_SC_CODE';
