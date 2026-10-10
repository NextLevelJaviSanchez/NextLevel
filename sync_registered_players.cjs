'use strict';
const fs=require('node:fs'),path=require('node:path'),{stripTypeScriptTypes}=require('node:module');
const {createClient}=require('@supabase/supabase-js');
const target='https://yjcxwfkedxzkcspddghz.supabase.co';
async function run(){
 const url=process.env.SUPA_URL||target,key=process.env.SUPA_SERVICE_ROLE_KEY;
 if(url!==target||!key)throw Error('Destino o credencial de sincronización inválidos.');
 const season=process.env.SYNC_SEASON||String(new Date().getUTCFullYear());
 if(!/^20\d{2}$/.test(season))throw Error('Temporada inválida.');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),records=[];
 for(let offset=0;offset<100000;offset+=500){
  const {data,error}=await db.from('player_data').select('player_id,module,is_demo:data->>isDemo').eq('module','player_season_v1:'+season).order('player_id').range(offset,offset+499);
  if(error)throw Error('No se pudo leer la configuración privada.');
  records.push(...data.filter(row=>String(row.is_demo).toLowerCase()!=='true'));
  if(data.length<500)break;
  if(offset===99500)throw Error('Dividir la sincronización antes de continuar.');
 }
 if(process.env.SYNC_EXECUTE!=='1'){console.log('Revisión sin escrituras. Perfiles oficiales registrados:',records.length);return;}
 let source=fs.readFileSync(path.join(__dirname,'supabase/functions/nextlevel-onboard/index.ts'),'utf8');
 const importLine='import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";';
 if(!source.includes(importLine))throw Error('Revisar la versión de la biblioteca del importador.');
 source=source.replace(importLine,'');
 const compiled=stripTypeScriptTypes(source)+'\nmodule.exports={syncPlayer};';
 const moduleObject={exports:{}};
 const env={SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:key};
 new Function('createClient','Deno','module',compiled)(createClient,{env:{get:name=>env[name]},serve:()=>{}},moduleObject);
 const errors={};let completed=0;
 for(const row of records){
  try{await moduleObject.exports.syncPlayer(row.player_id,season);completed++;console.log('Progreso de importación:',completed,'/',records.length);}
  catch(error){let category='import_failure';const message=String(error?.message||'');for(const [prefix,label] of [['CABB','official_source'],['Cobertura incompleta','coverage'],['Equipo/categoría','team_identity'],['Categoría canónica','category_identity'],['Boxscore no corresponde','fixture_mismatch'],['Jugador ausente','roster_identity'],['Sin partidos','no_games']])if(message.startsWith(prefix)){category=label;break;}errors[category]=(errors[category]||0)+1;}
 }
 console.log('Perfiles oficiales actualizados:',completed);
 if(Object.keys(errors).length){console.log('Diagnóstico agregado:',JSON.stringify(errors));throw Error('Hay importaciones pendientes. Los perfiles demo quedan excluidos.');}
}
if(require.main===module)run().catch(()=>{console.error('Sincronización incompleta; revisar el resumen sin compartir credenciales.');process.exitCode=1;});
module.exports={run};