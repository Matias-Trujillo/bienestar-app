"""Esquemas Pydantic para el Módulo de Beneficios Sociales y Bonos."""
from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, Field


class BonoCatalogoItem(BaseModel):
    id: str
    nombre: str
    porcentaje: float
    monto_calculado: int
    categoria: str
    requisitos: str
    documentacion_requerida: str
    regla_asignacion: str
    periodo_devengo: Optional[str] = None
    permite_postulacion_socio: bool = True
    icono: str


class CatalogoBeneficiosResponse(BaseModel):
    sueldo_base_grado_15: int
    fecha_actualizacion: str
    bonos_contingencia: List[BonoCatalogoItem]
    bonos_calendario: List[BonoCatalogoItem]


class ParametroUpdate(BaseModel):
    clave: str
    valor: str
    descripcion: Optional[str] = None


class PostulacionBeneficioCreate(BaseModel):
    tipo_bono: str
    motivo: str
    documento_tipo: str
    documento_nombre: Optional[str] = None
    documento_url: Optional[str] = None
    
    # Campos condicionales según tipo
    decreto_numero: Optional[str] = None
    decreto_fecha: Optional[str] = None
    dias_habiles_feriado: Optional[int] = None
    
    nombre_beneficiario: Optional[str] = None
    rut_beneficiario: Optional[str] = None
    institucion_educacional: Optional[str] = None
    nivel_educacional: Optional[str] = None
    edad_estudiante: Optional[int] = None


class AsignacionDirectaVacacionesCreate(BaseModel):
    socio_id: int
    decreto_numero: str
    decreto_fecha: str
    dias_habiles_feriado: int = Field(..., ge=10, description="Mínimo 10 días hábiles continuos")
    documento_nombre: Optional[str] = "Decreto_Alcaldicio_FeriadoLegal.pdf"
    documento_url: Optional[str] = "/docs/decretos/feriado-legal-directo.pdf"
    observaciones: Optional[str] = None
    metodo_pago: str = "Cheque"
    numero_cheque: Optional[str] = None
    banco: Optional[str] = "BancoEstado"


class ValidarSolicitudRequest(BaseModel):
    accion: str = Field(..., description="'APROBAR', 'RECHAZAR' o 'LIQUIDAR'")
    motivo_rechazo: Optional[str] = None
    observaciones: Optional[str] = None
    metodo_pago: Optional[str] = "Cheque"
    numero_cheque: Optional[str] = None
    banco: Optional[str] = "BancoEstado"


class SolicitudBeneficioOut(BaseModel):
    id: int
    socio_id: int
    socio_nombre: str
    socio_rut: str
    socio_departamento: str
    socio_antiguedad: str
    socio_meses_antiguedad: int
    
    tipo_bono: str
    titulo_bono: str
    porcentaje_base: float
    sueldo_base_referencia: int
    monto_calculado: int
    
    estado: str
    motivo: Optional[str] = None
    documento_tipo: str
    documento_nombre: Optional[str] = None
    documento_url: Optional[str] = None
    
    decreto_numero: Optional[str] = None
    decreto_fecha: Optional[str] = None
    dias_habiles_feriado: Optional[int] = None
    
    nombre_beneficiario: Optional[str] = None
    rut_beneficiario: Optional[str] = None
    institucion_educacional: Optional[str] = None
    nivel_educacional: Optional[str] = None
    edad_estudiante: Optional[int] = None
    
    asignacion_directa: bool
    motivo_rechazo: Optional[str] = None
    observaciones_admin: Optional[str] = None
    
    metodo_pago: Optional[str] = None
    numero_cheque: Optional[str] = None
    banco_emisor: Optional[str] = None
    fecha_liquidacion: Optional[str] = None
    created_at: str


class SimularNominaItem(BaseModel):
    socio_id: int
    rut: str
    nombre_completo: str
    departamento: str
    antiguedad_texto: str
    antiguedad_meses: int
    cumple_antiguedad: bool
    motivo_exclusion: Optional[str] = None
    monto: int
    decreto_asociado: Optional[str] = None
    decreto_digital_url: Optional[str] = None
    numero_cheque_sugerido: Optional[str] = None


class SimularNominaRequest(BaseModel):
    tipo_bono: str = Field(..., description="'invierno', 'navidad' o 'vacaciones_masivo'")
    periodo: str = Field(..., description="Ej: 'Julio 2026' o 'Diciembre 2026'")
    porcentaje: Optional[float] = Field(None, description="Entre 10.0 y 15.0 para Navidad; 15.0 para Invierno")
    decreto_marco: Optional[str] = None


class SimularNominaResponse(BaseModel):
    tipo_bono: str
    titulo: str
    periodo: str
    porcentaje_aplicado: float
    sueldo_base_utilizado: int
    monto_unitario: int
    total_socios_evaluados: int
    total_socios_beneficiados: int
    total_socios_excluidos: int
    monto_total_requerido: int
    decreto_marco: Optional[str] = None
    items: List[SimularNominaItem]


class EjecutarNominaRequest(BaseModel):
    tipo_bono: str
    titulo: str
    periodo: str
    porcentaje: float
    decreto_marco: Optional[str] = None
    acuerdo_directorio_acta: Optional[str] = None
    correlativo_cheque_inicial: Optional[int] = None
    banco_emisor: str = "BancoEstado"
    detalles: List[SimularNominaItem]


class CargaPlanillaItem(BaseModel):
    rut: str
    nombres: str
    apellidos: str
    decreto_asociado: Optional[str] = None
    fecha_decreto: Optional[str] = None
    dias_feriado: Optional[int] = None
    archivo_decreto_nombre: Optional[str] = None
