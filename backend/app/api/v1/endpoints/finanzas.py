"""Controlador REST delgado para Control Financiero y Presupuestos (SRP).

[ESTUDIANTE INFORMÁTICA] Delega las consultas agregadas a `FinanzasService`.
"""
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.services.finanzas_service import FinanzasService

router = APIRouter()


@router.get("", include_in_schema=False)
@router.get("/", summary="Obtener estado financiero general del comité")
async def get_finanzas(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    return await FinanzasService.obtener_estado_financiero(db)
