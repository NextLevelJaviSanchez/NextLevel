"""Extrae tiros oficiales y audita cada acta; no infiere una escala global."""
import json,time
from pathlib import Path
from cabb_app_api import CABBApiClient
from cabb_games import discover_games,checked

def collect():
    client=CABBApiClient(); result={'season':'2026','player_name':'SANCHEZ, MIA GERALDINE','games':[]}
    for tournament,team in [('AFMB','CLUB SOCIAL Y DEPORTIVO BERAZATEGUI'),('Federal CABB','DEP. BERAZATEGUI')]:
        _,games=discover_games(client,team,progress=lambda x:print(x,flush=True),tournament=tournament)
        for fixture in games:
            record={'id':str(fixture['IdPartidoNotificacion']),'tournament':tournament,'date':fixture['Fecha'],'shots':[]}
            try:
                box=checked(client.get_partido_stats(fixture['IdPartido']),'boxscore')
                home=fixture['NombreEquipoLocal']==team
                side='local' if home else 'visitante'
                players=box['estadisticas']['estadisticasequipo'+side]
                mia=[p for p in players if p.get('nombre','').strip().upper()==result['player_name']]
                if len(mia)!=1:raise ValueError('Sin fila individual inequívoca')
                mia=mia[0];record['expected_attempts']=int(mia['tiro2p'])+int(mia['tiro3p']);record['expected_made']=int(mia['canasta2p'])+int(mia['canasta3p'])
                pbp=checked(client.get_partido_pbp(fixture['IdPartido']),'PBP')
                events=pbp.get('envivo',{}).get('historialacciones')
                if not isinstance(events,list):raise ValueError('PBP sin lista de acciones')
                shots={}
                for e in events:
                    if str(e.get('eliminado')).lower()=='true':continue
                    if str(e.get('equipo_id'))!=str(box['partido']['id'+side]) or str(e.get('dorsal'))!=str(mia['dorsal']):continue
                    if e.get('accion_tipo') not in ('CANASTA-2P','CANASTA-3P','TIRO2-FALLADO','TIRO3-FALLADO'):continue
                    key=str(e['autoincremental_id'])
                    shot={k:e.get(k) for k in ('autoincremental_id','accion_tipo','numero_periodo','tiempo_partido','posicion_x','posicion_y','zona')}
                    if key in shots and shots[key]!=shot:raise ValueError('Evento duplicado contradictorio')
                    shots[key]=shot
                record['shots']=list(shots.values());record['matched']=len(shots)==record['expected_attempts'] and sum(s['accion_tipo'].startswith('CANASTA') for s in shots.values())==record['expected_made']
                record['coordinate_count']=sum(s.get('posicion_x') not in (None,'') and s.get('posicion_y') not in (None,'') and (float(s['posicion_x'])!=0 or float(s['posicion_y'])!=0) for s in shots.values())
            except Exception as e:record['error']=str(e);record['matched']=False
            result['games'].append(record);print(f"{tournament} {record['id']}: {len(record['shots'])} tiros; reconciliado={record['matched']}",flush=True);time.sleep(.15)
    Path('cabb_season_shots_2026.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print('AUDIT',json.dumps({'games':len(result['games']),'reconciled':sum(g['matched'] for g in result['games']),'shots':sum(len(g['shots']) for g in result['games'])}))
if __name__=='__main__':collect()
