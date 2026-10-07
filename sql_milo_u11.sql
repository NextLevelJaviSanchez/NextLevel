-- Ejecutar en el SQL Editor del proyecto NextLevel.
-- Reemplazar el correo por el acceso jugador/padre creado en Authentication.
-- No crea usuarios ni cambia el acceso de otros perfiles.
begin;
do $$
declare
  access_email text := 'milo@nextlevel.com';
  account_id uuid;
  milo_id uuid;
  matches integer;
begin
  select count(*), min(id::text)::uuid into matches, account_id
    from auth.users where lower(email)=lower(access_email);
  if matches <> 1 then raise exception 'Crear primero el acceso jugador/padre en Authentication y completar su correo.'; end if;
  if exists(select 1 from public.players where user_id=account_id and name <> 'Milo Sánchez') then
    raise exception 'Esta cuenta ya está vinculada a otro jugador. Usar una cuenta propia para Milo.';
  end if;
  select count(*),min(id::text)::uuid into matches,milo_id
    from public.players where name='Milo Sánchez';
  if matches > 1 then raise exception 'Hay perfiles de Milo duplicados: revisar antes de continuar.'; end if;
  if matches = 0 then
    milo_id := gen_random_uuid();
    insert into public.players(id,name,dorsal,category,club,user_id)
      values(milo_id,'Milo Sánchez',5,'Mini U11','Quilmes Atlético Club',account_id);
  else
    if exists(select 1 from public.players where id=milo_id and user_id is not null and user_id <> account_id) then
      raise exception 'Milo ya tiene otra cuenta vinculada: no se reemplaza.';
    end if;
    update public.players set user_id=account_id where id=milo_id;
  end if;
  raise notice 'Perfil Milo listo: %',milo_id;
end $$;
commit;
select id,name,club,category,user_id from public.players where name='Milo Sánchez';
