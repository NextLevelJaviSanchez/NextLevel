"""Add only the reviewed public landing and its explicit demo assets."""
from pathlib import Path
import argparse, re, shutil

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=Path('.'))
parser.add_argument('--output', type=Path, default=Path('privacy-pages-artifact'))
args = parser.parse_args()
root = args.source.resolve()
out = args.output.resolve()
shots = [f'demo-capturas/{name}-20261016.jpg' for name in [
    'sofia-perfil', 'sofia-inicio', 'sofia-rendimiento', 'sofia-plan',
    'sofia-mejoras', 'sofia-top', 'tomas-perfil', 'tomas-aventuras',
    'tomas-plan', 'tomas-evolucion']]
allowed = {'landing.html', 'next-level-coach.png', *shots}
html = (root / 'landing.html').read_text(encoding='utf-8-sig')
sources = set(re.findall(r'\bsrc="([^"]+)"', html))
if sources != allowed - {'landing.html'}:
    raise RuntimeError('Landing resources differ from the explicit public list')
if re.search(r'(?i)<(?:iframe|object|embed)\b|service_role|supabase\.co|(?:fetch|XMLHttpRequest)\s*\(', html):
    raise RuntimeError('Unexpected remote data or embedded content in landing')
if not out.is_dir():
    raise RuntimeError('Build the verified private package first')
before = {p.relative_to(out).as_posix(): p.read_bytes()
          for p in out.rglob('*') if p.is_file()}
for name in sorted(allowed):
    source = root / name
    if source.is_symlink() or not source.is_file() or not source.resolve().is_relative_to(root):
        raise RuntimeError('Missing or invalid public asset: ' + name)
    if name in before:
        raise RuntimeError('Public asset would replace an existing private file: ' + name)
    destination = out / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
after = {p.relative_to(out).as_posix() for p in out.rglob('*') if p.is_file()}
if after != set(before) | allowed:
    raise RuntimeError('Unexpected file in public package')
for name, data in before.items():
    if (out / name).read_bytes() != data:
        raise RuntimeError('Private package changed: ' + name)
print(f'Public landing added: {len(allowed)} files; private package unchanged.')
