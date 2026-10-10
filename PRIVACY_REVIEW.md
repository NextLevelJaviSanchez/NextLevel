# Privacidad del acceso básico

La versión básica está activa en https://nextleveljavisanchez.github.io/NextLevel/. Incluye acceso por cuenta, perfil y foto, partidos/evaluaciones guardados, prácticas y lectura de objetivos/devoluciones. Las herramientas avanzadas, el acceso del coach, la administración de cuentas y la sincronización automática siguen pausados.

Se probaron dos cuentas reales distintas: cada una cargó su perfil y el acceso a un perfil ajeno fue denegado. También se comprobaron guardado/recarga, cierre de sesión, Atrás y foto privada. Los resultados publicados son solo indicadores booleanos ligados al hash de las fuentes; no contienen datos de jugadores.

El despliegue aprobado es https://github.com/NextLevelJaviSanchez/NextLevel/actions/runs/38009520639, commit 3291be1628b049a1fbf8826c00586a1fc61b3841. Nueve recursos de la aplicación coinciden con las fuentes revisadas y 56 rutas antiguas devuelven 404; las 11 consultas anónimas a tablas privadas siguen rechazadas con 401. Pages usa únicamente el paquete permitido de diez archivos, nunca la raíz del repositorio.

No se guardan nuevas copias personales en el navegador. Las copias antiguas requieren una decisión del usuario para su eliminación porque podrían contener datos no sincronizados. No publicar archivos personales, snapshots, SQL, diagnósticos ni respaldos.

El repositorio permanece público por decisión del usuario. Se retiraron 55 archivos antiguos de la versión actual, con respaldo privado local, pero el historial y referencias restantes siguen accesibles. No se declara resuelta esa exposición ni seguridad integral de todas las herramientas originales. No reescribir ni purgar historial sin autorización específica.

Para futuras publicaciones usar el constructor scripts/build_private_pages.py. El modo live exige pruebas reales asociadas al hash de las seis fuentes de la aplicación; cualquier cambio requiere volver a verificarlo. El modo maintenance permite pausar nuevamente el acceso sin publicar el repositorio completo.
