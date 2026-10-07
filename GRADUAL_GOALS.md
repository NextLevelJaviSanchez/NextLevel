# Objetivos graduales

Integración en `perfil_mia_sanchez_14.html`, plantilla utilizada por `perfil.html` para los perfiles con estadísticas detalladas. El módulo nuevo conserva los objetivos técnicos y manuales existentes. Mini mantiene su flujo actual: sus actas no proporcionan las métricas completas requeridas por este motor.

## Criterios

- Activación voluntaria de hasta dos objetivos estadísticos activos, contando todos los torneos de la temporada cargada.
- Base: cinco partidos recientes del mismo torneo y temporada, fuente `cabb_api`, sin duplicados ni registros de no participación explícita. No se infiere una ausencia desde estadísticas de cero puntos.
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
