/* Importación oficial individual o de los jugadores elegidos por el coach. */
(function(){
 const selected=new Set();let running=false,host,list,button,season,output;
 const make=(tag,text,parent)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;parent.append(e);return e;};
 function mount(){if(host)return true;const anchor=document.getElementById('players-list');if(!anchor)return false;host=document.createElement('section');host.style.cssText='padding:16px;margin:16px 0;border:1px solid #35516c;border-radius:12px';anchor.before(host);
 make('h3','Actualizar datos CABB',host);make('p','Marcá un jugador o varios. Se importan sus actas oficiales para la temporada elegida.',host);
 const label=make('label','Temporada ',host);season=make('input',null,label);season.type='number';season.value=String(new Date().getFullYear());season.style.cssText='width:100px;padding:8px';
 list=make('div',null,host);list.style.cssText='display:grid;gap:8px;margin:14px 0';button=make('button','Actualizar seleccionados (0)',host);button.className='btn-sm';button.disabled=true;button.onclick=run;output=make('div',null,host);output.setAttribute('role','status');return true;}
 function render(players){if(!mount() || running)return;list.replaceChildren();for(const p of players){const label=make('label',null,list);label.style.cssText='display:flex;align-items:center;gap:10px';const input=make('input',null,label);input.type='checkbox';input.checked=selected.has(p.id);input.onchange=()=>{if(input.checked)selected.add(p.id);else selected.delete(p.id);update();};make('span',p.name+' · '+(p.category || 'Categoría pendiente'),label);}for(const id of selected)if(!players.some(p=>p.id===id))selected.delete(id);update();}
 function update(){button.disabled=running || !selected.size;button.textContent='Actualizar seleccionados ('+selected.size+')';}
 async function run(){if(running || !selected.size)return;if(!/^20\d{2}$/.test(season.value)){output.textContent='Revisá la temporada.';return;}const year=season.value,ids=[...selected];running=true;update();season.disabled=true;list.querySelectorAll('input').forEach(e=>e.disabled=true);output.replaceChildren();
 let done=0;try{for(const id of ids){const player=allPlayers.find(p=>p.id===id);const row=make('p',(player?.name || 'Jugador')+': consultando CABB…',output);try{
 const registration=await supa.from('player_data').select('data').eq('player_id',id).eq('module','player_season_v1:'+year).maybeSingle();if(registration.error)throw registration.error;if(!registration.data?.data?.tournaments?.length)throw Error('Falta vincular el equipo y torneo de esta temporada desde Nuevo jugador.');
 const {data,error}=await supa.functions.invoke('nextlevel-onboard',{body:{action:'sync',playerId:id,season:year}});if(error){let message=error.message;try{const body=await error.context?.json();message=body?.error || message;}catch(_){}throw Error(message);}if(data?.error)throw Error(data.error);row.textContent=(player?.name || 'Jugador')+': '+data.games+' partidos sincronizados.';done++;
 }catch(e){row.textContent=(player?.name || 'Jugador')+': pendiente — '+e.message;}}
 if(done)await doRefresh();make('p',done+' de '+ids.length+' jugadores actualizados.',output);
 }finally{running=false;season.disabled=false;render(allPlayers);}}
 window.NextLevelSync={render};
})();
