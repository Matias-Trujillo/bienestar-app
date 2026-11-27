"""Interfaces y contratos abstractos del sistema (Principios DIP, ISP y LSP).

[ESTUDIANTE INFORMÁTICA] Este módulo define protocolos segregados (`typing.Protocol`) para que
los controladores y servicios de negocio dependan de abstracciones y no de implementaciones concretas.
Permite intercambiar adaptadores (ej. envío SMTP real vs. transporte en memoria en pruebas) respetando
el Principio de Sustitución de Liskov (LSP) e Inversión de Dependencias (DIP).
"""
from typing import Any, Dict, List, Optional, Protocol, Tuple, runtime_checkable

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.user import User


@runtime_checkable
class AuditLoggerProtocol(Protocol):
    """Contrato segregado (ISP) exclusivamente para registro inmutable de auditoría."""

    async def registrar(
        self,
        db: AsyncSession,
        usuario: User,
        modulo: str,
        accion: str,
        recurso_tipo: str,
        recurso_id: Optional[str],
        detalles: str,
        ip_origen: str = "127.0.0.1",
    ) -> AuditLog:
        ...


@runtime_checkable
class EmailBuzonProtocol(Protocol):
    """Contrato segregado (ISP) para almacenamiento y consulta del buzón institucional interno."""

    def registrar(self, correo: Dict[str, Any]) -> Dict[str, Any]:
        ...

    def listar(self, filtro: Optional[str] = None) -> List[Dict[str, Any]]:
        ...


@runtime_checkable
class SmtpTransportProtocol(Protocol):
    """Contrato segregado (ISP) para transporte de red SMTP sin acoplar plantillas ni buzón."""

    def obtener_estado(self) -> Dict[str, Any]:
        ...

    def actualizar_configuracion(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
        from_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        ...

    def enviar_html(
        self, destinatario: str, asunto: str, cuerpo_texto: str, cuerpo_html: str
    ) -> Tuple[bool, Optional[str]]:
        ...


@runtime_checkable
class PasswordHasherProtocol(Protocol):
    """Contrato segregado (ISP) para cifrado y verificación criptográfica de contraseñas."""

    def verify(self, plain_password: str, hashed_password: str) -> bool:
        ...

    def hash(self, password: str) -> str:
        ...


@runtime_checkable
class DashboardAdminProtocol(Protocol):
    """Contrato segregado (ISP) para métricas ejecutivas y novedades del Resumen General Admin."""

    async def obtener_resumen_general(self, db: AsyncSession, usuario: User) -> Any:
        ...


@runtime_checkable
class PermisosAdminProtocol(Protocol):
    """Contrato segregado (ISP) para autorización dinámica de roles en la sección Administración."""

    async def usuario_tiene_acceso_admin(self, db: AsyncSession, usuario: User) -> bool:
        ...

    async def listar_permisos_roles(self, db: AsyncSession) -> List[Any]:
        ...

    async def actualizar_permiso_rol(
        self, db: AsyncSession, rol_str: str, puede_acceder_admin: bool, superuser: User
    ) -> Any:
        ...
