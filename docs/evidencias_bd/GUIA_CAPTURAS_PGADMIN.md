# 📸 Guía Maestra: Evidencias de Base de Datos y Diagrama MER para el Informe
**Proyecto:** Bienestar-App • Comité de Bienestar de la I. Municipalidad de Peralillo  
**Destinatarios:** Javiera, Fabián y equipo de desarrollo

Esta guía contiene la documentación y los pasos para sustituir las imágenes de IA del informe por evidencias técnicas **100% reales, íntegras y académicamente formales**.

---

## 🎨 1. Diagrama MER Oficial en Draw.io (Figura 2 — Pág. 8)

Para cumplir con la observación del informe (*"CAMBIAR POR DRAW.IO O Mermaid"* y *"Sacarlo directo desde la BD"*), el diagrama contiene **las 11 tablas físicas completas con sus 186 columnas reales de PostgreSQL**, sin resúmenes, sin emojis y dispuesto en una **matriz ortogonal en 4 columnas** para que **ninguna línea cruce por encima de otra tabla**.

### Cómo abrirlo y exportarlo en 1 minuto:
1. Entra a [https://app.diagrams.net/](https://app.diagrams.net/) (o abre la app de escritorio Draw.io).
2. Haz clic en **"Abrir diagrama existente"** (o menú *Archivo* ➔ *Abrir desde* ➔ *Dispositivo*).
3. Selecciona el archivo:
   📁 **`bienestar-app/docs/evidencias_bd/bienestar_mer_oficial.drawio`**
4. Verás las 11 entidades ordenadas en 4 columnas con pasillos despejados de 120px:
   * **Columna 1:** `solicitudes_afiliacion` (19 col), `cargas_familiares` (7 col), `solicitudes_reembolso` (21 col).
   * **Columna 2:** `parametros_sistema` (6 col), `usuarios` (17 col), `solicitudes_beneficio` (32 col).
   * **Columna 3:** `bonos_catalogo` (15 col), `solicitudes_cargas_familiares` (21 col), `nominas_masivas` (17 col).
   * **Columna 4:** `audit_logs` (12 col), `detalles_nomina_masiva` (19 col).
5. Ve a *Archivo* ➔ *Exportar como* ➔ **PNG** (en alta resolución) para insertarlo como la **Figura 2** del informe.

### Script SQL DDL (opcional):
Si prefieres que Draw.io genere las tablas desde cero:
* En Draw.io ve a: **`+` (Insertar)** ➔ **`Avanzado`** ➔ **`SQL`**.
* Pega el contenido de **`bienestar-app/docs/evidencias_bd/importar_drawio_ddl.sql`** (contiene las 186 columnas con sus tipos de datos y restricciones reales).

---

## 🏛️ 2. Fundamentación de Normalización 1FN, 2FN y 3FN (Páginas 16 y 17)

Para fundamentar ante la comisión evaluadora la coherencia del modelo:
* Abre el archivo: 📄 **`bienestar-app/docs/evidencias_bd/FUNDAMENTACION_NORMALIZACION_1FN_2FN_3FN.md`**.
* Explica:
  1. **1FN:** Claves primarias únicas y atomicidad de atributos (cargas familiares en tabla propia).
  2. **2FN:** Al usar claves simples subrogadas (`id`), no existen dependencias parciales posibles.
  3. **3FN:** Eliminación de dependencias transitivas mediante claves foráneas.
  4. **Snapshots de Auditoría (Excepción Contable CGR):** Justificación de por qué en `detalles_nomina_masiva` se congela el RUN, nombre y departamento del socio al momento del decreto, protegiendo la inmutabilidad de la nómina según la **Ley N° 19.754**.

---

## 🔌 3. Capturas de Tablas en pgAdmin 4 (Figuras 3 a 13 — Págs. 10 a 15)

La interfaz gráfica **pgAdmin 4** se encuentra activa en tu máquina:
1. Abre: **[http://localhost:8080](http://localhost:8080)**
2. Inicia sesión:
   * **Email:** `superadmin@mperalillo.cl`
   * **Contraseña:** `Super#2026`
3. En el árbol izquierdo: `Servers` ➔ `Servidores Municipales` ➔ `Comite de Bienestar Peralillo (Local Dev)` (Contraseña de base de datos: `bienestar_secret_pass`).
4. Para cada una de las 11 tablas (`usuarios`, `bonos_catalogo`, etc.):
   * **Estructura:** Clic derecho ➔ **Properties...** ➔ pestaña **Columns** (captura de la lista de columnas).
   * **Datos Reales:** Clic derecho ➔ **View/Edit Data** ➔ **First 100 Rows** (captura de la grilla de datos reales cargados como evidencia de funcionamiento).
