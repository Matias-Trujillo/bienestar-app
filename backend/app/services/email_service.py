"""Fachada orquestadora de notificaciones por correo electrónico (DIP + SRP).

[ESTUDIANTE INFORMÁTICA] Refactorizado bajo Principios SOLID:
  - SRP: Delega almacenamiento a `email_buzon.py`, transporte a `email_transport.py` y renderizado a `email_templates.py`.
  - DIP: Acepta implementaciones abstractas (`SmtpTransportProtocol`, `EmailBuzonProtocol`) sin acoplarse a detalles concretos.
"""
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.core.config import settings
from app.core.interfaces import EmailBuzonProtocol, SmtpTransportProtocol
from app.services.email_buzon import (
    InMemoryBuzonStore,
    default_buzon_store,
    listar_buzon_memoria,
    registrar_en_buzon,
)
from app.services.email_templates import (
    _envolver_html_institucional,
    construir_plantilla_prueba_smtp,
    construir_plantilla_recepcion_reembolso,
    construir_plantilla_recepcion_solicitud,
    construir_plantilla_recuperacion_password,
    construir_plantilla_resolucion_carga,
    construir_plantilla_resolucion_reembolso,
    construir_plantilla_resolucion_solicitud,
)
from app.services.email_transport import (
    SmtpEmailTransport,
    _enviar_smtp_real,
    actualizar_config_smtp_runtime,
    default_smtp_transport,
    obtener_estado_smtp_runtime,
)


def _despachar_correo(
    destinatario: str,
    asunto: str,
    cuerpo_texto: str,
    cuerpo_html: str,
    enviar_smtp: bool,
    transport: Optional[SmtpTransportProtocol] = None,
) -> tuple[bool, Optional[str]]:
    if not (enviar_smtp and destinatario):
        return False, None
    medio = transport or default_smtp_transport
    return medio.enviar_html(destinatario, asunto, cuerpo_texto, cuerpo_html)


def enviar_correo_prueba_smtp(
    destinatario: str,
    transport: Optional[SmtpTransportProtocol] = None,
) -> tuple[bool, str]:
    """Envía un correo real de verificación para comprobar las credenciales SMTP configuradas."""
    medio = transport or default_smtp_transport
    estado = medio.obtener_estado()
    if not estado["user"]:
        return False, "Falta ingresar el correo remitente (SMTP_USER)."
    if not estado["tienePassword"]:
        return (
            False,
            f"Falta ingresar la Contraseña / Contraseña de Aplicación para la cuenta {estado['user']} (el campo contraseña está vacío).",
        )

    asunto, cuerpo_txt, cuerpo_html = construir_plantilla_prueba_smtp(destinatario, estado)
    ok, err = medio.enviar_html(destinatario, asunto, cuerpo_txt, cuerpo_html)
    if ok:
        return True, f"¡Correo real con logo institucional enviado con éxito a {destinatario}! Revise su bandeja de entrada."
    err_str = err or "Error desconocido"
    if "basic authentication is disabled" in err_str.lower() or any(
        estado["user"].lower().endswith(d) for d in ("@hotmail.com", "@outlook.com", "@live.com", "@msn.com")
    ):
        return (
            False,
            f"Microsoft bloqueó el envío SMTP para cuentas personales ({estado['user']}) a nivel mundial (Error 535 5.7.139: Basic authentication is disabled). "
            "Utilice una cuenta @gmail.com con Contraseña de Aplicación.",
        )
    if "535" in err_str or "Authentication" in err_str or "Username and Password not accepted" in err_str:
        return (
            False,
            f"El servidor {estado['host']} rechazó la contraseña de {estado['user']}. Detalle: {err_str}",
        )
    return False, f"No se pudo autenticar en {estado['host']}:{estado['port']}: {err_str}"


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
    transport: Optional[SmtpTransportProtocol] = None,
    buzon: Optional[EmailBuzonProtocol] = None,
) -> Dict[str, Any]:
    correo_final = (email_destino or email or "").strip()
    destinatario = (
        correo_final
        if correo_final
        else f"{run_formateado.replace('.', '').replace('-', '').lower()}@mperalillo.cl"
    )
    fecha_emision = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
    asunto, cuerpo_texto, cuerpo_html = construir_plantilla_recepcion_solicitud(
        folio=folio,
        nombre_completo=nombre_completo,
        run_formateado=run_formateado,
        destinatario=destinatario,
        grado=grado,
        calidad_contractual=calidad_contractual,
        porcentaje_descuento=porcentaje_descuento,
        meses_carencia=meses_carencia,
        cantidad_cargas=cantidad_cargas,
        fecha_emision=fecha_emision,
    )
    enviado_smtp, error_smtp = _despachar_correo(
        destinatario, asunto, cuerpo_texto, cuerpo_html, enviar_smtp, transport
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
    (buzon or default_buzon_store).registrar(payload)
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
    transport: Optional[SmtpTransportProtocol] = None,
    buzon: Optional[EmailBuzonProtocol] = None,
) -> Dict[str, Any]:
    correo_final = (email_destino or email or "").strip()
    destinatario = (
        correo_final
        if correo_final
        else f"{run_formateado.replace('.', '').replace('-', '').lower()}@mperalillo.cl"
    )
    fecha_emision = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
    es_aprobada = aprobada if aprobada is not None else ((accion or "").lower() == "aprobar")
    texto_obs = (motivo or observaciones or "").strip()
    motivo_texto = texto_obs or (
        f"Cumple requisitos reglamentarios de afiliación. Aprobada en {numero_acta or 'Sesión Ordinaria'} del {fecha_sesion}."
        if es_aprobada
        else "Observaciones documentales en revisión de Directorio."
    )

    asunto, cuerpo_texto, cuerpo_html, pasos, resumen_estado = construir_plantilla_resolucion_solicitud(
        folio=folio,
        nombre_completo=nombre_completo,
        run_formateado=run_formateado,
        destinatario=destinatario,
        es_aprobada=es_aprobada,
        motivo_texto=motivo_texto,
        porcentaje_descuento=porcentaje_descuento,
        fecha_sesion=fecha_sesion,
        numero_acta=numero_acta,
        fecha_fin_carencia=fecha_fin_carencia,
        clave_temporal=clave_temporal,
        fecha_emision=fecha_emision,
    )
    enviado_smtp, error_smtp = _despachar_correo(
        destinatario, asunto, cuerpo_texto, cuerpo_html, enviar_smtp, transport
    )
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
    (buzon or default_buzon_store).registrar(payload)
    return payload


def generar_correo_recuperacion_password(
    nombre_completo: str,
    run_formateado: str,
    email_destino: str,
    clave_temporal: str,
    rol_label: str = "Socio Activo",
    enviar_smtp: bool = True,
    transport: Optional[SmtpTransportProtocol] = None,
) -> Dict[str, Any]:
    destinatario = email_destino.strip()
    fecha_emision = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
    folio_seguridad = f"REC-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}"
    asunto, cuerpo_texto, cuerpo_html = construir_plantilla_recuperacion_password(
        folio_seguridad=folio_seguridad,
        fecha_emision=fecha_emision,
        nombre_completo=nombre_completo,
        run_formateado=run_formateado,
        destinatario=destinatario,
        clave_temporal=clave_temporal,
        rol_label=rol_label,
    )
    enviado_smtp, error_smtp = _despachar_correo(
        destinatario, asunto, cuerpo_texto, cuerpo_html, enviar_smtp, transport
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
    transport: Optional[SmtpTransportProtocol] = None,
    buzon: Optional[EmailBuzonProtocol] = None,
) -> Dict[str, Any]:
    destinatario = (email_destino or "").strip()
    fecha_emision = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
    motivo_texto = motivo or (
        "Cumple acreditación de carga familiar legal."
        if aprobada
        else "Antecedentes de acreditación de carga familiar incompletos."
    )
    asunto, cuerpo_texto, cuerpo_html = construir_plantilla_resolucion_carga(
        folio=folio,
        socio_nombre=socio_nombre,
        socio_rut=socio_rut,
        carga_nombre=carga_nombre,
        carga_run=carga_run,
        parentesco=parentesco,
        aprobada=aprobada,
        motivo_texto=motivo_texto,
        fecha_sesion=fecha_sesion,
        numero_acta=numero_acta,
        fecha_emision=fecha_emision,
    )
    enviado_smtp, error_smtp = _despachar_correo(
        destinatario, asunto, cuerpo_texto, cuerpo_html, enviar_smtp, transport
    )
    payload = {
        "tipo": "resolucion_carga_familiar",
        "destinatario": destinatario,
        "remitente": f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>",
        "asunto": asunto,
        "fechaEmision": fecha_emision,
        "folio": folio,
        "nombreDestinatario": socio_nombre,
        "runDestinatario": socio_rut,
        "estadoSolicitud": "APROBADA" if aprobada else "RECHAZADA",
        "estadoResolucion": "ACEPTADA" if aprobada else "RECHAZADA",
        "resumenEstado": f"Carga Familiar {carga_nombre} ({parentesco}) {'APROBADA' if aprobada else 'RECHAZADA'}",
        "motivo": motivo_texto,
        "cuerpoTexto": cuerpo_texto,
        "cuerpoHtml": cuerpo_html,
        "enviadoSmtp": enviado_smtp,
        "errorSmtp": error_smtp,
        "modoEnvio": "smtp_real" if enviado_smtp else "buzon_institucional",
    }
    (buzon or default_buzon_store).registrar(payload)
    return payload


def generar_correo_recepcion_reembolso(
    codigo: str,
    socio_nombre: str,
    socio_rut: str,
    email_destino: str,
    tipo_prestacion_label: str,
    beneficiario_nombre: str,
    beneficiario_parentesco: str,
    monto_boleta: float,
    monto_copago: float,
    saldo_restante: float,
    fecha_atencion: str = "",
    enviar_smtp: bool = True,
    transport: Optional[SmtpTransportProtocol] = None,
    buzon: Optional[EmailBuzonProtocol] = None,
) -> Dict[str, Any]:
    destinatario = (email_destino or "").strip()
    fecha_emision = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
    monto_bol_fmt = f"${monto_boleta:,.0f}".replace(",", ".")
    monto_cop_fmt = f"${monto_copago:,.0f}".replace(",", ".")
    saldo_rest_fmt = f"${saldo_restante:,.0f}".replace(",", ".")

    asunto, cuerpo_texto, cuerpo_html = construir_plantilla_recepcion_reembolso(
        codigo=codigo,
        socio_nombre=socio_nombre,
        socio_rut=socio_rut,
        tipo_prestacion_label=tipo_prestacion_label,
        beneficiario_nombre=beneficiario_nombre,
        beneficiario_parentesco=beneficiario_parentesco,
        monto_bol_fmt=monto_bol_fmt,
        monto_cop_fmt=monto_cop_fmt,
        saldo_rest_fmt=saldo_rest_fmt,
        fecha_atencion=fecha_atencion,
        fecha_emision=fecha_emision,
    )
    enviado_smtp, error_smtp = _despachar_correo(
        destinatario, asunto, cuerpo_texto, cuerpo_html, enviar_smtp, transport
    )
    payload = {
        "tipo": "recepcion_reembolso",
        "destinatario": destinatario,
        "remitente": f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>",
        "asunto": asunto,
        "fechaEmision": fecha_emision,
        "folio": codigo,
        "nombreDestinatario": socio_nombre,
        "runDestinatario": socio_rut,
        "estadoSolicitud": "Pendiente de Revisión",
        "estadoResolucion": "PENDIENTE",
        "resumenEstado": f"Reembolso {codigo} recepcionado por {monto_cop_fmt} para {beneficiario_nombre} ({tipo_prestacion_label}).",
        "motivo": f"Prestación: {tipo_prestacion_label} - Copago: {monto_cop_fmt}",
        "cuerpoTexto": cuerpo_texto,
        "cuerpoHtml": cuerpo_html,
        "enviadoSmtp": enviado_smtp,
        "errorSmtp": error_smtp,
        "modoEnvio": "smtp_real" if enviado_smtp else "buzon_institucional",
    }
    (buzon or default_buzon_store).registrar(payload)
    return payload


def generar_correo_resolucion_reembolso(
    codigo: str,
    socio_nombre: str,
    socio_rut: str,
    email_destino: str,
    aprobada: bool,
    tipo_prestacion_label: str,
    beneficiario_nombre: str,
    beneficiario_parentesco: str,
    monto_reembolso: float,
    saldo_disponible_actual: float,
    motivo_rechazo: str = "",
    enviar_smtp: bool = True,
    transport: Optional[SmtpTransportProtocol] = None,
    buzon: Optional[EmailBuzonProtocol] = None,
) -> Dict[str, Any]:
    destinatario = (email_destino or "").strip()
    fecha_emision = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
    monto_rem_fmt = f"${monto_reembolso:,.0f}".replace(",", ".")
    saldo_disp_fmt = f"${saldo_disponible_actual:,.0f}".replace(",", ".")

    asunto, cuerpo_texto, cuerpo_html, resumen_estado = construir_plantilla_resolucion_reembolso(
        codigo=codigo,
        socio_nombre=socio_nombre,
        socio_rut=socio_rut,
        aprobada=aprobada,
        tipo_prestacion_label=tipo_prestacion_label,
        beneficiario_nombre=beneficiario_nombre,
        beneficiario_parentesco=beneficiario_parentesco,
        monto_rem_fmt=monto_rem_fmt,
        saldo_disp_fmt=saldo_disp_fmt,
        motivo_rechazo=motivo_rechazo,
        fecha_emision=fecha_emision,
    )
    enviado_smtp, error_smtp = _despachar_correo(
        destinatario, asunto, cuerpo_texto, cuerpo_html, enviar_smtp, transport
    )
    payload = {
        "tipo": "resolucion_reembolso",
        "destinatario": destinatario,
        "remitente": f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>",
        "asunto": asunto,
        "fechaEmision": fecha_emision,
        "folio": codigo,
        "nombreDestinatario": socio_nombre,
        "runDestinatario": socio_rut,
        "estadoSolicitud": "APROBADO" if aprobada else "RECHAZADO",
        "estadoResolucion": "ACEPTADA" if aprobada else "RECHAZADA",
        "resumenEstado": resumen_estado,
        "motivo": motivo_rechazo if not aprobada else f"Aprobado por {monto_rem_fmt}",
        "cuerpoTexto": cuerpo_texto,
        "cuerpoHtml": cuerpo_html,
        "enviadoSmtp": enviado_smtp,
        "errorSmtp": error_smtp,
        "modoEnvio": "smtp_real" if enviado_smtp else "buzon_institucional",
    }
    (buzon or default_buzon_store).registrar(payload)
    return payload
