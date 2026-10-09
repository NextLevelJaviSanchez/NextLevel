/* Primera prueba Mini: identidad propia, formación y registros explícitos. */
(function(){
'use strict';
function playerMatches(name){return name==='Tomás Pérez';}
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
const $=id=>document.getElementById(id),key='nextlevel_u11_'+window.NextLevelPlayer.playerId+'_v1';let state={entries:[],physical:[],profile:{},challenge:'Mirar antes de pasar'},playerId=null,linkedUserId=null,busy=false;
try{const saved=JSON.parse(localStorage.getItem(key) || '{}');state={...state,...saved};if(!Array.isArray(state.entries))state.entries=[];if(!Array.isArray(state.physical))state.physical=[];}catch(e){}
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const status=text=>$('mini-status').textContent=text;
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
document.dispatchEvent(new CustomEvent('nextlevel-profile-preferences',{detail:state.profile}));
for(const area of window.NextLevelGoalCatalog?.practiceAreas(state.profile) || []){if([...$('mini-challenge').options].some(o=>o.value===area))continue;const option=node('option',area,$('mini-challenge'));option.value=area;}
$('mini-plan-areas').textContent=(state.profile.technicalAreas || []).join(' · ') || 'Podés elegir tus áreas en Perfil.';
const tips=$('mini-plan-mental');tips.replaceChildren();for(const area of state.profile.mentalAreas || []){const tip=mentalTips[area];if(!tip)continue;const card=node('section',null,tips);card.className='tip';node('h3',tip[0],card);node('p',tip[1],card);}if(!tips.children.length)node('p','Elegí en Perfil qué querés trabajar. Acá vas a encontrar ideas para probar y revisar con tu coach.',tips);

};
const render=()=>{
applyPhoto();document.querySelectorAll('[data-profile-field]').forEach(el=>el.value=state.profile[el.dataset.profileField] ?? '');
document.querySelectorAll('[data-profile-choice]').forEach(el=>el.checked=(state.profile[el.dataset.profileChoice] || []).includes(el.value));
renderProfilePlan();
$('mini-challenge').value=state.challenge;$('challenge-preview').textContent=state.challenge;
$('mini-enjoy').value=state.profile.enjoy || '';$('mini-learn').value=state.profile.learn || '';$('mini-position').value=[...$('mini-position').options].some(o=>o.value===state.profile.position)?state.profile.position:'Quiero probar de todo';
if(window.NextLevelMiniAdventures)NextLevelMiniAdventures.render({state,node,show,saveLocal,onChoose:mission=>{state.profile.adventureId=mission.id;state.challenge=mission.area;state.profileDirty=true;saveLocal();render();profileAutosave.schedule();}});
const cutoff=new Date(today+'T12:00:00Z');cutoff.setUTCDate(cutoff.getUTCDate()-6);const week=state.entries.filter(e=>e.date>=cutoff.toISOString().slice(0,10) && e.date<=today);$('week-summary').textContent=week.length ? `${week.length} experiencias registradas en los últimos siete días. Podés revisarlas con tu coach.` : 'Todavía no registraste una práctica esta semana.';
const history=$('mini-history');history.replaceChildren();node('h3','🌱 Mis experiencias recientes',history);state.entries.slice(0,10).forEach(e=>{const card=node('section',null,history);card.className='entry';node('strong',e.date+' · '+e.areas.join(' / '),card);node('p','⭐ '+e.success,card);if(e.next)node('p','🌱 '+e.next,card);node('small',e.synced ? 'Guardado en este navegador' : 'DEMO · Guardado en este navegador',card);});
};
$('mini-physical-date').value=today;$('mini-physical-date').max=today;
$('mini-date').value=today;$('mini-date').max=today;
const profileAutosave=createAutosave(async()=>{
 if(!state.profileDirty)return;
 if(!validProfile(state.profile,today)){$('mini-profile-save-status').textContent='Borrador guardado en este dispositivo. Revisá la fecha, el correo o las medidas para sincronizar.';return;}
 if(!playerId){$('mini-profile-save-status').textContent='DEMO · Guardado únicamente en este navegador.';return;}
 $('mini-profile-save-status').textContent='DEMO · Guardado en este navegador.';
},e=>{$('mini-profile-save-status').textContent='Guardado en este dispositivo · pendiente de sincronización: '+e.message;});
function captureProfile(){
 const profile={...state.profile,enjoy:$('mini-enjoy').value.trim(),learn:$('mini-learn').value.trim(),position:$('mini-position').value};
 document.querySelectorAll('[data-profile-field]').forEach(el=>{profile[el.dataset.profileField]=el.value.trim();});
 for(const kind of ['technicalAreas','mentalAreas','playExperiences'])profile[kind]=[...document.querySelectorAll('[data-profile-choice="'+kind+'"]:checked')].map(el=>el.value);
 const goalSeason=window.NextLevelPlayer?.season || '2026';profile.seasonGoals={...(state.profile.seasonGoal ? {[state.profile.seasonGoalSeason || '2026']:state.profile.seasonGoal}:{}),...state.profile.seasonGoals,[goalSeason]:profile.seasonGoal};profile.seasonGoalSeason=goalSeason;state.profileDirty=true;state.profile=profile;
 if(!saveLocal()){$('mini-profile-save-status').textContent='No se pudo guardar en este dispositivo. Conservá tus cambios antes de cerrar.';return;}
 renderProfilePlan();$('mini-profile-save-status').textContent='DEMO · Cambios guardados en este navegador.';profileAutosave.schedule();
}
document.querySelectorAll('#mini-perfil input:not([type="file"]),#mini-perfil textarea,#mini-perfil select').forEach(el=>el.addEventListener(el.type==='checkbox' || el.tagName==='SELECT'?'change':'input',captureProfile));
window.addEventListener('online',()=>profileAutosave.schedule());
$('mini-photo-button').addEventListener('click',()=>$('mini-photo-input').click());
$('mini-photo-input').addEventListener('change',async event=>{let file=event.target.files?.[0];if(!file)return;const btn=$('mini-photo-button');btn.disabled=true;
 try{if(!file.type.startsWith('image/') || file.size>5*1024*1024)throw Error('Elegí una imagen de hasta 5 MB.');
 file=await NextLevelPhotoCrop.edit(file);if(!file)return;
 const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('No se pudo leer la imagen.'));reader.readAsDataURL(file);});
 const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('No se pudo abrir la imagen.'));image.src=data;});
 const canvas=document.createElement('canvas'),scale=Math.min(1,640/Math.max(img.width,img.height));canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const src=canvas.toDataURL('image/jpeg',.82);if(src.length>750000)throw Error('Elegí una imagen más pequeña.');
 state.photo=src;state.photoDirty=true;applyPhoto();if(!saveLocal())return;$('mini-photo-status').textContent='DEMO · Foto guardada únicamente en este navegador.';
 }catch(e){$('mini-photo-status').textContent='La foto queda pendiente: '+e.message;}finally{btn.disabled=false;event.target.value='';}
});
$('mini-export-profile').addEventListener('click',()=>{const paper=$('mini-print-profile');paper.replaceChildren();node('h1',window.NextLevelPlayer ? NextLevelPlayer.name+' · '+NextLevelPlayer.category : 'Tomás Sánchez · Mini U11',paper);node('p',window.NextLevelPlayer ? NextLevelPlayer.club+' · '+NextLevelPlayer.season : 'Club Horizonte · DEMO · Torneo de ejemplo · 2026',paper);if(photoSource(state.photo)){const image=node('img',null,paper);image.src=state.photo;image.alt='Foto de Tomás';}
 for(const [title,text] of [['Participación oficial',$('mini-source-date').textContent],['Qué me gusta explorar',state.profile.position],['Experiencias que quiero probar',(state.profile.playExperiences || []).join(' · ')],['Qué disfruto',state.profile.enjoy],['Qué quiero aprender',state.profile.learn],['Mi sueño',state.profile.dream],['Objetivo de temporada',state.profile.seasonGoal],['Áreas a mejorar',(state.profile.technicalAreas || []).join(' · ')],['Áreas mentales',(state.profile.mentalAreas || []).join(' · ')],['Para conversar con el coach',state.profile.coachNote]]){if(text){node('h2',title,paper);node('p',text,paper);}}node('p',$('mini-coach-data').textContent,paper);window.print();});
$('mini-save-challenge').addEventListener('click',()=>{state.profileDirty=true;state.challenge=$('mini-challenge').value;if(saveLocal())status('Desafío guardado. Conversalo con tu coach.');render();profileAutosave.schedule();});
$('mini-progress-form').addEventListener('submit',event=>{event.preventDefault();const entry={id:crypto.randomUUID(),date:$('mini-date').value,areas:[state.challenge],success:$('mini-success').value.trim(),next:$('mini-next').value.trim(),createdAt:new Date().toISOString(),source:'player_training',synced:false};if(!validPractice(entry,today)){status('Revisá la fecha y contá algo que hayas probado o descubierto.');return;}state.entries=mergeEntries([entry],state.entries);if(saveLocal()){NextLevelMiniDemo.recordPractice(entry);document.dispatchEvent(new CustomEvent('nextlevel-practice-saved',{detail:entry}));status('DEMO · Experiencia guardada en este navegador.');$('mini-success').value=$('mini-next').value='';}render();});
const renderPhysical=()=>{const list=$('mini-physical-history');list.replaceChildren();state.physical.slice(0,10).forEach(e=>{const card=node('section',null,list);card.className='entry';node('strong',e.date,card);node('p',Object.entries({height:'Altura',weight:'Peso',wingspan:'Envergadura'}).filter(([k])=>e[k]!=null).map(([k,label])=>`${label}: ${e[k]} ${k==='weight'?'kg':'cm'}`).join(' · '),card);node('small',e.synced?'Guardado en este navegador':'Guardado en este dispositivo',card);});};
$('mini-physical-form').addEventListener('submit',event=>{event.preventDefault();const entry={id:crypto.randomUUID(),date:$('mini-physical-date').value,source:'family_measurement',synced:false};for(const [key,id] of [['height','mini-height'],['weight','mini-weight'],['wingspan','mini-wingspan']]){const value=$(id).value;if(value!=='')entry[key]=Number(value);}
if(!validPractice({date:entry.date,success:'medida',next:''},today) || !['height','weight','wingspan'].some(k=>entry[k]!=null) || ['height','weight','wingspan'].some(k=>entry[k]!=null && (!Number.isFinite(entry[k]) || entry[k]<=0))){status('Revisá la fecha e ingresá al menos una medida positiva.');return;}
state.physical=mergeEntries([entry],state.physical);if(saveLocal())status('Medidas guardadas en este dispositivo.');renderPhysical();});renderPhysical();
let client=null;
$('mini-logout').addEventListener('click',()=>{window.location.href='demos.html';});
$('mini-connect').addEventListener('click',()=>NextLevelMiniDemo.reset());
render();
async function renderOfficial(source){
try{source=source || window.NextLevelMiniDemoData;
$('mini-stat-summary').replaceChildren();$('mini-game-list').replaceChildren();const acts=source.boxscores || source.sample_boxscores || [];const records=acts.filter(s=>(s.player_rows || s.milo)?.length===1).map(s=>{const g=source.games.find(g=>String(g.IdPartidoNotificacion)===s.id);return {...(s.player_rows || s.milo)[0],date:g?.Fecha,id:s.id,minutos:(s.player_rows || s.milo)[0].milisegundos_jugados==null?null:Number((s.player_rows || s.milo)[0].milisegundos_jugados)/60000};}).filter(r=>r.date).sort((a,b)=>a.date.split('/').reverse().join('-').localeCompare(b.date.split('/').reverse().join('-')));
$('mini-source-date').textContent=`Dato de ejemplo · ${source.games.length} partidos terminados del equipo · ${records.length} actas individuales consultadas · actualizado ${source.checked_at?new Date(source.checked_at).toLocaleString('es-AR',{timeZone:'America/Buenos_Aires',hourCycle:'h23'}):'sin fecha de sincronización'}`;
const metrics=[['puntos','Puntos por partido'],['minutos','Minutos por partido'],['faltascometidas','Faltas cometidas por partido'],['faltasrecibidas','Faltas recibidas por partido'],['valoracion','Valoración de ejemplo por partido']];
const average=key=>averageMini(records,key);$('mini-profile-games').textContent=String(records.length);
const rotationNode=$('mini-minute-rotation'),recentMinutes=averageMini(records.slice(-5),'minutos');if(rotationNode)rotationNode.textContent=recentMinutes==null?'Todavía no hay minutos completos para describir tu participación.':recentMinutes.toFixed(1)+' minutos por partido en los últimos '+Math.min(5,records.length)+'. Conversá con tu coach sobre tus oportunidades de participar y probar distintas tareas. Los minutos no son una meta ni una nota.';

for(const [key,label] of metrics){const card=node('section',null,$('mini-stat-summary'));card.className='tip';node('h3',label,card);const value=average(key);node('p',value==null?'Sin datos':value.toFixed(1),card).className='metric-value';node('small',`${records.length} actas disponibles · muestra consultada`,card);}
node('p','La valoración es el cálculo recibido de de ejemplo con los conteos registrados en Mini; no es una evaluación completa de tus habilidades.',$('mini-stat-summary')).className='muted';
const games=[...source.games].sort((a,b)=>a.Fecha.split('/').reverse().join('-').localeCompare(b.Fecha.split('/').reverse().join('-'))).reverse();
for(const g of games){const home=g.NombreEquipoLocal===source.club,rival=home?g.NombreEquipoVisitante:g.NombreEquipoLocal;const detail=node('details',null,$('mini-game-list'));node('summary',g.Fecha+' · '+rival,detail);const result=g.Resultados || {};node('p',`Resultado del equipo: ${home?result.ResultadoLocal:result.ResultadoVisitante}–${home?result.ResultadoVisitante:result.ResultadoLocal}`,detail);const row=records.find(r=>r.id===String(g.IdPartidoNotificacion));if(row){node('p',`Dato de ejemplo: ${row.puntos ?? '—'} puntos · ${row.tiempo_jugado ?? '—'} minutos · ${row.valoracion ?? '—'} valoración`,detail);node('p',`Faltas: ${row.faltascometidas ?? '—'} cometidas · ${row.faltasrecibidas ?? '—'} recibidas`,detail);node('p',`Tiros: dobles ${row.canasta2p ?? '—'}/${row.tiro2p ?? '—'} · libres ${row.canasta1p ?? '—'}/${row.tiro1p ?? '—'}`,detail);}else node('p','Sin acta individual consultada para este partido.',detail);}
NextLevelMiniEvolution.render(records,source.games,source);
if(window.NextLevelCoachAnalysis)await NextLevelCoachAnalysis.render(NextLevelMiniGoals.normalize(source,window.NextLevelPlayer?.season || '2026'),[],{host:$('mini-coach-personalized'),mini:true,profile:state.profile,goPlan:()=>show('plan')});
$('mini-coach-data').textContent=`Hay ${records.length} actas individuales para conversar: ${average('puntos')?.toFixed(1) ?? '—'} puntos y ${average('minutos')?.toFixed(1) ?? '—'} minutos por partido en esta muestra. Podemos revisar cómo participaste, en qué situaciones aparecen las faltas y qué acción te gustaría practicar. La elección del desafío se acuerda con tu coach.`;
$('mini-data-limit').textContent='Rebotes, asistencias y recuperos no se usan para construir tu perfil porque todavía no confirmamos su cobertura de registro en Mini. La valoración se muestra como dato de ejemplo, con esa limitación.';
}catch(e){$('mini-source-date').textContent='No se pudieron cargar los partidos oficiales. Reintentá más tarde.';}
}
await renderOfficial(window.NextLevelMiniDemoData);
await NextLevelMiniPhysical.connect(NextLevelMiniDemo.client,NextLevelPlayer.playerId,'demo-local-tomas');
await NextLevelMiniGoals.connect({client:NextLevelMiniDemo.client,playerId:NextLevelPlayer.playerId,season:'2026',official:NextLevelMiniDemoData,verifyAccount:async()=>{},getProfile:()=>state.profile});
status('DEMO · Tomás Pérez · Club Horizonte. Tus cambios se guardan únicamente en este navegador.');
}
if(typeof module!=='undefined')module.exports={playerMatches,mergeEntries,validPractice,averageMini,validProfile,photoSource,createAutosave};
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',load);
})();
