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
import json
import time
import argparse
from datetime import datetime, date
from typing import Optional, List, Dict, Any

# ── Configuración ──────────────────────────────────────────────────────
SUPA_URL = 'https://yjcxwfkedxzkcspddghz.supabase.co'
SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqY3h3ZmtlZHh6a2NzcGRkZ2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MTcwODksImV4cCI6MjEwNjI5MzA4OX0.j-g-0yt7D8ADkleTFxTNSN5ORPJE8y50aumejW8G4IQ'

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

# ══════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════

def log(msg: str, level: str = 'INFO'):
    ts = datetime.now().strftime('%H:%M:%S')
    line = f'[{ts}] [{level}] {msg}'
    # Forzar UTF-8 en Windows (evita UnicodeEncodeError con cp1252)
    sys.stdout.buffer.write((line + '\n').encode('utf-8', errors='replace'))
    sys.stdout.buffer.flush()

def safe_float(v, default=0.0) -> float:
    try: return float(v)
    except: return default

def safe_int(v, default=0) -> int:
    try: return int(v)
    except: return default

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
    # Búsqueda por apellido (primer token antes de la coma)
    apellido = nombre.split(',')[0].strip()
    for k, v in PLAYER_MAP.items():
        if k.startswith(apellido):
            return v
    return None

# ══════════════════════════════════════════════════════════════════════
#  1. BUSCAR EQUIPO EN CABB
# ══════════════════════════════════════════════════════════════════════

def find_equipo(client: CABBApiClient) -> Optional[str]:
    """Devuelve el opaque_team_id del equipo Berazategui Infantiles Fem."""
    log(f'Buscando equipo: {EQUIPO_QUERY} ({CATEGORIA_HINT})')
    equipos = client.buscar_equipos(EQUIPO_QUERY)
    
    # Filtrar por categoría
    candidatos = [
        e for e in equipos
        if CATEGORIA_HINT.lower() in str(e.get('Categoria', '')).lower()
        or 'INFANTILES' in str(e.get('Categoria', '')).upper()
    ]
    
    if not candidatos:
        # Si no hay match exacto de categoría, tomar el primero
        candidatos = equipos[:3]
        log(f'No se encontró exacto, usando los primeros {len(candidatos)} resultados', 'WARN')
    
    if candidatos:
        eq = candidatos[0]
        team_id = eq.get('Id') or eq.get('id_equipo') or eq.get('Opaque')
        log(f'Equipo encontrado: {eq.get("Nombre")} | {eq.get("Categoria")} → ID: {team_id}')
        return team_id
    
    log('No se encontró el equipo', 'ERROR')
    return None

# ══════════════════════════════════════════════════════════════════════
#  2. SYNC DE PROMEDIOS ANUALES → stats_seasons
# ══════════════════════════════════════════════════════════════════════

def sync_stats_seasons(client: CABBApiClient, team_id: str, supa: Any, dry_run: bool):
    """Trae promedios acumulados por jugadora y hace upsert en stats_seasons."""
    log('=== SYNC PROMEDIOS ANUALES ===')
    jugadoras = client.get_equipo_jugadores(team_id)
    log(f'Jugadoras en plantel CABB: {len(jugadoras)}')
    
    upserted = 0
    skipped  = 0
    
    for j in jugadoras:
        nombre = j.get('Nombre') or j.get('nombre') or ''
        player_id = resolve_player_id(nombre)
        
        if not player_id:
            log(f'  SKIP (no mapeada): {nombre}', 'WARN')
            skipped += 1
            continue
        
        # Campos reales confirmados con la API CABB (probe 2026-07)
        pj      = safe_int(j.get('PartidosJugados') or j.get('Partidos'))
        ppg     = safe_float(j.get('PuntosPorPartido') or j.get('PuntosPP'))
        min_pg  = safe_float(j.get('MinutosPorPartido') or j.get('MinutosPP'))
        # RPG, APG, etc. NO vienen en el endpoint jugadores — se obtienen via detalleJugador
        rpg = apg = spg = val_pg = efg = ts = None
        
        # Intentar obtener detalle más completo del jugador
        cabb_pid = j.get('Id') or j.get('id_jugador') or j.get('Opaque')
        t2_pct = t3_pct = tl_pct = None
        if cabb_pid:
            try:
                det = client.get_jugadora_detalle(str(cabb_pid))
                jdet = det.get('jugador', {})
                # Estadísticas de tiro si vienen en el detalle
                t2_att = safe_int(jdet.get('TirosDosPuntosIntentados'))
                t2_in  = safe_int(jdet.get('TirosDosPuntosAnotados'))
                t3_att = safe_int(jdet.get('TiresTresPuntosIntentados'))
                t3_in  = safe_int(jdet.get('TiresTresPuntosAnotados'))
                tl_att = safe_int(jdet.get('TirosLibresIntentados'))
                tl_in  = safe_int(jdet.get('TirosLibresAnotados'))
                if t2_att:  t2_pct = round(t2_in / t2_att * 100, 1)
                if t3_att:  t3_pct = round(t3_in / t3_att * 100, 1)
                if tl_att:  tl_pct = round(tl_in / tl_att * 100, 1)
                time.sleep(0.3)  # no saturar la API
            except Exception as e:
                log(f'  detalle jugadora error: {e}', 'WARN')
        
        row = {
            'player_id':  player_id,
            'season':     SEASON,
            'tournament': 'AFMB',
            'pj':         pj or None,
            'ppg':        ppg or None,
            'rpg':        rpg or None,
            'apg':        apg or None,
            'spg':        spg or None,
            'val_pg':     val_pg or None,
            'min_pg':     min_pg or None,
            'efg_pct':    efg or None,
            'ts_pct':     ts or None,
            'updated_at': datetime.utcnow().isoformat(),
        }
        
        log(f'  {nombre} → PPG:{ppg} RPG:{rpg} APG:{apg} PJ:{pj}')
        
        if not dry_run and supa:
            try:
                supa.table('stats_seasons').upsert(
                    row,
                    on_conflict='player_id,season,tournament'
                ).execute()
                upserted += 1
            except Exception as e:
                log(f'  Supabase error: {e}', 'ERROR')
        else:
            upserted += 1  # en dry-run contamos igual
    
    log(f'Promedios: {upserted} upserted, {skipped} skipped')

# ══════════════════════════════════════════════════════════════════════
#  3. SYNC DE GAME LOG → game_log
# ══════════════════════════════════════════════════════════════════════

def sync_game_log(client: CABBApiClient, team_id: str, supa: Any, dry_run: bool):
    """Trae los partidos del equipo y hace upsert de boxscores individuales."""
    log('=== SYNC GAME LOG ===')
    
    # Obtener fases/grupos del equipo para encontrar los id_partido
    fases_data = client.get_equipo_fases_grupos(team_id)
    partidos_ids = extraer_partido_ids(fases_data)
    
    log(f'Partidos encontrados en árbol de fases: {len(partidos_ids)}')
    
    upserted = 0
    errores  = 0
    
    for pid_info in partidos_ids:
        pid      = pid_info['id']
        fase_lbl = pid_info.get('fase', '')
        
        try:
            stats = client.get_partido_stats(pid)
            rows  = procesar_boxscore(pid, fase_lbl, stats)
            
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

def extraer_partido_ids(fases_data: Dict) -> List[Dict]:
    """Extrae todos los id_partido del árbol de fases/grupos/rondas."""
    resultado = []
    
    def _walk(obj, fase_label=''):
        if isinstance(obj, list):
            for item in obj:
                _walk(item, fase_label)
        elif isinstance(obj, dict):
            # ¿Es un partido?
            pid = obj.get('id_partido') or obj.get('IdPartido') or obj.get('Opaque')
            if pid:
                resultado.append({
                    'id':   str(pid),
                    'fase': fase_label,
                    'fecha': obj.get('Fecha') or obj.get('fecha') or '',
                })
                return
            # ¿Tiene nombre de fase?
            nombre = obj.get('Nombre') or obj.get('nombre') or ''
            # Recorrer hijos
            for k, v in obj.items():
                if isinstance(v, (dict, list)):
                    _walk(v, nombre or fase_label)
    
    _walk(fases_data)
    return resultado

def procesar_boxscore(id_partido: str, fase: str, stats_raw: Dict) -> List[Dict]:
    """Convierte la respuesta de estadisticasPartido en filas para game_log."""
    rows = []
    
    # Estructura típica de la API CABB:
    # { local: { nombre, jugadoras: [...] }, visitante: { nombre, jugadoras: [...] },
    #   fecha, resultado_local, resultado_visitante }
    
    local_nombre  = stats_raw.get('local', {}).get('nombre', '')
    visit_nombre  = stats_raw.get('visitante', {}).get('nombre', '')
    fecha_raw     = stats_raw.get('fecha') or stats_raw.get('Fecha') or ''
    fecha         = parse_fecha(fecha_raw) if fecha_raw else None
    res_loc       = safe_int(stats_raw.get('resultado_local') or stats_raw.get('ResultadoLocal'))
    res_vis       = safe_int(stats_raw.get('resultado_visitante') or stats_raw.get('ResultadoVisitante'))
    
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
        
        tc_in  = safe_int(j.get('TirosCampoAnotados') or j.get('tc_in'))
        tc_att = safe_int(j.get('TirosCampoIntentados') or j.get('tc_att'))
        t2_in  = safe_int(j.get('TirosDosPuntosAnotados') or j.get('t2_in'))
        t2_att = safe_int(j.get('TirosDosPuntosIntentados') or j.get('t2_att'))
        t3_in  = safe_int(j.get('TiresTresPuntosAnotados') or j.get('t3_in'))
        t3_att = safe_int(j.get('TiresTresPuntosIntentados') or j.get('t3_att'))
        tl_in  = safe_int(j.get('TirosLibresAnotados') or j.get('tl_in'))
        tl_att = safe_int(j.get('TirosLibresIntentados') or j.get('tl_att'))
        pts    = safe_int(j.get('Puntos') or j.get('puntos'))
        reb    = safe_int(j.get('Rebotes') or j.get('rebotes') or j.get('RebotesTotales'))
        reb_d  = safe_int(j.get('RebotesDefensivos') or j.get('reb_def'))
        reb_o  = safe_int(j.get('RebotesOfensivos') or j.get('reb_of'))
        ast    = safe_int(j.get('Asistencias') or j.get('asistencias'))
        stl    = safe_int(j.get('Recuperos') or j.get('recuperos'))
        blk    = safe_int(j.get('Tapas') or j.get('tapas'))
        to_p   = safe_int(j.get('Perdidas') or j.get('perdidas'))
        faltas = safe_int(j.get('Faltas') or j.get('faltas'))
        val    = safe_int(j.get('Valoracion') or j.get('valoracion'))
        mins   = safe_float(j.get('Minutos') or j.get('minutos'))
        titular= bool(j.get('Titular') or j.get('titular'))
        
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
            'minutos':         mins if mins > 0 else None,
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
            'synced_at':       datetime.utcnow().isoformat(),
        })
    
    return rows

# ══════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description='NextLevel ↔ CABB ↔ Supabase Sync')
    parser.add_argument('--dry-run',     action='store_true', help='Solo muestra, no escribe en Supabase')
    parser.add_argument('--only-stats',  action='store_true', help='Solo sincroniza promedios anuales')
    parser.add_argument('--only-gamelog',action='store_true', help='Solo sincroniza game log')
    parser.add_argument('--team-id',     type=str,            help='Forzar opaque_team_id (saltar búsqueda)')
    args = parser.parse_args()
    
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
        log(f'CABB API OK — Device: {cabb.id_dispositivo[:20]}...')
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
    
    # ── Sync promedios anuales
    if not args.only_gamelog:
        sync_stats_seasons(cabb, team_id, supa, args.dry_run)
    
    # ── Sync game log
    if not args.only_stats:
        sync_game_log(cabb, team_id, supa, args.dry_run)
    
    elapsed = round(time.time() - start, 1)
    log(f'== SYNC COMPLETO en {elapsed}s ==')

if __name__ == '__main__':
    main()
