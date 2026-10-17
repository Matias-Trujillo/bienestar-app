"""Paquete de modelos SQLAlchemy ORM."""
from app.models.base import Base
from app.models.user import User, UserRole
from app.models.beneficios import (
    ParametroSistema,
    SolicitudBeneficio,
    NominaMasiva,
    DetalleNominaMasiva,
)

__all__ = [
    "Base",
    "User",
    "UserRole",
    "ParametroSistema",
    "SolicitudBeneficio",
    "NominaMasiva",
    "DetalleNominaMasiva",
]
