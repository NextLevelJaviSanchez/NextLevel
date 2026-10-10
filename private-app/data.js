(function(root){
 'use strict';
 const readTables=['player_data','game_log','stats_seasons','physical_test_results','evaluations','intake_responses','messages','message_replies','message_reactions','plan_progress'];
 async function ownPlayer(client,guard,requested,asCoach=false){
  await guard.verify();
  if(requested&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requested))throw Error('El enlace del perfil no es válido.');
  let query=client.from('players').select('id,user_id,name,dorsal,club,category,position,is_active');
  if(!asCoach)query=query.eq('user_id',guard.id);
  if(requested)query=query.eq('id',requested);
  const {data,error}=await query.limit(2);guard.assert();if(error)throw error;
  if(data?.length!==1||(!asCoach&&data[0].user_id!==guard.id))throw Error('Este perfil no está disponible para tu cuenta.');
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
  if(!['perfil_v1','mini_profile_v1','foto_url'].includes(module)&&!/^plan_progress_v1:[0-9a-f-]{36}$/.test(module)&&!/^mini_measures_v1:[0-9a-f-]{36}$/.test(module)&&!/^gradual_goals_v1:\d{4}:[^:]{1,300}:[a-z0-9_]{1,50}$/.test(module))throw Error('Guardado no autorizado.');
  await guard.verify();const {error}=await client.from('player_data').upsert({player_id:playerId,module,data,updated_at:new Date().toISOString()},{onConflict:'player_id,module'});guard.assert();if(error)throw error;
 }
 async function saveEvaluation(client,guard,playerId,entry){await guard.verify();if(entry.player_id!==playerId)throw Error('Evaluación no autorizada.');const {error}=await client.from('evaluations').insert(entry);guard.assert();if(error)throw error;}
 async function accessRole(client,guard){await guard.verify();const {data,error}=await client.rpc('nextlevel_access_role');guard.assert();if(error||!['player','admin_coach'].includes(data))throw Error('No se pudo comprobar tu permiso de acceso.');return data;}
 async function players(client,guard){const all=[];await guard.verify();for(let from=0;;from+=500){const {data,error}=await client.from('players').select('id,name,club,category,dorsal,is_active').order('name').range(from,from+499);guard.assert();if(error)throw error;all.push(...(data||[]));if(!data||data.length<500)break;}return all;}
 async function saveCoachModule(client,guard,playerId,value){await guard.verify();const role=await accessRole(client,guard);if(role!=='admin_coach')throw Error('Esta operación requiere tu cuenta de coach.');const data={...value,author_id:guard.id,author_type:'coach'};const {error}=await client.from('player_data').upsert({player_id:playerId,module:'coach_eval_v1',data,updated_at:new Date().toISOString()},{onConflict:'player_id,module'});guard.assert();if(error)throw error;return data;}
 async function sendConversation(client,guard,playerId,text,context={}){if(typeof text!=='string'||!text.trim()||text.length>2000)throw Error('Escribí un mensaje de hasta 2000 caracteres.');await guard.verify();const role=await accessRole(client,guard);const speaker=role==='admin_coach'?'coach':context.speaker==='family'?'family':'player';const authorName=String(context.authorName||'').trim();if(authorName.length>80)throw Error('Usá hasta 80 caracteres para el nombre.');if(context.practiceId){if(!/^[0-9a-f-]{36}$/i.test(context.practiceId))throw Error('La práctica no es válida.');const {data:practices,error:practiceError}=await client.from('player_data').select('module').eq('player_id',playerId).eq('module','plan_progress_v1:'+context.practiceId).limit(1);guard.assert();if(practiceError)throw practiceError;if(practices?.length!==1)throw Error('La práctica no está disponible en este perfil.');}if(context.legacyMessageId)await legacyParent(client,guard,playerId,context.legacyMessageId);const data={id:crypto.randomUUID(),speaker,authorName,practiceId:context.practiceId||null,legacyMessageId:context.legacyMessageId||null,text:text.trim(),date:new Date().toISOString(),author_id:guard.id,author_type:role==='admin_coach'?'coach':'player'};const {error}=await client.from('player_data').insert({player_id:playerId,module:'coach_conversation_v1:'+data.id,data,updated_at:new Date().toISOString()});guard.assert();if(error)throw error;return data;}

 async function legacyParent(client,guard,playerId,messageId){if(!/^[0-9a-f-]{36}$/i.test(messageId))throw Error('El mensaje no es válido.');await guard.verify();const {data,error}=await client.from('messages').select('id').eq('player_id',playerId).eq('id',messageId).limit(1);guard.assert();if(error)throw error;if(data?.length!==1)throw Error('Este mensaje no está disponible en tu perfil.');}
 async function replyLegacy(client,guard,playerId,messageId,body){if(typeof body!=='string'||!body.trim()||body.length>1000)throw Error('Escribí una respuesta de hasta 1000 caracteres.');if(await accessRole(client,guard)!=='player')throw Error('Usá la conversación del coach para dejar tu devolución.');await legacyParent(client,guard,playerId,messageId);const value={id:crypto.randomUUID(),player_id:playerId,message_id:messageId,body:body.trim()};const {error}=await client.from('message_replies').insert(value);guard.assert();if(error)throw error;return value;}
 async function reaction(client,guard,playerId,messageId,emoji){if(emoji!==null&&!['👍','❤️','💪','🔥','🙏'].includes(emoji))throw Error('La reacción no es válida.');if(await accessRole(client,guard)!=='player')throw Error('Esta reacción corresponde a la cuenta del jugador.');await legacyParent(client,guard,playerId,messageId);const value={player_id:playerId,message_id:messageId,emoji};const {error}=emoji===null?await client.from('message_reactions').delete().eq('player_id',playerId).eq('message_id',messageId):await client.from('message_reactions').upsert(value,{onConflict:'message_id,player_id'});guard.assert();if(error)throw error;return value;}

 async function removeReply(client,guard,playerId,messageId,replyId){if(!/^[0-9a-f-]{36}$/i.test(replyId))throw Error('La respuesta no es válida.');if(await accessRole(client,guard)!=='player')throw Error('Solo la cuenta del jugador puede borrar sus respuestas.');await legacyParent(client,guard,playerId,messageId);const {error}=await client.from('message_replies').delete().eq('player_id',playerId).eq('message_id',messageId).eq('id',replyId);guard.assert();if(error)throw error;}
 async function saveSelfTest(client,guard,playerId,value){await guard.verify();if(await accessRole(client,guard)!=='player'||value.player_id!==playerId||value.source!=='self')throw Error('La prueba debe corresponder a tu propia cuenta.');const {error}=await client.from('physical_test_results').insert(value);guard.assert();if(error)throw error;}
 const api={ownPlayer,rows,saveModule,saveEvaluation,accessRole,players,saveCoachModule,sendConversation,replyLegacy,reaction,removeReply,saveSelfTest,readTables};
if(typeof module!=='undefined')module.exports=api;else root.NextLevelData=api;
})(typeof window==='undefined'?{}:window);
