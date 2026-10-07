/* Evolución histórica desde actas oficiales, sin escenarios futuros. */
(function(){
  'use strict';
  const metrics={pts:'Puntos',reb_tot:'Rebotes',ast:'Asistencias',stl:'Recuperos',val:'Valoración',minutos:'Minutos'};
  const known=v=>v!==null && v!==undefined && v!=='' && Number.isFinite(Number(v));
  const average=(rows,key)=>rows.length && rows.every(r=>known(r[key])) ? rows.reduce((s,r)=>s+Number(r[key]),0)/rows.length : null;
  function shooting(rows,prefix){
    if(!rows.length || rows.some(r=>!known(r[prefix+'_in']) || !known(r[prefix+'_att'])))return null;
    const made=rows.reduce((s,r)=>s+Number(r[prefix+'_in']),0),attempts=rows.reduce((s,r)=>s+Number(r[prefix+'_att']),0);
    return {made,attempts,pct:attempts ? 100*made/attempts : null};
  }
  function blocks(rows){return {recent:rows.slice(-5),previous:rows.slice(-10,-5)};}
  async function load(){
    const host=document.getElementById('evolution-real');if(!host)return;
    let chart;
    const node=(tag,text,parent)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(parent)parent.append(n);return n;};
    const fmt=v=>v==null ? 'Sin datos' : v.toFixed(1);
    try{
      let games=[];
      for(let from=0;;from+=1000){const {data,error}=await _supa.from('game_log').select('*').eq('player_id',PLAYER_ID).eq('source','cabb_api').gte('fecha',SEASON+'-01-01').lt('fecha',String(+SEASON+1)+'-01-01').order('fecha',{ascending:true}).order('cabb_partido_id',{ascending:true}).range(from,from+999);if(error)throw error;games.push(...(data || []));if(!data || data.length<1000)break;}
      host.replaceChildren();
      const controls=node('div',null,host);controls.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px';
      const tournament=node('select',null,controls);tournament.setAttribute('aria-label','Torneo de evolución');
      for(const name of [...new Set(games.map(g=>g.torneo).filter(Boolean))]){const o=node('option',name,tournament);o.value=name;}
      const metric=node('select',null,controls);metric.setAttribute('aria-label','Métrica de evolución');
      Object.entries(metrics).forEach(([key,label])=>{const o=node('option',label,metric);o.value=key;});
      [tournament,metric].forEach(n=>n.style.cssText='padding:9px;background:var(--card2);color:var(--text);border-radius:8px;border:1px solid rgba(255,255,255,.15)');
      const status=node('p',null,host);status.style.cssText='font-size:.7rem;color:var(--muted)';
      const wrap=node('div',null,host);wrap.style.cssText='position:relative;height:260px';const canvas=node('canvas',null,wrap);
      const detail=node('details',null,host);node('summary','Ver valores por partido',detail).style.cursor='pointer';const log=node('div',null,detail);
      const trend=node('div',null,host),shots=node('div',null,host);
      const table=(parent,headers,rows)=>{const scroll=node('div',null,parent);scroll.style.overflowX='auto';const t=node('table',null,scroll);t.style.cssText='width:100%;font-size:.72rem;border-collapse:collapse;margin:10px 0';const h=node('tr',null,node('thead',null,t));headers.forEach(v=>node('th',v,h));const body=node('tbody',null,t);rows.forEach(values=>{const r=node('tr',null,body);values.forEach(v=>{const c=node('td',v,r);c.style.cssText='padding:9px 6px;border-bottom:1px solid rgba(255,255,255,.07)';});});};
      const render=()=>{
        const rows=games.filter(g=>g.torneo===tournament.value),key=metric.value,{recent,previous}=blocks(rows);
        status.textContent=`${tournament.value} · ${rows.length} partidos · ${metrics[key]} · orden cronológico. Los faltantes se muestran como huecos, no como cero.`;
        if(chart)chart.destroy();
        chart=new Chart(canvas,{type:'line',data:{labels:rows.map(g=>String(g.fecha).slice(5,10)+' · '+g.rival),datasets:[{label:metrics[key]+' por partido',data:rows.map(g=>known(g[key]) ? Number(g[key]) : null),borderColor:'#f97316',backgroundColor:'rgba(249,115,22,.1)',pointRadius:4,tension:0,spanGaps:false}]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{ticks:{color:'#94a3b8',maxTicksLimit:6},grid:{color:'rgba(255,255,255,.04)'}},y:{ticks:{color:'#94a3b8'},grid:{color:'rgba(255,255,255,.04)'}}},plugins:{legend:{labels:{color:'#94a3b8'}}}}});
        log.replaceChildren();table(log,['Fecha','Rival',metrics[key]],rows.map(g=>[g.fecha,g.rival,known(g[key]) ? Number(g[key]).toFixed(1) : 'Sin datos']));
        trend.replaceChildren();node('h3','📊 Últimos 5 vs los 5 anteriores',trend).style.fontSize='.85rem';
        if(rows.length>=10)table(trend,['Métrica','5 anteriores','Últimos 5','Cambio'],Object.entries(metrics).map(([k,label])=>{const before=average(previous,k),after=average(recent,k),delta=before!=null && after!=null ? after-before : null;return [label,fmt(before),fmt(after),delta==null ? 'Sin datos' : (delta>0 ? '+' : '')+delta.toFixed(1)];}));
        else node('p',`Hay ${rows.length} partidos de este torneo. Se necesitan 10 para comparar dos bloques completos de cinco.`,trend).style.fontSize='.72rem';
        shots.replaceChildren();node('h3','🎯 Evolución de la efectividad',shots).style.fontSize='.85rem';
        const display=v=>v ? `${v.made}/${v.attempts} · ${v.pct==null ? 'Sin intentos' : v.pct.toFixed(1)+'%'}` : 'Sin datos';
        table(shots,['Tiro','Temporada',`Últimos ${recent.length}`,...(rows.length>=10 ? ['5 anteriores','Cambio (pp)'] : [])], [['tc','Cancha'],['t2','Dobles'],['t3','Triples'],['tl','Libres']].map(([prefix,label])=>{const all=shooting(rows,prefix),after=shooting(recent,prefix),before=shooting(previous,prefix);return [label,display(all),display(after),...(rows.length>=10 ? [display(before),after?.pct!=null && before?.pct!=null ? ((after.pct-before.pct)>0?'+':'')+(after.pct-before.pct).toFixed(1) : 'Sin datos'] : [])];}));
        node('p','Porcentajes calculados con conversiones/intentos acumulados. Los cambios describen estos partidos; interpretalos junto con minutos, rivales y rol.',shots).style.cssText='font-size:.65rem;color:var(--muted)';
      };tournament.addEventListener('change',render);metric.addEventListener('change',render);render();
    }catch(e){host.textContent='No se pudo cargar la evolución oficial. Reintentá más tarde.';}
  }
  if(typeof module!=='undefined')module.exports={average,shooting,blocks};
  if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',load);
})();
