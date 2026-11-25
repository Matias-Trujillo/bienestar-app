"""Modelos ORM (3FN) del Módulo Vecino y Nuevo Talento — Trabaja con Nosotros (Ley N° 21.015)."""
import enum
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class JornadaLaboral(str, enum.Enum):
    COMPLETA = "completa"
    PARCIAL = "parcial"
    TURNOS = "turnos"


class ModalidadTrabajo(str, enum.Enum):
    PRESENCIAL = "presencial"
    HIBRIDA = "hibrida"
    TELETRABAJO = "teletrabajo"


class EstadoPostulacionTalento(str, enum.Enum):
    RECIBIDA = "Recibida"
    EN_REVISION = "En revisión"
    PRESELECCIONADA = "Preseleccionada"
    DESCARTADA = "Descartada"


# Tabla asociativa N:M entre PerfilTalentoVecino y CompetenciaCatalogo
talento_competencias = Table(
    "talento_competencias",
    Base.metadata,
    Column(
        "perfil_id",
        Integer,
        ForeignKey("perfiles_talento_vecino.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "competencia_id",
        Integer,
        ForeignKey("competencias_catalogo.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class CompetenciaCatalogo(Base):
    """Catálogo precargado de competencias técnicas y transversales."""

    __tablename__ = "competencias_catalogo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    categoria: Mapped[str] = mapped_column(String(60), nullable=False, default="General")
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class PerfilTalentoVecino(Base, TimestampMixin):
    """Perfil curricular principal de un vecino/postulante en Trabaja con Nosotros."""

    __tablename__ = "perfiles_talento_vecino"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    folio: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)

    # 1. Antecedentes de contacto y resumen profesional
    nombre_completo: Mapped[str] = mapped_column(String(140), nullable=False)
    run: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(140), nullable=False, index=True)
    telefono: Mapped[str] = mapped_column(String(30), nullable=False)
    direccion: Mapped[str] = mapped_column(String(200), nullable=False)
    comuna: Mapped[str] = mapped_column(String(80), nullable=False, default="Peralillo")
    resumen_profesional: Mapped[str] = mapped_column(Text, nullable=False)

    # 4. Condiciones laborales deseadas
    renta_esperada_clp: Mapped[int] = mapped_column(Integer, nullable=False)
    jornada_deseada: Mapped[str] = mapped_column(
        String(20), nullable=False, default=JornadaLaboral.COMPLETA.value
    )
    modalidad_deseada: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ModalidadTrabajo.PRESENCIAL.value
    )

    # 5. Inclusión laboral — Ley N° 21.015 (datos sensibles resguardados)
    posee_discapacidad_ley_21015: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    credencial_rnd_senadis: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    acepta_tratamiento_datos: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )

    # Currículum Vitae adjunto
    cv_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cv_content_type: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    cv_data_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    estado: Mapped[str] = mapped_column(
        String(30), nullable=False, default=EstadoPostulacionTalento.RECIBIDA.value
    )

    # Relaciones normalizadas 3FN
    educaciones: Mapped[List["EducacionTalento"]] = relationship(
        back_populates="perfil",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    experiencias: Mapped[List["ExperienciaLaboralTalento"]] = relationship(
        back_populates="perfil",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    cursos: Mapped[List["CursoPerfeccionamiento"]] = relationship(
        back_populates="perfil",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    competencias: Mapped[List[CompetenciaCatalogo]] = relationship(
        secondary=talento_competencias,
        lazy="selectin",
    )


class EducacionTalento(Base):
    """Antecedentes educacionales del postulante (3FN)."""

    __tablename__ = "educacion_talento"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    perfil_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("perfiles_talento_vecino.id", ondelete="CASCADE"), nullable=False, index=True
    )
    institucion: Mapped[str] = mapped_column(String(150), nullable=False)
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    nivel_educacional: Mapped[str] = mapped_column(String(60), nullable=False)
    estado_estudios: Mapped[str] = mapped_column(String(40), nullable=False, default="Titulado/a")
    anio_inicio: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    anio_termino: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    perfil: Mapped[PerfilTalentoVecino] = relationship(back_populates="educaciones")


class ExperienciaLaboralTalento(Base):
    """Antecedentes laborales del postulante (3FN)."""

    __tablename__ = "experiencia_laboral_talento"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    perfil_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("perfiles_talento_vecino.id", ondelete="CASCADE"), nullable=False, index=True
    )
    empresa: Mapped[str] = mapped_column(String(150), nullable=False)
    cargo: Mapped[str] = mapped_column(String(120), nullable=False)
    anio_inicio: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    anio_termino: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    actualmente_trabajando: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    funciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    perfil: Mapped[PerfilTalentoVecino] = relationship(back_populates="experiencias")


class CursoPerfeccionamiento(Base):
    """Cursos, capacitaciones y certificaciones del postulante (3FN)."""

    __tablename__ = "cursos_perfeccionamiento"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    perfil_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("perfiles_talento_vecino.id", ondelete="CASCADE"), nullable=False, index=True
    )
    nombre_curso: Mapped[str] = mapped_column(String(160), nullable=False)
    institucion: Mapped[str] = mapped_column(String(150), nullable=False)
    horas: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    anio: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    perfil: Mapped[PerfilTalentoVecino] = relationship(back_populates="cursos")
