from pathlib import Path
import tempfile, subprocess, shutil, json, argparse
BASE='cae632c43ae79b82d481e9a8745c0f4076c348cd'
parser=argparse.ArgumentParser();parser.add_argument('--repository',default='.');args=parser.parse_args()
root=Path.cwd()
output=root/'privacy-pages-artifact'
if output.exists():raise RuntimeError('La salida debe ser nueva')
with tempfile.TemporaryDirectory() as tmp:
    base=Path(tmp)/'base';base.mkdir()
    files=['private-app/'+n for n in ['index.html','app.css','app.js','config.js','security.js','data.js']]+['privacy-maintenance/index.html','privacy-verification.json']
    for name in files:
        data=subprocess.run(['git','-C',args.repository,'show',BASE+':'+name],check=True,capture_output=True).stdout
        dest=base/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
    builder=root/'scripts/build_private_pages.py'
    subprocess.run(['python',str(builder),'--root',str(base),'--output',str(output),'--mode','live'],check=True)
    preview=Path(tmp)/'preview'
    subprocess.run(['python',str(builder),'--root',str(root),'--output',str(preview),'--mode','preview'],check=True)
    shutil.copytree(preview/'revision',output/'revision')
    expected={'.nojekyll','404.html'}|{prefix+n for prefix in ['', 'revision/'] for n in ['index.html','login.html','perfil.html','app.css','app.js','config.js','security.js','data.js']}
    actual={p.relative_to(output).as_posix() for p in output.rglob('*') if p.is_file()}
    if actual!=expected:raise RuntimeError('Archivo inesperado en la publicación')
    print(json.dumps({'mode':'review','stable_commit':BASE,'files':len(actual)}))