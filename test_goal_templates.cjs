const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const appRoot=process.argv[2],{compileTemplate}=require(path.join(appRoot,'nextlevel_template.js'));
for(const [category,template] of [['U11','mini'],['U13 Femenino','u13'],['U15','u13'],['U17','u13'],['U19','u13']]){
 const playerId='99999999-0000-0000-0000-000000000001',context={playerId,season:'2026',category,template,name:'Jugador de prueba'};
 const source=fs.readFileSync(path.join(appRoot,template==='mini'?'perfil_milo_sanchez_u11.html':'perfil_mia_sanchez_14.html'),'utf8'),html=compileTemplate(source,context);
 assert.ok(html.includes('"category":"'+category+'"'));
 for(const asset of ['nextlevel_goal_catalog','nextlevel_gradual_goals','nextlevel_coach_workspace'])assert.equal((html.match(new RegExp('src="'+asset+'\\.js','g')) || []).length,1);
 assert.ok(html.includes('nextlevel_goal_catalog.js?v=20261007-goals-final'));
 assert.ok(html.indexOf('src="nextlevel_goal_catalog.js')<html.indexOf('src="nextlevel_gradual_goals.js'));
 if(template==='mini'){assert.equal((html.match(/id="mini-gradual-goals"/g) || []).length,1);assert.equal((html.match(/id="mini-goals-dashboard"/g) || []).length,1);assert.ok(html.includes('data-profile-choice="technicalAreas"'));}
 else{assert.ok(html.includes('nextlevel-profile-preferences'));assert.ok(html.includes('data-val="Pases"'));assert.ok(html.includes('data-val="Rebotes"'));}
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(!/\bsrc=/.test(match[1]) && match[2].trim())new vm.Script(match[2]);}
 console.log('OK Plantilla '+category+': identidad, preferencias, módulos únicos y código válido.');
}
