# 🧠 CONTEXTO_IA: Manual de Operación, Arquitectura y Reglas de Negocio
## Proyecto: Bienestar App — Comité de Bienestar de la I. Municipalidad de Peralillo
> **Destinatario:** Modelos de Lenguaje (LLMs) y Asistentes de Inteligencia Artificial que operen sobre este repositorio.
> **Propósito:** Proveer el contexto normativo, técnico y funcional completo del proyecto para que cualquier solicitud de cambio, ampliación o depuración sea ejecutada en estricta conformidad con la arquitectura y reglas del negocio.
> **Instrucciones del Agente:** Consultar obligatoriamente [`INSTRUCCIONES_AGENTE.md`](./INSTRUCCIONES_AGENTE.md) para conocer el rol de Tech Lead & UI/UX Senior, las reglas de prevención de AI Slop, micro-arquitectura (límite 40 líneas) y protocolo iterativo en 4 pasos.

---

## 🏛️ 1. Origen, Misión y Marco Legal

Este proyecto universitario digitaliza de manera integral los procesos operativos, médicos y contables del **Comité de Bienestar de la Ilustre Municipalidad de Peralillo**.

### Marco Normativo y Legal
* **Ley N° 19.754:** Ley de la República de Chile que autoriza al personal de las municipalidades para constituir servicios o comités de bienestar con fondos provenientes de las cuotas de los socios y aportes municipales institucionales.
* **Problemática Resuelta:** Tradicionalmente, los trámites de afiliación, presentación de boletas de salud y cálculo de beneficios se realizaban en papel, planillas manuales y sesiones con alta fricción administrativa. Este sistema unifica la operación, brinda autoservicio al funcionario ("Hoja Socio") y proporciona trazabilidad auditable a la Directiva.

---

## 🛠️ 2. Stack Tecnológico Oficial

| Capa | Tecnología | Rol Técnico |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14+ (App Router)** | Framework React con Server y Client Components (`'use client'`). |
| **Lenguaje Frontend** | **TypeScript 5.x** | Tipado estático estricto. Interfaces compartidas en `frontend/src/types/index.ts`. |
| **Estilos UI** | **Tailwind CSS 3.4** | Sistema de diseño utilitario responsivo con colores institucionales. |
| **Iconografía** | **Lucide React** | Paquete unificado de iconos SVG. |
| **Backend API** | **FastAPI (Python 3.11+)** | API REST asíncrona de alto desempeño basada en Starlette y ASGI. |
| **Validación de Datos** | **Pydantic v2** | Validación estricta en tiempo de ejecución de esquemas Request / Response. |
| **ORM & DB Access** | **SQLAlchemy 2.0 (Async)** | Mapeo objeto-relacional asíncrono con driver `asyncpg`. |
| **Base de Datos** | **PostgreSQL 15** | Motor relacional con integridad referencial y transacciones ACID. |
| **Contenedores** | **Docker & Docker Compose** | Orquestación multi-contenedor (`postgres`, `backend`, `frontend`). |
| **Seguridad** | **JWT (python-jose) + Bcrypt** | Tokens de autenticación con expiración y hashing criptográfico. |
| **Notificaciones** | **SMTP / Email Service** | Envío de correos automáticos con plantillas HTML responsivas. |

---

## 📁 3. Mapa y Anatomía del Repositorio

```text
/bienestar-app
├── CONTEXTO_IA.md                   # ESTE ARCHIVO: Manual normativo para la IA
├── README.md                        # Documentación general y puesta en marcha
├── docker-compose.yml               # Orquestación de Postgres, Backend y Frontend
├── setup.ps1 / setup.sh             # Scripts de inicialización local de dependencias
│
├── /backend                         # API REST en Python (FastAPI)
│   ├── main.py                      # Punto de entrada FastAPI, CORS y lifespan
│   ├── requirements.txt             # Dependencias del ecosistema Python
│   ├── Dockerfile                   # Imagen Docker para el backend
│   └── /app
│       ├── /api                     # Controladores y enrutamiento
│       │   ├── deps.py              # Inyección de dependencias (get_db, require_roles, get_current_user)
│       │   └── /v1
│       │       ├── api.py           # Agrupador central de routers
│       │       └── /endpoints       # Endpoints por módulo funcional:
│       │           ├── auth.py      # Login (por RUT o Correo), cambio de clave, perfil
│       │           ├── afiliacion.py# HU-01 y HU-02: Postulaciones, cargas, actas directorio
│       │           ├── reembolsos.py# HU-03 y HU-04: Solicitudes médicas, topes, resolución
│       │           ├── beneficios.py# HU-05 y HU-06: Bonos Grado 15, asignaciones, nóminas masivas
│       │           ├── finanzas.py  # HU-07 y HU-08: Nómina retenciones 4%, balances
│       │           └── admin.py     # HU-09 y HU-10: Auditoría inmutable, usuarios, parámetros
│       ├── /core                    # Núcleo de configuración
│       │   ├── config.py            # Pydantic BaseSettings con variables de entorno
│       │   └── security.py          # Hashing Passlib/Bcrypt y generación de tokens JWT
│       ├── /db                      # Gestión de persistencia
│       │   ├── session.py           # AsyncEngine y sessionmaker con asyncpg
│       │   └── init_db.py           # Creación de tablas, migraciones y seeds iniciales
│       ├── /models                  # Entidades SQLAlchemy (ORM)
│       │   ├── base.py              # DeclarativeBase y TimestampMixin
│       │   ├── user.py              # Usuario del sistema y enum UserRole
│       │   ├── afiliacion.py        # SolicitudAfiliacion, CargaFamiliar, SolicitudCargaFamiliar
│       │   ├── reembolso.py         # SolicitudReembolso, TipoPrestacion, EstadoReembolso
│       │   ├── beneficios.py        # BonoCatalogo, SolicitudBeneficio, NominaMasiva, ParametroSistema
│       │   └── audit.py             # AuditLog (Bitácora inmutable append-only)
│       ├── /schemas                 # Contratos Pydantic v2
│       │   ├── common.py            # Tipos genéricos y respuestas base
│       │   ├── reembolso.py         # Schemas de reembolsos y validaciones
│       │   └── beneficios.py        # Schemas de bonos y postulaciones
│       └── /services                # Lógica pura de negocio (Services)
│           ├── reembolso_service.py # Cálculo de saldos, retención preventiva, 30 días, carencia
│           ├── beneficios_service.py# Cálculo de bonos sobre Grado 15, nómina masiva
│           └── email_service.py     # Generación y despacho de correos transaccionales
│
├── /frontend                        # Aplicación Web Next.js (App Router)
│   ├── package.json                 # Dependencias Node.js
│   ├── tailwind.config.js           # Paleta de colores oficial Peralillo
│   ├── tsconfig.json                # Configuración de TypeScript con alias @/*
│   └── /src
│       ├── /app                     # Rutas del App Router
│       │   ├── layout.tsx           # Root Layout (integra AuthProvider y MainLayout)
│       │   ├── page.tsx             # Dashboard principal ("Hoja de Socio")
│       │   ├── /login               # Pantalla de autenticación institucional
│       │   ├── /afiliacion          # HU-01: Formulario de postulación y cargas
│       │   ├── /reembolsos          # HU-03: Cartola médica, solicitud y carga de boletas
│       │   ├── /aprobaciones        # HU-04: Bandeja de directiva con visor de boletas
│       │   ├── /beneficios          # HU-05 y HU-06: Catálogo de bonos y liquidación
│       │   ├── /finanzas            # HU-07 y HU-08: Nómina 4% y control financiero
│       │   └── /admin               # HU-09: Panel de usuarios, bonos y visor de auditoría
│       ├── /components              # Componentes UI organizados por módulo
│       │   ├── /admin               # Tablas de gestión, modal carga masiva, visor logs
│       │   ├── /afiliacion          # Tablas de evaluación y modales de resolución
│       │   ├── /beneficios          # Catálogo interactivo, tabs y modales de postulación
│       │   ├── /reembolsos          # Visor de comprobante, modal nueva solicitud, cards
│       │   ├── /ui                  # Modales globales (buzón de correos, cambio clave obligatoria)
│       │   ├── DashboardCards.tsx   # Tarjetas de saldo anual, estado previsional y cargas
│       │   ├── MovementsTable.tsx   # Historial unificado de transacciones
│       │   └── QuickActions.tsx     # Botones de acceso rápido del socio
│       ├── /context                 # Estado global de sesión
│       │   └── AuthContext.tsx      # Provider con persistencia en localStorage/cookies y refresh
│       ├── /layouts                 # Estructura visual de navegación
│       │   ├── Header.tsx           # Encabezado institucional con RUT y perfil
│       │   ├── Sidebar.tsx          # Menú lateral con los 5 módulos funcionales
│       │   └── MainLayout.tsx       # Envoltorio responsivo con sidebar dinámico
│       ├── /lib                     # Utilidades cliente
│       │   ├── api.ts               # Cliente fetch tipado (fetchFromApi, subirArchivoApi)
│       │   └── utils.ts             # Formato CLP (pesos chilenos), formateo y validación RUN
│       └── /types                   # Contratos de tipos TypeScript
│           └── index.ts             # Interfaces completas del dominio
│
└── /docs                            # Documentación y levantamiento
    ├── documento-lectura-2-modulo-reembolsos.md
    ├── preguntas-modelo-negocio.md
    └── Preguntas.txt
```

---

## ⚖️ 4. Reglas de Negocio Inviolables

Cualquier código nuevo o modificación generada por la IA DEBE respetar estas reglas:

### Módulo 1: Afiliación y Cargas Familiares (HU-01 y HU-02)
1. **Período de Incorporación:** Las solicitudes se reciben entre **enero y junio** del año en curso. En producción se valida estrictamente; en desarrollo puede alternarse con la variable `AFILIACION_VALIDAR_PERIODO=false`.
2. **Descuento por Planilla:** Es obligatorio que el funcionario autorice expresamente el **descuento del 4% de su sueldo base** para ser admitido.
3. **Aprobación Colegiada:** Solo el **Presidente(a)** o **Secretario(a)** (o Superusuario) pueden aprobar o rechazar incorporaciones. Se requiere registrar `fecha_sesion` y `numero_acta`.
4. **Cómputo de Carencia:** Al aprobarse, el período de carencia de 6 meses (`fecha_fin_carencia`) se computa a partir de la fecha de la sesión ordinaria.
5. **Creación Automática de Cuenta:** Al aprobar la solicitud, el sistema genera automáticamente el usuario en `usuarios` con rol `socio`, estado `"Al día"` y clave provisoria `Socio#2026`.

### Módulo 2: Reembolsos Médicos y Dentales (HU-03 y HU-04)
1. **Carencia de 6 Meses:** Un socio con menos de 6 meses de antigüedad no puede solicitar reembolsos de salud. El sistema bloquea el envío y proyecta la fecha estimada de habilitación.
2. **Plazo de Caducidad de 30 Días:** La fecha de atención médica o compra farmacéutica no puede superar los **30 días corridos** contados al momento de registrar la solicitud.
3. **Tope Anual y Retención Preventiva:**
   - Tope de salud: `$150.000` (o `$250.000` según directiva) por año calendario.
   - En el instante en que el socio postula, el monto solicitado pasa a estado `"en_revision"` y se **retiene preventivamente** de su saldo disponible para evitar sobregiros simultáneos.
   - Si la solicitud es **Aprobada**, el saldo retenido se consolida como gasto definitivo.
   - Si la solicitud es **Rechazada**, el sistema **restituye de forma automática e inmediata el cupo retenido** al saldo disponible del socio.
4. **Respaldo Obligatorio:** Requiere subir archivo PDF o imagen JPG/PNG/WebP y marcar la Declaración Jurada de Veracidad.

### Módulo 3: Beneficios Sociales y Bonos (HU-05 y HU-06)
1. **Indexación al Grado 15:** Los montos de los bonos no se fijan en montos absolutos en duro, sino como un porcentaje sobre el **Sueldo Imponible de Referencia del Grado 15 Municipal** (valor parametrizado en `parametros_sistema`, por defecto `$750.000` CLP):
   - Bono Vacaciones: 15% del Grado 15.
   - Bono Escolaridad: 8% del Grado 15 (requiere cert. de alumno regular; cargas hasta 24 años).
   - Bono Nacimiento: 20% del Grado 15.
   - Bono Catástrofe / Fallecimiento: 25% a 100% según catálogo.
2. **Bonos de Calendario (Liquidación Masiva - HU-06):**
   - Bono de Invierno (15%): Liquidación en agosto para socios con antigüedad mínima.
   - Bono de Navidad: Liquidación en diciembre con porcentaje ajustable por Directorio (entre 10% y 15%).

### Módulo 4: Control Financiero y Presupuestos (HU-07 y HU-08)
1. **Conciliación 4%:** Cruce de nómina de retenciones de personal municipal con abono bancario.
2. **Subvención Municipal:** Cálculo anual sobre padrón cerrado al 31 de diciembre:  
   $$\text{Aporte Anual} = \text{Socios Activos al 31-Dic} \times 4\text{ UTM} \times \text{Valor UTM vigencia decreto}$$

### Módulo 5: Seguridad, Perfiles y Auditoría (HU-09 y HU-10)
1. **Roles del Sistema:** `superusuario`, `presidente`, `secretario`, `tesorero`, `admin`, `auditor`, `socio`.
2. **Máximo Directivo:** La directiva opera con un número restringido de hasta 7 cuentas directivas ejecutivas con voz y voto.
3. **Auditoría Inmutable:** Toda acción sensible (aprobar/rechazar incorporaciones, reembolsos, bonos, edición de saldos o creación de usuarios) DEBE invocar a `registrar_auditoria()` para insertar un registro en la tabla `audit_logs` con RUN, IP, módulo y acción. **Bajo ninguna circunstancia se debe eliminar ni modificar un registro de audit_logs**.

---

## 🤖 5. Manual de Actuación para la IA

Cuando el usuario te pida realizar modificaciones, nuevas funcionalidades o depuración:

1. **Antes de codificar:**
   - Consulta las secciones relevantes de este archivo `CONTEXTO_IA.md`.
   - Verifica qué historias de usuario (HU) y tablas se ven afectadas.
2. **Convenciones de Código:**
   - **Backend:** Usa async/await en FastAPI, SQLAlchemy 2.0 select syntax (`select(Model).where(...)`), schemas Pydantic tipados estrictamente.
   - **Frontend:** Mantén `'use client'` en páginas interactivas. Utiliza Tailwind con la paleta municipal. No uses librerías externas no declaradas en `package.json`.
   - **Moneda:** Formatea siempre en pesos chilenos sin centavos con punto separador de miles: `$150.000` usando `formatCurrency` de `@/lib/utils`.
   - **Identificador chileno (RUT/RUN):** Respeta el formato `XX.XXX.XXX-X` y valida con el algoritmo de módulo 11 provisto en `utils.ts` / `afiliacion.py`.
   - **Comentarios Didácticos:** Al modificar o crear archivos, mantén el estilo didáctico universitario con la marca `[ESTUDIANTE INFORMÁTICA]` explicando qué hace el bloque y qué permite en el sistema.
3. **Sincronización:**
   - Si creas un nuevo campo o endpoint en el backend, actualiza **inmediatamente** la interfaz correspondiente en `frontend/src/types/index.ts`.
4. **Registro de Decisiones:**
   - Cada vez que apliques un cambio estructural o nueva regla acordada con el usuario, documenta brevemente la adición al final de este archivo en la sección **Historial de Cambios y Decisiones**.

---

## 📝 6. Historial de Cambios y Decisiones Técnicas

| Fecha | Autor / Agente | Módulo | Resumen del Cambio |
| :--- | :--- | :--- | :--- |
| **2026-11-11** | Antigravity AI | General | Creación del archivo normativo `CONTEXTO_IA.md` y compilación del informe técnico en PDF para evaluación universitaria. |
| **2026-11-11** | Antigravity AI | Gobernanza / Micro-arquitectura | Creación de `INSTRUCCIONES_AGENTE.md` (Tech Lead, anti AI-Slop, Clean Arch, límite 40 líneas, protocolo 4 pasos) y plan de erradicación de `any`. |
| **2026-11-11** | Antigravity AI | Arquitectura / Módulos 1 y 2 | Refactorización Clean Architecture: creación de `AfiliacionService` (reducción de 1.861 a 175 líneas) y modularización de `aprobaciones/page.tsx` (de 1.070 a 190 líneas). |
| **2026-11-11** | Antigravity AI | QA / Testing Backend | Implementación de suite de 19 pruebas automatizadas con Pytest + SQLite en memoria (`aiosqlite`), validando carencia (6m), caducidad (30d), retención preventiva, restitución de saldos, indexación Grado 15 y auditoría inmutable. |
| **2026-11-11** | Antigravity AI | DevOps / Hosting & CI/CD | Creación de infraestructura de producción (`docker-compose.prod.yml`, Dockerfiles multi-stage, script `deploy/setup_server.sh`, workflow GitHub Actions CI/CD) y redacción del manual maestro `docs/GUIA_INSTALACION_SERVIDOR_LINUX.md` para torre con Windows 10 a Linux Headless 24/7. |
| **2026-11-11** | Antigravity AI | Frontend UX/UI (Anti AI-Slop) | Rediseño integral Data-Dense Institucional en 3 bloques (Layout/Dashboard asimétrico, Reembolsos/Aprobaciones/Beneficios/Finanzas y Login Split-Screen/Afiliación/Admin): eliminación de esferas blur, gradientes excesivos y bordes `rounded-3xl`, incorporación de `tabular-nums`, bordes firmes y descomposición modular bajo el límite de 40 líneas. |
