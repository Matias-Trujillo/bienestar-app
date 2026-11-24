"""Motor puro de renderizado de plantillas HTML y texto plano institucionales (SRP).

[ESTUDIANTE INFORMÁTICA] Este módulo tiene la única responsabilidad de construir el contenido
visual y textual de los correos del Comité de Bienestar, sin realizar I/O de red ni acceder al buzón.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings


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
    """Construye un correo HTML corporativo compatible con los clientes principales."""
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
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width: 640px; width: 100%; background-color: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);">
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
          <tr>
            <td style="padding: 28px;">
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a;">
                Estimado(a) <strong>{saludo_nombre}</strong>:
              </p>
              <div style="font-size: 14px; line-height: 1.65; color: #334155; margin-bottom: 18px;">
                {intro_html}
              </div>
              {alerta_estado_html}
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
          <tr>
            <td style="background-color: #0b1929; color: #94a3b8; padding: 22px 28px; border-top: 3px solid #cfa145;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top" style="font-size: 12px; line-height: 1.6; color: #cbd5e1;">
                    <strong style="color: #ffffff; font-size: 13px;">Comité de Bienestar &bull; Ilustre Municipalidad de Peralillo</strong><br />
                    Servicios y Beneficios del Personal Municipal.<br />
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


def construir_plantilla_prueba_smtp(destinatario: str, estado: Dict[str, Any]) -> Tuple[str, str, str]:
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
    return asunto, cuerpo_txt, cuerpo_html


def construir_bloque_credenciales_html(
    titulo_caja: str,
    subtitulo_caja: str,
    run_formateado: str,
    destinatario: str,
    clave_temporal: str,
    texto_boton: str,
    etiqueta_clave: str = "Contraseña Temporal Inicial",
) -> str:
    return f"""
    <div style="margin: 22px 0; background-color: #0b1929; border: 1px solid #1e3a5f; border-radius: 16px; padding: 22px 24px; color: #f8fafc;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.4px; color: #38bdf8;">
              🔑 {titulo_caja}
            </p>
            <p style="margin: 4px 0 14px 0; font-size: 13px; color: #cbd5e1;">
              {subtitulo_caja}
            </p>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #11253d; border: 1px solid #23456e; border-radius: 12px; overflow: hidden;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 12.5px; color: #94a3b8; width: 40%;">Usuario (RUT)</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 14px; font-weight: 800; color: #ffffff; font-family: Consolas, monospace;">{run_formateado}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 12.5px; color: #94a3b8;">O Correo Electrónico</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f; font-size: 13.5px; font-weight: 700; color: #38bdf8;">{destinatario}</td>
        </tr>
        <tr>
          <td style="padding: 14px 16px; font-size: 12.5px; color: #94a3b8;">{etiqueta_clave}</td>
          <td style="padding: 14px 16px;">
            <span style="display: inline-block; padding: 6px 14px; border-radius: 8px; background-color: #064e3b; border: 1px solid #10b981; color: #6ee7b7; font-family: Consolas, monospace; font-size: 16px; font-weight: 800; letter-spacing: 0.8px;">
              {clave_temporal}
            </span>
          </td>
        </tr>
      </table>
      <div style="margin-top: 18px; text-align: center;">
        <a href="{settings.PORTAL_URL}/login" style="display: inline-block; padding: 12px 28px; border-radius: 10px; background-color: #006799; color: #ffffff; font-size: 13.5px; font-weight: 800; text-decoration: none; border: 1px solid #38bdf8;">
          {texto_boton} &rarr;
        </a>
      </div>
    </div>
    """


def construir_alerta_estado_html(
    *,
    bg_color: str,
    border_color: str,
    title_color: str,
    body_color: str,
    titulo: str,
    cuerpo_html: str,
) -> str:
    """Genera un bloque de alerta uniforme evitando duplicar marcado HTML."""
    return f"""
    <div style="background-color: {bg_color}; border-left: 4px solid {border_color}; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px;">
      <p style="margin: 0; font-size: 12px; font-weight: 800; text-transform: uppercase; color: {title_color}; letter-spacing: 0.5px;">
        {titulo}
      </p>
      <p style="margin: 5px 0 0 0; font-size: 13.5px; color: {body_color};">
        {cuerpo_html}
      </p>
    </div>
    """


def construir_plantilla_recepcion_solicitud(
    *,
    folio: str,
    nombre_completo: str,
    run_formateado: str,
    destinatario: str,
    grado: str,
    calidad_contractual: str,
    porcentaje_descuento: int,
    meses_carencia: int,
    cantidad_cargas: int,
    fecha_emision: str,
) -> Tuple[str, str, str]:
    asunto = f"[Bienestar Peralillo] Solicitud de Incorporacion N° {folio} Recepcionada y en Gestion"
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
    alerta_recepcion = construir_alerta_estado_html(
        bg_color="#f0f9ff",
        border_color="#0284c7",
        title_color="#0369a1",
        body_color="#0c4a6e",
        titulo="Comprobante Oficial de Recepción",
        cuerpo_html=f"Su <strong>Solicitud N° {folio}</strong> ha ingresado formalmente a bandeja del Directorio y se encuentra <strong>En Gestión de Aprobación</strong>.",
    )
    pasos_recepcion = [
        "<strong>Revisión en Sesión de Directiva:</strong> Sus antecedentes y cargas familiares serán evaluados en la próxima sesión ordinaria del Comité de Bienestar.",
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
    return asunto, cuerpo_texto, cuerpo_html


def construir_plantilla_resolucion_solicitud(
    *,
    folio: str,
    nombre_completo: str,
    run_formateado: str,
    destinatario: str,
    es_aprobada: bool,
    motivo_texto: str,
    porcentaje_descuento: int,
    fecha_sesion: Optional[str],
    numero_acta: Optional[str],
    fecha_fin_carencia: Optional[str],
    clave_temporal: Optional[str],
    fecha_emision: str,
) -> Tuple[str, str, str, List[str], str]:
    if es_aprobada:
        asunto = f"[Bienestar Peralillo] Solicitud N° {folio} fue ACEPTADA - Credenciales y Pasos de Acceso"
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
        alerta_aprobada = construir_alerta_estado_html(
            bg_color="#ecfdf5",
            border_color="#059669",
            title_color="#065f46",
            body_color="#064e3b",
            titulo=f"✔ Resolución Oficial del Directorio: SOLICITUD N° {folio} ACEPTADA",
            cuerpo_html=f"<strong>Motivo / Acuerdo:</strong> {motivo_texto}",
        )
        bloque_credenciales = construir_bloque_credenciales_html(
            titulo_caja="CREDENCIALES INICIALES DE ACCESO AL PORTAL",
            subtitulo_caja="Su cuenta de Socio ha sido habilitada. Utilice estos datos para su primer inicio de sesión:",
            run_formateado=run_formateado,
            destinatario=destinatario,
            clave_temporal=clave_temporal or "",
            texto_boton="Ingresar al Portal de Bienestar",
        )
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
        resumen_estado = f"Solicitud N° {folio} fue ACEPTADA — Motivo: {motivo_texto}"
    else:
        asunto = f"[Bienestar Peralillo] Solicitud N° {folio} fue RECHAZADA - Motivo y Observaciones"
        pasos = [
            f'Revisar el motivo del rechazo informado por el Directorio: "{motivo_texto}".',
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
        alerta_rechazo = construir_alerta_estado_html(
            bg_color="#fff1f2",
            border_color="#e11d48",
            title_color="#9f1239",
            body_color="#881337",
            titulo=f"✕ Resolución Oficial del Directorio: SOLICITUD N° {folio} RECHAZADA",
            cuerpo_html=f"<strong>Motivo / Observación:</strong> {motivo_texto}",
        )
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
        resumen_estado = f"Solicitud N° {folio} fue RECHAZADA — Motivo: {motivo_texto}"
    return asunto, cuerpo_texto, cuerpo_html, pasos, resumen_estado


def construir_plantilla_recuperacion_password(
    *,
    folio_seguridad: str,
    fecha_emision: str,
    nombre_completo: str,
    run_formateado: str,
    destinatario: str,
    clave_temporal: str,
    rol_label: str,
) -> Tuple[str, str, str]:
    asunto = f"[Bienestar Peralillo] Recuperación de Contraseña - Clave Temporal de Acceso ({folio_seguridad})"
    pasos = [
        f"Ingresar al Portal de Bienestar en <strong>{settings.PORTAL_URL}/login</strong>.",
        f"En el campo <strong>'RUT o Correo Electrónico'</strong>, digitar su RUT (<strong>{run_formateado}</strong>) o su correo (<strong>{destinatario}</strong>).",
        "En el campo <strong>'Contraseña'</strong>, ingresar la Contraseña Temporal de un solo uso indicada en este correo.",
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
    alerta_seguridad = construir_alerta_estado_html(
        bg_color="#f0f9ff",
        border_color="#006799",
        title_color="#0c4a6e",
        body_color="#075985",
        titulo=f"🔒 Solicitud de Restablecimiento de Credenciales ({folio_seguridad})",
        cuerpo_html="Se ha generado una <strong>Contraseña Temporal de un solo uso</strong> para restablecer el acceso a su cuenta. Al ingresar al portal se le solicitará crear su nueva clave personal.",
    )
    bloque_credenciales = construir_bloque_credenciales_html(
        titulo_caja="CREDENCIALES TEMPORALES DE RECUPERACIÓN",
        subtitulo_caja="Utilice esta clave temporal para ingresar al portal y definir su nueva contraseña personal:",
        run_formateado=run_formateado,
        destinatario=destinatario,
        clave_temporal=clave_temporal,
        texto_boton="Ingresar al Portal y Cambiar mi Clave",
        etiqueta_clave="Contraseña Temporal",
    )
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
    return asunto, cuerpo_texto, cuerpo_html


def construir_plantilla_resolucion_carga(
    *,
    folio: str,
    socio_nombre: str,
    socio_rut: str,
    carga_nombre: str,
    carga_run: str,
    parentesco: str,
    aprobada: bool,
    motivo_texto: str,
    fecha_sesion: Optional[str],
    numero_acta: Optional[str],
    fecha_emision: str,
) -> Tuple[str, str, str]:
    if aprobada:
        asunto = f"[Bienestar Peralillo] Nueva Carga Familiar APROBADA ({folio})"
        alerta_html = construir_alerta_estado_html(
            bg_color="#ecfdf5",
            border_color="#059669",
            title_color="#065f46",
            body_color="#064e3b",
            titulo=f"✔ Incorporación de Carga Familiar APROBADA ({folio})",
            cuerpo_html=f"<strong>Acuerdo / Detalle:</strong> {motivo_texto}",
        )
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
        alerta_html = construir_alerta_estado_html(
            bg_color="#fff1f2",
            border_color="#e11d48",
            title_color="#9f1239",
            body_color="#881337",
            titulo=f"✕ Solicitud de Carga Familiar N° {folio} RECHAZADA",
            cuerpo_html=f"<strong>Motivo / Observación:</strong> {motivo_texto}",
        )
        pasos = [
            f'Revise la observación informada por la Directiva: "{motivo_texto}".',
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
    return asunto, cuerpo_texto, cuerpo_html


def construir_plantilla_recepcion_reembolso(
    *,
    codigo: str,
    socio_nombre: str,
    socio_rut: str,
    tipo_prestacion_label: str,
    beneficiario_nombre: str,
    beneficiario_parentesco: str,
    monto_bol_fmt: str,
    monto_cop_fmt: str,
    saldo_rest_fmt: str,
    fecha_atencion: str,
    fecha_emision: str,
) -> Tuple[str, str, str]:
    asunto = f"[Bienestar Peralillo] Solicitud de Reembolso {codigo} Recepcionada y en Gestión"
    alerta_html = construir_alerta_estado_html(
        bg_color="#f0fdf4",
        border_color="#16a34a",
        title_color="#15803d",
        body_color="#166534",
        titulo=f"Comprobante Oficial de Ingreso de Reembolso ({codigo})",
        cuerpo_html=(
            f"Su solicitud por <strong>{monto_cop_fmt}</strong> ha sido ingresada en estado <strong>Pendiente de Revisión</strong>. "
            f"Se ha aplicado la retención preventiva de su cupo anual (saldo disponible restante: <strong>{saldo_rest_fmt}</strong>)."
        ),
    )
    pasos = [
        "<strong>Revisión por la Directiva de Bienestar:</strong> Los antecedentes médicos y boletas adjuntas serán verificados conforme al reglamento municipal y la regla de 30 días corridos.",
        "<strong>Liquidación y Pago:</strong> Una vez aprobada, el monto será liquidado y depositado a su cuenta bancaria registrada para remuneraciones.",
        "<strong>Resguardo del Saldo:</strong> En caso de requerirse alguna subsanación o rechazo, el saldo retenido será reintegrado automáticamente a su cupo anual disponible.",
    ]
    cuerpo_texto = (
        f"Estimado(a) {socio_nombre}:\n\n"
        f"Le informamos que su solicitud de reembolso médico {codigo} ha sido recepcionada exitosamente.\n\n"
        f"DETALLE DE LA SOLICITUD:\n"
        f"- N° Solicitud: {codigo}\n"
        f"- Prestación: {tipo_prestacion_label}\n"
        f"- Beneficiario: {beneficiario_nombre} ({beneficiario_parentesco})\n"
        f"- Monto Boleta: {monto_bol_fmt}\n"
        f"- Monto Reembolso Solicitado: {monto_cop_fmt}\n"
        f"- Saldo Salud Restante Proyectado: {saldo_rest_fmt}\n"
        f"- Fecha de Atención: {fecha_atencion}\n\n"
        f"Su solicitud se encuentra en revisión reglamentaria. Se notificará la resolución oficial por esta misma vía.\n\n"
        f"Atentamente,\nComité de Bienestar • I. Municipalidad de Peralillo"
    )
    cuerpo_html = _envolver_html_institucional(
        folio=codigo,
        fecha_emision=fecha_emision,
        badge_texto="EN REVISIÓN DIRECTIVA",
        badge_bg="#dcfce7",
        badge_color="#15803d",
        banner_bg="#0f5132",
        banner_subtitulo="REEMBOLSOS MÉDICOS Y DENTALES • BIENESTAR MUNICIPAL",
        banner_titulo=f"Solicitud de Reembolso {codigo} Ingresada",
        saludo_nombre=socio_nombre,
        intro_html=(
            "Confirmamos la recepción de su solicitud de reembolso por prestaciones médicas. "
            "A continuación se detalla la ficha de respaldo y el estado de sus fondos anuales de salud:"
        ),
        alerta_estado_html=alerta_html,
        filas_tabla=[
            ("N° de Solicitud (Folio)", codigo),
            ("Socio(a) Titular", f"{socio_nombre} (RUN {socio_rut})"),
            ("Beneficiario", f"{beneficiario_nombre} ({beneficiario_parentesco})"),
            ("Tipo de Prestación", tipo_prestacion_label),
            ("Monto Total de Boleta", monto_bol_fmt),
            ("Monto Reembolso Solicitado", monto_cop_fmt),
            ("Saldo Anual Restante Disponible", saldo_rest_fmt),
            ("Fecha de Atención Declarada", str(fecha_atencion)),
            ("Estado", "Pendiente de Revisión (Retención Preventiva)"),
        ],
        titulo_pasos="Etapas de tramitación y pago",
        pasos=pasos,
    )
    return asunto, cuerpo_texto, cuerpo_html


def construir_plantilla_resolucion_reembolso(
    *,
    codigo: str,
    socio_nombre: str,
    socio_rut: str,
    aprobada: bool,
    tipo_prestacion_label: str,
    beneficiario_nombre: str,
    beneficiario_parentesco: str,
    monto_rem_fmt: str,
    saldo_disp_fmt: str,
    motivo_rechazo: str,
    fecha_emision: str,
) -> Tuple[str, str, str, str]:
    if aprobada:
        asunto = f"[Bienestar Peralillo] Reembolso Médico {codigo} APROBADO ({monto_rem_fmt})"
        alerta_html = construir_alerta_estado_html(
            bg_color="#ecfdf5",
            border_color="#059669",
            title_color="#065f46",
            body_color="#064e3b",
            titulo=f"✔ Solicitud de Reembolso APROBADA ({codigo})",
            cuerpo_html=f"Se ha aprobado el reembolso por un total de <strong>{monto_rem_fmt}</strong> para el beneficiario <strong>{beneficiario_nombre}</strong>.",
        )
        pasos = [
            f"El importe de <strong>{monto_rem_fmt}</strong> ha sido transferido o imputado a nómina de pago de bienestar.",
            f"Su saldo disponible de salud para el resto del año calendario es de <strong>{saldo_disp_fmt}</strong>.",
            "Puede descargar o consultar el comprobante en cualquier momento en el módulo Reembolsos del Portal.",
        ]
        cuerpo_texto = (
            f"Estimado(a) {socio_nombre}:\n\n"
            f"Su solicitud de reembolso {codigo} por un monto de {monto_rem_fmt} "
            f"para {beneficiario_nombre} ({beneficiario_parentesco}) ha sido APROBADA.\n"
            f"El depósito correspondiente se efectuará en la liquidación de beneficios de Bienestar.\n"
            f"Saldo restante disponible: {saldo_disp_fmt}.\n\n"
            f"Atentamente,\nDirectiva del Comité de Bienestar • I. Municipalidad de Peralillo"
        )
        cuerpo_html = _envolver_html_institucional(
            folio=codigo,
            fecha_emision=fecha_emision,
            badge_texto="REEMBOLSO APROBADO",
            badge_bg="#dcfce7",
            badge_color="#166534",
            banner_bg="#064e3b",
            banner_subtitulo="RESOLUCIÓN OFICIAL DE BENEFICIOS • BIENESTAR MUNICIPAL",
            banner_titulo=f"✔ Reembolso {codigo} APROBADO ({monto_rem_fmt})",
            saludo_nombre=socio_nombre,
            intro_html=(
                "Nos complace informarle que la Directiva del <strong>Comité de Bienestar de la Ilustre Municipalidad de Peralillo</strong> "
                "ha aprobado su solicitud de reembolso de salud:"
            ),
            alerta_estado_html=alerta_html,
            filas_tabla=[
                ("N° Solicitud de Reembolso", f"{codigo} — APROBADO"),
                ("Socio(a) Titular", f"{socio_nombre} (RUN {socio_rut})"),
                ("Beneficiario(a)", f"{beneficiario_nombre} ({beneficiario_parentesco})"),
                ("Prestación Médica", tipo_prestacion_label),
                ("Monto Liquidado a Pagar", monto_rem_fmt),
                ("Saldo Salud Disponible Actual", saldo_disp_fmt),
                ("Estado de Pago", "Aprobado / En proceso de liquidación"),
            ],
            titulo_pasos="Detalle de pago y saldo restante",
            pasos=pasos,
        )
        resumen_estado = f"Reembolso {codigo} APROBADO por {monto_rem_fmt} para {beneficiario_nombre}."
    else:
        asunto = f"[Bienestar Peralillo] Solicitud de Reembolso {codigo} RECHAZADA"
        motivo_texto = motivo_rechazo or "Documentación no cumple requisitos reglamentarios."
        alerta_html = construir_alerta_estado_html(
            bg_color="#fff1f2",
            border_color="#e11d48",
            title_color="#9f1239",
            body_color="#881337",
            titulo=f"✕ Solicitud de Reembolso RECHAZADA ({codigo})",
            cuerpo_html=f"<strong>Causal informada:</strong> {motivo_texto}",
        )
        pasos = [
            f"El monto de <strong>{monto_rem_fmt}</strong> retenido preventivamente ha sido <strong>restituido íntegramente (100%)</strong> a su cupo disponible de salud (Saldo actual: <strong>{saldo_disp_fmt}</strong>).",
            "Si el gasto se encuentra aún dentro del plazo reglamentario de 30 días corridos, puede reingresar una nueva solicitud subsanando los reparos indicados.",
        ]
        cuerpo_texto = (
            f"Estimado(a) {socio_nombre}:\n\n"
            f"Su solicitud de reembolso {codigo} por {monto_rem_fmt} ha sido RECHAZADA.\n"
            f"Causal: {motivo_texto}\n\n"
            f"IMPORTANTE: El saldo de {monto_rem_fmt} ha sido reintegrado automáticamente al 100% "
            f"a su saldo disponible de salud (Saldo disponible: {saldo_disp_fmt}).\n\n"
            f"Atentamente,\nDirectiva del Comité de Bienestar • I. Municipalidad de Peralillo"
        )
        cuerpo_html = _envolver_html_institucional(
            folio=codigo,
            fecha_emision=fecha_emision,
            badge_texto="REEMBOLSO RECHAZADO",
            badge_bg="#ffe4e6",
            badge_color="#9f1239",
            banner_bg="#881337",
            banner_subtitulo="RESOLUCIÓN OFICIAL DE BENEFICIOS • BIENESTAR MUNICIPAL",
            banner_titulo=f"✕ Reembolso {codigo} Rechazado",
            saludo_nombre=socio_nombre,
            intro_html=(
                "Cumplimos con informar a usted el resultado de la revisión de su solicitud de reembolso "
                "en el <strong>Comité de Bienestar de la Ilustre Municipalidad de Peralillo</strong>:"
            ),
            alerta_estado_html=alerta_html,
            filas_tabla=[
                ("N° Solicitud", f"{codigo} — RECHAZADO"),
                ("Socio(a) Titular", f"{socio_nombre} (RUN {socio_rut})"),
                ("Beneficiario", f"{beneficiario_nombre} ({beneficiario_parentesco})"),
                ("Prestación", tipo_prestacion_label),
                ("Monto Solicitado", monto_rem_fmt),
                ("Causal del Rechazo", motivo_texto),
                ("Restitución de Saldo", f"100% Restituido ({monto_rem_fmt})"),
                ("Saldo Salud Disponible Actual", saldo_disp_fmt),
            ],
            titulo_pasos="Efectos reglamentarios y saldo restituido",
            pasos=pasos,
        )
        resumen_estado = f"Reembolso {codigo} RECHAZADO: {motivo_texto}. Saldo {monto_rem_fmt} restituido al 100%."
    return asunto, cuerpo_texto, cuerpo_html, resumen_estado
