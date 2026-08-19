-- Run this in the Supabase SQL editor after supabase/schema.sql.
-- Adds: game link field, admin password unlock, updated RPCs to accept a game link.

alter table public.games add column if not exists game_url text;

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
