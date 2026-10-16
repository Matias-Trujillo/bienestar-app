"""Endpoints para el módulo de Afiliación y Cargas Familiares."""
from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter()


@router.get("/", summary="Obtener información de afiliación del socio")
async def get_afiliacion() -> Dict[str, Any]:
    return {
        "modulo": "Afiliación y Cargas",
        "descripcion": "Gestión de fichas de socios, historial de afiliación y registro de cargas familiares.",
        "status": "activo"
    }


@router.get("/cargas", summary="Listar cargas familiares registradas")
async def get_cargas_familiares() -> Dict[str, Any]:
    return {
        "cargas": [
            {"id": 1, "nombre": "Valentina Peralillo", "parentesco": "Hija", "edad": 7, "estado": "Vigente"},
            {"id": 2, "nombre": "Matías Peralillo", "parentesco": "Hijo", "edad": 4, "estado": "Vigente"}
        ]
    }
