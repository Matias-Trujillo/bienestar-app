"""Esquemas Pydantic para el módulo de Administración y Gobernanza (SRP).

[ESTUDIANTE INFORMÁTICA] Extraídos desde `endpoints/admin.py` para respetar el
Principio de Responsabilidad Única (SRP) y Segregación de Interfaces (ISP).
"""
from datetime import datetime
from typing import Optional, Union

from pydantic import BaseModel

from app.models import UserRole


class AuditLogOut(BaseModel):
    id: int
    created_at: Union[datetime, str]
    usuario_nombre: str
    usuario_rut: Optional[str] = None
    usuario_rol: str
    modulo: str
    accion: str
    recurso_tipo: str
    recurso_id: Optional[str] = None
    detalles: Optional[str] = None
    ip_origen: Optional[str] = None

    class Config:
        from_attributes = True


class CrearUsuarioIn(BaseModel):
    rut: str
    email: str
    nombre_completo: str
    password: str
    rol: UserRole
    departamento: str = "Departamento Municipal"
    antiguedad: str = "12 Meses"
    meses_antiguedad: int = 12
    estado_previsional: str = "Al día"
    saldo_salud_disponible: int = 150000
    saldo_salud_total_anual: int = 150000
    cargas_registradas: int = 0


class EditarUsuarioIn(BaseModel):
    rol: Optional[UserRole] = None
    is_active: Optional[bool] = None
    departamento: Optional[str] = None
    nueva_password: Optional[str] = None
    password_bloqueada: Optional[bool] = None
    debe_cambiar_password: Optional[bool] = None
    saldo_salud_disponible: Optional[int] = None
    meses_antiguedad: Optional[int] = None
    estado_previsional: Optional[str] = None


class ParametroUpdateIn(BaseModel):
    clave: str
    valor: str
    descripcion: Optional[str] = None


class SmtpConfigIn(BaseModel):
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    destinatario_prueba: Optional[str] = None


class CrearBonoIn(BaseModel):
    codigo: str
    nombre: str
    porcentaje: float
    categoria: str = "Beneficio Económico"
    requisitos: str = ""
    documentacion_requerida: str = ""
    regla_asignacion: str = ""
    periodo_devengo: Optional[str] = None
    permite_postulacion_socio: bool = True
    es_calendario: bool = False
    activo: bool = True
    icono: str = "gift"


class EditarBonoIn(BaseModel):
    nombre: Optional[str] = None
    porcentaje: Optional[float] = None
    categoria: Optional[str] = None
    requisitos: Optional[str] = None
    documentacion_requerida: Optional[str] = None
    regla_asignacion: Optional[str] = None
    periodo_devengo: Optional[str] = None
    permite_postulacion_socio: Optional[bool] = None
    es_calendario: Optional[bool] = None
    activo: Optional[bool] = None
    icono: Optional[str] = None
