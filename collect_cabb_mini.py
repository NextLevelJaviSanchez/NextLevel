"""Actas Mini para la prueba de Milo, sin escribir perfiles ni inventar conteos."""
import json
from datetime import datetime,timezone
from pathlib import Path
from cabb_app_api import CABBApiClient
from cabb_games import find_category,checked

def collect():
 c=CABBApiClient();cat=find_category(c,category='MINI MASCULINO',competition='FORMATIVAS 2026',federation='AREA METROPOLITANA')
 phases=checked(c.get_categoria_fases_grupos(cat['Id']),'phases');games={}
 for phase in phases.get('listaFasesGrupo',[]):
  for group in phase.get('Grupos',[]):
   fixture=checked(c.get_categoria_horarios_jornadas(cat['Id'],phase['IdFase'],group['IdGrupo']),'fixture')
   for game in fixture.get('partidos',[]):
    if game.get('Estado')=='Terminado' and 'QUILMES ATLETICO CLUB' in (game.get('NombreEquipoLocal'),game.get('NombreEquipoVisitante')):games[str(game['IdPartidoNotificacion'])]=game
  print(phase['NombreFase'],len(games),flush=True)
 out=json.loads(Path('cabb_milo_u11_2026.json').read_text(encoding='utf8'));out['games']=[];out['boxscores']=[]
 for stable,g in sorted(games.items(),key=lambda item:datetime.strptime(item[1]['Fecha'],'%d/%m/%Y')):
  out['games'].append({k:g.get(k) for k in ['IdPartidoNotificacion','Fecha','NombreEquipoLocal','NombreEquipoVisitante','Resultados','Estado']})
  raw=checked(c.get_partido_stats(g['IdPartido']),'stats');side='estadisticasequipolocal' if g['NombreEquipoLocal']=='QUILMES ATLETICO CLUB' else 'estadisticasequipovisitante'
  found=[{k:v for k,v in p.items() if k!='componente_id'} for p in raw.get('estadisticas',{}).get(side,[]) if p.get('nombre','').strip().upper()=='SANCHEZ, MILO BASTIAN']
  if len(found)>1:raise ValueError('Identidad de Milo ambigua')
  if found:
   p=found[0]
   if p.get('puntos') != p.get('canasta1p',0)+2*p.get('canasta2p',0)+3*p.get('canasta3p',0):raise ValueError('Puntos/tiros no reconciliados')
  out['boxscores'].append({'id':stable,'result':raw['resultado'],'milo':found});print('Acta',stable,'Milo',len(found),flush=True)
 out['checked_at']=datetime.now(timezone.utc).isoformat();Path('cabb_milo_u11_2026.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
if __name__=='__main__':collect()
