"""Actualiza registros player_season_v1 sin agregar nombres al código."""
import json,os,urllib.request,urllib.parse,urllib.error,datetime

def run():
 url=os.environ.get('SUPA_URL','https://yjcxwfkedxzkcspddghz.supabase.co');key=os.environ.get('SUPA_SERVICE_ROLE_KEY')
 if not key:raise SystemExit('Configurar SUPA_SERVICE_ROLE_KEY como secreto del workflow.')
 if url!='https://yjcxwfkedxzkcspddghz.supabase.co':raise SystemExit('Destino de sincronización no autorizado.')
 headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'}
 season=os.environ.get('SYNC_SEASON') or str(datetime.datetime.now(datetime.timezone.utc).year)
 records=[]
 for offset in range(0,100000,500):
  path='/rest/v1/player_data?select=player_id,module,is_demo:data-%3E%3EisDemo&module=eq.player_season_v1:'+season+'&order=player_id&limit=500&offset='+str(offset)
  with urllib.request.urlopen(urllib.request.Request(url+path,headers=headers)) as response:page=json.load(response)
  records.extend(row for row in page if str(row.get('is_demo','')).lower()!='true')
  if len(page)<500:break
 else:raise SystemExit('Demasiados registros: dividir la sincronización antes de continuar.')
 if os.environ.get('SYNC_EXECUTE')!='1':
  print('Revisión sin escrituras. Perfiles registrados:',len(records))
  return
 failures=0; diagnostics={}
 for row in records:
  try:
   request=urllib.request.Request(url+'/functions/v1/nextlevel-onboard',data=json.dumps({'action':'sync','playerId':row['player_id'],'season':season}).encode(),headers=headers)
   with urllib.request.urlopen(request,timeout=180) as response:result=json.load(response)
   if result.get('error'):raise RuntimeError(result['error'])
   pass  # No publicar identificadores ni resultados individuales.
  except urllib.error.HTTPError as error:
   failures+=1
   label='http_'+str(error.code)
   if error.code==400:
    try:
     message=str(json.load(error).get('error',''))
     for prefix,category in [('Este perfil no tiene equipo','configuration'),('CABB','official_source'),('Equipo/categoría','team_identity'),('Categoría canónica','category_identity'),('Cobertura incompleta','coverage'),('Boxscore no corresponde','fixture_mismatch'),('Jugador ausente','roster_identity'),('Sin partidos','no_games')]:
      if message.startswith(prefix):label=category;break
    except Exception:pass
   diagnostics[label]=diagnostics.get(label,0)+1
  except Exception as error:
   failures+=1  # El resumen no incluye datos de jugadores ni cuerpos de error.
 if diagnostics:print('Diagnóstico agregado:',json.dumps(diagnostics,sort_keys=True))
 if failures:raise SystemExit(f'{failures} perfiles requieren revisar la importación.')
 print('Perfiles actualizados:',len(records))
if __name__=='__main__':run()