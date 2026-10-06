/* Conversación compartida y seguimiento. Conserva las tablas de mensajes anteriores. */
(function(){
  'use strict';
  const prefix='coach_conversation_v1:',progressPrefix='plan_progress_v1:';
  const mounts=new WeakMap();
  const roles={coach:'Coach',player:'Jugadora',family:'Familia / representante'};
  function makeMessage({body,role,name,practiceId},id,now){
    body=String(body || '').trim();name=String(name || '').trim();
    if(!body || body.length>1000)throw Error('Escribí un mensaje de entre 1 y 1000 caracteres.');
    if(!roles[role])throw Error('Elegí quién escribe.');
    if(name.length>80)throw Error('Usá hasta 80 caracteres para el nombre.');
    return {id,body,authorRole:role,authorName:name,practiceId:practiceId || null,createdAt:now,type:'coach_conversation'};
  }
  function timeline(newRows,legacyMessages,legacyReplies){
    const parentIds=new Set(legacyMessages.map(m=>m.id));
    const rows=[...newRows.filter(m=>m && m.id && roles[m.authorRole] && typeof m.body==='string'),
      ...legacyMessages.map(m=>({id:'legacy-message:'+m.id,body:m.body,authorRole:'coach',createdAt:m.created_at,legacy:true})),
      ...legacyReplies.filter(r=>parentIds.has(r.message_id)).map(r=>({id:'legacy-reply:'+r.id,body:r.body,authorRole:'family',createdAt:r.created_at,legacy:true,parentId:'legacy-message:'+r.message_id}))];
    return [...new Map(rows.map(r=>[r.id,r])).values()].sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)) || a.id.localeCompare(b.id));
  }
  async function readAll(client,table,build){
    const rows=[];for(let from=0;;from+=500){const {data,error}=await build(client.from(table).select('*')).range(from,from+499);if(error)throw error;rows.push(...(data || []));if(!data || data.length<500)break;}return rows;
  }
  async function mount({host,client,playerId,mode}){
    if(!host)return;
    const token={};mounts.set(host,token);const active=()=>mounts.get(host)===token;
    host.replaceChildren();
    const node=(tag,text,parent)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(parent)parent.append(n);return n;};
    const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const status=node('p','Cargando conversación y prácticas…',host);status.setAttribute('role','status');status.style.cssText='font-size:.72rem;color:#94a3b8';
    const refresh=node('button','Actualizar conversación',host);refresh.type='button';refresh.style.cssText='padding:8px 12px;border-radius:8px;background:#142338;color:#38bdf8;border:1px solid #264765;cursor:pointer';
    const coachArea=node('div',null,host),messages=node('div',null,host);
    const form=node('form',null,host);form.style.cssText='display:grid;gap:10px;padding-top:12px';
    const field=(label,tag,parent=form)=>{const wrap=node('label',label,parent);wrap.style.cssText='display:grid;gap:6px;font-size:.72rem;color:#cbd5e1';const input=node(tag,null,wrap);input.style.cssText='padding:10px;background:#102035;color:#e2e8f0;border:1px solid #2b3d54;border-radius:8px;font:inherit';return input;};
    let role,name;
    if(mode==='player'){
      role=field('¿Quién escribe?','select');for(const [value,label] of [['player','Jugadora'],['family','Padre / madre / representante']]){const option=node('option',label,role);option.value=value;}
      name=field('Nombre (opcional)','input');name.maxLength=80;
    }
    const context=field('Sobre una práctica','select');
    const body=field(mode==='coach' ? '💬 Devolución o mensaje para la jugadora/familia' : '💬 Mensaje para el coach','textarea');body.maxLength=1000;body.rows=3;body.required=true;
    const send=node('button',mode==='coach' ? 'Enviar devolución' : 'Enviar al coach',form);send.type='submit';send.style.cssText='padding:11px;border-radius:8px;background:#183e61;color:#e2e8f0;border:1px solid #38bdf8;cursor:pointer;font-weight:700';
    const cacheKey='nl_coach_draft_'+playerId+'_'+mode;
    let evaluationDraft=null,draftPracticeId='';
    try{const saved=JSON.parse(localStorage.getItem(cacheKey) || '{}');body.value=saved.body || '';if(role)role.value=saved.role || 'player';if(name)name.value=saved.name || '';evaluationDraft=saved.evaluationDraft || null;draftPracticeId=saved.practiceId || '';}catch(e){}
    const remember=()=>{try{localStorage.setItem(cacheKey,JSON.stringify({body:body.value,role:role?.value,name:name?.value,evaluationDraft,practiceId:context.value || draftPracticeId}));}catch(e){}};
    body.addEventListener('input',remember);role?.addEventListener('change',remember);name?.addEventListener('input',remember);context.addEventListener('change',()=>{draftPracticeId=context.value;remember();});
    let entries=[],conversation=[],evaluation={},evaluationLoaded=false,busy=false,loading=false;
    const dateLabel=value=>{const date=new Date(value);return Number.isFinite(date.getTime()) ? date.toLocaleString('es-AR',{timeZone:'America/Buenos_Aires'}) : value || 'Sin fecha';};
    const paragraph=(parent,text)=>{const p=node('p',text,parent);p.style.cssText='font-size:.74rem;line-height:1.6;white-space:pre-wrap;margin:7px 0';return p;};
    const render=()=>{
      const selected=context.value || draftPracticeId;context.replaceChildren();node('option','Consulta general',context).value='';
      entries.slice(0,30).forEach(e=>{const option=node('option',e.date+' · '+e.areas.join(' / '),context);option.value=e.id;});if(entries.some(e=>e.id===selected))context.value=selected;
      messages.replaceChildren();node('h3','💬 Conversación',messages).style.cssText='color:#38bdf8;font-size:.85rem;margin-top:18px';
      if(!conversation.length)paragraph(messages,'Todavía no hay mensajes. La jugadora o su familia pueden iniciar una consulta.');
      const visible=conversation.slice(-50);
      if(conversation.length>50)paragraph(messages,`Se muestran los últimos 50 de ${conversation.length} mensajes.`);
      visible.forEach(m=>{
        const bubble=node('section',null,messages);bubble.style.cssText='background:'+(m.authorRole==='coach'?'#10283a':'#172238')+';padding:12px;border-radius:10px;border-left:3px solid '+(m.authorRole==='coach'?'#38bdf8':'#c4b5fd')+';margin:10px 0';
        node('strong',roles[m.authorRole]+(m.authorName ? ' · '+m.authorName : ''),bubble).style.cssText='color:'+(m.authorRole==='coach'?'#38bdf8':'#c4b5fd')+';font-size:.74rem';
        const practice=entries.find(e=>e.id===m.practiceId);
        if(m.practiceId)node('small',practice ? ' · Práctica '+practice.date+' ('+practice.areas.join(' / ')+')' : ' · Sobre una práctica registrada',bubble).style.color='#94a3b8';
        if(m.parentId){const parent=conversation.find(e=>e.id===m.parentId);if(parent)paragraph(bubble,'En respuesta a: '+parent.body.slice(0,90)).style.color='#94a3b8';}
        paragraph(bubble,m.body);node('small',dateLabel(m.createdAt)+(m.legacy ? ' · Historial anterior' : ''),bubble).style.color='#94a3b8';
      });
      if(mode!=='coach')return;
      coachArea.replaceChildren();node('h3','🌱 Prácticas de la jugadora',coachArea).style.cssText='font-size:.9rem;color:#4ade80;margin-top:20px';
      if(!entries.length)paragraph(coachArea,'No hay prácticas nuevas disponibles.');
      entries.slice(0,10).forEach(e=>{
        const card=node('section',null,coachArea);card.style.cssText='padding:12px;background:#142338;border-radius:10px;margin:10px 0';node('strong',e.date+' · '+e.areas.join(' / '),card).style.color='#4ade80';
        if(e.shots)paragraph(card,`${e.shots.type}: ${e.shots.made}/${e.shots.attempts} en entrenamiento`);
        if(e.success)paragraph(card,'⭐ '+e.success);if(e.next)paragraph(card,'🌱 '+e.next);
        const feedback=node('button','Dejar una devolución sobre esta práctica',card);feedback.type='button';feedback.style.cssText='padding:8px;border-radius:8px;color:#38bdf8;background:#102035;border:1px solid #264765;cursor:pointer';feedback.addEventListener('click',()=>{context.value=e.id;draftPracticeId=e.id;remember();body.focus();});
      });
      const details=node('details',null,coachArea);node('summary','🧑‍🏫 Evaluación general de la jugadora',details).style.cssText='cursor:pointer;color:#38bdf8;font-size:.85rem;margin:15px 0';
      const evaluationForm=node('form',null,details);evaluationForm.style.cssText='display:grid;gap:10px';const fields={};
      for(const [key,label] of [['obs','Observaciones'],['fortalezas','Fortalezas observadas'],['areas','Aspectos para trabajar'],['prioridad','Próxima acción acordada']]){fields[key]=field(label,'textarea',evaluationForm);fields[key].rows=2;fields[key].maxLength=2000;fields[key].value=evaluationDraft?.[key] ?? evaluation[key] ?? '';fields[key].addEventListener('input',()=>{evaluationDraft=Object.fromEntries(Object.entries(fields).map(([k,input])=>[k,input.value]));remember();});}
      const evalStatus=node('p',evaluation.fecha ? 'Última evaluación: '+evaluation.fecha : 'Sin evaluación general guardada.',evaluationForm);evalStatus.setAttribute('role','status');evalStatus.style.fontSize='.7rem';
      const saveEval=node('button','Guardar evaluación en el perfil',evaluationForm);saveEval.type='submit';saveEval.disabled=!evaluationLoaded;saveEval.style.cssText=send.style.cssText;
      evaluationForm.addEventListener('submit',async event=>{
        event.preventDefault();if(!evaluationLoaded)return;
        const values=Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value.trim()]));
        if(!Object.values(values).some(Boolean)){evalStatus.textContent='Completá al menos una observación.';return;}
        saveEval.disabled=true;
        try{await requireSession();const ev={...evaluation,...values,fecha:today()};const {error}=await client.from('player_data').upsert({player_id:playerId,module:'coach_eval_v1',data:ev,updated_at:new Date().toISOString()},{onConflict:'player_id,module'});if(error)throw error;evaluation=ev;evaluationDraft=null;remember();evalStatus.textContent='✅ Evaluación guardada. La jugadora/familia la verá en Análisis Coach.';}
        catch(e){evalStatus.textContent='No se pudo guardar la evaluación: '+e.message;}finally{saveEval.disabled=false;}
      });
    };
    const requireSession=async()=>{const {data,error}=await client.auth.getUser();if(error || !data?.user)throw Error('Iniciá sesión para enviar o guardar una devolución.');};
    const reload=async()=>{
      if(loading || busy)return;loading=true;refresh.disabled=true;
      try{
        const result=await Promise.allSettled([
          readAll(client,'player_data',q=>q.eq('player_id',playerId).like('module',prefix+'%').order('module')),
          readAll(client,'player_data',q=>q.eq('player_id',playerId).like('module',progressPrefix+'%').order('module')),
          client.from('player_data').select('data').eq('player_id',playerId).eq('module','coach_eval_v1').maybeSingle(),
          readAll(client,'messages',q=>q.eq('player_id',playerId).order('created_at')),
          readAll(client,'message_replies',q=>q.eq('player_id',playerId).order('created_at'))
        ]);
        if(!active())return;
        if(result[0].status==='rejected' || result[1].status==='rejected')throw Error('No se pudo cargar la conversación o el progreso.');
        entries=result[1].value.filter(r=>r.module.startsWith(progressPrefix) && r.data?.id && Array.isArray(r.data.areas)).map(r=>r.data).sort((a,b)=>String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)));
        evaluationLoaded=result[2].status==='fulfilled' && !result[2].value.error;
        if(evaluationLoaded)evaluation=result[2].value.data?.data || {};
        const olderMessages=result[3].status==='fulfilled' ? result[3].value : [],olderReplies=result[4].status==='fulfilled' ? result[4].value : [];
        conversation=timeline(result[0].value.filter(r=>r.module.startsWith(prefix)).map(r=>r.data),olderMessages,olderReplies);render();
        status.textContent=result[3].status==='rejected' || result[4].status==='rejected' ? 'Conversación cargada. Parte del historial anterior no pudo consultarse.' : '☁️ Conversación y progreso cargados desde Supabase.';
        if(mode==='coach' && !evaluationLoaded)status.textContent+=' No se pudo leer la evaluación; su edición queda pendiente.';
        if(mode==='player' && evaluationLoaded && typeof loadCoachEval==='function')await loadCoachEval();
      }catch(e){if(active())status.textContent=e.message+' Usá Actualizar para reintentar.';}
      finally{loading=false;if(active())refresh.disabled=false;}
    };
    refresh.addEventListener('click',reload);
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(busy)return;
      let message;
      try{message=makeMessage({body:body.value,role:mode==='coach'?'coach':role.value,name:name?.value,practiceId:context.value},crypto.randomUUID(),new Date().toISOString());}catch(e){status.textContent=e.message;return;}
      busy=true;send.disabled=true;refresh.disabled=true;remember();
      try{
        await requireSession();const {error}=await client.from('player_data').upsert({player_id:playerId,module:prefix+message.id,data:message,updated_at:message.createdAt},{onConflict:'player_id,module'});if(error)throw error;
        if(!active())return;conversation.push(message);body.value='';remember();render();status.textContent='✅ Mensaje enviado y guardado en Supabase.';
      }catch(e){if(active())status.textContent='No se pudo enviar: '+e.message+' El texto sigue en el formulario para reintentar.';}
      finally{busy=false;if(active()){send.disabled=false;refresh.disabled=false;}}
    });
    await reload();
  }
  if(typeof module!=='undefined')module.exports={makeMessage,timeline};
  if(typeof window!=='undefined')window.NextLevelCoachWorkspace={mount};
})();
