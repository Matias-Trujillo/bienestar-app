"""Pruebas automatizadas de la Sección 6: Permisos dinámicos de Administración por rol en BD (SOLID).

Valida:
1. Por defecto solo SUPERUSUARIO tiene acceso a Administración (`True`); todos los demás roles parten en `False`.
2. `require_admin_panel_access` bloquea con HTTP 403 a roles sin permiso habilitado (incluyendo ADMIN y PRESIDENTE).
3. Solo SUPERUSUARIO puede habilitar/revocar acceso a un rol, dejando registro inmutable en `audit_logs`.
4. Al habilitar un rol en BD, `require_admin_panel_access` y `/auth/login` (`puedeAccederAdmin`) reflejan el cambio.
5. El rol SUPERUSUARIO es inmutable y no puede revocarse a sí mismo (`HTTP 400`).
"""
import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin_panel_access, require_roles
from app.core.security import get_password_hash
from app.models import AuditLog, User, UserRole
from app.services.auth_service import AuthService
from app.services.permisos_service import PermisosAdminService


@pytest.mark.asyncio
async def test_permisos_admin_por_defecto_solo_superusuario(db_session: AsyncSession):
    service = PermisosAdminService()
    permisos = await service.listar_permisos_roles(db_session)
    por_rol = {p.rol: p for p in permisos}

    assert por_rol["superusuario"].puedeAccederAdmin is True
    assert por_rol["superusuario"].inmutable is True
    for otro in ("admin", "presidente", "secretario", "tesorero", "auditor", "socio"):
        assert por_rol[otro].puedeAccederAdmin is False
        assert por_rol[otro].inmutable is False


@pytest.mark.asyncio
async def test_superusuario_habilita_y_revoca_acceso_admin_con_auditoria(
    db_session: AsyncSession,
):
    superuser = User(
        rut="11.111.111-1",
        email="super.perm@mperalillo.cl",
        nombre_completo="Super Admin Permisos",
        hashed_password=get_password_hash("Super#2026"),
        rol=UserRole.SUPERUSUARIO,
        is_superuser=True,
        is_active=True,
    )
    presidente = User(
        rut="12.345.678-5",
        email="presi.perm@mperalillo.cl",
        nombre_completo="Presidente Permisos",
        hashed_password=get_password_hash("Presi#2026"),
        rol=UserRole.PRESIDENTE,
        is_superuser=False,
        is_active=True,
    )
    db_session.add_all([superuser, presidente])
    await db_session.commit()

    service = PermisosAdminService()
    auth_service = AuthService()

    # 1. Al inicio: Superusuario accede, Presidente bloqueado con 403 y login marca puedeAccederAdmin=False
    assert await require_admin_panel_access(user=superuser, db=db_session, permisos=service) == superuser
    with pytest.raises(HTTPException) as exc_403:
        await require_admin_panel_access(user=presidente, db=db_session, permisos=service)
    assert exc_403.value.status_code == 403

    login_antes = await auth_service.login(db_session, presidente.email, "Presi#2026")
    assert login_antes.user.puedeAccederAdmin is False

    # 2. Solo SUPERUSUARIO puede invocar el checker de gestión de permisos
    checker_super = require_roles(UserRole.SUPERUSUARIO)
    with pytest.raises(HTTPException) as exc_no_super:
        await checker_super(user=presidente)
    assert exc_no_super.value.status_code == 403

    # 3. Superusuario habilita rol PRESIDENTE
    actualizado = await service.actualizar_permiso_rol(db_session, "presidente", True, superuser)
    assert actualizado.puedeAccederAdmin is True

    assert await require_admin_panel_access(user=presidente, db=db_session, permisos=service) == presidente
    login_despues = await auth_service.login(db_session, presidente.email, "Presi#2026")
    assert login_despues.user.puedeAccederAdmin is True

    log_otorgar = await db_session.scalar(
        select(AuditLog).where(
            AuditLog.modulo == "SEGURIDAD",
            AuditLog.accion == "OTORGAR_ACCESO_ADMIN_ROL",
            AuditLog.recurso_id == "presidente",
        )
    )
    assert log_otorgar is not None

    # 4. Superusuario revoca rol PRESIDENTE -> vuelve a 403
    revocado = await service.actualizar_permiso_rol(db_session, "presidente", False, superuser)
    assert revocado.puedeAccederAdmin is False
    with pytest.raises(HTTPException) as exc_revocado:
        await require_admin_panel_access(user=presidente, db=db_session, permisos=service)
    assert exc_revocado.value.status_code == 403


@pytest.mark.asyncio
async def test_superusuario_no_puede_revocarse_a_si_mismo(db_session: AsyncSession):
    superuser = User(
        rut="11.111.111-1",
        email="super.inmutable@mperalillo.cl",
        nombre_completo="Super Inmutable",
        hashed_password="hash",
        rol=UserRole.SUPERUSUARIO,
        is_superuser=True,
        is_active=True,
    )
    db_session.add(superuser)
    await db_session.commit()

    service = PermisosAdminService()
    with pytest.raises(HTTPException) as exc:
        await service.actualizar_permiso_rol(db_session, "superusuario", False, superuser)
    assert exc.value.status_code == 400
