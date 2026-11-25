"""Endpoints REST del Módulo Vecino y Nuevo Talento — Trabaja con Nosotros (Ley N° 21.015)."""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.talento import (
    CompetenciaOut,
    PostulacionTalentoIn,
    PostulacionTalentoOut,
)
from app.services.talento_service import TalentoService

router = APIRouter()


def _extraer_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


@router.get(
    "/competencias",
    response_model=List[CompetenciaOut],
    summary="Catálogo público de competencias técnicas precargadas",
)
async def listar_competencias(db: AsyncSession = Depends(get_db)):
    return await TalentoService.listar_competencias(db)


@router.post(
    "/postulaciones",
    response_model=PostulacionTalentoOut,
    status_code=status.HTTP_201_CREATED,
    summary="Enviar postulación laboral (Trabaja con Nosotros) con CV y notificación a ambas partes",
)
async def crear_postulacion(
    payload: PostulacionTalentoIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await TalentoService.crear_postulacion(db, payload, ip_origen=_extraer_ip(request))


@router.get(
    "/postulaciones",
    response_model=List[PostulacionTalentoOut],
    summary="Listar postulaciones recibidas en Trabaja con Nosotros (solo Directiva/Admin)",
)
async def listar_postulaciones(
    q: Optional[str] = Query(default=None),
    jornada: Optional[str] = Query(default=None),
    modalidad: Optional[str] = Query(default=None),
    solo_ley_21015: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(
        require_roles(
            UserRole.PRESIDENTE,
            UserRole.SECRETARIO,
            UserRole.ADMIN,
            UserRole.AUDITOR,
            UserRole.SUPERUSUARIO,
        )
    ),
):
    return await TalentoService.listar_postulaciones(
        db,
        q=q,
        jornada=jornada,
        modalidad=modalidad,
        solo_ley_21015=solo_ley_21015,
    )


@router.get(
    "/postulaciones/{folio}/cv",
    summary="Descargar CV adjunto de una postulación (solo Directiva/Admin)",
)
async def descargar_cv(
    folio: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(
        require_roles(
            UserRole.PRESIDENTE,
            UserRole.SECRETARIO,
            UserRole.ADMIN,
            UserRole.AUDITOR,
            UserRole.SUPERUSUARIO,
        )
    ),
):
    filename, content_type, data = await TalentoService.obtener_cv_descarga(db, folio)
    return Response(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
