"""Esquemas Pydantic del Módulo Financiero — Aporte Municipal en UTM (HU-08)."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class Padron31DicOut(BaseModel):
    """Snapshot del padrón de socios activos congelado al 31 de diciembre del año previo."""

    anio_fiscal: int
    fecha_corte: str
    socios_congelados_31_dic: int
    factor_utm: int = 4
    total_utm_anual: int
    valor_utm_referencia_clp: int
    monto_estimado_clp: int


class AporteMunicipalUtmIn(BaseModel):
    """Datos para registrar una subvención municipal en UTM (HU-08)."""

    anio_fiscal: int = Field(..., ge=2020, le=2040)
    mes_transferencia: str = Field(..., min_length=7, max_length=7, description="YYYY-MM")
    valor_utm_clp: int = Field(..., ge=30000, le=500000, description="Valor oficial UTM en CLP")
    numero_decreto: str = Field(..., min_length=2, max_length=80)
    fecha_transferencia: str = Field(..., min_length=8, max_length=10, description="YYYY-MM-DD")
    socios_congelados_override: Optional[int] = Field(
        default=None, ge=1, le=50000, description="Opcional: confirmar cantidad exacta de socios al 31-dic"
    )
    observaciones: Optional[str] = Field(default="", max_length=1000)

    @field_validator("valor_utm_clp")
    @classmethod
    def _validar_utm(cls, v: int) -> int:
        if v < 30000 or v > 500000:
            raise ValueError("El valor de la UTM en CLP debe estar entre $30.000 y $500.000.")
        return v


class AporteMunicipalUtmOut(BaseModel):
    id: int
    codigo: str
    anio_fiscal: int
    mes_transferencia: str
    socios_congelados_31_dic: int
    factor_utm: int
    valor_utm_clp: int
    monto_total_clp: int
    numero_decreto: str
    fecha_transferencia: str
    observaciones: str = ""
    registrado_por_nombre: Optional[str] = None
    created_at: datetime
