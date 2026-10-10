# Administrador y coach

El propietario autorizó su cuenta verificada como administrador y coach de todos los jugadores. El permiso está vinculado al UUID de Supabase en un registro privado con RLS y sin acceso directo desde los clientes. No depende del correo ni de user_metadata. No se guardan contraseñas o claves privilegiadas en la aplicación.

La versión ampliada en /revision/ reconoce el rol mediante una función protegida y muestra el selector de jugadores. Puede consultar cualquier perfil, editar sus datos personales y registrar evaluaciones/devoluciones. Los jugadores mantienen el acceso solo a su propio perfil. Las estadísticas oficiales y los vínculos con cuentas continúan protegidos contra escrituras del navegador.

Los mensajes privados de jugador y coach registran el autor desde la identidad autenticada y las reglas rechazan autores ajenos o un jugador que declare ser coach. No hay borradores personales persistidos ni envío de notificaciones externas. Las devoluciones generales conservan los campos originales y el historial de mensajes conserva sus filas.

El permiso puede desactivarse desde el registro privado por administración del servidor. Cada consulta/escritura vuelve a verificarlo; la interfaz del coach comprueba el rol al volver a la página y periódicamente, y se limpia si cambia. No se crean excepciones de acceso para otros correos. Los archivos de Storage continúan bajo su política anterior; las fotos de perfil que maneja esta versión se leen desde los datos privados del jugador.

Validación: 79 comprobaciones de interfaz, 22 de roles en PostgreSQL local y pruebas en la base real de acceso total del coach, aislamiento del jugador, autoría, protección de estadísticas/vínculos, rechazo anónimo y revocación. Las escrituras de prueba fueron revertidas. La raíz conserva la versión básica; /revision/ contiene el acceso ampliado. La sincronización y el alta/cambio de credenciales desde la aplicación siguen pausados.
