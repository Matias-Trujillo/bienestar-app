# Informe de Auditoría de Base de Datos: Estado Actual ("Cómo Está") vs. Modelo Ideal con Buenas Prácticas ("Cómo Debería Estar")

**Proyecto:** Bienestar-App — Comité de Bienestar de la I. Municipalidad de Peralillo  
**Motor Auditado:** PostgreSQL 15 (`bienestar_postgres` / `bienestar_db`)  
**Marco Normativo Contrastado:** `CONTEXTO_IA.md`, `INSTRUCCIONES_AGENTE.md` y Estándares de Ingeniería de Datos Relacional (1FN, 2FN, 3FN e Integridad Referencial).

---

## 1. Resumen Ejecutivo

Al auditar la base de datos física en ejecución frente a los modelos ORM (`backend/app/models/`), el script de inicialización (`backend/app/db/init_db.py`) y las reglas del proyecto establecidas en `CONTEXTO_IA.md`, se concluye que:
* **Nivel Operativo:** La base de datos actual cuenta con las **11 tablas físicas y 186 columnas** que soportan todos los módulos del sistema.
* **Deuda Técnica de Modelado:** Debido a que el desarrollo evolutivo se centró en la lógica de la API y la interfaz de usuario, quedaron **6 malas prácticas de diseño de base de datos** que explican por qué ciertas tablas aparecen sueltas en el ERD de pgAdmin y dónde se aparta de las mejores prácticas de ingeniería.

Para documentar esto con total transparencia académica, se han generado **dos diagramas en Draw.io** (con ruteo geométrico verificado sin ningún cruce de líneas sobre tablas):
1. **`bienestar_mer_1_COMO_ESTA_ACTUAL.drawio` (Estado Actual / As-Is):** Exactamente lo que existe hoy en PostgreSQL (11 tablas, 186 columnas, 9 claves foráneas físicas).
2. **`bienestar_mer_2_COMO_DEBERIA_ESTAR_IDEAL.drawio` (Estado Ideal / To-Be):** El diseño corregido con las buenas prácticas aplicadas (17 claves foráneas, tipos de datos estrictos y sincronización completa).
3. **`bienestar_mer_oficial.drawio`:** Archivo unificado que contiene ambos diagramas en 2 pestañas (Páginas) en la parte inferior de Draw.io.

---

## 2. Los 6 Problemas y Malas Prácticas Detectados en la Base de Datos Actual

### Hallazgo 1: Falta de Claves Foráneas (`FOREIGN KEY`) en Catálogo y Cargas ("Tablas Isla")
* **Cómo está hoy (Mala Práctica):**
  * La tabla `bonos_catalogo` no tiene ninguna clave foránea que la conecte con `solicitudes_beneficio` ni con `nominas_masivas`. Ambas tablas guardan el código del bono como un texto suelto (`tipo_bono : varchar(60)`). Por eso en el ERD de pgAdmin `bonos_catalogo` aparece completamente desconectada.
  * La tabla `cargas_familiares` solo tiene clave foránea hacia `solicitudes_afiliacion` (`solicitud_id`), pero no tiene relación con `usuarios` (`socio_id`) ni con `solicitudes_cargas_familiares` (`carga_id`).
* **Riesgo Técnico:**
  Sin restricción `FOREIGN KEY`, el motor PostgreSQL no impide que por un error de código se inserte una solicitud de un bono inexistente o que una carga familiar quede huérfana respecto al socio titular activo.
* **Cómo debería estar (Buena Práctica en Diagrama 2):**
  * Reemplazar `tipo_bono : varchar` por `bono_id : integer <FK>` apuntando a `bonos_catalogo(id)` tanto en `solicitudes_beneficio` como en `nominas_masivas`.
  * Incorporar `socio_id : integer <FK>` en `cargas_familiares` hacia `usuarios(id)` y `carga_id : integer <FK>` en `solicitudes_cargas_familiares` hacia `cargas_familiares(id)`.

---

### Hallazgo 2: Inconsistencia en el Registro de Directivos Aprobadores / Revisores
* **Cómo está hoy (Mala Práctica):**
  * En `solicitudes_beneficio` y `nominas_masivas`, quien revisa o liquida se guarda correctamente como clave foránea hacia `usuarios(id)` (`revisado_por_id`, `liquidado_por_id`, `creado_por_id`).
  * Sin embargo, en `solicitudes_afiliacion` y `solicitudes_cargas_familiares`, el directivo que aprueba se guardó como texto libre: `resuelto_por : varchar(150)`.
  * Más aún, en `solicitudes_reembolso` ni siquiera existe la columna en la tabla para registrar qué directivo o tesorero revisó la boleta médica.
* **Cómo debería estar (Buena Práctica en Diagrama 2):**
  * Estandarizar todas las tablas de solicitudes usando claves foráneas enteras hacia `usuarios(id)`: `resuelto_por_id : integer <FK>` en afiliación y cargas, y `revisado_por_id : integer <FK>` en reembolsos, además de vincular `audit_logs.usuario_id <FK>` con `usuarios(id)`.

---

### Hallazgo 3: Fechas Críticas del Negocio Almacenadas como `VARCHAR` (Texto)
* **Cómo está hoy (Mala Práctica):**
  * En `solicitudes_afiliacion`: `fecha_sesion` (`varchar(10)`), `fecha_fin_carencia` (`varchar(10)`) y `resuelto_at` (`varchar(60)`).
  * En `solicitudes_cargas_familiares`: `fecha_sesion` (`varchar(10)`) y `resuelto_at` (`varchar(60)`).
  * En `solicitudes_beneficio`: `decreto_fecha` (`varchar(50)`).
  * En `usuarios`: `antiguedad` es un string estático (`"1 Año, 4 Meses"`) y `meses_antiguedad` es un entero fijo que no se incrementa automáticamente con el paso de los meses.
* **Por qué viola las buenas prácticas:**
  Guardar fechas como `VARCHAR` impide que PostgreSQL valide fechas reales (permite guardar textos inválidos), impide ordenar cronológicamente con índices de fecha y obliga a parsear textos en Python para verificar la regla legal de los **6 meses de carencia (Ley N° 19.754)**.
* **Cómo debería estar (Buena Práctica en Diagrama 2):**
  * Usar tipos nativos `DATE` para `fecha_sesion`, `fecha_fin_carencia`, `decreto_fecha` y `fecha_incorporacion` en `usuarios`, y `TIMESTAMPTZ` para `resuelto_at` y `fecha_revision`.

---

### Hallazgo 4: Dinero en Pesos Chilenos (CLP) Almacenado como Punto Flotante (`FLOAT` / `double precision`)
* **Cómo está hoy (Mala Práctica):**
  * La regla de negocio en `CONTEXTO_IA.md` (Sección 5.2) establece explícitamente que la moneda oficial es **Pesos Chilenos (CLP) sin centavos**.
  * Las tablas `usuarios`, `solicitudes_beneficio`, `nominas_masivas` y `detalles_nomina_masiva` cumplen correctamente usando `INTEGER`.
  * Pero la tabla `solicitudes_reembolso` define `monto_boleta`, `monto_copago` y `monto_reembolso` como `FLOAT` (`double precision`).
* **Por qué viola las buenas prácticas:**
  En sistemas financieros y contables jamás debe usarse `FLOAT` (`double precision` IEEE 754) para dinero, ya que genera imprecisiones binarias de redondeo (ej. `32500.000000000004`). En CLP siempre debe usarse `INTEGER` (o `BIGINT`).
* **Cómo debería estar (Buena Práctica en Diagrama 2):**
  * Unificar `monto_boleta`, `monto_copago` y `monto_reembolso` a tipo `INTEGER`.

---

### Hallazgo 5: Desfase entre el Modelo ORM (`afiliacion.py`) y la Tabla Física (`cargas_familiares`)
* **Cómo está hoy (Mala Práctica):**
  * En `backend/app/models/afiliacion.py` (líneas 73–75), la clase `CargaFamiliar` define 3 columnas para el respaldo de cédula de identidad: `certificado_nombre`, `certificado_tipo` y `certificado_data`.
  * Sin embargo, en `backend/app/db/init_db.py` (líneas 92–112), se olvidó incluir las sentencias `ALTER TABLE cargas_familiares ADD COLUMN IF NOT EXISTS...`. Como `Base.metadata.create_all` no modifica tablas ya creadas en el volumen de Docker, la tabla física en PostgreSQL tiene **7 columnas** mientras el modelo en Python tiene **10 columnas**.
* **Cómo debería estar (Buena Práctica en Diagrama 2):**
  * Sincronizar las 3 columnas faltantes en la tabla física y gestionar los cambios de esquema mediante migraciones controladas.

---

### Hallazgo 6: Acoplamiento Indebido en `parametros_sistema` (Violación de 1FN y Responsabilidad Única)
* **Cómo está hoy (Mala Práctica):**
  * En `init_db.py` (líneas 253–260), el sistema guarda los intentos fallidos de inicio de sesión y el bloqueo de cada usuario insertando filas dinámicas en `parametros_sistema` con clave `'SEC_USR_' || id` y un valor JSON en texto `{"i": 3, "b": true}`.
* **Por qué viola las buenas prácticas:**
  1. Viola la **Primera Forma Normal (1FN)** al empaquetar múltiples atributos (`intentos` y `bloqueado`) dentro de un string JSON en una columna de texto.
  2. Mezcla parámetros estatutarios globales del Comité (Sueldo Grado 15, % de bonos) con estado transaccional volátil de autenticación por usuario.
* **Cómo debería estar (Buena Práctica en Diagrama 2):**
  * Incorporar las columnas atómicas `intentos_fallidos : integer` y `bloqueado_hasta : timestamptz` directamente en la tabla `usuarios`, dejando `parametros_sistema` exclusivamente para parámetros globales del negocio.

---

## 3. Cuadro Comparativo Resumen ("Cómo Está" vs "Cómo Debería Estar")

| Aspecto Evaluado | Diagrama 1: Cómo Está Hoy (As-Is) | Diagrama 2: Cómo Debería Estar (To-Be) |
| :--- | :--- | :--- |
| **Claves Foráneas (FK)** | **9 FKs físicas** (`bonos_catalogo` y `audit_logs` sueltas) | **17 FKs físicas** (todas las entidades operativas integradas) |
| **Vínculo de Catálogo de Bonos** | Texto libre `tipo_bono : varchar` sin FK | Clave foránea `bono_id : integer <FK>` hacia `bonos_catalogo` |
| **Vínculo de Cargas Familiares** | Solo unida a `solicitudes_afiliacion` | Unida a `solicitudes_afiliacion`, `usuarios` y `solicitudes_cargas_familiares` |
| **Registro de Aprobadores** | Mezcla de `varchar(150)` y `integer <FK>` | 100% estandarizado con `<FK>` hacia `usuarios(id)` |
| **Montos Financieros (CLP)** | Mezcla de `INTEGER` y `DOUBLE PRECISION` | 100% unificado en `INTEGER` (Cero errores de punto flotante) |
| **Tipos de Datos de Fechas** | Fechas de sesión y carencia en `VARCHAR(10)` | 100% tipadas en `DATE` y `TIMESTAMPTZ` |
| **Columnas en `cargas_familiares`** | 7 columnas (faltan las 3 de certificado del ORM) | 11 columnas (sincronizada con el ORM + `socio_id`) |
| **Estado de Bloqueo Login** | JSON oculto `SEC_USR_<id>` en `parametros_sistema` | Columnas atómicas `intentos_fallidos` y `bloqueado_hasta` en `usuarios` |
| **Cruces de Líneas sobre Tablas** | **0 cruces** (Verificado geométricamente) | **0 cruces** (Verificado geométricamente) |
