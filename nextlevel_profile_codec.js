/* Compatibilidad de preferencias al pasar de Mini a U13 sin borrar el original. */
(function(){'use strict';
const map={birthDate:'fnac',contactEmail:'email',whatsapp:'wsp',height:'altura',weight:'peso',wingspan:'enverg',reach:'alcance',shoeSize:'calzado',coachNote:'nota'};
function toMature(mini){const result={...mini,seasonGoals:{...(mini.seasonGoal ? {[mini.seasonGoalSeason || '2026']:mini.seasonGoal} : {}),...mini.seasonGoals}};for(const [a,b] of Object.entries(map))if(mini[a]!=null)result[b]=mini[a];result.mano=({Derecha:'D',Izquierda:'I','Uso ambas manos':'A'})[mini.dominantHand] || '';result.areas=mini.technicalAreas || [];return result;}
function toMini(mature){const result={...mature,seasonGoals:{...(mature.seasonGoal ? {[mature.seasonGoalSeason || '2026']:mature.seasonGoal} : {}),...mature.seasonGoals}};for(const [a,b] of Object.entries(map))if(mature[b]!=null)result[a]=mature[b];result.dominantHand=({D:'Derecha',I:'Izquierda',A:'Uso ambas manos'})[mature.mano] || '';result.technicalAreas=mature.areas || [];return result;}
function seasonGoal(profile,season){return profile.seasonGoals?.[season] ?? ((profile.seasonGoalSeason || '2026')===season ? profile.seasonGoal || '' : '');}
const api={toMature,toMini,seasonGoal};if(typeof module!=='undefined')module.exports=api;if(typeof window!=='undefined')window.NextLevelProfileCodec=api;
})();