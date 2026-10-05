> Actualización: el bloqueo del calendario se resolvió y el sync real terminó. Ver [CABB_FIXTURE_VALIDATION.md](CABB_FIXTURE_VALIDATION.md). El texto siguiente conserva el diagnóstico histórico previo.

# Validación NextLevel Player — 5 de octubre de 2026

Se trabajó sobre un repositorio inicialmente limpio, sin tocar login.html, navegación ni las funciones y paneles de Estado Físico/physical_test_results.

## Respuestas verificadas

- Registro de dispositivo, buscarEquipo, jugadores, detalleEquipo, detalleJugador y fasesGrupos respondieron correctamente dentro de la misma sesión.
- AFMB 2026 / Infantiles Femenino: Mía tiene 21 PJ, 178 puntos y 8,5 PPG en detalleJugador. El plantel entrega promedio de minutos; stats_seasons existente tiene 18,9 MPG. El cero de minutos de detalleJugador no reemplaza el valor del plantel.
- detalleJugador no entregó campos de intentos/conversiones, rebotes o asistencias. No se inventan porcentajes.
- fasesGrupos entrega listaFasesGrupo, Grupos y Rondas vacías, sin partidos. Las acciones exploradas de calendario/partidos devolvieron Faltan parámetros. No se habilita un endpoint nuevo a partir de esa suposición.
- Los IDs opaque cambian entre sesiones: no reutilizar IDs guardados de otra sesión. Falta validar una clave estable de partido para una sincronización idempotente.
- Consulta de lectura game_log devuelve cero filas con la clave disponible; podría depender de RLS. stats_seasons sí devuelve filas reales.
- stats_seasons tiene tl_pct, efg_pct, ts_pct y promedios básicos, pero no t2_pct, t3_pct ni fg_pct. Los porcentajes por tipo se calculan en la interfaz desde intentos cuando existen boxscores.
- estadisticasPartido y historialacciones NO validados con un partido real. Una consulta sin ID no sirve como evidencia de disponibilidad: boxscore falló y PBP devolvió error con historialacciones vacío dentro de envivo.

## Cambios

- Cliente CABB: falla explícitamente ante errores de conexión/registro; no imprime credenciales.
- Sync: selección exacta de equipo/temporada/federación, nombres exactos, exclusión de IDs genéricos Opaque del descubrimiento, deduplicación, game_log antes de resúmenes, rechazo de respuestas desconocidas y fechas fuera de temporada. Faltantes son NULL; cero no es ausencia; minutos mm:ss y booleanos textuales se interpretan.
- Resúmenes: no reemplaza campos existentes con nulos. Deriva métricas de game_log únicamente si el conteo de partidos únicos coincide con PJ oficial. Porcentajes ponderados por intentos; eFG%, TS% y AST/PER requieren sus componentes.
- SUPA_URL y SUPA_KEY se leen del entorno; el workflow ya aporta estas variables. No se escribieron datos de producción ni se aplicó migración SQL.
- Mía y Martina: bloque compartido de últimos partidos y últimos 5 vs temporada, filtro por torneo, detalle individual, consulta paginada y estados vacíos/error. Se conservan contenedores, estilos y navegación.
- Mía: temporada aplicada al historial, nulos conservados, MPG combinado ponderado por PJ, evolución 5 vs 5 requiere diez partidos y el histórico 2026 del gráfico se carga desde Supabase.
- Martina: KPIs conectados a resúmenes; se retiran percentiles nacionales, On/Off y coordenadas inventadas. Proyección futura punteada, sin datos ficticios para 2026.
- Leyenda distingue Dato CABB / Cálculo NextLevel / Coach / Objetivo / Proyección. Puntuaciones sin evidencia se muestran sin evaluación.

## Pruebas

9 pruebas automatizadas aprobadas; dry-run real de only-stats aprobado para las cinco jugadoras mapeadas. No se escribieron datos de producción.

`python -B test_nextlevel.py` (requiere Node disponible; NEXTLEVEL_NODE permite indicar su ubicación).

Incluye valores faltantes/cero, porcentajes ponderados, eFG/TS, AST/PER, nombres no ambiguos, descubrimiento y deduplicación, rechazo de respuestas inválidas, parser con fixture sintético explícito, preservación de estadísticas existentes, sintaxis Python/JavaScript y comparación de navegación/Estado Físico contra HEAD inicial. La comparación contra HEAD es una verificación de esta revisión, no reemplaza pruebas de navegador.

`python -B inspect_cabb.py --output cabb_inspection.json` guarda un inventario real sin key/id_dispositivo ni fotos. No escribe en Supabase.

`python -B sync_cabb_supabase.py --dry-run --only-stats` permite probar los resúmenes. El sync completo falla expresamente si no puede descubrir partidos, en vez de anunciar éxito con cero boxscores.

## Pendientes concretos

1. Capturar el endpoint/parámetros reales de calendario de la app o una respuesta con partidos de la misma sesión. Los IDs externos pasados a --match-id pueden no servir después de registrar otro dispositivo.
2. Validar estadisticasPartido real y adaptar el parser a sus claves comprobadas. El parser actual conserva compatibilidad con una estructura supuesta y la rechaza si no coincide; los tests sintéticos no validan la API.
3. Validar historialacciones de un partido conocido y comprobar coordenadas/sustituciones/posesiones antes de shot map, +/-, quintetos u On/Off.
4. Verificar clave estable, columnas/constraints y políticas de escritura de game_log; completar sync de producción y comprobar recarga/idempotencia. No hay game logs reales nuevos en esta entrega.
5. Validar visualmente en navegador con sesión real: login, navegación, ambos perfiles, carga/error/vacío, mobile, exportación y Estado Físico. Se comprobó en navegador local la carga de ambos perfiles contra Supabase, el estado sin partidos, la navegación a Rendimiento/Progresión y el acceso a Estado Físico de Mía, sin errores de consola. Pendientes: sesión autenticada, escrituras físicas, mobile y exportación.
6. Las páginas de dossier/plan heredadas fuera de los dos perfiles siguen teniendo referencias estáticas; no fueron modificadas en esta integración.

## Partido de referencia aportado por el usuario

Las capturas de la app CAB confirman AFMB / Infantiles Femenino / Formativas 2026, segunda etapa, jornada 11: Berazategui local 46–65 Obras el 4 de octubre de 2026 a las 12:30. Parciales: Berazategui 15/13/9/9; Obras 14/25/12/14. El nombre de grupo aparece truncado como INTERCONFERE...; no se confirma su sufijo. Referencia guardada en cabb_match_target_2026-10-04.json, marcada como captura aportada por el usuario y no como respuesta API. No contiene ID de partido ni estadísticas individuales.

La consulta del calendario con el contexto de equipo/categoría/competición/temporada/fase/grupo sigue devolviendo Faltan parámetros. Todavía falta identificar la llamada exacta o conseguir el enlace/ID del encuentro para validar boxscore y play-by-play. No se cargó este resultado manualmente en game_log ni se escribieron datos en Supabase.
