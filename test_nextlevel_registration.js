const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module');
const {firstName}=require('./nextlevel_player_context.js');
assert.equal(firstName('PORTINARI, LUBA JULIETA'),'Luba');assert.equal(firstName('Mía Sánchez'),'Mía');assert.equal(firstName('SANCHEZ, MILO BASTIAN'),'Milo');
const source=fs.readFileSync('supabase/functions/nextlevel-onboard/index.ts','utf8');
const code=source.slice(source.indexOf('const clubIdentity='),source.indexOf('async function syncPlayer('));
const context={norm:s=>String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim()};vm.createContext(context);vm.runInContext(stripTypeScriptTypes(source.slice(source.indexOf('function playerNameKey('),source.indexOf('const teamName='))),context);vm.runInContext(stripTypeScriptTypes(code),context);
const config={category:'U13',template:'u13',club:'CLUB SOCIAL Y DEPORTIVO BERAZATEGUI',cabbName:'PORTINARI, LUBA JULIETA',tournaments:[]};
const team={Nombre:'DEP. BERAZATEGUI',Categoria:'LA LIGA FEDERAL INFANTILES FEMENINA',Temporada:'2026',Competicion:'FORMATIVAS',Delegacion:'CONFEDERACION ARGENTINA DE BASQUETBOL'};
assert(context.federalCandidate(team,config,'2026'));for(const change of [{Nombre:'OTRO CLUB'},{Categoria:'LA LIGA FEDERAL CADETES FEMENINA'},{Temporada:'2025'}])assert(!context.federalCandidate({...team,...change},config,'2026'));
(async()=>{let pj=5,categoryChecks=0;const client={teams:async()=>[team],roster:async()=>[{Nombre:config.cabbName,PartidosJugados:pj}],category:async()=>{categoryChecks++;}};
let result=await context.discoverFederal(client,config,'2026');assert.equal(result.length,1);assert.equal(categoryChecks,1);assert.equal(result[0].label,'Federal CABB');
pj=0;assert.equal((await context.discoverFederal(client,config,'2026')).length,0);assert.equal(categoryChecks,1);
pj=5;assert.equal((await context.discoverFederal(client,{...config,tournaments:result},'2026')).length,0);
assert.equal((await context.discoverFederal(client,{...config,template:'mini'},'2026')).length,0);
console.log('OK: bienvenida, Federal verificado, ausencia de participación, duplicados y Mini');
})().catch(e=>{console.error(e);process.exitCode=1;});

// Updating uses the authorized server even when browser access to player_data is unavailable.
class Element{constructor(tag){this.tag=tag;this.children=[];this.style={};this.value='';}append(e){this.children.push(e);}before(e){root=e;}setAttribute(){}replaceChildren(){this.children=[];}querySelectorAll(tag){return this.children.flatMap(c=>[...(c.tag===tag?[c]:[]),...c.querySelectorAll(tag)]);}}
let root,requests=0;const anchor=new Element('div'),player={id:'registered',name:'Luba Portinari',category:'U13'};
const sandbox={document:{getElementById:()=>anchor,createElement:tag=>new Element(tag)},allPlayers:[player],supa:{from:()=>{throw Error('Browser read must not be required');},functions:{invoke:async(_,args)=>{assert.equal(args.body.playerId,player.id);assert.equal(args.body.action,'sync');requests++;return {data:{games:28}};}}},doRefresh:async()=>{}};
sandbox.window=sandbox;vm.createContext(sandbox);vm.runInContext(fs.readFileSync('nextlevel_player_sync.js','utf8'),sandbox);sandbox.NextLevelSync.render([player]);const boxes=root.querySelectorAll('input'),check=boxes.find(e=>e.type==='checkbox');boxes.find(e=>e.type==='number').value='2026';check.checked=true;check.onchange();root.querySelectorAll('button')[0].onclick().then(()=>{assert.equal(requests,1);console.log('OK: sync independiente de lectura de configuración desde navegador');}).catch(e=>{console.error(e);process.exitCode=1;});

assert(context.samePlayerName('ALMA, SMIGIEL','SMIGIEL, ALMA'));
assert(!context.samePlayerName('ALMA, SMIGIEL','ALMA VALENTINA, SMIGIEL'));
assert(!context.samePlayerName('ALMA, SMIGIEL','ALMA, BENITEZ'));
const snapshot=JSON.parse(fs.readFileSync('cabb_team_2026.json','utf8'));
const appearances=snapshot.games.filter(g=>g.tournament==='AFMB').flatMap(g=>g.players.filter(p=>context.samePlayerName(p.name,'SMIGIEL, ALMA')));
assert.equal(appearances.length,22);assert.equal(new Set(appearances.map(p=>p.name)).size,2);
console.log('OK: 22 actas reales de Alma, inversión de nombre/apellido sin confundir otras jugadoras');
