-- Permitir un dorsal desconocido sin inventar un número.
-- Conserva los dorsales existentes. Puede ejecutarse más de una vez.
alter table public.players alter column dorsal drop not null;

-- Instalar una vez en SQL Editor. RPC privada invocada por la función del servidor.
create or replace function public.onboard_nextlevel_player(account_id uuid, display_name text, club_name text, category_name text, shirt_number integer, season_value text, configuration jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare result_id uuid; duplicates integer;
begin
 if not exists(select 1 from auth.users where id=account_id) then raise exception 'Cuenta inexistente'; end if;
 if season_value !~ '^20[0-9]{2}$' or configuration->>'template' not in ('mini','u13') then raise exception 'Configuración inválida'; end if;
 perform pg_advisory_xact_lock(hashtextextended(account_id::text,0));
 perform pg_advisory_xact_lock(hashtextextended((configuration->>'cabbName')||club_name||season_value,1));
 if exists(select 1 from player_data d join players p on p.id=d.player_id where d.module='player_season_v1:'||season_value and d.data->>'cabbName'=configuration->>'cabbName' and d.data->>'club'=club_name and p.user_id is distinct from account_id) then raise exception 'Jugador oficial ya vinculado a otra cuenta'; end if;
 select count(*),min(id::text)::uuid into duplicates,result_id from players where user_id=account_id;
 if duplicates>1 then raise exception 'La cuenta tiene varios jugadores: revisar antes de continuar'; end if;
 if duplicates=1 and not exists(select 1 from players where id=result_id and name=display_name) then raise exception 'La cuenta ya corresponde a otro jugador'; end if;
 if duplicates=0 then result_id:=gen_random_uuid();insert into players(id,name,club,category,dorsal,user_id) values(result_id,display_name,club_name,category_name,shirt_number,account_id); end if;
 update players set category=category_name where id=result_id;
 insert into player_data(player_id,module,data,updated_at) values(result_id,'player_season_v1:'||season_value,configuration,now()) on conflict(player_id,module) do update set data=excluded.data,updated_at=excluded.updated_at;
 return result_id;
end $$;
revoke all on function public.onboard_nextlevel_player(uuid,text,text,text,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.onboard_nextlevel_player(uuid,text,text,text,integer,text,jsonb) to service_role;
