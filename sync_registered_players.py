"""Actualiza registros player_season_v1 sin agregar nombres al código."""
import json,os,urllib.request,urllib.parse,datetime

def run():
 url=os.environ.get('SUPA_URL','https://yjcxwfkedxzkcspddghz.supabase.co');key=os.environ.get('SUPA_SERVICE_ROLE_KEY')
 if not key:raise SystemExit('Configurar SUPA_SERVICE_ROLE_KEY como secreto del workflow.')
 headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'}
 season=os.environ.get('SYNC_SEASON') or str(datetime.datetime.now(datetime.timezone.utc).year)
 records=[]
 for offset in range(0,100000,500):
  path='/rest/v1/player_data?select=player_id,module&module=eq.player_season_v1:'+season+'&order=player_id&limit=500&offset='+str(offset)
  with urllib.request.urlopen(urllib.request.Request(url+path,headers=headers)) as response:page=json.load(response)
  records.extend(page)
  if len(page)<500:break
 failures=0
 for row in records:
  try:
   request=urllib.request.Request(url+'/functions/v1/nextlevel-onboard',data=json.dumps({'action':'sync','playerId':row['player_id'],'season':season}).encode(),headers=headers)
   with urllib.request.urlopen(request,timeout=180) as response:result=json.load(response)
   if result.get('error'):raise RuntimeError(result['error'])
   print('Sync',row['player_id'],result.get('games'),'actas')
  except Exception as error:
   failures+=1;print('Sync pendiente',row['player_id'],type(error).__name__)
 if failures:raise SystemExit(f'{failures} perfiles requieren revisar la importación.')
 print('Perfiles actualizados:',len(records))
if __name__=='__main__':run()
