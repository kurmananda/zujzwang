-- Allows the public home page ("/") to show real data to signed-out visitors.
-- Existing "readable by authenticated users" policies are left in place;
-- this just adds a matching policy for the anon role on the same tables,
-- scoped to SELECT only — no write access is granted.
-- Run once in the Supabase SQL editor.

create policy "profiles are readable by anon"
  on public.profiles for select
  to anon
  using (true);

create policy "games are readable by anon"
  on public.games for select
  to anon
  using (true);

create policy "tournaments are readable by anon"
  on public.tournaments for select
  to anon
  using (true);

create policy "standings are readable by anon"
  on public.tournament_standings for select
  to anon
  using (true);
