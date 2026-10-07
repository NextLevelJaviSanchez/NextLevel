# Alta automática de jugadores · NextLevel

Implementado localmente el 07/10/2026. No se crearon cuentas de prueba ni se desplegaron cambios del servidor.

## Funcionamiento

- `perfil.html?player=UUID&season=2026` carga al jugador accesible y su inscripción anual (`player_data`, módulo `player_season_v1:2026`).
- Mini U11 usa el HTML de Milo como plantilla; U13/U15/U17/U19/U21/Mayores usa el HTML de Mía. No se crean archivos HTML por jugador. Las páginas originales mantienen sus enlaces y funciones.
- Login dirige a la página común. El panel del coach incorpora Nuevo jugador: club/temporada, selección de equipo y plantel oficial, nombre visible, categoría, dorsal opcional y correo del acceso jugador/padre.
- Se reutiliza una cuenta existente sin cambiar su contraseña. Si es nueva, el coach introduce una contraseña inicial. No se envían correos automáticamente. El alta de Auth y la vinculación de players no se tratan como una transacción única: si falla la vinculación después de crear Auth, se informa y se puede repetir con el mismo correo.
- La vinculación de players + inscripción anual es transaccional e idempotente mediante RPC del servidor; no reemplaza cuentas de otros jugadores. Permite incorporar varios torneos del mismo jugador en una temporada.
- El primer sync se solicita desde el panel; si falla o expira, muestra perfil creado e importación pendiente con reintento. Los upserts usan IDs estables.
- El workflow de registrados consulta las inscripciones anuales; no hay que modificar PLAYER_MAP ni crear archivos por jugador. Mantiene los workflows anteriores para perfiles sin inscripción nueva.

## Datos sincronizados

El servidor vuelve a resolver equipos y categorías en su propia sesión CABB; nunca guarda ni reutiliza IDs opacos de sesión como IDs de partido.

Usa buscarCategoria → fasesGrupos de categoría → horariosJornadas → estadisticasPartido. Verifica identidad, puntos/tiros, fixture y cobertura con PJ oficiales. Guarda game_log, stats_seasons y snapshot del equipo por jugador/temporada. En Mini, conserva el boxscore para puntos/minutos/faltas/valoración; los rubros sin cobertura confirmada quedan NULL en game_log.

Para U13+ consulta PBP y extrae tiros por equipo/dorsal del acta, excluye eliminados y deduplica. Solo usa para el mapa los partidos reconciliados con intentos/conversiones. Si PBP no está disponible, registra la limitación sin inventar coordenadas.

Fuentes: `cabb_team_v1:2026`, `cabb_shots_v1:2026`, `cabb_mini_official_v1:2026`. Los snapshots locales de Mía/Milo 2026 solo son respaldo para las identidades/equipos legacy correspondientes. Un jugador nuevo nunca hereda sus tiros.

Al pasar de Mini a U13, se conserva UUID, foto (`foto_url`), historial de partidos, physical_test_results, prácticas y conversación. Se leen las preferencias del módulo anterior si no hay preferencias de la plantilla nueva. Los objetivos se conservan por temporada mediante seasonGoals; el sueño no se convierte automáticamente en una meta de temporada.

## Activación en Supabase (pendiente)

1. Ejecutar `sql_player_onboarding.sql` en SQL Editor del proyecto actual. Instala solo la RPC privada para alta/vinculación; no modifica las políticas de las tablas existentes.
2. Desplegar `supabase/functions/nextlevel-onboard/index.ts` como Edge Function **nextlevel-onboard**. Si se usa Supabase CLI: `supabase functions deploy nextlevel-onboard --project-ref yjcxwfkedxzkcspddghz`. El entorno de Edge aporta SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. NEXTLEVEL_COACH_EMAIL es opcional (por defecto el acceso coach existente). No colocar service_role en archivos de la web.
3. Publicar los archivos modificados/nuevos del repositorio. El formulario muestra un mensaje claro si la función aún no está disponible.
4. En GitHub Actions, configurar secreto SUPA_SERVICE_ROLE_KEY y la URL existente; activar variable REGISTERED_PLAYERS_ENABLED=true. La actualización corre a las 00:00 de Argentina cada día y también puede ejecutarse manualmente por temporada.
5. Probar el primer alta real desde coach: elegir jugador, verificar cuenta/perfil, comprobar cantidad de partidos, TOP y cobertura de tiros. Luego ingresar con el acceso jugador/padre y probar persistencia real desde otro dispositivo.

## Verificación realizada

37 pruebas locales aprobadas de selección de categoría, aislamiento de cachés, compilación sin alterar identidad, compatibilidad de preferencias/objetivos, contrato de actas, PBP reconciliado, tests físicos y comportamiento existente. Login real de Milo confirmado hacia perfil.html, 23 actas visibles y sin errores de consola.

Pendientes: ejecutar/desplegar SQL/Edge Function en el proyecto real, probar alta completa con una nueva cuenta y activar workflow. No se realizó auditoría de seguridad, conforme al alcance acordado.

Comprobación remota: /functions/v1/nextlevel-onboard responde 404 NOT_FOUND; la activación del servidor sigue pendiente. No hay Supabase CLI ni credenciales administrativas disponibles en este entorno.

Dorsal opcional: si el esquema existente exige dorsal, ejecutar `sql_dorsal_optional.sql`. El alta admite NULL sin inventar un número; conserva todos los dorsales cargados. Si Auth se creó antes del error, repetir el alta con el mismo correo reutiliza la cuenta.
