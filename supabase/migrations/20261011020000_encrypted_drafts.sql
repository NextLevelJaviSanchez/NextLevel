-- Prepared restoration migration: private, account-bound recovery of pending edits.
begin;
create table if not exists nextlevel_private.draft_keys(
 account_id uuid not null references auth.users(id),player_id uuid not null references public.players(id),
 key_bytes bytea not null check(octet_length(key_bytes)=32),created_at timestamptz not null default now(),
 primary key(account_id,player_id)
);
alter table nextlevel_private.draft_keys enable row level security;
revoke all on nextlevel_private.draft_keys from public,anon,authenticated;
create or replace function public.nextlevel_draft_key(profile_id uuid,candidate_key text)
returns text language plpgsql security definer set search_path='' as $$
declare value bytea;
begin
 if auth.uid() is null or not exists(select 1 from public.players p where p.id=profile_id and (p.user_id=auth.uid() or nextlevel_private.is_admin_coach())) then raise exception 'Perfil no autorizado' using errcode='42501'; end if;
 if candidate_key is null or length(candidate_key)>64 then raise exception 'Clave inválida'; end if;
 value=decode(candidate_key,'base64');if octet_length(value)<>32 then raise exception 'Clave inválida'; end if;
 insert into nextlevel_private.draft_keys(account_id,player_id,key_bytes) values(auth.uid(),profile_id,value) on conflict(account_id,player_id) do nothing;
 value := (select key_bytes from nextlevel_private.draft_keys where account_id=auth.uid() and player_id=profile_id);
 return encode(value,'base64');
end $$;
revoke all on function public.nextlevel_draft_key(uuid,text) from public,anon,authenticated;
grant execute on function public.nextlevel_draft_key(uuid,text) to authenticated;
commit;
