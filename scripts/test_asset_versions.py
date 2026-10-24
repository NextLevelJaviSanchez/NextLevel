from pathlib import Path
import hashlib,subprocess,tempfile,re,json,argparse

builder=Path(__file__).with_name('build_private_pages.py').resolve()
parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);root=parser.parse_args().root.resolve()
with tempfile.TemporaryDirectory() as temp:
 digest=hashlib.sha256()
 for name in ['index.html','app.css','app.js','config.js','security.js','data.js']:
  digest.update(name.encode()+b'\0'+(root/'private-app'/name).read_bytes().replace(b'\r\n',b'\n'))
 evidence=json.loads((root/'privacy-verification.json').read_text()) if (root/'privacy-verification.json').exists() else {}
 required=['account_a_login','account_b_login','foreign_profile_denied','logout_back_denied','cloud_save_reload','photo_private','anonymous_denied']
 modes=['preview']
 if evidence.get('source_sha256')==digest.hexdigest() and all(evidence.get(k) is True for k in required):modes.append('live')
 else:
  blocked=Path(temp)/'unverified-live'
  attempt=subprocess.run(['python',str(builder),'--root',str(root),'--output',str(blocked),'--mode','live'],capture_output=True)
  assert attempt.returncode!=0 and not blocked.exists(),'Unverified live release was allowed'
 for mode in modes:
  out=Path(temp)/mode
  subprocess.run(['python',str(builder),'--root',str(root),'--output',str(out),'--mode',mode],check=True,capture_output=True)
  base=out if mode=='live' else out/'revision'
  for name in ['index.html','login.html','perfil.html']:
   html=(base/name).read_text(encoding='utf-8')
   for asset in ['app.js','app.css','config.js','security.js','data.js']:
    raw=(base/asset).read_bytes()
    assert raw==(root/'private-app'/asset).read_bytes(),'Asset bytes changed'
    expected=hashlib.sha256(raw).hexdigest()[:12]
    assert re.search(r'(?:src|href)="'+re.escape(asset)+r'\?v='+expected+r'"',html),'Stale asset reference: '+asset
   assert ('Acceso privado · Tu cuenta' in html)==(mode=='live')
print('PASS: asset URLs follow exact content; source bytes and privacy release gate preserved.')
