"""Endpoints para el módulo de Control Financiero."""
from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter()


@router.get("/", summary="Obtener estado financiero general del comité")
async def get_finanzas() -> Dict[str, Any]:
    return {
        "modulo": "Control Financiero",
        "descripcion": "Presupuestos anuales, fondos disponibles, balances de ingresos por cuotas y egresos.",
        "periodo_fiscal": "2026",
        "fondo_general": 25400000,
        "fondo_salud_disponible": 14200000
    }
