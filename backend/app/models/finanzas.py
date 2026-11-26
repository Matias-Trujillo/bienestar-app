"""Modelos ORM (3FN) del Módulo Financiero — Subvención UTM (HU-08) y Conciliación (HU-07)."""
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class AporteMunicipalUtm(Base, TimestampMixin):
    """Registro auditable del Aporte Municipal anual/mensual calculado en UTM (Ley N° 19.754).

    Fórmula legal: socios_congelados_31_dic * factor_utm (4) * valor_utm_clp.
    """

    __tablename__ = "aportes_municipales_utm"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    anio_fiscal: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    mes_transferencia: Mapped[str] = mapped_column(String(7), nullable=False, default="")

    socios_congelados_31_dic: Mapped[int] = mapped_column(Integer, nullable=False)
    factor_utm: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    valor_utm_clp: Mapped[int] = mapped_column(Integer, nullable=False)
    monto_total_clp: Mapped[int] = mapped_column(Integer, nullable=False)

    numero_decreto: Mapped[str] = mapped_column(String(80), nullable=False)
    fecha_transferencia: Mapped[str] = mapped_column(String(10), nullable=False)
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="")

    registrado_por_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True
    )
    registrado_por_nombre: Mapped[Optional[str]] = mapped_column(String(140), nullable=True)


class ConciliacionPlanilla(Base, TimestampMixin):
    """Cabecera de conciliación mensual entre Planilla RRHH (Cód. 47) y BancoEstado (HU-07)."""

    __tablename__ = "conciliaciones_planilla"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    periodo: Mapped[str] = mapped_column(String(7), nullable=False, index=True)  # YYYY-MM
    archivo_rrhh_nombre: Mapped[str] = mapped_column(String(200), nullable=False, default="")

    monto_declarado_rrhh: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    monto_cartola_banco: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    diferencia_clp: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    comprobante_banco_ref: Mapped[str] = mapped_column(String(100), nullable=False, default="")

    total_socios_evaluados: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    socios_al_dia: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    socios_con_brecha: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="CUADRADA")
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="")

    registrado_por_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True
    )
    registrado_por_nombre: Mapped[Optional[str]] = mapped_column(String(140), nullable=True)

    detalles = relationship(
        "PagoAporteMensual",
        back_populates="conciliacion",
        cascade="all, delete-orphan",
        lazy="noload",
    )


class PagoAporteMensual(Base, TimestampMixin):
    """Detalle socio a socio del descuento mensual Código 47 (4% Sueldo Base) — HU-07."""

    __tablename__ = "pagos_aportes_mensuales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conciliacion_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("conciliaciones_planilla.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    socio_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True
    )
    socio_rut: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    socio_nombre: Mapped[str] = mapped_column(String(140), nullable=False, default="")
    periodo: Mapped[str] = mapped_column(String(7), nullable=False, index=True)

    monto_esperado: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    monto_descontado_cod47: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    diferencia: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estado: Mapped[str] = mapped_column(String(25), nullable=False, default="AL_DIA")
    motivo_brecha: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="")

    regularizado_por_nombre: Mapped[Optional[str]] = mapped_column(String(140), nullable=True)
    regularizado_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    conciliacion = relationship("ConciliacionPlanilla", back_populates="detalles")
