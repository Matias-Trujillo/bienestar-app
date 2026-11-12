"""Controlador HTTP REST para el módulo de Afiliación y Cargas Familiares (HU-01 y HU-02).

Arquitectura Limpia: Los endpoints delegan estrictamente en `AfiliacionService`
manteniendo las rutas libres de consultas SQL y cálculos de negocio.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.afiliacion import (
    CargaMasivaRequestIn,
    ComprobanteOut,
    NuevaCargaIn,
    ResolucionSolicitudIn,
    SolicitudCargaOut,
    SolicitudIn,
)
from app.services.afiliacion_service import AfiliacionService

router = APIRouter()

ROLES_DIRECTIVA = (
    UserRole.PRESIDENTE,
    UserRole.SECRETARIO,
    UserRole.TESORERO,
    UserRole.ADMIN,
    UserRole.AUDITOR,
    UserRole.SUPERUSUARIO,
)

ROLES_RESOLUTIVOS = (
    UserRole.PRESIDENTE,
    UserRole.SECRETARIO,
    UserRole.SUPERUSUARIO,
)


# [ESTUDIANTE INFORMÁTICA] Retorna la descripción institucional y normativa del módulo de afiliación.
@router.get("", include_in_schema=False)
@router.get("/", summary="Obtener información de afiliación del socio")
async def get_afiliacion() -> Dict[str, Any]:
    return {
        "modulo": "Afiliación y Cargas Familiares",
        "descripcion": "Gestión digital de postulaciones, cuotas y acreditación legal de cargas familiares.",
        "ley": "Ley N° 19.754 de Bienestar Municipal",
    }


# [ESTUDIANTE INFORMÁTICA] Endpoint público para validar si el período reglamentario (enero-junio) está activo.
@router.get("/periodo", summary="Período de postulación y cláusulas informativas (público)")
async def get_periodo() -> Dict[str, Any]:
    return AfiliacionService.obtener_periodo_actual()


# [ESTUDIANTE INFORMÁTICA] Permite a funcionarios municipales enviar su solicitud digital de incorporación con descuento del 4%.
@router.post(
    "/solicitudes",
    response_model=ComprobanteOut,
    status_code=status.HTTP_201_CREATED,
    summary="Ingresar postulación digital de incorporación (público)",
)
async def crear_solicitud(
    payload: SolicitudIn,
    db: AsyncSession = Depends(get_db),
) -> ComprobanteOut:
    return await AfiliacionService.crear_solicitud(db, payload)


# [ESTUDIANTE INFORMÁTICA] Permite consultar el estado de una postulación mediante folio y RUN sin iniciar sesión.
@router.get(
    "/solicitudes/{folio}",
    response_model=ComprobanteOut,
    summary="Consultar comprobante por folio y RUN (público)",
)
async def consultar_solicitud(
    folio: str,
    run: str,
    db: AsyncSession = Depends(get_db),
) -> ComprobanteOut:
    return await AfiliacionService.consultar_solicitud(db, folio, run)


# [ESTUDIANTE INFORMÁTICA] Retorna la cantidad de solicitudes de afiliación pendientes para badges de menú y notificaciones.
@router.get(
    "/conteo-pendientes",
    summary="Obtener cantidad de solicitudes de afiliación pendientes de resolución",
)
async def get_conteo_pendientes(
    _: User = Depends(require_roles(*ROLES_DIRECTIVA)),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, int]:
    total = await AfiliacionService.contar_pendientes(db)
    return {"pendientes": total}


# [ESTUDIANTE INFORMÁTICA] Lista todas las solicitudes de incorporación para la bandeja de evaluación de la Directiva.
@router.get(
    "/solicitudes",
    response_model=List[ComprobanteOut],
    summary="Listar solicitudes de incorporación (Directiva)",
)
async def listar_solicitudes(
    estado: Optional[str] = None,
    _: User = Depends(require_roles(*ROLES_DIRECTIVA)),
    db: AsyncSession = Depends(get_db),
) -> List[ComprobanteOut]:
    return await AfiliacionService.listar_solicitudes(db, estado)


# [ESTUDIANTE INFORMÁTICA] Resuelve la postulación en sesión de Directorio con N° de Acta y fecha de inicio de carencia (HU-02).
@router.post(
    "/solicitudes/{folio}/resolucion",
    response_model=ComprobanteOut,
    summary="Aprobar o rechazar solicitud de incorporación (Directorio Resolutivo)",
)
async def resolver_solicitud(
    folio: str,
    payload: ResolucionSolicitudIn,
    current_user: User = Depends(require_roles(*ROLES_RESOLUTIVOS)),
    db: AsyncSession = Depends(get_db),
) -> ComprobanteOut:
    return await AfiliacionService.resolver_solicitud(db, folio, payload, current_user)


# [ESTUDIANTE INFORMÁTICA] Genera la nómina mensual de retenciones del 4% para exportación a Recursos Humanos y Finanzas (HU-02).
@router.get(
    "/nomina-retenciones",
    summary="Nómina mensual de retenciones para Finanzas / RRHH (Directiva)",
)
async def get_nomina_retenciones(
    _: User = Depends(require_roles(*ROLES_DIRECTIVA)),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    return await AfiliacionService.obtener_nomina_retenciones(db)


# [ESTUDIANTE INFORMÁTICA] Permite al socio ver sus cargas o a la administración listar todas las cargas registradas.
@router.get("/mis-cargas", summary="Listar cargas familiares (propias o generales)")
async def get_mis_cargas(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    return await AfiliacionService.obtener_mis_cargas(db, current_user)


# [ESTUDIANTE INFORMÁTICA] Permite a un socio activo solicitar la incorporación de una nueva carga adjuntando certificado civil.
@router.post(
    "/mis-cargas",
    response_model=SolicitudCargaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Solicitar nueva carga familiar con respaldo digital",
)
async def solicitar_nueva_carga(
    body: NuevaCargaIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SolicitudCargaOut:
    return await AfiliacionService.solicitar_nueva_carga(db, current_user, body)


# [ESTUDIANTE INFORMÁTICA] Bandeja para la Directiva con las solicitudes de nuevas cargas familiares pendientes de evaluar.
@router.get(
    "/solicitudes-cargas",
    response_model=List[SolicitudCargaOut],
    summary="Listar solicitudes de nuevas cargas familiares (Directiva)",
)
async def listar_solicitudes_cargas(
    _: User = Depends(require_roles(*ROLES_DIRECTIVA)),
    db: AsyncSession = Depends(get_db),
) -> List[SolicitudCargaOut]:
    return await AfiliacionService.listar_solicitudes_cargas(db)


# [ESTUDIANTE INFORMÁTICA] Permite al Directorio aprobar o rechazar la incorporación de una nueva carga familiar.
@router.post(
    "/solicitudes-cargas/{folio}/resolucion",
    response_model=SolicitudCargaOut,
    summary="Aprobar o rechazar solicitud de carga familiar (Directiva Resolutiva)",
)
async def resolver_solicitud_carga(
    folio: str,
    body: ResolucionSolicitudIn,
    current_user: User = Depends(require_roles(*ROLES_RESOLUTIVOS)),
    db: AsyncSession = Depends(get_db),
) -> SolicitudCargaOut:
    return await AfiliacionService.resolver_solicitud_carga(db, folio, body, current_user)


# [ESTUDIANTE INFORMÁTICA] Permite la ingestión masiva de socios y cargas familiares desde un archivo de nómina municipal.
@router.post(
    "/carga-masiva",
    summary="Carga masiva de socios y cargas familiares (Directiva Municipal)",
)
async def procesar_carga_masiva(
    body: CargaMasivaRequestIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    return await AfiliacionService.procesar_carga_masiva_socios(db, body, current_user)
