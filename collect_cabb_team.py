"""Snapshot de actas de todo el plantel, sin limitarse a perfiles NextLevel."""
import json,time
from pathlib import Path
from datetime import datetime,timezone
from cabb_app_api import CABBApiClient
from cabb_games import discover_games,checked,number
FIELDS={'val':'valoracion','pts':'puntos','reb_tot':'rebotes','ast':'asistencias','stl':'recuperaciones','blk':'taponescometidos','fouls_received':'faltasrecibidas','to_perdidas':'perdidas','faltas':'faltascometidas'}
def collect():
    client=CABBApiClient();out={'season':'2026','source':'cabb_api','games':[]}
    for tournament,team in [('AFMB','CLUB SOCIAL Y DEPORTIVO BERAZATEGUI'),('Federal CABB','DEP. BERAZATEGUI')]:
        _,games=discover_games(client,team,tournament=tournament)
        for fixture in games:
            item={'id':str(fixture['IdPartidoNotificacion']),'tournament':tournament,'date':datetime.strptime(fixture['Fecha'],'%d/%m/%Y').date().isoformat(),'players':[]}
            try:
                box=checked(client.get_partido_stats(fixture['IdPartido']),'boxscore');home=fixture['NombreEquipoLocal']==team
                players=box['estadisticas']['estadisticasequipolocal' if home else 'estadisticasequipovisitante']
                if not isinstance(players,list) or not players:raise ValueError('Sin filas de plantel')
                for row in players:
                    name=row.get('nombre','').strip()
                    if not name or name.upper()=='TOTALES':continue
                    ms=number(row.get('milisegundos_jugados'))
                    # No contar suplentes que no entraron; sin tiempo no se infiere PJ.
                    if ms is None or ms<=0:continue
                    stats={key:number(row.get(field)) for key,field in FIELDS.items()}
                    item['players'].append(dict(name=name,dorsal=str(row.get('dorsal','')),**stats))
                item['available']=True
            except Exception as e:item['available']=False;item['error']=str(e)
            out['games'].append(item);print(tournament,item['id'],len(item['players']),flush=True);time.sleep(.15)
    if any(not g['available'] for g in out['games']):raise RuntimeError('Snapshot incompleto: no reemplaza el archivo anterior')
    out['generated_at']=datetime.now(timezone.utc).isoformat()
    Path('cabb_team_2026.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
if __name__=='__main__':collect()
