begin;
create schema if not exists nextlevel_private;
revoke all on schema nextlevel_private from public, anon;
grant usage on schema nextlevel_private to authenticated;
create table if not exists nextlevel_private.security_snapshots(captured_at timestamptz primary key default clock_timestamp(),metadata jsonb not null);
revoke all on nextlevel_private.security_snapshots from public,anon,authenticated;
insert into nextlevel_private.security_snapshots(metadata) select jsonb_build_object(
'policies',(select jsonb_agg(to_jsonb(p)) from pg_policies p where schemaname in ('public','storage')),
'relations',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'acl',c.relacl)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','storage') and c.relkind in ('r','p','v','m','f')),
'functions',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'acl',p.proacl)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),
'defaults',(select jsonb_agg(to_jsonb(d)) from pg_default_acl d),
'buckets',(select jsonb_agg(jsonb_build_object('id',id,'public',public)) from storage.buckets));
create or replace function nextlevel_private.owns_player(target uuid) returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from public.players p where p.id=target and p.user_id=auth.uid()); $$;
revoke all on function nextlevel_private.owns_player(uuid) from public,anon;
grant execute on function nextlevel_private.owns_player(uuid) to authenticated;
do $$ declare t record; pol record; predicate text; begin
if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='players' and column_name='user_id') then raise exception 'Falta players.user_id'; end if;
for t in select c.relname,c.relkind from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m','f') loop
execute format('revoke all on public.%I from public,anon,authenticated',t.relname);
if t.relkind not in ('r','p') then continue; end if;
execute format('alter table public.%I enable row level security',t.relname);
for pol in select policyname from pg_policies where schemaname='public' and tablename=t.relname loop execute format('drop policy %I on public.%I',pol.policyname,t.relname); end loop;
predicate:=null;
if t.relname='players' then predicate:='user_id=(select auth.uid())';
elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name=t.relname and column_name='player_id' and udt_name='uuid') then predicate:='nextlevel_private.owns_player(player_id)'; end if;
if predicate is not null then execute format('grant select on public.%I to authenticated',t.relname); execute format('create policy nl_owner_read on public.%I for select to authenticated using (%s)',t.relname,predicate); end if;
end loop; end $$;
do $$ declare name text; check_expression text; begin
foreach name in array array['player_data','intake_responses','physical_test_results','evaluations','plan_progress','photos','message_replies','message_reactions'] loop
if to_regclass('public.'||name) is null then continue; end if;
if not exists(select 1 from information_schema.columns where table_schema='public' and table_name=name and column_name='player_id' and udt_name='uuid') then raise exception 'Tabla % sin player_id uuid',name; end if;
check_expression:='nextlevel_private.owns_player(player_id)';
if name='player_data' then check_expression:=check_expression||$x$ and (module in ('perfil_v1','mini_profile_v1','foto_url','profile_dorsal_v1','obj_estados_v1') or starts_with(module,'plan_progress_v1:') or starts_with(module,'mini_measures_v1:') or starts_with(module,'gradual_goals_v1:'))$x$;
elsif name='physical_test_results' then check_expression:=check_expression||' and source = ''self''';
elsif name in ('message_replies','message_reactions') then check_expression:=check_expression||format(' and exists(select 1 from public.messages m where m.id=%I.message_id and (m.player_id=%I.player_id or m.player_id is null))',name,name); end if;
execute format('grant insert,update,delete on public.%I to authenticated',name);
execute format('create policy nl_owner_insert on public.%I for insert to authenticated with check (%s)',name,check_expression);
execute format('create policy nl_owner_update on public.%I for update to authenticated using (%s) with check (%s)',name,check_expression,check_expression);
execute format('create policy nl_owner_delete on public.%I for delete to authenticated using (%s)',name,check_expression);
end loop; end $$;
do $$ declare f record; begin for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' loop execute format('revoke execute on function %s from public,anon,authenticated',f.signature); end loop; end $$;
alter default privileges in schema public revoke all on tables from anon,authenticated;
alter default privileges in schema public revoke execute on functions from public,anon,authenticated;
update storage.buckets set public=false where id='player-photos';
create or replace function nextlevel_private.owns_photo(object_name text) returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from public.players p where p.user_id=auth.uid() and (split_part(object_name,'/',1)=p.id::text or (split_part(object_name,'/',1)='mia14' and p.id='11111111-0000-0000-0000-000000000014'::uuid))); $$;
revoke all on function nextlevel_private.owns_photo(text) from public,anon;
grant execute on function nextlevel_private.owns_photo(text) to authenticated;
drop policy if exists nl_photos_boundary on storage.objects;
drop policy if exists nl_photos_owner on storage.objects;
create policy nl_photos_boundary on storage.objects as restrictive for all to anon,authenticated using(bucket_id<>'player-photos' or nextlevel_private.owns_photo(name)) with check(bucket_id<>'player-photos' or nextlevel_private.owns_photo(name));
create policy nl_photos_owner on storage.objects for all to authenticated using(bucket_id='player-photos' and nextlevel_private.owns_photo(name)) with check(bucket_id='player-photos' and nextlevel_private.owns_photo(name));
commit;