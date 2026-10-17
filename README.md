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

El proyecto cuenta con un archivo `docker-compose.yml` que levanta los 3 servicios (Frontend, Backend y PostgreSQL) simultáneamente en una red interna dedicada.

### Paso 1: Requisitos previos
*   Instalar [Docker Desktop](https://www.docker.com/products/docker-desktop/) y **abrirlo** (debe estar en ejecución).
*   Verificar la instalación en una terminal:

```bash
docker --version
docker compose version
```

### Paso 1.1: Dependencias locales para el editor (importante al clonar)
Docker instala las librerías **dentro de los contenedores**, pero la carpeta `node_modules` y el entorno `venv` **no se suben a GitHub** (están en `.gitignore`). Sin ellos, VS Code mostrará muchos **errores falsos en rojo** (p. ej. `No se encuentra el módulo 'react'`) aunque la app funcione.

Herramientas necesarias en tu PC:

| Herramienta | Versión | Descarga |
| :--- | :--- | :--- |
| Git | cualquiera | https://git-scm.com/downloads |
| Docker Desktop | reciente | https://www.docker.com/products/docker-desktop/ |
| Node.js (incluye npm) | 18 o superior (LTS) | https://nodejs.org/ |
| Python | 3.11 | https://www.python.org/downloads/ (marcar *"Add Python to PATH"*) |

Luego, **una sola vez** después de clonar (y cada vez que cambie `package.json` o `requirements.txt`), ejecutar desde la carpeta `bienestar-app`:

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

**macOS / Linux:**
```bash
bash setup.sh
```

Finalmente recargar VS Code: `Ctrl + Shift + P` → **Developer: Reload Window**.

> 💡 En PowerShell, si `npm` da error de *"ejecución de scripts deshabilitada"*, usa `npm.cmd` o ejecuta una vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### Paso 2: Abrir una terminal
*   **Windows:** Presionar `Win + R`, escribir `powershell` y presionar Enter (o abrir la terminal integrada de VS Code con `Ctrl + ñ`).
*   **macOS / Linux:** Abrir la aplicación *Terminal*.

### Paso 3: Buscar la carpeta del proyecto
Si no sabes dónde está la carpeta `bienestar-app`, puedes buscarla:

**Windows (PowerShell):**
```powershell
# Buscar la carpeta desde tu carpeta de usuario
Get-ChildItem -Path $HOME -Directory -Recurse -Filter "bienestar-app" -ErrorAction SilentlyContinue | Select-Object FullName
```

**macOS / Linux:**
```bash
find ~ -type d -name "bienestar-app" 2>/dev/null
```

El comando mostrará la ruta completa, por ejemplo: `C:\Users\TuUsuario\Desktop\MPeralillo\bienestar-app`.

### Paso 4: Posicionarse en la carpeta `bienestar-app`

**Windows (PowerShell):**
```powershell
# Usar la ruta obtenida en el paso anterior (las comillas evitan problemas con espacios)
cd "C:\Users\TuUsuario\Desktop\MPeralillo\bienestar-app"

# Atajo si está en el Escritorio:
cd "$HOME\Desktop\MPeralillo\bienestar-app"
```

**macOS / Linux:**
```bash
cd ~/Desktop/MPeralillo/bienestar-app
```

Comandos útiles para navegar:
```bash
pwd          # Muestra la carpeta actual
ls           # Lista el contenido de la carpeta actual
cd ..        # Sube un nivel
cd carpeta   # Entra a una subcarpeta
```

Verifica que estás en la carpeta correcta: al ejecutar `ls` deben aparecer `docker-compose.yml`, `backend` y `frontend`.

### Paso 5: Construir y levantar los contenedores
```bash
docker compose up --build
```
> La primera vez puede tardar varios minutos mientras se descargan las imágenes e instalan dependencias.

Para ejecutarlo en segundo plano (liberando la terminal):
```bash
docker compose up --build -d
```

### Paso 6: Comandos útiles de administración
```bash
docker compose ps                 # Ver el estado de los contenedores
docker compose logs -f            # Ver los logs en tiempo real (Ctrl + C para salir)
docker compose logs -f backend    # Logs de un servicio específico
docker compose down               # Detener y eliminar los contenedores
docker compose down -v            # Detener y BORRAR también los datos de la BD
docker compose up --build         # Reconstruir tras cambios en dependencias
```

> Si se ejecutó sin `-d`, detener los servicios con `Ctrl + C` y luego `docker compose down`.

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
