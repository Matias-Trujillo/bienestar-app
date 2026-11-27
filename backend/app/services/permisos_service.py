"""Servicio de dominio (SRP + DIP) para permisos dinámicos de acceso a Administración por rol.

[ESTUDIANTE INFORMÁTICA] Garantiza que:
1. El rol SUPERUSUARIO siempre tiene acceso a Administración por defecto e inmutable.
2. El resto de los roles inician sin permiso (`False`) hasta que el Superusuario los habilite.
3. Toda habilitación o revocación persiste en PostgreSQL y queda registrada en `audit_logs`.
"""
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.interfaces import AuditLoggerProtocol
from app.models.permisos import PermisoRolAdmin
from app.models.user import ROLE_LABELS, User, UserRole
from app.schemas.permisos import PermisoRolAdminOut
from app.services.audit_service import SqlAlchemyAuditLogger

ORDEN_ROLES = [
    UserRole.SUPERUSUARIO,
    UserRole.ADMIN,
    UserRole.PRESIDENTE,
    UserRole.SECRETARIO,
    UserRole.TESORERO,
    UserRole.AUDITOR,
    UserRole.SOCIO,
]


def _to_out(item: PermisoRolAdmin) -> PermisoRolAdminOut:
    rol_enum = item.rol if isinstance(item.rol, UserRole) else UserRole(str(item.rol))
    otorgado_por = getattr(item, "otorgado_por", None)
    return PermisoRolAdminOut(
        rol=rol_enum.value,
        rolLabel=ROLE_LABELS.get(rol_enum, rol_enum.value.capitalize()),
        puedeAccederAdmin=True if rol_enum == UserRole.SUPERUSUARIO else bool(item.puede_acceder_admin),
        inmutable=(rol_enum == UserRole.SUPERUSUARIO),
        otorgadoPorNombre=otorgado_por.nombre_completo if otorgado_por else None,
        updatedAt=item.updated_at.isoformat() if item.updated_at else None,
    )


class PermisosAdminService:
    """Responsabilidad única: administrar permisos de ingreso al módulo Administración."""

    def __init__(self, audit_logger: Optional[AuditLoggerProtocol] = None) -> None:
        self.audit_logger: AuditLoggerProtocol = audit_logger or SqlAlchemyAuditLogger()

    async def asegurar_semilla(self, db: AsyncSession) -> None:
        existentes = set((await db.scalars(select(PermisoRolAdmin.rol))).all())
        creados = False
        for rol_enum in ORDEN_ROLES:
            if rol_enum not in existentes:
                db.add(
                    PermisoRolAdmin(
                        rol=rol_enum,
                        puede_acceder_admin=(rol_enum == UserRole.SUPERUSUARIO),
                    )
                )
                creados = True
        if creados:
            await db.flush()

    async def usuario_tiene_acceso_admin(self, db: AsyncSession, usuario: User) -> bool:
        """Retorna True si el usuario es Superusuario o si su rol tiene permiso habilitado en BD."""
        rol_val = usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol)
        if usuario.is_superuser or rol_val == UserRole.SUPERUSUARIO.value:
            return True
        try:
            rol_enum = usuario.rol if isinstance(usuario.rol, UserRole) else UserRole(rol_val)
        except ValueError:
            return False

        registro = await db.scalar(
            select(PermisoRolAdmin).where(PermisoRolAdmin.rol == rol_enum)
        )
        return bool(registro and registro.puede_acceder_admin)

    async def listar_permisos_roles(self, db: AsyncSession) -> List[PermisoRolAdminOut]:
        await self.asegurar_semilla(db)
        await db.commit()
        rows = list((await db.scalars(select(PermisoRolAdmin))).all())
        por_rol = {
            (r.rol if isinstance(r.rol, UserRole) else UserRole(str(r.rol))): r
            for r in rows
        }
        return [_to_out(por_rol[rol_enum]) for rol_enum in ORDEN_ROLES if rol_enum in por_rol]

    async def actualizar_permiso_rol(
        self,
        db: AsyncSession,
        rol_str: str,
        puede_acceder_admin: bool,
        superuser: User,
    ) -> PermisoRolAdminOut:
        try:
            rol_enum = UserRole(rol_str.strip().lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Rol '{rol_str}' no reconocido en el sistema.",
            )

        if rol_enum == UserRole.SUPERUSUARIO:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El rol Superusuario cuenta con acceso permanente a Administración y no puede modificarse.",
            )

        await self.asegurar_semilla(db)
        registro = await db.scalar(
            select(PermisoRolAdmin).where(PermisoRolAdmin.rol == rol_enum)
        )
        if not registro:
            registro = PermisoRolAdmin(rol=rol_enum, puede_acceder_admin=bool(puede_acceder_admin))

        registro.puede_acceder_admin = bool(puede_acceder_admin)
        registro.otorgado_por_id = superuser.id
        db.add(registro)

        accion = "OTORGAR_ACCESO_ADMIN_ROL" if puede_acceder_admin else "REVOCAR_ACCESO_ADMIN_ROL"
        rol_lbl = ROLE_LABELS.get(rol_enum, rol_enum.value)
        await self.audit_logger.registrar(
            db=db,
            usuario=superuser,
            modulo="SEGURIDAD",
            accion=accion,
            recurso_tipo="PermisoRolAdmin",
            recurso_id=rol_enum.value,
            detalles=(
                f"Superusuario {superuser.nombre_completo} "
                f"{'habilitó' if puede_acceder_admin else 'revocó'} el acceso al módulo Administración "
                f"para el rol '{rol_lbl}' ({rol_enum.value})."
            ),
        )
        await db.commit()
        await db.refresh(registro)
        return _to_out(registro)
