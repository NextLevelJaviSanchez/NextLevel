# Recuperación funcional — 10/10/2026

Primera ampliación de la versión privada de revisión. La raíz básica verificada permanece sin cambios.

Recuperado: seis métricas de evolución, toda la temporada, comparación de bloques de cinco; mapa de calor por zonas y TOP del equipo con los cálculos originales desde módulos privados de cada jugador; hitos de temporada; cinco aventuras Mini con selección persistida; recorte de fotos con cancelación y borrado al cerrar sesión; referencia de minutos del coach; impresión/PDF del perfil seleccionado; campos originales de intentos de sprint/agilidad y Beep test con cálculos físicos básicos.

Se reutilizan los módulos cabb_shots_v1:2026 y cabb_team_v1:2026 ya existentes: la comprobación en Supabase encontró cuatro fuentes de cada tipo. No se publican archivos personales ni se sobrescriben snapshots existentes. Perfiles sin una fuente privada muestran que falta su importación. El TOP usa actas completas del equipo y mínimo 50% de PJ; no se infiere a partir del conjunto de perfiles registrados.

Comprobación local: 122 aserciones de interfaz, 29 de permisos de coach/jugadores y 12 del paquete. Incluye los controles nuevos, persistencia simulada de aventura y referencia, recorte/cancelación/cambio de cuenta, protocolo físico, reporte sin listado de otros perfiles y limpieza, cálculos de mapa/TOP con datos sintéticos. No se escribieron prácticas, evaluaciones, mensajes ni fotos ficticios en producción.

No equivale a paridad integral ni a publicación final. Pendientes: comprobar visualmente y con sesiones reales esta nueva fuente; completar la experiencia Mini, visualizaciones y comparaciones originales; equivalencia del circuito de respuestas/reacciones; gestión segura de altas/correo/contraseña; ejecución del sincronizador y actualización completa de fuentes; evidencia final de las dos cuentas y guardado/recarga; cambio de raíz. El historial del repositorio sigue público por decisión del propietario.
