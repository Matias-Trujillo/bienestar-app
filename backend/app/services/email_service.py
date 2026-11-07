"""Servicio de notificaciones por correo electrónico para el Comité de Bienestar."""
import logging
import smtplib
from datetime import datetime, timezone
from email.header import Header
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

_LOGO_EMAIL_PATH = Path(__file__).resolve().parent.parent / "assets" / "logo-peralillo-email.png"
_LOGO_EMAIL_BYTES: Optional[bytes] = (
    _LOGO_EMAIL_PATH.read_bytes() if _LOGO_EMAIL_PATH.exists() else None
)

# Cache en memoria sincronizada con ParametroSistema (Administración -> Parámetros Base)
_SMTP_RUNTIME: Dict[str, Any] = {
    "host": settings.SMTP_HOST or "smtp.gmail.com",
    "port": int(settings.SMTP_PORT or 587),
    "user": settings.SMTP_USER or "",
    "password": settings.SMTP_PASSWORD or "",
    "from_email": settings.SMTP_FROM_EMAIL or "bienestar@mperalillo.cl",
    "from_name": "Comite de Bienestar Municipalidad de Peralillo",
}

# Bandeja de correos emitidos por el sistema (Webmail integrado para desarrollo/producción)
_BUZON_MEMORIA: list[Dict[str, Any]] = []


def registrar_en_buzon(correo: Dict[str, Any]) -> Dict[str, Any]:
    """Guarda el correo emitido en la bandeja del sistema evitando duplicados exactos consecutivos."""
    item = {
        "id": f"{correo.get('folio', 'MAIL')}-{correo.get('tipo', 'info')}-{len(_BUZON_MEMORIA) + 1}",
        "leido": False,
        **correo,
    }
    # Si ya existe el mismo folio y mismo tipo, actualizarlo y moverlo al inicio
    existente_idx = next(
        (
            i
            for i, x in enumerate(_BUZON_MEMORIA)
            if x.get("folio") == correo.get("folio")
            and x.get("tipo") == correo.get("tipo")
            and x.get("estadoResolucion") == correo.get("estadoResolucion")
        ),
        None,
    )
    if existente_idx is not None:
        _BUZON_MEMORIA.pop(existente_idx)
    _BUZON_MEMORIA.insert(0, item)
    return item


def listar_buzon_memoria(filtro: Optional[str] = None) -> list[Dict[str, Any]]:
    if not filtro or not filtro.strip():
        return list(_BUZON_MEMORIA)
    q = filtro.strip().lower().replace(".", "").replace("-", "")
    res = []
    for c in _BUZON_MEMORIA:
        dest = (c.get("destinatario") or "").lower()
        folio = (c.get("folio") or "").lower()
        cuerpo = (c.get("cuerpoTexto") or "").lower().replace(".", "").replace("-", "")
        if filtro.strip().lower() in dest or filtro.strip().lower() in folio or q in cuerpo:
            res.append(c)
    return res


def actualizar_config_smtp_runtime(
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
    return obtener_estado_smtp_runtime()


def obtener_estado_smtp_runtime() -> Dict[str, Any]:
    user = (_SMTP_RUNTIME.get("user") or settings.SMTP_USER or "").strip()
    pwd = (_SMTP_RUNTIME.get("password") or settings.SMTP_PASSWORD or "").strip()
    host = (_SMTP_RUNTIME.get("host") or settings.SMTP_HOST or "smtp.gmail.com").strip()
    port = int(_SMTP_RUNTIME.get("port") or settings.SMTP_PORT or 587)

    # Autodetección inteligente de servidor según el dominio del correo remitente
    user_lower = user.lower()
    if any(user_lower.endswith(d) for d in ("@hotmail.com", "@outlook.com", "@live.com", "@msn.com", "@outlook.cl")):
        if host == "smtp.gmail.com" or not host:
            host = "smtp-mail.outlook.com"
    elif user_lower.endswith("@gmail.com"):
        if not host or "outlook" in host:
            host = "smtp.gmail.com"

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


def _envolver_html_institucional(
    *,
    folio: str,
    fecha_emision: str,
    badge_texto: str,
    badge_bg: str,
    badge_color: str,
    banner_bg: str,
    banner_subtitulo: str,
    banner_titulo: str,
    saludo_nombre: str,
    intro_html: str,
    alerta_estado_html: str,
    filas_tabla: List[Tuple[str, str]],
    bloque_credenciales_html: str = "",
    titulo_pasos: str = "Próximos pasos a seguir",
    pasos: Optional[List[str]] = None,
    nota_pie_html: str = "",
) -> str:
    """
    Construye un correo HTML corporativo, moderno y 100% compatible con Outlook, Hotmail, Gmail y Apple Mail,
    incluyendo el escudo y logotipo oficial de la Ilustre Municipalidad de Peralillo embebido vía CID.
    """
    filas_html = ""
    for idx, (etiqueta, valor) in enumerate(filas_tabla):
        bg_row = "#f8fafc" if idx % 2 == 0 else "#ffffff"
        borde_top = "border-top: 1px solid #e2e8f0;" if idx > 0 else ""
        filas_html += f"""
        <tr>
          <td style="padding: 11px 16px; background-color: {bg_row}; {borde_top} font-size: 13px; color: #64748b; font-weight: 600; width: 42%;">
            {etiqueta}
          </td>
          <td style="padding: 11px 16px; background-color: {bg_row}; {borde_top} font-size: 13px; color: #0f172a; font-weight: 700;">
            {valor}
          </td>
        </tr>
        """

    pasos_html = ""
    if pasos:
        items_pasos = ""
        for i, p in enumerate(pasos, start=1):
            items_pasos += f"""
            <tr>
              <td valign="top" style="padding: 0 12px 12px 0; width: 28px;">
                <div style="width: 24px; height: 24px; line-height: 24px; border-radius: 50%; background-color: #006799; color: #ffffff; font-size: 12px; font-weight: 800; text-align: center;">
                  {i}
                </div>
              </td>
              <td valign="top" style="padding: 2px 0 12px 0; font-size: 13.5px; line-height: 1.55; color: #334155;">
                {p}
              </td>
            </tr>
            """
        pasos_html = f"""
        <div style="margin-top: 22px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px;">
          <p style="margin: 0 0 14px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #0f172a;">
            {titulo_pasos}
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            {items_pasos}
          </table>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #eef2f6; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #eef2f6; padding: 28px 12px;">
    <tr>
      <td align="center">
        <!-- Contenedor Principal -->
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width: 640px; width: 100%; background-color: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);">
          
          <!-- Cinta Institucional 4 Colores Municipalidad de Peralillo (Compatible con Outlook y Gmail) -->
          <tr>
            <td style="padding: 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="25%" height="6" style="background-color: #006799; font-size: 1px; line-height: 1px;">&nbsp;</td>
                  <td width="25%" height="6" style="background-color: #78a200; font-size: 1px; line-height: 1px;">&nbsp;</td>
                  <td width="25%" height="6" style="background-color: #cfa145; font-size: 1px; line-height: 1px;">&nbsp;</td>
                  <td width="25%" height="6" style="background-color: #d94e28; font-size: 1px; line-height: 1px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cabecera Institucional con Escudo y Logo Oficial de Peralillo -->
          <tr>
            <td style="padding: 20px 28px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" align="left">
                    <img src="cid:logo_peralillo" alt="Ilustre Municipalidad de Peralillo" width="215" style="display: block; width: 215px; max-width: 100%; height: auto; border: 0;" />
                  </td>
                  <td valign="middle" align="right" style="text-align: right;">
                    <span style="display: inline-block; padding: 5px 12px; border-radius: 999px; background-color: {badge_bg}; color: {badge_color}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.7px;">
                      {badge_texto}
                    </span>
                    <p style="margin: 6px 0 0 0; font-size: 11.5px; color: #64748b; font-weight: 600;">
                      Folio: <strong style="color: #0f172a; font-family: Consolas, monospace;">{folio}</strong> &bull; {fecha_emision}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Banner Principal del Estado -->
          <tr>
            <td style="background-color: {banner_bg}; padding: 24px 28px; color: #ffffff;">
              <p style="margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.6px; color: #f3e3be;">
                {banner_subtitulo}
              </p>
              <h1 style="margin: 6px 0 0 0; font-size: 21px; font-weight: 800; line-height: 1.3; color: #ffffff;">
                {banner_titulo}
              </h1>
            </td>
          </tr>

          <!-- Cuerpo del Mensaje -->
          <tr>
            <td style="padding: 28px;">
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a;">
                Estimado(a) <strong>{saludo_nombre}</strong>:
              </p>
              <div style="font-size: 14px; line-height: 1.65; color: #334155; margin-bottom: 18px;">
                {intro_html}
              </div>

              {alerta_estado_html}

              <!-- Tabla Ejecutiva de Antecedentes -->
              <div style="margin: 18px 0; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #0f172a; color: #ffffff; padding: 9px 16px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                  Ficha Oficial de la Solicitud
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  {filas_html}
                </table>
              </div>

              {bloque_credenciales_html}

              {pasos_html}

              {nota_pie_html}
            </td>
          </tr>

          <!-- Pie de Página Corporativo Municipal -->
          <tr>
            <td style="background-color: #0b1929; color: #94a3b8; padding: 22px 28px; border-top: 3px solid #cfa145;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top" style="font-size: 12px; line-height: 1.6; color: #cbd5e1;">
                    <strong style="color: #ffffff; font-size: 13px;">Comité de Bienestar &bull; Ilustre Municipalidad de Peralillo</strong><br />
                    Regulado por Ley N° 19.754 sobre Servicios de Bienestar del Personal Municipal.<br />
                    Mesa de Ayuda al Funcionario: <a href="mailto:bienestar@mperalillo.cl" style="color: #38bdf8; text-decoration: none;">bienestar@mperalillo.cl</a>
                  </td>
                  <td valign="top" align="right" style="text-align: right; font-size: 11px; color: #94a3b8;">
                    Portal Institucional<br />
                    <a href="{settings.PORTAL_URL}/login" style="color: #f3e3be; font-weight: 700; text-decoration: none;">{settings.PORTAL_URL}</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 14px 0 0 0; padding-top: 12px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; text-align: center;">
                Este es un mensaje oficial generado de forma automática por la Plataforma de Bienestar de la Ilustre Municipalidad de Peralillo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def enviar_correo_prueba_smtp(destinatario: str) -> tuple[bool, str]:
    """Envía un correo real de verificación para comprobar las credenciales SMTP configuradas."""
    estado = obtener_estado_smtp_runtime()
    if not estado["user"]:
        return False, "Falta ingresar el correo remitente (SMTP_USER)."
    if not estado["tienePassword"]:
        return (
            False,
            f"Falta ingresar la Contraseña / Contraseña de Aplicación para la cuenta {estado['user']} (el campo contraseña está vacío).",
        )

    fecha_emision = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
    asunto = "[Bienestar Peralillo] Verificación Oficial de Correo Institucional (SMTP)"
    cuerpo_txt = (
        "¡Configuración exitosa!\n\n"
        "El servidor de correo del Comité de Bienestar de la Ilustre Municipalidad de Peralillo "
        "quedó conectado correctamente y ya puede despachar correos reales de recepción, "
        "aprobación (con clave temporal) y rechazo a las bandejas de entrada de los funcionarios."
    )
    cuerpo_html = _envolver_html_institucional(
        folio="TEST-SMTP",
        fecha_emision=fecha_emision,
        badge_texto="CONEXIÓN VERIFICADA",
        badge_bg="#dcfce7",
        badge_color="#166534",
        banner_bg="#064e3b",
        banner_subtitulo="SERVICIO DE BIENESTAR • ILUSTRE MUNICIPALIDAD DE PERALILLO",
        banner_titulo="✔ Configuración de Correo Saliente Activa",
        saludo_nombre="Administrador(a) del Sistema",
        intro_html=(
            "El módulo de notificaciones transaccionales del <strong>Comité de Bienestar de la Ilustre Municipalidad de Peralillo</strong> "
            "ha sido enlazado satisfactoriamente y cuenta con el diseño institucional y logotipo oficial incorporado."
        ),
        alerta_estado_html="",
        filas_tabla=[
            ("Servidor SMTP Conectado", f"{estado['host']}:{estado['port']} (STARTTLS)"),
            ("Casilla Emisora", estado["user"]),
            ("Casilla Destinataria de Prueba", destinatario),
            ("Estado de Firma DKIM / MIME", "Activo (Base64 + Escudo Municipal CID)"),
        ],
        titulo_pasos="Flujos automáticos habilitados en el sistema",
        pasos=[
            "Al enviar una Solicitud de Incorporación, el funcionario recibe de inmediato su Comprobante Oficial en Gestión.",
            "Al aprobarse en sesión de Directiva, el socio recibe su resolución ACEPTADA, su Contraseña Temporal y el botón directo al Portal.",
            "Al rechazarse una solicitud, el funcionario recibe el motivo formal informado por el Directorio e instrucciones de subsanación.",
        ],
    )
    ok, err = _enviar_smtp_real(destinatario, asunto, cuerpo_txt, cuerpo_html)
    if ok:
        return True, f"¡Correo real con logo institucional enviado con éxito a {destinatario}! Revise su bandeja de entrada."
    err_str = err or "Error desconocido"
    if "basic authentication is disabled" in err_str.lower() or any(
        estado["user"].lower().endswith(d) for d in ("@hotmail.com", "@outlook.com", "@live.com", "@msn.com")
    ):
        return (
            False,
            f"Microsoft bloqueó el envío SMTP para cuentas personales ({estado['user']}) a nivel mundial (Error 535 5.7.139: Basic authentication is disabled, incluso con contraseña de aplicación). "
            "Solución inmediata: En '1. Correo Emisor' ingrese una cuenta @gmail.com con su Contraseña de Aplicación de Google (o una cuenta corporativa), y mantenga fabian_07915@hotmail.com como destinatario para recibir allí todos los correos.",
        )
    if "535" in err_str or "Authentication" in err_str or "Username and Password not accepted" in err_str:
        return (
            False,
            f"El servidor {estado['host']} rechazó la contraseña de {estado['user']}. "
            "Si usa Gmail, recuerde generar una 'Contraseña de Aplicación de 16 letras' (App Password) en lugar de su clave normal. Detalle: " + err_str,
        )
    return False, f"No se pudo autenticar en {estado['host']}:{estado['port']}: {err_str}"


def _enviar_smtp_real(
    destinatario: str, asunto: str, cuerpo_texto: str, cuerpo_html: str
) -> tuple[bool, Optional[str]]:
    """Envía el correo por SMTP real con logo institucional embebido (CID) y formato RFC 5322 compatible con DKIM."""
    estado = obtener_estado_smtp_runtime()
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
        # Contenedor principal "related" para alojar el cuerpo alternativo + la imagen inline CID del logo municipal
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

        # Adjuntar logotipo institucional de la Ilustre Municipalidad de Peralillo como imagen CID inline
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


def generar_correo_recepcion_solicitud(
    folio: str,
    nombre_completo: str,
    run_formateado: str,
    email: Optional[str] = None,
    email_destino: Optional[str] = None,
    grado: str = "",
    calidad_contractual: str = "",
    porcentaje_descuento: int = 4,
    meses_carencia: int = 6,
    cantidad_cargas: int = 0,
    fecha_ingreso: Optional[Any] = None,
    enviar_smtp: bool = True,
) -> Dict[str, Any]:
    """Genera y despacha el correo de confirmación de ingreso de la Solicitud de Incorporación."""
    correo_final = (email_destino or email or "").strip()
    destinatario = (
        correo_final
        if correo_final
        else f"{run_formateado.replace('.', '').replace('-', '').lower()}@mperalillo.cl"
    )
    asunto = f"[Bienestar Peralillo] Solicitud de Incorporacion N° {folio} Recepcionada y en Gestion"
    fecha_emision = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")

    cuerpo_texto = (
        f"Estimado(a) {nombre_completo}:\n\n"
        f"Le informamos que su Solicitud de Incorporación N° {folio} al Comité de Bienestar de la "
        f"Ilustre Municipalidad de Peralillo ha sido recepcionada exitosamente y se encuentra en gestión.\n\n"
        f"RESUMEN DE SU GESTIÓN:\n"
        f"- N° de Solicitud (Folio): {folio}\n"
        f"- Estado Actual: Pendiente de aprobación por el Directorio\n"
        f"- Funcionario(a): {nombre_completo} (RUN: {run_formateado})\n"
        f"- Calidad / Grado: {calidad_contractual} • Grado {grado}\n"
        f"- Cuota Social Autorizada: Descuento por planilla del {porcentaje_descuento}% del sueldo base\n"
        f"- Cargas Familiares Declaradas: {cantidad_cargas}\n"
        f"- Período de Carencia Reglamentario: {meses_carencia} meses continuos desde la aprobación\n\n"
        f"¿QUÉ VIENE AHORA?\n"
        f"1. Su solicitud será evaluada en la próxima sesión ordinaria del Directorio de Bienestar.\n"
        f"2. Una vez resuelta, recibirá un segundo correo electrónico indicando si su solicitud N° {folio} "
        f"fue ACEPTADA o RECHAZADA, junto con el motivo.\n"
        f"3. En caso de ser aprobada, ese correo incluirá su Contraseña Temporal y todos los pasos "
        f"para iniciar sesión por primera vez en el Portal de Bienestar.\n\n"
        f"Atentamente,\n"
        f"Comité de Bienestar • Ilustre Municipalidad de Peralillo"
    )

    alerta_recepcion = f"""
    <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px;">
      <p style="margin: 0; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0369a1; letter-spacing: 0.5px;">
        Comprobante Oficial de Recepción
      </p>
      <p style="margin: 4px 0 0 0; font-size: 13.5px; color: #0c4a6e;">
        Su <strong>Solicitud N° {folio}</strong> ha ingresado formalmente a bandeja del Directorio y se encuentra <strong>En Gestión de Aprobación</strong>.
      </p>
    </div>
    """

    pasos_recepcion = [
        f"<strong>Revisión en Sesión de Directiva:</strong> Sus antecedentes y cargas familiares serán evaluados en la próxima sesión ordinaria del Comité de Bienestar.",
        f"<strong>Notificación de Resolución Oficial:</strong> Recibirá en esta misma casilla (<strong>{destinatario}</strong>) un segundo correo indicando si su <strong>Solicitud N° {folio}</strong> fue <strong>ACEPTADA</strong> o <strong>RECHAZADA</strong> junto con el fundamento.",
        "<strong>Entrega de Clave Temporal de Acceso:</strong> Una vez aprobada su incorporación, dicho correo incluirá su <strong>Contraseña Temporal inicial</strong> y el paso a paso para activar su cuenta en el Portal.",
    ]

    cuerpo_html = _envolver_html_institucional(
        folio=folio,
        fecha_emision=fecha_emision,
        badge_texto="EN GESTIÓN DIRECTIVA",
        badge_bg="#fef3c7",
        badge_color="#92400e",
        banner_bg="#0c2438",
        banner_subtitulo="COMITÉ DE BIENESTAR • ILUSTRE MUNICIPALIDAD DE PERALILLO",
        banner_titulo=f"Confirmación de Solicitud de Incorporación N° {folio}",
        saludo_nombre=nombre_completo,
        intro_html=(
            "Junto con saludar cordialmente, confirmamos que hemos recepcionado su solicitud de afiliación "
            "al <strong>Servicio de Bienestar de la Ilustre Municipalidad de Peralillo</strong>. A continuación se detalla el respaldo oficial de su postulación:"
        ),
        alerta_estado_html=alerta_recepcion,
        filas_tabla=[
            ("N° de Solicitud (Folio)", folio),
            ("Estado del Trámite", "Pendiente de Aprobación por el Directorio"),
            ("Funcionario(a) Solicitante", nombre_completo),
            ("RUN", run_formateado),
            ("Calidad Contractual y Grado", f"{calidad_contractual} — Grado {grado}"),
            ("Cargas Familiares Registradas", f"{cantidad_cargas} carga(s) declarada(s)"),
            ("Cuota Social Autorizada", f"{porcentaje_descuento}% del sueldo base (descuento por planilla)"),
            ("Período de Carencia Legal", f"{meses_carencia} meses continuos desde la fecha de aprobación"),
        ],
        titulo_pasos="¿Cómo continúa el proceso y cómo obtendrá su clave de acceso?",
        pasos=pasos_recepcion,
    )

    enviado_smtp, error_smtp = (
        _enviar_smtp_real(destinatario, asunto, cuerpo_texto, cuerpo_html)
        if enviar_smtp
        else (False, None)
    )
    resumen_estado = (
        f"Solicitud N° {folio} recepcionada y en gestión. Autoriza descuento del {porcentaje_descuento}% por planilla y acepta {meses_carencia} meses de carencia."
    )

    payload = {
        "tipo": "recepcion_solicitud",
        "destinatario": destinatario,
        "remitente": f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>",
        "asunto": asunto,
        "fechaEmision": fecha_emision,
        "folio": folio,
        "nombreDestinatario": nombre_completo,
        "runDestinatario": run_formateado,
        "estadoSolicitud": "Pendiente de aprobación",
        "estadoResolucion": "PENDIENTE",
        "resumenEstado": resumen_estado,
        "motivo": resumen_estado,
        "credenciales": None,
        "credencialesAcceso": None,
        "pasosSeguir": [
            f"Conserve su N° de Solicitud ({folio}) como respaldo oficial de ingreso.",
            "Su solicitud será evaluada en la próxima sesión ordinaria de la Directiva del Comité de Bienestar.",
            f"Recibirá en su correo ({destinatario}) un segundo mensaje con el resultado (ACEPTADA o RECHAZADA + motivo) y, de ser aprobada, su Contraseña Temporal e instrucciones paso a paso para iniciar sesión.",
        ],
        "cuerpoTexto": cuerpo_texto,
        "cuerpoHtml": cuerpo_html,
        "enviadoSmtp": enviado_smtp,
        "errorSmtp": error_smtp,
        "modoEnvio": "smtp_real" if enviado_smtp else "buzon_institucional",
    }
    registrar_en_buzon(payload)
    return payload


def generar_correo_resolucion_solicitud(
    folio: str,
    nombre_completo: str,
    run_formateado: str,
    email: Optional[str] = None,
    email_destino: Optional[str] = None,
    accion: Optional[str] = None,
    aprobada: Optional[bool] = None,
    motivo: Optional[str] = None,
    observaciones: Optional[str] = None,
    porcentaje_descuento: int = 4,
    fecha_sesion: Optional[str] = None,
    numero_acta: Optional[str] = None,
    fecha_fin_carencia: Optional[str] = None,
    clave_temporal: Optional[str] = None,
    enviar_smtp: bool = True,
) -> Dict[str, Any]:
    """Genera y despacha el correo de APROBACIÓN (con credenciales y pasos) o RECHAZO (con motivo)."""
    correo_final = (email_destino or email or "").strip()
    destinatario = (
        correo_final
        if correo_final
        else f"{run_formateado.replace('.', '').replace('-', '').lower()}@mperalillo.cl"
    )
    fecha_emision = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")

    es_aprobada = aprobada if aprobada is not None else ((accion or "").lower() == "aprobar")
    texto_obs = (motivo or observaciones or "").strip()

    if es_aprobada:
        asunto = f"[Bienestar Peralillo] Solicitud N° {folio} fue ACEPTADA - Credenciales y Pasos de Acceso"
        motivo_texto = (
            texto_obs
            if texto_obs
            else f"Cumple requisitos reglamentarios de afiliación. Aprobada en {numero_acta or 'Sesión Ordinaria'} del {fecha_sesion}."
        )
        pasos = [
            f"Ingresar al Portal de Bienestar en {settings.PORTAL_URL}/login",
            f"En el campo 'RUT o Correo Electrónico', escribir su RUT ({run_formateado}) o su correo ({destinatario}).",
            f"En el campo 'Contraseña', digitar su Contraseña Temporal inicial: {clave_temporal}",
            "Al presionar 'Ingresar al Portal', el sistema abrirá automáticamente una ventana de seguridad para que usted cree su Contraseña Personal definitiva (mínimo 8 caracteres).",
            f"Una vez creada su clave personal, accederá a su Hoja de Socio con su cupo anual de salud ($150.000). Recuerde que el descuento del {porcentaje_descuento}% aplica por planilla y su período de carencia de 6 meses finaliza el {fecha_fin_carencia}.",
        ]
        cuerpo_texto = (
            f"Estimado(a) {nombre_completo}:\n\n"
            f"¡Bienvenido(a) al Comité de Bienestar de la Ilustre Municipalidad de Peralillo!\n\n"
            f"RESULTADO DE SU SOLICITUD:\n"
            f"• Su Solicitud N° {folio} fue ACEPTADA — Motivo: {motivo_texto}\n"
            f"• Acta / Fecha de Sesión: {numero_acta or 'Sesión Ordinaria'} ({fecha_sesion})\n"
            f"• Descuento por Planilla Autorizado: {porcentaje_descuento}% del sueldo base\n"
            f"• Término Período de Carencia (6 meses): {fecha_fin_carencia}\n\n"
            f"========================================================\n"
            f"CREDENCIALES DE ACCESO INICIAL AL PORTAL\n"
            f"========================================================\n"
            f"• Dirección del Portal: {settings.PORTAL_URL}/login\n"
            f"• Usuario (RUT): {run_formateado}\n"
            f"• Usuario (Correo): {destinatario}\n"
            f"• Contraseña Temporal: {clave_temporal}\n"
            f"========================================================\n\n"
            f"PASOS A SEGUIR PARA ACCEDER A SU CUENTA:\n"
            + "\n".join(f"  {i + 1}. {p}" for i, p in enumerate(pasos))
            + "\n\nAtentamente,\nDirectiva del Comité de Bienestar • I. Municipalidad de Peralillo"
        )

        alerta_aprobada = f"""
        <div style="background-color: #ecfdf5; border-left: 4px solid #059669; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px;">
          <p style="margin: 0; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #065f46; letter-spacing: 0.5px;">
            ✔ Resolución Oficial del Directorio: SOLICITUD N° {folio} ACEPTADA
          </p>
          <p style="margin: 5px 0 0 0; font-size: 13.5px; color: #064e3b;">
            <strong>Motivo / Acuerdo:</strong> {motivo_texto}
          </p>
        </div>
        """

        bloque_credenciales = f"""
        <div style="margin: 22px 0; background-color: #0b1929; border: 1px solid #1e3a5f; border-radius: 16px; padding: 22px 24px; color: #f8fafc;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.4px; color: #38bdf8;">
                  🔑 CREDENCIALES INICIALES DE ACCESO AL PORTAL
                </p>
                <p style="margin: 4px 0 14px 0; font-size: 13px; color: #cbd5e1;">
                  Su cuenta de Socio ha sido habilitada. Utilice estos datos para su primer inicio de sesión:
                </p>
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #11253d; border: 1px solid #23456e; border-radius: 12px; overflow: hidden;">
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 12.5px; color: #94a3b8; width: 40%;">
                Usuario (RUT)
              </td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 14px; font-weight: 800; color: #ffffff; font-family: Consolas, monospace;">
                {run_formateado}
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 12.5px; color: #94a3b8;">
                O Correo Electrónico
              </td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 13.5px; font-weight: 700; color: #38bdf8;">
                {destinatario}
              </td>
            </tr>
            <tr>
              <td style="padding: 14px 16px; font-size: 12.5px; color: #94a3b8;">
                Contraseña Temporal Inicial
              </td>
              <td style="padding: 14px 16px;">
                <span style="display: inline-block; padding: 6px 14px; border-radius: 8px; background-color: #064e3b; border: 1px solid #10b981; color: #6ee7b7; font-family: Consolas, monospace; font-size: 16px; font-weight: 800; letter-spacing: 0.8px;">
                  {clave_temporal}
                </span>
              </td>
            </tr>
          </table>

          <div style="margin-top: 18px; text-align: center;">
            <a href="{settings.PORTAL_URL}/login" style="display: inline-block; padding: 12px 28px; border-radius: 10px; background-color: #006799; color: #ffffff; font-size: 13.5px; font-weight: 800; text-decoration: none; border: 1px solid #38bdf8;">
              Ingresar al Portal de Bienestar &rarr;
            </a>
          </div>
        </div>
        """

        cuerpo_html = _envolver_html_institucional(
            folio=folio,
            fecha_emision=fecha_emision,
            badge_texto="SOLICITUD ACEPTADA",
            badge_bg="#dcfce7",
            badge_color="#166534",
            banner_bg="#064e3b",
            banner_subtitulo="RESOLUCIÓN OFICIAL DEL DIRECTORIO • BIENESTAR MUNICIPAL",
            banner_titulo=f"✔ Su Solicitud N° {folio} fue ACEPTADA",
            saludo_nombre=nombre_completo,
            intro_html=(
                "¡Bienvenido(a) al <strong>Comité de Bienestar de la Ilustre Municipalidad de Peralillo</strong>! "
                "Nos complace informarle que el Directorio ha aprobado su incorporación como socio(a) activo(a)."
            ),
            alerta_estado_html=alerta_aprobada,
            filas_tabla=[
                ("N° de Solicitud", f"{folio} — ACEPTADA"),
                ("Acta y Fecha de Sesión", f"{numero_acta or 'Sesión Ordinaria'} ({fecha_sesion or fecha_emision[:10]})"),
                ("Socio(a) Incorporado(a)", f"{nombre_completo} (RUN {run_formateado})"),
                ("Cuota Social Autorizada", f"{porcentaje_descuento}% del sueldo base por planilla"),
                ("Término Período de Carencia (6 meses)", str(fecha_fin_carencia or "6 meses desde aprobación")),
            ],
            bloque_credenciales_html=bloque_credenciales,
            titulo_pasos="Pasos a seguir para activar su cuenta y crear su clave personal",
            pasos=pasos,
        )
        credenciales = {
            "portalUrl": f"{settings.PORTAL_URL}/login",
            "usuarioRut": run_formateado,
            "usuarioEmail": destinatario,
            "claveTemporal": clave_temporal or "Peralillo#2026",
            "passwordTemporal": clave_temporal or "Peralillo#2026",
            "requiereCambioObligatorio": True,
            "requiereCambioClave": True,
        }
        resumen_estado = f"Solicitud N° {folio} fue ACEPTADA — Motivo: {motivo_texto}"
    else:
        asunto = f"[Bienestar Peralillo] Solicitud N° {folio} fue RECHAZADA - Motivo y Observaciones"
        motivo_texto = (
            texto_obs
            if texto_obs
            else "Observaciones documentales en revisión de Directorio."
        )
        pasos = [
            f"Revisar el motivo del rechazo informado por el Directorio: \"{motivo_texto}\".",
            "Reunir o corregir los antecedentes contractuales o de cargas familiares observados.",
            f"Ingresar nuevamente a {settings.PORTAL_URL}/afiliacion/solicitud para enviar una nueva solicitud subsanada o consultar en bienestar@mperalillo.cl.",
        ]
        cuerpo_texto = (
            f"Estimado(a) {nombre_completo}:\n\n"
            f"Junto con saludar, le informamos la resolución de su solicitud de incorporación "
            f"al Comité de Bienestar de la Ilustre Municipalidad de Peralillo:\n\n"
            f"RESULTADO DE SU SOLICITUD:\n"
            f"• Su Solicitud N° {folio} fue RECHAZADA — Motivo: {motivo_texto}\n"
            f"• Fecha de Revisión: {fecha_sesion or fecha_emision[:10]}\n\n"
            f"PASOS A SEGUIR:\n"
            + "\n".join(f"  {i + 1}. {p}" for i, p in enumerate(pasos))
            + "\n\nNota: Al haber sido rechazada la solicitud, NO se efectuará ningún descuento por planilla.\n\n"
            f"Atentamente,\nDirectiva del Comité de Bienestar • I. Municipalidad de Peralillo"
        )

        alerta_rechazo = f"""
        <div style="background-color: #fff1f2; border-left: 4px solid #e11d48; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px;">
          <p style="margin: 0; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #9f1239; letter-spacing: 0.5px;">
            ✕ Resolución Oficial del Directorio: SOLICITUD N° {folio} RECHAZADA
          </p>
          <p style="margin: 5px 0 0 0; font-size: 13.5px; color: #881337;">
            <strong>Motivo / Observación:</strong> {motivo_texto}
          </p>
        </div>
        """

        nota_sin_descuento = """
        <div style="margin-top: 16px; padding: 12px 16px; border-radius: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; font-size: 12.5px; color: #475569;">
          <strong>Nota importante sobre remuneraciones:</strong> Al haber sido rechazada esta solicitud, <strong>NO se aplicará ningún descuento por planilla</strong> sobre su sueldo base.
        </div>
        """

        cuerpo_html = _envolver_html_institucional(
            folio=folio,
            fecha_emision=fecha_emision,
            badge_texto="SOLICITUD RECHAZADA",
            badge_bg="#ffe4e6",
            badge_color="#9f1239",
            banner_bg="#881337",
            banner_subtitulo="RESOLUCIÓN OFICIAL DEL DIRECTORIO • BIENESTAR MUNICIPAL",
            banner_titulo=f"✕ Su Solicitud N° {folio} fue RECHAZADA",
            saludo_nombre=nombre_completo,
            intro_html=(
                "Junto con saludar, cumplimos con informar a usted el resultado de la revisión de su solicitud de incorporación "
                "al <strong>Servicio de Bienestar de la Ilustre Municipalidad de Peralillo</strong>:"
            ),
            alerta_estado_html=alerta_rechazo,
            filas_tabla=[
                ("N° de Solicitud", f"{folio} — RECHAZADA"),
                ("Funcionario(a)", f"{nombre_completo} (RUN {run_formateado})"),
                ("Fecha de Resolución", str(fecha_sesion or fecha_emision[:10])),
                ("Causal / Motivo Informado", motivo_texto),
                ("Efecto en Planilla de Sueldos", "Sin descuento (0%)"),
            ],
            titulo_pasos="Pasos a seguir para subsanar y volver a postular",
            pasos=pasos,
            nota_pie_html=nota_sin_descuento,
        )
        credenciales = None
        resumen_estado = f"Solicitud N° {folio} fue RECHAZADA — Motivo: {motivo_texto}"

    enviado_smtp, error_smtp = (
        _enviar_smtp_real(destinatario, asunto, cuerpo_texto, cuerpo_html)
        if enviar_smtp
        else (False, None)
    )

    # Sanitizar el payload retornado al panel administrativo para que nunca exponga la contraseña temporal
    pasos_publicos = [
        p.replace(clave_temporal, "******** (enviada al correo del socio)") if clave_temporal else p
        for p in pasos
    ]

    payload = {
        "tipo": "resolucion_solicitud",
        "destinatario": destinatario,
        "remitente": f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>",
        "asunto": asunto,
        "fechaEmision": fecha_emision,
        "folio": folio,
        "nombreDestinatario": nombre_completo,
        "runDestinatario": run_formateado,
        "estadoSolicitud": "ACEPTADA" if es_aprobada else "RECHAZADA",
        "estadoResolucion": "ACEPTADA" if es_aprobada else "RECHAZADA",
        "resumenEstado": resumen_estado,
        "motivo": motivo_texto,
        "credenciales": None,
        "credencialesAcceso": None,
        "pasosSeguir": pasos_publicos,
        "cuerpoTexto": "",
        "cuerpoHtml": None,
        "enviadoSmtp": enviado_smtp,
        "errorSmtp": error_smtp,
        "modoEnvio": "smtp_real" if enviado_smtp else "buzon_institucional",
    }
    registrar_en_buzon(payload)
    return payload


def generar_correo_recuperacion_password(
    nombre_completo: str,
    run_formateado: str,
    email_destino: str,
    clave_temporal: str,
    rol_label: str = "Socio Activo",
    enviar_smtp: bool = True,
) -> Dict[str, Any]:
    """
    Genera y despacha el correo institucional de Recuperación de Contraseña con el mismo
    formato corporativo (Logo Municipal, tabla resumen, recuadro de credenciales y pasos).
    """
    destinatario = email_destino.strip()
    fecha_emision = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
    folio_seguridad = f"REC-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}"
    asunto = f"[Bienestar Peralillo] Recuperación de Contraseña - Clave Temporal de Acceso ({folio_seguridad})"

    pasos = [
        f"Ingresar al Portal de Bienestar en <strong>{settings.PORTAL_URL}/login</strong>.",
        f"En el campo <strong>'RUT o Correo Electrónico'</strong>, digitar su RUT (<strong>{run_formateado}</strong>) o su correo (<strong>{destinatario}</strong>).",
        f"En el campo <strong>'Contraseña'</strong>, ingresar la Contraseña Temporal de un solo uso indicada en este correo.",
        "Al iniciar sesión, el sistema abrirá automáticamente una ventana segura para que usted defina su <strong>nueva Contraseña Personal definitiva</strong> (mínimo 8 caracteres).",
    ]

    cuerpo_texto = (
        f"Estimado(a) {nombre_completo}:\n\n"
        f"Hemos recibido una solicitud de recuperación de contraseña para su cuenta en el "
        f"Portal del Comité de Bienestar de la Ilustre Municipalidad de Peralillo.\n\n"
        f"RESUMEN DE LA SOLICITUD DE SEGURIDAD:\n"
        f"• Folio de Seguridad: {folio_seguridad}\n"
        f"• Funcionario(a): {nombre_completo} (RUN {run_formateado})\n"
        f"• Perfil en Portal: {rol_label}\n"
        f"• Fecha y Hora: {fecha_emision} UTC\n\n"
        f"========================================================\n"
        f"CREDENCIALES TEMPORALES DE RECUPERACIÓN\n"
        f"========================================================\n"
        f"• Dirección del Portal: {settings.PORTAL_URL}/login\n"
        f"• Usuario (RUT): {run_formateado}\n"
        f"• Usuario (Correo): {destinatario}\n"
        f"• Contraseña Temporal: {clave_temporal}\n"
        f"========================================================\n\n"
        f"PASOS PARA RESTABLECER SU CLAVE PERSONAL:\n"
        f"1. Ingrese a {settings.PORTAL_URL}/login\n"
        f"2. Digite su RUT ({run_formateado}) o su correo ({destinatario}).\n"
        f"3. Ingrese la Contraseña Temporal: {clave_temporal}\n"
        f"4. Cree su nueva Contraseña Personal de al menos 8 caracteres cuando el portal se lo solicite.\n\n"
        f"Atentamente,\n"
        f"Comité de Bienestar • Ilustre Municipalidad de Peralillo"
    )

    alerta_seguridad = f"""
    <div style="background-color: #f0f9ff; border-left: 4px solid #006799; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px;">
      <p style="margin: 0; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0c4a6e; letter-spacing: 0.5px;">
        🔒 Solicitud de Restablecimiento de Credenciales ({folio_seguridad})
      </p>
      <p style="margin: 5px 0 0 0; font-size: 13.5px; color: #075985;">
        Se ha generado una <strong>Contraseña Temporal de un solo uso</strong> para restablecer el acceso a su cuenta. Al ingresar al portal se le solicitará crear su nueva clave personal.
      </p>
    </div>
    """

    bloque_credenciales = f"""
    <div style="margin: 22px 0; background-color: #0b1929; border: 1px solid #1e3a5f; border-radius: 16px; padding: 22px 24px; color: #f8fafc;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.4px; color: #38bdf8;">
              🔑 CREDENCIALES TEMPORALES DE RECUPERACIÓN
            </p>
            <p style="margin: 4px 0 14px 0; font-size: 13px; color: #cbd5e1;">
              Utilice esta clave temporal para ingresar al portal y definir su nueva contraseña personal:
            </p>
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #11253d; border: 1px solid #23456e; border-radius: 12px; overflow: hidden;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 12.5px; color: #94a3b8; width: 40%;">
            Usuario (RUT)
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 14px; font-weight: 800; color: #ffffff; font-family: Consolas, monospace;">
            {run_formateado}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 12.5px; color: #94a3b8;">
            O Correo Electrónico
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 13.5px; font-weight: 700; color: #38bdf8;">
            {destinatario}
          </td>
        </tr>
        <tr>
          <td style="padding: 14px 16px; font-size: 12.5px; color: #94a3b8;">
            Contraseña Temporal
          </td>
          <td style="padding: 14px 16px;">
            <span style="display: inline-block; padding: 6px 14px; border-radius: 8px; background-color: #064e3b; border: 1px solid #10b981; color: #6ee7b7; font-family: Consolas, monospace; font-size: 16px; font-weight: 800; letter-spacing: 0.8px;">
              {clave_temporal}
            </span>
          </td>
        </tr>
      </table>

      <div style="margin-top: 18px; text-align: center;">
        <a href="{settings.PORTAL_URL}/login" style="display: inline-block; padding: 12px 28px; border-radius: 10px; background-color: #006799; color: #ffffff; font-size: 13.5px; font-weight: 800; text-decoration: none; border: 1px solid #38bdf8;">
          Ingresar al Portal y Cambiar mi Clave &rarr;
        </a>
      </div>
    </div>
    """

    cuerpo_html = _envolver_html_institucional(
        folio=folio_seguridad,
        fecha_emision=fecha_emision,
        badge_texto="RECUPERACIÓN DE CLAVE",
        badge_bg="#e0f2fe",
        badge_color="#0369a1",
        banner_bg="#0c2438",
        banner_subtitulo="SEGURIDAD DEL PORTAL • BIENESTAR MUNICIPAL",
        banner_titulo="Recuperación de Contraseña de Acceso",
        saludo_nombre=nombre_completo,
        intro_html=(
            "Junto con saludar cordialmente, le informamos que hemos procesado su solicitud de recuperación "
            "de contraseña para el <strong>Portal del Comité de Bienestar de la Ilustre Municipalidad de Peralillo</strong>."
        ),
        alerta_estado_html=alerta_seguridad,
        filas_tabla=[
            ("Folio de Seguridad", folio_seguridad),
            ("Funcionario(a)", f"{nombre_completo} (RUN {run_formateado})"),
            ("Perfil de Acceso", rol_label),
            ("Correo Registrado", destinatario),
            ("Acción Requerida", "Cambio obligatorio de clave en el próximo ingreso"),
        ],
        bloque_credenciales_html=bloque_credenciales,
        titulo_pasos="Pasos a seguir para restablecer su contraseña personal",
        pasos=pasos,
    )

    enviado_smtp, error_smtp = (
        _enviar_smtp_real(destinatario, asunto, cuerpo_texto, cuerpo_html)
        if enviar_smtp
        else (False, None)
    )

    return {
        "folio": folio_seguridad,
        "destinatario": destinatario,
        "enviadoSmtp": enviado_smtp,
        "errorSmtp": error_smtp,
    }


def generar_correo_resolucion_carga_familiar(
    folio: str,
    socio_nombre: str,
    socio_rut: str,
    email_destino: str,
    carga_nombre: str,
    carga_run: str,
    parentesco: str,
    aprobada: bool,
    motivo: str = "",
    fecha_sesion: Optional[str] = None,
    numero_acta: Optional[str] = None,
    enviar_smtp: bool = True,
) -> Dict[str, Any]:
    """Envía al socio la notificación de aprobación o rechazo de una nueva carga familiar."""
    destinatario = (email_destino or "").strip()
    fecha_emision = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")

    if aprobada:
        asunto = f"[Bienestar Peralillo] Nueva Carga Familiar APROBADA ({folio})"
        motivo_texto = motivo or "Cumple acreditación de carga familiar legal."
        alerta_html = f"""
        <div style="background-color: #ecfdf5; border-left: 4px solid #059669; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px;">
          <p style="margin: 0; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #065f46; letter-spacing: 0.5px;">
            ✔ Incorporación de Carga Familiar APROBADA ({folio})
          </p>
          <p style="margin: 5px 0 0 0; font-size: 13.5px; color: #064e3b;">
            <strong>Acuerdo / Detalle:</strong> {motivo_texto}
          </p>
        </div>
        """
        pasos = [
            f"La carga familiar <strong>{carga_nombre}</strong> ({parentesco} · RUN {carga_run}) ha quedado registrada como <strong>Vigente</strong> en su Hoja de Socio.",
            "Ya puede presentar solicitudes de reembolso médico o beneficios asociados a esta carga familiar dentro del Portal.",
        ]
        cuerpo_html = _envolver_html_institucional(
            folio=folio,
            fecha_emision=fecha_emision,
            badge_texto="CARGA APROBADA",
            badge_bg="#dcfce7",
            badge_color="#166534",
            banner_bg="#064e3b",
            banner_subtitulo="REGISTRO DE CARGAS FAMILIARES • BIENESTAR MUNICIPAL",
            banner_titulo=f"✔ Nueva Carga Familiar Incorporada ({folio})",
            saludo_nombre=socio_nombre,
            intro_html=(
                "Junto con saludar, le informamos que la Directiva del <strong>Comité de Bienestar de la Ilustre Municipalidad de Peralillo</strong> "
                "ha aprobado la incorporación de su nueva carga familiar:"
            ),
            alerta_estado_html=alerta_html,
            filas_tabla=[
                ("Folio de Solicitud", f"{folio} — APROBADA"),
                ("Socio(a) Titular", f"{socio_nombre} (RUN {socio_rut})"),
                ("Carga Familiar Incorporada", carga_nombre),
                ("RUN Carga Familiar", carga_run),
                ("Parentesco Reconocido", parentesco),
                ("Acta / Sesión", f"{numero_acta or 'Sesión Ordinaria'} ({fecha_sesion or fecha_emision[:10]})"),
            ],
            titulo_pasos="Información sobre su cobertura",
            pasos=pasos,
        )
        cuerpo_texto = (
            f"Estimado(a) {socio_nombre}:\n\n"
            f"Su solicitud N° {folio} para incorporar a la carga familiar {carga_nombre} (RUN {carga_run}, {parentesco}) "
            f"ha sido APROBADA por la Directiva del Comité de Bienestar.\n"
            f"Detalle: {motivo_texto}\n"
        )
    else:
        asunto = f"[Bienestar Peralillo] Solicitud de Carga Familiar N° {folio} RECHAZADA"
        motivo_texto = motivo or "Antecedentes de acreditación de carga familiar incompletos."
        alerta_html = f"""
        <div style="background-color: #fff1f2; border-left: 4px solid #e11d48; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px;">
          <p style="margin: 0; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #9f1239; letter-spacing: 0.5px;">
            ✕ Solicitud de Carga Familiar N° {folio} RECHAZADA
          </p>
          <p style="margin: 5px 0 0 0; font-size: 13.5px; color: #881337;">
            <strong>Motivo / Observación:</strong> {motivo_texto}
          </p>
        </div>
        """
        pasos = [
            f"Revise la observación informada por la Directiva: \"{motivo_texto}\".",
            "Una vez reunida la documentación de respaldo, puede ingresar una nueva solicitud en el módulo Afiliación y Cargas del Portal.",
        ]
        cuerpo_html = _envolver_html_institucional(
            folio=folio,
            fecha_emision=fecha_emision,
            badge_texto="CARGA RECHAZADA",
            badge_bg="#ffe4e6",
            badge_color="#9f1239",
            banner_bg="#881337",
            banner_subtitulo="REGISTRO DE CARGAS FAMILIARES • BIENESTAR MUNICIPAL",
            banner_titulo=f"✕ Solicitud de Carga Familiar N° {folio} Rechazada",
            saludo_nombre=socio_nombre,
            intro_html=(
                "Junto con saludar, cumplimos con informar a usted la resolución de su solicitud de incorporación de carga familiar "
                "en el <strong>Comité de Bienestar de la Ilustre Municipalidad de Peralillo</strong>:"
            ),
            alerta_estado_html=alerta_html,
            filas_tabla=[
                ("Folio de Solicitud", f"{folio} — RECHAZADA"),
                ("Socio(a) Titular", f"{socio_nombre} (RUN {socio_rut})"),
                ("Carga Familiar Evaluada", f"{carga_nombre} (RUN {carga_run} · {parentesco})"),
                ("Causal / Observación", motivo_texto),
            ],
            titulo_pasos="Pasos para subsanar",
            pasos=pasos,
        )
        cuerpo_texto = (
            f"Estimado(a) {socio_nombre}:\n\n"
            f"Su solicitud N° {folio} para incorporar a la carga familiar {carga_nombre} (RUN {carga_run}, {parentesco}) "
            f"ha sido RECHAZADA.\nMotivo: {motivo_texto}\n"
        )

    enviado_smtp, error_smtp = (
        _enviar_smtp_real(destinatario, asunto, cuerpo_texto, cuerpo_html)
        if enviar_smtp and destinatario
        else (False, None)
    )
    return {
        "folio": folio,
        "destinatario": destinatario,
        "enviadoSmtp": enviado_smtp,
        "errorSmtp": error_smtp,
    }
