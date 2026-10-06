/* Perfil descriptivo y propuestas explícitas, con evidencia por torneo. */
(function(){
  'use strict';
  const numeric=v=>v!=null && v!=='' && Number.isFinite(Number(v));
  const total=(rows,key)=>rows.length && rows.every(r=>numeric(r[key])) ? rows.reduce((n,r)=>n+Number(r[key]),0) : null;
  const avg=(rows,key)=>total(rows,key)==null ? null : total(rows,key)/rows.length;
  const fmt=v=>v==null ? 'Sin datos' : v.toFixed(1);
  function analyze(rows){
    const cards=[['🏀','Producción ofensiva',`${fmt(avg(rows,'pts'))} puntos por partido`],['⏱️','Participación',`${fmt(avg(rows,'minutos'))} minutos por partido`],['👐','Rebote',`${fmt(avg(rows,'reb_tot'))} rebotes por partido`],['🤝','Pases',`${fmt(avg(rows,'ast'))} asistencias por partido`],['🔄','Recuperaciones',`${fmt(avg(rows,'stl'))} recuperos por partido`],['💬','Control de la pelota',`${fmt(avg(rows,'to_perdidas'))} pérdidas por partido`]];
    const attempts=total(rows,'tc_att'),twos=total(rows,'t2_att'),threes=total(rows,'t3_att'),proposals=[];
    const distribution=attempts>0 && twos!=null && threes!=null && twos+threes===attempts ? `${twos}/${attempts} intentos de dobles (${(100*twos/attempts).toFixed(1)}%) y ${threes}/${attempts} triples. Esta distribución describe qué tiros aparecen en las actas; no define tu posición.` : 'Sin datos completos para describir la distribución de tiro.';
    const shooting=['t2','t3','tl'].map(key=>{const made=total(rows,key+'_in'),att=total(rows,key+'_att');return {key,made,attempts:att,pct:made!=null && att>0 ? 100*made/att : null};});
    const free=shooting.find(v=>v.key==='tl');
    if(free.attempts>=10 && free.made!=null && free.made<free.attempts)proposals.push({title:'🎯 Revisar la rutina de tiro libre',evidence:`${free.made}/${free.attempts} libres (${free.pct.toFixed(1)}%). ${free.attempts-free.made} intentos no convertidos en esta muestra.`,question:'¿Qué rutina te ayuda a prepararte antes de tirar?',practice:'Elegí una secuencia con tu coach y registrá una serie de entrenamiento. Compará varias sesiones, sin fijar una meta automática.',area:'Tiro'});
    const missed=shooting.filter(v=>v.key!=='tl' && v.attempts>=10 && v.made!=null && v.made<v.attempts).sort((a,b)=>(b.attempts-b.made)-(a.attempts-a.made))[0];
    if(missed)proposals.push({title:'🏀 Revisar las oportunidades de tiro',evidence:`${missed.key==='t2' ? 'Dobles' : 'Triples'}: ${missed.made}/${missed.attempts} (${missed.pct.toFixed(1)}%). Este tipo concentra la mayor cantidad de intentos no convertidos entre los tipos de cancha con al menos 10 intentos.`,question:'¿En qué situaciones aparecen esos tiros: equilibrio, distancia, marca o final de posesión?',practice:'Revisá algunas jugadas con el coach y elijan una situación para practicar. El acta no identifica la causa de un fallo.',area:'Tiro'});
    const losses=total(rows,'to_perdidas'),assists=total(rows,'ast');
    if(losses>0)proposals.push({title:'🤝 Cuidar la pelota y buscar opciones',evidence:`${losses} pérdidas · ${fmt(avg(rows,'to_perdidas'))} por partido`+(assists!=null ? ` · ${assists} asistencias. Relación AST/PER: ${(assists/losses).toFixed(2)}.` : '.'),question:'¿Las pérdidas aparecen al driblar, pasar o por otra situación?',practice:'Clasificá algunas jugadas con el coach antes de elegir una práctica de manejo o pase. Una pérdida no demuestra por sí sola falta de visión de juego.',area:'Manejo / pases'});
    const fouls=total(rows,'faltas');if(fouls>0)proposals.push({title:'🛡️ Entender las faltas cometidas',evidence:`${fouls} faltas · ${fmt(avg(rows,'faltas'))} por partido.`,question:'¿Qué situaciones se repiten y cuáles forman parte del contexto del partido?',practice:'Conversá sobre algunas jugadas. Revisar apoyos, distancia o reglas puede ser útil según lo que observe el coach.',area:'Defensa'});
    const sorted=[...rows].sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)) || String(a.cabb_partido_id).localeCompare(String(b.cabb_partido_id)));
    const recent=sorted.slice(-5),before=sorted.slice(-10,-5);
    const trend=rows.length>=10 ? [['pts','puntos'],['reb_tot','rebotes'],['ast','asistencias'],['stl','recuperos']].map(([key,label])=>({label,before:avg(before,key),recent:avg(recent,key)})) : [];
    return {cards,distribution,shooting,proposals,trend};
  }
  let teamPromise;
  async function render(games,seasons){
    const host=document.getElementById('coach-stat-profile');if(!host)return;
    const node=(tag,text,parent)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(parent)parent.append(n);return n;};
    try{
      if(!teamPromise)teamPromise=fetch('cabb_team_2026.json').then(r=>{if(!r.ok)throw Error();return r.json();}).catch(()=>null);
      const team=await teamPromise;host.replaceChildren();
      const select=node('select',null,host);select.setAttribute('aria-label','Torneo del análisis');select.style.cssText='padding:9px;background:var(--card2);color:var(--text);border-radius:8px';
      ['AFMB','Federal CABB'].forEach(name=>{const o=node('option',name,select);o.value=name;});
      const content=node('div',null,host);const paragraph=(parent,text)=>{const p=node('p',text,parent);p.className='mental-tip-copy';p.style.margin='8px 0';return p;};
      const draw=()=>{
        content.replaceChildren();const rows=games.filter(g=>g.torneo===select.value),season=seasons.find(s=>s.tournament===select.value),model=analyze(rows);
        paragraph(content,`Cálculo NextLevel · ${select.value} · ${rows.length}/${season?.pj ?? '—'} partidos con acta · última fecha: ${rows.map(g=>g.fecha).sort().at(-1) || '—'}`).style.color='var(--muted)';
        if(!rows.length){paragraph(content,'Todavía no hay actas de este torneo para analizar.');return;}
        const grid=node('div',null,content);grid.className='mental-tip-grid';
        for(const [icon,title,value] of model.cards){const card=node('section',null,grid);card.className='mental-tip-card';card.style.setProperty('--tip-color','#38bdf8');const h=node('h3',icon+' '+title,card);h.className='mental-tip-title';paragraph(card,value);}
        paragraph(content,model.distribution);
        const shots=node('div',null,content);shots.style.cssText='display:flex;gap:10px;flex-wrap:wrap;font-size:.7rem';
        model.shooting.forEach(v=>node('span',`${({t2:'Dobles',t3:'Triples',tl:'Libres'})[v.key]}: ${v.made==null || v.attempts==null ? 'Sin datos' : v.made+'/'+v.attempts+' · '+(v.pct==null ? 'Sin intentos' : v.pct.toFixed(1)+'%')}`,shots));
        node('h3','🌟 Datos destacados del equipo',content).style.cssText='font-size:.85rem;color:#4ade80;margin-top:20px';
        const teamGames=team?.games?.filter(g=>g.tournament===select.value) || [],latestTeam=teamGames.map(g=>g.date).sort().at(-1),latestPlayer=rows.map(g=>g.fecha).sort().at(-1);
        const compatible=teamGames.length && teamGames.every(g=>g.available) && latestTeam>=String(latestPlayer).slice(0,10) && typeof window.NextLevelTeamRanking==='function';
        const identity=name=>String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z ]/g,' ').split(/\s+/).filter(Boolean).sort().join(' ');
        let highlights=0;
        if(compatible)for(const [key,label] of [['pts','puntos'],['reb_tot','rebotes'],['ast','asistencias'],['stl','recuperos'],['blk','tapones'],['fouls_received','faltas recibidas']]){
          const ranking=window.NextLevelTeamRanking(teamGames,key),player=ranking.rows.find(p=>identity(p.name)===identity(host.dataset.playerName));
          if(player && player.rank<=3){paragraph(content,`${player.rank}.ª del equipo en ${label} por partido: ${player.avg.toFixed(2)} · ${player.pj} PJ. Mínimo para el ranking: ${ranking.minGames}/${teamGames.length} PJ (50%).`);highlights++;}
        }
        if(!compatible)paragraph(content,'Comparación de equipo pendiente: falta un snapshot completo y actualizado. El perfil individual sigue disponible.');
        else if(!highlights)paragraph(content,'No aparece entre las tres primeras en estos rubros bajo el mínimo del 50% de PJ. Esto no define sus fortalezas técnicas ni su aporte al equipo.');
        if(highlights)paragraph(content,'Estos puestos destacan producción en esta muestra; las fortalezas técnicas las confirma el coach.').style.fontSize='.65rem';
        if(model.trend.length){node('h3','📈 Señales recientes',content).style.cssText='font-size:.85rem;color:#38bdf8;margin-top:20px';model.trend.forEach(v=>{if(v.before==null || v.recent==null)return;const change=v.recent-v.before;paragraph(content,`${v.label}: ${v.before.toFixed(1)} → ${v.recent.toFixed(1)} por partido (${Math.abs(change)<.05 ? 'estable al redondear' : (change>0 ? '+' : '')+change.toFixed(1)}). Cinco anteriores → últimos cinco del mismo torneo.`);});}
        node('h3','🌱 Áreas propuestas para conversar',content).style.cssText='font-size:.85rem;color:#fb923c;margin-top:20px';
        paragraph(content,'Elegí una práctica a la vez con el coach. Las propuestas salen de conteos e intentos; no son un diagnóstico de tus habilidades.');
        const proposals=node('div',null,content);proposals.className='mental-tip-grid';
        model.proposals.forEach(v=>{const card=node('section',null,proposals);card.className='mental-tip-card';card.style.setProperty('--tip-color','#fb923c');node('h3',v.title,card).className='mental-tip-title';paragraph(card,'📊 '+v.evidence);paragraph(card,'💬 '+v.question);paragraph(card,'✨ '+v.practice);node('small','Propuesta por validar con el coach',card).style.color='#fb923c';});
        if(!model.proposals.length)paragraph(content,'No hay evidencia suficiente para sugerir una práctica desde estas estadísticas. El coach puede proponerla a partir de la observación.');
        const button=node('button','🎯 Ir a Mi Plan y registrar mi práctica',content);button.type='button';button.className='obj-btn';button.style.marginTop='15px';button.addEventListener('click',()=>showTab('plan'));
        paragraph(content,'No se asigna un objetivo automáticamente ni se estima rendimiento futuro.').style.cssText='font-size:.65rem;color:var(--muted);margin-top:10px';
      };select.addEventListener('change',draw);draw();
    }catch(e){host.textContent='No se pudo preparar el perfil estadístico. Reintentá más tarde.';}
  }
  if(typeof module!=='undefined')module.exports={analyze,total,avg};
  if(typeof window!=='undefined')window.NextLevelCoachAnalysis={render};
})();
