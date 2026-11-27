"""Modelo ORM 3FN para el control dinámico de permisos de acceso a Administración por rol.

[ESTUDIANTE INFORMÁTICA] Almacena en base de datos qué roles están autorizados para
ingresar a la sección Administración (/admin). El Superusuario siempre tiene acceso por
defecto y es el único autorizado para habilitar o revocar el acceso a otros roles.
"""
from typing import Optional

from sqlalchemy import Boolean, Enum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.user import UserRole


class PermisoRolAdmin(Base, TimestampMixin):
    __tablename__ = "permisos_rol_modulo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rol: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole,
            name="user_role",
            create_type=False,
            values_callable=lambda e: [m.value for m in e],
        ),
        unique=True,
        index=True,
        nullable=False,
    )
    puede_acceder_admin: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    otorgado_por_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True
    )

    otorgado_por = relationship("User", foreign_keys=[otorgado_por_id], lazy="selectin")
