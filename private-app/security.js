(function(root){
 'use strict';
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const legacy=/^(?:nl_(?:pf_|plan_progress_|coach_draft_|obj_|fis_|intake_|ef_photos_)|nextlevel_u11_|nextlevel_private_v1:|plan_mia|mia_plan|lara_plan|.*_berazategui_plan_v1$|intake_|fotos_)/;
 function legacyKeys(storage){const keys=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k&&legacy.test(k))keys.push(k);}return keys;}
 function eraseLegacy(storage){legacyKeys(storage).forEach(k=>storage.removeItem(k));}
 async function guard(client,surface,onEnd){
  const initial=await client.auth.getUser();
  if(initial.error||!UUID.test(initial.data?.user?.id||''))throw Error('Iniciá sesión para abrir tu perfil.');
  const id=initial.data.user.id;let active=true;
  const hide=()=>{surface.document.documentElement.classList.add('locked');};
  const end=()=>{if(!active)return;active=false;hide();onEnd();surface.location.replace('login.html');};
  const assert=()=>{if(!active)throw Error('La sesión terminó.');};
  const verify=async()=>{assert();try{const result=await client.auth.getUser();if(result.error||result.data?.user?.id!==id){end();throw Error('Volvé a iniciar sesión.');}assert();return id;}catch(e){end();throw e;}};
  const {data:listener}=client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(session?.user&&session.user.id!==id))end();});
  let checking=false;
  const restore=async()=>{if(!active||checking)return;checking=true;hide();try{await verify();surface.document.documentElement.classList.remove('locked');}catch(_){end();}finally{checking=false;}};
  const show=event=>{if(event.persisted)restore();};
  const visibility=()=>{if(surface.document.visibilityState==='hidden')hide();else restore();};
  surface.addEventListener('pagehide',hide);surface.addEventListener('pageshow',show);surface.document.addEventListener('visibilitychange',visibility);
  const timer=surface.setInterval(restore,60000);
  return {id,assert,verify,end,dispose(){listener?.subscription?.unsubscribe();surface.removeEventListener('pagehide',hide);surface.removeEventListener('pageshow',show);surface.document.removeEventListener('visibilitychange',visibility);surface.clearInterval(timer);}};
 }
 const api={UUID,legacyKeys,eraseLegacy,guard};if(typeof module!=='undefined')module.exports=api;else root.NextLevelSecurity=api;
})(typeof window==='undefined'?{}:window);
