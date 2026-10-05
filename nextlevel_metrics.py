"""Métricas derivadas: NULL nunca equivale a cero; tiros agregados por intentos."""
from math import isfinite

def numeric(value):
    if value is None or isinstance(value, bool):
        return None
    try:
        number = float(value)
        return number if isfinite(number) else None
    except (TypeError, ValueError):
        return None

def summarize_games(rows):
    def total(key):
        values = [numeric(r.get(key)) for r in rows]
        return sum(values) if values and all(v is not None for v in values) else None
    def average(key):
        value = total(key)
        return round(value / len(rows), 2) if value is not None else None
    def pct(made, attempted):
        a, b = total(made), total(attempted)
        return round(100 * a / b, 2) if a is not None and b is not None and b > 0 else None
    result = {'pj': len(rows)}
    for target, source in [('ppg','pts'), ('rpg','reb_tot'), ('apg','ast'), ('spg','stl'),
                           ('bpg','blk'), ('min_pg','minutos'), ('val_pg','val')]:
        result[target] = average(source)
    for name, made, attempted in [('fg_pct','tc_in','tc_att'),('t2_pct','t2_in','t2_att'),
                                  ('t3_pct','t3_in','t3_att'),('tl_pct','tl_in','tl_att')]:
        result[name] = pct(made, attempted)
    fg, fga, three, ft, pts, ast, turnovers = [total(k) for k in
        ('tc_in','tc_att','t3_in','tl_att','pts','ast','to_perdidas')]
    result['efg_pct'] = round(100 * (fg + .5 * three) / fga, 2) if None not in (fg, three, fga) and fga > 0 else None
    result['ts_pct'] = round(100 * pts / (2 * (fga + .44 * ft)), 2) if None not in (pts, fga, ft) and fga + .44 * ft > 0 else None
    result['ast_to'] = round(ast / turnovers, 2) if None not in (ast, turnovers) and turnovers > 0 else None
    return result
