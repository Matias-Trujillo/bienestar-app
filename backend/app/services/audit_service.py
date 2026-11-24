"""Servicio transversal de Auditoría Inmutable (Append-Only) para Contraloría y Comisión Revisora."""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.user import User


# [ESTUDIANTE INFORMÁTICA] Registra un evento inmutable en audit_logs; centralizado en la capa de servicios para respetar Clean Architecture.
async def registrar_auditoria(
    db: AsyncSession,
    usuario: User,
    modulo: str,
    accion: str,
    recurso_tipo: str,
    recurso_id: Optional[str],
    detalles: str,
    ip_origen: str = "127.0.0.1",
) -> AuditLog:
    rol_str = usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol)
    log = AuditLog(
        usuario_id=usuario.id,
        usuario_nombre=usuario.nombre_completo,
        usuario_rut=usuario.rut,
        usuario_rol=rol_str,
        modulo=modulo.upper(),
        accion=accion.upper(),
        recurso_tipo=recurso_tipo,
        recurso_id=recurso_id,
        detalles=detalles,
        ip_origen=ip_origen,
    )
    db.add(log)
    return log


class SqlAlchemyAuditLogger:
    """Adaptador concreto de AuditLoggerProtocol respaldado por SQLAlchemy AsyncSession."""

    async def registrar(
        self,
        db: AsyncSession,
        usuario: User,
        modulo: str,
        accion: str,
        recurso_tipo: str,
        recurso_id: Optional[str],
        detalles: str,
        ip_origen: str = "127.0.0.1",
    ) -> AuditLog:
        return await registrar_auditoria(
            db=db,
            usuario=usuario,
            modulo=modulo,
            accion=accion,
            recurso_tipo=recurso_tipo,
            recurso_id=recurso_id,
            detalles=detalles,
            ip_origen=ip_origen,
        )
