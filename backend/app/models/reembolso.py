"""Modelo ORM de solicitudes de reembolso de prestaciones de salud."""
import enum

from sqlalchemy import (
    Boolean, Date, Enum, Float, ForeignKey, Integer, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


# [ESTUDIANTE INFORMÁTICA] Esto define las categorías médicas permitidas y permite tipar de forma estricta los valores en la base de datos para no admitir textos arbitrarios.
class TipoPrestacion(str, enum.Enum):
    FARMACIA = "farmacia"
    CONSULTA = "consulta"
    DENTAL = "dental"
    EXAMENES = "examenes"
    OPTICA = "optica"
    HOSPITALIZACION = "hospitalizacion"
    PROGRAMA_MEDICO = "programa_medico"
    OTROS = "otros"


# [ESTUDIANTE INFORMÁTICA] Esto es un diccionario de traducción; mapea cada clave del enum a un texto legible para el usuario y permite mostrar nombres amigables en la interfaz.
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

# [ESTUDIANTE INFORMÁTICA] Esto define una lista blanca de tipos habilitados para HU-03 y permite que el formulario web solo acepte estas categorías al ingresar una nueva solicitud.
TIPOS_PRESTACION_SOLICITABLES = (
    TipoPrestacion.FARMACIA,
    TipoPrestacion.CONSULTA,
    TipoPrestacion.EXAMENES,
    TipoPrestacion.PROGRAMA_MEDICO,
    TipoPrestacion.OTROS,
)

# [ESTUDIANTE INFORMÁTICA] Esto lista los tipos de comprobantes válidos y permite validar que el socio adjunte un documento de respaldo admitido por el reglamento.
TIPOS_DOCUMENTO = {
    "receta_medica": "Receta médica",
    "boleta_detallada": "Boleta detallada",
    "bono_copago": "Bono con copago",
    "comprobante_isapre_fonasa": "Comprobante Isapre/Fonasa",
    "timbre_no_reembolsable": "Timbre 'no reembolsable'",
}


# [ESTUDIANTE INFORMÁTICA] Esto modela la máquina de estados del reembolso (HU-03 y HU-04) y permite controlar el ciclo de vida de la solicitud (desde que se crea hasta que se aprueba o rechaza).
class EstadoReembolso(str, enum.Enum):
    BORRADOR = "borrador"
    EN_REVISION = "en_revision"
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"
    PAGADO = "pagado"


# [ESTUDIANTE INFORMÁTICA] Esto mapea los estados técnicos a nombres amigables en español y permite que el frontend renderice las etiquetas correctas en las tablas y modales.
ESTADO_REEMBOLSO_LABELS = {
    EstadoReembolso.BORRADOR: "Borrador",
    EstadoReembolso.EN_REVISION: "Pendiente de Revisión",
    EstadoReembolso.APROBADO: "Aprobado",
    EstadoReembolso.RECHAZADO: "Rechazado",
    EstadoReembolso.PAGADO: "Pagado",
}


# [ESTUDIANTE INFORMÁTICA] Esta clase define la tabla ORM en PostgreSQL (solicitudes_reembolso); esto mapea los atributos del objeto a columnas en la base de datos y permite guardar, consultar y actualizar todo el ciclo de vida de cada reembolso.
class SolicitudReembolso(Base, TimestampMixin):
    """Solicitud de reembolso de prestación de salud presentada por un socio."""

    __tablename__ = "solicitudes_reembolso"

    # [ESTUDIANTE INFORMÁTICA] Esto es la clave primaria autoincremental y el código correlativo de negocio (ej: RMB-0001) que permite identificar de forma única la solicitud.
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, index=True)

    # [ESTUDIANTE INFORMÁTICA] Esto es la clave foránea hacia la tabla usuarios y permite asociar cada solicitud al socio que la presentó.
    socio_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id"), nullable=False, index=True
    )

    # [ESTUDIANTE INFORMÁTICA] Estos campos guardan la información del gasto y permiten saber qué tipo de atención fue y a quién benefició (titular o carga).
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

    # [ESTUDIANTE INFORMÁTICA] Estos campos guardan los valores financieros del gasto y permiten calcular la cobertura y descontar del saldo disponible del socio.
    monto_boleta: Mapped[float] = mapped_column(Float, nullable=False)
    monto_copago: Mapped[float] = mapped_column(Float, default=0)
    monto_reembolso: Mapped[float] = mapped_column(Float, default=0)

    # [ESTUDIANTE INFORMÁTICA] Estas fechas registran cuándo ocurrió la atención médica y cuándo se emitió la boleta; esto permite validar la regla de los 30 días corridos de caducidad.
    fecha_atencion: Mapped[str] = mapped_column(Date, nullable=False)
    fecha_boleta: Mapped[str] = mapped_column(Date, nullable=False)

    # [ESTUDIANTE INFORMÁTICA] Estos campos almacenan los datos del archivo adjunto y permiten al sistema guardar la referencia física del comprobante en disco para que el admin lo visualice.
    tipo_documento: Mapped[str] = mapped_column(String(40), default="", server_default="")
    comprobante_filename: Mapped[str] = mapped_column(String(255), default="")
    comprobante_url: Mapped[str] = mapped_column(String(500), default="")

    # [ESTUDIANTE INFORMÁTICA] Esto almacena si el socio aceptó la declaración jurada de veracidad; esto permite tener respaldo legal de que los documentos son verídicos.
    declaracion_aceptada: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )

    # [ESTUDIANTE INFORMÁTICA] Esto almacena el estado actual (HU-04) y el motivo en caso de que sea rechazada; esto permite al revisor fundamentar su decisión y transparentarla al socio.
    estado: Mapped[EstadoReembolso] = mapped_column(
        Enum(
            EstadoReembolso,
            name="estado_reembolso",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=EstadoReembolso.EN_REVISION,
    )

    motivo_rechazo: Mapped[str] = mapped_column(Text, default="")

    # [ESTUDIANTE INFORMÁTICA] Esto crea la relación bidireccional ORM con el modelo User y permite acceder a los datos completos del socio (nombre, rut, correo) directamente desde la solicitud.
    socio = relationship("User", backref="solicitudes_reembolso", lazy="selectin")
