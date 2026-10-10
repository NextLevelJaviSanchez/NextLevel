"""Publica exclusivamente una lista cerrada de archivos genéricos."""
from pathlib import Path
import argparse,shutil,hashlib,json,re,base64
parser=argparse.ArgumentParser()
parser.add_argument('--root',type=Path,default=Path('.'))
parser.add_argument('--output',type=Path,default=Path('privacy-pages-artifact'))
parser.add_argument('--mode',choices=['maintenance','preview','live'],default='preview')
args=parser.parse_args()
files=['index.html','app.css','app.js','config.js','security.js','data.js']
source=args.root/'private-app'
config=json.loads((source/'config.js').read_text(encoding='utf-8').split('=',1)[1].strip().rstrip(';'))
claims=json.loads(base64.urlsafe_b64decode(config['anonKey'].split('.')[1]+'==='))
if claims.get('role')!='anon' or claims.get('ref')!='yjcxwfkedxzkcspddghz' or config.get('url')!='https://yjcxwfkedxzkcspddghz.supabase.co':raise RuntimeError('La configuración debe contener solo la clave pública del proyecto')
digest=hashlib.sha256()
for name in files:
 p=source/name
 if p.is_symlink() or not p.is_file():raise RuntimeError('Falta un archivo revisado: '+name)
 raw=p.read_bytes();digest.update(name.encode()+b'\0'+raw.replace(b'\r\n',b'\n'))
 if name!='config.js' and re.search(rb'(?i)(M[i\xc3\xad]a.*S[a\xc3\xa1]nchez|Milo.*S[a\xc3\xa1]nchez|mia@nextlevel|service_role|cabb_team_2026\.json|cabb_milo_u11_2026\.json)',raw):raise RuntimeError('La fuente contiene una referencia personal o privilegiada: '+name)
fingerprint=digest.hexdigest()
if args.mode=='live':
 evidence_path=args.root/'privacy-verification.json'
 if not evidence_path.is_file():raise RuntimeError('Faltan las pruebas reales: mantener la página en revisión')
 evidence=json.loads(evidence_path.read_text())
 required=['account_a_login','account_b_login','foreign_profile_denied','logout_back_denied','cloud_save_reload','photo_private','anonymous_denied']
 if evidence.get('source_sha256')!=fingerprint or not all(evidence.get(k) is True for k in required):raise RuntimeError('Faltan las pruebas reales de esta versión: no reabrir')
if args.output.exists():raise RuntimeError('El directorio de salida debe ser nuevo')
args.output.mkdir(parents=True)
maintenance=args.root/'privacy-maintenance/index.html'
shutil.copyfile(maintenance,args.output/'404.html')
(args.output/'.nojekyll').write_text('')
expected={'404.html','.nojekyll'}
if args.mode!='live':
 shutil.copyfile(maintenance,args.output/'index.html');expected.add('index.html')
if args.mode!='maintenance':
 base=args.output/'revision' if args.mode=='preview' else args.output
 base.mkdir(exist_ok=True)
 for name in files:shutil.copyfile(source/name,base/name)
 for alias in ['login.html','perfil.html']:shutil.copyfile(source/'index.html',base/alias)
 prefix='revision/' if args.mode=='preview' else ''
 expected.update(prefix+n for n in files+['login.html','perfil.html'])
actual={p.relative_to(args.output).as_posix() for p in args.output.rglob('*') if p.is_file()}
if actual!=expected:raise RuntimeError('Archivos fuera de la lista autorizada')
print(json.dumps({'mode':args.mode,'source_sha256':fingerprint,'files':sorted(actual)},indent=2))
