"""Endpoints para el módulo de Reembolsos Médicos y Dentales."""
from fastapi import APIRouter
from typing import Dict, Any, List

router = APIRouter()


@router.get("/", summary="Obtener historial de reembolsos médicos")
async def get_reembolsos() -> Dict[str, Any]:
    return {
        "modulo": "Reembolsos Médicos",
        "descripcion": "Gestión, cálculo y liquidación de reembolsos ambulatorios, hospitalarios y dentales.",
        "solicitudes_activas": 1
    }


@router.get("/resumen-socio", summary="Obtener resumen de saldo anual de salud y estado previsional")
async def get_resumen_socio() -> Dict[str, Any]:
    return {
        "socio_nombre": "Carlos Valenzuela M.",
        "rut": "15.489.123-K",
        "tipo_socio": "Socio Activo",
        "estado_previsional": "Al día",
        "saldo_salud_disponible": 150000,
        "saldo_salud_total_anual": 250000,
        "porcentaje_utilizado": 40.0
    }
