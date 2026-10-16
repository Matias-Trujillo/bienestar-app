"""Endpoints para el módulo de Administración y Configuración."""
from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter()


@router.get("/", summary="Obtener estado administrativo")
async def get_admin_status() -> Dict[str, Any]:
    return {
        "modulo": "Administración",
        "descripcion": "Gestión de directiva, auditoría del sistema, reportes y parámetros globales.",
        "version_sistema": "1.0.0",
        "usuarios_activos": 142
    }
