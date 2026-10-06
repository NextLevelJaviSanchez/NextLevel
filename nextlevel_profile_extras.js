/* Perfil: recuperar Mental, foto persistente y mapa oficial de un partido. */
(function(){
  'use strict';
  const tips={
    'Me trabo en los TL':'Elegí con el coach una rutina breve antes de cada tiro libre y practicá la misma secuencia.',
    'Los errores me bajan':'Después de un error, elegí una acción concreta para la siguiente posesión. Revisá también los aciertos al terminar.',
    'Nervios en momentos clave':'Prepará con el coach una palabra o rutina breve para volver al juego en momentos de presión.',
    'Me desconcentro en defensa':'Elegí una consigna para cada posesión y revisá con el coach si te ayuda a sostener la atención.',
    'Pienso demasiado antes de tirar':'Practicá decisiones de tiro en situaciones de juego con el coach, atendiendo al espacio y al equilibrio.',
    'Me frustra no anotar':'Definí objetivos de participación además de puntos: comunicación, rebote y volver a defender.'
  };
  function renderMental(data){
    const el=document.getElementById('mental-profile-content');if(!el)return;
    el.replaceChildren();
    const values=String(data?.mental || '').split('|').filter(Boolean);
    if(!values.length){el.textContent='Todavía no hay desafíos mentales seleccionados en el cuestionario inicial.';return;}
    for(const value of values){const card=document.createElement('div');card.className='card';const title=document.createElement('strong');title.textContent=value;card.append(title);const text=document.createElement('p');text.textContent=tips[value] || 'Propuesta pendiente de conversar con el coach.';card.append(text);el.append(card);}
    if(data.q2){const p=document.createElement('p');p.textContent='Tu respuesta: '+data.q2;el.append(p);}
  }
  function shotPosition(shot){const x=Number(shot.posicion_x),y=Number(shot.posicion_y);return {left:(x-35)/730*100,top:(y-34)/405*100};}
  async function load(){
    // Mostrar el último recurso guardado mientras llega la lectura de la nube.
    try {const saved=JSON.parse(localStorage.getItem('nl_pf_mia14') || '{}');if(saved.foto_url || saved.foto)pfApplyFoto(saved.foto_url || saved.foto);}catch(e){}
    try{const {data,error}=await _supa.from('intake_responses').select('mental,q2').eq('player_id','11111111-0000-0000-0000-000000000014').maybeSingle();if(error)throw error;renderMental(data);}catch(e){document.getElementById('mental-profile-content').textContent='No se pudieron cargar tus respuestas. Reintentá más tarde.';}
    const court=document.getElementById('shotCourt');if(!court)return;
    try{const response=await fetch('cabb_pbp_inventory_644845.json');if(!response.ok)throw Error('No disponible');const data=await response.json();const shots=data.mia_shots.filter(s=>String(s.eliminado).toLowerCase()!=='true' && /^(CANASTA-[23]P|TIRO[23]-FALLADO)$/.test(s.accion_tipo));if(shots.length!==6 || shots.filter(s=>s.accion_tipo.startsWith('CANASTA')).length!==2)throw Error('Conteos no reconciliados');
      court.querySelectorAll('[data-official-shot]').forEach(el=>el.remove());
      shots.forEach(s=>{const pos=shotPosition(s);if(!Number.isFinite(pos.left)||!Number.isFinite(pos.top)||pos.left<0||pos.left>100||pos.top<0||pos.top>100)throw Error('Coordenada fuera de referencia');const dot=document.createElement('div');dot.dataset.officialShot=s.autoincremental_id;dot.className='shot-dot';dot.style.left=pos.left+'%';dot.style.top=pos.top+'%';dot.style.background=s.accion_tipo.startsWith('CANASTA')?'#22c55e':'#ef4444';dot.style.zIndex='2';dot.title=`${s.accion_tipo} · cuarto ${s.numero_periodo} · ${s.tiempo_partido} · zona CABB ${s.zona}`;court.append(dot);});
      document.getElementById('zone-summary').textContent='Dato CABB · 2/6 de cancha · 0/0 triples · 1/3 libres (fuera del mapa).';
    }catch(e){court.querySelectorAll('[data-official-shot]').forEach(el=>el.remove());document.getElementById('zone-summary').textContent='No se pudo cargar el mapa oficial de este partido.';}
  }
  if(typeof module!=='undefined')module.exports={shotPosition};
  if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',load);
})();
