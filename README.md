# 🏥 Comité de Bienestar - Sistema de Gestión Operativa y Financiera

Sistema web integral de alta disponibilidad para la administración operativa, médica y contable de un **Comité de Bienestar**. Construido bajo principios de **Clean Architecture**, alta cohesión y bajo acoplamiento, separando estrictamente la interfaz de usuario del backend y la persistencia de datos.

---

## 🛠️ 1. Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14+ (App Router)** | Framework React con Server/Client Components y renderizado optimizado |
| **Diseño UI** | **Tailwind CSS** | Sistema de diseño responsivo, estético y con identidad corporativa de salud |
| **Lenguaje Frontend** | **TypeScript** | Tipado estático estricto, interfaces de dominio y robustez en tiempo de compilación |
| **Backend API** | **Python 3.11 + FastAPI** | Framework asíncrono de alto rendimiento, OpenAPI/Swagger automático y validación de tipos |
| **Validación Backend** | **Pydantic v2** | Esquemas y validaciones estrictas de datos de entrada/salida |
| **ORM & Persistencia** | **SQLAlchemy 2.0 + Asyncpg** | Mapeo objeto-relacional asíncrono |
| **Base de Datos** | **PostgreSQL 15** | Motor relacional robusto con transacciones ACID |
| **Orquestación** | **Docker & Docker Compose** | Entorno autocontenido y reproducible en desarrollo y producción |

---

## 📁 2. Estructura del Proyecto

```text
/bienestar-app
├── /frontend                        # Aplicación Next.js (App Router + Tailwind CSS)
│   ├── /src
│   │   ├── /app                     # Rutas y páginas de Next.js (App Router)
│   │   │   ├── /admin               # Módulo: Panel de Administración
│   │   │   ├── /afiliacion          # Módulo: Afiliación y Cargas
│   │   │   ├── /beneficios          # Módulo: Beneficios Sociales
│   │   │   ├── /finanzas            # Módulo: Control Financiero
│   │   │   ├── /reembolsos          # Módulo: Reembolsos Médicos
│   │   │   ├── globals.css          # Directivas de Tailwind y estilos base
│   │   │   ├── layout.tsx           # Root Layout (integra MainLayout)
│   │   │   └── page.tsx             # Dashboard Principal ("Hoja Socio")
│   │   ├── /components              # Componentes UI interactivos y modulares
│   │   │   ├── DashboardCards.tsx   # Tarjetas de Saldo Anual de Salud y Estado Previsional
│   │   │   ├── MovementsTable.tsx   # Tabla de Historial con filtros y visor de comprobantes
│   │   │   └── QuickActions.tsx     # Botones y Modales: "Solicitar Reembolso" y "Postular a Beneficio"
│   │   ├── /layouts                 # Estructura del portal
│   │   │   ├── Header.tsx           # Encabezado con perfil de "Socio Activo" y Cerrar Sesión
│   │   │   ├── MainLayout.tsx       # Ensamblador principal de navegación
│   │   │   └── Sidebar.tsx          # Menú lateral con los 5 módulos institucionales
│   │   ├── /lib                     # Utilidades de formateo (CLP, fechas) y cliente API fetch
│   │   │   ├── api.ts
│   │   │   └── utils.ts
│   │   └── /types                   # Definición de tipos e interfaces TypeScript
│   │       └── index.ts
│   ├── Dockerfile                   # Imagen Docker para el Frontend
│   ├── next.config.js               # Configuración de Next.js
│   ├── package.json                 # Dependencias Node.js
│   ├── postcss.config.js
│   ├── tailwind.config.js           # Tema y paleta corporativa
│   └── tsconfig.json                # Configuración TypeScript
├── /backend                         # API REST en Python (FastAPI)
│   ├── /app
│   │   ├── /api                     # Enrutadores divididos por módulos funcionales
│   │   │   └── /v1
│   │   │       ├── /endpoints       # Endpoints: afiliación, reembolsos, beneficios, finanzas, admin
│   │   │       └── api.py           # Agrupador central de rutas
│   │   ├── /core                    # Configuración Pydantic Settings, CORS, JWT y seguridad
│   │   ├── /models                  # Modelos SQLAlchemy ORM y mixins
│   │   ├── /schemas                 # Esquemas de datos Pydantic
│   │   └── /services                # Lógica de cálculo y reglas de negocio
│   ├── Dockerfile                   # Imagen Docker para FastAPI
│   ├── main.py                      # Punto de entrada de FastAPI
│   └── requirements.txt             # Dependencias Python
├── docker-compose.yml               # Orquestador multi-contenedor (Next.js, FastAPI, PostgreSQL)
├── .gitignore                       # Ignorados para Git
└── README.md                        # Documentación técnica del proyecto
```

---

## 🚀 3. Puesta en Marcha con Docker Compose (Recomendado)

El proyecto cuenta con un archivo `docker-compose.yml` que levanta los 3 servicios simultáneamente en una red interna dedicada:

```bash
# Situarse en la raíz del proyecto
cd bienestar-app

# Construir y levantar los contenedores
docker compose up --build
```

### URLs de Acceso:
*   **Frontend (Next.js):** [http://localhost:3000](http://localhost:3000)
*   **Backend API (FastAPI):** [http://localhost:8000](http://localhost:8000)
*   **Documentación Interactiva Swagger UI:** [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
*   **Documentación ReDoc:** [http://localhost:8000/api/v1/redoc](http://localhost:8000/api/v1/redoc)
*   **PostgreSQL:** `localhost:5432` (Usuario: `bienestar_user`, BD: `bienestar_db`)

### 🔐 Credenciales de Prueba (desarrollo)
Se crean automáticamente al iniciar el backend ([init_db.py](backend/app/db/init_db.py)). Se puede ingresar con el **correo o el RUT**.

| Rol | Nombre | RUT | Correo | Contraseña |
| :--- | :--- | :--- | :--- | :--- |
| **Superusuario** | Super Administrador | 11.111.111-1 | superadmin@mperalillo.cl | `Super#2026` |
| Presidente | María Elena Soto | 12.345.678-9 | msoto@mperalillo.cl | `Presi#2026` |
| Secretario | Patricia Fuentes R. | 13.456.789-0 | pfuentes@mperalillo.cl | `Secre#2026` |
| Tesorero | Roberto Morales P. | 14.982.112-4 | rmorales@mperalillo.cl | `Teso#2026` |
| Admin / Directiva | Jorge Contreras L. | 16.234.567-8 | jcontreras@mperalillo.cl | `Admin#2026` |
| Revisor / Auditor | Andrea Ibarra V. | 17.345.678-K | aibarra@mperalillo.cl | `Audit#2026` |
| Socio | Carlos Valenzuela M. | 15.489.123-K | cvalenzuela@mperalillo.cl | `Socio#2026` |

> ⚠️ Cambiar estas contraseñas y el `SECRET_KEY` antes de pasar a producción.

---

## 💻 4. Ejecución en Entorno Local (Sin Docker)

### Backend (FastAPI):
```bash
cd bienestar-app/backend

# Crear entorno virtual
python -m venv venv
# Activar entorno (Windows PowerShell):
.\venv\Scripts\Activate.ps1
# Activar entorno (Linux/macOS):
# source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar servidor FastAPI en desarrollo
uvicorn main:app --reload --port 8000
```

### Frontend (Next.js):
```bash
cd bienestar-app/frontend

# Instalar dependencias de Node.js
npm install

# Iniciar servidor de desarrollo
npm run dev
```

---

## ✨ 5. Características del Dashboard Implementado

1.  **Sidebar de 5 Módulos:** Enlaces directos a:
    *   *Afiliación y Cargas*
    *   *Reembolsos Médicos*
    *   *Beneficios Sociales*
    *   *Control Financiero*
    *   *Administración*
2.  **Header Institucional:** Indicador de estado del usuario (*"Socio Activo"* con distintivo verde), RUT, notificaciones y botón interactivo para **Cerrar Sesión**.
3.  **Tarjetas de Resumen (Cards):**
    *   **Saldo Anual de Salud Disponible:** Formateado en pesos chilenos (`$150.000` de `$250.000` tope), con barra de progreso visual de saldo restante y gasto acumulado.
    *   **Estado Previsional:** Estado `"Al día"` con sello de habilitación y última cotización procesada por descuento de planilla.
    *   **Cargas Familiares Vigentes:** Resumen del grupo familiar cubierto por el beneficio.
4.  **Botones de Acción Rápida:**
    *   `Solicitar Reembolso`: Despliega un modal interactivo para ingresar tipo de prestación (Farmacia, Consulta, Dental), monto y adjuntar boletas.
    *   `Postular a Beneficio`: Despliega un modal para seleccionar el beneficio institucional (Bono Vacaciones, Escolaridad, Natalidad) y fundamentar la solicitud.
5.  **Tabla de Últimos Movimientos:**
    *   Buscador en tiempo real por ID o concepto.
    *   Filtros dinámicos por estado (*Aprobado, Pagado, En Revisión*).
    *   Formateo de moneda local (`$32.500`, `$80.000`).
    *   Botón de comprobante digital que permite visualizar los detalles de la transacción y simular la descarga del PDF.
