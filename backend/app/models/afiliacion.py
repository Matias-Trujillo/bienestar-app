"""Modelos ORM del módulo de Afiliación (HU-01: solicitud de incorporación y cargas familiares)."""
import enum
from typing import List, Optional

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class CalidadContractual(str, enum.Enum):
    PLANTA = "Planta"
    CONTRATA = "Contrata"


class EstadoSolicitud(str, enum.Enum):
    PENDIENTE = "Pendiente de aprobación"
    APROBADA = "Aprobada"
    RECHAZADA = "Rechazada"


def _enum(e, name):
    return Enum(e, name=name, values_callable=lambda x: [m.value for m in x])


class SolicitudAfiliacion(Base, TimestampMixin):
    __tablename__ = "solicitudes_afiliacion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    folio: Mapped[str] = mapped_column(String(20), unique=True, index=True)

    # Antecedentes del funcionario
    nombre_completo: Mapped[str] = mapped_column(String(120))
    run: Mapped[str] = mapped_column(String(12), index=True)  # normalizado: 12345678-9
    grado: Mapped[str] = mapped_column(String(10))
    calidad_contractual: Mapped[CalidadContractual] = mapped_column(
        _enum(CalidadContractual, "calidad_contractual")
    )
    email: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    # Autorización de descuento por planilla (4% del sueldo base)
    autoriza_descuento: Mapped[bool] = mapped_column(Boolean, default=False)
    porcentaje_descuento: Mapped[int] = mapped_column(Integer, default=4)
    acepta_carencia: Mapped[bool] = mapped_column(Boolean, default=False)

    estado: Mapped[EstadoSolicitud] = mapped_column(
        _enum(EstadoSolicitud, "estado_solicitud"), default=EstadoSolicitud.PENDIENTE
    )

    # HU-02: Revisión y aprobación en sesión de Directorio
    fecha_sesion: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # YYYY-MM-DD
    numero_acta: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    fecha_fin_carencia: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # YYYY-MM-DD (+6 meses)
    observaciones_resolucion: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    resuelto_por: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    resuelto_at: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    cargas: Mapped[List["CargaFamiliar"]] = relationship(
        back_populates="solicitud", cascade="all, delete-orphan", lazy="selectin"
    )


class CargaFamiliar(Base, TimestampMixin):
    __tablename__ = "cargas_familiares"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    solicitud_id: Mapped[int] = mapped_column(ForeignKey("solicitudes_afiliacion.id", ondelete="CASCADE"))
    nombre_completo: Mapped[str] = mapped_column(String(120))
    run: Mapped[str] = mapped_column(String(12))
    parentesco: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)

    solicitud: Mapped[SolicitudAfiliacion] = relationship(back_populates="cargas")
