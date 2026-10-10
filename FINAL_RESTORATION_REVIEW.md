# NextLevel — cierre de restauración y privacidad

La revisión recupera la estructura y los recorridos principales de las interfaces originales de categorías mayores y Mini. Conserva perfiles parametrizados y datos privados; no vuelve a publicar dossiers con información personal estática ni copias locales de otros jugadores.

| Recorrido | Implementación preparada y comprobada |
|---|---|
| Inicio, Perfil y navegación | Encabezado, logo vectorial original, dorsal, foto, tarjetas, pestañas y navegación inferior, claro/oscuro |
| Perfil | Preferencias, campos personales, sueño, objetivo anual, dorsal independiente y preferencias Mini |
| Evaluación personal original | Cuestionario, selecciones, medidas y objetivos de intake; respuestas anteriores conservadas; coach consulta, jugador completa |
| Rendimiento | Competencias, promedios y cobertura, actas, resultados Mini, hitos, mapa y TOP privados; posición propia si hay identidad canónica |
| Evolución | Métricas originales, temporada/últimos diez, línea interactiva y detalle de partido, comparación cinco contra cinco |
| Mi Plan | Prácticas, tiros, resumen semanal, tips mentales, metas progresivas, estados anteriores, desafío Mini y aventuras |
| Físico | Medidas, evaluación v2 y cálculos originales, cinco pruebas, instrucciones/diagramas, marcas e historial/gráficos; edición y borrado de registros propios con confirmación |
| Coach | Todos los perfiles, fotos, devoluciones y referencia de minutos; registra sus pruebas en su evaluación protegida sin ampliar permisos de jugadores |
| Mensajes | Historial antiguo y conversación privada, autoría autenticada, contexto de práctica, respuestas y cinco reacciones originales |
| Impresión/PDF | Perfil seleccionado, actas, gráficos, metas, prácticas, evaluación personal y físico; no imprime el directorio de jugadores |
| Cuentas y altas | Interfaz original integrada tras comprobar capacidades. Servicio preparado con UID y rol verificados; bloqueo anónimo/jugador, cuenta del administrador protegida, claves solo en servidor. Activado en Supabase con aprobación del usuario; capacidades y consulta de cuenta verificadas con coach, acceso anónimo rechazado |
| Sincronización | Workflow manual con revisión sin cambios por defecto, destino y credencial de servidor comprobados, logs sin identidades; backend prepara la importación antes de escribir actas. Revisión real detenida porque SUPA_KEY no autoriza este proyecto; no se importaron actas ni se reactivó el calendario |

273 comprobaciones de interfaz y acceso, 29 comprobaciones de políticas, 15 del backend preparado, pruebas de gestión de cuentas simuladas, 12 del paquete y prueba de privacidad del sincronizador aprobadas. Las pruebas reales anteriores con dos jugadores no certifican esta fuente nueva. No se cambió ninguna contraseña ni se enviaron mensajes o registros ficticios en producción.

Fuente de seis archivos: `a56f0b8bf76a4dd30f6b2b3a163b861081628b79ff0843250ccfa1b6c838834b`.

Publicado en revisión: commit 969db1dff8512d883652ff49a917c1b1e49a903e, ejecución 38082137089 aprobada, 72 rutas verificadas. Las 12 tablas rechazan al público (401) y administración rechaza anónimo (403). Revisión del sync 38082194011: el control de credencial falló y no hubo importación. Para cerrar la publicación integral faltan: configurar SUPA_KEY de servidor del proyecto y comprobar importación real/calendario; dos ingresos reales de jugadores, guardado/recarga y denegación cruzada para esta huella; evidencia exacta antes de cambiar la raíz. No reutilizar privacy-verification.json antiguo.

La recuperación de recorridos no afirma igualdad de cada píxel o de todos los documentos históricos. Los datos no sincronizados que el usuario autorizó borrar del navegador no pueden certificarse recuperados. El historial del repositorio permanece público por la decisión previa de mantenerlo público; no se purgó ni se privatizó.