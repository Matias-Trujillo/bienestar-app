"""Endpoints para el módulo de Control Financiero y Presupuestos (HU-07 y HU-08)."""
from datetime import date
from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User, UserRole, SolicitudReembolso, SolicitudBeneficio

router = APIRouter()


# [ESTUDIANTE INFORMÁTICA] Calcula en vivo los indicadores presupuestarios del Comité de Bienestar sobre PostgreSQL.
@router.get("", include_in_schema=False)
@router.get("/", summary="Obtener estado financiero general del comité")
async def get_finanzas(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    socios_activos = await db.scalar(
        select(func.count(User.id)).where(User.rol == UserRole.SOCIO, User.is_active == True)
    ) or 0
    total_reembolsado = await db.scalar(
        select(func.coalesce(func.sum(SolicitudReembolso.monto_reembolso), 0)).where(
            SolicitudReembolso.estado.in_(("aprobado", "pagado"))
        )
    ) or 0
    total_bonos = await db.scalar(
        select(func.coalesce(func.sum(SolicitudBeneficio.monto_calculado), 0)).where(
            SolicitudBeneficio.estado.in_(("APROBADO", "LIQUIDADO"))
        )
    ) or 0
    fondo_general_base = 25400000
    fondo_salud_base = max(14200000, socios_activos * 150000)
    return {
        "modulo": "Control Financiero",
        "descripcion": "Presupuestos anuales, fondos disponibles, balances de ingresos por cuotas y egresos.",
        "periodo_fiscal": str(date.today().year),
        "socios_activos": int(socios_activos),
        "fondo_general": int(max(0, fondo_general_base - int(total_bonos))),
        "fondo_salud_disponible": int(max(0, fondo_salud_base - int(total_reembolsado))),
        "total_egresos_salud": int(total_reembolsado),
        "total_egresos_beneficios": int(total_bonos),
    }
