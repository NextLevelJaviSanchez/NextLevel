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
    for(const id of ['mental-profile-content','pf-mental-plan','plan-mental-content']){
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
  // Esquema visual de zonas, no transformación de coordenadas del proveedor.
  const heatZones={
    Z1:{x:250,y:110,path:'M170 40 H330 V190 H170 Z'},
    Z2:{x:383,y:110,path:'M330 40 H435 V190 H330 Z'},
    Z3:{x:250,y:237,path:'M170 190 H330 V280 H170 Z'},
    Z4:{x:117,y:110,path:'M65 40 H170 V190 H65 Z'},
    Z6:{x:117,y:232,path:'M65 190 H170 V280 H65 Z'},
    Z7:{x:383,y:232,path:'M330 190 H435 V280 H330 Z'},
    Z8:{x:250,y:311,path:'M170 280 H330 V340 H170 Z'},
    Z9:{x:38,y:110,path:'M15 40 H65 V190 H15 Z'},
    Z10:{x:462,y:110,path:'M435 40 H485 V190 H435 Z'},
    Z11:{x:408,y:350,path:'M330 280 H435 V190 H485 V450 H330 Z'},
    Z12:{x:250,y:393,path:'M170 340 H330 V450 H170 Z'},
    Z13:{x:92,y:350,path:'M15 190 H65 V280 H170 V450 H15 Z'}
  };
  const zoneName=id=>id==='Z1' ? 'zona pintada' : 'zona CABB '+id;
  function heatColor(row,mode){
    if(!row || !row.attempts)return '#2C2F36';
    if(mode==='volume')return row.attempts>50 ? '#FF6D00' : row.attempts>=15 ? '#E65100' : '#546E7A';
    const pct=100*row.made/row.attempts;
    return pct>40 ? '#00E676' : pct>=25 ? '#FFD740' : '#29B6F6';
  }
  function drawSeasonCourt(zones,mode){
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 500 470');svg.setAttribute('role','img');svg.setAttribute('aria-label','Media cancha esquemática: mapa de calor por zonas CABB');svg.style.cssText='display:block;width:100%;max-width:620px;margin:auto';
    const append=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));if(text!==undefined)el.textContent=text;svg.append(el);return el;};
    append('rect',{x:15,y:40,width:470,height:410,fill:'#0f1c30',rx:4});
    for(const [id,layout] of Object.entries(heatZones)){
      const row=zones[id],pct=row ? row.made/row.attempts : 0;
      const fill=heatColor(row,mode);
      const path=append('path',{d:layout.path,fill,stroke:'#8494ac','stroke-width':.8});
      const title=document.createElementNS(ns,'title');title.textContent=row ? `${zoneName(id)}: ${row.made}/${row.attempts} · ${(pct*100).toFixed(1)}%` : `${zoneName(id)}: sin intentos registrados`;path.append(title);
      append('text',{x:layout.x,y:layout.y-10,fill:(mode==='conversion' && row && pct>=.25 ? '#10202b' : '#fff'),'text-anchor':'middle','font-size':12,'font-weight':700},id==='Z1' ? 'Zona pintada' : id);
      append('text',{x:layout.x,y:layout.y+6,fill:(mode==='conversion' && row && pct>=.25 ? '#10202b' : '#fff'),'text-anchor':'middle','font-size':11},row ? `${row.made}/${row.attempts}` : '—');
      if(row)append('text',{x:layout.x,y:layout.y+21,fill:(mode==='conversion' && row && pct>=.25 ? '#10202b' : '#fff'),'text-anchor':'middle','font-size':10},`${(pct*100).toFixed(1)}%`);
    }
    // Líneas de cancha separadas de las divisiones estadísticas del esquema.
    append('path',{d:'M15 40 H485 V450 H15 Z M174 40 V215 H326 V40 M65 40 V112 C65 365 435 365 435 112 V40 M174 215 A76 76 0 0 0 326 215 M218 62 H282',fill:'none',stroke:'#e2e8f0','stroke-width':2,'pointer-events':'none'});
    append('circle',{cx:250,cy:78,r:11,fill:'none',stroke:'#fff','stroke-width':2});
    return svg;
  }
  async function loadSeasonHeat(){
    const host=document.getElementById('season-heat-map');if(!host)return;
    const card=document.createElement('div');card.className='card';host.replaceChildren(card);
    const title=document.createElement('div');title.className='card-ttl';title.textContent='🔥 Temporada 2026 — mapa de calor por zonas';card.append(title);
    const status=document.createElement('p');status.textContent='Cargando tiros oficiales de la temporada…';card.append(status);
    try{
      const response=await fetch('cabb_season_shots_2026.json');if(!response.ok)throw Error('No disponible');const data=await response.json();
      const select=document.createElement('select');select.style.cssText='background:var(--card2);color:var(--text);padding:8px;border-radius:8px';
      for(const value of ['Todos los torneos','AFMB','Federal CABB']){const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option);}card.append(select);
      const legend=document.createElement('p');legend.style.fontSize='.7rem';legend.textContent='Media cancha esquemática: las posiciones y límites de las zonas son aproximados, no una calibración oficial CABB. Ambos lados se agrupan por código. Cada sector muestra conversiones/intentos y porcentaje; — significa sin intentos. Tiros libres fuera del mapa.';card.append(legend);
      const mode=document.createElement('select');mode.style.cssText=select.style.cssText;mode.style.marginLeft='8px';mode.setAttribute('aria-label','Color del mapa');
      for(const [value,label] of [['volume','Calor: volumen de tiros'],['conversion','Calor: porcentaje convertido']]){const option=document.createElement('option');option.value=value;option.textContent=label;mode.append(option);}card.append(mode);
      const colorLegend=document.createElement('p');colorLegend.style.fontSize='.7rem';card.append(colorLegend);
      const grid=document.createElement('div');card.append(grid);
      const analysis=document.createElement('p');analysis.style.cssText='font-size:.75rem;line-height:1.6';card.append(analysis);
      const render=()=>{
        const games=data.games.filter(g=>g.matched && (select.value==='Todos los torneos' || g.tournament===select.value));
        const zones=summarizeZones(games),entries=Object.entries(zones).sort((a,b)=>Number(a[0].slice(1))-Number(b[0].slice(1)));
        grid.replaceChildren();let attempts=0,made=0;
        entries.forEach(([,row])=>{attempts+=row.attempts;made+=row.made;});
        grid.append(drawSeasonCourt(zones,mode.value));
        colorLegend.textContent=mode.value==='volume' ? 'Volumen: naranja intenso >50 intentos · naranja intermedio 15–50 · gris azulado 1–14 · gris oscuro sin intentos. El color representa frecuencia.' : 'Efectividad: verde >40% · amarillo 25–40% · azul <25% con intentos · gris oscuro sin intentos. Compará también el volumen: pocas muestras pueden dar porcentajes extremos.';
        const unknown=entries.filter(([id])=>!heatZones[id]);
        if(unknown.length){const note=document.createElement('p');note.textContent='Fuera del esquema: '+unknown.map(([id,r])=>`${id}: ${r.made}/${r.attempts}`).join(' · ');grid.append(note);}
        status.textContent=`${select.value} · ${games.length} partidos · ${attempts} tiros de cancha · cobertura reconciliada con cada boxscore.`;
        const volume=[...entries].sort((a,b)=>b[1].attempts-a[1].attempts)[0];
        const substantial=entries.filter(e=>e[1].attempts>=10).sort((a,b)=>b[1].made/b[1].attempts-a[1].made/a[1].attempts);
        analysis.textContent=attempts ? `Cálculo NextLevel: ${made}/${attempts} tiros convertidos (${(100*made/attempts).toFixed(1)}%). La mayor concentración está en ${zoneName(volume[0])}: ${volume[1].attempts} intentos (${(100*volume[1].attempts/attempts).toFixed(1)}% del volumen). `+(substantial.length ? `Entre las zonas con al menos 10 intentos, ${zoneName(substantial[0][0])} presenta el mayor porcentaje: ${substantial[0][1].made}/${substantial[0][1].attempts}. `:'')+'Los porcentajes describen esta muestra; no prueban calidad de tiro, dificultad o habilidad técnica. Revisar con el coach las zonas de alto volumen y menor conversión antes de definir una meta.':'Sin tiros para esta selección.';
      };select.setAttribute('aria-label','Torneo del mapa');select.addEventListener('change',render);mode.addEventListener('change',render);render();
    }catch(e){status.textContent='No se pudo cargar el mapa de temporada. Reintentá más tarde.';}
  }
  function teamRanking(games,key,minGames=Math.ceil(games.length*.5)){
    const players=new Map();
    for(const game of games.filter(g=>g.available))for(const row of game.players){
      const id=row.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z ]/g,' ').split(/\s+/).filter(Boolean).sort().join(' ');
      const p=players.get(id) || {name:row.name,pj:0,total:0,known:0};p.pj++;
      if(row[key]!=null && row[key]!=='' && Number.isFinite(Number(row[key]))){p.total+=Number(row[key]);p.known++;}players.set(id,p);
    }
    const eligible=[...players.values()].filter(p=>p.pj>=minGames && p.known===p.pj).map(p=>({...p,avg:p.total/p.pj})).sort((a,b)=>b.avg-a.avg || a.name.localeCompare(b.name));
    let rank=0,previous=null;eligible.forEach((p,i)=>{if(p.avg!==previous)rank=i+1;p.rank=rank;previous=p.avg;});
    return {rows:eligible,minGames,excluded:[...players.values()].filter(p=>p.known!==p.pj).length};
  }
  async function loadTeamRanking(){
    const pane=document.getElementById('tab-rend');if(!pane)return;
    const card=document.createElement('div');card.className='card';pane.append(card);
    const heading=document.createElement('div');heading.className='card-ttl';heading.textContent='🏀 TOP del equipo — promedios por partido';card.append(heading);
    const content=document.createElement('div');content.textContent='Cargando actas del plantel…';card.append(content);
    try{
      const response=await fetch('cabb_team_2026.json');if(!response.ok)throw Error('Snapshot no disponible');const data=await response.json();
      const select=document.createElement('select');select.setAttribute('aria-label','Torneo del TOP');select.style.cssText='background:var(--card2);color:var(--text);padding:8px;border-radius:8px';
      ['AFMB','Federal CABB'].forEach(v=>{const option=document.createElement('option');option.value=v;option.textContent=v;select.append(option);});card.insertBefore(select,content);
      const render=()=>{
        content.replaceChildren();const games=data.games.filter(g=>select.value==='Todos los torneos' || g.tournament===select.value);
        const text=t=>{const p=document.createElement('p');p.style.cssText='font-size:.72rem;line-height:1.6';p.textContent=t;content.append(p);};
        const minimum=Math.ceil(games.length*.5);
        text(`${data.season} · ${games.length} partidos del equipo · mínimo ${minimum} PJ (50%) · promedios por partido jugado. Cálculo NextLevel desde actas CABB.`);
        if(games.some(g=>!g.available)){text('Cobertura incompleta: ranking pendiente hasta disponer de todas las actas.');return;}
        const panels=document.createElement('div');panels.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(255px,1fr));gap:12px';content.append(panels);
        const isProfile=p=>p.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z ]/g,' ').split(/\s+/).filter(Boolean).sort().join(' ')==='GERALDINE MIA SANCHEZ';
        for(const [key,label,negative] of [['pts','Puntos',false],['reb_tot','Rebotes',false],['stl','Recuperos',false],['blk','Tapones',false],['ast','Asistencias',false],['fouls_received','Faltas recibidas',false],['to_perdidas','Pérdidas',true],['faltas','Faltas cometidas',true]]){
          const result=teamRanking(games,key),panel=document.createElement('div');panel.style.cssText='padding:12px;border-radius:10px;background:var(--card2);border:1px solid rgba(255,255,255,.08)';panels.append(panel);
          const title=document.createElement('strong');title.style.fontSize='.78rem';title.textContent=label;panel.append(title);
          const caption=document.createElement('p');caption.style.cssText='font-size:.62rem;color:var(--muted);margin:4px 0 8px';caption.textContent=negative ? 'Mayor promedio · a revisar' : 'TOP 3 · promedio por partido';panel.append(caption);
          const top=result.rows.slice(0,3),profile=result.rows.find(isProfile);
          const row=p=>{
            const el=document.createElement('div');el.style.cssText='display:grid;grid-template-columns:25px minmax(0,1fr) auto;gap:7px;align-items:center;padding:8px 5px;font-size:.7rem;border-radius:7px';
            if(isProfile(p)){el.style.background='rgba(249,115,22,.13)';el.style.border='1px solid rgba(249,115,22,.5)';el.style.fontWeight='700';el.setAttribute('aria-label','Jugadora del perfil, puesto '+p.rank);}
            for(const value of [p.rank+'.',p.name,p.avg.toFixed(2)]){const span=document.createElement('span');span.textContent=value;el.append(span);}
            el.title=`${p.total} total · ${p.pj}/${games.length} PJ`;const detail=document.createElement('small');detail.style.cssText='grid-column:2/4;color:var(--muted);font-weight:400';detail.textContent=`${p.pj} PJ · ${p.total} total`;el.append(detail);panel.append(el);
          };
          top.forEach(row);
          if(profile && !top.includes(profile)){const separator=document.createElement('div');separator.textContent='···';separator.style.cssText='text-align:center;color:var(--muted)';panel.append(separator);row(profile);}
          if(!profile){const note=document.createElement('p');note.style.cssText='font-size:.65rem;color:var(--muted)';note.textContent='Jugadora del perfil sin puesto: no alcanza el 50% de PJ o faltan datos de este rubro.';panel.append(note);}
          if(!top.length){const note=document.createElement('p');note.textContent='Sin jugadoras elegibles con datos completos.';panel.append(note);}
          if(result.excluded){const note=document.createElement('small');note.textContent=`${result.excluded} sin datos completos en este rubro.`;panel.append(note);}
        }
        text('Pérdidas y faltas cometidas describen frecuencia; no determinan por sí solas desempeño, rol ni decisiones. Revisarlas con minutos y contexto junto al coach.');
      };select.addEventListener('change',render);render();
    }catch(e){content.textContent='No se pudieron cargar las actas completas del equipo. El TOP queda pendiente; no se calcula con solo los perfiles de NextLevel.';}
  }
  function seasonMilestones(games){
    const keys=['pts','reb_tot','ast','stl','blk'];
    const numeric=v=>v!==null && v!==undefined && v!=='' && Number.isFinite(Number(v));
    const best=key=>{const known=games.filter(g=>numeric(g[key]));if(!known.length)return null;const value=Math.max(...known.map(g=>Number(g[key])));return {value,games:known.filter(g=>Number(g[key])===value),coverage:known.length};};
    const doubles=games.filter(g=>keys.filter(k=>numeric(g[k]) && Number(g[k])>=10).length>=2);
    const complete=games.filter(g=>keys.every(k=>numeric(g[k]))).length;
    return {points:best('pts'),valuation:best('val'),doubles,complete,total:games.length};
  }
  async function loadMilestones(){
    const el=document.getElementById('season-milestones');if(!el)return;
    try{
      const {data,error}=await _supa.from('game_log').select('*').eq('player_id',PLAYER_ID).eq('source','cabb_api').gte('fecha',SEASON+'-01-01').lt('fecha',String(+SEASON+1)+'-01-01').order('fecha',{ascending:false});
      if(error)throw error;const games=data || [],summary=seasonMilestones(games);el.replaceChildren();
      const paragraph=(parent,text,style='')=>{const p=document.createElement('p');p.style.cssText='font-size:.72rem;line-height:1.6;margin:6px 0;'+style;p.textContent=text;parent.append(p);return p;};
      paragraph(el,`Temporada ${SEASON} · ${games.length} partidos · AFMB y Federal`, 'color:var(--muted);margin:0 0 14px');
      if(!games.length){paragraph(el,'Todavía no hay partidos oficiales disponibles para calcular hitos.');return;}
      const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:14px';el.append(grid);
      const card=(icon,title,value,color)=>{
        const panel=document.createElement('section');panel.style.cssText='background:var(--card2);border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:16px;min-width:0';grid.append(panel);
        const heading=document.createElement('h3');heading.style.cssText='display:flex;align-items:center;gap:8px;font-size:.8rem;margin:0 0 10px';
        const symbol=document.createElement('span');symbol.textContent=icon;symbol.setAttribute('aria-hidden','true');symbol.style.fontSize='1.3rem';heading.append(symbol,document.createTextNode(title));panel.append(heading);
        paragraph(panel,value,`font-size:1.6rem;font-weight:900;color:${color};line-height:1.2;margin:0 0 12px`);return panel;
      };
      const match=(panel,g)=>{
        const detail=document.createElement('div');detail.style.cssText='border-top:1px solid rgba(255,255,255,.08);padding-top:8px;margin-top:10px';panel.append(detail);
        paragraph(detail,'vs '+(g.rival || 'rival sin informar'),'font-weight:700');
        const date=String(g.fecha || '').slice(0,10).split('-');
        paragraph(detail,`${date.length===3 ? date.reverse().join('/') : g.fecha || 'Fecha sin informar'} · ${g.torneo || 'Torneo sin informar'}`, 'color:var(--muted);font-size:.65rem');
        paragraph(detail,'Resultado del equipo: '+(g.resultado_eq || 'sin informar'),'font-size:.65rem');
      };
      for(const [icon,label,row,color,unit] of [['🏀','Máximo de puntos',summary.points,'var(--ac)','puntos'],['⭐','Máxima valoración',summary.valuation,'#FFD740','de valoración CABB']]){
        const panel=card(icon,label,row ? `${row.value} ${unit}` : 'Sin datos',color);
        if(row){row.games.forEach(g=>match(panel,g));paragraph(panel,`Datos disponibles: ${row.coverage}/${games.length} partidos`, 'font-size:.62rem;color:var(--muted);margin-top:12px');}
      }
      const doubles=card('✌️','Dobles-dobles',`${summary.doubles.length} ${summary.doubles.length===1 ? 'logro' : 'logros'}`,'var(--green)');
      summary.doubles.forEach(g=>{match(doubles,g);paragraph(doubles,[['pts','PTS'],['reb_tot','REB'],['ast','AST'],['stl','ROB'],['blk','TAP']].filter(([key])=>g[key]!=null && Number(g[key])>=10).map(([key,label])=>`${g[key]} ${label}`).join(' · '),'font-weight:800;color:var(--green)');});
      const definition=document.createElement('details');definition.style.cssText='font-size:.65rem;color:var(--muted);margin-top:12px';const label=document.createElement('summary');label.textContent='¿Qué cuenta como doble-doble?';label.style.cursor='pointer';definition.append(label);paragraph(definition,'Al menos 10 en dos categorías: puntos, rebotes, asistencias, recuperos o tapones. Un triple-doble también cumple este hito.');doubles.append(definition);
      if(summary.complete<games.length)paragraph(doubles,`Cobertura completa: ${summary.complete}/${games.length} partidos. Los campos faltantes no se consideran cero.`,'font-size:.62rem;color:var(--muted)');
      const goal=document.createElement('div');goal.style.cssText='margin-top:14px;padding:12px 14px;border-radius:10px;background:rgba(249,115,22,.06);border:1px solid rgba(249,115,22,.18)';el.append(goal);
      paragraph(goal,summary.doubles.length ? '🎯 Objetivo de doble-doble: ya hay un logro verificado. Podés marcarlo como cumplido en Mi Plan.' : '🎯 Objetivo de doble-doble: disponible para activar en Mi Plan. Aún no hay un logro verificado.');
      paragraph(el,'Cálculo NextLevel sobre datos oficiales CABB.','font-size:.6rem;color:var(--muted);margin-top:12px');
    }catch(e){el.textContent='No se pudieron cargar los hitos oficiales. Reintentá más tarde.';}
  }
  function shotPosition(shot){const x=Number(shot.posicion_x),y=Number(shot.posicion_y);return {left:(x-35)/730*100,top:(y-34)/405*100};}
  async function load(){
    setupMental();
    loadMilestones();
    loadTeamRanking();
    try {const saved=JSON.parse(localStorage.getItem('nl_pf_mia14') || '{}');if(saved.foto_url || saved.foto)pfApplyFoto(saved.foto_url || saved.foto);if(Array.isArray(saved.mentalAreas)){_pfMentalAreas=saved.mentalAreas;renderMental(_pfMentalAreas);}}catch(e){}
    // Foto y perfil se cargan al abrir la página, sin esperar la pestaña Perfil.
    try{await pfLoadState();}catch(e){}
    try{await pfLoadFotoFromCloud();}catch(e){}
    if(!_pfMentalLoaded){
      try{const {data,error}=await _supa.from('intake_responses').select('mental,q2').eq('player_id','11111111-0000-0000-0000-000000000014').maybeSingle();if(error)throw error;if(!_pfMentalLoaded){_pfMentalAreas=String(data?.mental || '').split('|').filter(Boolean);renderMental(_pfMentalAreas);}}catch(e){renderMental(_pfMentalAreas);}
    }
    await loadSeasonHeat();

  }
  if(typeof module!=='undefined')module.exports={shotPosition,summarizeZones,seasonMilestones,heatZones,drawSeasonCourt,teamRanking,heatColor,zoneName};
  if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',load);
})();
