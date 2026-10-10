begin;
create table if not exists nextlevel_private.staff_accounts(user_id uuid primary key references auth.users(id) on delete cascade, role text not null check(role='admin_coach'), active boolean not null default false, granted_at timestamptz not null default now());
alter table nextlevel_private.staff_accounts enable row level security;
revoke all on nextlevel_private.staff_accounts from public,anon,authenticated;
do $$ begin
 if (select count(*) from auth.users where id='275323dc-c40c-4e3d-b6db-00147bf30b4d' and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<now()))<>1 then raise exception 'La cuenta verificada del administrador no está disponible'; end if;
end $$;
insert into nextlevel_private.staff_accounts(user_id,role,active) values('275323dc-c40c-4e3d-b6db-00147bf30b4d','admin_coach',true) on conflict(user_id) do update set role=excluded.role,active=excluded.active;
create or replace function nextlevel_private.is_admin_coach() returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from nextlevel_private.staff_accounts s join auth.users u on u.id=s.user_id where s.user_id=auth.uid() and s.role='admin_coach' and s.active and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<now())); $$;
revoke all on function nextlevel_private.is_admin_coach() from public,anon;
grant execute on function nextlevel_private.is_admin_coach() to authenticated;
create or replace function public.nextlevel_access_role() returns text language sql stable security definer set search_path='' as $$ select case when nextlevel_private.is_admin_coach() then 'admin_coach' else 'player' end; $$;
revoke all on function public.nextlevel_access_role() from public,anon;
grant execute on function public.nextlevel_access_role() to authenticated;
do $$ declare name text; begin
 foreach name in array array['players','player_data','game_log','stats_seasons','physical_test_results','evaluations','intake_responses','photos','messages','message_replies','message_reactions','plan_progress'] loop
  if to_regclass('public.'||name) is null then continue; end if;
  execute format('drop policy if exists nl_admin_coach_read on public.%I',name);
  execute format('create policy nl_admin_coach_read on public.%I for select to authenticated using (nextlevel_private.is_admin_coach())',name);
 end loop;
end $$;
drop policy if exists nl_admin_coach_insert on public.player_data;
drop policy if exists nl_admin_coach_update on public.player_data;
create policy nl_admin_coach_insert on public.player_data for insert to authenticated with check(nextlevel_private.is_admin_coach() and exists(select 1 from public.players p where p.id=player_id) and ((module in ('perfil_v1','mini_profile_v1','foto_url','profile_dorsal_v1','obj_estados_v1') or starts_with(module,'plan_progress_v1:') or starts_with(module,'mini_measures_v1:') or starts_with(module,'gradual_goals_v1:')) or ((module='coach_eval_v1' or starts_with(module,'coach_conversation_v1:')) and data->>'author_id'=auth.uid()::text and data->>'author_type'='coach')));
create policy nl_admin_coach_update on public.player_data for update to authenticated using(nextlevel_private.is_admin_coach()) with check(nextlevel_private.is_admin_coach() and exists(select 1 from public.players p where p.id=player_id) and ((module in ('perfil_v1','mini_profile_v1','foto_url','profile_dorsal_v1','obj_estados_v1') or starts_with(module,'plan_progress_v1:') or starts_with(module,'mini_measures_v1:') or starts_with(module,'gradual_goals_v1:')) or ((module='coach_eval_v1' or starts_with(module,'coach_conversation_v1:')) and data->>'author_id'=auth.uid()::text and data->>'author_type'='coach')));
drop policy if exists nl_admin_coach_evaluation_insert on public.evaluations;
create policy nl_admin_coach_evaluation_insert on public.evaluations for insert to authenticated with check(nextlevel_private.is_admin_coach() and exists(select 1 from public.players p where p.id=player_id));
drop policy if exists nl_owner_conversation_insert on public.player_data;
create policy nl_owner_conversation_insert on public.player_data for insert to authenticated with check(nextlevel_private.owns_player(player_id) and starts_with(module,'coach_conversation_v1:') and data->>'author_id'=auth.uid()::text and data->>'author_type'='player');
commit;
