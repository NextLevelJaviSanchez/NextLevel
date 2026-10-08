/* Las aventuras reutilizan preferencias y experiencias reales del perfil Mini. */
(function(root){
'use strict';
const missions=[
 {id:'radar',icon:'🛰️',title:'Radar de compañeros',area:'Mirar antes de pasar',task:'Antes de un pase, mirá quién está disponible. Después contá qué descubriste.'},
 {id:'hands',icon:'🐙',title:'Dos manos, mil caminos',area:'Usar ambas manos',task:'Probá llevar la pelota con tu otra mano en una tarea que elijas con el coach.'},
 {id:'team',icon:'🤝',title:'La voz del equipo',area:'Comunicarme con mis compañeros',task:'Buscá un momento para pedir un pase o alentar a un compañero. ¿Qué pasó?'},
 {id:'reset',icon:'🌈',title:'Otra oportunidad',area:'Seguir después de un error',task:'Si algo no sale, soltá el aire y probá la próxima acción. Contá cómo te sentiste.'},
 {id:'move',icon:'🧭',title:'Explorador de espacios',area:'Moverme sin pelota',task:'Después de pasar, probá moverte a un espacio libre con una consigna de tu coach.'}
];
function render({state,node,show,onChoose}){
 const host=document.getElementById('mini-adventure-options');if(!host)return;host.replaceChildren();
 const current=missions.find(m=>m.id===state.profile.adventureId);
 const select=document.getElementById('mini-challenge');
 if(current && ![...select.options].some(o=>o.value===current.area)){const option=node('option',current.area,select);option.value=current.area;}
 for(const m of missions){const card=node('section',null,host);card.className='tip';node('h3',m.icon+' '+m.title,card);node('p',m.task,card);const button=node('button',current?.id===m.id?'✓ Mi aventura elegida':'Elegir esta aventura',card);button.type='button';button.setAttribute('aria-pressed',String(current?.id===m.id));button.addEventListener('click',()=>{const select=document.getElementById('mini-challenge');if(![...select.options].some(o=>o.value===m.area)){const option=node('option',m.area,select);option.value=m.area;}onChoose(m);});}
 document.getElementById('mini-adventure-active').textContent=current?'Tu próxima aventura: '+current.icon+' '+current.title+'. Podés volver a probarla las veces que quieras.':'¿Qué aventura te da curiosidad hoy?';
 const tell=document.getElementById('mini-adventure-tell');tell.disabled=!current;tell.onclick=()=>{show('plan');document.getElementById('mini-success').placeholder='¿Qué probaste? ¿Qué descubriste o cómo te sentiste?';document.getElementById('mini-progress-form').scrollIntoView({behavior:root.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});document.getElementById('mini-success').focus({preventScroll:true});};
 const memories=document.getElementById('mini-adventure-memories');memories.replaceChildren();
 const entries=state.entries.filter(e=>missions.some(m=>(e.areas || []).includes(m.area))).slice(0,4);
 if(!entries.length)node('p','Tu pasaporte empieza con una experiencia tuya. Cuando pruebes una misión, podés contarla acá con tu familia.',memories);
 for(const e of entries){const m=missions.find(m=>(e.areas || []).includes(m.area)),card=node('section',null,memories);card.className='entry';node('strong',m.icon+' '+m.title+' · '+e.date,card);node('p',e.success,card);if(e.next)node('p','La próxima vez: '+e.next,card);node('small',e.synced?'Recuerdo guardado en tu cuenta':'Recuerdo en este dispositivo · pendiente de sincronizar',card);}
}
const api={missions,render};if(typeof module!=='undefined')module.exports=api;root.NextLevelMiniAdventures=api;
})(typeof window!=='undefined'?window:globalThis);
