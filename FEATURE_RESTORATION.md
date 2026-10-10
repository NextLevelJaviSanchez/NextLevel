# Recuperación de funciones privadas

La versión básica verificada permanece publicada en la raíz. /revision/ contiene la propuesta completa para jugadores: perfil y preferencias técnicas/mentales, foto privada, estadísticas y evolución por torneo, análisis personal con consignas, objetivos progresivos con etapas/logros/pausa/reintento, prácticas con tiros y resumen semanal, registro de evaluaciones y comparación de mediciones, consulta de mensajes/devoluciones existentes.

Se conserva el historial de módulos originales y las preferencias no incluidas en el catálogo. Ninguna copia personal nueva se guarda en el navegador. La interfaz usa el jugador vinculado a la cuenta verificada, y las tablas mantienen RLS por propietario. Coach y sincronizaciones siguen pausados; el repositorio/historial continúa público por decisión del propietario.

Comprobaciones: 65 de interfaz con dos identidades simuladas, 42 de RLS en PostgreSQL local, 12 de paquete y 12 del gate del servidor. Motores originales: 16 de objetivos, 14 del análisis personalizado, más bloques de dos partidos y preferencias. El despliegue vuelve a ejecutar las pruebas de interfaz y objetivos. Las pruebas reales completas de esta nueva interfaz aún deben completarse antes de sustituir el paquete estable; la evidencia anterior no se reutiliza como si correspondiera a esta fuente.

El modo review conserva en la raíz los archivos exactos del commit verificado 3291be1628b049a1fbf8826c00586a1fc61b3841 y agrega únicamente ocho archivos genéricos en /revision/. Lista de publicación cerrada: 18 archivos. No publica scripts, respaldos, SQL ni datos de jugadores.
