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
    equipos = client.buscar_equipos(EQUIPO_QUERY)
    
    candidatos = [e for e in equipos
                  if str(e.get('Categoria', '')).upper() == CATEGORIA_HINT
                  and str(e.get('Temporada', '')) == SEASON
                  and 'FEMENINA METROPOLITANA' in str(e.get('Delegacion', '')).upper()]
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
        row = {'player_id': player_id, 'season': SEASON, 'tournament': 'AFMB',
               'updated_at': datetime.now(timezone.utc).isoformat()}
        for key, value in [('pj', pj), ('ppg', safe_float(j.get('PuntosPorPartido'), None)),
                           ('min_pg', safe_float(j.get('MinutosPorPartido'), None))]:
            if value is not None and value >= 0:
                row[key] = value
        logs = [r for r in (games or []) if r['player_id'] == player_id]
        if supa and not dry_run:
            logs = supa.table('game_log').select('*').eq('player_id', player_id).eq(
                'torneo', 'AFMB').eq('source', 'cabb_api').gte('fecha', SEASON + '-01-01').lt(
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

def sync_game_log(client: CABBApiClient, team_id: str, supa: Any, dry_run: bool, match_ids=None):
    """Trae los partidos del equipo y hace upsert de boxscores individuales."""
    log('=== SYNC GAME LOG ===')
    
    # Obtener fases/grupos del equipo para encontrar los id_partido
    fases_data = client.get_equipo_fases_grupos(team_id)
    partidos_ids = extraer_partido_ids(fases_data)
    partidos_ids += [{'id': pid, 'fase': ''} for pid in (match_ids or [])]
    partidos_ids = list({p['id']: p for p in partidos_ids}.values())
    if not partidos_ids:
        raise RuntimeError('CABB fasesGrupos no contiene partidos. Proporcioná --match-id validado; no se inventan game logs.')
    collected = []
    
    log(f'Partidos encontrados en árbol de fases: {len(partidos_ids)}')
    
    upserted = 0
    errores  = 0
    
    for pid_info in partidos_ids:
        pid      = pid_info['id']
        fase_lbl = pid_info.get('fase', '')
        
        try:
            stats = client.get_partido_stats(pid)
            rows  = procesar_boxscore(pid, fase_lbl, stats)
            
            collected.extend(rows)
            for row in rows:
                if not dry_run and supa:
                    try:
                        supa.table('game_log').upsert(
                            row,
                            on_conflict='player_id,cabb_partido_id'
                        ).execute()
                        upserted += 1
                    except Exception as e:
                        log(f'  game_log upsert error partido {pid}: {e}', 'ERROR')
                        errores += 1
                else:
                    log(f'  [DRY] {row.get("rival","?")} {row.get("fecha","?")} — {row.get("pts","?")} pts {row.get("reb_tot","?")} reb')
                    upserted += 1
            
            time.sleep(0.4)  # rate limiting: ~2.5 partidos/seg
            
        except Exception as e:
            log(f'  Error partido {pid}: {e}', 'ERROR')
            errores += 1
    
    log(f'Game log: {upserted} filas upserted, {errores} errores')
    if errores:
        raise RuntimeError(f'Game log incompleto: {errores} errores')
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

def procesar_boxscore(id_partido: str, fase: str, stats_raw: Dict) -> List[Dict]:
    """Convierte la respuesta de estadisticasPartido en filas para game_log."""
    rows = []
    # Este adaptador requiere estructura verificada; rechaza respuestas desconocidas.
    if stats_raw.get('resultado') == 'error' or not all(
            isinstance(stats_raw.get(k), dict) for k in ('local', 'visitante')):
        raise ValueError('Boxscore no validado: inspeccionar respuesta real antes de sincronizar')
    if not any(EQUIPO_QUERY in stats_raw[k].get('nombre', '').upper() for k in ('local', 'visitante')):
        raise ValueError('El boxscore no corresponde al equipo seleccionado')

    # Estructura típica de la API CABB:
    # { local: { nombre, jugadoras: [...] }, visitante: { nombre, jugadoras: [...] },
    #   fecha, resultado_local, resultado_visitante }
    
    local_nombre  = stats_raw.get('local', {}).get('nombre', '')
    visit_nombre  = stats_raw.get('visitante', {}).get('nombre', '')
    fecha_raw     = stats_raw.get('fecha') or stats_raw.get('Fecha') or ''
    fecha         = parse_fecha(fecha_raw) if fecha_raw else None
    if not fecha or not fecha.startswith(SEASON + '-'):
        raise ValueError('Fecha inválida o fuera de temporada')
    res_loc       = safe_int(stats_raw.get('resultado_local', stats_raw.get('ResultadoLocal')), None)
    res_vis       = safe_int(stats_raw.get('resultado_visitante', stats_raw.get('ResultadoVisitante')), None)
    if res_loc is None or res_vis is None or res_loc == res_vis:
        raise ValueError('Partido sin resultado final verificable')
    
    es_bera_local = 'BERAZATEGUI' in local_nombre.upper()
    
    if es_bera_local:
        rival    = visit_nombre
        ganado   = res_loc > res_vis
        marcador = f'{res_loc}-{res_vis}'
        jugadoras_raw = stats_raw.get('local', {}).get('jugadoras', []) or \
                        stats_raw.get('local', {}).get('Jugadoras', [])
    else:
        rival    = local_nombre
        ganado   = res_vis > res_loc
        marcador = f'{res_vis}-{res_loc}'
        jugadoras_raw = stats_raw.get('visitante', {}).get('jugadoras', []) or \
                        stats_raw.get('visitante', {}).get('Jugadoras', [])
    
    for j in jugadoras_raw:
        nombre = j.get('Nombre') or j.get('nombre') or ''
        player_id = resolve_player_id(nombre)
        if not player_id:
            continue
        
        tc_in = safe_int(first_value(j, 'TirosCampoAnotados', 'tc_in'), None)
        tc_att = safe_int(first_value(j, 'TirosCampoIntentados', 'tc_att'), None)
        t2_in = safe_int(first_value(j, 'TirosDosPuntosAnotados', 't2_in'), None)
        t2_att = safe_int(first_value(j, 'TirosDosPuntosIntentados', 't2_att'), None)
        t3_in = safe_int(first_value(j, 'TiresTresPuntosAnotados', 'TirosTresPuntosAnotados', 't3_in'), None)
        t3_att = safe_int(first_value(j, 'TiresTresPuntosIntentados', 'TirosTresPuntosIntentados', 't3_att'), None)
        tl_in = safe_int(first_value(j, 'TirosLibresAnotados', 'tl_in'), None)
        tl_att = safe_int(first_value(j, 'TirosLibresIntentados', 'tl_att'), None)
        pts = safe_int(first_value(j, 'Puntos', 'puntos'), None)
        reb = safe_int(first_value(j, 'Rebotes', 'RebotesTotales', 'rebotes'), None)
        reb_d = safe_int(first_value(j, 'RebotesDefensivos', 'reb_def'), None)
        reb_o = safe_int(first_value(j, 'RebotesOfensivos', 'reb_of'), None)
        ast = safe_int(first_value(j, 'Asistencias', 'asistencias'), None)
        stl = safe_int(first_value(j, 'Recuperos', 'recuperos'), None)
        blk = safe_int(first_value(j, 'Tapas', 'tapas'), None)
        to_p = safe_int(first_value(j, 'Perdidas', 'perdidas'), None)
        faltas = safe_int(first_value(j, 'Faltas', 'faltas'), None)
        val = safe_int(first_value(j, 'Valoracion', 'valoracion'), None)
        mins   = parse_minutes(first_value(j, 'Minutos', 'minutos'))
        titular= parse_bool(first_value(j, 'Titular', 'titular'))
        
        rows.append({
            'player_id':       player_id,
            'cabb_partido_id': str(id_partido),
            'cabb_player_id':  str(j.get('Id') or j.get('id_jugador') or ''),
            'fecha':           fecha,
            'rival':           rival or '?',
            'torneo':          'AFMB',
            'fase':            fase,
            'es_local':        es_bera_local,
            'resultado_eq':    marcador,
            'ganado':          ganado,
            'titular':         titular,
            'pts':             pts,
            'reb_tot':         reb,
            'reb_def':         reb_d,
            'reb_of':          reb_o,
            'ast':             ast,
            'stl':             stl,
            'blk':             blk,
            'to_perdidas':     to_p,
            'faltas':          faltas,
            'minutos':         mins,
            'tc_in':           tc_in,
            'tc_att':          tc_att,
            't2_in':           t2_in,
            't2_att':          t2_att,
            't3_in':           t3_in,
            't3_att':          t3_att,
            'tl_in':           tl_in,
            'tl_att':          tl_att,
            'val':             val,
            'source':          'cabb_api',
            'synced_at':       datetime.now(timezone.utc).isoformat(),
        })
    
    return rows

# ══════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description='NextLevel ↔ CABB ↔ Supabase Sync')
    parser.add_argument('--match-id', action='append', default=[], help='ID de partido obtenido en la misma sesión CABB (no persistir opaque IDs)')
    parser.add_argument('--dry-run',     action='store_true', help='Solo muestra, no escribe en Supabase')
    parser.add_argument('--only-stats',  action='store_true', help='Solo sincroniza promedios anuales')
    parser.add_argument('--only-gamelog',action='store_true', help='Solo sincroniza game log')
    parser.add_argument('--team-id',     type=str,            help='Forzar opaque_team_id (saltar búsqueda)')
    args = parser.parse_args()
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
        games = sync_game_log(cabb, team_id, supa, args.dry_run, args.match_id)
    if not args.only_gamelog:
        sync_stats_seasons(cabb, team_id, supa, args.dry_run, games)

    elapsed = round(time.time() - start, 1)
    log(f'== SYNC COMPLETO en {elapsed}s ==')

if __name__ == '__main__':
    main()
