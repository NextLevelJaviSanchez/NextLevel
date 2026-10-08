const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2],'utf8');
const start=html.indexOf('const OBJETIVOS_BASE = ['),end=html.indexOf('let _objEstados',start);
assert.ok(start>=0 && end>start);
const goals=vm.runInNewContext(html.slice(start,end)+'; OBJETIVOS_BASE;');
assert.ok(goals.every(g=>g.estado==='pendiente'),'La plantilla no debe activar objetivos comunes');
assert.ok(!goals.find(g=>g.id==='tl70').ttl.includes('70%'));
const fnStart=html.indexOf('function buildDashObjActivo(container)'),fnEnd=html.indexOf('async function buildDashFisico',fnStart);
const render=html.slice(fnStart,fnEnd);
function dashboard(states,active){const container={innerHTML:'',replaceChildren(){this.innerHTML='';}};vm.runInNewContext(render+'; buildDashObjActivo(container);',{container,OBJETIVOS_BASE:goals,_objEstados:states,window:{NextLevelGradualGoals:{activeCount:active}}});return container.innerHTML;}
assert.match(dashboard({},0),/Sin objetivos activos elegidos/);
assert.equal(dashboard({},1),'','Una meta gradual activa no debe mostrar un mensaje contradictorio');
assert.match(dashboard({pullup:'activo'},0),/Tiro después del drible/,'Conservar metas técnicas elegidas explícitamente');
const engine=require('./nextlevel_gradual_goals.js');
function games(made){return Array.from({length:5},(_,i)=>({cabb_partido_id:String(i+1),fecha:'2026-09-0'+(i+1),torneo:'AFMB',source:'cabb_api',minutos:20,tl_in:made,tl_att:10}));}
assert.equal(engine.create('tl','AFMB',games(4),'2026-10-07').target,43);
assert.equal(engine.create('tl','AFMB',games(7),'2026-10-07').target,73);
console.log('OK Sin metas comunes activas, sin mensaje contradictorio, elecciones previas conservadas y metas diferentes según estadísticas.');
