'use strict';
const fs=require('node:fs'),path=require('node:path'),{stripTypeScriptTypes}=require('node:module');
const target='https://yjcxwfkedxzkcspddghz.supabase.co';
function errorCategory(error){const message=String(error?.message||'');return message.startsWith('Cobertura incompleta')?'coverage':message.startsWith('CABB')?'official_source':/^(Equipo|Categoría|Boxscore|Jugador)/.test(message)?'identity':'import_failure';}
async function processQueue(db,syncPlayer,{limit=5,log=console.log,clock=Date.now}={}){
 let completed=0,failed=0;const started=clock();
 for(let i=0;i<limit;i++){
  if(clock()-started>10*60*1000)break;
  const claimed=await db.rpc('nextlevel_claim_sync');if(claimed.error)throw Error('No se pudo consultar la cola privada.');
  const job=claimed.data?.[0];if(!job)break;
  if(!/^[0-9a-f-]{36}$/i.test(job.player_id)||!/^20\d{2}$/.test(job.season)||!job.lease_token)throw Error('Solicitud privada inválida.');
  let failure=null;try{await syncPlayer(job.player_id,job.season);}catch(error){failure=errorCategory(error);}
  const result=await db.rpc('nextlevel_finish_sync',{job_id:job.id,job_lease:job.lease_token,failure_code:failure});
  if(result.error||result.data!==true)throw Error('No se pudo confirmar el resultado privado de la importación.');
  if(failure)failed++;else completed++;
 }
 log('Solicitudes terminadas:',completed,'· pendientes con error:',failed);return {completed,failed};
}
async function run(){
 const url=process.env.SUPA_URL||target,key=process.env.SUPA_SERVICE_ROLE_KEY;if(url!==target||!key)throw Error('Destino o credencial inválidos.');
 const {createClient}=require('@supabase/supabase-js'),db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const sourcePath=path.join(__dirname,'supabase/functions/nextlevel-onboard/index.ts');let source=fs.readFileSync(sourcePath,'utf8');
 const importLine='import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";';if(!source.includes(importLine))throw Error('Revisar versión del importador.');source=source.replace(importLine,'');
 const moduleObject={exports:{}},env={SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:key};
 new Function('createClient','Deno','module',stripTypeScriptTypes(source)+'\nmodule.exports={syncPlayer};')(createClient,{env:{get:name=>env[name]},serve:()=>{}},moduleObject);
 await processQueue(db,moduleObject.exports.syncPlayer);
}
if(require.main===module)run().catch(()=>{console.error('No se completó la cola; revisar el estado privado en la aplicación.');process.exitCode=1;});
module.exports={processQueue,errorCategory};
