"""Inspector de lectura; nunca escribe en Supabase ni guarda credenciales."""
import argparse, json
from pathlib import Path
from datetime import datetime, timezone
from cabb_app_api import CABBApiClient

def redact(obj):
    if isinstance(obj, dict):
        return {k: redact(v) for k, v in obj.items() if k not in ('key', 'id_dispositivo', 'uid', 'Foto', 'Escudo')}
    if isinstance(obj, list):
        return [redact(v) for v in obj]
    return obj

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--match-id', action='append', default=[])
    p.add_argument('--output', default='cabb_inspection.json')
    a = p.parse_args()
    c = CABBApiClient()
    teams = [e for e in c.buscar_equipos('BERAZATEGUI') if e.get('Categoria') == 'INFANTILES FEMENINO' and e.get('Temporada') == '2026']
    if len(teams) != 1:
        raise RuntimeError('Selección de equipo ambigua')
    t = teams[0]
    roster = c.get_equipo_jugadores(t['Id'])
    data = {'checked_at': datetime.now(timezone.utc).isoformat(), 'team': t,
            'roster': roster, 'fases': c.get_equipo_fases_grupos(t['Id']), 'matches': []}
    mia = next((j for j in roster if j.get('Nombre') == 'SANCHEZ, MIA GERALDINE'), None)
    if mia:
        data['player_detail'] = c.get_jugadora_detalle(mia['Id'])
    for pid in a.match_id:
        data['matches'].append({'id': pid, 'boxscore': c.get_partido_stats(pid), 'pbp': c.get_partido_pbp(pid)})
    Path(a.output).write_text(json.dumps(redact(data), ensure_ascii=False, indent=2), encoding='utf-8')
    print('Inspección guardada sin credenciales. Partidos consultados:', len(data['matches']))
    if not a.match_id:
        print('Boxscore y PBP pendientes: falta ID de partido válido de esta sesión.')

if __name__ == '__main__':
    main()
