-- Corrección puntual. Conserva cuenta, estadísticas y progreso.
begin;
do $$
declare target_id uuid; config jsonb; matches integer;
begin
 select count(*), min(id::text)::uuid into matches,target_id from public.players
 where upper(trim(name))='NIEVAS, RAMIRO IGNACIO' and upper(club) like '%QUILMES%';
 if matches<>1 then raise exception 'Se esperaba un único perfil de Ramiro; encontrados: %',matches; end if;
 select data into config from public.player_data where player_id=target_id and module='player_season_v1:2026';
 if config is null then raise exception 'Falta configuración de temporada'; end if;
 if not exists(select 1 from jsonb_array_elements(config->'tournaments') t where upper(t->>'categoryName') ~ '(CADET|U[ -]?15)') then raise exception 'No se encontró el torneo Cadetes/U15 seleccionado'; end if;
 update public.players set category='U15' where id=target_id;
 update public.player_data set data=jsonb_set(jsonb_set(data,'{category}','"U15"'::jsonb),'{template}','"u13"'::jsonb),updated_at=now()
 where player_id=target_id and module='player_season_v1:2026';
end $$;
commit;
select name,category from public.players where upper(trim(name))='NIEVAS, RAMIRO IGNACIO';
