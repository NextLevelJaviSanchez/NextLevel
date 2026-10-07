const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
const source=fs.readFileSync('supabase/functions/nextlevel-onboard/index.ts','utf8');const context={};vm.createContext(context);vm.runInContext(stripTypeScriptTypes(source.slice(source.indexOf('async function linkedPlayerAccount'),source.indexOf('Deno.serve('))),context);
const playerId='11111111-0000-0000-0000-000000000012',accountId='22222222-0000-0000-0000-000000000012';let linked=accountId,email='test-player@example.invalid',writes=[];
const db={from:table=>{assert.equal(table,'players');return {select:()=>({eq:(key,id)=>{assert.equal(key,'id');assert.equal(id,playerId);return {maybeSingle:async()=>({data:{id:playerId,name:'Jugador de prueba',user_id:linked}})};}})};},auth:{admin:{getUserById:async id=>{assert.equal(id,accountId);return {data:{user:{id,email}}};},updateUserById:async(id,attributes)=>{writes.push({id,attributes});return {error:null};}}}};
(async()=>{
 await assert.rejects(()=>context.changePlayerPassword(db,playerId,'short','coach@example.invalid'));assert.equal(writes.length,0);
 linked=null;await assert.rejects(()=>context.changePlayerPassword(db,playerId,'TestOnly2026!','coach@example.invalid'),/vinculada/);assert.equal(writes.length,0);linked=accountId;
 email='coach@example.invalid';await assert.rejects(()=>context.changePlayerPassword(db,playerId,'TestOnly2026!',email),/jugador/);assert.equal(writes.length,0);email='test-player@example.invalid';
 const result=await context.changePlayerPassword(db,playerId,'TestOnly2026!','coach@example.invalid');assert.equal(result.ok,true);assert.equal(writes.length,1);assert.equal(writes[0].id,accountId);assert.equal(Object.keys(writes[0].attributes).join(','),'password');assert(!('password' in result));
 db.auth.admin.updateUserById=async()=>({error:new Error('Auth no disponible')});await assert.rejects(()=>context.changePlayerPassword(db,playerId,'TestOnly2026!','coach@example.invalid'),/Auth no disponible/);
 new vm.Script(stripTypeScriptTypes(source).replace(/^import .*$/m,''));new vm.Script(fs.readFileSync('nextlevel_account_admin.js','utf8'));
 for(const m of fs.readFileSync('admin.html','utf8').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!m[1].includes('src='))new vm.Script(m[2]);
 console.log('OK: cuenta vinculada correcta, validación, sin login, cuenta coach protegida y error de Auth. Sin cambios reales.');
})().catch(e=>{console.error(e);process.exitCode=1;});
