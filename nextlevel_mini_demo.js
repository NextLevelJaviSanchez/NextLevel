/* Entorno de demo independiente: sin conexión a cuentas ni servicios de datos. */
(function(root){
'use strict';
const id='de000000-0000-4000-8000-000000000011',user='demo-local-tomas',key='nextlevel_u11_'+id+'_v1',store='nextlevel_demo_mini_tables_v1';
root.NextLevelPlayer={playerId:id,name:'Tomás Pérez',club:'Club Horizonte · DEMO',category:'Mini U11',season:'2026',template:'mini',isDemo:true,dorsal:5};
const seed={entries:[{id:'demo-experience-radar',date:'2026-10-06',areas:['Mirar antes de pasar'],success:'Miré antes de pasar y encontré a un compañero libre.',next:'Quiero probarlo cuando me marquen más cerca.',source:'player_training',synced:false},{id:'demo-experience-hands',date:'2026-10-03',areas:['Usar ambas manos'],success:'Probé llevar la pelota con la izquierda. A veces se me escapó y volví a intentar.',next:'Practicar más despacio para controlarla.',source:'player_training',synced:false}],physical:[],profile:{enjoy:'Jugar con mis amigos y probar cosas nuevas.',learn:'Usar las dos manos y mirar antes de pasar.',position:'Quiero probar de todo',playExperiences:['Llevar la pelota','Pasar y moverme'],dream:'Compartir muchos partidos con mi equipo.',seasonGoal:'Animarme a probar distintas tareas y aprender con mis compañeros.',seasonGoalSeason:'2026',technicalAreas:['Usar ambas manos','Pases'],mentalAreas:['Seguir después de un error'],adventureId:'radar'},challenge:'Mirar antes de pasar'};
try{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed));}catch(_){}
let tables={};try{tables=JSON.parse(localStorage.getItem(store)||'{}');}catch(_){}
if(!tables.player_data)tables.player_data=seed.entries.map(e=>({player_id:id,module:'plan_progress_v1:'+e.id,data:e}));
function persist(){localStorage.setItem(store,JSON.stringify(tables));}
function query(table){let predicates=[],kind='read',payload=null,start=0,end=Infinity,sort=null,single=false;
 const q={select(){return q;},eq(k,v){predicates.push(r=>r[k]===v);return q;},gte(k,v){predicates.push(r=>r[k]>=v);return q;},lt(k,v){predicates.push(r=>r[k]<v);return q;},like(k,v){const prefix=v.endsWith('%')?v.slice(0,-1):v;predicates.push(r=>String(r[k]||'').startsWith(prefix));return q;},order(k,opts){sort=[k,opts?.ascending!==false];return q;},range(a,b){start=a;end=b;return q;},limit(n){end=n-1;return q;},maybeSingle(){single=true;return q;},insert(value){kind='insert';payload=value;return q;},update(value){kind='update';payload=value;return q;},upsert(value){kind='upsert';payload=value;return q;},then(resolve,reject){try{
 let rows=tables[table]||[],found=rows.filter(r=>predicates.every(fn=>fn(r)));
 if(kind==='insert'){found=(Array.isArray(payload)?payload:[payload]).map(r=>({...r,id:r.id||crypto.randomUUID()}));rows.push(...found);}
 if(kind==='update')found.forEach(r=>Object.assign(r,payload));
 if(kind==='upsert'){const old=rows.find(r=>r.player_id===payload.player_id&&r.module===payload.module);if(old){Object.assign(old,payload);found=[old];}else{found=[{...payload,id:crypto.randomUUID()}];rows.push(...found);}}
 if(kind!=='read'){tables[table]=rows;persist();}
 if(sort)found=[...found].sort((a,b)=>String(a[sort[0]]).localeCompare(String(b[sort[0]]))*(sort[1]?1:-1));
 found=found.slice(start,end===Infinity?undefined:end+1);return Promise.resolve({data:single?found[0]||null:found,error:null}).then(resolve,reject);
 }catch(error){return Promise.resolve({data:null,error}).then(resolve,reject);}}};return q;
}
root.NextLevelMiniDemo={client:{from:query,auth:{getUser:async()=>({data:{user:{id:user}},error:null})}},recordPractice(entry){const module='plan_progress_v1:'+entry.id;if(!tables.player_data.some(r=>r.module===module))tables.player_data.push({player_id:id,module,data:entry});persist();},reset(){localStorage.removeItem(key);localStorage.removeItem(store);location.reload();}};
document.addEventListener('DOMContentLoaded',()=>{
 const observer=new MutationObserver(records=>{for(const record of records){for(const added of record.addedNodes || [])clean(added);if(record.type==='characterData')clean(record.target);}});
 function clean(node){if(node.nodeType===3){const text=node.nodeValue.replace(/Supabase/g,'este navegador · DEMO').replace(/CABB/g,'de ejemplo').replace(/Recuerdo en este dispositivo · pendiente de sincronizar/g,'Recuerdo guardado en este navegador · DEMO');if(text!==node.nodeValue)node.nodeValue=text;}else if(node.nodeType===1 && !['SCRIPT','STYLE','TEXTAREA'].includes(node.tagName))for(const child of node.childNodes)clean(child);}
 clean(document.body);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
});
})(window);
