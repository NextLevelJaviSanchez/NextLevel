(function(root){
 'use strict';
 const readTables=['player_data','game_log','stats_seasons','physical_test_results','evaluations','intake_responses','messages','message_replies','message_reactions','plan_progress'];
 async function ownPlayer(client,guard,requested){
  await guard.verify();
  if(requested&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requested))throw Error('El enlace del perfil no es válido.');
  let query=client.from('players').select('id,user_id,name,dorsal,club,category,position,is_active').eq('user_id',guard.id);
  if(requested)query=query.eq('id',requested);
  const {data,error}=await query.limit(2);guard.assert();if(error)throw error;
  if(data?.length!==1||data[0].user_id!==guard.id)throw Error('Este perfil no está disponible para tu cuenta.');
  return data[0];
 }
 async function rows(client,guard,table,playerId){
  if(!readTables.includes(table))throw Error('Consulta no autorizada.');
  await guard.verify();const all=[];
  const order=table==='player_data'?'module':table==='intake_responses'?'tipo':table==='plan_progress'?'check_id':table==='message_reactions'?'message_id':'id';
  for(let offset=0;;offset+=500){const {data,error}=await client.from(table).select('*').eq('player_id',playerId).order(order).range(offset,offset+499);guard.assert();if(error)throw error;all.push(...(data||[]));if(!data||data.length<500)break;}
  return all;
 }
 async function saveModule(client,guard,playerId,module,data){
  if(!['perfil_v1','mini_profile_v1','foto_url'].includes(module)&&!/^plan_progress_v1:[0-9a-f-]{36}$/.test(module)&&!/^gradual_goals_v1:\d{4}:[^:]{1,300}:[a-z0-9_]{1,50}$/.test(module))throw Error('Guardado no autorizado.');
  await guard.verify();const {error}=await client.from('player_data').upsert({player_id:playerId,module,data,updated_at:new Date().toISOString()},{onConflict:'player_id,module'});guard.assert();if(error)throw error;
 }
 async function saveEvaluation(client,guard,playerId,entry){await guard.verify();if(entry.player_id!==playerId)throw Error('Evaluación no autorizada.');const {error}=await client.from('evaluations').insert(entry);guard.assert();if(error)throw error;}
 const api={ownPlayer,rows,saveModule,saveEvaluation,readTables};if(typeof module!=='undefined')module.exports=api;else root.NextLevelData=api;
})(typeof window==='undefined'?{}:window);
