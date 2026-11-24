"""Transporte de red SMTP y configuración en tiempo de ejecución (SRP + OCP + DIP).

[ESTUDIANTE INFORMÁTICA] Módulo dedicado exclusivamente al transporte SMTP real y configuración
en caliente. Aplica el Principio Abierto/Cerrado (OCP) mediante el mapa extensible
`SMTP_PROVIDER_HOSTS` e implementa `SmtpTransportProtocol` para Inversión de Dependencias (DIP).
"""
import logging
import smtplib
from email.header import Header
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

_LOGO_EMAIL_PATH = Path(__file__).resolve().parent.parent / "assets" / "logo-peralillo-email.png"
_LOGO_EMAIL_BYTES: Optional[bytes] = (
    _LOGO_EMAIL_PATH.read_bytes() if _LOGO_EMAIL_PATH.exists() else None
)

# Mapa extensible de proveedores SMTP por dominio (Principio OCP: agregar proveedores sin tocar lógica central)
SMTP_PROVIDER_HOSTS: Dict[str, str] = {
    "@hotmail.com": "smtp-mail.outlook.com",
    "@outlook.com": "smtp-mail.outlook.com",
    "@live.com": "smtp-mail.outlook.com",
    "@msn.com": "smtp-mail.outlook.com",
    "@outlook.cl": "smtp-mail.outlook.com",
    "@gmail.com": "smtp.gmail.com",
}

_SMTP_RUNTIME: Dict[str, Any] = {
    "host": settings.SMTP_HOST or "smtp.gmail.com",
    "port": int(settings.SMTP_PORT or 587),
    "user": settings.SMTP_USER or "",
    "password": settings.SMTP_PASSWORD or "",
    "from_email": settings.SMTP_FROM_EMAIL or "bienestar@mperalillo.cl",
    "from_name": "Comite de Bienestar Municipalidad de Peralillo",
}


class SmtpEmailTransport:
    """Adaptador concreto de SmtpTransportProtocol usando librería estándar smtplib."""

    def actualizar_configuracion(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
        from_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Actualiza en caliente las credenciales SMTP sin reiniciar el contenedor."""
        if host is not None:
            _SMTP_RUNTIME["host"] = host.strip()
        if port is not None:
            try:
                _SMTP_RUNTIME["port"] = int(port)
            except ValueError:
                _SMTP_RUNTIME["port"] = 587
        if user is not None:
            _SMTP_RUNTIME["user"] = user.strip()
        if password is not None:
            _SMTP_RUNTIME["password"] = password.strip().replace(" ", "")
        if from_email is not None and from_email.strip():
            _SMTP_RUNTIME["from_email"] = from_email.strip()
        return self.obtener_estado()

    def obtener_estado(self) -> Dict[str, Any]:
        user = (_SMTP_RUNTIME.get("user") or settings.SMTP_USER or "").strip()
        pwd = (_SMTP_RUNTIME.get("password") or settings.SMTP_PASSWORD or "").strip()
        host = (_SMTP_RUNTIME.get("host") or settings.SMTP_HOST or "smtp.gmail.com").strip()
        port = int(_SMTP_RUNTIME.get("port") or settings.SMTP_PORT or 587)

        user_lower = user.lower()
        for domain_suffix, provider_host in SMTP_PROVIDER_HOSTS.items():
            if user_lower.endswith(domain_suffix):
                if not host or host in ("smtp.gmail.com", "smtp-mail.outlook.com"):
                    host = provider_host
                break

        configurado = bool(host and user and pwd)
        return {
            "configurado": configurado,
            "host": host,
            "port": port,
            "user": user,
            "tienePassword": bool(pwd),
            "from_email": user if "@" in user else _SMTP_RUNTIME.get("from_email"),
            "from_name": _SMTP_RUNTIME.get("from_name"),
        }

    def enviar_html(
        self, destinatario: str, asunto: str, cuerpo_texto: str, cuerpo_html: str
    ) -> Tuple[bool, Optional[str]]:
        """Envía el correo por SMTP real con logo institucional embebido (CID) compatible con DKIM."""
        estado = self.obtener_estado()
        if not estado["configurado"] or not destinatario:
            return (
                False,
                "Servidor SMTP no configurado aún (complete SMTP_USER y SMTP_PASSWORD en Administración → Parámetros Base).",
            )

        host = estado["host"]
        port = estado["port"]
        user = estado["user"]
        password = _SMTP_RUNTIME.get("password") or settings.SMTP_PASSWORD or ""
        remitente_email = user if "@" in user else estado["from_email"]
        dominio_remitente = remitente_email.split("@")[-1] if "@" in remitente_email else "gmail.com"

        try:
            msg_root = MIMEMultipart("related")
            asunto_limpio = asunto.replace("—", "-").replace("•", "-")
            msg_root["Subject"] = Header(asunto_limpio, "utf-8")
            msg_root["From"] = formataddr((str(Header("Comite de Bienestar Peralillo", "utf-8")), remitente_email))
            msg_root["To"] = destinatario.strip()
            msg_root["Date"] = formatdate(localtime=True)
            msg_root["Message-ID"] = make_msgid(domain=dominio_remitente)

            msg_alt = MIMEMultipart("alternative")
            msg_alt.attach(MIMEText(cuerpo_texto, "plain", "utf-8"))
            msg_alt.attach(MIMEText(cuerpo_html, "html", "utf-8"))
            msg_root.attach(msg_alt)

            if _LOGO_EMAIL_BYTES:
                img_part = MIMEImage(_LOGO_EMAIL_BYTES, _subtype="png")
                img_part.add_header("Content-ID", "<logo_peralillo>")
                img_part.add_header("Content-Disposition", "inline", filename="logo-peralillo.png")
                msg_root.attach(img_part)

            raw_msg = msg_root.as_string().replace("\r\n", "\n").replace("\n", "\r\n").encode("utf-8")

            if port == 465:
                with smtplib.SMTP_SSL(host, port, timeout=15) as server:
                    server.login(user, password)
                    server.sendmail(remitente_email, [destinatario.strip()], raw_msg)
            else:
                with smtplib.SMTP(host, port, timeout=15) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(user, password)
                    server.sendmail(remitente_email, [destinatario.strip()], raw_msg)

            logger.info("Correo SMTP real con logo enviado exitosamente a %s (%s)", destinatario, asunto_limpio)
            return True, None
        except Exception as exc:
            logger.warning("Error al enviar correo SMTP a %s: %s", destinatario, exc)
            return False, str(exc)


default_smtp_transport = SmtpEmailTransport()


def actualizar_config_smtp_runtime(
    host: Optional[str] = None,
    port: Optional[int] = None,
    user: Optional[str] = None,
    password: Optional[str] = None,
    from_email: Optional[str] = None,
) -> Dict[str, Any]:
    return default_smtp_transport.actualizar_configuracion(host, port, user, password, from_email)


def obtener_estado_smtp_runtime() -> Dict[str, Any]:
    return default_smtp_transport.obtener_estado()


def _enviar_smtp_real(
    destinatario: str, asunto: str, cuerpo_texto: str, cuerpo_html: str
) -> Tuple[bool, Optional[str]]:
    return default_smtp_transport.enviar_html(destinatario, asunto, cuerpo_texto, cuerpo_html)
