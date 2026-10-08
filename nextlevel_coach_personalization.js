/* Misma fuente de criterios que Mi Plan; observación y práctica no son diagnóstico. */
(function(root){
'use strict';
const catalog=root.NextLevelGoalCatalog || (typeof require==='function'?require('./nextlevel_goal_catalog.js'):null);
const engine=root.NextLevelGradualGoals || (typeof require==='function'?require('./nextlevel_gradual_goals.js'):null);
const numeric=v=>v!=null && v!=='' && typeof v!=='boolean' && Number.isFinite(Number(v)) && Number(v)>=0;
const total=(rows,key)=>rows.length && rows.every(r=>numeric(r[key]))?rows.reduce((sum,r)=>sum+Number(r[key]),0):null;
const avg=(rows,key)=>total(rows,key)==null?null:total(rows,key)/rows.length;
const fmt=n=>n==null?'Sin datos':Number(n).toFixed(1);
function analyze(input,options={}){
 const {profile={},category='',mini=false,coachReference=null,goals=[]}=options;
 const torneo=options.torneo || input.find(g=>g.torneo)?.torneo || 'Práctica personal';
 const rows=engine.gamesFor(input,torneo),recent=rows.slice(-5),previous=rows.slice(-10,-5);
 const minutes=engine.blockBaseline(rows,'minutes'),cap=catalog.participationReference(category,coachReference);
 const scoped=goals.filter(g=>engine.rules[g.metric] && (g.torneo===torneo || (g.torneo==='Práctica personal' && engine.rules[g.metric].practice)));
 const active=g=>g.status==='active' && !g.needsCategoryReview && (g.metric!=='minutes' || (g.participationCategory===category && Number.isFinite(g.participationCap)) || cap===20 && !g.participationCategory);
 const recommended=catalog.recommendations(profile,{mini,category,coachReference,minutes:minutes.ready?minutes.value:null});
 const keys=[...new Set([...scoped.filter(g=>active(g) && (!mini || g.metric!=='minutes')).map(g=>g.metric),...recommended])];
 const proposals=keys.map(metric=>{
  const r=engine.rules[metric],goal=scoped.find(g=>g.metric===metric && active(g)),achieved=scoped.find(g=>g.metric===metric && g.status==='achieved' && !g.needsCategoryReview);
  const base=r.practice?achieved?.evaluation || {ready:true,value:0}:goal?.mode==='game_block_v2'?goal.baseline:engine.blockBaseline(rows,metric),policy=achieved || {participationCap:cap};
  const next=goal?.target ?? (r.practice?engine.target(metric,achieved?achieved.target:base.value,policy):achieved?.mode==='game_block_v2'?engine.nextBlockTarget(achieved,rows):base.ready?engine.blockTarget(metric,base.value,policy):null);
  const evidence=r.practice?(goal?`${goal.evaluation?.value ?? 0}/${goal.target} días nuevos de práctica registrados por vos.`:achieved?`Ya cumpliste la etapa de ${achieved.target} días de práctica.`:'Etapas de 3, 4 y 5 días nuevos de práctica registrada.'):base.ready?`Base: ${fmt(base.value)}${base.unit} · ${base.total} acumulados en ${base.games} partidos · ${base.periodStart} a ${base.periodEnd}. Referencia en 2 partidos: ${fmt(base.expectedInBlock)}.`:'Propuesta provisional: '+base.reason;
  const description=r.practice?fmt(next)+r.unit:engine.blockDescription(metric,next);
  const goalText=goal?`Meta activa, paso ${goal.stage}: ${goal.mode==='game_block_v2' || r.practice?description:'Objetivo anterior, para reformular en Mi Plan.'}`:next!=null?`Próximo paso sugerido: ${description}`:achieved?'Ya cumpliste la última etapa disponible; elegí otra meta con tu coach.':'Pendiente de datos o de una referencia acordada.';
  return {metric,title:r.label,area:r.label,evidence,question:metric==='minutes'?'¿Qué consigna defensiva podemos trabajar y qué oportunidades de participación tenés?':'¿Esta práctica sigue siendo tu prioridad? Revisala con tu coach.',practice:r.task+' '+goalText,active:!!goal,ready:base.ready,target:next,reason:goal?'Objetivo que elegiste y activaste.':metric==='minutes'?'Tu participación está por debajo de la referencia de tu categoría y rol.':'Relacionado con las áreas que seleccionaste en Perfil.',source:r.practice?'player_training':'cabb_api'};
 });
 const priorities=[...proposals].sort((a,b)=>Number(b.active)-Number(a.active) || (mini?Number(!!engine.rules[b.metric]?.practice)-Number(!!engine.rules[a.metric]?.practice):Number(b.metric==='minutes')-Number(a.metric==='minutes')) || Number(b.metric==='practice_defense')-Number(a.metric==='practice_defense')).slice(0,2);
 const cards=(mini?[['🏀','Puntos registrados','pts'],['⏱️','Participación','minutos']]:[['🏀','Producción ofensiva','pts'],['⏱️','Participación','minutos'],['👐','Rebote','reb_tot'],['🤝','Asistencias','ast'],['🔄','Recuperos','stl'],['💬','Pérdidas','to_perdidas']]).map(([icon,label,key])=>[icon,label,fmt(avg(rows,key))+(key==='minutos'?' minutos por partido':' por partido')]);
 const shooting=(mini?['tl','t2']:['tl','t2','t3']).map(key=>{const made=total(rows,key+'_in'),attempts=total(rows,key+'_att');return {key,made,attempts,pct:made!=null && attempts>0 && made<=attempts?100*made/attempts:null};});
 const distribution=mini?'Los tiros registrados se usan con sus muestras mínimas.':total(rows,'t2_att')!=null && total(rows,'t3_att')!=null?`${total(rows,'t2_att')} intentos de dobles y ${total(rows,'t3_att')} triples. La distribución no define tu posición.`:'Sin datos completos para describir la distribución de tiro.';
 const trend=rows.length>=10?(mini?[['minutos','minutos'],['pts','puntos']]:[['minutos','minutos'],['stl','recuperos'],['reb_tot','rebotes'],['ast','asistencias'],['to_perdidas','pérdidas']]).map(([key,label])=>{const rate=block=>{const minutes=total(block,'minutos'),count=total(block,key);return key==='minutos' || key==='pts'?avg(block,key):minutes>0 && count!=null?20*count/minutes:null;};return {label,before:rate(previous),recent:rate(recent),unit:key==='minutos' || key==='pts'?'por partido':'por 20 minutos'};}):[];
 const achievements=scoped.flatMap(g=>(g.achievements || []).map(a=>({...a,metric:g.metric,title:engine.rules[g.metric].label,source:engine.rules[g.metric].practice?'player_training':'cabb_api'}))).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
 const selected=catalog.selected(mini?profile:{...profile,technicalAreas:undefined}).map(e=>e.area);
 const participation=mini?(minutes.ready?fmt(minutes.value)+' minutos por partido en la muestra. Conversá sobre tus oportunidades de juego y las distintas tareas que querés explorar. Los minutos no califican tu aprendizaje.':'Todavía faltan datos para describir tu participación.') : !minutes.ready?'Participación pendiente de una base completa de cinco partidos.':cap==null?`${fmt(minutes.value)} minutos de promedio. Para ${category || 'tu categoría'}, el coach debe acordar una referencia; no se aplica un techo automático de 20 minutos.`:minutes.value<cap?`${fmt(minutes.value)} minutos de promedio frente a una referencia de ${cap} para ${category}. Proponemos aumentar gradualmente y trabajar una consigna defensiva. Los minutos también dependen de la rotación.`:`${fmt(minutes.value)} minutos de promedio: alcanzás la referencia de ${cap}. Priorizá un aporte acorde a las áreas elegidas y tu rol.`;
 return {cards,distribution,shooting,proposals,priorities,trend,achievements,selected,participation,category,reference:cap,coverage:rows.length};
}
const api={analyze,total,avg};if(typeof module!=='undefined')module.exports=api;root.NextLevelCoachPersonalization=api;
})(typeof window!=='undefined'?window:globalThis);
