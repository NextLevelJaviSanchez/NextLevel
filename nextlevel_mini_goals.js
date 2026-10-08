/* Adaptador Mini: sólo tiros registrados; nunca inferir rebotes o asistencias. */
(function(root){
'use strict';
const gameCache=new Map();
const getGames=(playerId,season)=>gameCache.get(playerId+':'+season) || [];
function normalize(source,season){
 if(!source || String(source.season)!==String(season))return [];
 const fixture=new Map((source.games || []).map(g=>[String(g.IdPartidoNotificacion),g])),rows=[];
 for(const act of source.boxscores || source.sample_boxscores || []){
  const players=Array.isArray(act.player_rows)?act.player_rows:act.milo;
  if(!Array.isArray(players) || players.length!==1 || (act.result && act.result!=='correcto'))continue;
  const g=fixture.get(String(act.id));if(!g || g.Estado!=='Terminado')continue;
  const parts=String(g.Fecha).split('/');if(parts.length!==3)continue;
  const date=parts.reverse().join('-');if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || !date.startsWith(String(season)+'-') || !Number.isFinite(Date.parse(date+'T12:00:00Z')) || new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)continue;
  const p=players[0],minutes=p.milisegundos_jugados==null?null:Number(p.milisegundos_jugados)/60000;
  rows.push({cabb_partido_id:String(act.id),fecha:date,torneo:source.tournament || 'FEBAMBA Mini',source:'cabb_api',pts:p.puntos,minutos:minutes,tl_in:p.canasta1p,tl_att:p.tiro1p,t2_in:p.canasta2p,t2_att:p.tiro2p});
 }
 return [...new Map(rows.map(r=>[r.cabb_partido_id,r])).values()];
}
async function connect({client,playerId,season,official,verifyAccount,getProfile}){
 if(!root.NextLevelGradualGoals?.mount)return;
 return root.NextLevelGradualGoals.mount({client,playerId,season,verifyAccount,getProfile,mini:true,
  anchor:document.getElementById('mini-gradual-goals'),dashboard:document.getElementById('mini-goals-dashboard'),metrics:['tl','t2','minutes',...Object.keys(root.NextLevelGoalCatalog?.rules || {})],
  description:'Un pasito a la vez: elegí con tu coach hasta 2 metas de tiro. Necesitamos 5 partidos e intentos suficientes para empezar. Tus experiencias de práctica siguen en este plan.',
  loadGames:async()=>{
   const rows=normalize(official,season);
   for(let from=0;;from+=1000){const {data,error}=await client.from('game_log').select('*').eq('player_id',playerId).eq('source','cabb_api').eq('torneo','FEBAMBA Mini').gte('fecha',season+'-01-01').lt('fecha',String(+season+1)+'-01-01').order('fecha').order('cabb_partido_id').range(from,from+999);if(error)throw error;rows.push(...(data || []));if(!data || data.length<1000)break;}
   // Las actas de la nube prevalecen sobre el snapshot, sin duplicar partidos.
   const merged=[...new Map(rows.map(r=>[String(r.cabb_partido_id),r])).values()];gameCache.set(playerId+':'+season,merged);return merged;
  }
 });
}
const api={normalize,connect,getGames};if(typeof module!=='undefined')module.exports=api;root.NextLevelMiniGoals=api;
})(typeof window!=='undefined'?window:globalThis);
