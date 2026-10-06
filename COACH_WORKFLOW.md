# Coach, jugadora y familia — primera integración

Aplicada al perfil de Mía. Las demás jugadoras conservan su mensajería anterior hasta adaptar sus perfiles.

## Jugadora o familia

Entrar con la sesión habitual del perfil y abrir Análisis Coach. En “Conversación con mi coach”, elegir quién escribe (Jugadora o Padre/madre/representante), agregar un nombre si se desea, elegir una práctica o Consulta general, escribir y enviar. El mensaje aparece como enviado únicamente después de la confirmación de Supabase. Si falla, el texto queda disponible para reintentar; el borrador se conserva localmente cuando el navegador permite guardarlo.

“Actualizar conversación” vuelve a consultar mensajes, prácticas y evaluación. No hay notificaciones automáticas ni confirmación de lectura en esta etapa. El acceso de la familia utiliza la sesión del perfil de la jugadora; no se crearon cuentas de representantes independientes.

## Coach

Entrar al panel administrativo y abrir Mensajes. Seleccionar Mía. Se muestran sus prácticas nuevas de Mi Plan y la conversación compartida. “Dejar una devolución” selecciona la práctica como contexto; no marca automáticamente metas ni prácticas como cumplidas.

En “Evaluación general de la jugadora” se guardan observaciones, fortalezas observadas, aspectos para trabajar y próxima acción. Esta evaluación alimenta coach_eval_v1, que ya lee el perfil. Los borradores se conservan mientras se redactan otras devoluciones o se actualiza la conversación.

Los mensajes antiguos y sus respuestas se presentan como historial. Sus herramientas anteriores de administración permanecen en un bloque desplegable del panel coach.

## Persistencia

Conversación: una fila player_data por mensaje, módulo coach_conversation_v1:<UUID>, datos con autor, fecha, texto y referencia opcional a una práctica. Prácticas: plan_progress_v1:<UUID>. Evaluación general: coach_eval_v1. No se reemplazaron registros de messages, message_replies ni el plan anterior.

Se requiere sesión para enviar mensajes o guardar evaluaciones. No se modificaron políticas de Supabase ni se realizó una auditoría de seguridad.

## Validación

25 pruebas aprobadas; incluye validación de participantes, mezcla de historial, envío y fallo con borrador, y guardado de evaluación con adaptador simulado. Lectura real de la conversación/progreso comprobada en navegador desde el perfil. Pendiente recorrido real autenticado coach ↔ jugadora/familia y publicación de los archivos nuevos; no se enviaron mensajes reales de prueba.
