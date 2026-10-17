"""Esquemas Pydantic para el módulo de Reembolsos Médicos (HU-03)."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import date, datetime


# ---------- Request Schemas ----------

class ReembolsoCreateRequest(BaseModel):
    """Datos que el socio envía al crear una solicitud de reembolso."""
    tipo_prestacion: str = Field(..., description="Clave del tipo de prestación médica")
    descripcion: str = Field("", description="Descripción libre del gasto")
    beneficiario_nombre: str = Field(..., description="Nombre del beneficiario")
    beneficiario_parentesco: str = Field("Titular", description="Parentesco con el socio")
    monto_boleta: float = Field(..., gt=0, description="Monto total de la boleta en CLP")
    monto_copago: float = Field(0, ge=0, description="Copago a solicitar reembolso")
    fecha_atencion: date = Field(..., description="Fecha de la atención médica")
    fecha_boleta: date = Field(..., description="Fecha del documento tributario")
    tipo_documento: str = Field(..., description="Tipo de documento de respaldo adjunto")
    comprobante_filename: str = Field("", max_length=255, description="Nombre del archivo adjunto")
    declaracion_aceptada: bool = Field(
        ..., description="El socio declara que la información y documentación es verídica y legal"
    )

    @field_validator("fecha_atencion", "fecha_boleta")
    @classmethod
    def fecha_no_futura(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("La fecha no puede ser futura")
        return v

    @field_validator("tipo_prestacion")
    @classmethod
    def tipo_prestacion_valido(cls, v: str) -> str:
        from app.models.reembolso import TIPOS_PRESTACION_SOLICITABLES
        validos = [t.value for t in TIPOS_PRESTACION_SOLICITABLES]
        if v not in validos:
            raise ValueError("Tipo de prestación no válido. Opciones: " + ", ".join(validos))
        return v

    @field_validator("tipo_documento")
    @classmethod
    def tipo_documento_valido(cls, v: str) -> str:
        from app.models.reembolso import TIPOS_DOCUMENTO
        if v not in TIPOS_DOCUMENTO:
            raise ValueError("Tipo de documento no válido. Opciones: " + ", ".join(TIPOS_DOCUMENTO))
        return v

    @field_validator("declaracion_aceptada")
    @classmethod
    def declaracion_obligatoria(cls, v: bool) -> bool:
        if not v:
            raise ValueError(
                "Debe aceptar que la información y documentación ingresada es correcta y legal."
            )
        return v


# ---------- Response Schemas ----------

class ReembolsoOut(BaseModel):
    """Representación de una solicitud de reembolso para el frontend."""
    id: int
    codigo: str
    tipo_prestacion: str
    tipo_prestacion_label: str
    descripcion: str
    beneficiario_nombre: str
    beneficiario_parentesco: str
    monto_boleta: float
    monto_copago: float
    monto_reembolso: float
    fecha_atencion: str
    fecha_boleta: str
    tipo_documento: str = ""
    tipo_documento_label: str = ""
    comprobante_filename: str
    comprobante_url: str
    declaracion_aceptada: bool = False
    estado: str
    estado_label: str
    motivo_rechazo: str
    created_at: str

    model_config = {"from_attributes": True}


class ResumenSaludSocio(BaseModel):
    """Resumen del estado de salud/fondos del socio."""
    socio_id: int
    socio_nombre: str
    rut: str
    tipo_socio: str
    estado_previsional: str
    fecha_afiliacion: str
    meses_antiguedad: int
    puede_solicitar: bool
    fecha_habilitacion: Optional[str] = None
    mensaje_carencia: Optional[str] = None
    saldo_salud_disponible: float
    saldo_salud_total_anual: float
    porcentaje_utilizado: float
    total_reembolsado_periodo: float
    solicitudes_en_revision: int
    solicitudes_aprobadas: int


class ValidacionFechaResponse(BaseModel):
    """Resultado de la validación de plazo de 30 días corridos."""
    fecha_atencion: str
    fecha_limite: str
    dias_transcurridos: int
    dentro_de_plazo: bool
    mensaje: str


class ReembolsoHistorialResponse(BaseModel):
    """Lista de reembolsos con resumen."""
    resumen: ResumenSaludSocio
    solicitudes: List[ReembolsoOut]
