# Estado de la versión preparada

La propuesta para jugadores está publicada en /revision/ y la versión básica estable se mantiene en la raíz. Fuente de la propuesta: commit 6a87b91dc0f2bc8b1528ad77b2fe1b11cd3d4e30. Despliegue 38035593843 exitoso. Huella de los seis archivos: f256335a0f32ce1a4b20a4a0d0784279034431576f4d4d55f57d09aa40fb81b8.

Funciones recuperadas: preferencias personales, análisis por torneo, estadísticas y evolución, plan personal, objetivos progresivos con historial, prácticas con tiros, registro/evolución de evaluaciones y consulta de devoluciones. Los cambios respetan los módulos guardados y no generan caché personal.

Validación: 65 comprobaciones de interfaz con identidades simuladas; 42 de políticas en PostgreSQL local; 12 del paquete; 12 del gate del servidor; motores de objetivos y análisis; 14 aserciones bajo las dos identidades reales en SQL con rollback y confirmación posterior de ausencia de registros temporales; 72 rutas HTTP correctas y rechazo anónimo de 11 tablas. La sesión real del segundo usuario carga planes/evaluaciones y conserva una práctica registrada anteriormente; un enlace ajeno continúa bloqueado.

No afirmar que la nueva interfaz completó dos ingresos reales, guardado/recarga de todos los formularios y cierre/back del navegador: eso está pendiente. La evidencia de la versión básica no se declara como evidencia de la nueva fuente. Antes de cambiar la raíz se debe completar esa prueba y renovar privacy-verification.json.

Coach y sincronización permanecen pausados. El modelo de acceso del entrenador requiere cuentas propias y consentimiento revocable por jugador; no se asignaron permisos ni se enviaron invitaciones. El importador registrado ahora revisa sin escribir por defecto y no registra identificadores, resultados individuales ni credenciales; su ejecución real/calendario sigue pendiente. El repositorio y su historial continúan públicos por decisión del propietario, sin purga del historial.
