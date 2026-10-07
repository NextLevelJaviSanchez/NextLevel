/* Evolución y hitos Mini: muestras oficiales, sin inferir habilidades. */
(function(){
'use strict';
const METRICS={puntos:{label:'Puntos',color:'#fb923c'},minutos:{label:'Minutos',color:'#7dd3fc',decimals:1},faltascometidas:{label:'Faltas cometidas',color:'#c4b5fd'},faltasrecibidas:{label:'Faltas recibidas',color:'#00E676'},valoracion:{label:'Valoración CABB',color:'#FFD740'}};
function value(row,key){const raw=row[key];if(raw==null || raw==='' || typeof raw==='boolean' || !Number.isFinite(Number(raw)))return null;const n=Number(raw);return key==='valoracion' || n>=0?n:null;}
function mean(rows,key){const vals=rows.map(r=>value(r,key));return vals.length && vals.every(v=>v!=null)?vals.reduce((a,b)=>a+b,0)/vals.length:null;}
function milestone(rows,key){const known=rows.filter(r=>value(r,key)!=null);if(!known.length)return {max:null,games:[],coverage:0};const max=Math.max(...known.map(r=>value(r,key)));return {max,games:known.filter(r=>value(r,key)===max),coverage:known.length};}
function blocks(rows,key){return {season:mean(rows,key),recent:rows.length>=5?mean(rows.slice(-5),key):null,previous:rows.length>=10?mean(rows.slice(-10,-5),key):null};}
function render(records,games,source){
const $=id=>document.getElementById(id),node=(tag,text,parent)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(parent)parent.append(n);return n;};
const svgNode=(tag,attrs,parent)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(parent)parent.append(n);return n;};
const fixture=new Map(games.map(g=>[String(g.IdPartidoNotificacion),g]));
function context(r){const g=fixture.get(r.id),home=g?.NombreEquipoLocal===source.club;return r.date+' · vs '+(g?g[home?'NombreEquipoVisitante':'NombreEquipoLocal']:'Rival sin datos');}
function format(v,key){return v==null?'Sin datos':v.toFixed(METRICS[key].decimals || 0);}
function evolution(){
const key=$('mini-evolution-metric').value,metric=METRICS[key],visible=$('mini-evolution-range').value==='all'?records:records.slice(-10),chart=$('mini-evolution-chart');chart.replaceChildren();
const known=visible.map(r=>value(r,key)),values=known.filter(v=>v!=null),width=Math.max(620,visible.length*56),height=300,left=48,right=24,top=30,bottom=52;
const min=Math.min(0,...values),rawmax=Math.max(1,...values),step=Math.max(1,Math.ceil((rawmax-min)/5)),max=min+step*5;
const x=i=>left+(width-left-right)*i/Math.max(1,visible.length-1),y=v=>top+(height-top-bottom)*(max-v)/(max-min);
const scroll=node('div',null,chart);scroll.className='mini-chart-scroll';scroll.tabIndex=0;scroll.setAttribute('aria-label','Gráfico: desplazá horizontalmente para ver todos los partidos');
const svg=svgNode('svg',{viewBox:`0 0 ${width} ${height}`,width,height,role:'group','aria-label':metric.label+' por partido'},scroll);
for(let tick=0;tick<=5;tick++){const v=min+tick*step;svgNode('line',{x1:left,y1:y(v),x2:width-right,y2:y(v),stroke:'#334155','stroke-width':1},svg);const t=svgNode('text',{x:left-9,y:y(v)+5,'text-anchor':'end',fill:'#cbd5e1','font-size':14},svg);t.textContent=String(v);}
let path='',open=false;known.forEach((v,i)=>{if(v==null){open=false;return;}path+=(open?' L ':' M ')+x(i)+' '+y(v);open=true;});svgNode('path',{d:path,fill:'none',stroke:metric.color,'stroke-width':3},svg);
const detail=$('mini-evolution-detail');function showDetail(r){detail.replaceChildren();node('strong',context(r),detail);node('p',Object.keys(METRICS).map(k=>METRICS[k].label+': '+format(value(r,k),k)).join(' · '),detail);}
visible.forEach((r,i)=>{const v=known[i];const date=svgNode('text',{x:x(i),y:height-22,'text-anchor':'middle',fill:'#cbd5e1','font-size':14},svg);date.textContent=r.date.slice(0,5);if(v==null)return;
 const label=svgNode('text',{x:x(i),y:y(v)-12,'text-anchor':'middle',fill:metric.color,'font-size':15,'font-weight':700},svg);label.textContent=format(v,key);
 const dot=svgNode('circle',{cx:x(i),cy:y(v),r:7,fill:metric.color,stroke:'#0b1528','stroke-width':2,tabindex:0,role:'button','aria-label':context(r)+', '+metric.label+': '+format(v,key)},svg);const title=svgNode('title',{},dot);title.textContent=dot.getAttribute('aria-label');dot.addEventListener('click',()=>showDetail(r));dot.addEventListener('focus',()=>showDetail(r));dot.addEventListener('keydown',e=>{if(e.key==='Enter' || e.key===' '){e.preventDefault();showDetail(r);}});
});if(visible.length)showDetail(visible.at(-1));else detail.textContent='Todavía no hay partidos para mostrar.';
const summary=$('mini-evolution-summary');summary.replaceChildren();const comparisons=blocks(records,key);const grid=node('div',null,summary);grid.className='grid';for(const [label,v] of [['Temporada',comparisons.season],['Cinco anteriores',comparisons.previous],['Últimos cinco',comparisons.recent]]){const card=node('div',null,grid);card.className='tip';node('small',label,card);node('p',v==null?'Muestra insuficiente / incompleta':v.toFixed(1),card).className='metric-value';}
node('p',`${values.length}/${visible.length} registros visibles · ${records.length} actas en la temporada. Las comparaciones usan promedios de bloques de cinco partidos, sin completar datos ausentes.`,summary).className='muted';
node('p',key==='faltascometidas'?'Las faltas cometidas se revisan con los minutos y las situaciones de juego. Una subida o bajada por sí sola no indica mejora.':key==='faltasrecibidas'?'Las faltas recibidas describen lo registrado en cada partido; conversá con el coach en qué jugadas aparecieron.':'Los números muestran tu participación. Revisalos con el coach junto con lo que aprendiste y el contexto de cada partido.',summary).className='muted';
}
$('mini-evolution-metric').onchange=evolution;$('mini-evolution-range').onchange=evolution;evolution();
const host=$('mini-season-milestones');host.replaceChildren();$('mini-milestones-source').textContent=`Cálculo NextLevel sobre datos CABB · temporada ${source.season} · ${records.length} actas individuales · FeBAMBA Mini.`;
for(const [key,title,icon] of [['puntos','Máximo de puntos','🏀'],['valoracion','Máxima valoración CABB','⭐'],['minutos','Mayor tiempo de juego','⏱️'],['faltasrecibidas','Máximo de faltas recibidas','🛡️']]){
 const hit=milestone(records,key),card=node('section',null,host);card.className='tip';node('h3',icon+' '+title,card);node('p',format(hit.max,key)+(key==='minutos' && hit.max!=null?' min':''),card).className='metric-value';node('small',`Datos disponibles: ${hit.coverage}/${records.length} actas`,card);
 if(hit.games.length){const shown=hit.games.length<=3?hit.games:hit.games.slice(-3);if(hit.games.length>3)node('p',`Este máximo aparece en ${hit.games.length} partidos. Últimos tres:`,card);shown.forEach(r=>node('p',context(r),card));if(hit.games.length>3){const all=node('details',null,card);node('summary','Ver todos los partidos con este máximo',all);hit.games.forEach(r=>node('p',context(r),all));}}
}
const participation=node('section',null,host);participation.className='tip';node('h3','🤝 Participación registrada',participation);node('p',String(records.length)+' partidos',participation).className='metric-value';node('p','Cada partido es una oportunidad para probar lo trabajado. Las actas muestran tu participación; las experiencias se siguen en Mi Plan.',participation);
const coverage=node('section',null,host);coverage.className='tip';node('h3','📋 Dobles-dobles',coverage);node('p','Sin verificación',coverage);node('p','No confirmamos la cobertura de rebotes, asistencias, recuperos y tapones en Mini. No usamos sus ceros para afirmar logros ni ausencia de logros.',coverage).className='muted';
}
const api={value,mean,milestone,blocks,render};if(typeof module!=='undefined')module.exports=api;if(typeof window!=='undefined')window.NextLevelMiniEvolution=api;
})();
