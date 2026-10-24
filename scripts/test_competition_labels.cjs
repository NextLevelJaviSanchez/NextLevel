const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'test_private_app.cjs'),'utf8').split('(async()=>{')[0];
const tests=String.raw`
(async()=>{
 let checked=0;
 for(const competition of ['BASO (Torneos 2026)','FeBAMBA (Torneos 2026)','AFMB (Torneos 2026)','Liga Federal Formativa (Torneos 2026)','Otro torneo (Apertura)']){
  const f=await fixture({coach:true,requested:null,adminApi:true}),d=f.w.document;
  const team={club:'Club de prueba',categoryName:'CADETES MASCULINO',competition,federation:'Federación de prueba',season:'2026'};
  f.client.functions.invoke=async(name,{body})=>body.action==='capabilities'?{data:{accounts:true,sync:true}}:body.action==='teams'?{data:{teams:[team]}}:body.action==='roster'?{data:{players:[{name:'Jugador ficticio',pj:3,dorsal:8}]}}:{error:Error('Unexpected write')};
  const admin=[...d.querySelectorAll('details')].find(x=>x.querySelector(':scope > summary')?.textContent==='➕ Dar de alta un jugador');assert(admin);admin.querySelector('button').click();await f.settle();
  const byLabel=text=>[...d.querySelectorAll('label')].find(l=>l.firstChild?.textContent===text)?.querySelector('input,select');
  const click=text=>{const b=[...d.querySelectorAll('button')].find(b=>b.textContent===text);assert(b,text);b.click();};
  byLabel('Club o localidad').value='Club';click('Buscar en CABB');await f.settle();click('Club de prueba');
  const category=byLabel('Categoría');category.value='CADETES MASCULINO';category.dispatchEvent(new f.w.Event('change'));
  click(competition+' · Federación de prueba');await f.settle();click('Jugador ficticio · 3 PJ');
  const label=byLabel('Nombre del torneo en el perfil');assert(label);assert.equal(label.value,competition.replace(/\s*\(Torneos?\s+20\d{2}\)\s*$/i,''));assert(label.required);assert.equal(f.saved.length,0);checked++;
  f.dom.window.close();
 }
 const code=fs.readFileSync(path.join(__dirname,'../private-app/app.js'),'utf8');
 const helper=code.match(/ function competitionName\(spec\)\{[^\n]+\}/)[0];
 const name=new Function(helper+';return competitionName;')();
 assert.equal(name({federation:'Federación provincial'}),'');assert.equal(name({tournament:'FeBAMBA Mini'}),'FeBAMBA Mini');checked+=2;
 console.log('PASS competition labels:',checked,'checks; BASO, FeBAMBA, AFMB, Federal, custom names and no guessed federation fallback');
})().catch(e=>{console.error(e);process.exitCode=1;});`;
vm.runInThisContext('(function(require,__dirname){'+source+tests+'})',{filename:__filename})(require,__dirname);
