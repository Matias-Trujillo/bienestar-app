"""Esquemas Pydantic para el módulo de Afiliación y Cargas Familiares (HU-01 y HU-02)."""
import re
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.config import settings


def normalizar_run(value: str) -> str:
    """Normaliza y valida un RUN con módulo 11 chileno."""
    limpio = re.sub(r"[^0-9kK]", "", value or "").upper()
    if len(limpio) < 8 or len(limpio) > 9:
        raise ValueError("RUN inválido (debe tener entre 7 y 8 dígitos más dígito verificador)")
    cuerpo, dv = limpio[:-1], limpio[-1]
    if not cuerpo.isdigit():
        raise ValueError("RUN inválido")
    suma, mult = 0, 2
    for d in reversed(cuerpo):
        suma += int(d) * mult
        mult = 2 if mult == 7 else mult + 1
    resto = 11 - (suma % 11)
    esperado = "0" if resto == 11 else "K" if resto == 10 else str(resto)
    if dv != esperado:
        raise ValueError("RUN inválido (dígito verificador incorrecto)")
    return f"{int(cuerpo)}-{dv}"


def formatear_run(run: str) -> str:
    """Formatea un RUN al estilo chileno 'XX.XXX.XXX-X'."""
    limpio = re.sub(r"[^0-9kK]", "", run or "").upper()
    if len(limpio) < 2:
        return run or ""
    cuerpo_num = re.sub(r"[^0-9]", "", limpio[:-1])
    dv = limpio[-1]
    if not cuerpo_num:
        return run or ""
    return f"{int(cuerpo_num):,}".replace(",", ".") + f"-{dv}"


class CargaIn(BaseModel):
    nombreCompleto: str = Field(min_length=3, max_length=120)
    run: str
    parentesco: Optional[str] = Field(default=None, max_length=40)

    @field_validator("run")
    @classmethod
    def _run(cls, v: str) -> str:
        return normalizar_run(v)


class SolicitudIn(BaseModel):
    nombreCompleto: str = Field(min_length=3, max_length=120)
    run: str
    grado: str = Field(min_length=1, max_length=10)
    calidadContractual: Literal["Planta", "Contrata"]
    email: Optional[str] = Field(default=None, max_length=120)
    cargas: List[CargaIn] = Field(default_factory=list, max_length=15)
    autorizaDescuento: bool
    aceptaCarencia: bool

    @field_validator("run")
    @classmethod
    def _run(cls, v: str) -> str:
        return normalizar_run(v)

    @model_validator(mode="after")
    def _reglas(self):
        if not self.autorizaDescuento:
            raise ValueError(
                f"Debe autorizar el descuento por planilla del {settings.AFILIACION_PORCENTAJE_DESCUENTO}% del sueldo base"
            )
        if not self.aceptaCarencia:
            raise ValueError("Debe declarar haber leído la cláusula del período de carencia")
        runs = [c.run for c in self.cargas]
        if len(runs) != len(set(runs)):
            raise ValueError("Hay cargas familiares con RUN repetido")
        if self.run in runs:
            raise ValueError("El RUN del titular no puede registrarse como carga")
        return self


class CargaOut(BaseModel):
    nombreCompleto: str
    run: str
    parentesco: Optional[str]


class ComprobanteOut(BaseModel):
    folio: str
    estado: str
    fechaIngreso: datetime
    nombreCompleto: str
    run: str
    grado: str
    calidadContractual: str
    email: Optional[str]
    porcentajeDescuento: int
    cargas: List[CargaOut]
    mesesCarencia: int
    textoCarencia: str
    mensaje: str
    fechaSesion: Optional[str] = None
    numeroActa: Optional[str] = None
    fechaFinCarencia: Optional[str] = None
    observacionesResolucion: Optional[str] = None
    resueltoPor: Optional[str] = None
    resueltoAt: Optional[str] = None
    notificacionEmail: Optional[Dict[str, Any]] = None


class ResolucionSolicitudIn(BaseModel):
    accion: Literal["aprobar", "rechazar"]
    fechaSesion: Optional[str] = None
    numeroActa: Optional[str] = None
    observaciones: Optional[str] = None


class NuevaCargaIn(BaseModel):
    nombreCompleto: str = Field(..., min_length=3, max_length=160)
    run: str = Field(..., min_length=7, max_length=16)
    parentesco: Optional[str] = Field("Hijo/a", max_length=60)
    observacionSocio: Optional[str] = Field(None, max_length=500)
    certificadoNombre: Optional[str] = Field(None, max_length=255)
    certificadoTipo: Optional[str] = Field("Cédula de Identidad (Frontal)", max_length=120)
    certificadoData: Optional[str] = None
    socioId: Optional[int] = None
    socioRut: Optional[str] = None

    @field_validator("run")
    @classmethod
    def check_run(cls, v: str) -> str:
        return normalizar_run(v)


class SolicitudCargaOut(BaseModel):
    id: int
    folio: str
    socioId: int
    socioNombre: str
    socioRut: str
    socioEmail: Optional[str] = None
    nombreCompleto: str
    run: str
    parentesco: Optional[str] = None
    observacionSocio: Optional[str] = None
    certificadoNombre: Optional[str] = None
    certificadoTipo: Optional[str] = None
    certificadoData: Optional[str] = None
    estado: str
    fechaIngreso: datetime
    fechaSesion: Optional[str] = None
    numeroActa: Optional[str] = None
    observacionesResolucion: Optional[str] = None
    resueltoPor: Optional[str] = None
    resueltoAt: Optional[str] = None


class CargaMasivaDependienteIn(BaseModel):
    nombreCompleto: str
    run: str
    parentesco: Optional[str] = "Hijo/a"


class CargaMasivaSocioIn(BaseModel):
    rut: str
    nombreCompleto: str
    email: str
    calidadContractual: Optional[str] = "Planta"
    grado: Optional[str] = "Grado 10"
    departamento: Optional[str] = "Departamento Municipal"
    mesesAntiguedad: Optional[int] = 12
    rol: Optional[str] = "socio"
    saldoSaludDisponible: Optional[float] = 150000.0
    cargas: List[CargaMasivaDependienteIn] = Field(default_factory=list)


class CargaMasivaRequestIn(BaseModel):
    registros: List[CargaMasivaSocioIn]
    numeroActa: Optional[str] = "Nómina Masiva Muni Peralillo"
    enviarCorreos: bool = False
