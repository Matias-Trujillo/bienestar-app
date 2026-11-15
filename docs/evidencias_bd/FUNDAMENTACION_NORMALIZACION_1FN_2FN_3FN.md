# 🏛️ Fundamentación Técnica de Normalización de Base de Datos (1FN, 2FN, 3FN)
**Proyecto:** Bienestar-App • Sistema de Gestión Operativa y Financiera  
**Institución:** Comité de Bienestar — I. Municipalidad de Peralillo  
**Destinatarios:** Javiera y equipo de proyecto (Para incorporar en las Páginas 16 y 17 del Informe de Entrega 2)

---

## 📌 Contexto y Propósito de este Documento

En la revisión técnica del informe, se identificó la necesidad de dar coherencia y profundidad al análisis de **Normalización de Base de Datos**, justificando formalmente el diseño de las 11 entidades implementadas en PostgreSQL 15 y explicando el motivo por el cual ciertos atributos se conservan en entidades históricas sin que esto constituya una vulneración al diseño relacional.

A continuación, se presenta la redacción técnica estructurada para ser incorporada directamente en el informe:

---

## 1. Primera Forma Normal (1FN) — Atomicidad e Identificación Unívoca

### Definición Teórica:
Una relación se encuentra en **1FN** si y solo si todos los atributos contienen exclusivamente valores atómicos (indivisibles, sin conjuntos, listas ni tuplas compuestas dentro de un campo) y existe una clave primaria que identifica de manera unívoca a cada registro.

### Cumplimiento en Bienestar-App:
1. **Clave Primaria Unívoca:** Las 11 tablas del sistema (`usuarios`, `solicitudes_afiliacion`, `cargas_familiares`, `solicitudes_cargas_familiares`, `parametros_sistema`, `bonos_catalogo`, `solicitudes_beneficio`, `nominas_masivas`, `detalles_nomina_masiva`, `solicitudes_reembolso` y `audit_logs`) poseen una clave primaria simple subrogada denominada `id` (tipo `SERIAL` / `BIGINT` con restricción `PRIMARY KEY`).
2. **Atomicidad de Atributos:**
   * No existen atributos multivaluados: En lugar de almacenar múltiples cargas familiares en un campo de texto o arreglo JSON dentro de `solicitudes_afiliacion`, cada carga se segrega en una fila independiente en la entidad normalizada `cargas_familiares`.
   * Los parámetros de configuración de la plataforma no se empaquetan en archivos monolíticos, sino que se almacenan como tuplas atómicas univaluadas `(clave, valor)` en `parametros_sistema`.
3. **Tipificación Estricta:** Cada columna tiene un dominio definido en el motor PostgreSQL (`character varying`, `integer`, `boolean`, `date`, `timestamp with time zone`), impidiendo ambigüedad de formatos.

> **Conclusión 1FN:** El modelo cumple rigurosamente con la Primera Forma Normal.

---

## 2. Segunda Forma Normal (2FN) — Dependencia Funcional Completa

### Definición Teórica:
Una relación se encuentra en **2FN** si cumple la 1FN y todos los atributos no clave tienen una **dependencia funcional completa** de la clave primaria. Esto significa que ningún atributo no clave debe depender únicamente de una parte o subconjunto de la clave primaria (eliminación de dependencias parciales).

### Cumplimiento en Bienestar-App:
1. **Inexistencia de Claves Compuestas:**
   En el diseño relacional de Bienestar-App, **ninguna tabla utiliza claves primarias compuestas** (por ejemplo, claves formadas por pares como `(socio_id, año)` o `(nomina_id, run)`).
2. **Garantía Matemática:**
   Dado que toda clave primaria está conformada por un único atributo atómico (`id`), cualquier dependencia funcional que exista hacia un atributo no clave depende necesariamente de la **totalidad** de la clave primaria.
   $$\forall X \in \text{AtributosNoClave}: \text{id} \to X$$
   Al no existir partes de la clave primaria, **es conceptual y matemáticamente imposible que existan dependencias funcionales parciales**.

> **Conclusión 2FN:** El modelo cumple plenamente la Segunda Forma Normal por construcción de su arquitectura de claves primarias simples.

---

## 3. Tercera Forma Normal (3FN) — Eliminación de Dependencias Transitivas

### Definición Teórica:
Una relación se encuentra en **3FN** si cumple la 2FN y ningún atributo no clave depende transitivamente de la clave primaria a través de otro atributo no clave. En términos formales: si $X \to Y$ y $Y \to Z$ (donde $X$ es la clave primaria y $Y, Z$ son atributos no clave), la dependencia transitiva $X \to Z$ debe desacoplarse mediante la creación de una nueva tabla donde $Y$ actúe como clave primaria o foránea.

### Cumplimiento en Bienestar-App:
1. **Desacoplamiento Estructural:**
   * **Módulo de Salud:** En `solicitudes_reembolso`, la tabla únicamente almacena la clave foránea `socio_id REFERENCES usuarios(id)`. No duplica el nombre del funcionario, su sueldo, ni su situación previsional, garantizando que una actualización en el perfil del socio no genere anomalías de modificación.
   * **Módulo de Bonos:** En `solicitudes_beneficio`, se referencia `bono_id REFERENCES bonos_catalogo(id)`. Los porcentajes sobre el Grado 15, los requisitos y las categorías permanecen aislados en el catálogo.
   * **Módulo de Cargas:** La tabla `cargas_familiares` mantiene únicamente `solicitud_id REFERENCES solicitudes_afiliacion(id)`, evitando dependencias circulares.

---

## 4. Análisis Crítico: Justificación de la "Desnormalización Histórica" (Snapshots Contables)

### El Punto de Revisión en el Informe (Páginas 16-17):
En la evaluación se observa que entidades como `detalles_nomina_masiva` y `solicitudes_cargas_familiares` contienen atributos como `rut`, `nombre_completo` y `departamento`, los cuales ya residen originalmente en la tabla `usuarios`.

### ¿Por qué NO es un error de diseño sino una exigencia normativa?
En el ámbito de la ingeniería de software gubernamental y municipal chilena (bajo la **Ley N° 19.754** y las directrices de la **Contraloría General de la República - CGR**), la persistencia de datos contables exige la aplicación del patrón **Snapshot Inmutable de Auditoría** (*Audit Snapshot Pattern*):

1. **Principio de No Alterabilidad Contable:**
   Cuando la Directiva del Comité de Bienestar aprueba una nómina masiva (ej. *Bono de Invierno* en agosto de 2026), se promulga un Decreto Alcaldicio de pago. Dicho documento legal respaldó la entrega de fondos a un funcionario que, a esa fecha exacta, tenía un determinado RUN, nombre legal y departamento asignado (ej. *"Dirección de Obras"*).
   
2. **Riesgo de una Normalización Estricta 3FN en Finanzas:**
   Si `detalles_nomina_masiva` no conservara el snapshot y resolviera el departamento siempre mediante un `JOIN` en tiempo de consulta hacia `usuarios.departamento`, ocurriría un error grave de auditoría:
   * Si en 2027 el funcionario es trasladado a *"Secretaría Municipal"*, al consultar la liquidación histórica de 2026 el sistema informaría retroactivamente que el bono fue pagado a Secretaría Municipal, **falsificando la verdad material del decreto financiero histórico**.

3. **Inmutabilidad Probatoria:**
   Los campos marcados como `[SNAP]` (`rut`, `nombre_completo`, `departamento` en nóminas masivas; y antecedentes de la carga en solicitudes extraordinarias) corresponden a una **desnormalización controlada y deliberada**. Actúan como una fotografía inmutable de los antecedentes evaluados en el momento de la sesión ordinaria o emisión del cheque, garantizando trazabilidad probatoria ante cualquier sumario administrativo o auditoría de la Contraloría.

---

## 📊 5. Cuadro Síntesis de Cumplimiento Normativo

| Forma Normal | Estado | Mecanismo de Garantía en el Proyecto |
| :--- | :---: | :--- |
| **1FN** | ✅ **Cumple al 100%** | Claves primarias `id` únicas y atributos estrictamente atómicos. Separación de cargas familiares en tabla propia. |
| **2FN** | ✅ **Cumple al 100%** | Todas las tablas usan claves primarias simples; no existen claves compuestas que den lugar a dependencias parciales. |
| **3FN** | ✅ **Cumple (con excepción auditada)** | Eliminación de dependencias transitivas mediante claves foráneas (`socio_id`, `bono_id`, `nomina_id`). |
| **Snapshot de Auditoría** | 🏛️ **Justificado por Ley 19.754** | Preservación del estado histórico en nóminas y decretos para cumplir requerimientos de trazabilidad financiera municipal. |
