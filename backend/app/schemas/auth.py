"""Esquemas Pydantic para Autenticación, Perfil y Seguridad (SRP + ISP).

[ESTUDIANTE INFORMÁTICA] Separa los contratos de entrada/salida del controlador HTTP `auth.py`.
"""
from typing import Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    # [ESTUDIANTE INFORMÁTICA] Restricción de longitud para mitigar DoS y payloads desbordados
    username: str = Field(..., min_length=3, max_length=100, description="RUT chileno o correo electrónico")
    password: str = Field(..., min_length=1, max_length=200, description="Contraseña del usuario")


class CambiarPasswordPropiaIn(BaseModel):
    password_actual: Optional[str] = None
    nueva_password: str


class RecuperarPasswordIn(BaseModel):
    # [ESTUDIANTE INFORMÁTICA] Restricción de longitud para mitigar DoS y payloads desbordados
    identificador: str = Field(..., min_length=3, max_length=100, description="RUT chileno o correo institucional")


class UserOut(BaseModel):
    id: str
    rut: str
    nombreCompleto: str
    email: str
    rol: str
    rolLabel: str
    isSuperuser: bool
    isActive: bool = True
    departamento: str
    antiguedad: str
    estadoPrevisional: str
    saldoSaludDisponible: int
    saldoSaludTotalAnual: int
    cargasRegistradas: int
    mesesAntiguedad: int = 0
    intentosFallidos: int = 0
    passwordBloqueada: bool = False
    debeCambiarPassword: bool = False
    estadoPassword: str = "vigente"
    ultimoCambioPassword: Optional[str] = None
    puedeEliminar: bool = False
    motivoNoEliminable: Optional[str] = None
    tieneDobleVista: bool = False
    puedeAccederAdmin: bool = False
    accesoAnterior: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
