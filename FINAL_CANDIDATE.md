# Estado de la versión preparada

La raíz mantiene la versión básica verificada. La propuesta ampliada en /revision/ incluye el acceso autorizado de administrador y coach a todos los jugadores, vinculado a una única cuenta confirmada de Supabase. Fuente: def9402e0970b1155fda413629e0786d133b3fb5. Despliegue 38060434956 exitoso. Huella: 677b757af2331b4dd11dd2d1034eefefad5e7519f9c25646c83a18f24f00796c.

Ingreso real del coach y apertura de dos perfiles distintos comprobados. Los jugadores no reciben herramientas de coach y mantienen acceso exclusivo al perfil propio. Devoluciones y mensajes nuevos vinculan su autor a la sesión. Las reglas rechazan promoción del rol y autores falsos; estadísticas oficiales, vínculos de cuenta e historial de conversaciones quedan protegidos contra cambios desde el navegador.

Validación: 79 pruebas de interfaz y 29 de roles/fotos/integridad en PostgreSQL local; pruebas reales de coach/jugador/anonimato, autoría, revocación, fotos privadas y registros protegidos con rollback; 72 rutas HTTP correctas y 11 tablas rechazan lectura anónima. No quedaron mensajes de prueba y no se crearon/modificaron fotos. La propuesta conserva perfil, preferencias, gráficos, plan personal, objetivos, prácticas con tiros, evaluaciones e historial. Faltan dos ingresos nuevos de jugadores y guardado/recarga de los formularios sobre esta fuente para renovar la evidencia antes de reemplazar la raíz.

La lectura de fotos privadas de Storage fue autorizada explícitamente y aplicada. Se limita a carpetas de jugadores registrados y conserva las restricciones para modificar o borrar fotos ajenas, incluso ante políticas antiguas amplias. Se comprobaron RLS, aislamiento, carpetas no registradas, anonimato y revocación sin crear ni modificar imágenes.

La sincronización y el alta/cambio de credenciales desde la aplicación siguen pausados. El repositorio e historial continúan públicos por decisión del propietario, sin purga.
