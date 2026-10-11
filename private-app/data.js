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
  if(!['perfil_v1','mini_profile_v1','foto_url','profile_dorsal_v1','obj_estados_v1'].includes(module)&&!/^plan_progress_v1:[0-9a-f-]{36}$/.test(module)&&!/^mini_measures_v1:[0-9a-f-]{36}$/.test(module)&&!/^gradual_goals_v1:\d{4}:[^:]{1,300}:[a-z0-9_]{1,50}$/.test(module))throw Error('Guardado no autorizado.');
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

 async function selfTestParent(client,guard,playerId,id){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw Error('La prueba no es válida.');if(await accessRole(client,guard)!=='player')throw Error('Solo podés modificar tus registros propios.');const {data,error}=await client.from('physical_test_results').select('id,test_type').eq('player_id',playerId).eq('id',id).eq('source','self').limit(1);guard.assert();if(error)throw error;if(data?.length!==1)throw Error('Este registro propio no está disponible.');return data[0];}
 async function updateSelfTest(client,guard,playerId,value){if(value.player_id!==playerId||value.source!=='self')throw Error('Prueba no autorizada.');const old=await selfTestParent(client,guard,playerId,value.id);if(old.test_type!==value.test_type)throw Error('Conservá el tipo de la prueba al editar.');const {data,error}=await client.from('physical_test_results').update(value).eq('player_id',playerId).eq('id',value.id).eq('source','self').select('id');guard.assert();if(error)throw error;if(data?.length!==1)throw Error('No se confirmó la edición; recargá antes de continuar.');}
 async function removeSelfTest(client,guard,playerId,id){await selfTestParent(client,guard,playerId,id);const {data,error}=await client.from('physical_test_results').delete().eq('player_id',playerId).eq('id',id).eq('source','self').select('id');guard.assert();if(error)throw error;if(data?.length!==1)throw Error('No se confirmó el borrado; recargá antes de continuar.');}

 async function saveIntake(client,guard,playerId,value){if(value.player_id!==playerId)throw Error('Las respuestas deben corresponder a tu perfil.');if(await accessRole(client,guard)!=='player')throw Error('La evaluación personal se completa desde la cuenta del jugador.');await ownPlayer(client,guard,playerId);const {error}=await client.from('intake_responses').upsert(value,{onConflict:'player_id'});guard.assert();if(error)throw error;}
 async function patchProfile(client,guard,playerId,module,patch){
  if(!['perfil_v1','mini_profile_v1'].includes(module)||!guard||!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('Guardado de perfil no autorizado.');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId))throw Error('El perfil no es válido.');
  const role=await accessRole(client,guard);await ownPlayer(client,guard,playerId,role==='admin_coach');guard.assert();
  for(let attempt=0;attempt<3;attempt++){
   await guard.verify();const {data:rows,error:readError}=await client.from('player_data').select('data,updated_at').eq('player_id',playerId).eq('module',module).limit(1);guard.assert();if(readError)throw readError;
   const old=rows?.[0];if(old?.data!=null&&(typeof old.data!=='object'||Array.isArray(old.data)))throw Error('El perfil guardado necesita revisión; no se reemplazó.');
   const value={...(old?.data||{}),...patch};if(patch.seasonGoals)value.seasonGoals={...(old?.data?.seasonGoals||{}),...patch.seasonGoals};
   const previousStamp=Date.parse(old?.updated_at)||0;
   const entry={player_id:playerId,module,data:value,updated_at:new Date(Math.max(Date.now(),previousStamp+1)).toISOString()};let result;
   if(old){let query=client.from('player_data').update({data:value,updated_at:entry.updated_at}).eq('player_id',playerId).eq('module',module);query=old.updated_at==null?query.is('updated_at',null):query.eq('updated_at',old.updated_at);result=await query.select('data,updated_at');}
   else result=await client.from('player_data').insert(entry).select('data,updated_at');
   guard.assert();if(result.error){if(result.error.code==='23505')continue;throw result.error;}if(result.data?.length===1)return result.data[0].data;
  }
  throw Error('Otro cambio llegó mientras guardabas. El pendiente se conserva para reintentar.');
 }
 async function requestSync(client,guard,playerIds,season){
  if(!Array.isArray(playerIds)||!playerIds.length||playerIds.length>100||playerIds.some(id=>!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))||!/^20\d{2}$/.test(String(season)))throw Error('Selección o temporada inválida.');
  await guard.verify();if(await accessRole(client,guard)!=='admin_coach')throw Error('Usá tu cuenta de coach.');
  const ids=[...new Set(playerIds)],{data,error}=await client.rpc('nextlevel_request_sync',{player_ids:ids,season_value:String(season)});guard.assert();
  if(error||!Array.isArray(data)||data.length!==ids.length||data.some(job=>!ids.includes(job.player_id)||job.season!==String(season)||!['queued','running'].includes(job.status)))throw Error('No se pudo confirmar la solicitud. Consultá los resultados privados antes de repetirla.');
  return data;
 }
 const api={requestSync,patchProfile,ownPlayer,rows,saveModule,saveEvaluation,accessRole,players,saveCoachModule,sendConversation,replyLegacy,reaction,removeReply,saveSelfTest,updateSelfTest,removeSelfTest,saveIntake,readTables};
if(typeof module!=='undefined')module.exports=api;else root.NextLevelData=api;
})(typeof window==='undefined'?{}:window);

(function(root){
 'use strict';
 const prefix='nextlevel_encrypted_draft_v1:';
 const base64=bytes=>{let text='';for(const value of bytes)text+=String.fromCharCode(value);return root.btoa(text);};
 const bytes=text=>Uint8Array.from(root.atob(text),char=>char.charCodeAt(0));
 async function open(client,guard,playerId,{crypto=root.crypto,storage=root.localStorage}={}){
  if(!root.NextLevelSecurity.UUID.test(playerId))throw Error('Perfil inválido para recuperar pendientes.');
  await guard.verify();const candidate=base64(crypto.getRandomValues(new Uint8Array(32)));
  const result=await client.rpc('nextlevel_draft_key',{profile_id:playerId,candidate_key:candidate});guard.assert();
  if(result.error||typeof result.data!=='string'||bytes(result.data).length!==32)throw Error('Respaldo cifrado todavía no disponible.');
  const key=await crypto.subtle.importKey('raw',bytes(result.data),'AES-GCM',false,['encrypt','decrypt']);guard.assert();
  const scope=guard.id+':'+playerId;let active=true;const pending=new Map();
  const assert=()=>{guard.assert();if(!active)throw Error('El respaldo de esta sesión está cerrado.');};
  const valid=name=>/^(perfil_v1|mini_profile_v1):20\d{2}$/.test(name)||name==='foto_url';
  const id=name=>{if(!valid(name))throw Error('Pendiente no admitido.');return prefix+scope+':'+name;};
  const aad=name=>new TextEncoder().encode(scope+':'+name);
  async function put(name,value){assert();const recordId=id(name),iv=crypto.getRandomValues(new Uint8Array(12)),text=JSON.stringify({savedAt:new Date().toISOString(),value});if(text.length>1200000)throw Error('Pendiente demasiado grande.');const previous=pending.get(name);const operation=(async()=>{if(previous)await previous.catch(()=>{});assert();const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(name)},key,new TextEncoder().encode(text));assert();storage.setItem(recordId,JSON.stringify({v:1,iv:base64(iv),ciphertext:base64(new Uint8Array(encrypted))}));})();pending.set(name,operation);try{await operation;}finally{if(pending.get(name)===operation)pending.delete(name);}}
  async function read(name){assert();const recordId=id(name);await pending.get(name);assert();const raw=storage.getItem(recordId);if(!raw)return null;const record=JSON.parse(raw);if(record.v!==1||typeof record.ciphertext!=='string'||record.ciphertext.length>1700000||typeof record.iv!=='string')throw Error('El pendiente cifrado no tiene un formato válido.');const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(record.iv),additionalData:aad(name)},key,bytes(record.ciphertext));assert();const value=JSON.parse(new TextDecoder().decode(clear));return value;}
  async function remove(name){assert();await pending.get(name);assert();storage.removeItem(id(name));}
  return {put,read,remove,close(){active=false;}};
 }
 root.NextLevelDraftCache={open};
})(typeof window==='undefined'?globalThis:window);
