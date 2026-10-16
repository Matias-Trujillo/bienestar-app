"""Esquemas comunes de Pydantic para respuestas y validaciones estándar."""
from pydantic import BaseModel
from typing import Optional, Generic, TypeVar, List
from datetime import datetime

T = TypeVar("T")


class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None


class PaginatedResponse(BaseModel, Generic[T]):
    total: int
    page: int
    size: int
    items: List[T]


class SocioSummarySchema(BaseModel):
    id: int
    rut: str
    nombre_completo: str
    estado_socio: str
    estado_previsional: str
    saldo_salud_disponible: float
    saldo_salud_total: float
