# 🏀 CABB Scout Analytics — Dossiers de Rendimiento Individual

**Análisis personalizado de jugadoras basado en datos oficiales CABB / AFMB.**  
Producto B2C: $20–50 USD por jugadora por temporada.

---

## 📁 Estructura del proyecto

```
/
├── index.html                                  ← Redirige a bera_u13_scout_index.html
├── bera_u13_scout_index.html                   ← Landing page del producto
├── intake_dossier.html                         ← Formulario de intake (padre/jugadora)
│
├── dossier_mia_sanchez_14_bera_u13_2026.html   ← Dossier Mía Sánchez #14
├── plan_mejora_mia_sanchez.html                ← Plan de mejora Mía (mobile + export link)
│
├── dossier_catalina_grillo_8_bera_u13_2026.html ← Dossier Catalina Grillo #8
├── plan_mejora_catalina_grillo_8.html           ← Plan de mejora Catalina
│
└── (archivos de datos .json y scripts .py — solo para generación, no para web)
```

---

## 🚀 Deploy en 30 segundos — Netlify Drop

1. Ir a **[app.netlify.com/drop](https://app.netlify.com/drop)**
2. Arrastrar esta carpeta completa a la pantalla
3. Netlify genera una URL pública: `https://nombre-random.netlify.app/`
4. Mandar el link por WhatsApp:
   ```
   https://nombre-random.netlify.app/intake_dossier.html
   ```

> **El padre abre esa URL en su celular → completa el formulario → recibe los links al dossier y plan de mejora personalizados.**

---

## 🐙 Deploy en GitHub Pages

```bash
# 1. Crear repo en github.com/new
# 2. Subir todos los archivos HTML al root del repo
# 3. En Settings → Pages → Source: Deploy from branch → main → / (root)
# 4. GitHub genera la URL pública en ~1 minuto
```

URL resultante: `https://TU_USUARIO.github.io/NOMBRE_REPO/intake_dossier.html`

Para hacer el index principal apuntar al intake, crear `index.html` en el root:
```html
<!DOCTYPE html>
<html><head>
<meta http-equiv="refresh" content="0; url=intake_dossier.html">
</head></html>
```

---

## 📱 Flujo del producto

```
👨‍👧 Padre / Jugadora
        ↓
📋 intake_dossier.html
   ├── Nombre, apellido, dorsal, equipo, categoría, liga
   ├── Q1: ¿Qué tipo de jugadora sos?         (chips + texto libre)
   ├── Q2: ¿Qué debilidades mentales tenés?   (chips + texto libre)
   ├── Q3: ¿Qué área querés enfocar?          (chips + texto libre)
   └── Meta de la temporada (texto libre)
        ↓ URL params (nombre=...&q1=...&tipo=...&estado=...)
        ↓
📊 dossier_JUGADORA.html         📱 plan_mejora_JUGADORA.html
   ├── Datos AFMB 2026               ├── 4 objetivos con checklist
   ├── Radar percentiles             ├── Registro de sesiones
   ├── Mapa de calor de tiro         ├── Contador doble-dobles
   ├── Game log 18 PJ                ├── 🔗 Exportar como Link
   └── 💬 Voz de la Jugadora         └── 💬 Tus respuestas del intake
       (respuestas del intake)
```

---

## 🔗 Sistema de guardado — cómo funciona

### localStorage (automático)
El plan de mejora guarda automáticamente en el navegador del dispositivo:
- ✅ Checkboxes completados
- ✅ Historial de sesiones registradas
- ✅ Porcentajes actuales (TL%, T2%, Ratio)
- ✅ Contador de doble-dobles

**Limitación:** solo persiste en el mismo browser del mismo dispositivo.

### Exportar como Link (para compartir entre dispositivos)
Tab Progreso → **"🔗 Generar link para compartir"**

El estado completo se codifica en base64 y se agrega a la URL como `?estado=...`.  
Al abrir el link en cualquier dispositivo, se restaura automáticamente con un toast verde.

```
https://tu-sitio.netlify.app/plan_mejora_mia_sanchez.html
  ?nombre=Mia&apellido=Sanchez&dorsal=14
  &tipo=Anotadora|Tactica
  &q1=Soy+principalmente+anotadora...
  &estado=eyJ0bF9wY3QiOjQ1LCJ0Ml9wY3...   ← estado en base64
```

**Enviar por WhatsApp:** el botón "💬 Enviar por WhatsApp" abre wa.me con el mensaje pre-llenado.

---

## 📊 Datos y metodología

| Fuente | Descripción |
|--------|-------------|
| API GesDeportiva / AFMB | Estadísticas oficiales de cada partido |
| Actas CABB (.xlsx) | Minutos exactos (Federal Infantiles) |
| Estimación metodológica | Titulares AFMB = 20 min, suplentes = ~16 min |

**Métricas calculadas:**
- `eFG%` = (TC + 0.5×T3) / TCatt
- `TS%` = PTS / (2 × (TCatt + 0.44 × TLatt))
- `Valoración FIBA` = (PTS + REB + AST + REC + TAP + FAR) − (FBA + PERD + FGA_errado + FTA_errado)
- Percentiles vs plantel (jugadoras con ≥8 PJ)

---

## 🏗️ Añadir una jugadora nueva

1. Verificar que su dorsal exista en `bera_u13_shooting_advanced.json`
2. Copiar `dossier_mia_sanchez_14_bera_u13_2026.html` → renombrar con nueva jugadora
3. Actualizar los datos JS hardcodeados (stats, game log, percentiles)
4. Copiar `plan_mejora_mia_sanchez.html` → renombrar y actualizar los 4 objetivos
5. Agregar la jugadora al índice `bera_u13_scout_index.html`
6. Re-deployar en Netlify (drag & drop de la carpeta de nuevo) — la URL no cambia

---

## 💰 Modelo de negocio B2C

| Tier | Precio | Contenido |
|------|--------|-----------|
| Básico | $20 USD | Dossier HTML + game log |
| Completo | $35 USD | Dossier + plan de mejora mobile |
| Premium | $50 USD | Todo + actualización a mitad de temporada |

**Audiencia objetivo:** padres, representantes (agencias), la misma jugadora si es mayor.  
**Uso:** portfolio para becas universitarias (NCAA/NAIA), fichajes Liga Nacional, evaluación técnica.

---

## ⚠️ Limitaciones conocidas

| Limitación | Workaround |
|------------|-----------|
| PBP V2 no funciona para partidos finalizados (IDs expirados) | Usar estadísticas acumuladas de la API |
| Minutos exactos no disponibles en AFMB (solo Federal via xlsx) | Estimación metodológica declarada |
| localStorage no se comparte entre dispositivos | Botón "Exportar como Link" implementado |
| Los URLs params se pierden si se navega fuera | El param `estado` incluye todo para reproducir |

---

*Generado con CABB Scout Analytics · Datos oficiales AFMB / GesDeportiva · Temporada 2026*
