# Estado de privacidad

La página principal permanece en mantenimiento. La aplicación genérica se revisa en /revision/login.html, con Supabase RLS por dueño. Los archivos publicados se seleccionan mediante scripts/build_private_pages.py; nunca volver a publicar la raíz del repositorio.

La interfaz de revisión permite editar perfil/foto, consultar partidos y evaluaciones, registrar prácticas y leer objetivos/devoluciones. Las herramientas avanzadas y la administración del coach requieren revisión funcional y permisos explícitos antes de reactivarse.

No se guardan nuevas copias personales en el navegador. Las copias antiguas requieren decisión del usuario para su eliminación; podrían contener datos sin sincronizar.

Los archivos personales y snapshots antiguos se retiraron de la versión actual, con respaldo privado local. Este repositorio sigue siendo público y su historial conserva versiones anteriores: no se declara resuelta esa exposición. No reescribir ni purgar historia sin autorización específica.

La sincronización automática está pausada: los scripts antiguos mostraban datos individuales en logs públicos. La función del servidor permanece protegida; su fuente y migración aplicada están registradas en supabase/.

La reapertura exige pruebas con dos cuentas reales ligadas al hash exacto de la versión. Aún pendientes: ingreso A/B, acceso ajeno denegado, salir/Atrás, guardado/recarga y foto privada.
