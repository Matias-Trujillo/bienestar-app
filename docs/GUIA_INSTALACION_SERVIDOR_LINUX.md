# 🖥️ Guía Maestra: De Torre Gamer con Windows 10 a Servidor Linux 24/7 Headless
## Sistema Bienestar App — Ilustre Municipalidad de Peralillo

> **Objetivo:** Guía completa, paso a paso y desde cero, para transformar una torre de escritorio (actualmente con Windows 10) en un **Servidor de Producción dedicado, silencioso, sin monitor (Headless) y de bajo consumo energético**.  
> El sistema quedará accesible por internet con un **dominio público gratuito con SSL (HTTPS)** y despliegue continuo (**CI/CD**) cada vez que hagas `git push`.

---

## 📑 Índice de Contenidos
1. [Paso 0: Creación del Pendrive Booteable desde Windows](#paso-0-creación-del-pendrive-booteable-desde-windows)
2. [Paso 1: Ajustes de BIOS/UEFI para Servidor 24/7](#paso-1-ajustes-de-biosuefi-para-servidor-247)
3. [Paso 2: Instalación Limpia de Ubuntu Server 24.04 LTS](#paso-2-instalación-limpia-de-ubuntu-server-2404-lts)
4. [Paso 3: Paso al Modo Headless (Desconexión de Pantalla)](#paso-3-paso-al-modo-headless-desconexión-de-pantalla)
5. [Paso 4: Conexión Remota por SSH desde este PC (Windows)](#paso-4-conexión-remota-por-ssh-desde-este-pc-windows)
6. [Paso 5: Aprovisionamiento y Puesta en Marcha de Docker](#paso-5-aprovisionamiento-y-puesta-en-marcha-de-docker)
7. [Paso 6: Dominio Público 100% Gratuito con SSL (Tailscale Funnel)](#paso-6-dominio-público-100-gratuito-con-ssl-tailscale-funnel)
8. [Paso 7: Conectar GitHub Actions CI/CD (Despliegue Automático)](#paso-7-conectar-github-actions-cicd-despliegue-automático)
9. [Comandos de Mantenimiento y Monitoreo](#comandos-de-mantenimiento-y-monitoreo)

---

## Paso 0: Creación del Pendrive Booteable desde Windows

> [!WARNING]
> Si tienes partidas guardadas, fotos o archivos importantes en el segundo computador, respalda todo ahora en un disco externo o en Google Drive/OneDrive, ya que en la instalación formatearemos el disco completo para dejarlo 100% dedicado a Linux.

### Herramientas Requeridas:
* 1 Pendrive USB de al menos **4 GB o 8 GB** (se formateará).
* Conexión a internet.

### Instrucciones:
1. **Descargar la Imagen de Ubuntu Server:**
   * Entra a la web oficial: [ubuntu.com/download/server](https://ubuntu.com/download/server)
   * Descarga la versión **Ubuntu Server 26.04.1 LTS** (o 24.04 LTS) en formato `.iso`. Es completamente gratuita.
   * *Nota didáctica:* Las siglas **LTS** significan *Long Term Support* (Soporte a Largo Plazo de 5 años). El `.1` indica que es la versión consolidada y más estable con soporte para componentes y placas madre recientes.
2. **Descargar Rufus:**
   * Descarga la versión portable desde [rufus.ie](https://rufus.ie).
3. **Grabar la ISO en el Pendrive:**
   * Abre Rufus en tu PC con Windows.
   * En **Dispositivo**, selecciona tu pendrive USB.
   * En **Elección de arranque**, haz clic en *SELECCIONAR* y escoge el archivo `.iso` de Ubuntu Server descargado.
   * En **Esquema de partición**, deja **GPT** (estándar para placas madre modernas con UEFI).
   * En **Sistema de destino**, deja **UEFI (no CSM)**.
   * Haz clic en **EMPEZAR**. Si te pide descargar archivos adicionales o escribir en modo ISO/DD, acepta las opciones recomendadas.
   * Espera 3-5 minutos hasta que la barra llegue al 100% y diga *"PREPARADO"*. Retira el pendrive.

---

## Paso 1: Ajustes de BIOS/UEFI para Servidor 24/7

Conecta monitor, teclado y el pendrive USB a la torre secundaria.

1. **Entrar a la BIOS:**  
   Enciende la torre y presiona repetidamente la tecla `Supr` (`Delete`) o `F2` en el teclado (dependiendo de la marca de la placa: ASUS, MSI, Gigabyte, ASRock).
2. **Ajuste Vital: Encendido Automático tras Corte de Luz (AC Power Loss):**  
   * Ve a la pestaña **Advanced** $\rightarrow$ **APM Configuration** (o **Power Management Setup**).
   * Busca la opción llamada:
     * `Restore AC Power Loss` o `AC Back Function` o `After Power Loss`.
   * Cámbiala de *Power Off* a **Power On** (o *Last State*).
   * *¿Qué permite esto?* Si en algún momento se corta la luz en tu casa o se desenchufa la torre, cuando vuelva la electricidad la torre **se encenderá sola de forma automática**, sin que tengas que ir a presionar el botón físico.
3. **Orden de Arranque (Boot Priority):**  
   * Ve a la pestaña **Boot**.
   * Pon tu pendrive USB como **Boot Option #1**.
4. **Guardar y Reiniciar:**  
   Presiona `F10` para guardar los cambios y reiniciar.

---

## Paso 2: Instalación Limpia de Ubuntu Server 24.04 LTS

Al iniciar desde el pendrive, verás el menú de bienvenida de Ubuntu:

```text
  Try or Install Ubuntu Server  <--- Presiona Enter aquí
```

Aparecerá el asistente en texto interactivo (te mueves con las flechas del teclado, `Espacio` para marcar casillas y `Enter` para continuar):

1. **Idioma:** Selecciona *Español* (o *English*).
2. **Distribución del teclado:** Selecciona *Spanish* (o *Spanish - Latin American*).
3. **Tipo de instalación:**  
   Elige **Ubuntu Server (minimized)**. Esta opción no instala paquetes innecesarios, dejando el sistema ultra liviano (consumirá solo unos 350 MB de memoria RAM en reposo).
4. **Conexión de Red:**  
   * **Recomendación de oro:** Conecta la torre por **cable Ethernet** al router para máxima estabilidad. Verás que toma una IP automáticamente (ej. `192.168.1.XXX/24`).
   * Si usas WiFi, selecciona tu red inalámbrica e introduce la contraseña.
5. **Configuración de Proxy y Archivo:** Presiona *Hecho* (Done).
6. **Configuración de Almacenamiento (Borrado de Windows 10):**  
   * Marca la opción **"Use an entire disk"** (Usar un disco entero).
   * Selecciona el SSD o disco principal donde estaba instalado Windows 10.
   * Desmarca la casilla *Set up this disk as an LVM group* si quieres partición directa simple, o déjala por defecto.
   * Selecciona *Hecho* y cuando aparezca la advertencia en rojo diciendo que **se destruirán los datos existentes de Windows 10**, selecciona **Continuar**.
7. **Perfil y Credenciales del Servidor:**  
   * **Su nombre:** Tu nombre (ej. `Administrador`).
   * **Nombre de su servidor:** `servidor-peralillo`
   * **Elija un nombre de usuario:** `servidor` (o el nombre que prefieras).
   * **Elija una contraseña:** Escribe una clave segura y confírmala.
8. **Instalación de OpenSSH (PASO FUNDAMENTAL):**  
   * Aparecerá la pantalla *Configuración de SSH*.
   * Marca con la barra espaciadora la casilla:
     ```text
     [X] Instalar el servidor OpenSSH (Install OpenSSH server)
     ```
   * *Si olvidas este paso, no podrás conectarte de forma remota.*
9. **Snap del Servidor:** No marques nada aquí (instalaremos Docker oficialmente después). Presiona *Hecho*.
10. **Instalación finalizada:**  
    El sistema descargará los paquetes finales. Cuando termine, dirá *"Reiniciar ahora"* (Reboot Now). Retira el pendrive USB cuando la pantalla te lo indique y presiona `Enter`.

---

## Paso 3: Paso al Modo Headless (Desconexión de Pantalla)

1. La torre arrancará por primera vez con Ubuntu Server.
2. Inicia sesión en pantalla con tu usuario (`servidor`) y tu contraseña.
3. Averigua la dirección IP que le asignó tu router ejecutando:
   ```bash
   ip -br a
   ```
   Verás una línea como:
   ```text
   enp3s0   UP   192.168.1.120/24 ...
   ```
   *¡Anota esa IP!* (en este ejemplo: `192.168.1.120`).

4. **Desconexión Física Total:**
   * Apaga la torre con:
     ```bash
     sudo poweroff
     ```
   * Desconecta el cable HDMI/DisplayPort del monitor.
   * Desconecta el teclado y el ratón USB.
   * Conecta únicamente:
     1. El cable de alimentación eléctrica.
     2. El cable de red Ethernet al router (si no usas WiFi).
   * Presiona el botón de encendido de la torre.
   * **¡Listo! Tu torre ahora es un servidor silencioso de alta potencia funcionando en modo Headless.** No necesitas volver a ponerle monitor.

---

## Paso 4: Conexión Remota por SSH desde este PC (Windows)

A partir de este momento, todo se hace sentado en tu computador principal con Windows.

### Opción A: Desde PowerShell o Windows Terminal
1. Presiona `Win + X` y abre **Terminal** o **PowerShell**.
2. Conéctate a la torre ejecutando:
   ```powershell
   ssh servidor@192.168.1.120
   ```
   *(Reemplaza `servidor` por tu usuario y la IP por la de tu torre)*.
3. La primera vez te preguntará: `Are you sure you want to continue connecting (yes/no/[fingerprint])?`. Escribe `yes` y presiona Enter.
4. Ingresa tu contraseña (al escribir la contraseña en Linux no se verán asteriscos por seguridad, es normal).
5. ¡Verás el mensaje de bienvenida de Ubuntu Server en tu terminal de Windows!

### Opción B: Conexión Gráfica con VS Code (Extremadamente Cómoda)
1. Abre **Visual Studio Code** en este PC de Windows.
2. Ve a la pestaña de Extensiones (`Ctrl + Shift + X`) y busca:
   **Remote - SSH** (de Microsoft). Haz clic en *Instalar*.
3. Presiona `F1`, escribe `Remote-SSH: Connect to Host...` y presiona Enter.
4. Escribe: `servidor@192.168.1.120`.
5. Se abrirá una ventana de VS Code conectada directamente a los archivos de tu servidor Linux, con terminal integrada.

---

## Paso 5: Aprovisionamiento y Puesta en Marcha de Docker

Estando dentro de la sesión SSH en tu servidor Linux:

1. **Clonar tu repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/bienestar-app.git
   cd bienestar-app
   ```
2. **Ejecutar el instalador automático:**
   ```bash
   chmod +x deploy/setup_server.sh
   ./deploy/setup_server.sh
   ```
   *Este script instalará Docker Engine, Docker Compose, activará el firewall UFW y optimizará el sistema.*
3. **Cerrar y reabrir sesión SSH** (para que tu usuario tome permisos de Docker sin `sudo`):
   ```bash
   exit
   ```
   Vuelve a entrar:
   ```bash
   ssh servidor@192.168.1.120
   cd bienestar-app
   ```
4. **Configurar las variables de producción:**
   ```bash
   cp .env.production.example .env.production
   nano .env.production
   ```
   *(Modifica la contraseña de PostgreSQL y las claves si lo deseas; guarda con `Ctrl + O`, presiona Enter y sal con `Ctrl + X`)*.
5. **Iniciar la aplicación en producción:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
6. **Verificar que los contenedores estén activos:**
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```
   Verás los 3 contenedores (`bienestar_postgres_prod`, `bienestar_backend_prod` y `bienestar_frontend_prod`) con estado `Up` y `healthy`.
   
   *Si abres tu navegador en Windows e ingresas a `http://192.168.1.120:3000`, ¡ya verás Bienestar App funcionando desde la torre!*

---

## Paso 6: Dominio Público 100% Gratuito con SSL (Tailscale Funnel)

Para que cualquier persona de la directiva municipal o tú desde tu teléfono puedan ingresar desde cualquier lugar del mundo (fuera de tu casa), usaremos **Tailscale Funnel**.

### ¿Por qué esta solución?
* **Cero costo:** 100% gratis para uso personal y proyectos.
* **Cero configuración de router:** No tienes que abrir puertos (Port Forwarding) en tu router ni lidiar con el CGNAT de tu compañía de internet (VTR, Movistar, Mundo, etc.).
* **SSL Automático:** Incluye certificado HTTPS firmado por Let's Encrypt de forma automática.

### Pasos de Activación (Solo 3 minutos):
1. **Crear cuenta en Tailscale:**
   * Entra a [tailscale.com](https://tailscale.com) desde tu navegador y regístrate gratis con tu cuenta de Google o GitHub.
2. **Instalar Tailscale en el Servidor Linux (vía SSH):**
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   ```
3. **Vincular el Servidor a tu Red:**
   ```bash
   sudo tailscale up
   ```
   Te mostrará un enlace tipo `https://login.tailscale.com/a/...`. Ábrelo en tu navegador y haz clic en **Connect**.
4. **Habilitar MagicDNS y HTTPS:**
   * En el panel de control web de Tailscale ([login.tailscale.com/admin](https://login.tailscale.com/admin)):
     * Ve a **DNS** $\rightarrow$ Activa **MagicDNS** y activa **HTTPS Certificates**.
     * Ve a **Access Controls** y asegúrate de que Funnel esté permitido (viene activado por defecto para cuentas estándar).
5. **Publicar el puerto de Bienestar App:**
   En la terminal SSH de tu servidor, ejecuta:
   ```bash
   sudo tailscale funnel 3000
   ```
   ¡Listo! Te entregará tu URL permanente y segura, por ejemplo:
   ```text
   https://servidor-peralillo.tailnet-xyz.ts.net
   ```
   *Pruébala desde tu celular con datos móviles (4G/5G). ¡La web cargará de inmediato con candado verde seguro!*

---

## Paso 7: Conectar GitHub Actions CI/CD (Despliegue Automático)

Para que tu torre se actualice sola cada vez que hagas cambios en el código:

1. Ve a tu repositorio en GitHub desde el navegador:
   * Haz clic en **Settings** $\rightarrow$ **Actions** $\rightarrow$ **Runners**.
   * Haz clic en el botón verde **New self-hosted runner**.
   * Selecciona el sistema operativo: **Linux**, Arquitectura: **x64**.
2. GitHub te mostrará unos comandos sencillos para descargar el runner.
3. En la terminal SSH de tu torre Linux, ejecuta:
   ```bash
   mkdir actions-runner && cd actions-runner
   # Copia y pega los comandos curl y tar que te muestra GitHub en pantalla
   ```
4. Configura el runner pegando el comando `./config.sh ...` que te da GitHub.
   * Nombre del runner: Presiona Enter (usará `servidor-peralillo`).
   * Etiquetas adicionales: Escribe `self-hosted` y presiona Enter.
5. **Instalar el Runner como Servicio de Sistema Permanente:**
   *(Esto hace que el runner se ejecute en segundo plano y arranque solo cuando la torre encienda)*:
   ```bash
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

A partir de este instante:
* Cuando hagas `git push origin main` desde tu computador Windows:
  1. GitHub Actions correrá las **19 pruebas automatizadas de Pytest**.
  2. Verificará que no haya errores de TypeScript.
  3. Si todo pasa, enviará la orden a tu torre para que haga `git pull` y `docker compose up -d --build`.
  4. Tu sitio web público se actualizará en vivo en menos de 60 segundos sin que tengas que tocar nada.

---

## Comandos de Mantenimiento y Monitoreo

Comandos rápidos para consultar el estado de tu servidor desde PowerShell SSH:

* **Ver uso de CPU, RAM y temperatura:**
  ```bash
  htop
  ```
* **Ver consumo de memoria y CPU de cada contenedor Docker:**
  ```bash
  docker stats
  ```
* **Ver logs en tiempo real del backend:**
  ```bash
  docker compose -f docker-compose.prod.yml logs -f backend
  ```
* **Reiniciar los servicios:**
  ```bash
  docker compose -f docker-compose.prod.yml restart
  ```
* **Apagar el servidor de forma segura:**
  ```bash
  sudo poweroff
  ```
* **Reiniciar el servidor:**
  ```bash
  sudo reboot
  ```
