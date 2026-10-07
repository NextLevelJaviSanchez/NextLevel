/* Fuentes por jugador. Ningún perfil nuevo hereda snapshots de otro. */
window.NextLevelSources={async read(kind){
 const ctx=window.NextLevelPlayer,client=typeof _supa!=='undefined'?_supa:supabase.createClient(NextLevelAppConfig.url,NextLevelAppConfig.anonKey);
 const modules={team:'cabb_team_v1:'+ctx.season,shots:'cabb_shots_v1:'+ctx.season,mini:'cabb_mini_official_v1:'+ctx.season};
 const {data,error}=await client.from('player_data').select('data').eq('player_id',ctx.playerId).eq('module',modules[kind]).maybeSingle();if(error)throw error;if(data?.data)return data.data;
 if(kind==='mini' && ctx.legacySnapshots && ctx.season==='2026'){const {data:old}=await client.from('player_data').select('data').eq('player_id',ctx.playerId).eq('module','cabb_mini_official_v1').maybeSingle();if(old?.data)return old.data;}
 if(ctx.legacySnapshots || (kind==='team' && ctx.legacyTeam)){const paths={team:'cabb_team_2026.json',shots:'cabb_season_shots_2026.json',mini:'cabb_milo_u11_2026.json'};if(ctx.season!=='2026')throw Error('Sin snapshot de esta temporada');const r=await fetch(paths[kind],{cache:'no-store'});if(r.ok)return r.json();}
 if(kind==='mini')return {season:ctx.season,club:ctx.club,games:[],boxscores:[],checked_at:null};
 throw Error('Fuente todavía no sincronizada para este jugador.');
}};
