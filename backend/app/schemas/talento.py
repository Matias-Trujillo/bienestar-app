"""Esquemas Pydantic del Módulo Vecino y Nuevo Talento — Trabaja con Nosotros (Ley N° 21.015)."""
import re
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.afiliacion import normalizar_run

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")
ALLOWED_CV_EXTENSIONS = (".pdf", ".doc", ".docx")
MAX_CV_BASE64_LEN = 14 * 1024 * 1024  # ~10 MB en binario


class CompetenciaOut(BaseModel):
    id: int
    nombre: str
    categoria: str


class OfertaLaboralIn(BaseModel):
    titulo: str = Field(..., min_length=3, max_length=160)
    unidad: str = Field(..., min_length=2, max_length=120)
    descripcion: str = Field(..., min_length=15, max_length=3000)
    requisitos: Optional[str] = Field(default="", max_length=2000)
    rentaReferencialClp: Optional[int] = Field(default=None, ge=100000, le=20000000)
    jornada: Literal["completa", "parcial", "turnos"] = "completa"
    modalidad: Literal["presencial", "hibrida", "teletrabajo"] = "presencial"
    vacantes: int = Field(default=1, ge=1, le=50)
    fechaCierre: Optional[str] = Field(default=None, max_length=10)
    inclusivaLey21015: bool = True


class OfertaEstadoIn(BaseModel):
    activa: bool


class OfertaLaboralOut(BaseModel):
    id: int
    codigo: str
    titulo: str
    unidad: str
    descripcion: str
    requisitos: Optional[str] = ""
    rentaReferencialClp: Optional[int] = None
    jornada: str
    modalidad: str
    vacantes: int
    fechaCierre: Optional[str] = None
    inclusivaLey21015: bool
    activa: bool
    publicadoPorNombre: Optional[str] = None
    fechaPublicacion: datetime
    postulacionesCount: int = 0


class EducacionIn(BaseModel):
    institucion: str = Field(..., min_length=2, max_length=150)
    titulo: str = Field(..., min_length=2, max_length=150)
    nivelEducacional: str = Field(..., min_length=2, max_length=60)
    estadoEstudios: str = Field(default="Titulado/a", max_length=40)
    anioInicio: Optional[int] = Field(default=None, ge=1950, le=2035)
    anioTermino: Optional[int] = Field(default=None, ge=1950, le=2035)

    @model_validator(mode="after")
    def _check_anios(self) -> "EducacionIn":
        if self.anioInicio and self.anioTermino and self.anioTermino < self.anioInicio:
            raise ValueError("El año de término educacional no puede ser menor al año de inicio.")
        return self


class ExperienciaIn(BaseModel):
    empresa: str = Field(..., min_length=2, max_length=150)
    cargo: str = Field(..., min_length=2, max_length=120)
    anioInicio: Optional[int] = Field(default=None, ge=1950, le=2035)
    anioTermino: Optional[int] = Field(default=None, ge=1950, le=2035)
    actualmenteTrabajando: bool = False
    funciones: Optional[str] = Field(default="", max_length=1000)

    @model_validator(mode="after")
    def _check_anios(self) -> "ExperienciaIn":
        if not self.actualmenteTrabajando and self.anioInicio and self.anioTermino and self.anioTermino < self.anioInicio:
            raise ValueError("El año de término laboral no puede ser menor al año de inicio.")
        return self


class CursoIn(BaseModel):
    nombreCurso: str = Field(..., min_length=2, max_length=160)
    institucion: str = Field(..., min_length=2, max_length=150)
    horas: Optional[int] = Field(default=None)
    anio: Optional[int] = Field(default=None)

    @field_validator("horas")
    @classmethod
    def _check_horas(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1 or v > 5000):
            raise ValueError("Las horas del curso deben estar entre 1 y 5000.")
        return v

    @field_validator("anio")
    @classmethod
    def _check_anio(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1950 or v > 2035):
            raise ValueError("El año del curso debe ser un año válido de 4 dígitos (entre 1950 y 2035).")
        return v


class PostulacionTalentoIn(BaseModel):
    # 1. Antecedentes de contacto y resumen
    nombreCompleto: str = Field(..., min_length=3, max_length=140)
    run: str = Field(..., min_length=7, max_length=16)
    email: str = Field(..., min_length=5, max_length=140)
    telefono: str = Field(..., min_length=7, max_length=30)
    direccion: str = Field(..., min_length=4, max_length=200)
    comuna: str = Field(default="Peralillo", min_length=2, max_length=80)
    resumenProfesional: str = Field(..., min_length=20, max_length=2000)

    # 2. Educación, experiencia y perfeccionamiento (3FN)
    educaciones: List[EducacionIn] = Field(default_factory=list, max_length=15)
    experiencias: List[ExperienciaIn] = Field(default_factory=list, max_length=15)
    cursos: List[CursoIn] = Field(default_factory=list, max_length=20)

    # 3. Competencias técnicas precargadas (N:M)
    competenciaIds: List[int] = Field(default_factory=list, max_length=30)

    # 4. Condiciones laborales deseadas
    rentaEsperadaClp: int = Field(..., ge=100000, le=20000000)
    jornadaDeseada: Literal["completa", "parcial", "turnos"] = "completa"
    modalidadDeseada: Literal["presencial", "hibrida", "teletrabajo"] = "presencial"

    # 5. Inclusión laboral (Ley N° 21.015)
    poseeDiscapacidadLey21015: bool = False
    credencialRndSenadis: Optional[str] = Field(default=None, max_length=80)
    aceptaTratamientoDatos: bool

    # Currículum Vitae (CV)
    cvFilename: Optional[str] = Field(default=None, max_length=255)
    cvContentType: Optional[str] = Field(default=None, max_length=120)
    cvDataBase64: Optional[str] = Field(default=None)

    # Oferta laboral asociada (opcional)
    ofertaId: Optional[int] = Field(default=None)

    @field_validator("run")
    @classmethod
    def _validate_run(cls, v: str) -> str:
        return normalizar_run(v)

    @field_validator("email")
    @classmethod
    def _validate_email(cls, v: str) -> str:
        limpio = (v or "").strip().lower()
        if not EMAIL_RE.match(limpio):
            raise ValueError("Ingrese un correo electrónico válido.")
        return limpio

    @field_validator("telefono")
    @classmethod
    def _validate_telefono(cls, v: str) -> str:
        digitos = re.sub(r"[^0-9]", "", v or "")
        if len(digitos) < 8 or len(digitos) > 15:
            raise ValueError("Ingrese un número de teléfono válido (ej: +56 9 1234 5678).")
        return v.strip()

    @model_validator(mode="after")
    def _validate_reglas(self) -> "PostulacionTalentoIn":
        if not self.aceptaTratamientoDatos:
            raise ValueError("Debe aceptar la cláusula de tratamiento confidencial de datos para postular.")
        if self.cvFilename:
            if not self.cvFilename.lower().endswith(ALLOWED_CV_EXTENSIONS):
                raise ValueError("El currículum (CV) debe estar en formato PDF, DOC o DOCX.")
            if not self.cvDataBase64:
                raise ValueError("Debe adjuntar el contenido del archivo CV seleccionado.")
            if len(self.cvDataBase64) > MAX_CV_BASE64_LEN:
                raise ValueError("El archivo CV excede el tamaño máximo permitido de 10 MB.")
        return self


class PostulacionTalentoOut(BaseModel):
    id: int
    folio: str
    estado: str
    fechaIngreso: datetime
    nombreCompleto: str
    run: str
    email: str
    telefono: str
    direccion: str
    comuna: str
    resumenProfesional: str
    rentaEsperadaClp: int
    jornadaDeseada: str
    modalidadDeseada: str
    poseeDiscapacidadLey21015: bool
    credencialRndSenadis: Optional[str] = None
    cvFilename: Optional[str] = None
    tieneCv: bool = False
    ofertaId: Optional[int] = None
    ofertaTitulo: Optional[str] = None
    competencias: List[CompetenciaOut] = Field(default_factory=list)
    educaciones: List[Dict[str, Any]] = Field(default_factory=list)
    experiencias: List[Dict[str, Any]] = Field(default_factory=list)
    cursos: List[Dict[str, Any]] = Field(default_factory=list)
    notificaciones: Optional[Dict[str, Any]] = None
    mensaje: str = ""
