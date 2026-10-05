# CABB / NextLevel — integración validada, 5 de octubre de 2026

El recorrido aportado por BOB fue verificado contra la API real. Se sincronizaron 105 registros individuales en Supabase, correspondientes a 22 partidos AFMB del equipo, y se actualizaron los cinco resúmenes de stats_seasons. Repetir el upsert mantuvo exactamente 105 filas y todas las identidades player_id + cabb_partido_id siguieron siendo únicas.

## Recorrido comprobado

1. buscarCategoria en /v2/busqueda.ashx, texto INFANTILES FEMENINO. Seleccionar NombreCompeticion = FORMATIVAS 2026 y NombreDelegacion = ASOCIACIÓN FEMENINA METROPOLITANA DE BÁSQUETBOL. IdCompeticionCategoria numérico = 5107; para consultar se utiliza el Id opaque de ESTA respuesta.
2. fasesGrupos en /v2/categoria.ashx, id_categoria_competicion = categoría['Id']. Recorrer listaFasesGrupo / IdFase / Grupos / IdGrupo.
3. horariosJornadas en /v2/categoria.ashx, con id_categoria_competicion, id_fase e id_grupo del mismo árbol. Devuelve partidos con IdPartido, IdPartidoNotificacion, Fecha, Estado, NumeroJornada y Resultados.
4. estadisticasPartido en /v2/envivo/estadisticas.ashx, id_partido = fixture['IdPartido']. La ruta anterior /v2/partido.ashx era incorrecta.
5. Play-by-play en /v2/envivo/partido.ashx, id_partido de ese mismo fixture. Los eventos están en envivo.historialacciones.

Los opaque IDs son referencias de sesión para consultar. Se guarda IdPartidoNotificacion como cabb_partido_id: así una sesión nueva no produce duplicados. Nunca se mezclan IDs obtenidos desde el árbol del equipo con el árbol de la categoría.

## Partido Berazategui–Obras

ID estable 644845, segunda etapa / INTERCONFERENCIA A / jornada 11. El fixture confirmó 04/10/2026 12:30, local Berazategui, resultado 46–65. Coincide con las capturas aportadas.

Mía: 5 PTS, 5 REB (2 defensivos + 3 ofensivos), 0 AST, 2 recuperos, 3 pérdidas, 3 faltas, valoración 5 y 20:00 minutos. Dobles 2/6, triples 0/0, libres 1/3. El boxscore también entrega masMenos = -17, pero todavía no se añadió una columna nueva a game_log para ese dato.

El parser lee estadisticas.estadisticasequipolocal o estadisticasequipovisitante y excluye TOTALES. tiro1p/tiro2p/tiro3p son intentos totales; canasta1p/2p/3p son conversiones. Se comprobaron conversiones + fallados = intentos y la identidad puntos = TL + 2*2P + 3*3P. Minutos se calculan a partir de milisegundos_jugados, sin estimarlos. Se conservan ceros y faltantes por separado y no se cuentan jugadoras con cero tiempo y ninguna acción como partidos jugados.

## Cobertura y cálculos

| Jugadora | Boxscores sincronizados | PJ oficial |
| --- | ---: | ---: |
| Mía | 21 | 21 |
| Martina | 22 | 22 |
| Catalina | 20 | 20 |
| Luba | 21 | 21 |
| Alma | 21 | 21 |

Para Alma se agregó el alias histórico exacto ALMA, SMIGIEL, confirmado en actas de Berazategui con dorsal 12; no se utiliza coincidencia genérica de apellido.

Mía temporada: 178 puntos en 21 partidos; 8,5 PPG, 4,5 RPG, 0,3 APG, 1,8 recuperos por partido y 18,9 MPG al redondear a un decimal. Últimos cinco: 7,4 PTS, 4,4 REB, 0,6 AST y 1,4 recuperos. Esos promedios, tendencias y porcentajes son Cálculo NextLevel desde boxscores CABB.

El esquema existente redondea algunos valores a un decimal. FG%, 2P%, 3P%, TL%, eFG%, TS% y AST/PER se calculan desde sumas de intentos/conversiones. No se promedian porcentajes por partido. El cache de temporada solo se completa desde boxscores cuando su conteo coincide con PJ oficial. stats_seasons no tiene t2_pct, t3_pct ni fg_pct; esos porcentajes se calculan en el perfil, sin escribir columnas inexistentes.

## Resultados diferentes entre fixture y acta

Cinco encuentros muestran marcadores de 20–0 / 0–20 en el fixture, diferentes de los tanteos del acta. Se conserva el resultado del fixture para resultado_eq y ganado, y las estadísticas individuales del acta para rendimiento. No se presume el motivo administrativo del cambio. El sync emite una advertencia y la exportación JSON conserva ambos resultados para auditoría.

IDs: 539669, 539674, 539697, 539702 y 644803. Antes de usar victorias/derrotas en análisis derivados, tener en cuenta esta distinción.

## Play-by-play

Se verificaron 650 eventos para Obras. Hay numero_periodo, tiempo_partido, accion_tipo, componente_id numérico, equipo_id, dorsal, posicion_x, posicion_y, zona, puntos_local, puntos_visitante, padre_id e informacion_adicional, además de flags de eliminación/publicación.

Los eventos de Mía reconcilian 2 canastas de dos, 4 tiros de dos fallados, 1 libre convertido y 2 libres fallados; también 5 rebotes, 2 recuperos, 3 pérdidas y 3 faltas. Hay coordenadas no nulas en tiros de campo. Las posiciones 0,0 de eventos no espaciales no se interpretan como tiros en una esquina.

La escala, orientación y dimensiones de las coordenadas aún requieren validación antes de dibujar un mapa. No se implementaron +/- derivado, quintetos ni posesiones. El PBP no fue persistido masivamente en Supabase; se guardó un inventario y ejemplos del partido en cabb_pbp_inventory_644845.json.

## Archivos y pruebas

- cabb_app_api.py: ruta correcta de boxscore y método horariosJornadas.
- cabb_games.py: selección canónica, descubrimiento completo, IDs estables y normalización validada.
- sync_cabb_supabase.py: validación de todas las filas antes de escribir, upsert por ID estable, resúmenes y alias histórico.
- inspect_cabb.py: resolver --match-id mediante IdPartidoNotificacion en una sesión nueva.
- nextlevel_performance.js y perfil_mia_sanchez_14.html: porcentajes con cobertura completa, últimos cinco, último partido y explicación actualizada de las coordenadas.
- requirements.txt y .github/workflows/sync_cabb.yml: dependencia reproducible y manifiesto para el cache del workflow.
- test_nextlevel.py y cabb_boxscore_obras_644845.json: regresión sobre una respuesta real, filtrado de TOTALES, tiros, faltantes, ceros y recorrido de IDs.
- cabb_match_target_2026-10-04.json: referencia ahora verificada por API.
- cabb_sync_proof_2026-10-05.json: conteos, resúmenes y prueba de idempotencia, sin credenciales.

13 pruebas automatizadas aprobadas. Dry-run completo aprobado; sync real de 105 filas aprobado; lectura posterior y repetición sin duplicados aprobadas. En navegador local: Mía mostró cobertura 21/21, partido Obras, últimos cinco vs temporada y último PJ = 5 PTS; Martina mostró estadísticas reales. Se conservaron y compararon el código de navegación y las funciones de physical_test_results. No se modificaron login.html ni las funciones de Estado Físico.

## Pendientes

- Validar visualmente escala/orientación de coordenadas para shot map; modelar almacenamiento y análisis de PBP si se decide avanzar.
- Integrar Federal por separado con el mismo protocolo, sin mezclar torneos o temporadas.
- Prueba autenticada de login, registro/edición física y exportación; revisión mobile completa.
- Publicar los cambios locales del frontend/workflow cuando corresponda. No se hicieron commit, push ni despliegue en esta sesión. Los datos de Supabase sí fueron actualizados.
- Las páginas de dossier/plan heredadas fuera de los perfiles conservan su contenido previo.
