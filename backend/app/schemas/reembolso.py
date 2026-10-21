"""Esquemas Pydantic para el módulo de Reembolsos Médicos (HU-03)."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import date, datetime


# ---------- Request Schemas ----------

# [ESTUDIANTE INFORMÁTICA] Esto valida el payload que envía el socio al crear una solicitud (HU-03) y permite asegurar tipos correctos, campos obligatorios y montos mayores a cero.
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

    # [ESTUDIANTE INFORMÁTICA] Esto intercepta las fechas y valida que no sean del futuro; permite evitar inconsistencias cronológicas antes de tocar la base de datos.
    @field_validator("fecha_atencion", "fecha_boleta")
    @classmethod
    def fecha_no_futura(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("La fecha no puede ser futura")
        return v

    # [ESTUDIANTE INFORMÁTICA] Esto valida que el tipo de prestación pertenezca a la lista de tipos solicitables vigentes de la HU-03.
    @field_validator("tipo_prestacion")
    @classmethod
    def tipo_prestacion_valido(cls, v: str) -> str:
        from app.models.reembolso import TIPOS_PRESTACION_SOLICITABLES
        validos = [t.value for t in TIPOS_PRESTACION_SOLICITABLES]
        if v not in validos:
            raise ValueError("Tipo de prestación no válido. Opciones: " + ", ".join(validos))
        return v

    # [ESTUDIANTE INFORMÁTICA] Esto valida que el documento adjunto sea uno de los respaldos legalmente aceptados por Bienestar.
    @field_validator("tipo_documento")
    @classmethod
    def tipo_documento_valido(cls, v: str) -> str:
        from app.models.reembolso import TIPOS_DOCUMENTO
        if v not in TIPOS_DOCUMENTO:
            raise ValueError("Tipo de documento no válido. Opciones: " + ", ".join(TIPOS_DOCUMENTO))
        return v

    # [ESTUDIANTE INFORMÁTICA] Esto valida que el checkbox de declaración jurada esté estrictamente en True; permite blindar legalmente la veracidad de la solicitud.
    @field_validator("declaracion_aceptada")
    @classmethod
    def declaracion_obligatoria(cls, v: bool) -> bool:
        if not v:
            raise ValueError(
                "Debe aceptar que la información y documentación ingresada es correcta y legal."
            )
        return v


# ---------- Response Schemas ----------

# [ESTUDIANTE INFORMÁTICA] Esto valida la petición enviada por directivos/administradores al resolver una solicitud (HU-04); permite recibir la acción (APROBAR o RECHAZAR) y exigir un motivo en caso de rechazo.
class ResolverReembolsoRequest(BaseModel):
    """Acción de aprobación o rechazo ejecutada por admin o superusuario."""
    accion: str = Field(..., description="'APROBAR' o 'RECHAZAR'")
    motivo_rechazo: Optional[str] = Field("", description="Motivo en caso de rechazo")


# [ESTUDIANTE INFORMÁTICA] Este DTO define el formato con el que el backend envía la solicitud al frontend; permite transformar los campos internos de la base de datos a un formato JSON limpio y estructurado con etiquetas amigables.
class ReembolsoOut(BaseModel):
    """Representación de una solicitud de reembolso para el frontend."""
    id: int
    codigo: str
    socio_id: Optional[int] = None
    socio_nombre: Optional[str] = ""
    socio_rut: Optional[str] = ""
    socio_departamento: Optional[str] = ""
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


# [ESTUDIANTE INFORMÁTICA] Esto agrupa el estado de cuenta médico del socio (saldo anual, disponible, consumido y carencia); permite al frontend pintar las tarjetas de resumen y bloquear la solicitud si no cumple 6 meses de permanencia.
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


# [ESTUDIANTE INFORMÁTICA] Esto modela la respuesta del cálculo dinámico de la regla de los 30 días corridos; permite mostrar un mensaje en tiempo real al socio mientras elige la fecha.
class ValidacionFechaResponse(BaseModel):
    """Resultado de la validación de plazo de 30 días corridos."""
    fecha_atencion: str
    fecha_limite: str
    dias_transcurridos: int
    dentro_de_plazo: bool
    mensaje: str


# [ESTUDIANTE INFORMÁTICA] Esto encapsula tanto el resumen financiero como la lista histórica de reembolsos; permite responder al frontend en una sola petición HTTP eficiente.
class ReembolsoHistorialResponse(BaseModel):
    """Lista de reembolsos con resumen."""
    resumen: ResumenSaludSocio
    solicitudes: List[ReembolsoOut]
