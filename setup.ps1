# Instala las dependencias locales para que el editor (VS Code) no muestre errores falsos.
# Uso (desde la carpeta bienestar-app):
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "== Comprobando herramientas ==" -ForegroundColor Cyan
foreach ($cmd in @("node", "npm.cmd", "python")) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "Falta '$cmd'. Instalalo (ver README, seccion Requisitos)." -ForegroundColor Red
        exit 1
    }
}
node --version
python --version

Write-Host "`n== Frontend: npm install ==" -ForegroundColor Cyan
Push-Location "$root\frontend"
npm.cmd install
Pop-Location

Write-Host "`n== Backend: entorno virtual + pip install ==" -ForegroundColor Cyan
Push-Location "$root\backend"
if (-not (Test-Path "venv")) { python -m venv venv }
& ".\venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\venv\Scripts\python.exe" -m pip install -r requirements.txt
Pop-Location

Write-Host "`nListo. Recarga VS Code (Ctrl+Shift+P > 'Developer: Reload Window')." -ForegroundColor Green
Write-Host "Para levantar el proyecto: docker compose up --build" -ForegroundColor Green
