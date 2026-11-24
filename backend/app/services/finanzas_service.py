"""Servicio de dominio para Control Financiero y Presupuestos (SRP).

[ESTUDIANTE INFORMÁTICA] Extrae las consultas agregadas de PostgreSQL fuera del endpoint
`endpoints/finanzas.py` para respetar la arquitectura en capas y SRP.
"""
from datetime import date
from typing import Any, Dict

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SolicitudBeneficio, SolicitudReembolso, User, UserRole


class FinanzasService:
    """Calcula en vivo los indicadores presupuestarios del Comité de Bienestar."""

    FONDO_GENERAL_BASE_DEFAULT = 25_400_000
    FONDO_SALUD_MINIMO_BASE = 14_200_000
    TOPE_SALUD_POR_SOCIO = 150_000

    @classmethod
    async def obtener_estado_financiero(cls, db: AsyncSession) -> Dict[str, Any]:
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
        fondo_salud_base = max(cls.FONDO_SALUD_MINIMO_BASE, int(socios_activos) * cls.TOPE_SALUD_POR_SOCIO)
        return {
            "modulo": "Control Financiero",
            "descripcion": "Presupuestos anuales, fondos disponibles, balances de ingresos por cuotas y egresos.",
            "periodo_fiscal": str(date.today().year),
            "socios_activos": int(socios_activos),
            "fondo_general": int(max(0, cls.FONDO_GENERAL_BASE_DEFAULT - int(total_bonos))),
            "fondo_salud_disponible": int(max(0, fondo_salud_base - int(total_reembolsado))),
            "total_egresos_salud": int(total_reembolsado),
            "total_egresos_beneficios": int(total_bonos),
        }
