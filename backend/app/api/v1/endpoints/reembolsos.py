"""Endpoints para el módulo de Reembolsos Médicos y Dentales (HU-03).

Implementa:
  - GET  /                → Historial de solicitudes del socio + resumen.
  - GET  /resumen-socio   → Resumen de saldo anual, carencia y estado previsional.
  - POST /solicitud       → Crear nueva solicitud de reembolso.
  - POST /validar-fecha   → Validar plazo de 30 días corridos.
  - GET  /solicitud/{id}  → Detalle de una solicitud específica.
"""
import mimetypes
import os
import shutil
import uuid
from datetime import date
from pathlib import Path
from typing import Dict, Any, Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user, bearer_scheme
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User, UserRole
from app.models.reembolso import SolicitudReembolso
from app.schemas.reembolso import (
    ReembolsoCreateRequest,
    ResolverReembolsoRequest,
    ReembolsoOut,
    ResumenSaludSocio,
    ValidacionFechaResponse,
    ReembolsoHistorialResponse,
)
from app.services.reembolso_service import (
    crear_solicitud,
    listar_solicitudes_socio,
    listar_todas_solicitudes_admin,
    resolver_solicitud_reembolso,
    obtener_resumen_socio,
    solicitud_to_out,
    validar_carencia,
    validar_plazo_30_dias,
)

UPLOAD_DIR = Path(__file__).resolve().parents[4] / "uploads" / "reembolsos"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter()


# ---------- GET /reembolsos/ ----------

@router.get(
    "/",
    response_model=ReembolsoHistorialResponse,
    summary="Obtener historial de reembolsos médicos del socio autenticado",
)
async def get_reembolsos(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    resumen = await obtener_resumen_socio(user, db)
    solicitudes = await listar_solicitudes_socio(user, db)
    return ReembolsoHistorialResponse(
        resumen=resumen,
        solicitudes=[solicitud_to_out(s) for s in solicitudes],
    )


# ---------- GET /reembolsos/resumen-socio ----------

@router.get(
    "/resumen-socio",
    response_model=ResumenSaludSocio,
    summary="Obtener resumen de saldo anual de salud y estado previsional",
)
async def get_resumen_socio(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await obtener_resumen_socio(user, db)


# ---------- POST /reembolsos/validar-fecha ----------

class ValidarFechaRequest(BaseModel):
    fecha_atencion: date


@router.post(
    "/validar-fecha",
    response_model=ValidacionFechaResponse,
    summary="Validar si la fecha de atención está dentro del plazo de 30 días corridos",
)
async def post_validar_fecha(
    body: ValidarFechaRequest,
    user: User = Depends(get_current_user),
):
    return validar_plazo_30_dias(body.fecha_atencion)


# ---------- POST /reembolsos/solicitud ----------

@router.post(
    "/solicitud",
    response_model=ReembolsoOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear nueva solicitud de reembolso de prestación de salud",
)
async def post_crear_solicitud(
    body: ReembolsoCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 1. Validar carencia de 6 meses
    puede, _, msg = validar_carencia(user)
    if not puede:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=msg or "No cumple con la antigüedad mínima de 6 meses.",
        )

    # 2. Validar plazo de 30 días corridos (prestación médica y compra/boleta)
    hoy = date.today()
    if body.fecha_atencion > hoy or body.fecha_boleta > hoy:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Las fechas de atención y de boleta no pueden ser futuras.",
        )
    for etiqueta, fecha in (("atención", body.fecha_atencion), ("boleta/compra", body.fecha_boleta)):
        resultado_plazo = validar_plazo_30_dias(fecha)
        if not resultado_plazo.dentro_de_plazo:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Fecha de {etiqueta}: {resultado_plazo.mensaje}",
            )

    # 3. Validar que el monto de copago no supere el monto de la boleta
    if body.monto_copago > body.monto_boleta:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El copago a reembolsar no puede ser superior al monto total de la boleta.",
        )

    # 4. Verificar saldo disponible contra el saldo real
    resumen_socio = await obtener_resumen_socio(user, db)
    if body.monto_copago > resumen_socio.saldo_salud_disponible:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"El monto de copago solicitado (${body.monto_copago:,.0f}) "
                f"supera su saldo disponible (${resumen_socio.saldo_salud_disponible:,.0f})."
            ),
        )

    # 4. Crear la solicitud
    solicitud = await crear_solicitud(
        user, body, db, comprobante_filename=body.comprobante_filename
    )
    return solicitud_to_out(solicitud)


# ---------- GET /reembolsos/solicitud/{solicitud_id} ----------

@router.get(
    "/solicitud/{solicitud_id}",
    response_model=ReembolsoOut,
    summary="Obtener detalle de una solicitud de reembolso específica",
)
async def get_solicitud_detalle(
    solicitud_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.reembolso import SolicitudReembolso
    from sqlalchemy import select

    solicitud = await db.scalar(
        select(SolicitudReembolso).where(
            SolicitudReembolso.id == solicitud_id,
            SolicitudReembolso.socio_id == user.id,
        )
    )
    if not solicitud:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada.",
        )
    return solicitud_to_out(solicitud)


async def _obtener_usuario_auth(
    token_query: Optional[str],
    credentials: Optional[HTTPAuthorizationCredentials],
    db: AsyncSession,
) -> User:
    raw_token = (credentials.credentials if credentials else None) or token_query
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(raw_token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )
    user = await db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo o no encontrado",
        )
    return user


# ---------- POST /reembolsos/solicitud/{solicitud_id}/comprobante ----------

@router.post(
    "/solicitud/{solicitud_id}/comprobante",
    response_model=ReembolsoOut,
    summary="Subir archivo comprobante de respaldo para una solicitud de reembolso",
)
async def post_subir_comprobante(
    solicitud_id: int,
    archivo: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    solicitud = await db.get(SolicitudReembolso, solicitud_id)
    if not solicitud:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada.",
        )

    if solicitud.socio_id != user.id and not (
        user.is_superuser
        or user.rol in (UserRole.ADMIN, UserRole.PRESIDENTE, UserRole.TESORERO)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para modificar esta solicitud.",
        )

    extension = Path(archivo.filename or "archivo.pdf").suffix.lower()
    if extension not in [".pdf", ".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Formato no soportado. Debe ser PDF, JPG, PNG o WebP.",
        )

    # Eliminar archivo previo de esta solicitud si existiera
    for archivo_previo in UPLOAD_DIR.glob(f"{solicitud.id}_*"):
        try:
            archivo_previo.unlink(missing_ok=True)
        except OSError:
            pass

    archivo_id = f"{solicitud.id}_{uuid.uuid4().hex[:8]}{extension}"
    destino = UPLOAD_DIR / archivo_id

    with open(destino, "wb") as buffer:
        shutil.copyfileobj(archivo.file, buffer)

    solicitud.comprobante_filename = archivo.filename or archivo_id
    solicitud.comprobante_url = f"/api/v1/reembolsos/solicitud/{solicitud.id}/comprobante"

    await db.commit()
    await db.refresh(solicitud)
    return solicitud_to_out(solicitud)


# ---------- GET /reembolsos/solicitud/{solicitud_id}/comprobante ----------

@router.get(
    "/solicitud/{solicitud_id}/comprobante",
    summary="Ver o descargar el archivo comprobante de una solicitud de reembolso",
)
async def get_comprobante(
    solicitud_id: int,
    token: Optional[str] = Query(None, description="Token JWT opcional para abrir en nueva pestaña/iframe"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    user = await _obtener_usuario_auth(token, credentials, db)

    solicitud = await db.get(SolicitudReembolso, solicitud_id)
    if not solicitud:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada.",
        )

    if solicitud.socio_id != user.id and not (
        user.is_superuser
        or user.rol in (UserRole.ADMIN, UserRole.PRESIDENTE, UserRole.TESORERO, UserRole.SECRETARIO, UserRole.AUDITOR)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para visualizar este comprobante.",
        )

    if not solicitud.comprobante_filename:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La solicitud no tiene ningún comprobante adjunto.",
        )

    archivos_coincidentes = list(UPLOAD_DIR.glob(f"{solicitud.id}_*"))
    ruta_archivo = archivos_coincidentes[0] if archivos_coincidentes else None

    if not ruta_archivo or not ruta_archivo.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El archivo físico '{solicitud.comprobante_filename}' no se encuentra en el servidor.",
        )

    mime_type, _ = mimetypes.guess_type(str(ruta_archivo))
    if not mime_type:
        mime_type = "application/pdf" if ruta_archivo.suffix.lower() == ".pdf" else "application/octet-stream"

    return FileResponse(
        path=str(ruta_archivo),
        media_type=mime_type,
        filename=solicitud.comprobante_filename,
        content_disposition_type="inline",
    )


# ---------- GET /reembolsos/admin/solicitudes ----------

@router.get(
    "/admin/solicitudes",
    response_model=List[ReembolsoOut],
    summary="Bandeja de administración: obtener todas las solicitudes de reembolso",
)
async def get_admin_solicitudes(
    estado: Optional[str] = Query(None, description="Filtrar por estado (ej: 'en_revision')"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not (user.is_superuser or user.rol in (UserRole.ADMIN, UserRole.SUPERUSUARIO)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a Administradores y Superusuarios.",
        )
    solicitudes = await listar_todas_solicitudes_admin(db, estado=estado)
    return [solicitud_to_out(s) for s in solicitudes]


# ---------- PATCH /reembolsos/admin/solicitud/{solicitud_id}/resolver ----------

@router.patch(
    "/admin/solicitud/{solicitud_id}/resolver",
    response_model=ReembolsoOut,
    summary="Aprobar o rechazar solicitud de reembolso (Administrador / Superusuario)",
)
async def patch_resolver_solicitud(
    solicitud_id: int,
    body: ResolverReembolsoRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not (user.is_superuser or user.rol in (UserRole.ADMIN, UserRole.SUPERUSUARIO)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a Administradores y Superusuarios.",
        )
    try:
        solicitud = await resolver_solicitud_reembolso(
            solicitud_id=solicitud_id,
            accion=body.accion,
            motivo_rechazo=body.motivo_rechazo or "",
            admin_user=user,
            db=db,
        )
        return solicitud_to_out(solicitud)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

