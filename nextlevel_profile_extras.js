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
    const values=Array.isArray(data) ? data : String(data?.mental || '').split('|').filter(Boolean);
    for(const id of ['mental-profile-content','pf-mental-plan']){
      const el=document.getElementById(id);if(!el)continue;el.replaceChildren();
      if(!values.length){el.textContent='Elegí en Perfil las áreas mentales que querés trabajar.';continue;}
      for(const value of values){const card=document.createElement('div');card.className='card';const title=document.createElement('strong');title.textContent=value;card.append(title);
        for(const text of [tips[value] || 'Definí una práctica con tu coach.','Práctica propuesta: elegí una situación en cada entrenamiento para aplicar esta consigna durante las próximas dos semanas.','Seguimiento: al terminar, anotá qué situación apareció, qué hiciste y qué querés probar la próxima vez. Revisalo semanalmente con el coach.']){const p=document.createElement('p');p.textContent=text;card.append(p);}el.append(card);}
    }
    document.querySelectorAll('#pf-mental-chips button').forEach(button=>{const on=values.includes(button.dataset.value);button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));});
  }
  function setupMental(){
    window.renderProfileMental=renderMental;
    const container=document.getElementById('pf-mental-chips');
    Object.keys(tips).forEach(value=>{const button=document.createElement('button');button.type='button';button.className='pf-chip';button.style.color='inherit';button.dataset.value=value;button.textContent=value;button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>{_pfMentalAreas=_pfMentalAreas.includes(value)?_pfMentalAreas.filter(v=>v!==value):[..._pfMentalAreas,value];_pfMentalLoaded=true;renderMental(_pfMentalAreas);pfSave();});container.append(button);});
  }
  function summarizeZones(games){
    const zones={};
    for(const game of games.filter(g=>g.matched))for(const shot of game.shots){const zone=String(shot.zona || 'Sin zona').replace(/-(IZ|DE)$/,'');const row=zones[zone] ||= {attempts:0,made:0};row.attempts++;if(shot.accion_tipo.startsWith('CANASTA'))row.made++;}
    return zones;
  }
  async function loadSeasonHeat(){
    const court=document.getElementById('shotCourt');if(!court)return;
    const card=document.createElement('div');card.className='card';court.closest('.card').after(card);
    const title=document.createElement('div');title.className='card-ttl';title.textContent='🔥 Temporada 2026 — mapa de calor por zonas';card.append(title);
    const status=document.createElement('p');status.textContent='Cargando tiros oficiales de la temporada…';card.append(status);
    try{
      const response=await fetch('cabb_season_shots_2026.json');if(!response.ok)throw Error('No disponible');const data=await response.json();
      const select=document.createElement('select');select.style.cssText='background:var(--card2);color:var(--text);padding:8px;border-radius:8px';
      for(const value of ['Todos los torneos','AFMB','Federal CABB']){const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option);}card.append(select);
      const legend=document.createElement('p');legend.style.fontSize='.7rem';legend.textContent='Color: porcentaje convertido (rojo → verde). Cada casilla muestra conversiones/intentos. Se agrupan las zonas de ambos lados del aro según su identificador CABB; la cuadrícula no representa distancias. Tiros libres fuera del mapa.';card.append(legend);
      const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px';card.append(grid);
      const analysis=document.createElement('p');analysis.style.cssText='font-size:.75rem;line-height:1.6';card.append(analysis);
      const render=()=>{
        const games=data.games.filter(g=>g.matched && (select.value==='Todos los torneos' || g.tournament===select.value));
        const zones=summarizeZones(games),entries=Object.entries(zones).sort((a,b)=>Number(a[0].slice(1))-Number(b[0].slice(1)));
        grid.replaceChildren();let attempts=0,made=0;
        entries.forEach(([name,row])=>{attempts+=row.attempts;made+=row.made;const pct=100*row.made/row.attempts;const tile=document.createElement('div');tile.style.cssText=`padding:12px;border-radius:10px;border:1px solid hsla(${pct*1.2},70%,50%,.7);background:hsla(${pct*1.2},70%,35%,.3);font-size:.75rem`;tile.textContent=`Zona ${name.replace(/^Z/,'')}: ${row.made}/${row.attempts} · ${pct.toFixed(1)}%`;tile.title=`${row.attempts} intentos · ${row.made} conversiones`;grid.append(tile);});
        status.textContent=`${select.value} · ${games.length} partidos · ${attempts} tiros de cancha · cobertura reconciliada con cada boxscore.`;
        const volume=[...entries].sort((a,b)=>b[1].attempts-a[1].attempts)[0];
        const substantial=entries.filter(e=>e[1].attempts>=10).sort((a,b)=>b[1].made/b[1].attempts-a[1].made/a[1].attempts);
        analysis.textContent=attempts ? `Cálculo NextLevel: ${made}/${attempts} tiros convertidos (${(100*made/attempts).toFixed(1)}%). La mayor concentración está en ${volume[0]}: ${volume[1].attempts} intentos (${(100*volume[1].attempts/attempts).toFixed(1)}% del volumen). `+(substantial.length ? `Entre las zonas con al menos 10 intentos, ${substantial[0][0]} presenta el mayor porcentaje: ${substantial[0][1].made}/${substantial[0][1].attempts}. `:'')+'Los porcentajes describen esta muestra; no prueban calidad de tiro, dificultad o habilidad técnica. Revisar con el coach las zonas de alto volumen y menor conversión antes de definir una meta.':'Sin tiros para esta selección.';
      };select.addEventListener('change',render);render();
    }catch(e){status.textContent='No se pudo cargar el mapa de temporada. Reintentá más tarde.';}
  }
  function shotPosition(shot){const x=Number(shot.posicion_x),y=Number(shot.posicion_y);return {left:(x-35)/730*100,top:(y-34)/405*100};}
  async function load(){
    setupMental();
    try {const saved=JSON.parse(localStorage.getItem('nl_pf_mia14') || '{}');if(saved.foto_url || saved.foto)pfApplyFoto(saved.foto_url || saved.foto);if(Array.isArray(saved.mentalAreas)){_pfMentalAreas=saved.mentalAreas;renderMental(_pfMentalAreas);}}catch(e){}
    // Foto y perfil se cargan al abrir la página, sin esperar la pestaña Perfil.
    try{await pfLoadState();}catch(e){}
    try{await pfLoadFotoFromCloud();}catch(e){}
    if(!_pfMentalLoaded){
      try{const {data,error}=await _supa.from('intake_responses').select('mental,q2').eq('player_id','11111111-0000-0000-0000-000000000014').maybeSingle();if(error)throw error;if(!_pfMentalLoaded){_pfMentalAreas=String(data?.mental || '').split('|').filter(Boolean);renderMental(_pfMentalAreas);}}catch(e){renderMental(_pfMentalAreas);}
    }
    await loadSeasonHeat();
    const court=document.getElementById('shotCourt');if(!court)return;
    try{const response=await fetch('cabb_pbp_inventory_644845.json');if(!response.ok)throw Error('No disponible');const data=await response.json();const shots=data.mia_shots.filter(s=>String(s.eliminado).toLowerCase()!=='true' && /^(CANASTA-[23]P|TIRO[23]-FALLADO)$/.test(s.accion_tipo));if(shots.length!==6 || shots.filter(s=>s.accion_tipo.startsWith('CANASTA')).length!==2)throw Error('Conteos no reconciliados');
      court.querySelectorAll('[data-official-shot]').forEach(el=>el.remove());
      shots.forEach(s=>{const pos=shotPosition(s);if(!Number.isFinite(pos.left)||!Number.isFinite(pos.top)||pos.left<0||pos.left>100||pos.top<0||pos.top>100)throw Error('Coordenada fuera de referencia');const dot=document.createElement('div');dot.dataset.officialShot=s.autoincremental_id;dot.className='shot-dot';dot.style.left=pos.left+'%';dot.style.top=pos.top+'%';dot.style.background=s.accion_tipo.startsWith('CANASTA')?'#22c55e':'#ef4444';dot.style.zIndex='2';dot.title=`${s.accion_tipo} · cuarto ${s.numero_periodo} · ${s.tiempo_partido} · zona CABB ${s.zona}`;court.append(dot);});
      document.getElementById('zone-summary').textContent='Dato CABB · 2/6 de cancha · 0/0 triples · 1/3 libres (fuera del mapa).';
    }catch(e){court.querySelectorAll('[data-official-shot]').forEach(el=>el.remove());document.getElementById('zone-summary').textContent='No se pudo cargar el mapa oficial de este partido.';}
  }
  if(typeof module!=='undefined')module.exports={shotPosition,summarizeZones};
  if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',load);
})();
