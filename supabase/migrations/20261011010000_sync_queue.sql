-- Prepared restoration migration. Not executed in the production project.
begin;
create table if not exists public.nextlevel_sync_jobs (
 id uuid primary key default gen_random_uuid(),
 requested_by uuid not null references auth.users(id),
 player_id uuid not null references public.players(id),
 season text not null check(season ~ '^20[0-9]{2}$'),
 status text not null default 'queued' check(status in ('queued','running','completed','failed')),
 created_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz,
 lease_token uuid, error_code text check(error_code in ('import_failure','coverage','official_source','identity','worker_timeout'))
);
create unique index if not exists nextlevel_sync_active_job on public.nextlevel_sync_jobs(player_id,season) where status in ('queued','running');
alter table public.nextlevel_sync_jobs enable row level security;
revoke all on public.nextlevel_sync_jobs from public,anon,authenticated;
grant select(id,requested_by,player_id,season,status,created_at,started_at,finished_at,error_code) on public.nextlevel_sync_jobs to authenticated;
grant all on public.nextlevel_sync_jobs to service_role;
drop policy if exists nextlevel_coach_sync_read on public.nextlevel_sync_jobs;
create policy nextlevel_coach_sync_read on public.nextlevel_sync_jobs for select to authenticated using(nextlevel_private.is_admin_coach() and requested_by=auth.uid());

create or replace function public.nextlevel_request_sync(player_ids uuid[],season_value text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid; result jsonb;
begin
 if not nextlevel_private.is_admin_coach() then raise exception 'Coach requerido' using errcode='42501'; end if;
 if season_value is null or season_value !~ '^20[0-9]{2}$' or player_ids is null or cardinality(player_ids) not between 1 and 100 or array_position(player_ids,null) is not null then raise exception 'Solicitud inválida'; end if;
 -- Validate the whole selection before enqueueing any player.
 if exists(select 1 from unnest(player_ids) selected(id) where not exists(
  select 1 from public.players p join public.player_data d on d.player_id=p.id
  where p.id=selected.id and d.module='player_season_v1:'||season_value and jsonb_typeof(d.data)='object'
  and coalesce(lower(d.data->>'isDemo'),'false')<>'true'
 )) then raise exception 'La selección contiene un perfil sin configuración oficial o demo'; end if;
 foreach target in array player_ids loop
  insert into public.nextlevel_sync_jobs(requested_by,player_id,season) values(auth.uid(),target,season_value)
  on conflict(player_id,season) where status in ('queued','running') do nothing;
 end loop;
 select coalesce(jsonb_agg(to_jsonb(j)-'lease_token' order by j.created_at,j.id),'[]'::jsonb) into result from public.nextlevel_sync_jobs j where j.requested_by=auth.uid() and j.player_id=any(player_ids) and j.season=season_value and j.status in ('queued','running');
 return result;
end $$;
revoke all on function public.nextlevel_request_sync(uuid[],text) from public,anon,authenticated;
grant execute on function public.nextlevel_request_sync(uuid[],text) to authenticated;

create or replace function public.nextlevel_claim_sync()
returns setof public.nextlevel_sync_jobs language plpgsql security definer set search_path='' as $$
declare selected uuid;
begin
 -- A stale worker may have written part of an import: mark it failed for explicit retry.
 update public.nextlevel_sync_jobs set status='failed',error_code='worker_timeout',finished_at=now(),lease_token=null where status='running' and started_at<now()-interval '50 minutes';
 select id into selected from public.nextlevel_sync_jobs where status='queued' order by created_at,id for update skip locked limit 1;
 if selected is null then return; end if;
 return query update public.nextlevel_sync_jobs set status='running',started_at=now(),lease_token=gen_random_uuid() where id=selected returning *;
end $$;
revoke all on function public.nextlevel_claim_sync() from public,anon,authenticated;
grant execute on function public.nextlevel_claim_sync() to service_role;

create or replace function public.nextlevel_finish_sync(job_id uuid,job_lease uuid,failure_code text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare touched integer;
begin
 if failure_code is not null and failure_code not in ('import_failure','coverage','official_source','identity') then raise exception 'Código inválido'; end if;
 update public.nextlevel_sync_jobs set status=case when failure_code is null then 'completed' else 'failed' end,error_code=failure_code,finished_at=now(),lease_token=null where id=job_id and lease_token=job_lease and status='running';
 get diagnostics touched=row_count;return touched=1;
end $$;
revoke all on function public.nextlevel_finish_sync(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.nextlevel_finish_sync(uuid,uuid,text) to service_role;
commit;
