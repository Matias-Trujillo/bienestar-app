"""Modelo ORM de solicitudes de reembolso de prestaciones de salud."""
import enum

from sqlalchemy import (
    Boolean, Date, Enum, Float, ForeignKey, Integer, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class TipoPrestacion(str, enum.Enum):
    FARMACIA = "farmacia"
    CONSULTA = "consulta"
    DENTAL = "dental"
    EXAMENES = "examenes"
    OPTICA = "optica"
    HOSPITALIZACION = "hospitalizacion"
    PROGRAMA_MEDICO = "programa_medico"
    OTROS = "otros"


TIPO_PRESTACION_LABELS = {
    TipoPrestacion.FARMACIA: "Farmacia / Medicamentos con receta",
    TipoPrestacion.CONSULTA: "Consulta Médica / Especialista",
    TipoPrestacion.DENTAL: "Tratamiento Dental",
    TipoPrestacion.EXAMENES: "Exámenes de Laboratorio o Radiología",
    TipoPrestacion.OPTICA: "Lentes Ópticos",
    TipoPrestacion.HOSPITALIZACION: "Hospitalización / Intervención",
    TipoPrestacion.PROGRAMA_MEDICO: "Programa Médico",
    TipoPrestacion.OTROS: "Otros",
}

# Tipos habilitados para nuevas solicitudes (HU-03). Los demás se mantienen
# solo por compatibilidad con registros históricos.
TIPOS_PRESTACION_SOLICITABLES = (
    TipoPrestacion.FARMACIA,
    TipoPrestacion.CONSULTA,
    TipoPrestacion.EXAMENES,
    TipoPrestacion.PROGRAMA_MEDICO,
    TipoPrestacion.OTROS,
)

# Documentos de respaldo aceptados
TIPOS_DOCUMENTO = {
    "receta_medica": "Receta médica",
    "boleta_detallada": "Boleta detallada",
    "bono_copago": "Bono con copago",
    "comprobante_isapre_fonasa": "Comprobante Isapre/Fonasa",
    "timbre_no_reembolsable": "Timbre 'no reembolsable'",
}


class EstadoReembolso(str, enum.Enum):
    BORRADOR = "borrador"
    EN_REVISION = "en_revision"
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"
    PAGADO = "pagado"


ESTADO_REEMBOLSO_LABELS = {
    EstadoReembolso.BORRADOR: "Borrador",
    EstadoReembolso.EN_REVISION: "Pendiente de Revisión",
    EstadoReembolso.APROBADO: "Aprobado",
    EstadoReembolso.RECHAZADO: "Rechazado",
    EstadoReembolso.PAGADO: "Pagado",
}


class SolicitudReembolso(Base, TimestampMixin):
    """Solicitud de reembolso de prestación de salud presentada por un socio."""

    __tablename__ = "solicitudes_reembolso"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, index=True)

    # Relación con el socio solicitante
    socio_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id"), nullable=False, index=True
    )

    # Datos de la prestación
    tipo_prestacion: Mapped[TipoPrestacion] = mapped_column(
        Enum(
            TipoPrestacion,
            name="tipo_prestacion",
            values_callable=lambda e: [m.value for m in e],
        )
    )
    descripcion: Mapped[str] = mapped_column(Text, default="")
    beneficiario_nombre: Mapped[str] = mapped_column(String(120))
    beneficiario_parentesco: Mapped[str] = mapped_column(
        String(30), default="Titular"
    )

    # Montos
    monto_boleta: Mapped[float] = mapped_column(Float, nullable=False)
    monto_copago: Mapped[float] = mapped_column(Float, default=0)
    monto_reembolso: Mapped[float] = mapped_column(Float, default=0)

    # Fechas clave
    fecha_atencion: Mapped[str] = mapped_column(Date, nullable=False)
    fecha_boleta: Mapped[str] = mapped_column(Date, nullable=False)

    # Documento de respaldo
    tipo_documento: Mapped[str] = mapped_column(String(40), default="", server_default="")
    comprobante_filename: Mapped[str] = mapped_column(String(255), default="")
    comprobante_url: Mapped[str] = mapped_column(String(500), default="")

    # Declaración de veracidad aceptada por el socio
    declaracion_aceptada: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )

    # Estado del flujo
    estado: Mapped[EstadoReembolso] = mapped_column(
        Enum(
            EstadoReembolso,
            name="estado_reembolso",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=EstadoReembolso.EN_REVISION,
    )

    motivo_rechazo: Mapped[str] = mapped_column(Text, default="")

    # Relación ORM (lazy) con el usuario
    socio = relationship("User", backref="solicitudes_reembolso", lazy="selectin")
