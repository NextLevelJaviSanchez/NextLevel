"""Contrato CABB comprobado contra Berazategui–Obras, partido 644845.

IdPartido es una referencia de sesión para consultar. IdPartidoNotificacion es
la identidad estable usada en game_log; nunca guardar opaque IDs como su clave.
"""
from datetime import datetime
from math import isfinite
import time

def checked(payload, label):
    if not isinstance(payload, dict) or payload.get('resultado') != 'correcto':
        raise ValueError(f"CABB {label}: {payload.get('error', 'respuesta inválida') if isinstance(payload,dict) else 'respuesta inválida'}")
    return payload

def find_category(client, category='INFANTILES FEMENINO', competition='FORMATIVAS 2026'):
    matches = []
    for skip in range(0, 1000, 20):
        page = client.buscar_categorias(category, skip)
        matches.extend(c for c in page if c.get('NombreCategoria') == category
            and c.get('NombreCompeticion') == competition
            and 'FEMENINA METROPOLITANA' in c.get('NombreDelegacion',''))
        if len(page) < 20:
            break
    matches = list({c['Id']: c for c in matches}.values())
    if len(matches) != 1:
        raise ValueError('Selección de categoría inexistente o ambigua')
    return matches[0]

def discover_games(client, team_name, season='2026', progress=None):
    category = find_category(client, competition='FORMATIVAS ' + season)
    phases = checked(client.get_categoria_fases_grupos(category['Id']), 'fases de categoría')
    games = {}
    for phase in phases.get('listaFasesGrupo', []):
        for group in phase.get('Grupos', []):
            fixture = checked(client.get_categoria_horarios_jornadas(
                category['Id'], phase['IdFase'], group['IdGrupo']), 'fixture')
            if not isinstance(fixture.get('partidos'), list):
                raise ValueError('CABB fixture no contiene una lista de partidos')
            for game in fixture['partidos']:
                if team_name not in (game.get('NombreEquipoLocal'), game.get('NombreEquipoVisitante')):
                    continue
                if game.get('Estado') != 'Terminado':
                    continue
                date = datetime.strptime(game['Fecha'], '%d/%m/%Y').date()
                if str(date.year) != season:
                    continue
                stable = str(game.get('IdPartidoNotificacion', ''))
                if not stable.isdigit() or not game.get('IdPartido'):
                    raise ValueError('Fixture sin identidad estable de partido')
                item = dict(game, fase=phase['NombreFase'], grupo=group['NombreGrupo'])
                if stable in games:
                    old = games[stable]
                    if any(old.get(k) != item.get(k) for k in ('Fecha','NombreEquipoLocal','NombreEquipoVisitante','Resultados')):
                        raise ValueError(f'Fixture contradictorio para partido {stable}')
                games[stable] = item
            if progress:
                progress(f"Fixture {phase['NombreFase']} / {group['NombreGrupo']}: {len(games)} partidos terminados del equipo")
            time.sleep(.15)
    return category, sorted(games.values(), key=lambda g:(datetime.strptime(g['Fecha'],'%d/%m/%Y'),g['IdPartidoNotificacion']))

def number(value):
    if value is None or isinstance(value, bool):
        return None
    try:
        value = float(value)
        return value if isfinite(value) else None
    except (ValueError, TypeError):
        return None

def normalize_boxscore(raw, fixture, player_map, synced_at):
    checked(raw, 'boxscore')
    p, stats = raw.get('partido', {}), raw.get('estadisticas', {})
    if p.get('estado_partido') != 'FINALIZADO':
        raise ValueError('Boxscore de partido no finalizado')
    if not fixture or fixture.get('Estado') != 'Terminado':
        raise ValueError('Se requiere fixture canónico terminado')
    stable = str(fixture.get('IdPartidoNotificacion',''))
    if not stable.isdigit():
        raise ValueError('Se requiere IdPartidoNotificacion estable')
    for side, label in [('local','NombreEquipoLocal'),('visitante','NombreEquipoVisitante')]:
        if ' '.join(str(p.get(side,'')).split()).upper() != ' '.join(str(fixture.get(label,'')).split()).upper():
            raise ValueError('Boxscore y fixture pertenecen a equipos diferentes')
    home = 'BERAZATEGUI' in p.get('local','')
    if not home and 'BERAZATEGUI' not in p.get('visitante',''):
        raise ValueError('Partido ajeno al equipo')
    date = datetime.strptime(fixture['Fecha'],'%d/%m/%Y').date().isoformat()
    result = fixture.get('Resultados',{})
    h,a = number(result.get('ResultadoLocal')), number(result.get('ResultadoVisitante'))
    if h is None or a is None or h == a:
        raise ValueError('Fixture sin resultado final válido')
    rows=[]
    players=stats.get('estadisticasequipolocal' if home else 'estadisticasequipovisitante')
    if not isinstance(players,list) or not players:
        raise ValueError('Boxscore sin estadísticas individuales')
    for player in players:
        name=player.get('nombre','').strip().upper()
        if name == 'TOTALES' or name not in player_map:
            continue
        made=[number(player.get('canasta'+k+'p')) for k in ('1','2','3')]
        attempted=[number(player.get('tiro'+k+'p')) for k in ('1','2','3')]
        for k,(m,att) in enumerate(zip(made,attempted),1):
            if m is not None and att is not None and not 0 <= m <= att:
                raise ValueError(f'Tiros inválidos {name}: {k}P')
            missed=number(player.get('tiro'+str(k)+'Fallado'))
            if None not in (m,att,missed) and m+missed != att:
                raise ValueError(f'Tiros no reconcilian {name}: {k}P')
        pts=number(player.get('puntos'))
        if pts is not None and all(v is not None for v in made) and pts != made[0]+2*made[1]+3*made[2]:
            raise ValueError(f'Puntos no reconcilian {name}')
        ms=number(player.get('milisegundos_jugados'))
        minutes=ms/60000 if ms is not None else None
        # Jugadoras con 0 tiempo y ninguna acción son DNP, no un partido jugado.
        if ms == 0 and all(number(player.get(k)) == 0 for k in
                ('puntos','rebotes','asistencias','perdidas','recuperaciones','faltascometidas')):
            continue
        def sum_if_known(values):
            return sum(values) if all(v is not None for v in values) else None
        row={'player_id':player_map[name], 'cabb_partido_id':stable,
            'cabb_player_id':None, # componente_id de boxscore es opaque; no simula identidad estable.
            'fecha':date,'rival':p['visitante'] if home else p['local'],
            'torneo':'AFMB','fase':fixture.get('fase',''),'es_local':home,
            'resultado_eq':f"{int(h) if home else int(a)}-{int(a) if home else int(h)}",
            'ganado':h>a if home else a>h,'titular':player.get('quintetotitular'),
            'pts':pts,'minutos':minutes,'tc_in':sum_if_known(made[1:]),'tc_att':sum_if_known(attempted[1:]),
            't2_in':made[1],'t2_att':attempted[1],'t3_in':made[2],'t3_att':attempted[2],
            'tl_in':made[0],'tl_att':attempted[0], 'source':'cabb_api','synced_at':synced_at}
        for out,key in [('reb_tot','rebotes'),('reb_def','rebotedefensivo'),('reb_of','reboteofensivo'),
                        ('ast','asistencias'),('stl','recuperaciones'),('blk','taponescometidos'),
                        ('to_perdidas','perdidas'),('faltas','faltascometidas'),('val','valoracion')]:
            row[out]=number(player.get(key))
        if None not in (row['reb_tot'],row['reb_def'],row['reb_of']) and row['reb_tot'] != row['reb_def']+row['reb_of']:
            raise ValueError('Rebotes no reconcilian')
        for field,value in row.items():
            if isinstance(value,float) and field != 'minutos':
                if not value.is_integer():
                    raise ValueError('Conteo estadístico no entero')
                row[field]=int(value)
        rows.append(row)
    if len({r['player_id'] for r in rows}) != len(rows):
        raise ValueError('Jugadora duplicada en boxscore')
    return rows
