"""Esquemas Pydantic segregados (ISP) para permisos dinámicos de Administración por rol."""
from typing import Optional

from pydantic import BaseModel


class PermisoRolAdminOut(BaseModel):
    rol: str
    rolLabel: str
    puedeAccederAdmin: bool
    inmutable: bool = False
    otorgadoPorNombre: Optional[str] = None
    updatedAt: Optional[str] = None


class ActualizarPermisoRolIn(BaseModel):
    puedeAccederAdmin: bool
