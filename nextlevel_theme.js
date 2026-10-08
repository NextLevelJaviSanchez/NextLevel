/* Elección local de apariencia: no modifica datos del jugador. */
(function(){
 'use strict';
 var key='nextlevel_theme_v1';
 function read(){try{return localStorage.getItem(key)==='light'?'light':'dark';}catch(e){return 'dark';}}
 function apply(theme){document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;var button=document.getElementById('nextlevel-theme-toggle');if(button){button.textContent=theme==='light'?'🌙 Modo oscuro':'☀️ Modo claro';button.setAttribute('aria-label',theme==='light'?'Activar modo oscuro':'Activar modo claro');button.setAttribute('aria-pressed',String(theme==='light'));}}
 apply(read());
 function mount(){if(document.getElementById('nextlevel-theme-toggle'))return;var bar=document.createElement('div');bar.className='nextlevel-theme-bar';var button=document.createElement('button');button.type='button';button.id='nextlevel-theme-toggle';button.className='nextlevel-theme-toggle';button.addEventListener('click',function(){var theme=document.documentElement.dataset.theme==='light'?'dark':'light';try{localStorage.setItem(key,theme);}catch(e){}apply(theme);});bar.appendChild(button);document.body.prepend(bar);apply(read());}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 window.addEventListener('storage',function(event){if(event.key===key)apply(read());});
})();
