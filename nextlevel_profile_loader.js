/* Las páginas originales son las dos plantillas: no se copia HTML por jugador. */
(async function(){'use strict';
try{
 const client=supabase.createClient(NextLevelAppConfig.url,NextLevelAppConfig.anonKey),params=new URLSearchParams(location.search);
 const {data:auth,error}=await client.auth.getUser();if(error || !auth?.user)throw Error('Entrá con tu cuenta para abrir el perfil.');
 const requested=params.get('player'),season=params.get('season') || String(new Date().getFullYear());if(!/^20\d{2}$/.test(season))throw Error('Temporada inválida.');
 let query=client.from('players').select('*');if(requested)query=query.eq('id',requested);else query=query.eq('user_id',auth.user.id);
 const {data:players,error:playerError}=await query;if(playerError)throw playerError;if(players?.length!==1)throw Error('No se encontró un único perfil accesible.');
 const p=players[0];if(p.user_id!==auth.user.id && auth.user.email!=='coach@nextlevel.com')throw Error('Esta cuenta no corresponde al jugador.');
 const {data:row,error:registrationError}=await client.from('player_data').select('data').eq('player_id',p.id).eq('module','player_season_v1:'+season).maybeSingle();if(registrationError)throw registrationError;
 const context=NextLevelPlayerContext.contextFor(p,season,row?.data || {});
 // Preserve known identities and verified snapshot files for legacy profiles only.
 if(context.legacy){context.cabbName=p.id==='11111111-0000-0000-0000-000000000014'?'SANCHEZ, MIA GERALDINE':p.id==='e814cad8-7be8-45dd-8fdd-2d5dcc32bc96'?'SANCHEZ, MILO BASTIAN':p.name;context.legacySnapshots=p.id==='11111111-0000-0000-0000-000000000014' || p.id==='e814cad8-7be8-45dd-8fdd-2d5dcc32bc96';}
 context.legacyTeam=context.legacy && season==='2026' && context.template==='u13' && /BERAZATEGUI/i.test(context.club) && /U13|INFANTILES/i.test(context.category);
 const path=context.template==='mini'?'perfil_milo_sanchez_u11.html':'perfil_mia_sanchez_14.html';const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw Error('No se pudo cargar la plantilla.');
 const html=NextLevelTemplate.compileTemplate(await response.text(),context);
 document.open();document.write(html);document.close();
}catch(e){document.getElementById('profile-loader-status').textContent=e.message;}
})();
