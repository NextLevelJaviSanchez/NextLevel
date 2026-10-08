/* Perfil descriptivo y propuestas explícitas, con evidencia por torneo. */
(function(){
  'use strict';
  const numeric=v=>v!=null && v!=='' && typeof v!=='boolean' && Number.isFinite(Number(v)) && Number(v)>=0;
  const total=(rows,key)=>rows.length && rows.every(r=>numeric(r[key])) ? rows.reduce((n,r)=>n+Number(r[key]),0) : null;
  const avg=(rows,key)=>total(rows,key)==null ? null : total(rows,key)/rows.length;
  const fmt=v=>v==null ? 'Sin datos' : v.toFixed(1);
  function analyze(rows,options={}){const model=typeof window!=='undefined'?window.NextLevelCoachPersonalization:require('./nextlevel_coach_personalization.js');return model.analyze(rows,options);}
  let teamPromise;
  async function render(games=[],seasons=[],options={}){
    const host=options.host || document.getElementById('coach-stat-profile');if(!host)return;if(host._coachCleanup)host._coachCleanup();
    const node=(tag,text,parent)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(parent)parent.append(n);return n;};
    let profile=options.getProfile?.() || options.profile || {},goals=[],reference=null;
    const client=options.client || (typeof _supa!=='undefined'?_supa:null),playerId=options.playerId || (typeof PLAYER_ID!=='undefined'?PLAYER_ID:window.NextLevelPlayer?.playerId),season=String(options.season || (typeof SEASON!=='undefined'?SEASON:window.NextLevelPlayer?.season)),category=options.category || window.NextLevelPlayer?.category || (options.mini?'U11':!window.NextLevelPlayer?'U13':'');
    try{
      if(client && playerId && /^20\d{2}$/.test(season)){
        const extra=[];for(let from=0;;from+=1000){const {data,error}=await client.from('player_data').select('module,data').eq('player_id',playerId).order('module').range(from,from+999);if(error)throw error;extra.push(...(data || []));if(!data || data.length<1000)break;}
        const primary=options.mini?'mini_profile_v1':'perfil_v1',secondary=options.mini?'perfil_v1':'mini_profile_v1';profile=options.getProfile?.() || extra.find(r=>r.module===primary)?.data || extra.find(r=>r.module===secondary)?.data || profile;
        reference=extra.find(r=>r.module==='coach_eval_v1')?.data?.participationReferenceMinutes ?? null;
        goals=extra.filter(r=>r.module.startsWith('gradual_goals_v1:'+season+':') && r.data?.version===1).map(r=>r.data);
      }
      if(!options.mini && !teamPromise)teamPromise=(window.NextLevelSources ? NextLevelSources.read('team') : fetch('cabb_team_2026.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();})).catch(()=>null);
      const team=options.mini?null:await teamPromise;host.replaceChildren();
      const select=node('select',null,host);select.setAttribute('aria-label','Torneo del análisis');select.style.cssText='padding:9px;background:var(--card2);color:var(--text);border-radius:8px';
      [...new Set([...(games || []).map(g=>g.torneo),...(seasons || []).map(s=>s.tournament),...goals.map(g=>g.torneo)].filter(Boolean).concat(!games.length && !seasons.length && !goals.length?['Práctica personal']:[]))].forEach(name=>{const o=node('option',name,select);o.value=name;});
      const content=node('div',null,host);const paragraph=(parent,text)=>{const p=node('p',text,parent);p.className='mental-tip-copy';p.style.margin='8px 0';return p;};
      const draw=()=>{
        content.replaceChildren();const rows=games.filter(g=>g.torneo===select.value),season=seasons.find(s=>s.tournament===select.value),model=analyze(rows,{profile,category,mini:!!options.mini,coachReference:reference,goals,torneo:select.value});
        paragraph(content,`Cálculo NextLevel · ${select.value} · ${rows.length}/${season?.pj ?? '—'} partidos con acta · última fecha: ${rows.map(g=>g.fecha).sort().at(-1) || '—'}`).style.color='var(--muted)';
                paragraph(content,'Áreas elegidas: '+(model.selected.join(' · ') || 'Todavía no seleccionaste áreas en Perfil.'));
        paragraph(content,model.participation);
        node('h3','🎯 Tus prioridades de trabajo',content);
        model.priorities.forEach(p=>paragraph(content,p.title+' · '+p.reason));
        if(!model.priorities.length)paragraph(content,'Elegí en Perfil qué querés mejorar; el coach puede ayudarte a decidir por dónde empezar.');
        if(model.achievements.length){node('h3','🏆 Avances que ya lograste',content);model.achievements.forEach(a=>paragraph(content,a.title+' · '+a.date+' · '+Number(a.value).toFixed(1)+(a.source==='player_training'?' días registrados de práctica.':' · objetivo estadístico cumplido.')));}
        if(!rows.length)paragraph(content,'Todavía no hay actas de este torneo. Las propuestas de práctica siguen disponibles según tus preferencias.');
        const grid=node('div',null,content);grid.className='mental-tip-grid';
        for(const [icon,title,value] of model.cards){const card=node('section',null,grid);card.className='mental-tip-card';card.style.setProperty('--tip-color','#38bdf8');const h=node('h3',icon+' '+title,card);h.className='mental-tip-title';paragraph(card,value);}
        paragraph(content,model.distribution);
        const shots=node('div',null,content);shots.style.cssText='display:flex;gap:10px;flex-wrap:wrap;font-size:.7rem';
        model.shooting.forEach(v=>node('span',`${({t2:'Dobles',t3:'Triples',tl:'Libres'})[v.key]}: ${v.made==null || v.attempts==null ? 'Sin datos' : v.made+'/'+v.attempts+' · '+(v.pct==null ? 'Sin intentos' : v.pct.toFixed(1)+'%')}`,shots));
        if(!options.mini){node('h3','🌟 Datos destacados del equipo',content).style.cssText='font-size:.85rem;color:#4ade80;margin-top:20px';
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
        }if(model.trend.length){node('h3','📈 Señales recientes',content).style.cssText='font-size:.85rem;color:#38bdf8;margin-top:20px';model.trend.forEach(v=>{if(v.before==null || v.recent==null)return;const change=v.recent-v.before;paragraph(content,`${v.label}: ${v.before.toFixed(1)} → ${v.recent.toFixed(1)} ${v.unit} (${Math.abs(change)<.05 ? 'estable al redondear' : (change>0 ? '+' : '')+change.toFixed(1)}). Cinco anteriores → últimos cinco del mismo torneo.`);});}
        node('h3','🌱 Propuestas según tus áreas elegidas',content).style.cssText='font-size:.85rem;color:#fb923c;margin-top:20px';
        paragraph(content,'Elegí hasta dos objetivos con el coach. Estas propuestas siguen tus preferencias y los mismos criterios de Mi Plan; la práctica registrada no certifica dominio técnico.');
        const proposals=node('div',null,content);proposals.className='mental-tip-grid';
        model.proposals.forEach(v=>{const card=node('section',null,proposals);card.className='mental-tip-card';card.style.setProperty('--tip-color','#fb923c');node('h3',v.title,card).className='mental-tip-title';paragraph(card,'📌 '+v.reason);paragraph(card,'📊 '+v.evidence);paragraph(card,'💬 '+v.question);paragraph(card,'✨ '+v.practice);node('small','Propuesta por validar con el coach',card).style.color='#fb923c';});
        if(!model.proposals.length)paragraph(content,'Seleccioná en Perfil qué querés mejorar. Si faltan datos, el coach puede acordar una práctica a partir de la observación.');
        const button=node('button','🎯 Ir a Mi Plan y registrar mi práctica',content);button.type='button';button.className='obj-btn';button.style.marginTop='15px';button.addEventListener('click',()=>{if(options.goPlan)options.goPlan();else if(typeof showTab==='function')showTab('plan');});
        paragraph(content,'Las propuestas se activan en Mi Plan. Los logros confirmados muestran una felicitación en Inicio. La defensa requiere observación; los recuperos no describen toda la defensa.').style.cssText='font-size:.65rem;color:var(--muted);margin-top:10px';
            };
      const preferences=event=>{profile=event.detail || {};draw();};
      const updates=event=>{if(event.detail?.playerId!==playerId || String(event.detail?.season)!==season)return;goals=event.detail.goals || goals;if(event.detail.games)games=event.detail.games;draw();};
      document.addEventListener('nextlevel-profile-preferences',preferences);document.addEventListener('nextlevel-goals-updated',updates);
      host._coachCleanup=()=>{document.removeEventListener('nextlevel-profile-preferences',preferences);document.removeEventListener('nextlevel-goals-updated',updates);};
      select.addEventListener('change',draw);draw();
    }catch(e){host.textContent='No se pudo preparar el perfil estadístico. Reintentá más tarde.';}
  }
  if(typeof module!=='undefined')module.exports={analyze,total,avg};
  if(typeof window!=='undefined')window.NextLevelCoachAnalysis={render};
})();
