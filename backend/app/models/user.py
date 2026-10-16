"""Modelo ORM de usuarios del sistema."""
import enum

from sqlalchemy import Boolean, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class UserRole(str, enum.Enum):
    SUPERUSUARIO = "superusuario"
    PRESIDENTE = "presidente"
    SECRETARIO = "secretario"
    TESORERO = "tesorero"
    ADMIN = "admin"
    AUDITOR = "auditor"
    SOCIO = "socio"


ROLE_LABELS = {
    UserRole.SUPERUSUARIO: "Superusuario",
    UserRole.PRESIDENTE: "Presidente(a)",
    UserRole.SECRETARIO: "Secretario(a)",
    UserRole.TESORERO: "Tesorero(a)",
    UserRole.ADMIN: "Administrador / Directiva",
    UserRole.AUDITOR: "Revisor de Cuentas / Auditor",
    UserRole.SOCIO: "Socio Activo",
}


class User(Base, TimestampMixin):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rut: Mapped[str] = mapped_column(String(15), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    nombre_completo: Mapped[str] = mapped_column(String(120))
    hashed_password: Mapped[str] = mapped_column(String(255))
    rol: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e])
    )
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Datos de perfil usados por el dashboard
    departamento: Mapped[str] = mapped_column(String(120), default="")
    antiguedad: Mapped[str] = mapped_column(String(60), default="")
    estado_previsional: Mapped[str] = mapped_column(String(20), default="Al día")
    saldo_salud_disponible: Mapped[int] = mapped_column(Integer, default=250000)
    saldo_salud_total_anual: Mapped[int] = mapped_column(Integer, default=250000)
    cargas_registradas: Mapped[int] = mapped_column(Integer, default=0)
