/* Un registro por sesión: no reemplaza el plan anterior ni las actas CABB. */
(function(){
  'use strict';
  const prefix='plan_progress_v1:';
  function validate(entry,today){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || entry.date>today || !Number.isFinite(new Date(entry.date+'T12:00:00Z').getTime()) || new Date(entry.date+'T12:00:00Z').toISOString().slice(0,10)!==entry.date)return 'Elegí una fecha válida, hasta hoy.';
    if(!Array.isArray(entry.areas) || !entry.areas.length)return 'Elegí al menos una práctica.';
    if(entry.shots && (!Number.isInteger(entry.shots.made) || !Number.isInteger(entry.shots.attempts) || entry.shots.attempts<=0 || entry.shots.made<0 || entry.shots.made>entry.shots.attempts || entry.shots.attempts>1000))return 'Revisá los tiros: intentos entre 1 y 1000, y conversiones entre 0 y los intentos.';
    if((entry.success || '').length>500 || (entry.next || '').length>500)return 'Usá hasta 500 caracteres por reflexión.';
    return '';
  }
  function weekly(entries,today){
    const start=new Date(today+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-6);const first=start.toISOString().slice(0,10);
    const rows=entries.filter(e=>e.date>=first && e.date<=today),days=new Set(rows.map(e=>e.date)).size;
    const shooting={};for(const e of rows){if(!e.shots)continue;const value=shooting[e.shots.type] ||= {made:0,attempts:0};value.made+=e.shots.made;value.attempts+=e.shots.attempts;}
    return {rows,days,shooting};
  }
  async function load(){
    const host=document.getElementById('plan-progress');if(!host)return;
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const cacheKey='nl_plan_progress_v1_'+PLAYER_ID;
    let entries=[],pending=new Set(),busy=false;
    try{const saved=JSON.parse(localStorage.getItem(cacheKey) || '{}');entries=Array.isArray(saved.entries) ? saved.entries : [];pending=new Set(saved.pending || []);}catch(e){}
    host.replaceChildren();
    const node=(tag,text,parent)=>{const el=document.createElement(tag);if(text!=null)el.textContent=text;if(parent)parent.append(el);return el;};
    const status=node('p','Cargando desde Supabase…',host);status.setAttribute('role','status');status.style.cssText='font-size:.68rem;color:var(--muted)';
    const form=node('form',null,host);form.style.cssText='display:grid;gap:12px';
    const field=(label,type)=>{const wrap=node('label',label,form);wrap.style.cssText='font-size:.72rem;display:grid;gap:6px';const input=node(type==='textarea' ? 'textarea' : 'input',null,wrap);if(type!=='textarea')input.type=type;input.style.cssText='background:var(--card2);color:var(--text);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:10px;font:inherit';return input;};
    const date=field('📅 Fecha de la práctica','date');date.value=today;date.max=today;date.required=true;
    const group=node('fieldset',null,form);group.style.cssText='border:0;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:12px;font-size:.72rem';node('legend','✅ ¿Qué practiqué?',group).style.marginBottom='8px';
    const checks=['Tiro','Manejo','Defensa','Rebote','Pases','Trabajo mental'].map(name=>{const label=node('label',null,group);const check=node('input',null,label);check.type='checkbox';check.value=name;label.append(document.createTextNode(' '+name));return check;});
    const addPersonalAreas=profile=>{for(const name of window.NextLevelGoalCatalog?.practiceAreas(profile) || []){if(checks.some(c=>c.value===name))continue;const label=node('label',null,group),check=node('input',null,label);check.type='checkbox';check.value=name;label.append(document.createTextNode(' '+name));checks.push(check);}};
    addPersonalAreas({areas:typeof _pfAreas!=='undefined'?_pfAreas:[],mentalAreas:typeof _pfMentalAreas!=='undefined'?_pfMentalAreas:[]});
    document.addEventListener('nextlevel-profile-preferences',event=>addPersonalAreas(event.detail || {}));
    const shooting=node('details',null,form);node('summary','🏀 Anotar tiros de entrenamiento (opcional)',shooting).style.cssText='cursor:pointer;font-size:.75rem;color:var(--ac)';
    const selectWrap=node('label','Tipo de tiro ',shooting);const type=node('select',null,selectWrap);type.setAttribute('aria-label','Tipo de tiro de entrenamiento');for(const name of ['Libres','Dobles','Triples']){const option=node('option',name,type);option.value=name;}
    const shotField=label=>{const wrap=node('label',label,shooting);wrap.style.cssText='display:block;margin-top:8px;font-size:.72rem';const input=node('input',null,wrap);input.type='number';input.min=0;input.max=1000;input.step=1;input.style.cssText='margin-left:8px;width:90px;background:var(--card2);color:var(--text);padding:8px;border:1px solid rgba(255,255,255,.12);border-radius:6px';return input;};
    const made=shotField('Convertidos'),attempts=shotField('Intentados');
    const success=field('⭐ Algo que me salió bien','textarea'),next=field('🌱 Algo que quiero probar la próxima vez','textarea');for(const n of [success,next]){n.maxLength=500;n.rows=2;}
    const saveButton=node('button','Guardar mi práctica',form);saveButton.type='submit';saveButton.className='obj-btn';saveButton.style.cssText='padding:11px;color:var(--ac);border-color:var(--ac)';
    const retry=node('button','Reintentar guardados pendientes',host);retry.type='button';retry.className='obj-btn';retry.style.marginTop='10px';
    const summary=node('div',null,host),history=node('div',null,host),legacy=node('details',null,host);
    const persist=()=>{try{localStorage.setItem(cacheKey,JSON.stringify({entries,pending:[...pending]}));return true;}catch(e){status.textContent='No se pudo crear la copia local. No cierres la página antes de confirmar el guardado en Supabase.';return false;}};
    const render=()=>{
      retry.hidden=!pending.size;summary.replaceChildren();history.replaceChildren();
      node('h3','📊 Mis últimos 7 días',summary).style.cssText='font-size:.85rem;color:#38bdf8;margin-top:20px';const week=weekly(entries,today);
      node('p',`${week.rows.length} prácticas registradas en ${week.days} días. Cada paso cuenta.`,summary).style.fontSize='.72rem';
      Object.entries(week.shooting).forEach(([name,value])=>node('p',`${name}: ${value.made}/${value.attempts} · ${(100*value.made/value.attempts).toFixed(1)}% en entrenamiento`,summary).style.fontSize='.72rem');
      node('h3','📝 Mis prácticas recientes',history).style.cssText='font-size:.85rem;color:#4ade80';
      if(!entries.length)node('p','Todavía no hay registros. Podés empezar con la práctica de hoy.',history).style.fontSize='.72rem';
      [...entries].sort((a,b)=>b.date.localeCompare(a.date) || String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,10).forEach(e=>{
        const card=node('section',null,history);card.style.cssText='padding:12px;background:var(--card2);border-radius:10px;margin:10px 0;font-size:.72rem;line-height:1.6';node('strong',e.date+' · '+e.areas.join(' / '),card);
        if(e.shots)node('p',`${e.shots.type}: ${e.shots.made}/${e.shots.attempts} · ${(100*e.shots.made/e.shots.attempts).toFixed(1)}%`,card);
        if(e.success)node('p','⭐ '+e.success,card);if(e.next)node('p','🌱 '+e.next,card);
        node('small',pending.has(e.id) ? '⏳ Pendiente de sincronizar' : '☁️ Guardado en Supabase',card).style.color=pending.has(e.id) ? '#FFD740' : '#4ade80';
      });
      if(entries.length>10)node('small',`Se muestran 10 de ${entries.length} registros. El resumen semanal usa todos.`,history);
    };
    const sync=async()=>{
      if(busy)return;busy=true;saveButton.disabled=true;retry.disabled=true;
      try{
        for(const id of [...pending]){const entry=entries.find(e=>e.id===id);if(!entry)continue;const {error}=await _supa.from('player_data').upsert({player_id:PLAYER_ID,module:prefix+id,data:entry,updated_at:new Date().toISOString()},{onConflict:'player_id,module'});if(error)throw error;pending.delete(id);persist();document.dispatchEvent(new CustomEvent('nextlevel-practice-saved',{detail:entry}));}
        status.textContent='✅ Tus prácticas están guardadas en Supabase.';
      }catch(e){status.textContent='⏳ Hay prácticas pendientes. Si la copia local está disponible, se conservan en este dispositivo; reintentá cuando haya conexión.';}
      finally{busy=false;saveButton.disabled=false;retry.disabled=false;render();}
    };
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(busy)return;
      const entry={id:crypto.randomUUID(),date:date.value,areas:checks.filter(c=>c.checked).map(c=>c.value),success:success.value.trim(),next:next.value.trim(),createdAt:new Date().toISOString(),source:'player_training'};
      if(made.value!=='' || attempts.value!=='')entry.shots={type:type.value,made:made.value==='' ? NaN : Number(made.value),attempts:attempts.value==='' ? NaN : Number(attempts.value)};
      let error;try{error=validate(entry,today);}catch(e){error='Revisá la fecha de la práctica.';}if(error){status.textContent=error;return;}
      entries.push(entry);pending.add(entry.id);persist();render();
      checks.forEach(c=>c.checked=false);made.value=attempts.value=success.value=next.value='';await sync();
    });retry.addEventListener('click',sync);
    render();
    try{
      const cloud=[];for(let from=0;;from+=1000){const {data,error}=await _supa.from('player_data').select('module,data').eq('player_id',PLAYER_ID).like('module',prefix+'%').order('module').range(from,from+999);if(error)throw error;cloud.push(...(data || []).filter(r=>r.module.startsWith(prefix)).map(r=>r.data));if(!data || data.length<1000)break;}
      // No pisar registros locales o creados mientras se cargaba la nube.
      const map=new Map(entries.map(e=>[e.id,e]));for(const e of cloud){if(e && e.id && Array.isArray(e.areas)){map.set(e.id,e);pending.delete(e.id);}}entries=[...map.values()];persist();render();status.textContent=pending.size ? 'Hay prácticas locales pendientes de guardar.' : '☁️ Historial cargado desde Supabase.';
      if(pending.size)await sync();
    }catch(e){status.textContent='No se pudo leer el historial de Supabase. Podés registrar la práctica; los registros anteriores no se reemplazan.';}
    try{
      const {data,error}=await _supa.from('player_data').select('data').eq('player_id',PLAYER_ID).eq('module','plan_mejora').maybeSingle();if(error)throw error;
      const hist=data?.data?.hist || {};const types={tl:'Tiros libres',pin:'Tiros en pintura',ratio:'Recuperos/pérdidas',reb:'Rebotes'};const rows=Object.entries(hist).flatMap(([key,values])=>Array.isArray(values) ? values.map(value=>({key,value})) : []);
      if(rows.length){node('summary',`📚 Registros del plan anterior (${rows.length})`,legacy).style.cssText='cursor:pointer;font-size:.72rem;color:var(--muted);margin-top:16px';
        rows.slice(0,20).forEach(({key,value})=>{const line=node('p',null,legacy);line.style.fontSize='.68rem';line.textContent=`${value.fecha || 'Sin fecha'} · ${types[key] || key} · `+(value.inn!=null && value.att!=null ? `${value.inn}/${value.att}` : key==='reb' ? `${value.reb} rebotes` : `${value.rec ?? '—'} recuperos / ${value.per ?? '—'} pérdidas`);});
        node('p','Histórico conservado sin cambios. Sus checks no tienen fecha y no se cuentan como prácticas de esta semana.',legacy).style.fontSize='.65rem';}
    }catch(e){node('p','El histórico del plan anterior no pudo consultarse. Se conserva sin cambios.',legacy).style.fontSize='.65rem';}
  }
  if(typeof module!=='undefined')module.exports={validate,weekly};
  if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',load);
})();
