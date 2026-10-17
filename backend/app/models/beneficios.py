"""Modelos ORM para el Módulo de Beneficios Sociales y Bonos.
Implementa las reglas de negocio para:
- HU-05: Postulación y Liquidación de Bonos por Contingencia / Evento.
- HU-06: Liquidación Masiva de Bonos Periódicos de Calendario (Invierno y Navidad).
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ParametroSistema(Base, TimestampMixin):
    """Parámetros de configuración del sistema de Bienestar."""
    __tablename__ = "parametros_sistema"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    clave: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    valor: Mapped[str] = mapped_column(String(255))
    descripcion: Mapped[str] = mapped_column(String(255), default="")


class SolicitudBeneficio(Base, TimestampMixin):
    """Registro de postulación y liquidación individual de beneficios económicos."""
    __tablename__ = "solicitudes_beneficio"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    socio_id: Mapped[int] = mapped_column(Integer, ForeignKey("usuarios.id"), index=True)
    
    # Identificación del bono
    tipo_bono: Mapped[str] = mapped_column(String(60), index=True)
    titulo_bono: Mapped[str] = mapped_column(String(120))
    porcentaje_base: Mapped[float] = mapped_column(Float)
    sueldo_base_referencia: Mapped[int] = mapped_column(Integer)
    monto_calculado: Mapped[int] = mapped_column(Integer)
    
    # Estado del flujo: PENDIENTE, APROBADO, RECHAZADO, LIQUIDADO
    estado: Mapped[str] = mapped_column(String(30), default="PENDIENTE", index=True)
    
    # Justificación y requisitos documentales
    motivo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    documento_tipo: Mapped[str] = mapped_column(String(120), default="")
    documento_nombre: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    documento_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Campos específicos según tipo de beneficio
    decreto_numero: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    decreto_fecha: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    dias_habiles_feriado: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    nombre_beneficiario: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    rut_beneficiario: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    institucion_educacional: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    nivel_educacional: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    edad_estudiante: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Indicador de asignación directa
    asignacion_directa: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Resolución y Liquidación
    motivo_rechazo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    observaciones_admin: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    revisado_por_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha_revision: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    metodo_pago: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    numero_cheque: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    banco_emisor: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="BancoEstado")
    fecha_liquidacion: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    liquidado_por_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    # Relaciones
    socio = relationship("User", foreign_keys=[socio_id])
    revisado_por = relationship("User", foreign_keys=[revisado_por_id])
    liquidado_por = relationship("User", foreign_keys=[liquidado_por_id])


class NominaMasiva(Base, TimestampMixin):
    """Proceso de liquidación masiva de bonos de calendario (Invierno, Navidad, Vacaciones masivas)."""
    __tablename__ = "nominas_masivas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tipo_bono: Mapped[str] = mapped_column(String(60), index=True)
    titulo: Mapped[str] = mapped_column(String(150))
    periodo: Mapped[str] = mapped_column(String(60))
    porcentaje: Mapped[float] = mapped_column(Float)
    sueldo_base_utilizado: Mapped[int] = mapped_column(Integer)
    monto_unitario: Mapped[int] = mapped_column(Integer)
    
    total_socios_evaluados: Mapped[int] = mapped_column(Integer, default=0)
    total_socios_beneficiados: Mapped[int] = mapped_column(Integer, default=0)
    total_socios_excluidos: Mapped[int] = mapped_column(Integer, default=0)
    monto_total_liquidado: Mapped[int] = mapped_column(Integer, default=0)
    
    estado: Mapped[str] = mapped_column(String(40), default="APROBADA_TESORERIA")
    decreto_marco: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    acuerdo_directorio_acta: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    creado_por_id: Mapped[int] = mapped_column(Integer, ForeignKey("usuarios.id"))
    creado_por = relationship("User", foreign_keys=[creado_por_id])
    detalles = relationship("DetalleNominaMasiva", back_populates="nomina", cascade="all, delete-orphan")


class DetalleNominaMasiva(Base, TimestampMixin):
    """Detalle por socio en la nómina masiva."""
    __tablename__ = "detalles_nomina_masiva"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nomina_id: Mapped[int] = mapped_column(Integer, ForeignKey("nominas_masivas.id"), index=True)
    socio_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)
    
    rut: Mapped[str] = mapped_column(String(20))
    nombre_completo: Mapped[str] = mapped_column(String(150))
    departamento: Mapped[str] = mapped_column(String(120), default="")
    antiguedad_texto: Mapped[str] = mapped_column(String(60), default="")
    antiguedad_meses: Mapped[int] = mapped_column(Integer, default=0)
    
    cumple_antiguedad: Mapped[bool] = mapped_column(Boolean, default=True)
    motivo_exclusion: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    monto: Mapped[int] = mapped_column(Integer, default=0)
    decreto_asociado: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    decreto_digital_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    metodo_pago: Mapped[str] = mapped_column(String(40), default="Cheque")
    numero_cheque: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    banco: Mapped[Optional[str]] = mapped_column(String(100), default="BancoEstado")
    estado_pago: Mapped[str] = mapped_column(String(30), default="EMITIDO")
    
    nomina = relationship("NominaMasiva", back_populates="detalles")
    socio = relationship("User", foreign_keys=[socio_id])
