/* Primera prueba Mini: identidad propia, formación y registros explícitos. */
(function(){
'use strict';
function playerMatches(name){const text=String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();return /\bMILO\b/.test(text) && /\bSANCHEZ\b/.test(text);}
function mergeEntries(local,cloud){return [...new Map([...cloud,...local].map(e=>[e.id,e])).values()].sort((a,b)=>String(b.date).localeCompare(String(a.date)));}
function validPractice(entry,today){return /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && entry.date<=today && Number.isFinite(Date.parse(entry.date+'T12:00:00Z')) && new Date(entry.date+'T12:00:00Z').toISOString().slice(0,10)===entry.date && !!entry.success.trim() && entry.success.length<=500 && entry.next.length<=500;}
function averageMini(rows,key){
 if(!rows.length || rows.some(r=>r[key]==null || r[key]==='' || typeof r[key]==='boolean' || !Number.isFinite(Number(r[key])) || (key!=='valoracion' && Number(r[key])<0)))return null;
 return rows.reduce((sum,r)=>sum+Number(r[key]),0)/rows.length;
}
function photoSource(value){return typeof value==='string' && (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) || /^https:\/\//.test(value)) ? value : null;}
function validProfile(profile,today){
 if(profile.birthDate && !validPractice({date:profile.birthDate,success:'date',next:''},today))return false;
 if(profile.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.contactEmail))return false;
 return ['height','weight','wingspan','reach','shoeSize'].every(k=>profile[k]==null || profile[k]==='' || (Number.isFinite(Number(profile[k])) && Number(profile[k])>0));
}
function createAutosave(save,onError,delay=700){
 let timer=null,chain=Promise.resolve();
 const flush=()=>{clearTimeout(timer);timer=null;chain=chain.then(save).catch(onError);return chain;};
 return {schedule(){clearTimeout(timer);timer=setTimeout(flush,delay);},flush};
}
async function load(){
const $=id=>document.getElementById(id),key=window.NextLevelPlayer && window.NextLevelPlayer.playerId!=='e814cad8-7be8-45dd-8fdd-2d5dcc32bc96' ? 'nextlevel_u11_'+window.NextLevelPlayer.playerId+'_v1' : 'nextlevel_u11_milo_v1';let state={entries:[],physical:[],profile:{},challenge:'Mirar antes de pasar'},playerId=null,linkedUserId=null,busy=false;
try{const saved=JSON.parse(localStorage.getItem(key) || '{}');state={...state,...saved};if(!Array.isArray(state.entries))state.entries=[];if(!Array.isArray(state.physical))state.physical=[];}catch(e){}
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const status=text=>$('mini-status').textContent=window.NextLevelPlayer ? text.replace(/Milo/g,NextLevelPlayer.name) : text;
const saveLocal=()=>{try{localStorage.setItem(key,JSON.stringify(state));return true;}catch(e){status('No se pudo guardar en este dispositivo. No cierres esta página antes de conservar tu registro.');return false;}};
const show=name=>{document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on',p.id==='mini-'+name));document.querySelectorAll('.tabs button,.bottom-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.pane===name));};
document.querySelectorAll('[data-pane]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.pane)));document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.go)));
const node=(tag,text,parent)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(parent)parent.append(n);return n;};
const applyPhoto=()=>{const src=photoSource(state.photo);$('mini-avatar-photo').hidden=!src;$('mini-avatar-placeholder').hidden=!!src;if(src)$('mini-avatar-photo').src=src;else $('mini-avatar-photo').removeAttribute('src');};
const mentalTips={
 'Animarme a participar':['🌟 Un pasito de confianza','Elegí una acción para probar hoy: pedir un pase, ofrecerte o tirar cuando tengas espacio. Después contá cómo te sentiste.'],
 'Seguir después de un error':['🔄 La próxima jugada','Soltá el aire y elegí qué hacer ahora: volver a defender, mirar al compañero o pedir la pelota otra vez.'],
 'Concentrarme en la próxima jugada':['👀 Una cosa a la vez','Antes de entrar, elegí una consigna corta con tu coach, como mirar antes de pasar. Al terminar, recordá una vez que la usaste.'],
 'Comunicarme con mis compañeros':['🤝 Nos ayudamos','Probá avisar que estás libre o alentar a un compañero. Buscá una oportunidad en cada entrenamiento.'],
 'Disfrutar y manejar los nervios':['🌱 Tomarme un momento','Si aparecen nervios, hacé una pausa y soltá el aire despacio. Podés contarle a tu familia o coach qué te ayudaría.']
};
const renderProfilePlan=()=>{$('mini-plan-season-goal').textContent=state.profile.seasonGoal || 'Podés elegir tu objetivo en Perfil y conversarlo con el coach.';
$('mini-plan-areas').textContent=(state.profile.technicalAreas || []).join(' · ') || 'Podés elegir tus áreas en Perfil.';
const tips=$('mini-plan-mental');tips.replaceChildren();for(const area of state.profile.mentalAreas || []){const tip=mentalTips[area];if(!tip)continue;const card=node('section',null,tips);card.className='tip';node('h3',tip[0],card);node('p',tip[1],card);}if(!tips.children.length)node('p','Elegí en Perfil qué querés trabajar. Acá vas a encontrar ideas para probar y revisar con tu coach.',tips);

};
const render=()=>{
applyPhoto();document.querySelectorAll('[data-profile-field]').forEach(el=>el.value=state.profile[el.dataset.profileField] ?? '');
document.querySelectorAll('[data-profile-choice]').forEach(el=>el.checked=(state.profile[el.dataset.profileChoice] || []).includes(el.value));
renderProfilePlan();
$('mini-challenge').value=state.challenge;$('challenge-preview').textContent=state.challenge;
$('mini-enjoy').value=state.profile.enjoy || '';$('mini-learn').value=state.profile.learn || '';$('mini-position').value=state.profile.position || 'Estoy probando distintas posiciones';
const cutoff=new Date(today+'T12:00:00Z');cutoff.setUTCDate(cutoff.getUTCDate()-6);const week=state.entries.filter(e=>e.date>=cutoff.toISOString().slice(0,10) && e.date<=today);$('week-summary').textContent=week.length ? `${week.length} experiencias registradas en los últimos siete días. Podés revisarlas con tu coach.` : 'Todavía no registraste una práctica esta semana.';
const history=$('mini-history');history.replaceChildren();node('h3','🌱 Mis experiencias recientes',history);state.entries.slice(0,10).forEach(e=>{const card=node('section',null,history);card.className='entry';node('strong',e.date+' · '+e.areas.join(' / '),card);node('p','⭐ '+e.success,card);if(e.next)node('p','🌱 '+e.next,card);node('small',e.synced ? 'Guardado en Supabase' : 'Guardado en este dispositivo · pendiente de vincular/sincronizar',card);});
};
$('mini-physical-date').value=today;$('mini-physical-date').max=today;
$('mini-date').value=today;$('mini-date').max=today;
async function verifyAccount(){if(!client || !playerId)throw Error('Entrá con tu cuenta para sincronizar.');const {data,error}=await client.auth.getUser();if(error || !data?.user || data.user.id!==linkedUserId)throw Error('Volvé a comprobar la cuenta de Milo.');}
async function persistProfile(){
 const snapshot={...state.profile,challenge:state.challenge};const serialized=JSON.stringify(snapshot);await verifyAccount();
 const {error}=await client.from('player_data').upsert({player_id:playerId,module:'mini_profile_v1',data:snapshot,updated_at:new Date().toISOString()},{onConflict:'player_id,module'});if(error)throw error;
 if(serialized===JSON.stringify({...state.profile,challenge:state.challenge})){state.profileDirty=false;$('mini-profile-save-status').textContent='✅ Guardado automáticamente en Supabase.';}else $('mini-profile-save-status').textContent='Guardando los últimos cambios…';saveLocal();
}
const profileAutosave=createAutosave(async()=>{
 if(!state.profileDirty)return;
 if(!validProfile(state.profile,today)){$('mini-profile-save-status').textContent='Borrador guardado en este dispositivo. Revisá la fecha, el correo o las medidas para sincronizar.';return;}
 if(!playerId){$('mini-profile-save-status').textContent='Guardado en este dispositivo · entrá con tu cuenta para sincronizar.';return;}
 $('mini-profile-save-status').textContent='Guardando…';await persistProfile();
},e=>{$('mini-profile-save-status').textContent='Guardado en este dispositivo · pendiente de sincronización: '+e.message;});
function captureProfile(){
 const profile={...state.profile,enjoy:$('mini-enjoy').value.trim(),learn:$('mini-learn').value.trim(),position:$('mini-position').value};
 document.querySelectorAll('[data-profile-field]').forEach(el=>{profile[el.dataset.profileField]=el.value.trim();});
 for(const kind of ['technicalAreas','mentalAreas'])profile[kind]=[...document.querySelectorAll('[data-profile-choice="'+kind+'"]:checked')].map(el=>el.value);
 const goalSeason=window.NextLevelPlayer?.season || '2026';profile.seasonGoals={...(state.profile.seasonGoal ? {[state.profile.seasonGoalSeason || '2026']:state.profile.seasonGoal}:{}),...state.profile.seasonGoals,[goalSeason]:profile.seasonGoal};profile.seasonGoalSeason=goalSeason;state.profileDirty=true;state.profile=profile;
 if(!saveLocal()){$('mini-profile-save-status').textContent='No se pudo guardar en este dispositivo. Conservá tus cambios antes de cerrar.';return;}
 renderProfilePlan();$('mini-profile-save-status').textContent='Cambios guardados en este dispositivo · sincronizando…';profileAutosave.schedule();
}
document.querySelectorAll('#mini-perfil input:not([type="file"]),#mini-perfil textarea,#mini-perfil select').forEach(el=>el.addEventListener(el.type==='checkbox' || el.tagName==='SELECT'?'change':'input',captureProfile));
window.addEventListener('online',()=>profileAutosave.schedule());
$('mini-photo-button').addEventListener('click',()=>$('mini-photo-input').click());
async function persistPhoto(){await verifyAccount();const snapshot=state.photo;const {error}=await client.from('player_data').upsert({player_id:playerId,module:'foto_url',data:snapshot,updated_at:new Date().toISOString()},{onConflict:'player_id,module'});if(error)throw error;if(snapshot===state.photo)state.photoDirty=false;saveLocal();$('mini-photo-status').textContent='✅ Foto guardada en Supabase. Se verá en tus otros dispositivos.';}
$('mini-photo-input').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;const btn=$('mini-photo-button');btn.disabled=true;
 try{if(!file.type.startsWith('image/') || file.size>5*1024*1024)throw Error('Elegí una imagen de hasta 5 MB.');
 const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('No se pudo leer la imagen.'));reader.readAsDataURL(file);});
 const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('No se pudo abrir la imagen.'));image.src=data;});
 const canvas=document.createElement('canvas'),scale=Math.min(1,640/Math.max(img.width,img.height));canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const src=canvas.toDataURL('image/jpeg',.82);if(src.length>750000)throw Error('Elegí una imagen más pequeña.');
 state.photo=src;state.photoDirty=true;applyPhoto();if(!saveLocal())return;$('mini-photo-status').textContent='Foto guardada en este dispositivo · pendiente de sincronización.';if(playerId)await persistPhoto();
 }catch(e){$('mini-photo-status').textContent='La foto queda pendiente: '+e.message;}finally{btn.disabled=false;event.target.value='';}
});
$('mini-export-profile').addEventListener('click',()=>{const paper=$('mini-print-profile');paper.replaceChildren();node('h1',window.NextLevelPlayer ? NextLevelPlayer.name+' · '+NextLevelPlayer.category : 'Milo Sánchez · Mini U11',paper);node('p',window.NextLevelPlayer ? NextLevelPlayer.club+' · '+NextLevelPlayer.season : 'Quilmes Atlético Club · FeBAMBA · 2026',paper);if(photoSource(state.photo)){const image=node('img',null,paper);image.src=state.photo;image.alt='Foto de Milo';}
 for(const [title,text] of [['Participación oficial',$('mini-source-date').textContent],['Mi posición',state.profile.position],['Qué disfruto',state.profile.enjoy],['Qué quiero aprender',state.profile.learn],['Mi sueño',state.profile.dream],['Objetivo de temporada',state.profile.seasonGoal],['Áreas a mejorar',(state.profile.technicalAreas || []).join(' · ')],['Áreas mentales',(state.profile.mentalAreas || []).join(' · ')],['Para conversar con el coach',state.profile.coachNote]]){if(text){node('h2',title,paper);node('p',text,paper);}}node('p',$('mini-coach-data').textContent,paper);window.print();});
$('mini-save-challenge').addEventListener('click',()=>{state.profileDirty=true;state.challenge=$('mini-challenge').value;if(saveLocal())status('Desafío guardado. Conversalo con tu coach.');render();});
$('mini-progress-form').addEventListener('submit',event=>{event.preventDefault();const entry={id:crypto.randomUUID(),date:$('mini-date').value,areas:[state.challenge],success:$('mini-success').value.trim(),next:$('mini-next').value.trim(),createdAt:new Date().toISOString(),source:'player_training',synced:false};if(!validPractice(entry,today)){status('Revisá la fecha y contá algo que te haya salido bien.');return;}state.entries=mergeEntries([entry],state.entries);if(saveLocal()){status('Práctica guardada en este dispositivo.');$('mini-success').value=$('mini-next').value='';}render();});
const renderPhysical=()=>{const list=$('mini-physical-history');list.replaceChildren();state.physical.slice(0,10).forEach(e=>{const card=node('section',null,list);card.className='entry';node('strong',e.date,card);node('p',Object.entries({height:'Altura',weight:'Peso',wingspan:'Envergadura'}).filter(([k])=>e[k]!=null).map(([k,label])=>`${label}: ${e[k]} ${k==='weight'?'kg':'cm'}`).join(' · '),card);node('small',e.synced?'Guardado en Supabase':'Guardado en este dispositivo',card);});};
$('mini-physical-form').addEventListener('submit',event=>{event.preventDefault();const entry={id:crypto.randomUUID(),date:$('mini-physical-date').value,source:'family_measurement',synced:false};for(const [key,id] of [['height','mini-height'],['weight','mini-weight'],['wingspan','mini-wingspan']]){const value=$(id).value;if(value!=='')entry[key]=Number(value);}
if(!validPractice({date:entry.date,success:'medida',next:''},today) || !['height','weight','wingspan'].some(k=>entry[k]!=null) || ['height','weight','wingspan'].some(k=>entry[k]!=null && (!Number.isFinite(entry[k]) || entry[k]<=0))){status('Revisá la fecha e ingresá al menos una medida positiva.');return;}
state.physical=mergeEntries([entry],state.physical);if(saveLocal())status('Medidas guardadas en este dispositivo.');renderPhysical();});renderPhysical();
let client=null;try{client=supabase.createClient(NextLevelAppConfig.url,NextLevelAppConfig.anonKey);}catch(e){}
$('mini-logout').addEventListener('click',async()=>{
 const button=$('mini-logout');button.disabled=true;button.textContent='Saliendo…';
 saveLocal();
 try{
  await profileAutosave.flush();
  if(!client)throw Error('No se pudo conectar para cerrar la sesión. Intentá de nuevo.');
  const {error}=await client.auth.signOut();if(error)throw error;
  playerId=null;linkedUserId=null;window.location.href='login.html';
 }catch(e){status('No se pudo cerrar la sesión: '+e.message);button.disabled=false;button.textContent='Salir ↗';}
});

async function connectAccount(){
if(!client){status('No se pudo conectar con Supabase. Tus registros locales se conservan.');return;}
try{const {data:auth,error:authError}=await client.auth.getUser();if(authError || !auth?.user){status('Entrá con la cuenta propia de Milo para vincular el progreso. Tus cambios se conservan en este dispositivo.');return;}
const {data,error}=await client.from('players').select('id,name').eq('user_id',auth.user.id);if(error)throw error;const matches=(data || []).filter(p=>window.NextLevelPlayer ? p.id===window.NextLevelPlayer.playerId : playerMatches(p.name));if(matches.length!==1){status('No se encontró un único perfil de Milo vinculado a esta cuenta. No se usa el perfil de otro jugador.');return;}playerId=matches[0].id;linkedUserId=auth.user.id;
const {data:preferences,error:prefError}=await client.from('player_data').select('data').eq('player_id',playerId).eq('module','mini_profile_v1').maybeSingle();if(prefError)throw prefError;if(!preferences?.data && window.NextLevelProfileCodec && !state.profileDirty){const {data:mature}=await client.from('player_data').select('data').eq('player_id',playerId).eq('module','perfil_v1').maybeSingle();if(mature?.data)state.profile=NextLevelProfileCodec.toMini(mature.data);}
if(preferences?.data && !state.profileDirty){const {challenge,...profile}=preferences.data;state.profile=profile;if(challenge)state.challenge=challenge;if(window.NextLevelProfileCodec)state.profile.seasonGoal=NextLevelProfileCodec.seasonGoal(profile,window.NextLevelPlayer?.season || '2026');}
let rows=[];for(let from=0;;from+=500){const {data:chunk,error:readError}=await client.from('player_data').select('module,data').eq('player_id',playerId).like('module','plan_progress_v1:%').order('module').range(from,from+499);if(readError)throw readError;rows.push(...(chunk || []));if(!chunk || chunk.length<500)break;}
const cloud=rows.filter(r=>r.module.startsWith('plan_progress_v1:') && r.data?.id && Array.isArray(r.data.areas)).map(r=>({...r.data,synced:true}));const ids=new Set(cloud.map(e=>e.id));state.entries=mergeEntries(state.entries.map(e=>ids.has(e.id)?{...e,synced:true}:e),cloud);const {data:measureRows,error:measureError}=await client.from('player_data').select('module,data').eq('player_id',playerId).like('module','mini_measures_v1:%');if(measureError)throw measureError;const measures=(measureRows || []).filter(r=>r.module.startsWith('mini_measures_v1:') && r.data?.id).map(r=>({...r.data,synced:true}));const measureIds=new Set(measures.map(e=>e.id));state.physical=mergeEntries(state.physical.map(e=>measureIds.has(e.id)?{...e,synced:true}:e),measures);saveLocal();render();renderPhysical();$('mini-sync').hidden=false;status('Cuenta de Milo vinculada. Podés sincronizar sus registros cuando quieras.');
const {data:official,error:officialError}=await client.from('player_data').select('data').eq('player_id',playerId).eq('module',window.NextLevelPlayer ? 'cabb_mini_official_v1:'+NextLevelPlayer.season : 'cabb_mini_official_v1').maybeSingle();if(officialError)throw officialError;if(official?.data)await renderOfficial(official.data);
const {data:photo,error:photoError}=await client.from('player_data').select('data').eq('player_id',playerId).eq('module','foto_url').maybeSingle();if(photoError)throw photoError;if(!state.photoDirty){state.photo=photoSource(photo?.data);applyPhoto();saveLocal();}
await NextLevelMiniPhysical.connect(client,playerId,linkedUserId);
await NextLevelMiniGoals.connect({client,playerId,season:window.NextLevelPlayer?.season || '2026',official:official?.data,verifyAccount});
NextLevelCoachWorkspace.mount({host:$('mini-conversation'),client,playerId,mode:'player',playerLabel:'Jugador'});
if(state.profileDirty)profileAutosave.schedule();else $('mini-profile-save-status').textContent='Perfil cargado desde Supabase · autoguardado activo.';
}catch(e){playerId=null;$('mini-sync').hidden=true;status('No se pudo vincular el perfil: '+e.message);}
}
$('mini-connect').addEventListener('click',connectAccount);
$('mini-sync').addEventListener('click',async()=>{if(!playerId || !client || busy)return;busy=true;$('mini-sync').disabled=true;try{const {data:auth,error:authError}=await client.auth.getUser();if(authError || !auth?.user || auth.user.id!==linkedUserId)throw Error('Volvé a comprobar la cuenta de Milo antes de sincronizar.');
for(const entry of state.entries.filter(e=>!e.synced)){const {synced,...payload}=entry;const {error}=await client.from('player_data').upsert({player_id:playerId,module:'plan_progress_v1:'+entry.id,data:payload,updated_at:new Date().toISOString()},{onConflict:'player_id,module'});if(error)throw error;entry.synced=true;saveLocal();}
for(const entry of state.physical.filter(e=>!e.synced)){const {synced,...payload}=entry;const {error}=await client.from('player_data').upsert({player_id:playerId,module:'mini_measures_v1:'+entry.id,data:payload,updated_at:new Date().toISOString()},{onConflict:'player_id,module'});if(error)throw error;entry.synced=true;saveLocal();}
profileAutosave.schedule();await profileAutosave.flush();if(state.profileDirty)throw Error("El perfil sigue pendiente; revisá sus datos o la conexión.");if(state.photoDirty)await persistPhoto();status('Prácticas, preferencias y medidas guardadas en Supabase.');render();renderPhysical();}catch(e){status('Quedaron registros pendientes: '+e.message);}finally{busy=false;$('mini-sync').disabled=false;}});
render();
async function renderOfficial(source){
try{if(!source && window.NextLevelSources)source=await NextLevelSources.read('mini');if(!source){const response=await fetch('cabb_milo_u11_2026.json',{cache:'no-store'});if(!response.ok)throw Error();source=await response.json();}
$('mini-stat-summary').replaceChildren();$('mini-game-list').replaceChildren();const acts=source.boxscores || source.sample_boxscores || [];const records=acts.filter(s=>(s.player_rows || s.milo)?.length===1).map(s=>{const g=source.games.find(g=>String(g.IdPartidoNotificacion)===s.id);return {...(s.player_rows || s.milo)[0],date:g?.Fecha,id:s.id,minutos:(s.player_rows || s.milo)[0].milisegundos_jugados==null?null:Number((s.player_rows || s.milo)[0].milisegundos_jugados)/60000};}).filter(r=>r.date).sort((a,b)=>a.date.split('/').reverse().join('-').localeCompare(b.date.split('/').reverse().join('-')));
$('mini-source-date').textContent=`Dato CABB · ${source.games.length} partidos terminados del equipo · ${records.length} actas individuales consultadas · actualizado ${source.checked_at?new Date(source.checked_at).toLocaleString('es-AR',{timeZone:'America/Buenos_Aires',hourCycle:'h23'}):'sin fecha de sincronización'}`;
const metrics=[['puntos','Puntos por partido'],['minutos','Minutos por partido'],['faltascometidas','Faltas cometidas por partido'],['faltasrecibidas','Faltas recibidas por partido'],['valoracion','Valoración CABB por partido']];
const average=key=>averageMini(records,key);$('mini-profile-games').textContent=String(records.length);
for(const [key,label] of metrics){const card=node('section',null,$('mini-stat-summary'));card.className='tip';node('h3',label,card);const value=average(key);node('p',value==null?'Sin datos':value.toFixed(1),card).className='metric-value';node('small',`${records.length} actas disponibles · muestra consultada`,card);}
node('p','La valoración es el cálculo recibido de CABB con los conteos registrados en Mini; no es una evaluación completa de tus habilidades.',$('mini-stat-summary')).className='muted';
const games=[...source.games].sort((a,b)=>a.Fecha.split('/').reverse().join('-').localeCompare(b.Fecha.split('/').reverse().join('-'))).reverse();
for(const g of games){const home=g.NombreEquipoLocal===source.club,rival=home?g.NombreEquipoVisitante:g.NombreEquipoLocal;const detail=node('details',null,$('mini-game-list'));node('summary',g.Fecha+' · '+rival,detail);const result=g.Resultados || {};node('p',`Resultado del equipo: ${home?result.ResultadoLocal:result.ResultadoVisitante}–${home?result.ResultadoVisitante:result.ResultadoLocal}`,detail);const row=records.find(r=>r.id===String(g.IdPartidoNotificacion));if(row){node('p',`Dato CABB: ${row.puntos ?? '—'} puntos · ${row.tiempo_jugado ?? '—'} minutos · ${row.valoracion ?? '—'} valoración`,detail);node('p',`Faltas: ${row.faltascometidas ?? '—'} cometidas · ${row.faltasrecibidas ?? '—'} recibidas`,detail);node('p',`Tiros: dobles ${row.canasta2p ?? '—'}/${row.tiro2p ?? '—'} · libres ${row.canasta1p ?? '—'}/${row.tiro1p ?? '—'}`,detail);}else node('p','Sin acta individual consultada para este partido.',detail);}
NextLevelMiniEvolution.render(records,source.games,source);
$('mini-coach-data').textContent=`Hay ${records.length} actas individuales para conversar: ${average('puntos')?.toFixed(1) ?? '—'} puntos y ${average('minutos')?.toFixed(1) ?? '—'} minutos por partido en esta muestra. Podemos revisar cómo participaste, en qué situaciones aparecen las faltas y qué acción te gustaría practicar. La elección del desafío se acuerda con tu coach.`;
$('mini-data-limit').textContent='Rebotes, asistencias y recuperos no se usan para construir tu perfil porque todavía no confirmamos su cobertura de registro en Mini. La valoración se muestra como dato CABB, con esa limitación.';
}catch(e){$('mini-source-date').textContent='No se pudieron cargar los partidos oficiales. Reintentá más tarde.';}
}
await renderOfficial();
if(client){const {data}=await client.auth.getSession();if(data?.session)await connectAccount();else status('Entrá con la cuenta de Milo para sincronizar. Tus cambios locales se conservan.');}
}
if(typeof module!=='undefined')module.exports={playerMatches,mergeEntries,validPractice,averageMini,validProfile,photoSource,createAutosave};
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',load);
})();
