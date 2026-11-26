"""Controlador REST para Control Financiero, Presupuestos y Aporte Municipal en UTM (HU-08)."""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models import User, UserRole
from app.schemas.finanzas import (
    AporteMunicipalUtmIn,
    AporteMunicipalUtmOut,
    CartolaBancoEstadoIn,
    CartolaConciliacionResultOut,
    ChequeEnTransitoOut,
    ConciliacionPlanillaDetalleOut,
    ConciliacionPlanillaIn,
    ConciliacionPlanillaOut,
    Padron31DicOut,
    PagoAporteMensualOut,
    RegularizarAporteIn,
)
from app.services.conciliacion_service import ConciliacionService
from app.services.finanzas_service import FinanzasService

router = APIRouter()


def _extraer_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


@router.get("", include_in_schema=False)
@router.get("/", summary="Obtener estado financiero general del comité")
async def get_finanzas(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    return await FinanzasService.obtener_estado_financiero(db)


@router.get(
    "/aportes-utm/padron",
    response_model=Padron31DicOut,
    summary="Consultar padrón congelado al 31 de diciembre para cálculo de Subvención UTM (HU-08)",
)
async def get_padron_31_dic(
    anio: Optional[int] = Query(default=None, ge=2020, le=2040),
    _: User = Depends(
        require_roles(
            UserRole.PRESIDENTE,
            UserRole.SECRETARIO,
            UserRole.TESORERO,
            UserRole.ADMIN,
            UserRole.AUDITOR,
            UserRole.SUPERUSUARIO,
        )
    ),
    db: AsyncSession = Depends(get_db),
):
    return await FinanzasService.obtener_padron_31_dic(db, anio_fiscal=anio)


@router.get(
    "/aportes-utm",
    response_model=List[AporteMunicipalUtmOut],
    summary="Listar subvenciones municipales en UTM registradas (HU-08)",
)
async def get_aportes_utm(
    anio: Optional[int] = Query(default=None, ge=2020, le=2040),
    _: User = Depends(
        require_roles(
            UserRole.PRESIDENTE,
            UserRole.SECRETARIO,
            UserRole.TESORERO,
            UserRole.ADMIN,
            UserRole.AUDITOR,
            UserRole.SUPERUSUARIO,
        )
    ),
    db: AsyncSession = Depends(get_db),
):
    return await FinanzasService.listar_aportes_utm(db, anio_fiscal=anio)


@router.post(
    "/aportes-utm",
    response_model=AporteMunicipalUtmOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar Aporte Municipal en UTM (Socios al 31-dic × 4 × UTM) (HU-08)",
)
async def post_aporte_utm(
    payload: AporteMunicipalUtmIn,
    request: Request,
    user: User = Depends(
        require_roles(
            UserRole.PRESIDENTE,
            UserRole.SECRETARIO,
            UserRole.TESORERO,
            UserRole.ADMIN,
            UserRole.SUPERUSUARIO,
        )
    ),
    db: AsyncSession = Depends(get_db),
):
    return await FinanzasService.registrar_aporte_utm(
        db, payload, user, ip_origen=_extraer_ip(request)
    )


@router.delete(
    "/aportes-utm/{aporte_id}",
    summary="Anular un registro de Aporte Municipal en UTM (HU-08)",
)
async def delete_aporte_utm(
    aporte_id: int,
    request: Request,
    user: User = Depends(
        require_roles(
            UserRole.PRESIDENTE,
            UserRole.ADMIN,
            UserRole.SUPERUSUARIO,
        )
    ),
    db: AsyncSession = Depends(get_db),
):
    return await FinanzasService.eliminar_aporte_utm(
        db, aporte_id, user, ip_origen=_extraer_ip(request)
    )


# ==============================================================================
# HU-07: Conciliación Planilla RRHH (Cód. 47) + Cartola BancoEstado
# ==============================================================================

@router.get(
    "/conciliacion/planillas",
    response_model=List[ConciliacionPlanillaOut],
    summary="Listar conciliaciones mensuales RRHH Cód. 47 (HU-07)",
)
async def get_conciliaciones_planilla(
    _: User = Depends(
        require_roles(
            UserRole.PRESIDENTE,
            UserRole.SECRETARIO,
            UserRole.TESORERO,
            UserRole.ADMIN,
            UserRole.AUDITOR,
            UserRole.SUPERUSUARIO,
        )
    ),
    db: AsyncSession = Depends(get_db),
):
    return await ConciliacionService.listar_conciliaciones(db)


@router.get(
    "/conciliacion/planillas/{conciliacion_id}",
    response_model=ConciliacionPlanillaDetalleOut,
    summary="Obtener detalle socio a socio de una conciliación Cód. 47 (HU-07)",
)
async def get_conciliacion_detalle(
    conciliacion_id: int,
    _: User = Depends(
        require_roles(
            UserRole.PRESIDENTE,
            UserRole.SECRETARIO,
            UserRole.TESORERO,
            UserRole.ADMIN,
            UserRole.AUDITOR,
            UserRole.SUPERUSUARIO,
        )
    ),
    db: AsyncSession = Depends(get_db),
):
    return await ConciliacionService.obtener_detalle_conciliacion(db, conciliacion_id)


@router.post(
    "/conciliacion/planillas",
    response_model=ConciliacionPlanillaDetalleOut,
    status_code=status.HTTP_201_CREATED,
    summary="Procesar conciliación mensual RRHH Cód. 47 vs depósito BancoEstado (HU-07)",
)
async def post_conciliacion_planilla(
    payload: ConciliacionPlanillaIn,
    request: Request,
    user: User = Depends(
        require_roles(
            UserRole.PRESIDENTE,
            UserRole.SECRETARIO,
            UserRole.TESORERO,
            UserRole.ADMIN,
            UserRole.SUPERUSUARIO,
        )
    ),
    db: AsyncSession = Depends(get_db),
):
    return await ConciliacionService.procesar_conciliacion_cod47(
        db, payload, user, ip_origen=_extraer_ip(request)
    )


@router.patch(
    "/conciliacion/aportes/{aporte_id}/regularizar",
    response_model=PagoAporteMensualOut,
    summary="Regularizar brecha de aporte mensual de un socio (HU-07)",
)
async def patch_regularizar_aporte(
    aporte_id: int,
    payload: RegularizarAporteIn,
    request: Request,
    user: User = Depends(
        require_roles(
            UserRole.PRESIDENTE,
            UserRole.SECRETARIO,
            UserRole.TESORERO,
            UserRole.ADMIN,
            UserRole.SUPERUSUARIO,
        )
    ),
    db: AsyncSession = Depends(get_db),
):
    return await ConciliacionService.regularizar_aporte(
        db, aporte_id, payload, user, ip_origen=_extraer_ip(request)
    )


@router.get(
    "/conciliacion/cheques-transito",
    response_model=List[ChequeEnTransitoOut],
    summary="Listar cheques de reembolsos pendientes de cobro y alertas > 60 días (HU-07)",
)
async def get_cheques_en_transito(
    _: User = Depends(
        require_roles(
            UserRole.PRESIDENTE,
            UserRole.SECRETARIO,
            UserRole.TESORERO,
            UserRole.ADMIN,
            UserRole.AUDITOR,
            UserRole.SUPERUSUARIO,
        )
    ),
    db: AsyncSession = Depends(get_db),
):
    return await ConciliacionService.listar_cheques_en_transito(db)


@router.post(
    "/conciliacion/cartola-bancoestado",
    response_model=CartolaConciliacionResultOut,
    summary="Cruzar cartola BancoEstado para marcar cheques cobrados en lote (HU-07)",
)
async def post_cartola_bancoestado(
    payload: CartolaBancoEstadoIn,
    request: Request,
    user: User = Depends(
        require_roles(
            UserRole.PRESIDENTE,
            UserRole.SECRETARIO,
            UserRole.TESORERO,
            UserRole.ADMIN,
            UserRole.SUPERUSUARIO,
        )
    ),
    db: AsyncSession = Depends(get_db),
):
    return await ConciliacionService.conciliar_cartola_bancoestado(
        db, payload, user, ip_origen=_extraer_ip(request)
    )
