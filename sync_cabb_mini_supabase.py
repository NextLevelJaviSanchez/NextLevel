"""Sync oficial de Milo U11. Requiere perfil previamente creado y SUPA_KEY autorizada."""
import argparse,json,os,urllib.request,uuid
from datetime import datetime,timezone
from pathlib import Path
from nextlevel_metrics import summarize_games

def build_rows(source,player_id):
 uuid.UUID(player_id)
 fixtures={str(g['IdPartidoNotificacion']):g for g in source['games']}
 rows=[]
 for act in source['boxscores']:
  if not act.get('milo'):continue
  if len(act['milo'])!=1:raise ValueError('Identidad ambigua')
  p=act['milo'][0];g=fixtures[act['id']]
  if p['nombre'].strip().upper()!='SANCHEZ, MILO BASTIAN':raise ValueError('Jugador incorrecto')
  if p['puntos']!=sum(p['canasta'+str(k)+'p']*k for k in (1,2,3)):raise ValueError('Tiros/puntos inconsistentes')
  home=g['NombreEquipoLocal']==source['club'];result=g['Resultados']
  score=int(result['ResultadoLocal' if home else 'ResultadoVisitante']);against=int(result['ResultadoVisitante' if home else 'ResultadoLocal'])
  row=dict(player_id=player_id,cabb_partido_id=act['id'],fecha=datetime.strptime(g['Fecha'],'%d/%m/%Y').date().isoformat(),rival=g['NombreEquipoVisitante' if home else 'NombreEquipoLocal'],torneo='FEBAMBA Mini',es_local=home,resultado_eq=f'{score}-{against}',ganado=score>against,pts=p['puntos'],minutos=p['milisegundos_jugados']/60000,faltas=p.get('faltascometidas'),val=p.get('valoracion'),source='cabb_api',synced_at=source['checked_at'])
  for label,k in [('tl',1),('t2',2),('t3',3)]:
   row[label+'_in']=p['canasta'+str(k)+'p'];row[label+'_att']=p['tiro'+str(k)+'p']
   if not 0<=row[label+'_in']<=row[label+'_att']:raise ValueError('Intentos inválidos')
  row['tc_in']=row['t2_in']+row['t3_in'];row['tc_att']=row['t2_att']+row['t3_att']
  # Cobertura Mini no comprobada: NULL en vez de atribuir ceros de rebotes/asistencias.
  row.update({k:None for k in ['reb_tot','reb_def','reb_of','ast','stl','blk','to_perdidas']})
  rows.append(row)
 if len({r['cabb_partido_id'] for r in rows})!=len(rows):raise ValueError('Actas duplicadas')
 return rows

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--dry-run',action='store_true');args=parser.parse_args()
 source=json.loads(Path('cabb_milo_u11_2026.json').read_text(encoding='utf8'))
 url=os.environ.get('SUPA_URL','https://yjcxwfkedxzkcspddghz.supabase.co');key=os.environ.get('SUPA_KEY')
 def request(path,payload=None):
  req=urllib.request.Request(url+'/rest/v1/'+path,data=json.dumps(payload).encode() if payload is not None else None,headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation'})
  with urllib.request.urlopen(req) as res:return json.load(res)
 if args.dry_run:
  rows=build_rows(source,'00000000-0000-0000-0000-000000000001');print(json.dumps({'games':len(rows),'stats':summarize_games(rows)},ensure_ascii=False));return
 if not key:raise SystemExit('Falta SUPA_KEY autorizada; no se escribió nada.')
 players=request('players?select=id,name&name=eq.Milo%20S%C3%A1nchez')
 if len(players)!=1:raise SystemExit('Crear/vincular un único perfil Milo Sánchez antes del sync.')
 pid=players[0]['id'];rows=build_rows(source,pid)
 stats=summarize_games(rows)
 season={k:stats[k] for k in ['pj','ppg','min_pg','val_pg','tl_pct']}
 season.update(player_id=pid,season=source['season'],tournament='FEBAMBA Mini',updated_at=source['checked_at'])
 request('game_log?on_conflict=player_id,cabb_partido_id',rows)
 request('stats_seasons?on_conflict=player_id,season,tournament',season)
 request('player_data?on_conflict=player_id,module',{'player_id':pid,'module':'cabb_mini_official_v1','data':source,'updated_at':source['checked_at']})
 verified=request('game_log?select=cabb_partido_id&player_id=eq.'+pid+'&torneo=eq.FEBAMBA%20Mini')
 if not set(r['cabb_partido_id'] for r in rows)<=set(r['cabb_partido_id'] for r in verified):raise RuntimeError('Verificación incompleta')
 print(f'Verificados {len(rows)} partidos oficiales de Milo; temporada y fuente Mini guardadas.')
if __name__=='__main__':main()
