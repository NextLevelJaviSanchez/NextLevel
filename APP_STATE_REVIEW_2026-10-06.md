# Estado funcional de NextLevel — 6 de octubre de 2026

## Alcance y conclusión

Revisión del repositorio local, las pantallas principales, lecturas de datos disponibles y comprobaciones automatizadas. No se realizó auditoría de seguridad, permisos, políticas, credenciales ni exposición de datos. No se enviaron mensajes, no se cargaron registros personales de prueba y no se modificaron datos de producción.

La aplicación tiene una base funcional consistente para el seguimiento de Mía: estadísticas oficiales, evolución por partido, hitos, comparación con el equipo, perfil y autoseguimiento. Todavía conviven varias generaciones de páginas. El producto completo para todas las jugadoras y el circuito coach-jugadora están incompletos.

## Evidencia de la revisión

- 41 páginas HTML y 53 scripts inline examinados; 4 archivos JavaScript examinados. Sin errores de sintaxis. Los 22 tests automatizados pasan.
- Navegación de las 7 pestañas de Mía y 6 pestañas de Martina comprobada en navegador, sin errores de ejecución observados.
- Comprobación de Mía en viewport móvil de 390×844: sin desbordamiento horizontal del documento detectado en las seis pestañas de detalle. No equivale a validar todos los dispositivos ni todas las interacciones.
- Pantalla de login comprobada visualmente/por estructura, sin iniciar una sesión nueva. Flujo autenticado pendiente.
- Lectura de Supabase: 130 game_logs oficiales (105 AFMB, 25 Federal), para 5 jugadoras; 10 filas stats_seasons para 2026. Última fecha de partido disponible: 04/10/2026.
- Mía: 21 PJ AFMB y 5 Federal; Martina: 22 AFMB y 5 Federal. Los otros tres perfiles tienen también resumen de ambos torneos.
- Snapshot del mapa: 27 actas auditadas, 26 reconciliadas para Mía, 256 tiros de cancha. Una acta no contiene fila individual inequívoca de Mía.
- Snapshot del TOP: 27 actas disponibles del equipo (22 AFMB y 5 Federal). Se calcula sobre el plantel de las actas, no solamente sobre las cinco jugadoras de NextLevel.
- Lecturas de physical_test_results, evaluations, messages y photos responden. Algunas lecturas no autenticadas devuelven cero filas: eso no permite afirmar que las tablas estén vacías para usuarios autenticados.
- Página publicada de Mía accesible, diferente del archivo local; incluye Evolución real y no incluye el nuevo script nextlevel_plan_progress.js. No se publicó nada durante esta revisión.

## Estado por área

| Área | Estado | Observación |
|---|---|---|
| Inicio de Mía | Funcional | Datos oficiales y resumen; aún combina torneos en parte de las tendencias. |
| Rendimiento | Funcional | Historial, porcentajes, últimos cinco, hitos y TOP con mínimo 50% de PJ. |
| Mapa de calor | Funcional con limitación | Datos y colores correctos según umbrales; geometría de zonas esquemática, no calibrada oficialmente. Z1 se presenta como zona pintada por indicación del usuario. |
| Evolución | Funcional | Gráfico por partido, filtro AFMB/Federal, seis métricas y comparación de bloques completos. Federal requiere más partidos para comparar 5 vs 5. |
| Perfil | Funcional con QA pendiente | Posición elegida por jugadora, áreas técnicas/mentales múltiples, sueño separado y guardado. Falta validar foto y edición real entre dispositivos. |
| Tips mentales | Funcional | Selecciones en Perfil; prácticas y tarjetas en Mi Plan. No hay pestaña Mental. |
| Autoseguimiento | Implementado localmente | Registros fechados, tiros de entrenamiento, reflexión y resumen semanal. Lectura de Supabase y guardado/reintento simulado comprobados. Escritura personal real y recarga en otro dispositivo pendientes. |
| Plan técnico | Necesita revisión | Fases antiguas, afirmaciones de habilidades no evaluadas y textos de recruiting aún visibles. |
| Análisis Coach | Parcial | Resumen automático real; todavía no genera un perfil estadístico estructurado con áreas de mejora individualizadas. |
| Evaluación técnica del coach | Parcial | El perfil lee coach_eval_v1; falta un circuito de edición y seguimiento integrado con el coach. |
| Mensajes | Fragmentado | Existen en admin e intake de Mía; no están integrados en el perfil/Mi Plan. |
| Estado Físico | Funcional en el perfil, integración pendiente | Mía usa physical_test_results; evaluación física v2 y admin usan evaluations. |
| Otras jugadoras | Versiones anteriores | Martina tiene historial actualizado, pero conserva gráficos/textos anteriores; Catalina, Luba y Alma entran a dossiers premium. |
| Publicación | Desfasada respecto del local | El nuevo autoseguimiento no está en la versión publicada consultada. |

## Hallazgos prioritarios

### 1. Unificar la experiencia para todas las jugadoras

login.html dirige a Mía y Martina a perfiles, pero a Catalina, Luba y Alma a dossiers premium. Martina aún muestra mapas vacíos, proyecciones manuales y etiquetas de habilidades/edad estáticas. Las mejoras de Mía dependen de IDs y algunos nombres específicos. No se pueden activar los módulos en otra jugadora solamente cambiando el enlace.

Propuesta: un perfil compartido parametrizado por jugadora, con la misma navegación y fuentes de datos. Conservar las páginas anteriores como histórico y definir una entrada principal. index.html actualmente redirige al intake genérico, no al login: es una decisión de flujo que debe acordarse.

### 2. Completar el circuito del coach

El análisis automático describe puntos/minutos, porcentajes y asistencias/pérdidas. No produce todavía el perfil solicitado con evidencia, fortalezas, prioridades y siguiente acción personalizada. Hay avisos duplicados de evaluación pendiente y ejercicios de tiro preescritos que no constituyen asignaciones reales del coach.

El perfil consulta player_data con módulo coach_eval_v1. El panel admin tiene evaluaciones físicas y mensajería, pero no se encontró un editor de ese módulo ni lectura del nuevo progreso plan_progress_v1. Los mensajes y respuestas existen en admin/intake, y deben reutilizarse tras verificar su contrato funcional, no crear una segunda conversación paralela sin integración.

Propuesta: integrar una devolución fechada, prácticas asignadas, progreso de la jugadora y mensajes; mantener el resumen automático identificado como Cálculo NextLevel. Evitar presentar propuestas genéricas como observaciones del entrenador.

### 3. Revisar Mi Plan para una deportista en formación

Se corrigió el objetivo principal, pero quedan fases “Ahora → Jun 2026”, referencias a NCAA/Liga Nacional, un bloque “Perfil Recruiting (2027+)”, scouting y selección como supuesto objetivo natural. También hay textos que afirman habilidades ya consolidadas sin evaluación guardada.

Propuesta: reemplazar fases vencidas por ciclos cortos acordados con el coach, con objetivos de aprendizaje y disfrute; quitar el recruiting impuesto. Un sueño elegido por la jugadora en Perfil es distinto de exigir esa trayectoria en su plan.

### 4. Unificar fuentes de foto y evaluación física

Mía guarda su foto en player_data/foto_url; admin y evaluacion_fisica_v2 consultan photos. El resultado de subir una foto en un recorrido puede no aparecer en el otro. Mía usa physical_test_results para tests; evaluación física v2 y admin usan evaluations. No se encontró una sincronización que resuelva esa diferencia.

Propuesta: definir una fuente canónica y una migración de lectura antes de cambiar escrituras. No borrar ni sobrescribir evaluaciones existentes.

### 5. Automatizar TOP y mapa junto al sync

El workflow ejecuta sync_cabb_supabase.py para AFMB y Federal. No ejecuta collect_cabb_team.py ni collect_cabb_shots.py ni publica sus snapshots. Por lo tanto, los game_logs pueden actualizarse mientras el TOP/mapa permanecen en la extracción anterior.

Propuesta: generar y validar snapshots en el mismo ciclo, con fecha/cobertura visibles y publicación definida. Verificar una ejecución real del workflow; leer el YAML no confirma que el cron haya corrido exitosamente.

### 6. Revisar el acta de Lanús del 08/03/2026

El historial de Mía muestra resultado del equipo 20–0 y un doble-doble 11 PTS/11 REB. El snapshot del plantel para el mismo partido (539669) suma 84 puntos individuales. Hay una diferencia entre resultado publicado y producción del acta, potencialmente administrativa; esta revisión no confirma su motivo.

Propuesta: comprobar el acta/cierre oficial y explicar el contexto del resultado. No eliminar automáticamente estadísticas ni el logro. La reconciliación de tiros individuales con el boxscore no valida por sí sola la coherencia del marcador del equipo.

### 7. Cerrar la validación de persistencia y salida

Se probaron guardado y reintento del nuevo progreso con un adaptador simulado y se comprobó lectura real desde Supabase. Falta una práctica real, recarga y consulta desde otro dispositivo; también comprobar foto, posición, medidas, objetivos y evaluación física con sesión real.

El autoseguimiento permite agregar y reintentar; no permite todavía corregir o anular una práctica ingresada por error. El historial muestra las diez más recientes y conserva todos los registros cargados para el resumen semanal.

Exportación PDF: sigue pendiente revisar qué secciones entran al reporte con las nuevas tarjetas, el mapa y el seguimiento. No se verificó impresión ni exportación durante esta auditoría.

### 8. Resolver mantenimiento y estados de interfaz

Se encontró un enlace local inexistente en dossier_mia_sanchez_14_bera_u13_2026.html: ../bera_u13_scout_index.html, aunque el destino está en la misma carpeta. README y algunos informes describen una arquitectura y pendientes ya superados.

Algunas cargas antiguas convierten fallos de consulta en listas vacías; el usuario podría ver “sin datos” cuando en realidad falló la carga. En el panel admin, loadAll toma data o [] sin gestionar cada error. En el perfil, loadCoachEval no distingue error de lectura de ausencia de evaluación.

En Martina, la comparación puede mostrar una flecha con cambio “0.0” por diferencias pequeñas redondeadas: debe presentarse como estable al nivel de precisión mostrado.

## Orden sugerido de cierre

1. Revisar el acta de Lanús y definir el tratamiento del resultado administrativo.
2. Limpiar el plan técnico: lenguaje formativo, fechas actuales y prácticas acordadas.
3. Completar análisis estadístico del perfil y el circuito coach/plan/progreso/mensajes.
4. Unificar fuentes de foto y tests físicos, y comprobar persistencia real entre dispositivos.
5. Actualizar snapshots junto al sync y completar una publicación verificable.
6. Extender la experiencia nueva a todas las jugadoras mediante una plantilla común.
7. Validar exportación, recuperación de errores y recorridos completos.

## Límites de esta revisión

No valida seguridad ni afirma que los accesos sean correctos. No valida sesiones reales de jugadora/coach, ni envíos de mensajes, ni nuevas escrituras reales. La disponibilidad y cobertura mencionadas corresponden a las lecturas efectuadas y archivos locales de esta fecha; no se hizo una nueva extracción completa de CABB. No se modificó código de la aplicación durante la revisión; únicamente se generó este informe.
