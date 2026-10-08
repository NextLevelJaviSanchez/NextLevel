/* Compilación de las dos plantillas conservadas. La identidad se hidrata sin HTML personal. */
(function(){'use strict';
function compileTemplate(html,context){
 if(!/^[0-9a-f-]{36}$/i.test(context.playerId) || !/^20\d{2}$/.test(context.season) || !['mini','u13'].includes(context.template))throw Error('Contexto de perfil inválido');
 html=html.replace(/<script[^>]*src="nextlevel_legacy_route.js"[^>]*><\/script>/g,'');
 const encoded=JSON.stringify(context).replace(/</g,String.fromCharCode(92)+'u003c');

 html=html.replace(/11111111-0000-0000-0000-000000000014/g,context.playerId).replace(/data-season="2026"/g,'data-season="'+context.season+'"');
 if(context.template==='u13')html=html.replace(/Mía G\. <span[^>]*>Sánchez<\/span>/g,'Jugador').replace(/Mía G\. Sánchez|Mía|MIA GERALDINE|GERALDINE MIA SANCHEZ/g,'Jugador').replace(/Dep\. Berazategui|Berazategui/g,'Club del jugador').replace(/U13 Femenino/g,'Categoría del jugador').replace(/Cadetes 2027/g,'próxima categoría').replace(/Shooting Guard \/ SF/g,'Posición por elegir');
 else html=html.replace(/Milo Sánchez/g,'Jugador').replace(/Foto de Milo/g,'Foto del jugador').replace(/Quilmes Atlético Club/g,'Club del jugador');
 if(context.template==='u13'){
  html=html.replace('<div class="card-ttl">🌟 Mi sueño</div>','<div class="card-ttl">🌟 Mi sueño</div><label>Mi sueño, con mis palabras<textarea id="pf-dream-text" maxlength="500" oninput="_pfObj=this.value;pfSave()"></textarea></label>');
  html=html.replace('<div class="card-ttl">📈 Mis áreas a mejorar</div>','<label>Mi objetivo de temporada<textarea id="pf-season-goal" maxlength="500" oninput="pfSave()"></textarea></label><p style="color:var(--muted)">Elegí una meta para trabajar con tu coach.</p><div class="card-ttl">📈 Mis áreas a mejorar</div>');
 }
 html=html.replace('</body>','<script src="nextlevel_profile_identity.js"><\/script></body>');
 html=html.replace('<head>','<head><script>window.NextLevelPlayer='+encoded+';<\/script><script src="nextlevel_profile_codec.js"><\/script><script src="nextlevel_sources.js"><\/script>');
 html=html.replace(/(src="(?:nextlevel_goal_catalog|nextlevel_gradual_goals|nextlevel_mini_goals|nextlevel_plan_progress|nextlevel_u11|nextlevel_coach_workspace)\.js)(?:\?[^\"]*)?"/g,'$1?v=20261007-goals-final"');
 return html;
}
const api={compileTemplate};if(typeof module!=='undefined')module.exports=api;if(typeof window!=='undefined')window.NextLevelTemplate=api;
})();
