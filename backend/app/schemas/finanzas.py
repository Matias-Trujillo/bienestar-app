"""Esquemas Pydantic del Módulo Financiero — UTM (HU-08) y Conciliación Bancaria (HU-07)."""
from datetime import datetime
from typing import List, Optional

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


# ==============================================================================
# HU-07: Conciliación Planilla RRHH (Cód. 47) y Cartola BancoEstado
# ==============================================================================

class FilaCod47In(BaseModel):
    rut: str = Field(..., min_length=5, max_length=20)
    nombre: Optional[str] = Field(default="", max_length=140)
    monto_esperado: Optional[int] = Field(default=None, ge=0)
    monto_descontado: int = Field(..., ge=0)
    observacion: Optional[str] = Field(default="", max_length=300)


class ConciliacionPlanillaIn(BaseModel):
    periodo: str = Field(..., min_length=7, max_length=7, description="YYYY-MM")
    archivo_rrhh_nombre: str = Field(default="planilla_cod47.csv", max_length=200)
    monto_cartola_banco: int = Field(..., ge=0)
    comprobante_banco_ref: str = Field(..., min_length=2, max_length=100)
    observaciones: Optional[str] = Field(default="", max_length=1000)
    filas_cod47: List[FilaCod47In] = Field(..., min_length=1)


class PagoAporteMensualOut(BaseModel):
    id: int
    conciliacion_id: int
    socio_id: Optional[int] = None
    socio_rut: str
    socio_nombre: str
    periodo: str
    monto_esperado: int
    monto_descontado_cod47: int
    diferencia: int
    estado: str
    motivo_brecha: str = ""
    regularizado_por_nombre: Optional[str] = None
    regularizado_at: Optional[datetime] = None


class ConciliacionPlanillaOut(BaseModel):
    id: int
    codigo: str
    periodo: str
    archivo_rrhh_nombre: str
    monto_declarado_rrhh: int
    monto_cartola_banco: int
    diferencia_clp: int
    comprobante_banco_ref: str
    total_socios_evaluados: int
    socios_al_dia: int
    socios_con_brecha: int
    estado: str
    observaciones: str = ""
    registrado_por_nombre: Optional[str] = None
    created_at: datetime


class ConciliacionPlanillaDetalleOut(ConciliacionPlanillaOut):
    detalles: List[PagoAporteMensualOut] = []


class RegularizarAporteIn(BaseModel):
    motivo_regularizacion: str = Field(..., min_length=4, max_length=500)
    monto_regularizado: Optional[int] = Field(default=None, ge=0)


class ChequeEnTransitoOut(BaseModel):
    solicitud_id: int
    codigo_reembolso: str
    socio_nombre: str
    socio_rut: str
    numero_cheque: str
    banco_emisor: str
    monto_reembolso: int
    fecha_emision: str
    dias_en_transito: int
    alerta_60_dias: bool


class MovimientoCartolaIn(BaseModel):
    fecha: str = Field(default="", max_length=20)
    descripcion: str = Field(default="", max_length=300)
    numero_documento: Optional[str] = Field(default="", max_length=60)
    monto_cargo: int = Field(..., ge=0)


class CartolaBancoEstadoIn(BaseModel):
    archivo_nombre: str = Field(default="cartola_bancoestado.csv", max_length=200)
    movimientos: List[MovimientoCartolaIn] = Field(..., min_length=1)


class ChequeConciliadoOut(BaseModel):
    solicitud_id: int
    codigo_reembolso: str
    socio_nombre: str
    numero_cheque: str
    monto_reembolso: int
    fecha_cobro_banco: str


class CartolaConciliacionResultOut(BaseModel):
    archivo_nombre: str
    total_movimientos_leidos: int
    total_cheques_conciliados: int
    monto_total_conciliado: int
    cheques_conciliados: List[ChequeConciliadoOut]
    sin_coincidencia: int
