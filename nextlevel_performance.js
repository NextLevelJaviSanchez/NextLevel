/* Datos oficiales y cálculos: independiente de login y Estado Físico. */
(function () {
  'use strict';
  const config = typeof document === 'undefined' ? {} : document.currentScript.dataset;
  const numeric = v => v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
  function summarize(rows) {
    const total = key => rows.length && rows.every(r => numeric(r[key]) != null)
      ? rows.reduce((sum, r) => sum + numeric(r[key]), 0) : null;
    const avg = key => total(key) == null ? null : total(key) / rows.length;
    const pct = (m, a) => total(m) != null && total(m) >= 0 && total(a) > 0 && total(m) <= total(a) ? 100 * total(m) / total(a) : null;
    const fg = total('tc_in'), fga = total('tc_att'), three = total('t3_in'), ft = total('tl_att');
    return { PTS: avg('pts'), REB: avg('reb_tot'), AST: avg('ast'), ROB: avg('stl'), MIN: avg('minutos'),
      'TC%': pct('tc_in','tc_att'), '2P%': pct('t2_in','t2_att'), '3P%': pct('t3_in','t3_att'),
      'TL%': pct('tl_in','tl_att'), 'eFG%': fg != null && three != null && fga > 0 ? 100*(fg+.5*three)/fga : null,
      'TS%': total('pts') != null && fga != null && ft != null && fga+.44*ft > 0 ? 100*total('pts')/(2*(fga+.44*ft)) : null,
      'AST/PER': total('ast') != null && total('to_perdidas') > 0 ? total('ast')/total('to_perdidas') : null };
  }
  const fmt = v => numeric(v) == null ? 'Sin datos' : Number(v).toFixed(1);
  function node(tag, text, parent) {
    const el = document.createElement(tag);
    if (text != null) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
  }
  async function readAll(table, query) {
    const result = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await query(_supa.from(table).select('*')).range(offset, offset + 499);
      if (error) throw new Error(error.message);
      result.push(...(data || []));
      if (!data || data.length < 500) return result;
    }
  }
  async function load() {
    const pane = document.getElementById('tab-rend');
    if (!pane) return;
    const card = node('div', null); card.className = 'card';
    pane.prepend(card);
    node('div', 'Últimos partidos · Dato CABB', card).className = 'card-ttl';
    const status = node('p', 'Cargando historial oficial…', card);
    status.style.cssText = 'font-size:.72rem;color:var(--muted)';
    if (config.playerId.endsWith('000010')) {
      // Eliminar referencias deportivas heredadas sin modificar Estado Físico ni objetivos.
      ['tab-rend','tab-prog','tab-perfil'].forEach(id => {
        const section=document.getElementById(id);
        section?.querySelectorAll('.sc-val:not([data-official-metric]), .sc-sub, .def-bar-val').forEach(el => el.textContent='Sin datos');
      });
      document.querySelectorAll('#tab-perfil .profile-quote, #tab-perfil .cv-quote').forEach(el => el.textContent='Coach · evaluación pendiente. Datos oficiales en Rendimiento.');
    }
    try {
      const games = await readAll('game_log', q => q.eq('player_id',config.playerId)
        .eq('source','cabb_api').gte('fecha',config.season+'-01-01')
        .lt('fecha',String(Number(config.season)+1)+'-01-01')
        .order('fecha',{ascending:false}).order('cabb_partido_id',{ascending:false}));
      const seasons = await readAll('stats_seasons', q => q.eq('player_id',config.playerId)
        .eq('season',config.season).order('tournament'));
      const totalExpected=seasons.reduce((sum,s)=>sum+Number(s.pj || 0),0);
      const coverageComplete=totalExpected>0 && games.length===totalExpected;
      const shooting=summarize(games);
      const pctKeys={t3_pct:'3P%',tl_pct:'TL%',efg_pct:'eFG%',ts_pct:'TS%'};
      document.querySelectorAll('[data-official-metric]').forEach(el => {
        const key=el.dataset.officialMetric;
        const populated=seasons.filter(s => s[key] != null && Number(s.pj) > 0);
        const complete=populated.length === seasons.filter(s => Number(s.pj) > 0).length;
        const n=populated.reduce((sum,s)=>sum+Number(s.pj),0);
        const value=key==='pj' ? seasons.reduce((sum,s)=>sum+Number(s.pj || 0),0)
          : pctKeys[key] ? (coverageComplete ? shooting[pctKeys[key]] : null)
          : complete && n ? populated.reduce((sum,s)=>sum+Number(s[key])*Number(s.pj),0)/n : null;
        el.textContent = value == null ? '—' : Number(value).toFixed(key==='pj'?0:1);
        el.title = pctKeys[key] ? 'Cálculo NextLevel · conversiones / intentos oficiales' : 'Resumen sincronizado de temporada';
      });
      status.textContent = games.length ? `${games.length}/${totalExpected || '—'} partidos con boxscore · ${config.season}. ${coverageComplete ? 'Cobertura coincide con los PJ de la temporada.' : 'Muestra parcial; no equivale a una temporada completa.'} Cálculo NextLevel desde datos CABB.`
        : 'Sin partidos oficiales sincronizados. No se muestran resultados de ejemplo.';
      const tournaments = [...new Set([...seasons.map(r => r.tournament), ...games.map(r => r.torneo)].filter(Boolean))];
      const select = node('select', null, card);
      select.style.cssText = 'background:var(--card2);color:var(--text);padding:8px;border-radius:8px;max-width:100%';
      const all = node('option','Todos los torneos',select); all.value = '';
      tournaments.forEach(t => { node('option',t,select).value = t; });
      const content = node('div',null,card);
      const render = () => {
        content.replaceChildren();
        const rows = games.filter(g => !select.value || g.torneo === select.value);
        const last = rows.slice(0,5), summary = summarize(rows), recent = summarize(last);
        node('p', `Últimos ${last.length} vs temporada · Cálculo NextLevel`,content);
        const wrap = node('div',null,content); wrap.style.overflowX = 'auto';
        const table = node('table',null,wrap); table.style.cssText = 'width:100%;font-size:.7rem;text-align:left;border-spacing:10px';
        const header = node('tr',null,node('thead',null,table));
        ['Métrica','Temporada','Últimos '+last.length,'Cambio'].forEach(t => node('th',t,header));
        const body = node('tbody',null,table);
        const seasonRows=seasons.filter(s => !select.value || s.tournament === select.value);
        const expected=seasonRows.reduce((sum,s)=>sum+Number(s.pj || 0),0);
        const base={};
        const mapping={PTS:'ppg',REB:'rpg',AST:'apg',ROB:'spg',MIN:'min_pg'};
        for (const k of Object.keys(summary)) {
          const key=mapping[k];
          base[k]=expected && key && seasonRows.every(s=>numeric(s[key])!=null && numeric(s.pj)!=null)
            ? seasonRows.reduce((sum,s)=>sum+Number(s[key])*Number(s.pj),0)/expected
            : expected && rows.length===expected ? summary[k] : null;
        }
        Object.keys(summary).forEach(k => {
          const tr=node('tr',null,body), a=base[k], b=recent[k];
          [k,k==='AST/PER' && a!=null ? a.toFixed(2) : fmt(a),k==='AST/PER' && b!=null ? b.toFixed(2) : fmt(b),a==null||b==null?'—':((b-a)>0?'↑ ':((b-a)<0?'↓ ':'→ '))+Math.abs(b-a).toFixed(k==='AST/PER'?2:1)].forEach(t => node('td',t,tr));
        });
        seasons.filter(s => !select.value || s.tournament === select.value).forEach(s => {
          node('p',`${s.tournament} · resumen de temporada: ${s.pj ?? 'Sin datos'} PJ · ${fmt(s.ppg)} PTS · ${fmt(s.min_pg)} MIN. Fuente: resumen sincronizado; comparar cobertura antes de equipararlo al historial.`,content);
        });
        last.forEach(g => {
          const d=node('details',null,content); d.style.cssText='padding:10px 0;border-top:1px solid #334155;font-size:.75rem';
          const outcome=g.ganado===true?'G':g.ganado===false?'P':'Sin resultado';
          node('summary',`${g.fecha} · ${g.rival || 'Rival sin datos'} · ${g.resultado_eq ?? 'Sin marcador'} (${outcome}) · ${g.pts ?? '—'} PTS · ${g.reb_tot ?? '—'} REB · ${g.ast ?? '—'} AST`,d);
          node('p','Dato CABB · '+[['MIN','minutos'],['PTS','pts'],['REB','reb_tot'],['AST','ast'],['ROB','stl'],['TAP','blk'],['PER','to_perdidas'],['FALTAS','faltas'],['VAL','val']].map(([label,key]) => `${label}: ${g[key] ?? 'Sin datos'}`).join(' · '),d);
          node('p',['2P','3P','TL'].map((label,i) => {const k=['t2','t3','tl'][i];return `${label}: ${g[k+'_in'] ?? '—'}/${g[k+'_att'] ?? '—'}`;}).join(' · '),d);
        });
      };
      select.addEventListener('change',render); render();
    } catch (error) {
      status.textContent = 'No se pudo cargar el historial oficial. Reintentá más tarde.';
      console.warn('Rendimiento oficial:',error.message);
    }
  }
  if (typeof module !== 'undefined') module.exports = { summarize };
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded',load);
})();
