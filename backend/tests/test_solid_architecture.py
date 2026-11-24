"""Pruebas automatizadas de Arquitectura SOLID (SRP, OCP, LSP, ISP y DIP).

[ESTUDIANTE INFORMÁTICA] Valida explícitamente la implementación de los 5 principios SOLID
en el backend de Bienestar-App:
  - SRP: Servicios especializados separados (FinanzasService, AdminService, AuthService,
    email_buzon, email_transport, email_templates).
  - OCP: Mapa extensible SMTP_PROVIDER_HOSTS para agregar proveedores sin modificar lógica.
  - LSP & ISP: Adaptadores intercambiables que cumplen los protocolos segregados (`isinstance`).
  - DIP: Inyección e intercambio de adaptadores falsos en AuthService, AdminService y fachada email
    sin depender de implementaciones concretas ni disparar red real.
"""
from typing import Any, Dict, List, Optional, Tuple
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.interfaces import (
    AuditLoggerProtocol,
    EmailBuzonProtocol,
    PasswordHasherProtocol,
    SmtpTransportProtocol,
)
from app.core.security import BcryptPasswordHasher
from app.models import AuditLog, User
from app.services.admin_service import AdminService
from app.services.audit_service import SqlAlchemyAuditLogger
from app.services.auth_service import AuthService
from app.services.email_buzon import InMemoryBuzonStore
from app.services.email_service import (
    generar_correo_recepcion_solicitud,
    generar_correo_recuperacion_password,
)
from app.services.email_transport import SMTP_PROVIDER_HOSTS, SmtpEmailTransport
from app.services.finanzas_service import FinanzasService


class FakeSmtpTransport:
    """Doble de prueba que sustituye a SmtpEmailTransport cumpliendo LSP y DIP."""

    def __init__(self) -> None:
        self.enviados: List[Dict[str, str]] = []
        self._config: Dict[str, Any] = {
            "configurado": True,
            "host": "smtp.fake.local",
            "port": 587,
            "user": "test@mperalillo.cl",
            "tienePassword": True,
            "from_email": "test@mperalillo.cl",
            "from_name": "Test Bienestar",
        }

    def obtener_estado(self) -> Dict[str, Any]:
        return dict(self._config)

    def actualizar_configuracion(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
        from_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        if host:
            self._config["host"] = host
        return self.obtener_estado()

    def enviar_html(
        self, destinatario: str, asunto: str, cuerpo_texto: str, cuerpo_html: str
    ) -> Tuple[bool, Optional[str]]:
        self.enviados.append({"to": destinatario, "subject": asunto, "text": cuerpo_texto})
        return True, None


class FakeBuzonStore:
    """Doble de prueba que sustituye a InMemoryBuzonStore cumpliendo ISP y LSP."""

    def __init__(self) -> None:
        self.items: List[Dict[str, Any]] = []

    def registrar(self, correo: Dict[str, Any]) -> Dict[str, Any]:
        self.items.append(correo)
        return correo

    def listar(self, filtro: Optional[str] = None) -> List[Dict[str, Any]]:
        return list(self.items)


class FakeAuditLogger:
    """Doble de prueba para verificar DIP en eventos de auditoría."""

    def __init__(self) -> None:
        self.registros: List[Tuple[str, str, str]] = []

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
        self.registros.append((modulo, accion, detalles))
        return AuditLog(
            usuario_id=usuario.id,
            usuario_nombre=usuario.nombre_completo,
            usuario_rut=usuario.rut,
            usuario_rol="socio",
            modulo=modulo,
            accion=accion,
            recurso_tipo=recurso_tipo,
            recurso_id=recurso_id,
            detalles=detalles,
            ip_origen=ip_origen,
        )


def test_adaptadores_cumplen_protocolos_segregados_isp_lsp():
    """Verifica que los adaptadores concretos y dobles satisfacen los contratos Protocol."""
    assert isinstance(SqlAlchemyAuditLogger(), AuditLoggerProtocol)
    assert isinstance(InMemoryBuzonStore(), EmailBuzonProtocol)
    assert isinstance(SmtpEmailTransport(), SmtpTransportProtocol)
    assert isinstance(BcryptPasswordHasher(), PasswordHasherProtocol)

    assert isinstance(FakeAuditLogger(), AuditLoggerProtocol)
    assert isinstance(FakeBuzonStore(), EmailBuzonProtocol)
    assert isinstance(FakeSmtpTransport(), SmtpTransportProtocol)


def test_ocp_mapa_proveedores_smtp_extensible():
    """Verifica que el mapeo de servidores SMTP se resuelva de manera abierta/cerrada vía diccionario."""
    assert "@gmail.com" in SMTP_PROVIDER_HOSTS
    assert "@outlook.com" in SMTP_PROVIDER_HOSTS
    transport = SmtpEmailTransport()
    transport.actualizar_configuracion(host="smtp.gmail.com", user="cuenta@outlook.cl", password="secret")
    estado = transport.obtener_estado()
    assert estado["host"] == "smtp-mail.outlook.com"


def test_dip_sustitucion_transporte_y_buzon_sin_red_real():
    """Verifica que la fachada de correo opera con adaptadores falsos inyectados (DIP + LSP)."""
    fake_smtp = FakeSmtpTransport()
    fake_buzon = FakeBuzonStore()

    res = generar_correo_recepcion_solicitud(
        folio="AF-SOLID-001",
        nombre_completo="Socio Prueba SOLID",
        run_formateado="15.489.123-4",
        email_destino="solid@mperalillo.cl",
        grado="12",
        calidad_contractual="Planta",
        enviar_smtp=True,
        transport=fake_smtp,
        buzon=fake_buzon,
    )
    assert res["enviadoSmtp"] is True
    assert len(fake_smtp.enviados) == 1
    assert fake_smtp.enviados[0]["to"] == "solid@mperalillo.cl"
    assert len(fake_buzon.items) == 1

    res_rec = generar_correo_recuperacion_password(
        nombre_completo="Socio Prueba SOLID",
        run_formateado="15.489.123-4",
        email_destino="solid@mperalillo.cl",
        clave_temporal="Peralillo#9999",
        enviar_smtp=True,
        transport=fake_smtp,
    )
    assert res_rec["enviadoSmtp"] is True
    assert len(fake_smtp.enviados) == 2


@pytest.mark.asyncio
async def test_srp_finanzas_service_y_dip_audit_en_auth_admin(
    db_session: AsyncSession, socio_habilitado: User, usuario_admin: User
):
    """Verifica FinanzasService aislado e inyección de FakeAuditLogger en AuthService y AdminService."""
    estado_finanzas = await FinanzasService.obtener_estado_financiero(db_session)
    assert estado_finanzas["modulo"] == "Control Financiero"
    assert estado_finanzas["socios_activos"] >= 1

    fake_audit = FakeAuditLogger()
    auth_srv = AuthService(audit_logger=fake_audit)
    assert auth_srv.audit_logger is fake_audit

    admin_srv = AdminService(audit_logger=fake_audit)
    stats = await admin_srv.obtener_estadisticas(db_session)
    assert stats["usuarios"]["total"] >= 2

    await admin_srv.audit_logger.registrar(
        db_session,
        usuario_admin,
        modulo="PRUEBA_SOLID",
        accion="TEST_DIP",
        recurso_tipo="Sistema",
        recurso_id="1",
        detalles="Inyección por protocolo verificada",
    )
    assert len(fake_audit.registros) == 1
    assert fake_audit.registros[0][0] == "PRUEBA_SOLID"
