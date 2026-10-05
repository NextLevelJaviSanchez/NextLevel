# Integración Federal CABB — 5 octubre 2026

Categoría oficial: LA LIGA FEDERAL INFANTILES FEMENINA / FORMATIVAS / CONFEDERACIÓN ARGENTINA DE BASQUETBOL. IdCompeticionCategoria 5597. Equipo DEP. BERAZATEGUI, IdEquipoNotificacion 114258, temporada 2026.

Se recorrieron todos los grupos de las tres fases con el árbol canónico por categoría. Cinco partidos terminados del equipo: 694869 (15/09), 694872 (16/09), 694874 (17/09), 696858 (26/09), 696856 (27/09). Boxscores completos con minutos, tiros, rebotes, asistencias, recuperaciones, pérdidas, faltas y valoración; todos reconciliaron sus conteos. Sin discrepancias de resultado entre fixture y acta en estos cinco partidos.

Supabase: 25 filas oficiales del Federal, cinco por jugadora, y cinco resúmenes stats_seasons. Los PJ coinciden con los del plantel oficial. AFMB conserva sus 105 filas: 130 filas totales, claves únicas. Repetir el upsert no creó duplicados. Mía: 34 puntos, 6.8 PPG, 3.6 RPG, 0.2 APG, 1.2 recuperaciones, 19.0 minutos según redondeo del resumen.

Cambios: cabb_games.py admite categoría y etiqueta independientes; sync_cabb_supabase.py agrega --tournament y búsqueda paginada del equipo; nextlevel_performance.js identifica el torneo en cada partido; .github/workflows/sync_cabb.yml ejecutará ambos torneos; test_nextlevel.py agrega comprobación de separación y totales reales. Evidencia sin credenciales: federal_sync_verified.json y federal_sync_proof.json.

Validación: 14 pruebas aprobadas (incluye sintaxis de perfiles, navegación y Estado Físico conservados), git diff --check limpio, lectura posterior de Supabase e idempotencia verificadas. El selector existente filtra Federal CABB y AFMB y calcula últimos cinco sobre la selección. Todos los torneos combina ambos explícitamente.

Pendiente: publicación del código y workflow; verificación visual en navegador/celular después de esta integración; PBP Federal y mapas de tiros no fueron incorporados en esta etapa. Login y physical_test_results no se modificaron.

Ejecutar: python sync_cabb_supabase.py --tournament "Federal CABB"
