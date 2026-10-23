-- Solo respuestas propias de Mini U9/U11. No permite cambiar estadísticas CAB.
begin;
create policy nl_mini_points_insert on public.player_data for insert to authenticated
with check (
 nextlevel_private.owns_player(player_id)
 and exists(select 1 from public.players p where p.id=player_id and upper(p.category) ~ '\m(U9|U11)\M')
 and module ~ '^mini_level_points_v1:20[0-9]{2}:[a-zA-Z0-9_-]{1,80}$'
 and jsonb_typeof(data)='object'
 and data->>'version'='1'
 and not (data ?| array['pts','tl_in','tl_att','fouls_received','total','played'])
);
create policy nl_mini_points_update on public.player_data for update to authenticated
using (
 nextlevel_private.owns_player(player_id)
 and module ~ '^mini_level_points_v1:20[0-9]{2}:[a-zA-Z0-9_-]{1,80}$'
)
with check (
 nextlevel_private.owns_player(player_id)
 and exists(select 1 from public.players p where p.id=player_id and upper(p.category) ~ '\m(U9|U11)\M')
 and module ~ '^mini_level_points_v1:20[0-9]{2}:[a-zA-Z0-9_-]{1,80}$'
 and jsonb_typeof(data)='object'
 and data->>'version'='1'
 and not (data ?| array['pts','tl_in','tl_att','fouls_received','total','played'])
);
commit;
