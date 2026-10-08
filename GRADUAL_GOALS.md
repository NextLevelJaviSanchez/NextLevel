# Objetivos graduales

Integración en `perfil_mia_sanchez_14.html` y `perfil_milo_sanchez_u11.html`, las dos plantillas compartidas utilizadas por `perfil.html`. El módulo nuevo conserva los objetivos técnicos y manuales existentes.

Mini usa el mismo motor y el adaptador `nextlevel_mini_goals.js`. Ofrece metas de tiros libres y dobles cuando se eligen esas áreas, participación por debajo de 20 minutos y práctica según preferencias. Se conecta después de verificar la cuenta del jugador. Lee actas individuales de la temporada guardadas para ese perfil y `game_log` de FEBAMBA Mini, sin duplicar partidos; la nube prevalece sobre el snapshot. No usa los ceros de métricas cuya cobertura no está confirmada. Los desafíos de práctica existentes se conservan. Las felicitaciones aparecen en Inicio y Mi Plan.

## Catálogo por preferencias

`nextlevel_goal_catalog.js` relaciona las selecciones de Perfil con objetivos. Defensa propone práctica y recuperos donde hay cobertura. Manejo propone práctica y pérdidas; pases, práctica/asistencias/pérdidas; rebotes, práctica y rebotes; tiro libre, práctica y efectividad; cerca del aro, práctica y dobles; tiro exterior, práctica y triples según rol. Ambas manos, movimiento sin pelota, coordinación, físico y cada área mental tienen una consigna de práctica propia. Sin preferencias no se muestran metas comunes de tiro. Las metas activadas previamente se conservan aunque cambie la selección.

Las prácticas avanzan en bloques de 3, 4 y 5 días distintos, contando únicamente registros de `player_training` guardados en la nube, posteriores a la activación, con el área correspondiente y fechas válidas. Cada etapa requiere días nuevos. La felicitación reconoce constancia registrada por el jugador; no certifica dominio técnico ni una evaluación del coach. Las observaciones defensivas estructuradas del esquema propuesto todavía requieren desarrollo.

El perfil comunica cambios al motor y al formulario de prácticas. Guardar una práctica dispara una evaluación y la felicitación en Inicio después del guardado del logro. Los registros aún pendientes de sincronización no generan logros confirmados.

## Criterios

- Activación voluntaria de hasta dos objetivos estadísticos activos, contando todos los torneos de la temporada cargada.
- Base: cinco partidos recientes del mismo torneo y temporada, fuente `cabb_api`, sin duplicados ni registros de no participación explícita. No se infiere una ausencia desde estadísticas de cero puntos.
- Participación: U11 y U13 usan referencia de 20 minutos. U15 y categorías superiores no tienen techo automático de 20: el coach define `participationReferenceMinutes` en su evaluación, según categoría y rol. Bajo 5 minutos, +1; entre 5 y menos de 15, +2; desde 15, +1 hasta la referencia aplicable. Evaluación con cinco partidos nuevos. La categoría desconocida no recibe una referencia automática.
- La meta guarda su categoría y referencia. Las metas antiguas sin ese contexto en categorías superiores quedan pausadas para revisión; el coach puede reformularlas después de acordar la referencia. Los logros se conservan. Las tasas por 20 minutos siguen siendo una unidad de comparación y no un límite de participación.
- Recuperos: +10% de tasa por 20 minutos, mínimo incremento de 0,1; requiere cinco partidos y 50 minutos acumulados. No se propone en Mini sin cobertura.
- Libres: mínimo 20 intentos, paso de 3 puntos porcentuales. Dobles: 30 intentos, paso de 2 puntos. Triples: 25 intentos, paso de 2 puntos. Límite 100%.
- Rebotes y asistencias: mejora del 5%, mínimo 0,1 por 20 minutos. Pérdidas: reducción del 5%, mínimo 0,1 por 20 minutos; límite cero.
- Asistencias también exige que la tasa de pérdidas no supere la base.
- Las métricas requieren datos completos; valores ausentes o inconsistentes no se transforman en cero.
- Evaluación al abrir el perfil: cinco partidos posteriores a la base. Si faltan intentos, el bloque se extiende con los partidos posteriores disponibles. Si faltan estadísticas, queda pendiente. Si la meta no se cumple, permanece activa y se evalúa el siguiente bloque reciente.
- Al cumplirse, se guarda primero la evidencia y luego se muestra la felicitación en Inicio y Mis logros en Mi Plan.
- El siguiente paso se activa con un botón y usa el resultado logrado como nueva base; los partidos anteriores no vuelven a contar. No se sube la dificultad automáticamente ni se exige una meta superior al límite.
- Pausar detiene las evaluaciones. Al retomar se consideran los partidos posteriores a la base, incluidos los jugados durante la pausa.

## Persistencia

Se utiliza `player_data`, con módulo `gradual_goals_v1:<temporada>:<torneo codificado>:<métrica>`. Cada registro conserva etapa, base, meta, límite cronológico, estado, evaluación y lista de logros con fecha y partidos de evidencia. No requiere nuevas tablas ni reemplaza `obj_estados_v1`.

Las actualizaciones comparan `updated_at` para rechazar modificaciones concurrentes del mismo objetivo. Un error de lectura o escritura muestra un aviso y permite reintentar recargando. No se anuncia un logro como guardado cuando falla la persistencia. El máximo de dos objetivos se controla en la interfaz; no es una restricción transaccional entre dispositivos.

Los logros guardados conservan su evidencia histórica. Una corrección posterior de un acta no revoca automáticamente un logro ya obtenido.

## Validación

`node test_gradual_goals.cjs`: 16 casos del motor y dos comprobaciones de interfaz con nube simulada. Cubre etapas, muestras, datos faltantes, torneos, minutos, pausas, dirección de mejora, condición de pérdidas, límites y guardado fallido. Las pruebas no escriben datos reales de jugadores.

`node test_mini_goals.cjs`: nueve comprobaciones del adaptador Mini, con fechas y temporadas, identidad ambigua, partidos terminados, formatos actuales y antiguos, campos faltantes, progresión y conexión para otro jugador.
