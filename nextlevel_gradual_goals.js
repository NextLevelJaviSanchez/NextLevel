/* Objetivos oficiales por jugador, temporada y torneo. Historial por objetivo. */
(function(root){
'use strict';
const rules={
 minutes:{label:'Ganar participación',key:'minutos',minutes:true,unit:' min por partido',task:'Acordá una consigna defensiva con el coach. El tiempo de juego también depende de la rotación.'},
 stl:{label:'Recuperos',key:'stl',step:.1,unit:' por 20 min',task:'Trabajá ubicación y lectura defensiva con el coach, manteniendo tu marca.'},
 tl:{label:'Tiros libres',prefix:'tl',min:20,step:3,cap:100,unit:'%',task:'Practicá una rutina de tiro libre y registrá tus intentos con el coach.'},
 t2:{label:'Tiro de 2',prefix:'t2',min:30,step:2,cap:100,unit:'%',task:'Revisá selección de tiro y equilibrio con tu coach.'},
 t3:{label:'Tiro de 3',prefix:'t3',min:25,step:2,cap:100,unit:'%',task:'Acordá con el coach si el triple corresponde a tu rol.'},
 reb:{label:'Rebotes',key:'reb_tot',step:.05,unit:' por 20 min',task:'Acordá una consigna de ubicación y cierre de rebote con tu coach.'},
 ast:{label:'Asistencias',key:'ast',step:.05,unit:' por 20 min',task:'Trabajá lectura de pases con el coach, cuidando las pérdidas.',guard:'to_perdidas'},
 losses:{label:'Pérdidas',key:'to_perdidas',step:.05,down:true,unit:' por 20 min',task:'Revisá decisiones y control de pelota con tu coach.'}
};
const catalog=root.NextLevelGoalCatalog || (typeof require==='function'?require('./nextlevel_goal_catalog.js'):null);
if(catalog)Object.assign(rules,catalog.rules);
const known=v=>v!==null && v!==undefined && v!=='' && typeof v!=='boolean' && Number.isFinite(Number(v)) && Number(v)>=0;
const id=g=>String(g.cabb_partido_id || g.id || '');
const order=g=>String(g.fecha).slice(0,10)+'|'+id(g).padStart(20,'0');
function gamesFor(games,torneo){
 const unique=new Map();
 for(const g of games){if(g.source!=='cabb_api' || g.torneo!==torneo || !id(g) || !/^\d{4}-\d{2}-\d{2}/.test(g.fecha || '') || g.jugo===false || g.played===false || (known(g.minutos) && Number(g.minutos)===0))continue;unique.set(id(g),g);}
 return [...unique.values()].sort((a,b)=>order(a).localeCompare(order(b)));
}
function measure(rows,metric){
 const r=rules[metric];if(!r || rows.length<5)return {ready:false,reason:'Se necesitan 5 partidos con participación.'};
 if(r.minutes){if(rows.some(g=>!known(g.minutos)))return {ready:false,reason:'Faltan minutos completos.'};return {ready:true,value:rows.reduce((s,g)=>s+ +g.minutos,0)/rows.length,games:rows.length};}
 if(r.prefix){const mk=r.prefix+'_in',ak=r.prefix+'_att';if(rows.some(g=>!known(g[mk]) || !known(g[ak]) || +g[mk]>+g[ak]))return {ready:false,reason:'Faltan datos completos de tiro.'};
 const attempts=rows.reduce((s,g)=>s+ +g[ak],0),made=rows.reduce((s,g)=>s+ +g[mk],0);
 if(attempts<r.min)return {ready:false,reason:`Se necesitan ${r.min} intentos; hay ${attempts}.`,attempts};
 return {ready:true,value:100*made/attempts,attempts,made,games:rows.length};}
 if(rows.some(g=>!known(g[r.key]) || !known(g.minutos) || +g.minutos<=0 || (r.guard && !known(g[r.guard]))))return {ready:false,reason:'Faltan estadísticas o minutos completos.'};
 const minutes=rows.reduce((s,g)=>s+ +g.minutos,0),value=20*rows.reduce((s,g)=>s+ +g[r.key],0)/minutes;
 if(metric==='stl' && minutes<50)return {ready:false,reason:'Se necesitan al menos 50 minutos acumulados para evaluar recuperos.'};
 return {ready:true,value,games:rows.length,minutes,guard:r.guard ? 20*rows.reduce((s,g)=>s+ +g[r.guard],0)/minutes : null};
}
function target(metric,base,policy={}){const r=rules[metric];if(!r)return null;if(r.minutes && !Number.isFinite(policy.participationCap))return null;if(r.practice)return base>=5?null:base===0?3:base+1;const step=r.minutes?(base<5 || base>=15?1:2):r.prefix?r.step:Math.max(.1,base*r.step);const value=r.down?Math.max(0,base-step):Math.min(r.minutes?policy.participationCap:(r.cap ?? Infinity),base+step);return Math.abs(value-base)<1e-8?null:Math.round(value*10000)/10000;}
function create(metric,torneo,games,now,policy={}){const rows=gamesFor(games,torneo).slice(-5),base=rules[metric]?.practice?{ready:true,value:0}:measure(rows,metric);if(!base.ready)throw Error(base.reason);const goalTarget=target(metric,base.value,policy);if(goalTarget==null)throw Error('Ya estás en el límite de esta métrica. Elegí otra área.');return {version:1,metric,torneo,...(metric==='minutes'?policy:{}),status:'active',stage:1,baseline:base,target:goalTarget,boundary:rows.length?order(rows.at(-1)):'',baselineIds:rows.map(id),startedAt:now,achievements:[]};}
function practiceMeasure(goal,entries,now){const r=rules[goal.metric],day=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)),today=day(now),validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value,matches=entries.filter(e=>e.source==='player_training' && e.id && Number.isFinite(Date.parse(e.createdAt)) && e.createdAt>goal.startedAt && validDate(e.date) && e.date>=day(goal.startedAt) && e.date<=today && Array.isArray(e.areas) && e.areas.some(a=>r.tags.some(t=>catalog.normalize(t)===catalog.normalize(a))));const days=[...new Set(matches.map(e=>e.date))];return {ready:true,value:days.length,practiceIds:[...new Set(matches.map(e=>e.id))],days};}
function evaluate(goal,games,now,practices=[]){
 if(goal.status!=='active')return goal;
 if(rules[goal.metric]?.practice){const result=practiceMeasure(goal,practices,now),next={...goal,evaluation:result};if(result.value<goal.target)return next;const award={id:goal.metric+':'+goal.stage,stage:goal.stage,baseline:goal.baseline.value,target:goal.target,value:result.value,date:result.days.sort().at(-1),verifiedAt:now,gameIds:[],practiceIds:result.practiceIds,source:'player_training'};return {...next,status:'achieved',achievements:[...(goal.achievements || []),award]};}
 const rows=gamesFor(games,goal.torneo).filter(g=>order(g)>goal.boundary),recent=rows.slice(-5);let result=measure(recent,goal.metric);
 // Extender el bloque sólo para reunir intentos; nunca saltar datos faltantes.
 if(!result.ready && result.attempts!=null)result=measure(rows,goal.metric);
 const next={...goal,evaluation:result,evaluatedIds:(result.games===rows.length?rows:recent).map(id)};
 if(!result.ready)return next;
 const r=rules[goal.metric],reached=r.down?result.value<=goal.target+1e-8:result.value+1e-8>=goal.target;
 if(!reached || (r.guard && result.guard>goal.baseline.guard+1e-8))return next;
 const award={id:goal.metric+':'+goal.stage,stage:goal.stage,baseline:goal.baseline.value,target:goal.target,value:result.value,date:String(rows.at(-1).fecha).slice(0,10),verifiedAt:now,gameIds:next.evaluatedIds};
 return {...next,status:'achieved',achievements:[...(goal.achievements || []),award]};
}
function advance(goal,games,now){if(goal.status!=='achieved')throw Error('El paso anterior todavía no se cumplió.');const rows=gamesFor(games,goal.torneo).filter(g=>order(g)>goal.boundary);const base=rules[goal.metric]?.practice?{ready:true,value:goal.target}:goal.evaluation,newTarget=target(goal.metric,base.value,goal);if(newTarget==null)throw Error('Ya alcanzaste el límite. Elegí otra área.');return {...goal,status:'active',stage:goal.stage+1,baseline:base,target:newTarget,boundary:rows.length?order(rows.at(-1)):goal.boundary,startedAt:now,evaluation:null,evaluatedIds:[]};}
const api={rules,gamesFor,measure,target,create,evaluate,advance};
if(typeof module!=='undefined')module.exports=api;root.NextLevelGradualGoals=api;
if(typeof document==='undefined')return;
async function mount(options={}){
 const anchor=options.anchor || document.getElementById('obj-list');if(!anchor || anchor._gradualGoalsMounted)return;
 const player=options.playerId || (typeof PLAYER_ID!=='undefined'?PLAYER_ID:root.NextLevelPlayer?.playerId),season=String(options.season || (typeof SEASON!=='undefined'?SEASON:root.NextLevelPlayer?.season));
 const client=options.client || (typeof _supa!=='undefined'?_supa:null);if(!player || !client || !/^20\d{2}$/.test(season))return;
 anchor._gradualGoalsMounted=true;
 const supported=options.metrics || Object.keys(rules);let allowed=[...supported],profile={},coachReference=null;const category=options.category || root.NextLevelPlayer?.category || (options.mini?'U11':!root.NextLevelPlayer?'U13':'');const policy=()=>({participationCap:catalog?.participationReference(category,coachReference),participationCategory:category});
 const node=(tag,text,parent)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(parent)parent.append(n);return n;};
 const host=node('section',null);anchor.before(host);host.className='card';node('h3','🎯 Mis objetivos graduales',host);
 const status=node('p','Cargando tus objetivos…',host);status.setAttribute('role','status');
 const controls=node('div',null,host),select=node('select',null,controls);select.setAttribute('aria-label','Torneo de los objetivos');select.style.cssText='padding:10px;background:var(--card2);color:var(--text);max-width:100%';
 const cards=node('div',null,host),awards=node('div',null,host);let games=[],practices=[],records=new Map(),busy=false,pendingPracticeEvaluation=false;
 const dashAnchor=options.dashboard || document.getElementById('dash-obj-activo'),dash=dashAnchor?node('section',null):null;if(dash)dashAnchor.after(dash);
 const prefix='gradual_goals_v1:'+season+':',now=()=>new Date().toISOString(),key=(metric,torneo)=>prefix+encodeURIComponent(torneo)+':'+metric;
 const fmt=(v,m)=>Number(v).toFixed(1)+rules[m].unit;
 async function save(module,goal){
  if(options.verifyAccount)await options.verifyAccount();
  const old=records.get(module),stamp=now();let query;
  if(old)query=client.from('player_data').update({data:goal,updated_at:stamp}).eq('player_id',player).eq('module',module).eq('updated_at',old.updated_at).select('module,data,updated_at');
  else query=client.from('player_data').insert({player_id:player,module,data:goal,updated_at:stamp}).select('module,data,updated_at');
  const {data,error}=await query;if(error || data?.length!==1)throw Error('No se pudo guardar o el objetivo cambió en otra sesión. Recargá para reintentar.');records.set(module,data[0]);
 }
 async function evaluateAll(){for(const [module,row] of [...records]){let current=row.data;if(current.metric==='minutes' && (!current.participationCap || current.participationCategory!==category)){const p=policy();current=p.participationCap===20?{...current,...p}:{...current,status:'paused',needsCategoryReview:true};}const goal=evaluate(current,games,now(),practices);if(JSON.stringify(goal)!==JSON.stringify(row.data))await save(module,goal);}}
 async function action(task){if(busy)return;busy=true;render();try{await task();status.textContent='✅ Objetivos guardados.';}catch(e){status.textContent=e.message;}finally{busy=false;render();if(pendingPracticeEvaluation){pendingPracticeEvaluation=false;action(evaluateAll);}}}
 const button=(text,parent,task)=>{const b=node('button',text,parent);b.type='button';b.className='obj-btn';b.disabled=busy;b.addEventListener('click',()=>action(task));return b;};
 function render(){
  cards.replaceChildren();awards.replaceChildren();if(dash)dash.replaceChildren();const torneo=select.value;
  node('p','Elegí hasta 2 metas: las propuestas siguen las áreas que seleccionaste en Perfil. Los objetivos ya elegidos se conservan.',cards);
  const minuteBase=measure(gamesFor(games,torneo).slice(-5),'minutes');
  if(minuteBase.ready && policy().participationCap==null)node('p','Para tu categoría, el coach puede acordar una referencia de participación. No se aplica un límite automático de 20 minutos.',cards);
  if(catalog){allowed=[...new Set([...catalog.recommendations(profile,{mini:!!options.mini,minutes:minuteBase.ready?minuteBase.value:null,category,coachReference}).filter(m=>supported.includes(m)),...[...records.values()].map(r=>r.data.metric)])];}
  if(!allowed.length)node('p','Seleccioná en Perfil qué querés mejorar para ver tus propuestas.',cards);
  const active=[...records.values()].filter(r=>r.data.status==='active').length;
  api.activeCount=active;
  if(!options.dashboard && typeof buildDashObjActivo==='function' && dashAnchor)buildDashObjActivo(dashAnchor);
  for(const metric of allowed){const rule=rules[metric];if(!rule)continue;
   const module=key(metric,torneo),goal=records.get(module)?.data,card=node('section',null,cards);card.className='obj-item';node('h4',rule.label,card);
   if(!goal){const base=rule.practice?{ready:true,value:0}:measure(gamesFor(games,torneo).slice(-5),metric),t=base.ready?target(metric,base.value,policy()):null;
    node('p',metric==='minutes'?'Propuesta según tu promedio y una referencia de '+policy().participationCap+' minutos para '+category+'.':rule.practice?'Propuesta según el área que elegiste. Se reconoce la práctica registrada.':'Propuesta estadística relacionada con el área que elegiste.',card);
    node('p',base.ready?`Base: ${fmt(base.value,metric)} · Primer paso: ${t==null?'límite alcanzado':fmt(t,metric)}`:base.reason,card);
    if(base.ready && t!=null && torneo && active<2)button('Activar primer paso',card,async()=>{await save(module,create(metric,torneo,games,now(),policy()));});
   }else{
    node('p',`Paso ${goal.stage} · ${goal.status==='achieved'?'✅ Cumplido':goal.status==='paused'?'⏸ Pausado':'🎯 Activo'}`,card);
    node('p',rule.practice?`Esta etapa: registrar ${goal.target} días nuevos de práctica desde la activación.`:`Base: ${fmt(goal.baseline.value,metric)} → Meta: ${fmt(goal.target,metric)}`,card);
    if(goal.evaluation)node('p',goal.evaluation.ready?`Actual: ${fmt(goal.evaluation.value,metric)}${rule.guard && goal.evaluation.guard>goal.baseline.guard?' · Para cumplirlo también deben mantenerse las pérdidas.':''}`:goal.evaluation.reason,card);
    if(goal.status==='active')button('Pausar',card,()=>save(module,{...goal,status:'paused'}));
    if(goal.needsCategoryReview){node('p','Esta meta de minutos requiere revisión del coach para tu categoría.',card);if(policy().participationCap!=null && active<2 && minuteBase.ready && target('minutes',minuteBase.value,policy())!=null)button('Reformular con la referencia del coach',card,()=>save(module,{...create(metric,torneo,games,now(),policy()),stage:goal.stage+1,achievements:goal.achievements || []}));}
    if(goal.status==='paused' && !goal.needsCategoryReview && active<2)button('Retomar',card,()=>save(module,evaluate({...goal,status:'active'},games,now(),practices)));
    if(goal.status==='achieved' && active<2 && target(metric,rule.practice?goal.target:goal.evaluation.value,goal)!=null)button('Activar próximo paso',card,()=>save(module,advance(goal,games,now())));
   }
   node('p',rule.task,card);
  }
  node('h3','🏆 Mis logros',awards);
  const list=[...records.values()].flatMap(r=>(r.data.achievements || []).map(a=>({...a,metric:r.data.metric,torneo:r.data.torneo}))).sort((a,b)=>b.date.localeCompare(a.date));
  if(!list.length)node('p','Tus metas cumplidas aparecerán acá. Cada paso cuenta.',awards);
  const celebration=(award,parent)=>{const card=node('article',null,parent);card.style.cssText='padding:18px;margin:12px 0;border:1px solid #4ade80;border-radius:14px;background:var(--card2)';node('h4','🏆 ¡Objetivo cumplido!',card);node('p',rules[award.metric].practice?`${rules[award.metric].label}: registraste ${award.value} días de práctica. ¡Cada paso cuenta!`:`${rules[award.metric].label}: pasaste de ${fmt(award.baseline,award.metric)} a ${fmt(award.value,award.metric)}.`,card);node('p','¡Tu trabajo está dando resultados!',card);node('small',`${award.date} · ${award.torneo} · Paso ${award.stage} · ${rules[award.metric].practice?'Experiencias registradas por vos':award.gameIds.length+' partidos'}`,card);const t=target(award.metric,rules[award.metric].practice?award.target:award.value,records.get(key(award.metric,award.torneo))?.data || {});if(t!=null)node('p','Próximo desafío sugerido: '+fmt(t,award.metric),card);};
  for(const award of list)celebration(award,awards);
  if(dash){if(active || list.length)node('h4','🎯 Mis metas individuales',dash);for(const row of records.values()){const g=row.data;if(g.status==='active')node('p',`${rules[g.metric].label}: ${fmt(g.baseline.value,g.metric)} → ${fmt(g.target,g.metric)} · ${g.torneo}`,dash);}if(list.length)celebration(list[0],dash);}
 }
 try{
  if(options.loadGames)games=await options.loadGames();
  else for(let from=0;;from+=1000){const {data,error}=await client.from('game_log').select('*').eq('player_id',player).eq('source','cabb_api').gte('fecha',season+'-01-01').lt('fecha',String(+season+1)+'-01-01').order('fecha').order('cabb_partido_id').range(from,from+999);if(error)throw error;games.push(...(data || []));if(!data || data.length<1000)break;}
  const {data,error}=await client.from('player_data').select('module,data,updated_at').eq('player_id',player).like('module',prefix+'%');if(error)throw error;
  for(const row of data || []){if(row.module.startsWith(prefix) && row.data?.version===1 && supported.includes(row.data.metric))records.set(row.module,row);}
  const extras=[];for(let from=0;;from+=1000){const {data:rows,error:readError}=await client.from('player_data').select('module,data').eq('player_id',player).order('module').range(from,from+999);if(readError)throw readError;extras.push(...(rows || []));if(!rows || rows.length<1000)break;}
  const mature=extras.find(r=>r.module==='perfil_v1')?.data,mini=extras.find(r=>r.module==='mini_profile_v1')?.data;profile=options.getProfile?.() || (options.mini?mini || mature:mature || mini) || {};
  coachReference=extras.find(r=>r.module==='coach_eval_v1')?.data?.participationReferenceMinutes ?? null;
  practices=extras.filter(r=>r.module.startsWith('plan_progress_v1:')).map(r=>r.data).filter(Boolean);
  const tournaments=[...new Set([...games.map(g=>g.torneo),...[...records.values()].map(r=>r.data.torneo)].filter(Boolean))];
  if(!tournaments.length)tournaments.push('Práctica personal');
  for(const t of tournaments)node('option',t,select).value=t;
  for(const [module,row] of [...records]){let current=row.data;if(current.metric==='minutes' && (!current.participationCap || current.participationCategory!==category)){const p=policy();current=p.participationCap===20?{...current,...p}:{...current,status:'paused',needsCategoryReview:true};}const goal=evaluate(current,games,now(),practices);if(JSON.stringify(goal)!==JSON.stringify(row.data))await save(module,goal);}
  status.textContent=tournaments.length?'☁️ Historial guardado. Revisá tus metas con el coach.':'Todavía no hay partidos oficiales para crear objetivos.';render();select.addEventListener('change',render);
  document.addEventListener('nextlevel-profile-preferences',event=>{profile=event.detail || {};render();});
  document.addEventListener('nextlevel-practice-saved',event=>{if(!event.detail?.id)return;practices=[...new Map([...practices,event.detail].map(e=>[e.id,e])).values()];if(busy){pendingPracticeEvaluation=true;return;}action(evaluateAll);});
 }catch(e){status.textContent='No se pudieron cargar o guardar los objetivos. Recargá para reintentar. '+e.message;controls.hidden=true;}
}
api.mount=mount;
document.addEventListener('DOMContentLoaded',()=>mount());
})(typeof window!=='undefined'?window:globalThis);
