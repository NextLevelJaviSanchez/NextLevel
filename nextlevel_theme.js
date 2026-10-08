/* Elección local de apariencia: no modifica datos del jugador. */
(function(){
 'use strict';
 var key='nextlevel_theme_v1';
 function read(){try{return localStorage.getItem(key)==='light'?'light':'dark';}catch(e){return 'dark';}}
 function apply(theme){document.querySelectorAll('img').forEach(function(img){var src=img.getAttribute('src')||'';if(/(^|\/)logo_nextlevel(?:_dark)?\.svg(?:\?|$)/.test(src)){var next=src.replace(/logo_nextlevel(?:_dark)?\.svg(?:\?.*)?$/,theme==='light'?'logo_nextlevel.svg?v=20261008-fit':'logo_nextlevel_dark.svg?v=20261008');if(src!==next)img.setAttribute('src',next);}});document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;var button=document.getElementById('nextlevel-theme-toggle');if(button){button.textContent=window.matchMedia('(max-width:640px)').matches?(theme==='light'?'🌙 Oscuro':'☀️ Claro'):(theme==='light'?'🌙 Modo oscuro':'☀️ Modo claro');button.setAttribute('aria-label',theme==='light'?'Activar modo oscuro':'Activar modo claro');button.setAttribute('aria-pressed',String(theme==='light'));}}
 apply(read());
 function mount(){if(document.getElementById('nextlevel-theme-toggle'))return;var bar=document.createElement('div');bar.className='nextlevel-theme-bar';var button=document.createElement('button');button.type='button';button.id='nextlevel-theme-toggle';button.className='nextlevel-theme-toggle';button.addEventListener('click',function(){var theme=document.documentElement.dataset.theme==='light'?'dark':'light';try{localStorage.setItem(key,theme);}catch(e){}apply(theme);});bar.appendChild(button);
 var avatar=document.querySelector('.nl-logo,.mini-brand');
 if(avatar){
  var column=document.querySelector('.nl-badge');if(!column){column=document.createElement('div');avatar.parentNode.insertBefore(column,avatar);column.appendChild(avatar);}column.classList.add('nextlevel-brand-actions');
  var logout=document.getElementById('profile-top-logout')||document.getElementById('mini-logout');
  if(!logout){logout=document.createElement('button');logout.type='button';logout.textContent='Salir ↗';logout.setAttribute('aria-label','Cerrar sesión');logout.addEventListener('click',function(){if(typeof window.doLogout==='function')window.doLogout();});}
  logout.classList.add('nextlevel-profile-logout');column.appendChild(logout);column.appendChild(bar);
 }else document.body.prepend(bar);
 apply(read());}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 window.addEventListener('resize',function(){apply(document.documentElement.dataset.theme);});
 window.addEventListener('storage',function(event){if(event.key===key)apply(read());});
})();
