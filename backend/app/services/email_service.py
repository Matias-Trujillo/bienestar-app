"""Servicio de notificaciones por correo electrónico para el Comité de Bienestar."""
import logging
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import Any, Dict, Optional

from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

# Cache en memoria sincronizada con ParametroSistema (Administración -> Parámetros Base)
_SMTP_RUNTIME: Dict[str, Any] = {
    "host": settings.SMTP_HOST or "smtp.gmail.com",
    "port": int(settings.SMTP_PORT or 587),
    "user": settings.SMTP_USER or "",
    "password": settings.SMTP_PASSWORD or "",
    "from_email": settings.SMTP_FROM_EMAIL or "bienestar@mperalillo.cl",
    "from_name": settings.SMTP_FROM_NAME or "Comité de Bienestar - I. Municipalidad de Peralillo",
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

    asunto = "[Bienestar Peralillo] Prueba Exitosa de Envío de Correo Real (SMTP)"
    cuerpo_txt = (
        "¡Configuración exitosa!\n\n"
        "El servidor de correo del Comité de Bienestar de la Ilustre Municipalidad de Peralillo "
        "quedó conectado correctamente y ya puede despachar correos reales de recepción, "
        "aprobación (con clave temporal) y rechazo a las bandejas de entrada de los funcionarios."
    )
    cuerpo_html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: #064e3b; color: white; padding: 18px 24px;">
        <h2 style="margin: 0; font-size: 17px;">✔ Conexión de Correo Saliente Verificada</h2>
      </div>
      <div style="padding: 22px 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
        <p>¡Excelente! El Portal de Bienestar de la <strong>Ilustre Municipalidad de Peralillo</strong> ya está conectado a través de <code>{estado['host']}:{estado['port']}</code> usando la cuenta remitente <strong>{estado['user']}</strong>.</p>
        <p>A partir de este momento, todos los correos de <strong>Confirmación de Solicitud</strong>, <strong>Aprobación con Clave Temporal</strong> y <strong>Rechazo con Motivo</strong> llegarán directamente a la bandeja de entrada de cada funcionario.</p>
      </div>
    </div>
    """
    ok, err = _enviar_smtp_real(destinatario, asunto, cuerpo_txt, cuerpo_html)
    if ok:
        return True, f"¡Correo real enviado con éxito a {destinatario}! Revise su bandeja de entrada (y carpeta de Correo no deseado / Spam)."
    err_str = err or "Error desconocido"
    if "535" in err_str or "Authentication" in err_str or "Username and Password not accepted" in err_str:
        return (
            False,
            f"El servidor {estado['host']} rechazó la contraseña de {estado['user']}. "
            "Recuerde que Gmail y Outlook exigen usar una 'Contraseña de Aplicación de 16 letras' (App Password) en lugar de su clave normal.",
        )
    return False, f"No se pudo autenticar en {estado['host']}:{estado['port']}: {err_str}"


def _enviar_smtp_real(
    destinatario: str, asunto: str, cuerpo_texto: str, cuerpo_html: str
) -> tuple[bool, Optional[str]]:
    """Envía el correo por SMTP real si las credenciales SMTP están configuradas."""
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

    try:
        msg = EmailMessage()
        msg["Subject"] = asunto
        msg["From"] = f"{estado['from_name']} <{remitente_email}>"
        msg["To"] = destinatario
        msg.set_content(cuerpo_texto)
        msg.add_alternative(cuerpo_html, subtype="html")

        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=10) as server:
                server.login(user, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(user, password)
                server.send_message(msg)

        logger.info("Correo SMTP real enviado exitosamente a %s (%s)", destinatario, asunto)
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
    asunto = f"[Bienestar Peralillo] Solicitud de Incorporación N° {folio} Recepcionada y en Gestión"
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

    cuerpo_html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="height: 6px; background: linear-gradient(90deg, #006799, #78a200, #cfa145, #d94e28);"></div>
      <div style="background: #091e2e; color: #ffffff; padding: 20px 24px;">
        <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #f3e3be;">Ilustre Municipalidad de Peralillo • Comité de Bienestar</p>
        <h2 style="margin: 6px 0 0; font-size: 18px;">Confirmación de Solicitud de Incorporación N° {folio}</h2>
      </div>
      <div style="padding: 24px; background: #ffffff; font-size: 14px; line-height: 1.6;">
        <p>Estimado(a) <strong>{nombre_completo}</strong>:</p>
        <p>Su solicitud de incorporación al Servicio de Bienestar Municipal ha sido registrada correctamente y se encuentra <strong>en gestión para revisión del Directorio</strong>.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>N° de Solicitud:</strong> {folio}</p>
          <p style="margin: 4px 0;"><strong>Estado:</strong> Pendiente de aprobación</p>
          <p style="margin: 4px 0;"><strong>RUN / Calidad:</strong> {run_formateado} ({calidad_contractual} • Grado {grado})</p>
          <p style="margin: 4px 0;"><strong>Descuento Autorizado:</strong> {porcentaje_descuento}% del sueldo base por planilla</p>
          <p style="margin: 4px 0;"><strong>Período de Carencia:</strong> {meses_carencia} meses continuos</p>
        </div>
        <p style="margin-bottom: 6px;"><strong>Próximos pasos:</strong></p>
        <ol style="margin-top: 4px; padding-left: 20px;">
          <li>El Directorio revisará sus antecedentes en sesión ordinaria.</li>
          <li>Recibirá un segundo correo informando la <strong>aprobación o rechazo</strong> de su solicitud N° <strong>{folio}</strong>.</li>
          <li>Al aprobarse, ese correo contendrá su <strong>Contraseña Temporal</strong> y las instrucciones paso a paso para activar su cuenta.</li>
        </ol>
      </div>
    </div>
    """

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
        asunto = f"[Bienestar Peralillo] Solicitud N° {folio} fue ACEPTADA — Credenciales y Pasos de Acceso"
        motivo_texto = (
            texto_obs
            if texto_obs
            else f"Cumple requisitos reglamentarios de afiliación. Aprobada en {numero_acta or 'Sesión Ordinaria'} del {fecha_sesion}."
        )
        pasos = [
            f"Ingresar al Portal de Bienestar en {settings.PORTAL_URL}/login",
            f"En el campo 'RUT o Correo Electrónico', escribir su RUT ({run_formateado}) o su correo ({destinatario}).",
            f"En el campo 'Contraseña', digitar su Contraseña Temporal inicial: {clave_temporal}",
            "Al presionar 'Ingresar', el sistema abrirá automáticamente una ventana de seguridad para que usted cree su Contraseña Personal definitiva (mínimo 8 caracteres).",
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
        cuerpo_html = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="height: 6px; background: linear-gradient(90deg, #006799, #78a200, #cfa145, #d94e28);"></div>
          <div style="background: #064e3b; color: #ffffff; padding: 20px 24px;">
            <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #a7f3d0;">Comité de Bienestar • Ilustre Municipalidad de Peralillo</p>
            <h2 style="margin: 6px 0 0; font-size: 18px;">✔ Su Solicitud N° {folio} fue ACEPTADA</h2>
          </div>
          <div style="padding: 24px; background: #ffffff; font-size: 14px; line-height: 1.6;">
            <p>Estimado(a) <strong>{nombre_completo}</strong>:</p>
            <p>Nos complace informarle que su solicitud de incorporación ha sido <strong>ACEPTADA</strong>.</p>
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px 16px; margin: 14px 0;">
              <p style="margin: 4px 0;"><strong>Solicitud N°:</strong> {folio} — <strong>Estado:</strong> ACEPTADA</p>
              <p style="margin: 4px 0;"><strong>Motivo / Acuerdo:</strong> {motivo_texto}</p>
              <p style="margin: 4px 0;"><strong>Descuento Autorizado:</strong> {porcentaje_descuento}% del sueldo base</p>
              <p style="margin: 4px 0;"><strong>Fin Período de Carencia (6 meses):</strong> {fecha_fin_carencia}</p>
            </div>
            <div style="background: #0f172a; color: #f8fafc; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; color: #38bdf8; font-weight: bold;">🔑 Sus Credenciales Iniciales de Acceso</p>
              <p style="margin: 4px 0;"><strong>Portal Web:</strong> <a href="{settings.PORTAL_URL}/login" style="color: #38bdf8;">{settings.PORTAL_URL}/login</a></p>
              <p style="margin: 4px 0;"><strong>Usuario (RUT):</strong> {run_formateado}</p>
              <p style="margin: 4px 0;"><strong>O Correo:</strong> {destinatario}</p>
              <p style="margin: 8px 0 0; font-size: 16px;"><strong>Contraseña Temporal:</strong> <code style="background: #1e293b; padding: 4px 8px; border-radius: 6px; color: #4ade80;">{clave_temporal}</code></p>
            </div>
            <p style="margin-bottom: 6px;"><strong>Pasos a seguir para activar su cuenta:</strong></p>
            <ol style="margin-top: 4px; padding-left: 20px;">
              {"".join(f"<li style='margin-bottom: 6px;'>{p}</li>" for p in pasos)}
            </ol>
          </div>
        </div>
        """
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
        asunto = f"[Bienestar Peralillo] Solicitud N° {folio} fue RECHAZADA — Motivo y Observaciones"
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
        cuerpo_html = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="height: 6px; background: #e11d48;"></div>
          <div style="background: #881337; color: #ffffff; padding: 20px 24px;">
            <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #fecdd3;">Comité de Bienestar • Ilustre Municipalidad de Peralillo</p>
            <h2 style="margin: 6px 0 0; font-size: 18px;">✕ Su Solicitud N° {folio} fue RECHAZADA</h2>
          </div>
          <div style="padding: 24px; background: #ffffff; font-size: 14px; line-height: 1.6;">
            <p>Estimado(a) <strong>{nombre_completo}</strong>:</p>
            <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 14px 16px; margin: 14px 0;">
              <p style="margin: 4px 0;"><strong>Solicitud N°:</strong> {folio} — <strong>Estado:</strong> RECHAZADA</p>
              <p style="margin: 4px 0;"><strong>Motivo del Rechazo:</strong> {motivo_texto}</p>
            </div>
            <p style="margin-bottom: 6px;"><strong>Pasos a seguir:</strong></p>
            <ol style="margin-top: 4px; padding-left: 20px;">
              {"".join(f"<li style='margin-bottom: 6px;'>{p}</li>" for p in pasos)}
            </ol>
          </div>
        </div>
        """
        credenciales = None
        resumen_estado = f"Solicitud N° {folio} fue RECHAZADA — Motivo: {motivo_texto}"

    enviado_smtp, error_smtp = (
        _enviar_smtp_real(destinatario, asunto, cuerpo_texto, cuerpo_html)
        if enviar_smtp
        else (False, None)
    )

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
        "credenciales": credenciales,
        "credencialesAcceso": credenciales,
        "pasosSeguir": pasos,
        "cuerpoTexto": cuerpo_texto,
        "cuerpoHtml": cuerpo_html,
        "enviadoSmtp": enviado_smtp,
        "errorSmtp": error_smtp,
        "modoEnvio": "smtp_real" if enviado_smtp else "buzon_institucional",
    }
    registrar_en_buzon(payload)
    return payload
