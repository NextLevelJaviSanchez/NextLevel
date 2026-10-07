const assert=require('node:assert/strict');
const {normalize,connect}=require('./nextlevel_mini_goals.js');
const engine=require('./nextlevel_gradual_goals.js');
const sample={season:'2026',games:[],boxscores:[]};
for(let i=1;i<=10;i++){
 sample.games.push({IdPartidoNotificacion:String(i),Fecha:`${String(i).padStart(2,'0')}/09/2026`,Estado:'Terminado'});
 sample.boxscores.push({id:String(i),result:'correcto',player_rows:[{milisegundos_jugados:1200000,canasta1p:i<=5?6:7,tiro1p:10,canasta2p:4,tiro2p:10,rebotes:0,asistencias:0}]});
}
let count=0;const test=(name,fn)=>{fn();count++;console.log('OK '+name);};
test('Actas Mini se convierten sin inventar métricas',()=>{const rows=normalize(sample,'2026');assert.equal(rows.length,10);assert.equal(rows[0].fecha,'2026-09-01');assert.equal(rows[0].minutos,20);assert.equal(rows[0].tl_att,10);assert.equal(rows[0].reb_tot,undefined);assert.equal(rows[0].ast,undefined);});
test('Mini conserva progresión y felicitación',()=>{const rows=normalize(sample,'2026'),g=engine.create('tl','FEBAMBA Mini',rows.slice(0,5),'2026-10-07');assert.equal(g.target,63);const won=engine.evaluate(g,rows,'2026-10-07');assert.equal(won.status,'achieved');assert.equal(won.achievements.length,1);assert.equal(engine.advance(won,rows,'2026-10-07').target,73);});
test('Temporada distinta no genera objetivos',()=>assert.deepEqual(normalize(sample,'2027'),[]));
test('Identidad ambigua queda excluida',()=>assert.equal(normalize({...sample,boxscores:sample.boxscores.map(a=>({...a,player_rows:[{},{}]}))},'2026').length,0));
test('Partido no terminado queda excluido',()=>assert.equal(normalize({...sample,games:sample.games.map(g=>({...g,Estado:'Pendiente'}))},'2026').length,0));
test('Fecha inválida queda excluida',()=>assert.equal(normalize({...sample,games:sample.games.map(g=>({...g,Fecha:'31/02/2026'}))},'2026').length,0));
test('Formato histórico milo y duplicados',()=>assert.equal(normalize({...sample,boxscores:undefined,sample_boxscores:[...sample.boxscores,...sample.boxscores].map(a=>({...a,player_rows:13,milo:a.player_rows}))},'2026').length,10));
test('Datos faltantes no felicitan',()=>{const rows=normalize({...sample,boxscores:sample.boxscores.map(a=>({...a,player_rows:[{...a.player_rows[0],tiro1p:null}]}))},'2026');assert.equal(engine.measure(rows,'tl').ready,false);});
(async()=>{
 let options,reads=0;global.document={getElementById:id=>({id})};global.NextLevelGradualGoals={mount:async o=>{options=o;return o.loadGames();}};
 const client={from(){const q={};for(const m of ['select','eq','gte','lt','order','range'])q[m]=()=>q;q.then=(resolve,reject)=>{reads++;return Promise.resolve({data:[{...normalize(sample,'2026')[0],tl_in:8}],error:null}).then(resolve,reject);};return q;}};
 const verify=()=>{};const rows=await connect({client,playerId:'mini-other-player',season:'2026',official:sample,verifyAccount:verify});
 assert.equal(options.playerId,'mini-other-player');assert.deepEqual(options.metrics,['tl','t2']);assert.equal(options.verifyAccount,verify);assert.equal(options.anchor.id,'mini-gradual-goals');assert.equal(options.dashboard.id,'mini-goals-dashboard');assert.equal(rows.length,10);assert.equal(rows[0].tl_in,8);assert.equal(reads,1);
 console.log('OK Plantilla para cualquier jugador Mini, cuenta verificada, sin duplicar snapshot y nube');console.log(`${count+1} comprobaciones Mini pasaron.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
