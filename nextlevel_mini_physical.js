/* Tests copiados del perfil de Mía; identidad y sesión propias de Milo. */
(function(){'use strict';
let _supa=null,FIS_PLAYER_ID=null,linkedUserId=null;
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const TEST_CFG = {
  beep:   { table:'physical_test_results', type:'beep_test',      lowerIsBetter:false,
            fmtVal: r => r.attempt_1 ? `${r.attempt_1}` : '—',
            fmtUnit: r => r.attempt_1 ? `Nivel ${r.attempt_1}` : '',
            secondary: r => r.value ? `${r.value} m` : '' },
  sprint: { table:'physical_test_results', type:'sprint_rep_15',  lowerIsBetter:false,
            fmtVal: r => r.value != null ? `${r.value}` : '—',
            fmtUnit: r => r.value != null ? `líneas` : '',
            secondary: r => r.value != null ? `${(r.value*15).toFixed(0)} m` : '' },
  lane:   { table:'physical_test_results', type:'lane_agility',   lowerIsBetter:true,
            fmtVal: r => r.value != null ? `${r.value}s` : '—',
            fmtUnit: r => r.value != null ? 'seg' : '',
            secondary: () => '' },
  jump:   { table:'physical_test_results', type:'broad_jump',     lowerIsBetter:false,
            fmtVal: r => r.value != null ? `${r.value}` : '—',
            fmtUnit: r => r.value != null ? 'cm' : '',
            secondary: () => '' },
  squat:  { table:'physical_test_results', type:'squat_30s',      lowerIsBetter:false,
            fmtVal: r => r.value != null ? `${r.value}` : '—',
            fmtUnit: r => r.value != null ? 'reps' : '',
            secondary: () => '' },
};

// Cache local de resultados por tipo
const _testData = { beep:[], sprint:[], lane:[], jump:[], squat:[] };
// Charts activos
const _charts = {};

/* ── ANTROPOMETRÍA — leer desde localStorage de Mi Perfil ── */
/* ── TOGGLE tarjeta ── */
function tcToggle(key) {
  const card = document.getElementById('tc-' + key);
  card.classList.toggle('open');
  // Si es la primera vez que se abre, cargar datos
  if (card.classList.contains('open') && !card._loaded) {
    card._loaded = true;
    fisLoadTest(key);
  }
}

/* ── ABRIR formulario de registro ── */
function tcOpenForm(key, e) {
  if (e) e.stopPropagation();
  const card = document.getElementById('tc-' + key);
  // Asegurar que el detalle esté abierto
  if (!card.classList.contains('open')) card.classList.add('open');
  const isOpen = card.classList.contains('reg-open');
  card.classList.toggle('reg-open', !isOpen);
  if (!isOpen) {
    // Setear fecha de hoy
    const df = document.getElementById('f-' + key + '-date');
    if (df && !df.value) df.value = today();
    // Limpiar campos de resultado
    ['f-'+key+'-id'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  }
}

/* ── CÁLCULOS EN TIEMPO REAL ── */
const BEEP_SPL = [7,8,8,9,9,10,10,11,11,11,12,12,13,13,13]; // lanzaderas por nivel

function calcBeep() {
  const lvl  = parseInt(document.getElementById('f-beep-level').value)   || 0;
  const shut = parseInt(document.getElementById('f-beep-shuttle').value) || 0;
  if (!lvl || !shut) { ['c-beep-res','c-beep-dist','c-beep-lanz'].forEach(id => document.getElementById(id).textContent='—'); return; }
  let tot = shut;
  for (let i=0; i<lvl-1 && i<BEEP_SPL.length; i++) tot += BEEP_SPL[i];
  document.getElementById('c-beep-res').textContent  = `${lvl}.${shut}`;
  document.getElementById('c-beep-dist').textContent = `${tot*20} m`;
  document.getElementById('c-beep-lanz').textContent = tot;
}

function calcSprint() {
  const v = parseFloat(document.getElementById('f-sprint-lines').value);
  if (!v) { ['c-sprint-lines','c-sprint-dist','c-sprint-vs'].forEach(id => document.getElementById(id).textContent='—'); return; }
  document.getElementById('c-sprint-lines').textContent = v;
  document.getElementById('c-sprint-dist').textContent  = `${(v*15).toFixed(0)} m`;
  // vs anterior
  const prev = _testData.sprint[1]?.value;
  if (prev != null) {
    const d = v - prev;
    document.getElementById('c-sprint-vs').textContent = `${d>=0?'+':''}${d.toFixed(1)}`;
    document.getElementById('c-sprint-vs').style.color = d>0?'#22c55e':d<0?'#ef4444':'#a5b4c7';
  } else {
    document.getElementById('c-sprint-vs').textContent = 'primero';
  }
}

function calcLane() {
  const a = parseFloat(document.getElementById('f-lane-1').value) || null;
  const b = parseFloat(document.getElementById('f-lane-2').value) || null;
  const best = (a&&b) ? Math.min(a,b) : (a||b||null);
  document.getElementById('c-lane-best').textContent = best!=null ? `${best} s` : '—';
}

function calcJump() {
  const vals = [
    parseFloat(document.getElementById('f-jump-1').value)||null,
    parseFloat(document.getElementById('f-jump-2').value)||null,
    parseFloat(document.getElementById('f-jump-3').value)||null,
  ].filter(v=>v!=null);
  const best = vals.length ? Math.max(...vals) : null;
  document.getElementById('c-jump-best').textContent = best!=null ? `${best} cm` : '—';
}

/* ── GUARDAR TEST ── */
async function saveTest(key) {
  if(!_supa || !FIS_PLAYER_ID){alert('Entrá con tu cuenta para guardar este test.');return;}
  const {data:auth,error:authError}=await _supa.auth.getUser();
  if(authError || !auth?.user || auth.user.id!==linkedUserId){alert('Volvé a comprobar tu cuenta antes de guardar.');return;}
  const fields=[...document.querySelectorAll('#form-'+key+' input:not([type="hidden"])')];
  if(fields.some(el=>!el.checkValidity())){alert('Revisá los valores ingresados.');return;}
  const inputDate=document.getElementById('f-'+key+'-date').value;
  if(!inputDate || inputDate>today()){alert('Elegí una fecha válida hasta hoy.');return;}

  const date  = document.getElementById('f-' + key + '-date').value;
  const notes = document.getElementById('f-' + key + '-notes')?.value?.trim() || null;
  const editId = document.getElementById('f-' + key + '-id').value || null;
  if (!date) { alert('La fecha es obligatoria'); return; }

  let value = null, attempt_1 = null, attempt_2 = null, attempt_3 = null;

  if (key === 'beep') {
    const lvl  = parseInt(document.getElementById('f-beep-level').value)   || null;
    const shut = parseInt(document.getElementById('f-beep-shuttle').value) || null;
    if (!lvl || !shut || lvl>BEEP_SPL.length || shut>BEEP_SPL[lvl-1]) { alert('Revisá nivel y lanzadera según el audio utilizado.'); return; }
    attempt_1 = lvl; attempt_2 = shut;
    let tot = shut;
    for (let i=0; i<lvl-1 && i<BEEP_SPL.length; i++) tot += BEEP_SPL[i];
    value = tot * 20; // distancia en metros como valor numérico comparable
    attempt_3 = tot;  // lanzaderas totales
  } else if (key === 'sprint') {
    value = parseFloat(document.getElementById('f-sprint-lines').value) || null;
    if (!value) { alert('Ingresá la cantidad de líneas'); return; }
  } else if (key === 'lane') {
    const a = parseFloat(document.getElementById('f-lane-1').value) || null;
    const b = parseFloat(document.getElementById('f-lane-2').value) || null;
    attempt_1 = a; attempt_2 = b;
    value = (a&&b) ? Math.min(a,b) : (a||b||null);
    if (!value) { alert('Ingresá al menos un intento'); return; }
  } else if (key === 'jump') {
    const a = parseFloat(document.getElementById('f-jump-1').value)||null;
    const b = parseFloat(document.getElementById('f-jump-2').value)||null;
    const c = parseFloat(document.getElementById('f-jump-3').value)||null;
    attempt_1=a; attempt_2=b; attempt_3=c;
    const vals=[a,b,c].filter(v=>v!=null);
    value = vals.length ? Math.max(...vals) : null;
    if (!value) { alert('Ingresá al menos un intento'); return; }
  } else if (key === 'squat') {
    value = parseInt(document.getElementById('f-squat-reps').value) || null;
    if (!value) { alert('Ingresá las repeticiones'); return; }
  }

  const payload = {
    player_id: FIS_PLAYER_ID,
    test_type:  TEST_CFG[key].type,
    date,
    value,
    unit: key==='beep'?'m': key==='sprint'?'lineas': key==='lane'?'s': key==='jump'?'cm':'reps',
    attempt_1, attempt_2, attempt_3,
    notes,
    source: 'self',
  };

  const btn = document.querySelector(`#form-${key} .btn-save-test`);
  btn.textContent = '⏳ Guardando…'; btn.disabled = true;

  let err;
  try{
  if (editId) {
    ({ error: err } = await _supa.from('physical_test_results').update(payload).eq('id', editId).eq('player_id',FIS_PLAYER_ID));
  } else {
    ({ error: err } = await _supa.from('physical_test_results').insert(payload));
  }
  btn.textContent = '💾 Guardar'; btn.disabled = false;

  if (err) {
    alert('Error: ' + err.message);
  } else {
    // Cerrar form, recargar
    document.getElementById('tc-' + key).classList.remove('reg-open');
    _testData[key] = [];
    await fisLoadTest(key);
  }
  }catch(e){alert('No se pudo guardar: '+e.message);}finally{btn.textContent='💾 Guardar';btn.disabled=false;}
}

/* ── CARGAR datos de un test desde Supabase ── */
async function fisLoadTest(key) {
  if(!_supa || !FIS_PLAYER_ID){document.getElementById('hist-'+key).textContent='Entrá con tu cuenta para consultar y guardar tus registros.';return;}
  const { data, error } = await _supa
    .from('physical_test_results')
    .select('*')
    .eq('player_id', FIS_PLAYER_ID)
    .eq('test_type', TEST_CFG[key].type)
    .order('date', { ascending: false })
    .limit(20);

  if(error){document.getElementById('hist-'+key).textContent='No se pudieron cargar los registros: '+error.message;return;}if(!data)return;
  _testData[key] = data;
  fisRenderTest(key, data);
}

/* ── RENDERIZAR tarjeta con datos ── */
function fisRenderTest(key, data) {
  const cfg = TEST_CFG[key];
  if (!data || data.length === 0) {
    document.getElementById('tc-' + key + '-result').textContent = '—';
    document.getElementById('tc-' + key + '-date').textContent   = 'Sin registro';
    document.getElementById('hist-' + key).innerHTML = '<div class="tc-nodata">Todavía sin registros · Presioná "+ Registrar test"</div>';
    return;
  }

  const last = data[0];
  const prev = data[1] || null;
  const best = cfg.lowerIsBetter
    ? data.reduce((a,b) => (b.value < a.value ? b : a), last)
    : data.reduce((a,b) => (b.value > a.value ? b : a), last);

  // Cabecera
  const d = new Date(last.date + 'T00:00:00');
  document.getElementById('tc-'+key+'-result').textContent = cfg.fmtVal(last);
  document.getElementById('tc-'+key+'-date').textContent   = d.toLocaleDateString('es-AR',{day:'2-digit',month:'short'});

  // Stats row
  document.getElementById('tc-'+key+'-best').textContent = cfg.fmtVal(best);
  document.getElementById('tc-'+key+'-prev').textContent = prev ? cfg.fmtVal(prev) : '—';

  // Delta
  const deltaEl = document.getElementById('tc-'+key+'-delta');
  if (prev && last.value != null && prev.value != null) {
    const d = last.value - prev.value;
    const improved = cfg.lowerIsBetter ? d < 0 : d > 0;
    const same = Math.abs(d) < 0.01;
    const sign = d > 0 ? '+' : '';
    const unit = key==='lane'?'s':key==='jump'?'cm':key==='squat'?'rep':'';
    deltaEl.textContent = same ? '=' : `${sign}${key==='lane'||key==='sprint'?d.toFixed(1):Math.round(d)}${unit}`;
    deltaEl.className   = 'tc-stat-d ' + (same?'delta-eq':improved?'delta-up':'delta-dn');
  } else { deltaEl.textContent = '—'; deltaEl.className = 'tc-stat-d delta-eq'; }

  // Secundario (distancia beep / sprint)
  const secId = { beep:'tc-beep-dist', sprint:'tc-sprint-dist' }[key];
  if (secId) document.getElementById(secId).textContent = cfg.secondary(last) || '—';

  // Historial
  fisRenderHistorial(key, data);

  // Gráfico
  fisRenderChart(key, data);
}

/* ── HISTORIAL ── */
function fisRenderHistorial(key, data) {
  const cfg = TEST_CFG[key];
  const el  = document.getElementById('hist-' + key);
  if (!data.length) { el.innerHTML='<div class="tc-nodata">Sin registros</div>'; return; }

  el.innerHTML = data.slice(0,6).map(r => {
    const d = new Date(r.date+'T00:00:00').toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'2-digit'});
    const srcCls = r.source==='coach' ? 'src-coach' : 'src-self';
    const srcLbl = r.source==='coach' ? '🏅 coach' : '👤 vos';
    const sec = cfg.secondary(r) ? ` <span style="color:var(--muted);font-size:0.62rem">· ${cfg.secondary(r)}</span>` : '';
    return `<div class="tc-hist-item">
      <div class="tc-hist-date">${d}</div>
      <div class="tc-hist-val">${cfg.fmtVal(r)}${sec}</div>
      <span class="tc-hist-src ${srcCls}">${srcLbl}</span>
    </div>`;
  }).join('');
}

/* ── GRÁFICO ── */
function fisRenderChart(key, data) {
  const cfg = TEST_CFG[key];
  const canvas = document.getElementById('chart-' + key);
  if (typeof Chart==='undefined' || !canvas || data.length < 2) { if(canvas)canvas.style.display='none'; return; }
  canvas.style.display = '';

  const sorted = [...data].reverse(); // cronológico
  const labels = sorted.map(r => new Date(r.date+'T00:00:00').toLocaleDateString('es-AR',{day:'2-digit',month:'short'}));
  const vals   = sorted.map(r => r.value);
  const colors = { beep:'#22c55e', sprint:'#f97316', lane:'#a855f7', jump:'#facc15', squat:'#a855f7' };
  const col    = colors[key] || '#f97316';

  if (_charts[key]) _charts[key].destroy();
  _charts[key] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: vals,
        borderColor: col,
        backgroundColor: col + '18',
        borderWidth: 2.5,
        pointBackgroundColor: col,
        pointRadius: 4,
        tension: 0.3,
        fill: true,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend:{ display:false } },
      scales: {
        x:{ grid:{color:'rgba(255,255,255,0.03)'}, ticks:{color:'#a5b4c7',font:{size:14}} },
        y:{ grid:{color:'rgba(255,255,255,0.03)'}, ticks:{color:'#a5b4c7',font:{size:14}},
            reverse: cfg.lowerIsBetter }  // Lane Agility: eje invertido
      }
    }
  });
}

/* ── MODAL "CÓMO HACER ESTE TEST" ── */
const HOW_CONTENT = {
  beep: {
    title: '❤️ Beep Test 20 m — Instrucciones',
    body: `
<div class="how-h">¿Qué mide?</div>
<p class="how-p">Tu <strong>resistencia aeróbica</strong>. El coach puede usarlo para registrar cómo sostenés el esfuerzo.</p>

<div class="how-h">¿Qué necesitás?</div>
<p class="how-p">Un espacio de <strong>20 metros planos</strong> (puede ser en el gimnasio o afuera). Dos líneas o conos marcando los extremos. El audio del Beep Test.</p>

<div class="how-diagram">
<svg viewBox="0 0 300 60" width="100%" style="max-width:280px">
  <line x1="20" y1="30" x2="280" y2="30" stroke="#334155" stroke-width="2"/>
  <rect x="14" y="10" width="12" height="40" rx="3" fill="#f97316" opacity=".8"/>
  <rect x="274" y="10" width="12" height="40" rx="3" fill="#f97316" opacity=".8"/>
  <text x="150" y="26" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="sans-serif">← 20 metros →</text>
  <text x="20" y="58" text-anchor="middle" fill="#f97316" font-size="9" font-family="sans-serif">Línea A</text>
  <text x="280" y="58" text-anchor="middle" fill="#f97316" font-size="9" font-family="sans-serif">Línea B</text>
</svg></div>

<div class="how-h">Instrucciones paso a paso</div>
<ol class="how-steps">
  <li>Marcá dos líneas separadas exactamente <strong>20 metros</strong>.</li>
  <li>Arrancá parado sobre la Línea A.</li>
  <li>Cuando suene el primer beep, <strong>empezá a correr hacia la Línea B</strong>.</li>
  <li>Tenés que llegar a la Línea B antes del siguiente beep. Si llegás antes, esperás ahí.</li>
  <li>Al sonar el beep, salís hacia la Línea A nuevamente.</li>
  <li>Continuás de esta forma: A→B, B→A, A→B… sin parar.</li>
  <li>El sonido se hace más rápido con cada nivel.</li>
</ol>

<div class="how-h">¿Cuándo termina?</div>
<p class="how-p">Cuando no podés llegar a la línea antes del beep por <strong>segunda vez consecutiva</strong>. Anotá el número de nivel y la lanzadera donde llegaste.</p>

<div class="how-h">¿Cómo registrás el resultado?</div>
<p class="how-p">Resultado = <span class="how-pill">Nivel.Lanzadera</span>. Ejemplo: si llegaste al nivel 8 lanzadera 6 → <span class="how-pill">8.6</span>. Mayor número = mayor resistencia.</p>

<div class="how-h">Descanso recomendado</div>
<p class="how-p">Hacé el test solo una vez por sesión. Descansá al menos <strong>48 horas</strong> antes de repetirlo.</p>

<div class="how-warn">⚠️ <strong>Seguridad:</strong> Entrá en calor 5-10 minutos antes. Si sentís mareos o dolor de pecho, detenete inmediatamente.</div>

<div class="beep-audio-box">
  <div class="beep-audio-title">🎧 Audio para realizar el test</div>
  <p class="how-p" style="margin-bottom:10px">Necesitás el audio oficial del Beep Test para realizar el test. Usá auriculares o parlante externo para escucharlo bien mientras corrés.</p>
  <button class="btn-play-beep" id="btn-beep-audio" onclick="playBeepAudio()">▶ Abrir audio del Beep Test en YouTube</button>
  <p class="how-p" style="margin-top:8px;font-size:0.68rem">📌 Marcá dos líneas separadas por <strong>20 metros</strong> y seguí las señales del audio. Podés dejar el video sonando con la pantalla apagada.</p>
</div>`
  },
  sprint: {
    title: '⚡ Sprint repetido 15 m · 30 seg — Instrucciones',
    body: `
<div class="how-h">¿Qué mide?</div>
<p class="how-p">Tu <strong>velocidad con cambios de dirección repetidos</strong>. Simula las acciones reales de un partido de básquet: no se corre 100 metros en línea, se hacen muchos sprints cortos con frenadas y arranques.</p>

<div class="how-h">¿Qué necesitás?</div>
<p class="how-p">Dos líneas separadas <strong>15 metros</strong> (puede ser en la cancha). Un cronómetro o celular con temporizador de 30 segundos.</p>

<div class="how-diagram">
<svg viewBox="0 0 280 80" width="100%" style="max-width:260px">
  <rect x="14" y="10" width="10" height="60" rx="2" fill="#f97316" opacity=".7"/>
  <rect x="256" y="10" width="10" height="60" rx="2" fill="#f97316" opacity=".7"/>
  <line x1="24" y1="40" x2="256" y2="40" stroke="#334155" stroke-width="1.5" stroke-dasharray="6,4"/>
  <path d="M 50 40 Q 80 20 110 40 Q 140 60 170 40 Q 200 20 230 40" stroke="#38bdf8" stroke-width="2" fill="none"/>
  <text x="140" y="75" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="sans-serif">← 15 metros →</text>
  <text x="19" y="8" text-anchor="middle" fill="#f97316" font-size="8" font-family="sans-serif">A</text>
  <text x="261" y="8" text-anchor="middle" fill="#f97316" font-size="8" font-family="sans-serif">B</text>
</svg></div>

<div class="how-h">Instrucciones paso a paso</div>
<ol class="how-steps">
  <li>Marcá dos líneas separadas exactamente <strong>15 metros</strong>.</li>
  <li>Parás en la Línea A. Pedís que alguien active el cronómetro (o lo activás vos).</li>
  <li>Al sonar "¡YA!", corrés <strong>a máxima velocidad</strong> hacia la Línea B.</li>
  <li>Al llegar a la Línea B, <strong>pisás la línea con un pie</strong>, frenás y volvés hacia la Línea A.</li>
  <li>Repetís esto sin parar durante <strong>30 segundos</strong>.</li>
  <li>Cada vez que pisás una línea = <strong>1 línea completada</strong>.</li>
</ol>

<div class="how-h">¿Cómo contás?</div>
<p class="how-p">Cada línea pisada = 1. Si al terminar el tiempo estás a mitad de camino = <span class="how-pill">0.5</span> líneas extra. La app calcula la distancia automáticamente (líneas × 15 m).</p>

<div class="how-h">Cantidad de intentos</div>
<p class="how-p">Un solo intento por sesión. Es un test de máximo esfuerzo durante 30 segundos.</p>

<div class="how-warn">⚠️ <strong>Seguridad:</strong> Hacé un calentamiento de al menos 5 minutos antes. El piso debe estar seco para evitar resbalones en los cambios de dirección.</div>`
  },
  lane: {
    title: '🔄 Lane Agility Test — Instrucciones',
    body: `
<div class="how-h">¿Qué mide?</div>
<p class="how-p">Tu <strong>agilidad alrededor de la zona pintada</strong>. Mide la velocidad de desplazamiento lateral, hacia atrás y hacia adelante en el espacio de juego más importante de una cancha de básquet. En este test, <strong>menor tiempo = mejor resultado</strong>.</p>

<div class="how-h">¿Qué necesitás?</div>
<p class="how-p">La zona pintada de una cancha de básquet estándar (o 4 conos marcando los vértices). Un cronómetro.</p>

<div class="how-diagram">
<svg viewBox="0 0 220 160" width="100%" style="max-width:200px">
  <!-- zona pintada -->
  <rect x="30" y="20" width="160" height="120" rx="4" fill="none" stroke="#334155" stroke-width="2"/>
  <!-- conos -->
  <circle cx="30" cy="20"  r="5" fill="#f97316"/>
  <circle cx="190" cy="20"  r="5" fill="#f97316"/>
  <circle cx="30" cy="140" r="5" fill="#f97316"/>
  <circle cx="190" cy="140" r="5" fill="#f97316"/>
  <!-- punto de inicio -->
  <circle cx="30" cy="80" r="6" fill="#38bdf8"/>
  <text x="15" y="84" fill="#38bdf8" font-size="8" font-family="sans-serif">★</text>
  <!-- flechas del recorrido -->
  <path d="M 30 80 L 30 22 L 190 22 L 190 140 L 30 140 L 30 80" stroke="#22c55e" stroke-width="1.8" fill="none" stroke-dasharray="5,3" marker-end="url(#arr)"/>
  <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#22c55e"/></marker></defs>
  <text x="110" y="155" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="sans-serif">★ = inicio/fin</text>
</svg></div>

<div class="how-h">Instrucciones paso a paso</div>
<ol class="how-steps">
  <li>Parás en el <strong>centro del lado izquierdo</strong> de la zona pintada (o en el cono inferior izquierdo).</li>
  <li>Al sonido de salida, corrés hacia la esquina superior izquierda.</li>
  <li>Seguís corriendo hacia la esquina superior derecha.</li>
  <li>Bajás hacia la esquina inferior derecha.</li>
  <li>Volvés al punto de inicio corriendo por el lado izquierdo.</li>
  <li>Parás el cronómetro cuando cruzás el punto de inicio.</li>
  <li>Repetís el recorrido en sentido contrario (segundo intento).</li>
</ol>

<div class="how-h">¿Cuántos intentos?</div>
<p class="how-p">Dos intentos. Descansá <strong>2 minutos</strong> entre cada uno. La app toma automáticamente el <strong>mejor tiempo (el menor)</strong>.</p>

<div class="how-warn">⚠️ No uses zapatillas con suela mojada. Pisá firmemente en cada cambio de dirección para no resbalarte.</div>`
  },
  jump: {
    title: '🚀 Salto horizontal desde parado — Instrucciones',
    body: `
<div class="how-h">¿Qué mide?</div>
<p class="how-p">La <strong>potencia explosiva de tus piernas</strong>. Es un indicador directo de qué tan explosivo es tu primer paso y tu capacidad de salto en el juego.</p>

<div class="how-h">¿Qué necesitás?</div>
<p class="how-p">Una línea en el piso (puede ser la línea de la cancha), una cinta métrica o regla de al menos 2 metros.</p>

<div class="how-diagram">
<svg viewBox="0 0 280 80" width="100%" style="max-width:260px">
  <rect x="30" y="55" width="220" height="4" rx="2" fill="#334155"/>
  <!-- persona -->
  <circle cx="50" cy="28" r="8" fill="none" stroke="#94a3b8" stroke-width="2"/>
  <line x1="50" y1="36" x2="50" y2="52" stroke="#94a3b8" stroke-width="2"/>
  <!-- flecha salto -->
  <path d="M 55 45 Q 110 10 190 45" stroke="#f97316" stroke-width="2.5" fill="none" stroke-dasharray="4,3"/>
  <polygon points="190,40 196,50 184,50" fill="#f97316"/>
  <!-- medida -->
  <line x1="50" y1="62" x2="190" y2="62" stroke="#38bdf8" stroke-width="1" stroke-dasharray="3,2"/>
  <text x="120" y="76" text-anchor="middle" fill="#38bdf8" font-size="9" font-family="sans-serif">← distancia →</text>
  <text x="30" y="66" fill="#f97316" font-size="8" font-family="sans-serif">Línea</text>
</svg></div>

<div class="how-h">Instrucciones paso a paso</div>
<ol class="how-steps">
  <li>Parás con <strong>los dos pies juntos</strong> detrás de la línea, punteras sobre la línea.</li>
  <li>Doblás las rodillas y balanceás los brazos.</li>
  <li>Saltás hacia adelante con los <strong>dos pies</strong> a la vez, tan lejos como puedas.</li>
  <li>Caés con los dos pies juntos y te quedás parado.</li>
  <li>Se mide desde la línea de salida hasta <strong>el talón más cercano a la línea</strong> (el que quedó más atrás).</li>
</ol>

<div class="how-h">¿Cuántos intentos?</div>
<p class="how-p">Hasta <strong>3 intentos</strong>. Descansá 1 minuto entre cada uno. La app toma el mejor automáticamente.</p>

<div class="how-h">Errores que invalidan el intento</div>
<p class="how-p">❌ Caer hacia atrás y apoyar las manos. ❌ Despegar de a un pie. ❌ No quedarte parado al caer.</p>

<div class="how-warn">⚠️ Hacé 5 saltos suaves de calentamiento antes. Si el piso es resbaladizo, no lo hagas.</div>`
  },
  squat: {
    title: '💪 Sentadillas en 30 segundos — Instrucciones',
    body: `
<div class="how-h">¿Qué mide?</div>
<p class="how-p">La <strong>fuerza-resistencia del tren inferior</strong>. Cuántas veces podés hacer una sentadilla técnicamente correcta en 30 segundos. No es un test de fuerza máxima, sino de resistencia a la potencia.</p>

<div class="how-h">¿Qué necesitás?</div>
<p class="how-p">Solo vos misma, un piso plano y un cronómetro. No hace falta ningún equipamiento.</p>

<div class="how-h">Instrucciones paso a paso</div>
<ol class="how-steps">
  <li>Parás con los <strong>pies a la altura de los hombros</strong>, puntas ligeramente hacia afuera.</li>
  <li>Brazos extendidos hacia adelante para equilibrio.</li>
  <li>Bajás hasta que los <strong>muslos queden paralelos al piso</strong> (o más abajo si podés).</li>
  <li>Los talones deben estar apoyados en el piso en todo momento.</li>
  <li>Las rodillas siguen la dirección de los pies, sin caerse hacia adentro.</li>
  <li>Subís volviendo a la posición inicial. Eso es <strong>1 repetición válida</strong>.</li>
  <li>Repetís lo más rápido que podés durante <strong>30 segundos</strong>.</li>
</ol>

<div class="how-h">¿Qué cuenta como válida?</div>
<p class="how-p">Solo la repetición donde <strong>los muslos llegaron a paralelo</strong> y los talones no se despegaron. Si hacés un movimiento incompleto, no cuenta.</p>

<div class="how-h">Cantidad de intentos</div>
<p class="how-p">Un solo intento por sesión.</p>

<div class="how-warn">⚠️ Si sentís dolor en las rodillas o espalda baja, detenete. Hacé 10 sentadillas lentas de calentamiento antes del test.</div>`
  }
};

function tcOpenHow(key, e) {
  if (e) e.stopPropagation();
  const content = HOW_CONTENT[key];
  if (!content) return;
  document.getElementById('how-modal-title').textContent = content.title;
  document.getElementById('how-modal-body').innerHTML    = content.body;
  document.getElementById('how-modal-bg').classList.add('on');
  document.body.style.overflow = 'hidden';
}

function howModalHide() {
  document.getElementById('how-modal-bg').classList.remove('on');
  document.body.style.overflow = '';
}

function howModalClose(e) {
  if (e.target === document.getElementById('how-modal-bg')) howModalHide();
}

// Audio Beep Test — URL configurable
const BEEP_AUDIO_URL = 'https://www.youtube.com/watch?v=44Od78CnL8A';
function playBeepAudio() {
  if (!BEEP_AUDIO_URL) {
    alert('🎧 El audio del Beep Test todavía no está configurado.\n\nPedile el link al coach o buscá "Beep Test audio 20m" en YouTube.');
    return;
  }
  window.open(BEEP_AUDIO_URL, '_blank');
}


const api={async connect(client,playerId,userId){_supa=client;FIS_PLAYER_ID=playerId;linkedUserId=userId;await Promise.all(Object.keys(TEST_CFG).map(fisLoadTest));},types:TEST_CFG};
if(typeof module!=='undefined')module.exports=api;
if(typeof window!=='undefined'){window.NextLevelMiniPhysical=api;Object.assign(window,{tcToggle,tcOpenForm,calcBeep,calcSprint,calcLane,calcJump,saveTest,tcOpenHow,howModalHide,howModalClose,playBeepAudio});}
})();
