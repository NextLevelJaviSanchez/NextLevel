function applyPlayerIdentity(){
 const c=window.NextLevelPlayer;if(!c)return;document.title=c.name+' · '+c.category+' · NextLevel '+c.season;
 if(c.season!=='2026'){const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode;if(!['SCRIPT','STYLE'].includes(n.parentElement?.tagName))n.textContent=n.textContent.replace(/\b2026\b/g,c.season);}}
 document.querySelector('.tabs')?.setAttribute('aria-label','Secciones de '+c.name);
 const set=(selector,text)=>document.querySelectorAll(selector).forEach(el=>el.textContent=text);
 if(c.template==='mini'){set('header h1',c.name);set('header p',c.club+' · '+c.category+' · '+c.season);set('.badge',c.category+' · Formación y juego');set('#mini-avatar-placeholder',c.dorsal ?? '');const fields=document.querySelectorAll('#mini-perfil .card:nth-child(2) .grid > div > p');if(fields[0])fields[0].textContent='#'+(c.dorsal ?? '—');if(fields[1])fields[1].textContent=c.club;if(fields[2])fields[2].textContent=c.category+' · '+c.season;}
 else{set('.hero-name,.rpt-h1',c.name);set('.hero-sub',c.club+' · '+c.category+' · Temporada '+c.season);set('.hero-num > span',c.dorsal ?? '');document.querySelectorAll('[data-player-name]').forEach(el=>el.dataset.playerName=c.cabbName);
 const fields=document.querySelectorAll('#tab-perfil .profile-field .pf-val');if(fields[0])fields[0].textContent='#'+(c.dorsal ?? '—');if(fields[1])fields[1].textContent=c.club;if(fields[2])fields[2].textContent=(c.tournaments || []).map(t=>t.label).join(' + ') || c.primaryTournament;
 const cv=document.querySelector('#tab-perfil .ncaa-box');if(cv){const name=cv.querySelector('div[style*="font-size:1.15rem"]');if(name)name.textContent=c.name;}
 document.querySelectorAll('.kpi-lbl,.sc-lbl,.rpt-kpi-l,.dash-kpi-sub').forEach(el=>{if(el.textContent.includes('AFMB'))el.textContent=el.textContent.replace('AFMB',c.primaryTournament).replace(' + Fed','');});}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyPlayerIdentity);else applyPlayerIdentity();