# Administrador y coach

La cuenta verificada del propietario tiene permiso de administrador y coach sobre todos los jugadores. El rol está vinculado al UUID en un registro privado con RLS y sin acceso directo del cliente; no depende del correo ni de user_metadata. No se guardan contraseñas ni claves privilegiadas en la aplicación.

En /revision/ puede elegir cualquier jugador, consultar su perfil y registrar evaluaciones, devoluciones y mensajes. Los jugadores acceden únicamente a su propio perfil y sus mensajes se identifican como jugador. Las reglas rechazan autores ajenos, promoción del rol y escrituras de estadísticas oficiales o vínculos de cuenta desde el navegador.

El propietario autorizó además leer las fotos privadas de Storage de todos los jugadores. El permiso se limita a carpetas de jugadores registrados dentro de player-photos. El coach no recibe permisos de Storage para modificar o borrar fotos ajenas. Las reglas mantienen aislados a jugadores y visitantes y bloquean carpetas no registradas; se comprobaron también frente a permisos antiguos demasiado amplios. Las fotos guardadas como datos del perfil usan las reglas privadas del propio módulo.

El acceso se puede desactivar desde el registro privado del servidor. La interfaz verifica el rol al consultar/guardar, al volver a la página y periódicamente, y se limpia si se revoca. No se abren permisos a otros correos. No se envían notificaciones externas automáticamente ni se persisten borradores personales.

Validación: 79 pruebas de interfaz, 27 de roles/fotos en PostgreSQL local y comprobaciones en la base real de coach/jugador/anonimato, autoría, estadísticas, revocación y fotos privadas. Las pruebas reales revirtieron los cambios y no crearon/modificaron fotos. Ingreso real del coach y apertura de dos perfiles comprobados. La raíz sigue básica y /revision/ contiene las funciones ampliadas. Sincronización y alta/cambio de credenciales desde la app permanecen pausados.
