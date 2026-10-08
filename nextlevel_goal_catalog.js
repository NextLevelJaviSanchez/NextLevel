/* Catálogo por preferencias. La práctica registrada no certifica dominio técnico. */
(function(root){
'use strict';
const normalize=s=>String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const entries=[
 ['defense','Defensa',['Defensa'],['Defensa','Volver a defender'],'Volver y ubicar tu marca: acordá una consigna con el coach y registrá cuándo la practicaste.',['stl']],
 ['handling','Manejo de pelota',['Manejo pelota','Manejo de pelota'],['Manejo','Manejo de pelota'],'Controlar la pelota con equilibrio en una tarea acordada con el coach.',['losses']],
 ['hands','Usar ambas manos',['Usar ambas manos'],['Usar ambas manos'],'Practicar con ambas manos a una dificultad cómoda.',[]],
 ['passing','Pases',['Pases'],['Pases','Mirar antes de pasar'],'Mirar antes de pasar y buscar a un compañero disponible.',['ast','losses']],
 ['rebounding','Rebotes',['Rebotes','Rebote'],['Rebote','Rebotes'],'Ubicar al rival y cerrar el rebote antes de buscar la pelota.',['reb']],
 ['finishing','Lanzamientos cerca del aro',['Lanzamientos cerca del aro'],['Lanzamientos cerca del aro'],'Practicar una finalización equilibrada cerca del aro.',['t2']],
 ['free','Tiro libre',['Tiro libre'],['Tiro libre'],'Repetir tu rutina de tiro libre y registrar lo trabajado.',['tl']],
 ['outside','Tiro exterior',['Tiro exterior'],['Tiro exterior'],'Preparar el tiro y elegir una situación adecuada junto al coach.',['t3']],
 ['moving','Moverme sin pelota',['Moverme sin pelota'],['Moverme sin pelota'],'Ofrecer una línea de pase después de moverte.',[]],
 ['coordination','Coordinación',['Coordinación'],['Coordinación'],'Practicar una tarea de coordinación acordada con el coach.',[]],
 ['physical','Físico',['Físico'],['Físico'],'Registrar el trabajo físico acordado con tu coach, adaptado a vos.',[]],
 ['confidence','Animarme a participar',['Animarme a participar'],['Animarme a participar'],'Elegir una acción para probar y contar cómo te fue.',[]],
 ['reset','Seguir después de un error',['Seguir después de un error'],['Seguir después de un error'],'Volver a la próxima jugada después de un error y registrar una experiencia.',[]],
 ['focus','Concentrarme en la próxima jugada',['Concentrarme en la próxima jugada'],['Concentrarme en la próxima jugada'],'Elegir una consigna corta antes de jugar.',[]],
 ['communication','Comunicarme con mis compañeros',['Comunicarme con mis compañeros'],['Comunicarme con mis compañeros'],'Avisar una marca, pedir un pase o alentar a un compañero.',[]],
 ['enjoy','Disfrutar y manejar los nervios',['Disfrutar y manejar los nervios'],['Disfrutar y manejar los nervios'],'Registrar una experiencia y qué te ayudó a disfrutar.',[]],
 ['mental','Mental',['Mental'],['Trabajo mental'],'Trabajar una consigna mental elegida con el coach y registrar tu experiencia.',[]]
].map(([id,area,aliases,tags,task,metrics])=>({id:'practice_'+id,area,aliases,tags,task,metrics}));
const rules=Object.fromEntries(entries.map(e=>[e.id,{label:'Practicar: '+e.area,practice:true,tags:e.tags,step:1,cap:5,unit:' días de práctica',task:e.task}]));
function selected(profile={}){const technical=Array.isArray(profile.technicalAreas)?profile.technicalAreas:Array.isArray(profile.areas)?profile.areas:String(profile.area || '').split('|');const areas=new Set([...technical,...(Array.isArray(profile.mentalAreas)?profile.mentalAreas:[])].map(normalize));return entries.filter(e=>e.aliases.some(a=>areas.has(normalize(a))) && !(e.id==='practice_mental' && (profile.mentalAreas || []).length));}
function participationReference(category,coachReference){const name=normalize(category).toUpperCase();if(/\b(U11|U13|MINI|INFANTILES)\b/.test(name))return 20;if(!name)return null;const value=Number(coachReference);return coachReference!==null && coachReference!==undefined && coachReference!=='' && Number.isFinite(value) && value>0 && value<=60?value:null;}
function recommendations(profile,{mini=false,minutes=null,category='',coachReference=null}={}){const chosen=selected(!mini && Array.isArray(profile.areas)?{...profile,technicalAreas:undefined}:profile),allowed=new Set(mini?['tl','t2','minutes']:['tl','t2','t3','reb','ast','losses','stl','minutes']),result=[],reference=participationReference(category,coachReference);if(minutes!=null && reference!=null && minutes<reference)result.push('minutes');for(const e of chosen){for(const m of e.metrics)if(allowed.has(m))result.push(m);result.push(e.id);}return [...new Set(result)];}
function practiceAreas(profile){return selected(profile).map(e=>e.area);}
const api={entries,rules,selected,recommendations,practiceAreas,normalize,participationReference};if(typeof module!=='undefined')module.exports=api;root.NextLevelGoalCatalog=api;
})(typeof window!=='undefined'?window:globalThis);
