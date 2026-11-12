#!/usr/bin/env bash
# ==============================================================================
# Script de Aprovisionamiento Automático — Servidor Linux Headless (Ubuntu 24.04)
# Proyecto: Bienestar App — Comité de Bienestar I.M. Peralillo
# ==============================================================================
set -e

echo "=========================================================="
echo "🚀 Iniciando Aprovisionamiento de Servidor Bienestar App"
echo "=========================================================="

# 1. Actualización de paquetes
echo "📦 1/5 Actualizando el sistema operativo..."
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw ca-certificates gnupg lsb-release

# 2. Instalación de Docker oficial y plugin Docker Compose
echo "🐳 2/5 Instalando Docker Engine y Docker Compose..."
if ! command -v docker &> /dev/null; then
    # Usar el script instalador oficial de Docker (compatible con Ubuntu 24.04 y 26.04)
    curl -fsSL https://get.docker.com | sudo sh
else
    echo "Docker ya se encuentra instalado."
fi

# Añadir el usuario actual al grupo docker para no requerir sudo
sudo usermod -aG docker "$USER" || true
sudo systemctl enable docker
sudo systemctl start docker

# 3. Configuración de Firewall (UFW)
echo "🛡️ 3/5 Configurando Firewall de Seguridad (UFW)..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
# Activar UFW sin preguntar interactivamente
sudo ufw --force enable

# 4. Ajustes del Sistema para Servidor 24/7 (Headless)
echo "⚙️ 4/5 Optimizando configuración del sistema para 24/7..."
# Aumentar límites de descriptores de archivos para PostgreSQL y Node.js
sudo tee -a /etc/sysctl.d/99-server.conf > /dev/null <<EOF
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288
EOF
sudo sysctl --system > /dev/null

# 5. Resumen final y siguientes pasos
echo ""
echo "=========================================================="
echo "✅ ¡Servidor Aprovisionado con Éxito!"
echo "=========================================================="
echo "Siguientes pasos recomendados:"
echo "1. Cerrar sesión y volver a entrar por SSH para aplicar permisos de Docker:"
echo "   exit"
echo "2. Para levantar la aplicación en producción:"
echo "   docker compose -f docker-compose.prod.yml up -d --build"
echo "3. Para publicar con dominio gratuito y SSL automático (Tailscale Funnel):"
echo "   curl -fsSL https://tailscale.com/install.sh | sh"
echo "   sudo tailscale up"
echo "   sudo tailscale funnel 3000"
echo "=========================================================="
