/* Ajuste local previo al guardado; cancelar no cambia la foto existente. */
window.NextLevelPhotoCrop={async edit(file){
 if(!file.type.startsWith('image/'))throw Error('Elegí una imagen.');
 if(file.size>5*1024*1024)throw Error('Elegí una foto de hasta 5 MB.');
 const url=URL.createObjectURL(file),image=new Image();
 try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('No se pudo abrir la imagen.'));image.src=url;});}catch(e){URL.revokeObjectURL(url);throw e;}
 return new Promise(resolve=>{
 const dialog=document.createElement('dialog');dialog.style.cssText='padding:20px;border:1px solid #64748b;border-radius:16px;max-width:calc(100vw - 24px);width:370px;background:var(--card,#0b1528);color:var(--text,#e2e8f0);margin:auto';
 dialog.innerHTML='<h2 style="font-size:20px;margin-bottom:10px">Ajustar foto</h2><p style="font-size:14px;margin-bottom:12px">Arrastrá la foto para encuadrarla y acercala con el control.</p><canvas width="640" height="640" aria-label="Vista previa del recorte" style="width:100%;aspect-ratio:1;touch-action:none;cursor:grab;border-radius:16px;border:2px solid #f97316"></canvas><label style="display:block;margin:12px 0">Acercar <input type="range" min="1" max="4" step="0.01" value="1" style="width:100%"></label><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" data-action="reset">Centrar</button><button type="button" data-action="cancel">Cancelar</button><button type="button" data-action="save">Usar foto</button></div>';
 dialog.querySelectorAll('button').forEach(b=>b.style.cssText='padding:10px;border:1px solid #64748b;border-radius:8px;background:var(--card2,#102035);color:inherit;font:inherit;cursor:pointer');
 document.body.appendChild(dialog);const canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d'),range=dialog.querySelector('input');let zoom=1,x=0,y=0,drag=null,closed=false;
 const base=Math.max(640/image.width,640/image.height);
 function draw(){const scale=base*zoom,w=image.width*scale,h=image.height*scale;x=Math.max(-(w-640)/2,Math.min((w-640)/2,x));y=Math.max(-(h-640)/2,Math.min((h-640)/2,y));ctx.clearRect(0,0,640,640);ctx.drawImage(image,(640-w)/2+x,(640-h)/2+y,w,h);}
 function finish(value){if(closed)return;closed=true;dialog.close();dialog.remove();URL.revokeObjectURL(url);resolve(value);}
 canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag)return;const ratio=640/canvas.getBoundingClientRect().width;x+=(e.clientX-drag.x)*ratio;y+=(e.clientY-drag.y)*ratio;drag={x:e.clientX,y:e.clientY};draw();});canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
 range.oninput=()=>{zoom=Number(range.value);draw();};dialog.querySelector('[data-action="reset"]').onclick=()=>{zoom=1;x=y=0;range.value='1';draw();};dialog.querySelector('[data-action="cancel"]').onclick=()=>finish(null);dialog.addEventListener('cancel',e=>{e.preventDefault();finish(null);});dialog.querySelector('[data-action="save"]').onclick=()=>canvas.toBlob(blob=>{if(blob)finish(blob);},'image/jpeg',.85);draw();dialog.showModal();
 });
}};
