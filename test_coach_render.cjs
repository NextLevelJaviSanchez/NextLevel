const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),model=require('./nextlevel_coach_personalization.js'),engine=require('./nextlevel_gradual_goals.js');
class Node{
 constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.value='';this.style={setProperty(){}};this.listeners={};}
 append(n){this.children.push(n);if(this.tag==='select' && !this.value)this.value=n.value || n.textContent;}
 replaceChildren(){this.children=[];}setAttribute(){}addEventListener(type,fn){this.listeners[type]=fn;}
 text(){return [this.textContent,...this.children.map(n=>n.text())].join(' ');}
}
const listeners=new Map(),document={createElement:tag=>new Node(tag),getElementById:()=>null,addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);}};
const emit=(type,detail)=>{for(const listener of listeners.get(type) || [])listener({detail});};
const games=Array.from({length:5},(_,i)=>({cabb_partido_id:String(i+1),fecha:'2026-09-0'+(i+1),source:'cabb_api',torneo:'FEBAMBA Mini',minutos:8,pts:3,tl_in:6,tl_att:10,t2_in:4,t2_att:10}));
const client={from(){const q={};for(const method of ['select','eq','order','range'])q[method]=()=>q;q.then=(resolve,reject)=>Promise.resolve({data:[{module:'mini_profile_v1',data:{technicalAreas:['Defensa']}}],error:null}).then(resolve,reject);return q;}};
const browser={NextLevelCoachPersonalization:model};vm.runInNewContext(fs.readFileSync(require.resolve('./nextlevel_coach_analysis.js'),'utf8'),{window:browser,document,console});
(async()=>{
 const host=new Node('section'),options={host,client,playerId:'player-1',season:'2026',category:'U11',mini:true};
 await browser.NextLevelCoachAnalysis.render(games,[],options);
 assert.match(host.text(),/Practicar: Defensa/);assert.doesNotMatch(host.text(),/Practicar: Tiro libre/);assert.match(host.text(),/referencia de 20/);
 emit('nextlevel-profile-preferences',{technicalAreas:['Tiro libre']});assert.match(host.text(),/Practicar: Tiro libre/);assert.doesNotMatch(host.text(),/Practicar: Defensa/);
 const won={...engine.create('practice_free','FEBAMBA Mini',games,'2026-09-01'),status:'achieved',achievements:[{id:'practice_free:1',date:'2026-09-05',value:3}]};
 emit('nextlevel-goals-updated',{playerId:'other-player',season:'2026',goals:[won]});assert.doesNotMatch(host.text(),/Avances que ya lograste/);
 emit('nextlevel-goals-updated',{playerId:'player-1',season:'2026',goals:[won]});assert.match(host.text(),/Avances que ya lograste/);assert.match(host.text(),/días registrados de práctica/);
 await browser.NextLevelCoachAnalysis.render(games,[],options);assert.equal(listeners.get('nextlevel-goals-updated').size,1);assert.equal(listeners.get('nextlevel-profile-preferences').size,1);
 console.log('OK Análisis Mini visible, preferencias actualizadas, logros propios y sin duplicar suscripciones.');
})().catch(e=>{console.error(e);process.exitCode=1;});
