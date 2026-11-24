"""Controlador REST delgado para Autenticación, Perfil y Recuperación de Clave (SRP + DIP).

[ESTUDIANTE INFORMÁTICA] Refactorizado bajo Principios SOLID: delega las reglas de negocio
y seguridad a `AuthService` y separa los contratos DTO en `app/schemas/auth.py`.
"""
from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_audit_logger,
    get_current_user,
    get_password_hasher,
    get_smtp_transport,
    require_roles,
)
from app.core.interfaces import (
    AuditLoggerProtocol,
    PasswordHasherProtocol,
    SmtpTransportProtocol,
)
from app.db.session import get_db
from app.models import User
from app.models.user import UserRole
from app.schemas.auth import (
    CambiarPasswordPropiaIn,
    LoginRequest,
    RecuperarPasswordIn,
    TokenResponse,
    UserOut,
)
from app.services.auth_service import (
    AuthService,
    evaluar_historial_usuario,
    guardar_seguridad_usuario,
    obtener_seguridad_usuario,
    to_out,
)
from app.services.reembolso_service import obtener_resumen_socio

router = APIRouter()


def _resolver_auth_service(
    hasher: Any = None,
    audit_logger: Any = None,
    smtp_transport: Any = None,
) -> AuthService:
    """Permite invocación tanto vía FastAPI Depends como por llamada directa en pruebas unitarias."""
    return AuthService(
        hasher=hasher if isinstance(hasher, PasswordHasherProtocol) else None,
        audit_logger=audit_logger if isinstance(audit_logger, AuditLoggerProtocol) else None,
        smtp_transport=smtp_transport if isinstance(smtp_transport, SmtpTransportProtocol) else None,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
    hasher: PasswordHasherProtocol = Depends(get_password_hasher),
    audit_logger: AuditLoggerProtocol = Depends(get_audit_logger),
):
    servicio = _resolver_auth_service(hasher=hasher, audit_logger=audit_logger)
    return await servicio.login(db, body.username, body.password)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        await obtener_resumen_socio(user, db)
        await db.refresh(user)
    except Exception:
        user = (await db.get(User, user.id)) or user
    sec = await obtener_seguridad_usuario(db, user.id)
    return to_out(user, sec)


@router.post("/cambiar-password", response_model=UserOut, summary="Cambiar contraseña personal del usuario autenticado")
async def cambiar_password_propia(
    body: CambiarPasswordPropiaIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    hasher: PasswordHasherProtocol = Depends(get_password_hasher),
    audit_logger: AuditLoggerProtocol = Depends(get_audit_logger),
):
    servicio = _resolver_auth_service(hasher=hasher, audit_logger=audit_logger)
    return await servicio.cambiar_password(db, user, body.nueva_password, body.password_actual)


@router.get("/usuarios", response_model=List[UserOut])
async def listar_usuarios(
    _: User = Depends(require_roles(UserRole.SUPERUSUARIO, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    return await AuthService().listar_usuarios(db)


@router.post(
    "/recuperar-password",
    summary="Recuperar contraseña enviando una Clave Temporal al correo registrado (público)",
)
async def recuperar_password_por_correo(
    body: RecuperarPasswordIn,
    db: AsyncSession = Depends(get_db),
    hasher: PasswordHasherProtocol = Depends(get_password_hasher),
    audit_logger: AuditLoggerProtocol = Depends(get_audit_logger),
    smtp_transport: SmtpTransportProtocol = Depends(get_smtp_transport),
) -> Dict[str, Any]:
    servicio = _resolver_auth_service(hasher=hasher, audit_logger=audit_logger, smtp_transport=smtp_transport)
    return await servicio.recuperar_password(db, body.identificador)


__all__ = [
    "router",
    "LoginRequest",
    "CambiarPasswordPropiaIn",
    "RecuperarPasswordIn",
    "UserOut",
    "TokenResponse",
    "login",
    "me",
    "cambiar_password_propia",
    "listar_usuarios",
    "recuperar_password_por_correo",
    "evaluar_historial_usuario",
    "obtener_seguridad_usuario",
    "guardar_seguridad_usuario",
    "to_out",
]
