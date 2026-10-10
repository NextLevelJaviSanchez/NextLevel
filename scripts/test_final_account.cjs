const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
const source=fs.readFileSync('supabase/functions/nextlevel-onboard/index.ts','utf8');const context={COACH_ID:'275323dc-c40c-4e3d-b6db-00147bf30b4d',verifyChangedPassword:async()=>{}};vm.createContext(context);vm.runInContext(stripTypeScriptTypes(source.slice(source.indexOf('async function linkedPlayerAccount'),source.indexOf('Deno.serve('))),context);
const playerId='11111111-0000-0000-0000-000000000012',accountId='22222222-0000-0000-0000-000000000012';let linked=accountId,email='test-player@example.invalid',writes=[];
const db={from:table=>{assert.equal(table,'players');return {select:()=>({eq:(key,id)=>{assert.equal(key,'id');assert.equal(id,playerId);return {maybeSingle:async()=>({data:{id:playerId,name:'Jugador de prueba',user_id:linked}})};}})};},auth:{admin:{getUserById:async id=>{assert.equal(id,accountId);return {data:{user:{id,email}}};},updateUserById:async(id,attributes)=>{writes.push({id,attributes});return {error:null};}}}};
(async()=>{
 await assert.rejects(()=>context.changePlayerPassword(db,playerId,'short','coach@example.invalid'));assert.equal(writes.length,0);
 linked=null;await assert.rejects(()=>context.changePlayerPassword(db,playerId,'TestOnly2026!','coach@example.invalid'),/vinculada/);assert.equal(writes.length,0);linked=accountId;
 email='coach@example.invalid';await assert.rejects(()=>context.changePlayerPassword(db,playerId,'TestOnly2026!',email),/jugador/);assert.equal(writes.length,0);email='test-player@example.invalid';
 const result=await context.changePlayerPassword(db,playerId,'TestOnly2026!','coach@example.invalid');assert.equal(result.ok,true);assert.equal(result.verified,true);assert.equal(writes.length,1);assert.equal(writes[0].id,accountId);assert.equal(Object.keys(writes[0].attributes).join(','),'password');assert(!('password' in result));
 await assert.rejects(()=>context.changePlayerPassword(db,playerId,'TestOnly2026!','coach@example.invalid',async()=>{throw Error('Verificación de login falló');}),/Verificación de login falló/);
 const originalUpdate=db.auth.admin.updateUserById;
 db.auth.admin.updateUserById=async(id,attributes)=>{assert.equal(id,accountId);assert.deepEqual(Object.keys(attributes).sort(),['email','email_confirm']);assert.equal(attributes.email_confirm,true);return {data:{user:{id,email:attributes.email}}};};
 const corrected=await context.changePlayerEmail(db,playerId,' corrected@example.invalid ','coach@example.invalid');assert.equal(corrected.email,'corrected@example.invalid');assert.equal(corrected.playerId,playerId);
 await assert.rejects(()=>context.changePlayerEmail(db,playerId,'bad','coach@example.invalid'),/correo nuevo/);
 await assert.rejects(()=>context.changePlayerEmail(db,playerId,'coach@example.invalid','coach@example.invalid'),/distinto/);
 db.auth.admin.updateUserById=async()=>({error:new Error('Email ya registrado')});await assert.rejects(()=>context.changePlayerEmail(db,playerId,'corrected@example.invalid','coach@example.invalid'),/ya registrado/);
 db.auth.admin.updateUserById=originalUpdate;
 db.auth.admin.updateUserById=async()=>({error:new Error('Auth no disponible')});await assert.rejects(()=>context.changePlayerPassword(db,playerId,'TestOnly2026!','coach@example.invalid'),/Auth no disponible/);
 new vm.Script(stripTypeScriptTypes(source).replace(/^import .*$/m,''));

 console.log('OK: cuenta vinculada correcta, validación, sin login, cuenta coach protegida y error de Auth. Sin cambios reales.');
})().catch(e=>{console.error(e);process.exitCode=1;});
