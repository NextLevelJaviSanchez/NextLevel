'use strict';
const assert=require('node:assert/strict');
const api=require('./nextlevel_gradual_goals.js');
const now='2026-10-07T15:00:00Z';
function rows(start,count,made=6,attempts=10){return Array.from({length:count},(_,i)=>({cabb_partido_id:String(start+i),fecha:`2026-09-${String(start+i).padStart(2,'0')}`,source:'cabb_api',torneo:'AFMB',minutos:20,tl_in:made,tl_att:attempts,t2_in:made,t2_att:attempts,t3_in:made,t3_att:attempts,reb_tot:4,ast:2,to_perdidas:2}));}
let count=0;function test(name,fn){fn();count++;console.log('OK '+name);}
const base=rows(1,5),goal=api.create('tl','AFMB',base,now);
test('Primer paso gradual y base ponderada',()=>{assert.equal(goal.target,63);assert.equal(goal.baseline.value,60);assert.equal(api.measure([...base.slice(0,4),{...base[4],tl_in:1,tl_att:1}],'tl').value,100*25/41);});
test('No cumple con partidos de la base',()=>assert.equal(api.evaluate(goal,base,now).status,'active'));
test('Menos de cinco partidos nuevos queda pendiente',()=>assert.equal(api.evaluate(goal,[...base,...rows(6,4,8)],now).evaluation.ready,false));
const won=api.evaluate(goal,[...base,...rows(6,5,7)],now);
test('Logro automático con evidencia y sin duplicación',()=>{assert.equal(won.status,'achieved');assert.equal(won.achievements.length,1);assert.deepEqual(won.achievements[0].gameIds,['6','7','8','9','10']);assert.deepEqual(api.evaluate(won,[...base,...rows(6,5,7)],now),won);});
test('Próximo paso requiere activar y conserva el logro',()=>{const next=api.advance(won,[...base,...rows(6,5,7)],now);assert.equal(next.target,73);assert.equal(next.stage,2);assert.equal(next.achievements.length,1);assert.equal(api.evaluate(next,[...base,...rows(6,5,7)],now).evaluation.ready,false);assert.throws(()=>api.advance(goal,base,now));});
test('No mezclar torneos, fuentes ni duplicados',()=>{assert.equal(api.gamesFor([...base,...base,{...base[0],cabb_partido_id:'x',torneo:'Federal'},{...base[0],cabb_partido_id:'y',source:'training'}],'AFMB').length,5);});
test('No participación no cuenta',()=>assert.equal(api.gamesFor(base.map(g=>({...g,minutos:0})),'AFMB').length,0));
test('Faltantes no equivalen a cero',()=>{assert.equal(api.measure(base.map(g=>({...g,tl_in:null})),'tl').ready,false);assert.equal(api.measure(base.map(g=>({...g,reb_tot:null})),'reb').ready,false);assert.equal(api.measure(base.map(g=>({...g,minutos:null})),'reb').ready,false);});
test('Muestra de intentos insuficiente no felicita',()=>{const g=api.evaluate(goal,[...base,...rows(6,5,1,1)],now);assert.equal(g.status,'active');assert.equal(g.evaluation.attempts,5);});
test('Extiende muestra cuando faltan intentos',()=>{const g=api.evaluate(goal,[...base,...rows(6,10,2,2)],now);assert.equal(g.status,'achieved');assert.equal(g.achievements[0].gameIds.length,10);});
test('Conversiones imposibles y booleanos no se aceptan',()=>{assert.equal(api.measure(rows(1,5,11,10),'tl').ready,false);assert.equal(api.measure(base.map(g=>({...g,tl_in:false})),'tl').ready,false);});
test('Pausado no genera logros',()=>assert.equal(api.evaluate({...goal,status:'paused'},[...base,...rows(6,5,8)],now).status,'paused'));
test('Rebotes comparables por minutos',()=>{const g=api.create('reb','AFMB',base,now);assert.equal(g.target,4.2);assert.equal(api.evaluate(g,[...base,...rows(6,5).map(r=>({...r,reb_tot:8,minutos:40}))],now).status,'active');});
test('Pérdidas: dirección descendente',()=>{const g=api.create('losses','AFMB',base,now);assert.equal(g.target,1.9);assert.equal(api.evaluate(g,[...base,...rows(6,5).map(r=>({...r,to_perdidas:1}))],now).status,'achieved');});
test('Asistencias no premian aumento de pérdidas',()=>{const g=api.create('ast','AFMB',base,now);assert.equal(api.evaluate(g,[...base,...rows(6,5).map(r=>({...r,ast:3,to_perdidas:3}))],now).status,'active');});
test('Límites de porcentaje y pérdidas',()=>{assert.equal(api.target('tl',99),100);assert.equal(api.target('tl',100),null);assert.equal(api.target('losses',0),null);});
console.log(`${count} pruebas pasaron.`);
// Integración de interfaz y guardado: nube simulada, sin escribir datos reales.
const fs=require('node:fs'),vm=require('node:vm');
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.value='';this.textContent='';this.style={};}
 append(child){this.children.push(child);if(this.tag==='select' && !this.value)this.value=child.value || child.textContent;}
 before(child){this.beforeNode=child;}after(child){this.afterNode=child;}
 replaceChildren(){this.children=[];}setAttribute(){}addEventListener(name,fn){this.listeners[name]=fn;}
 allText(){return [this.textContent,...this.children.map(n=>n.allText())].join(' ');}
}
async function uiTest(fail,practice=false){
 const anchor=new Element('div'),dash=new Element('div');let load,updates=0;
 const document={createElement:tag=>new Element(tag),getElementById:key=>key==='obj-list'?anchor:key==='dash-obj-activo'?dash:null,addEventListener:(name,fn)=>{load=fn;}};
 const catalog=require('./nextlevel_goal_catalog.js'),baseTime=Date.now()-6*86400000;
 const uiGoal=practice?api.create('practice_defense','AFMB',[],new Date(baseTime).toISOString()):api.create('tl','AFMB',base,'2026-09-05T12:00:00Z',{goalMode:'game_block_v2'});
 const extras=practice?[{module:'perfil_v1',data:{areas:['Defensa']}},...[1,2,3].map(n=>{const timestamp=new Date(baseTime+n*86400000).toISOString();return {module:'plan_progress_v1:'+n,data:{id:String(n),source:'player_training',date:timestamp.slice(0,10),createdAt:timestamp,areas:['Defensa']}};})]:[];
 const old={module:'gradual_goals_v1:2026:AFMB:'+uiGoal.metric,data:uiGoal,updated_at:now};
 const client={from(table){let write=false,payload;
  const query={};for(const method of ['select','eq','like','gte','lt','order','range'])query[method]=()=>query;
  query.update=value=>{write=true;payload=value;return query;};
  query.insert=value=>{write=true;payload=value;return query;};
  query.then=(resolve,reject)=>Promise.resolve(write?(updates++,fail?{data:null,error:Error('offline')}:{data:[{module:old.module,...payload}]}):{data:table==='game_log'?[...base,...rows(6,5,7)]:[old,...extras],error:null}).then(resolve,reject);return query;
 }};
 vm.runInNewContext(fs.readFileSync(require.resolve('./nextlevel_gradual_goals.js'),'utf8'),{document,PLAYER_ID:'test-player',SEASON:'2026',_supa:client,window:practice?{NextLevelGoalCatalog:catalog}:{},console});
 await load();assert.equal(updates,1);
 if(fail){assert.match(anchor.beforeNode.allText(),/No se pudieron/);assert.doesNotMatch(anchor.beforeNode.allText(),/¡Objetivo cumplido!/);}
 else{assert.match(anchor.beforeNode.allText(),/¡Objetivo cumplido!/);assert.match(anchor.beforeNode.allText(),/Activar próximo paso/);assert.match(dash.afterNode.allText(),/¡Objetivo cumplido!/);if(practice){assert.match(dash.afterNode.allText(),/3 días de práctica/);assert.doesNotMatch(anchor.beforeNode.allText(),/Tiros libres/);}}
}
(async()=>{await uiTest(false);console.log('OK Tarjeta en Plan e Inicio, guardada antes de mostrarse');await uiTest(true);console.log('OK Error de guardado no anuncia un logro confirmado');await uiTest(false,true);console.log('OK Área elegida Defensa, felicitación por práctica en Inicio y sin tiros libres comunes');})().catch(error=>{console.error(error);process.exitCode=1;});
