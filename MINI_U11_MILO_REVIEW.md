# Primera prueba Mini U11 — Milo Sánchez

Fuente comprobada: SANCHEZ, MILO BASTIAN, Quilmes Atlético Club, MINI MASCULINO / FORMATIVAS 2026, FeBAMBA. Equipo estable 95730. Se encontraron 23 partidos terminados y se consultaron las tres actas más recientes por fixture canónico de categoría.

Las actas contienen puntos, minutos y tiros. Rebotes, asistencias, recuperos y tapones aparecen en cero en las tres muestras. No se confirma cobertura de esos conteos; no se extraen conclusiones de habilidad ni se generan rankings, mapas o percentiles. El resumen de equipo/jugador devuelve además campos no disponibles, como PuntosTotales=-1, que no se presenta como estadística válida. Dorsal 5 en las tres muestras.

Perfil de prueba: perfil_milo_sanchez_u11.html. Inicio centrado en formación, desafío corto, preferencias y posición exploratoria, resultados del equipo con detalles individuales disponibles, práctica y reflexión personal. El seguimiento local es propio de Milo y no usa IDs de Mía.

Será su primer perfil. No se creó una cuenta de acceso ni un registro de jugador en Supabase sin la vinculación correspondiente. El prototipo permite guardar en el dispositivo; comprobar una sesión vinculada por players.user_id y nombre exacto; y, cuando exista esa cuenta, sincronizar prácticas explícitamente a plan_progress_v1:<UUID> y preferencias a mini_profile_v1. No se enviaron registros reales ni mensajes de prueba.

La conversación se habilita al vincular una cuenta propia y utiliza el módulo compartido con la etiqueta Jugador. Para activar el circuito completo hay que dar de alta/vincular el jugador. Login y el panel del coach ya reconocen el nombre de Milo cuando exista su registro. No se modificó la navegación ni los datos de los perfiles existentes para redirigirlos a Milo.

Pendiente: alta de cuenta/vinculación, recorrido coach-familia autenticado, prueba real de preferencias Mini entre dispositivos y publicación. Esta entrega es una prueba funcional de la modalidad U11, no un alta terminada de usuario.


## Adaptación a la estructura original

Se mantienen las siete pestañas y su orden: Inicio, Perfil, Rendimiento, Análisis Coach, Evolución, Mi Plan y Físico. Se amplió la extracción a 23 actas con una fila inequívoca de Milo; puntos reconciliados contra tiros. Rendimiento incluye puntos, minutos, faltas cometidas/recibidas y valoración CABB por partido y promedios de la muestra. Evolución presenta registros cronológicos y comparación de dos bloques de cinco cuando hay cobertura. Se conservan las limitaciones de registro de Mini y no se califican habilidades ni se hace ranking.

Físico permite medidas fechadas sin interpretar crecimiento ni aplicar estándares profesionales. Se conservan localmente y, al vincular su cuenta, se sincronizan en módulos mini_measures_v1:<UUID>. No se crean resultados de tests físicos inexistentes. El progreso y las preferencias de la primera prueba se conservan bajo la misma clave local.


## Integración Supabase preparada — 07/10/2026
- Alta idempotente y vinculación a una cuenta propia: `sql_milo_u11.sql`. Requiere completar correo y crear primero el usuario en Authentication. El esquema de players no pudo verificarse con la conexión pública; ejecutar la transacción en SQL Editor permite revisar cualquier campo requerido sin dejar un alta parcial.
- `sync_cabb_mini_supabase.py`: resuelve UUID existente, valida identidad y actas, hace upsert por partido estable, temporada FEBAMBA Mini y fuente `cabb_mini_official_v1` en player_data. Verifica IDs tras guardar. No inventa rebotes/asistencias/recuperos cuando su cobertura no está confirmada.
- Perfil vinculado carga fuente oficial de Supabase; vista local conserva JSON como respaldo. Plan, preferencias, medidas y conversación mantienen sus módulos existentes.
- Workflow: modo manual `mini-milo`; actualización programada y full incluyen Mini al activar variable GitHub `MINI_MILO_ENABLED=true`, luego de completar el alta. Antes no rompe sync actual.
- 31 pruebas pasan; dry-run confirma 23 actas y promedios 5.43 puntos, 18.88 minutos, 4.22 valoración.
- No hubo escritura real ni publicación en este paso: no hay credencial administrativa disponible ni correo elegido. Pendientes alta Auth/players, ejecutar sync con acceso autorizado, comprobar login y persistencia real desde dos dispositivos, publicar archivos y activar variable programada.

## Activación real confirmada — 07/10/2026
- Perfil Milo vinculado al acceso jugador/padre.
- Escrituras reales verificadas mediante sesión autenticada: 23 game_log, una stats_seasons FEBAMBA Mini y fuente cabb_mini_official_v1.
- Lectura posterior: 23 PJ, 5.4 PPG, 18.9 MIN, 4.2 VAL.
- Navegador: cuenta vinculada y conversación/progreso leídos desde Supabase; actor Jugador o Padre/madre habilitado. No se enviaron mensajes ni se inventaron prácticas.
- Pendientes: publicar archivos y activar MINI_MILO_ENABLED en GitHub para sincronización programada; probar guardado de una práctica real y otro dispositivo.
