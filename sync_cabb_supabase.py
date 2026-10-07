#!/usr/bin/env python3
"""
sync_cabb_supabase.py
══════════════════════════════════════════════════════════════════════════
Sincronizador NextLevel  ←→  CABB API / GesDeportiva  ←→  Supabase

Qué hace:
  1. Busca el equipo "BERAZATEGUI" Infantiles Femenino en la API CABB
  2. Por cada jugadora del plantel, trae sus promedios acumulados
  3. Por cada partido del equipo, trae el boxscore individual
  4. Hace upsert en Supabase:
       · stats_seasons  → promedios anuales del plantel
       · game_log       → partido a partido por jugadora

Uso:
  python sync_cabb_supabase.py              # sync completo
  python sync_cabb_supabase.py --only-stats # solo promedios (rápido)
  python sync_cabb_supabase.py --dry-run    # muestra sin escribir en Supabase

Requisito previo:
  pip install supabase
  (o pip install supabase-py)

Frecuencia recomendada:
  - Manual: después de cada fecha de torneo
  - Automático: GitHub Actions cron "0 2 * * 1" (domingos 23hs AR = lunes 02:00 UTC)
══════════════════════════════════════════════════════════════════════════
"""

import sys
import os
import json
import time
import argparse
from datetime import datetime, date, timezone
from typing import Optional, List, Dict, Any

# ── Configuración ──────────────────────────────────────────────────────
SUPA_URL = os.environ.get('SUPA_URL', 'https://yjcxwfkedxzkcspddghz.supabase.co')
SUPA_KEY = os.environ.get('SUPA_KEY', '')

# Mapeo CABB nombre → UUID de Supabase (players.id)
# Si agregás jugadoras, actualizá este dict con el nombre EXACTO que devuelve la API
PLAYER_MAP: Dict[str, str] = {
    # Nombres EXACTOS confirmados via API CABB (probe julio 2026)
    'SANCHEZ, MIA GERALDINE':      '11111111-0000-0000-0000-000000000014',
    'GRILLO, CATALINA':            '11111111-0000-0000-0000-000000000008',
    'PORTINARI, LUBA JULIETA':     '11111111-0000-0000-0000-000000000006',
    # Actas históricas AFMB: nombre invertido, mismo equipo y dorsal 12.
    'ALMA, SMIGIEL':               '11111111-0000-0000-0000-000000000012',
    'SMIGIEL, ALMA':               '11111111-0000-0000-0000-000000000012',
    'BAILON, MARTINA PILAR':       '11111111-0000-0000-0000-000000000010',
    # Aliases sin segundo nombre (fallback por búsqueda de apellido)
    'PORTINARI, LUBA':             '11111111-0000-0000-0000-000000000006',
    'BAILON, MARTINA':             '11111111-0000-0000-0000-000000000010',
}

# Nombre del equipo a buscar en la API CABB
EQUIPO_QUERY   = 'BERAZATEGUI'
CATEGORIA_HINT = 'INFANTILES FEMENINO'   # para filtrar si hay varios resultados

# Temporada actual
SEASON = '2026'
TOURNAMENT = 'AFMB'

# ── Imports opcionales ─────────────────────────────────────────────────
try:
    from supabase import create_client, Client as SupabaseClient
    SUPA_AVAILABLE = True
except ImportError:
    SUPA_AVAILABLE = False
    print('[WARN] supabase-py no instalado. Instalá con: pip install supabase')

# ── Import del cliente CABB ────────────────────────────────────────────
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from cabb_app_api import CABBApiClient
from nextlevel_metrics import summarize_games
from cabb_games import discover_games, normalize_boxscore

# ══════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════

def log(msg: str, level: str = 'INFO'):
    ts = datetime.now().strftime('%H:%M:%S')
    line = f'[{ts}] [{level}] {msg}'
    # Forzar UTF-8 en Windows (evita UnicodeEncodeError con cp1252)
    if hasattr(sys.stdout, 'buffer'):
        sys.stdout.buffer.write((line + '\n').encode('utf-8', errors='replace'))
        sys.stdout.buffer.flush()
    else:
        print(line, flush=True)

def safe_float(v, default=None) -> float:
    try: return float(str(v).replace(',', '.'))
    except: return default

def safe_int(v, default=None) -> int:
    try: return int(v)
    except: return default

def first_value(obj, *keys):
    return next((obj[k] for k in keys if k in obj and obj[k] is not None), None)

def parse_minutes(value):
    if isinstance(value, str) and ':' in value:
        try:
            minutes, seconds = value.split(':')
            if 0 <= float(seconds) < 60:
                return float(minutes) + float(seconds) / 60
        except ValueError:
            pass
        return None
    return safe_float(value)

def parse_bool(value):
    if value is None:
        return None
    if str(value).lower() in ('true', '1', 'si', 'sí'):
        return True
    if str(value).lower() in ('false', '0', 'no'):
        return False
    return None

def parse_fecha(s: str) -> Optional[str]:
    """Convierte 'DD/MM/YYYY' → 'YYYY-MM-DD' para Supabase."""
    for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y'):
        try:
            return datetime.strptime(s.strip(), fmt).strftime('%Y-%m-%d')
        except:
            pass
    return None

def resolve_player_id(nombre_cabb: str) -> Optional[str]:
    """Busca el UUID de Supabase para un nombre de jugadora CABB."""
    nombre = nombre_cabb.upper().strip()
    # Búsqueda exacta
    if nombre in PLAYER_MAP:
        return PLAYER_MAP[nombre]
    return None

# ══════════════════════════════════════════════════════════════════════
#  1. BUSCAR EQUIPO EN CABB
# ══════════════════════════════════════════════════════════════════════

def find_equipo(client: CABBApiClient) -> Optional[str]:
    """Devuelve el opaque_team_id del equipo Berazategui Infantiles Fem."""
    log(f'Buscando equipo: {EQUIPO_QUERY} ({CATEGORIA_HINT})')
    equipos = []
    for skip in range(0, 1000, 20):
        page = client.buscar_equipos(EQUIPO_QUERY, skip)
        equipos.extend(page)
        if len(page) < 20:
            break
    
    candidatos = [e for e in equipos
                  if str(e.get('Categoria', '')).upper() == CATEGORIA_HINT
                  and str(e.get('Temporada', '')) == SEASON
                  and ('ARGENTINA DE BASQUETBOL' if TOURNAMENT == 'Federal CABB' else 'FEMENINA METROPOLITANA') in str(e.get('Delegacion', '')).upper()
                  and str(e.get('Nombre', '')).strip().upper() == ('DEP. BERAZATEGUI' if TOURNAMENT == 'Federal CABB' else 'CLUB SOCIAL Y DEPORTIVO BERAZATEGUI')
                  and str(e.get('Competicion', '')).strip().upper() == ('FORMATIVAS' if TOURNAMENT == 'Federal CABB' else 'FORMATIVAS ' + SEASON)]
    if len(candidatos) == 1:
        return candidatos[0].get('Id')
    if len(candidatos) > 1:
        raise RuntimeError('Equipo ambiguo; usá --team-id para seleccionar explícitamente')
    log('No se encontró el equipo', 'ERROR')
    return None

# ══════════════════════════════════════════════════════════════════════
#  2. SYNC DE PROMEDIOS ANUALES → stats_seasons
# ══════════════════════════════════════════════════════════════════════

def sync_stats_seasons(client, team_id, supa, dry_run, games=None):
    """No pisa métricas existentes con nulos ni usa muestras parciales como temporada."""
    jugadoras = client.get_equipo_jugadores(team_id)
    if not jugadoras:
        raise RuntimeError('CABB no devolvió un plantel; no se actualizan temporadas')
    for j in jugadoras:
        player_id = resolve_player_id(j.get('Nombre', ''))
        if not player_id:
            continue
        pj = safe_int(first_value(j, 'PartidosJugados'), None)
        row = {'player_id': player_id, 'season': SEASON, 'tournament': TOURNAMENT,
               'updated_at': datetime.now(timezone.utc).isoformat()}
        for key, value in [('pj', pj), ('ppg', safe_float(j.get('PuntosPorPartido'), None)),
                           ('min_pg', safe_float(j.get('MinutosPorPartido'), None))]:
            if value is not None and value >= 0:
                row[key] = value
        logs = [r for r in (games or []) if r['player_id'] == player_id]
        if supa and not dry_run:
            logs = supa.table('game_log').select('*').eq('player_id', player_id).eq(
                'torneo', TOURNAMENT).eq('source', 'cabb_api').gte('fecha', SEASON + '-01-01').lt(
                'fecha', str(int(SEASON) + 1) + '-01-01').execute().data
        # Cada partido debe ser único y el conteo debe coincidir con el PJ oficial.
        if pj and len(logs) == pj and len({r['cabb_partido_id'] for r in logs}) == pj:
            row.update({k: v for k, v in summarize_games(logs).items()
                        if k in ('ppg', 'rpg', 'apg', 'spg', 'bpg', 'val_pg', 'min_pg', 'efg_pct', 'ts_pct', 'tl_pct')
                        and v is not None})
        log(f"{j['Nombre']} → {json.dumps(row, ensure_ascii=False)}")
        if not dry_run and supa:
            supa.table('stats_seasons').upsert(row, on_conflict='player_id,season,tournament').execute()

# ══════════════════════════════════════════════════════════════════════
#  3. SYNC DE GAME LOG → game_log
# ══════════════════════════════════════════════════════════════════════

def sync_game_log(client, team_id, supa, dry_run, match_ids=None, export_path=None):
    """Descubre fixture por categoría; valida todas las filas antes de escribir."""
    team=client.get_equipo_detalle(team_id)
    if not team.get('Nombre'):
        raise ValueError('Equipo sin nombre verificado')
    category,games=discover_games(client,team['Nombre'],SEASON,progress=log,tournament=TOURNAMENT)
    if match_ids:
        requested=set(map(str,match_ids))
        games=[g for g in games if str(g['IdPartidoNotificacion']) in requested]
        if {str(g['IdPartidoNotificacion']) for g in games} != requested:
            raise ValueError('No se encontraron todos los IDs estables pedidos en el fixture')
    if not games:
        raise ValueError('Fixture sin partidos terminados del equipo')
    collected=[]
    audit=[]
    for fixture in games:
        raw=client.get_partido_stats(fixture['IdPartido'])
        rows=procesar_boxscore(fixture['IdPartidoNotificacion'],fixture['fase'],raw,fixture)
        collected.extend(rows)
        game=raw.get('partido',{})
        fr=fixture['Resultados']
        if str(game.get('tanteo_local')) != str(fr['ResultadoLocal']) or str(game.get('tanteo_visitante')) != str(fr['ResultadoVisitante']):
            log(f"Resultado distinto entre fixture y acta en {fixture['IdPartidoNotificacion']}; se conserva el resultado oficial del fixture",'WARN')
        audit.append({'id':str(fixture['IdPartidoNotificacion']), 'fecha':fixture['Fecha'],
                      'fixture_result':fr,'boxscore_result':{'local':game.get('tanteo_local'),'visitante':game.get('tanteo_visitante')}})
        log(f"Validado {fixture['IdPartidoNotificacion']} {fixture['Fecha']} → {len(rows)} jugadoras mapeadas")
        time.sleep(.2)
    if export_path:
        from pathlib import Path
        Path(export_path).write_text(json.dumps({'category_id':category.get('IdCompeticionCategoria'),
            'games':audit,'rows':collected},ensure_ascii=False,indent=2),encoding='utf-8')
    if not dry_run:
        if not supa:
            raise ValueError('Falta conexión Supabase')
        supa.table('game_log').upsert(collected,on_conflict='player_id,cabb_partido_id').execute()
    log(f"Game log: {len(games)} partidos, {len(collected)} filas {'validadas (dry-run)' if dry_run else 'sincronizadas'}")
    return collected

def extraer_partido_ids(fases_data: Dict) -> List[Dict]:
    """Extrae todos los id_partido del árbol de fases/grupos/rondas."""
    resultado = []
    
    def _walk(obj, fase_label=''):
        if isinstance(obj, list):
            for item in obj:
                _walk(item, fase_label)
        elif isinstance(obj, dict):
            # ¿Es un partido?
            pid = obj.get('id_partido') or obj.get('IdPartido')
            if pid:
                resultado.append({
                    'id':   str(pid),
                    'fase': fase_label,
                    'fecha': obj.get('Fecha') or obj.get('fecha') or '',
                })
                return
            # ¿Tiene nombre de fase?
            nombre = obj.get('NombreFase') or obj.get('Nombre') or obj.get('nombre') or ''
            # Recorrer hijos
            for k, v in obj.items():
                if isinstance(v, (dict, list)):
                    _walk(v, nombre or fase_label)
    
    _walk(fases_data)
    return list({r['id']: r for r in resultado}.values())

def procesar_boxscore(id_partido, fase, stats_raw, fixture=None):
    if not fixture or str(fixture.get('IdPartidoNotificacion')) != str(id_partido):
        raise ValueError('El boxscore requiere el fixture canónico y su ID estable')
    if parse_fecha(fixture.get('Fecha','')) is None or not parse_fecha(fixture['Fecha']).startswith(SEASON+'-'):
        raise ValueError('Fecha inválida o fuera de temporada')
    return normalize_boxscore(stats_raw,fixture,PLAYER_MAP,datetime.now(timezone.utc).isoformat(), tournament=TOURNAMENT)

# ══════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════

def main():
    global TOURNAMENT, CATEGORIA_HINT
    parser = argparse.ArgumentParser(description='NextLevel ↔ CABB ↔ Supabase Sync')
    parser.add_argument('--tournament', choices=['AFMB', 'Federal CABB'], default='AFMB')
    parser.add_argument('--export-json',help='Exportar filas validadas y auditoría del fixture')
    parser.add_argument('--match-id', action='append', default=[], help='IdPartidoNotificacion estable; se resuelve al opaque ID del fixture en esta sesión')
    parser.add_argument('--dry-run',     action='store_true', help='Solo muestra, no escribe en Supabase')
    parser.add_argument('--only-stats',  action='store_true', help='Solo sincroniza promedios anuales')
    parser.add_argument('--only-gamelog',action='store_true', help='Solo sincroniza game log')
    parser.add_argument('--team-id',     type=str,            help='Forzar opaque_team_id (saltar búsqueda)')
    args = parser.parse_args()
    TOURNAMENT = args.tournament
    if TOURNAMENT == 'Federal CABB':
        CATEGORIA_HINT = 'LA LIGA FEDERAL INFANTILES FEMENINA'
    if args.only_stats and args.only_gamelog:
        parser.error('Los modos only-stats y only-gamelog son excluyentes')
    if not args.dry_run and not SUPA_KEY:
        parser.error('Configurá SUPA_KEY en el entorno')
    
    start = time.time()
    log('=' * 38)
    log(' NextLevel <-> CABB <-> Supabase Sync')
    log('=' * 38)
    
    if args.dry_run:
        log('[DRY RUN] No se escribirá en Supabase', 'WARN')
    
    # ── Inicializar CABB API
    log('Conectando a CABB API...')
    try:
        cabb = CABBApiClient()
        log('CABB API OK — sesión registrada')
    except Exception as e:
        log(f'Error CABB API: {e}', 'ERROR')
        sys.exit(1)
    
    # ── Inicializar Supabase
    supa = None
    if not args.dry_run:
        if not SUPA_AVAILABLE:
            log('supabase-py no disponible. Ejecutá: pip install supabase', 'ERROR')
            sys.exit(1)
        try:
            supa = create_client(SUPA_URL, SUPA_KEY)
            log('Supabase OK')
        except Exception as e:
            log(f'Error Supabase: {e}', 'ERROR')
            sys.exit(1)
    
    # ── Encontrar el equipo
    if args.team_id:
        team_id = args.team_id
        log(f'Usando team_id forzado: {team_id}')
    else:
        team_id = find_equipo(cabb)
        if not team_id:
            log('No se pudo encontrar el equipo. Usá --team-id para forzar.', 'ERROR')
            sys.exit(1)
    
    # Primero partidos; luego resumen para no leer un cache anterior.
    games = []
    if not args.only_stats:
        games = sync_game_log(cabb, team_id, supa, args.dry_run, args.match_id, args.export_json)
    if not args.only_gamelog:
        sync_stats_seasons(cabb, team_id, supa, args.dry_run, games)

    elapsed = round(time.time() - start, 1)
    log(f'== SYNC COMPLETO en {elapsed}s ==')

if __name__ == '__main__':
    main()
