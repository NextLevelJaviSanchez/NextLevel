import argparse,importlib.util,io,json,os,contextlib
from pathlib import Path
from unittest.mock import patch
parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,default=Path(__file__).resolve().parents[1]/'sync_registered_players.py');args=parser.parse_args()
spec=importlib.util.spec_from_file_location('sync_checked',args.source);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
ids=['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];calls=[]
class Response:
 def __init__(self,data):self.data=data
 def __enter__(self):return self
 def __exit__(self,*_):pass
 def read(self):return json.dumps(self.data).encode()
def remote(req,timeout=None):
 calls.append(req)
 if '/rest/v1/' in req.full_url:return Response([{'player_id':i,'module':'player_season_v1:2026'} for i in ids])
 return Response({'games':7})
env={'SUPA_URL':'https://yjcxwfkedxzkcspddghz.supabase.co','SUPA_SERVICE_ROLE_KEY':'test_service_only','SYNC_SEASON':'2026'}
with patch.dict(os.environ,env,clear=True),patch.object(mod.urllib.request,'urlopen',remote),contextlib.redirect_stdout(io.StringIO()) as out:mod.run()
assert len(calls)==1 and all(i not in out.getvalue() for i in ids)
calls.clear()
with patch.dict(os.environ,{**env,'SYNC_EXECUTE':'1'},clear=True),patch.object(mod.urllib.request,'urlopen',remote),contextlib.redirect_stdout(io.StringIO()) as out:mod.run()
assert len(calls)==3 and all(i not in out.getvalue() for i in ids) and 'test_service_only' not in out.getvalue()
assert all(req.full_url.startswith(env['SUPA_URL']) for req in calls)
calls.clear()
try:
 with patch.dict(os.environ,{**env,'SUPA_URL':'https://other.invalid'},clear=True),patch.object(mod.urllib.request,'urlopen',remote):mod.run()
 raise AssertionError('Destino ajeno aceptado')
except SystemExit:assert not calls
print('Sincronización: revisión sin escrituras por defecto, destino limitado y logs sin identificadores ni credenciales: aprobado.')
