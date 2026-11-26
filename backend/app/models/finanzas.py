"""Modelos ORM (3FN) del Módulo Financiero — Subvención Municipal en UTM (HU-08)."""
from typing import Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

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
