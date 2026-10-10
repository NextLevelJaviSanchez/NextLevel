# Estado de la versión preparada

La raíz mantiene la versión básica verificada. La propuesta ampliada está publicada en /revision/ con el acceso autorizado de administrador y coach a todos los jugadores, vinculado a una única cuenta confirmada de Supabase. Fuente: ec90d66a3d1c95fcf66e115333fcaa89af520457. Despliegue 38057023425 exitoso. Huella: 3b7c070387767fd0dba399bca5fbf576e910640a8d377199b9491d5e8348544f.

Ingreso real del coach y apertura de dos perfiles distintos comprobados. La cuenta de jugador continúa sin herramientas de coach y mantiene acceso exclusivo al propio perfil. Devoluciones y mensajes registran al autor de la sesión; las reglas rechazan promoción del rol y autores falsos. Estadísticas oficiales y vínculos de cuenta siguen protegidos contra escritura desde el navegador.

Validación: 79 comprobaciones de interfaz, 27 de roles y fotos en PostgreSQL local; pruebas reales de coach/jugador/anonimato, autoría y revocación con rollback y cero mensajes de prueba; 72 rutas HTTP correctas y 11 tablas rechazan lectura anónima. La propuesta conserva perfil, preferencias, gráficos, plan personal, objetivos, prácticas con tiros, evaluaciones e historial. Faltan los dos ingresos nuevos de jugadores y guardado/recarga de todos los formularios sobre esta fuente para renovar la evidencia antes de reemplazar la raíz.

La lectura de fotos privadas de Storage fue autorizada explícitamente y aplicada. Se limita a carpetas de jugadores registrados y conserva las restricciones para modificar o borrar fotos ajenas, incluso ante políticas antiguas amplias. Se comprobaron RLS, aislamiento del jugador, carpetas no registradas, anonimato y revocación sin crear ni modificar imágenes. Las fotos en los datos privados de perfil mantienen las reglas de su módulo.

La sincronización y el alta/cambio de credenciales desde la aplicación siguen pausados. El repositorio e historial permanecen públicos por decisión del propietario, sin purga.
