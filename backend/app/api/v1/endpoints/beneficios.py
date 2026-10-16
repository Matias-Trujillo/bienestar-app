"""Endpoints para el módulo de Beneficios Sociales."""
from fastapi import APIRouter
from typing import Dict, Any, List

router = APIRouter()


@router.get("/", summary="Listar catálogo de beneficios sociales disponibles")
async def get_beneficios() -> Dict[str, Any]:
    return {
        "modulo": "Beneficios Sociales",
        "beneficios_disponibles": [
            {"id": "bono-vacaciones", "nombre": "Bono de Vacaciones", "tope": 80000, "categoria": "Bienestar"},
            {"id": "bono-escolar", "nombre": "Bono Escolaridad y Matrícula", "tope": 45000, "categoria": "Educación"},
            {"id": "asignacion-natalidad", "nombre": "Asignación por Natalidad", "tope": 100000, "categoria": "Familia"},
            {"id": "ayuda-catastrofe", "nombre": "Fondo de Emergencia Social", "tope": 200000, "categoria": "Solidario"}
        ]
    }


@router.get("/movimientos", summary="Obtener historial de movimientos y beneficios solicitados")
async def get_movimientos() -> List[Dict[str, Any]]:
    return [
        {
            "id": "MOV-001",
            "fecha": "2026-03-28",
            "concepto": "Reembolso Farmacia (Receta Crónica)",
            "modulo": "Reembolsos Médicos",
            "monto": 32500,
            "estado": "Aprobado",
            "comprobante_url": "/docs/comprobantes/MOV-001.pdf"
        },
        {
            "id": "MOV-002",
            "fecha": "2026-03-15",
            "concepto": "Bono de Vacaciones Anual",
            "modulo": "Beneficios Sociales",
            "monto": 80000,
            "estado": "Pagado",
            "comprobante_url": "/docs/comprobantes/MOV-002.pdf"
        },
        {
            "id": "MOV-003",
            "fecha": "2026-02-20",
            "concepto": "Consulta Médica Especialista Oftalmología",
            "modulo": "Reembolsos Médicos",
            "monto": 25000,
            "estado": "En Revisión",
            "comprobante_url": "/docs/comprobantes/MOV-003.pdf"
        },
        {
            "id": "MOV-004",
            "fecha": "2026-01-10",
            "concepto": "Aporte Solidario Evento",
            "modulo": "Beneficios Sociales",
            "monto": 15000,
            "estado": "Rechazado",
            "comprobante_url": None
        }
    ]
