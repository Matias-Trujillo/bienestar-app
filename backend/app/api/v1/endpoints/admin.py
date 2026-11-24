"""Controlador REST delgado para Administración, Auditoría Inmutable y Usuarios (SRP + DIP).

[ESTUDIANTE INFORMÁTICA] Delega reglas de negocio en `AdminService`, esquemas en `schemas/admin.py`
e inyecta dependencias abstractas (`AuditLoggerProtocol`, `SmtpTransportProtocol`, `PasswordHasherProtocol`).
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_audit_logger,
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
from app.models import User, UserRole
from app.schemas.admin import (
    AuditLogOut,
    CrearBonoIn,
    CrearUsuarioIn,
    EditarBonoIn,
    EditarUsuarioIn,
    ParametroUpdateIn,
    SmtpConfigIn,
)
from app.services.admin_service import AdminService

router = APIRouter()

ROLES_ADMIN = (UserRole.SUPERUSUARIO, UserRole.ADMIN)


def _get_admin_service(
    audit_logger: AuditLoggerProtocol = Depends(get_audit_logger),
    hasher: PasswordHasherProtocol = Depends(get_password_hasher),
    smtp_transport: SmtpTransportProtocol = Depends(get_smtp_transport),
) -> AdminService:
    return AdminService(audit_logger=audit_logger, hasher=hasher, smtp_transport=smtp_transport)


@router.get("/stats", summary="Métricas y estadísticas globales del sistema")
async def get_admin_stats(
    _: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
    service: AdminService = Depends(_get_admin_service),
) -> Dict[str, Any]:
    return await service.obtener_estadisticas(db)


@router.get("/audit-logs", response_model=List[AuditLogOut], summary="Listar bitácora de auditoría inmutable")
async def get_audit_logs(
    modulo: Optional[str] = None,
    limit: int = 100,
    _: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
    service: AdminService = Depends(_get_admin_service),
):
    return await service.listar_audit_logs(db, modulo=modulo, limit=limit)


@router.post("/usuarios", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED, summary="Crear nuevo usuario con rol específico")
async def crear_usuario(
    body: CrearUsuarioIn,
    current_user: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
    service: AdminService = Depends(_get_admin_service),
):
    return await service.crear_usuario(db, body, current_user)


@router.patch("/usuarios/{usuario_id}", response_model=Dict[str, Any], summary="Modificar rol, estado de socio o estado de contraseña de un usuario")
async def editar_usuario(
    usuario_id: int,
    body: EditarUsuarioIn,
    current_user: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
    service: AdminService = Depends(_get_admin_service),
):
    return await service.editar_usuario(db, usuario_id, body, current_user)


@router.delete("/usuarios/{usuario_id}", response_model=Dict[str, Any], summary="Eliminar usuario únicamente si no cuenta con historial ni descuentos")
async def eliminar_usuario(
    usuario_id: int,
    current_user: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
    service: AdminService = Depends(_get_admin_service),
):
    return await service.eliminar_usuario(db, usuario_id, current_user)


@router.get("/parametros", summary="Listar parámetros de configuración global")
async def listar_parametros(
    _: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
    service: AdminService = Depends(_get_admin_service),
):
    return await service.listar_parametros(db)


@router.put("/parametros", summary="Actualizar parámetro global")
async def actualizar_parametro(
    body: ParametroUpdateIn,
    current_user: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
    service: AdminService = Depends(_get_admin_service),
):
    return await service.actualizar_parametro(db, body, current_user)


@router.post("/smtp-config", summary="Guardar configuración SMTP completa y enviar correo de prueba real")
async def configurar_y_probar_smtp(
    body: SmtpConfigIn,
    current_user: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
    service: AdminService = Depends(_get_admin_service),
):
    return await service.configurar_y_probar_smtp(db, body, current_user)


@router.get("/bonos", summary="Listar todos los bonos configurados (activos e inactivos)")
async def listar_bonos_admin(
    _: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
    service: AdminService = Depends(_get_admin_service),
):
    return await service.listar_bonos(db)


@router.post("/bonos", status_code=status.HTTP_201_CREATED, summary="Crear un nuevo beneficio/bono en el catálogo")
async def crear_bono_admin(
    body: CrearBonoIn,
    current_user: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
    service: AdminService = Depends(_get_admin_service),
):
    return await service.crear_bono(db, body, current_user)


@router.patch("/bonos/{bono_id}", summary="Modificar o Activar/Desactivar un bono")
async def editar_bono_admin(
    bono_id: int,
    body: EditarBonoIn,
    current_user: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
    service: AdminService = Depends(_get_admin_service),
):
    return await service.editar_bono(db, bono_id, body, current_user)


@router.delete("/bonos/{bono_id}", summary="Eliminar un beneficio del catálogo")
async def eliminar_bono_admin(
    bono_id: int,
    current_user: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
    service: AdminService = Depends(_get_admin_service),
):
    return await service.eliminar_bono(db, bono_id, current_user)


@router.post(
    "/reset-ambiente-pruebas",
    summary="Restablecimiento integral del ambiente de pruebas (Solo Superusuario)",
)
async def reset_ambiente_pruebas(
    current_user: User = Depends(require_roles(UserRole.SUPERUSUARIO)),
    db: AsyncSession = Depends(get_db),
    service: AdminService = Depends(_get_admin_service),
):
    return await service.reset_ambiente_pruebas(db, current_user)
