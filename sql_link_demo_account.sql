-- Primero crear demo@nextlevel.com en Supabase > Authentication > Users.
-- Elegir una contraseña y activar Auto Confirm User.
-- Luego ejecutar este archivo en SQL Editor.
begin;
do $$
declare demo_id uuid := 'de000000-0000-4000-8000-000000000013'; account_id uuid; matches integer;
begin
 if not exists(select 1 from public.players where id=demo_id) then raise exception 'Primero ejecutar sql_create_demo_mia.sql'; end if;
 if not exists(select 1 from public.player_data where player_id=demo_id and module='player_season_v1:2026' and data->>'isDemo'='true') then raise exception 'El perfil no está marcado como DEMO'; end if;
 select count(*),min(id::text)::uuid into matches,account_id from auth.users where lower(email)='demo@nextlevel.com';
 if matches<>1 then raise exception 'Crear primero la cuenta demo@nextlevel.com en Authentication > Users'; end if;
 if exists(select 1 from public.players where user_id=account_id and id<>demo_id) then raise exception 'Esta cuenta ya está vinculada a otro jugador'; end if;
 if exists(select 1 from public.players where id=demo_id and user_id is not null and user_id<>account_id) then raise exception 'La demo ya tiene otra cuenta vinculada'; end if;
 update public.players set user_id=account_id where id=demo_id;
end $$;
commit;
select p.name,p.club,p.category,u.email from public.players p join auth.users u on u.id=p.user_id where p.id='de000000-0000-4000-8000-000000000013';
