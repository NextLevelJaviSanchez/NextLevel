#!/usr/bin/env python3
"""
CABB App API Client
Permite interactuar directamente con la API privada de GesDeportiva / CABB
utilizada por la App Oficial de la Confederación Argentina de Básquetbol.
"""
import urllib.request
import urllib.parse
import json
import uuid
import time
from typing import Dict, Any, List, Optional

BASE_V1 = "https://appaficioncabb.indalweb.net/"
BASE_V2 = "https://appaficioncabb.indalweb.net/v2/"

HEADERS = {
    'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 10; SM-A505F Build/QP1A.190711.020)',
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'com.indalweb.aficionCABB',
    'Content-Type': 'application/x-www-form-urlencoded',
}

class CABBApiClient:
    def __init__(self, version_num: str = "40044"):
        self.version_num = version_num
        self.device_uuid = str(uuid.uuid4())
        self.id_dispositivo: Optional[str] = None
        self.key: Optional[str] = None
        if not self.register_device():
            raise RuntimeError("CABB: no se pudo registrar el dispositivo")

    def _post(self, url: str, params: Dict[str, Any], timeout: int = 20) -> Dict[str, Any]:
        data = urllib.parse.urlencode(params).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers=HEADERS, method='POST')
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=timeout) as r:
                    res = json.loads(r.read().decode('utf-8', errors='replace'))
                    if isinstance(res, dict) and res.get('key'):
                        self.key = res['key']
                    return res
            except Exception as e:
                e_last = e
                time.sleep(1)
        raise RuntimeError("CABB: la consulta falló después de 3 intentos") from e_last

    def register_device(self) -> bool:
        """Registra un dispositivo virtual y obtiene id_dispositivo y key de sesión."""
        params = {
            'accion': 'registrar',
            'uid': self.device_uuid,
            'plataforma': 'android',
            'tipo_dispositivo': 'mobile',
            'version': self.version_num,
        }
        res = self._post(BASE_V1 + 'dispositivo.ashx', params)
        if res.get('resultado') == 'correcto':
            self.id_dispositivo = res.get('id_dispositivo')
            self.key = res.get('key')
            return True
        return False

    def get_delegaciones(self) -> List[Dict[str, Any]]:
        """Obtiene las 40 federaciones/asociaciones registradas en CABB/GesDeportiva."""
        params = {
            'accion': 'delegaciones',
            'id_dispositivo': self.id_dispositivo,
            'key': self.key,
        }
        res = self._post(BASE_V1 + 'delegaciones.ashx', params)
        return res.get('delegaciones', [])

    def buscar_equipos(self, query: str, skip: int = 0) -> List[Dict[str, Any]]:
        """Busca equipos por nombre o localidad en todas las federaciones."""
        params = {
            'accion': 'buscarEquipo',
            'texto': query,
            'skip': skip,
            'id_dispositivo': self.id_dispositivo,
            'key': self.key,
        }
        res = self._post(BASE_V2 + 'busqueda.ashx', params)
        return res.get('equipos', [])

    def buscar_categorias(self, query: str, skip: int = 0) -> List[Dict[str, Any]]:
        """Busca torneos o categorías por nombre (ej: 'MINI', 'FEDERAL', 'U13')."""
        params = {
            'accion': 'buscarCategoria',
            'texto': query,
            'skip': skip,
            'id_dispositivo': self.id_dispositivo,
            'key': self.key,
        }
        res = self._post(BASE_V2 + 'busqueda.ashx', params)
        return res.get('categorias', [])

    def get_equipo_detalle(self, opaque_team_id: str) -> Dict[str, Any]:
        """Obtiene detalles estadísticos acumulados de un equipo."""
        params = {
            'accion': 'detalleEquipo',
            'id_equipo': opaque_team_id,
            'id_dispositivo': self.id_dispositivo,
            'key': self.key,
        }
        res = self._post(BASE_V2 + 'equipo.ashx', params)
        return res.get('equipo', {})

    def get_equipo_fases_grupos(self, opaque_team_id: str) -> Dict[str, Any]:
        """Obtiene el árbol de fases, grupos y rondas en las que participa el equipo."""
        params = {
            'accion': 'fasesGrupos',
            'id_equipo': opaque_team_id,
            'id_dispositivo': self.id_dispositivo,
            'key': self.key,
        }
        return self._post(BASE_V2 + 'equipo.ashx', params)

    def get_equipo_jugadores(self, opaque_team_id: str) -> List[Dict[str, Any]]:
        """Obtiene el plantel del equipo con sus promedios estadísticos individuales."""
        params = {
            'accion': 'jugadores',
            'id_equipo': opaque_team_id,
            'id_dispositivo': self.id_dispositivo,
            'key': self.key,
        }
        res = self._post(BASE_V2 + 'equipo.ashx', params)
        return res.get('misjugadores', [])

    def get_jugadora_detalle(self, opaque_player_id: str) -> Dict[str, Any]:
        """Obtiene perfil completo + PuntosTotales de una jugadora via detalleJugador."""
        params = {
            'accion': 'detalleJugador',
            'id_jugador': opaque_player_id,
            'id_dispositivo': self.id_dispositivo,
            'key': self.key,
        }
        res = self._post(BASE_V2 + 'jugador.ashx', params)
        return res  # contiene 'jugador', 'equipo', 'equiposJugador'

    def get_partido_stats(self, id_partido: str) -> Dict[str, Any]:
        """Obtiene boxscore completo de un partido (stats individuales por jugadora)."""
        params = {
            'accion': 'estadisticasPartido',
            'id_partido': id_partido,
            'id_dispositivo': self.id_dispositivo,
            'key': self.key,
        }
        return self._post(BASE_V2 + 'envivo/estadisticas.ashx', params)

    def get_partido_pbp(self, id_partido: str) -> Dict[str, Any]:
        """Obtiene el Play-by-Play completo de un partido (historialacciones)."""
        params = {
            'id_partido': id_partido,
            'id_dispositivo': self.id_dispositivo,
            'key': self.key,
        }
        return self._post(BASE_V2 + 'envivo/partido.ashx', params)

    def get_categoria_fases_grupos(self, opaque_cat_id: str) -> Dict[str, Any]:
        """Obtiene la estructura de fases y grupos de una categoría."""
        params = {
            'accion': 'fasesGrupos',
            'id_categoria_competicion': opaque_cat_id,
            'id_dispositivo': self.id_dispositivo,
            'key': self.key,
        }
        return self._post(BASE_V2 + 'categoria.ashx', params)

    def get_categoria_horarios_jornadas(self, category_id, phase_id, group_id):
        """Fixture canónico: IDs del árbol de buscarCategoria, no del equipo."""
        return self._post(BASE_V2 + 'categoria.ashx', {
            'accion': 'horariosJornadas',
            'id_categoria_competicion': category_id,
            'id_fase': phase_id, 'id_grupo': group_id,
            'id_dispositivo': self.id_dispositivo, 'key': self.key,
        })

if __name__ == "__main__":
    client = CABBApiClient()
    print("[OK] CABB API Client inicializado con exito.")
    print("Sesión registrada (credenciales ocultas).")
    
    equipos = client.buscar_equipos("BERAZATEGUI")
    print(f"\nEquipos de Berazategui encontrados: {len(equipos)}")
    for eq in equipos[:3]:
        print(f" - {eq.get('Nombre')} | {eq.get('Categoria')} ({eq.get('Competicion')})")
