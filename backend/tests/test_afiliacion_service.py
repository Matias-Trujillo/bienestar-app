"""Pruebas automatizadas para el Servicio de Afiliación y Cargas Familiares (HU-01 y HU-02).

[ESTUDIANTE INFORMÁTICA] Este módulo valida las reglas legales de la Ley N° 19.754:
obligatoriedad del descuento por planilla del 4%, aceptación de carencia, restricción de
período hábil (enero a junio), resolución en sesión de Directorio con N° de Acta, cómputo
de +6 meses de carencia y auditoría inmutable.
Todos los RUN utilizados cumplen estrictamente con el algoritmo de Módulo 11 del Registro Civil.
"""
from datetime import date
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import (
    AuditLog,
    EstadoSolicitud,
    ParametroSistema,
    User,
    UserRole,
)
from app.schemas.afiliacion import ResolucionSolicitudIn, SolicitudIn
from app.services.afiliacion_service import AfiliacionService


# [ESTUDIANTE INFORMÁTICA] Valida que el sistema rechace postulaciones que no autoricen expresamente el 4% de retención legal.
def test_postulacion_sin_autorizacion_4_porciento_rechazada() -> None:
    with pytest.raises(ValidationError) as exc_info:
        SolicitudIn(
            nombreCompleto="Carlos Tapia Riquelme",
            run="15.489.123-4",
            grado="12",
            calidadContractual="Planta",
            email="ctapia@mperalillo.cl",
            autorizaDescuento=False,  # Vulneración de la regla de la Ley N° 19.754
            aceptaCarencia=True,
        )
    assert "Debe autorizar el descuento por planilla" in str(exc_info.value)


# [ESTUDIANTE INFORMÁTICA] Valida que el postulante deba aceptar y declarar conocer el período estatutario de carencia.
def test_postulacion_sin_aceptar_carencia_rechazada() -> None:
    with pytest.raises(ValidationError) as exc_info:
        SolicitudIn(
            nombreCompleto="Carlos Tapia Riquelme",
            run="15.489.123-4",
            grado="12",
            calidadContractual="Planta",
            email="ctapia@mperalillo.cl",
            autorizaDescuento=True,
            aceptaCarencia=False,
        )
    assert "período de carencia" in str(exc_info.value)


# [ESTUDIANTE INFORMÁTICA] Valida que fuera de la ventana estatutaria (julio a diciembre) el sistema bloquee el ingreso si la validación está activa.
async def test_postulacion_fuera_de_periodo_bloqueada(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "AFILIACION_VALIDAR_PERIODO", True)
    orig_fn = AfiliacionService.obtener_periodo_actual
    monkeypatch.setattr(
        AfiliacionService,
        "obtener_periodo_actual",
        lambda hoy=None: orig_fn(date(2026, 11, 15)),
    )
    payload = SolicitudIn(
        nombreCompleto="Rodrigo Andrés Morales",
        run="16.234.567-2",
        grado="10",
        calidadContractual="Contrata",
        email="rmorales@mperalillo.cl",
        autorizaDescuento=True,
        aceptaCarencia=True,
    )
    with pytest.raises(HTTPException) as exc_info:
        await AfiliacionService.crear_solicitud(db_session, payload)
    assert exc_info.value.status_code == 400
    assert "Fuera del período reglamentario" in exc_info.value.detail


# [ESTUDIANTE INFORMÁTICA] Valida el ingreso exitoso dentro del período con asignación de folio anual (ej: AF-2026-00001).
async def test_crear_solicitud_afiliacion_valida(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Habilitar el período para la prueba
    monkeypatch.setattr(settings, "AFILIACION_VALIDAR_PERIODO", False)
    payload = SolicitudIn(
        nombreCompleto="Rodrigo Andrés Morales",
        run="16.234.567-2",
        grado="10",
        calidadContractual="Contrata",
        email="rmorales@mperalillo.cl",
        autorizaDescuento=True,
        aceptaCarencia=True,
        cargas=[],
    )
    comprobante = await AfiliacionService.crear_solicitud(db_session, payload)

    assert comprobante.folio.startswith(f"AF-{date.today().year}-")
    assert comprobante.estado == EstadoSolicitud.PENDIENTE.value
    assert comprobante.porcentajeDescuento == 4


# [ESTUDIANTE INFORMÁTICA] Valida la resolución colegiada (HU-02): calcula +6 meses exactos de carencia y genera cuenta de usuario.
async def test_resolucion_aprobada_computa_carencia_y_crea_usuario(
    db_session: AsyncSession, usuario_admin: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "AFILIACION_VALIDAR_PERIODO", False)
    payload = SolicitudIn(
        nombreCompleto="Lorena Silva Díaz",
        run="13.456.789-9",
        grado="14",
        calidadContractual="Planta",
        email="lsilva@mperalillo.cl",
        autorizaDescuento=True,
        aceptaCarencia=True,
    )
    comprobante = await AfiliacionService.crear_solicitud(db_session, payload)

    # Sesión del 15 de marzo de 2026 -> Fin de carencia esperado: 15 de septiembre de 2026 (+6 meses)
    resolucion = ResolucionSolicitudIn(
        accion="aprobar",
        fechaSesion="2026-03-15",
        numeroActa="ACTA-ORD-03/2026",
        observaciones="Aprobada unánimemente en sesión ordinaria.",
    )
    resultado = await AfiliacionService.resolver_solicitud(
        db_session, comprobante.folio, resolucion, usuario_admin
    )

    assert resultado.estado == EstadoSolicitud.APROBADA.value
    assert resultado.fechaFinCarencia == "2026-09-15"
    assert resultado.numeroActa == "ACTA-ORD-03/2026"

    # Verificar que el usuario se haya creado en la tabla de usuarios con rol SOCIO
    nuevo_socio = await db_session.scalar(select(User).where(User.rut == "13456789-9"))
    assert nuevo_socio is not None
    assert nuevo_socio.rol == UserRole.SOCIO
    assert nuevo_socio.estado_previsional == "Al día"
    assert nuevo_socio.saldo_salud_disponible == 150000


# [ESTUDIANTE INFORMÁTICA] Valida que toda aprobación o rechazo quede registrada en la bitácora inmutable de auditoría (HU-09).
async def test_resolucion_registra_auditoria_inmutable(
    db_session: AsyncSession, usuario_admin: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "AFILIACION_VALIDAR_PERIODO", False)
    payload = SolicitudIn(
        nombreCompleto="Fabiola Concha Ortiz",
        run="17.345.678-6",
        grado="16",
        calidadContractual="Contrata",
        email="fconcha@mperalillo.cl",
        autorizaDescuento=True,
        aceptaCarencia=True,
    )
    comp = await AfiliacionService.crear_solicitud(db_session, payload)

    resolucion = ResolucionSolicitudIn(
        accion="aprobar",
        fechaSesion="2026-04-10",
        numeroActa="ACTA-ORD-04/2026",
        observaciones="Incorporación conforme a derecho.",
    )
    await AfiliacionService.resolver_solicitud(db_session, comp.folio, resolucion, usuario_admin)

    # Consultar AuditLog (el más reciente debe corresponder a la resolución)
    audit = await db_session.scalar(
        select(AuditLog)
        .where(
            AuditLog.modulo == "AFILIACION",
            AuditLog.recurso_id == comp.folio,
            AuditLog.accion == "APROBAR_SOLICITUD_DIRECTORIO",
        )
    )
    assert audit is not None
    assert audit.accion == "APROBAR_SOLICITUD_DIRECTORIO"
    assert audit.usuario_rut == usuario_admin.rut
    assert "2026-04-10" in audit.detalles


# [ESTUDIANTE INFORMÁTICA] Valida que el ingreso de una postulación digital despache el Correo #1 de recepción con folio y reglas.
async def test_crear_solicitud_despacha_correo_recepcion_y_registra_buzon(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "AFILIACION_VALIDAR_PERIODO", False)
    payload = SolicitudIn(
        nombreCompleto="Héctor Valenzuela Castro",
        run="14.234.567-6",
        grado="11",
        calidadContractual="Planta",
        email="hvalenzuela@mperalillo.cl",
        autorizaDescuento=True,
        aceptaCarencia=True,
    )
    comp = await AfiliacionService.crear_solicitud(db_session, payload)

    assert comp.notificacionEmail is not None
    assert comp.notificacionEmail["tipo"] == "recepcion_solicitud"
    assert comp.notificacionEmail["destinatario"] == "hvalenzuela@mperalillo.cl"
    assert comp.notificacionEmail["folio"] == comp.folio
    assert "4%" in comp.notificacionEmail["resumenEstado"]

    # Verificar que quede constancia en AuditLog
    audit = await db_session.scalar(
        select(AuditLog).where(
            AuditLog.modulo == "AFILIACION",
            AuditLog.accion == "INGRESO_SOLICITUD_Y_CORREO",
            AuditLog.recurso_id == comp.folio,
        )
    )
    assert audit is not None
    assert "hvalenzuela@mperalillo.cl" in audit.detalles


# [ESTUDIANTE INFORMÁTICA] Valida que al aprobar la solicitud se despache el Correo #2A con la clave temporal y cambio obligatorio.
async def test_resolver_solicitud_aprobada_despacha_correo_credenciales_temporales(
    db_session: AsyncSession, usuario_admin: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "AFILIACION_VALIDAR_PERIODO", False)
    payload = SolicitudIn(
        nombreCompleto="Camila Andrea Muñoz",
        run="18.234.567-9",
        grado="15",
        calidadContractual="Contrata",
        email="cmunoz@mperalillo.cl",
        autorizaDescuento=True,
        aceptaCarencia=True,
    )
    comp = await AfiliacionService.crear_solicitud(db_session, payload)

    resolucion = ResolucionSolicitudIn(
        accion="aprobar",
        fechaSesion="2026-05-02",
        numeroActa="ACTA-ORD-05/2026",
        observaciones="Aprobada con documentación completa.",
    )
    res = await AfiliacionService.resolver_solicitud(db_session, comp.folio, resolucion, usuario_admin)

    assert res.estado == EstadoSolicitud.APROBADA.value
    assert res.notificacionEmail is not None
    assert res.notificacionEmail["estadoResolucion"] == "ACEPTADA"
    assert "Contraseña Temporal inicial: ********" in str(res.notificacionEmail["pasosSeguir"])

    # Verificar parámetro de seguridad SEC_USR_<id> con cambio obligatorio activo
    user_creado = await db_session.scalar(select(User).where(User.rut == "18234567-9"))
    assert user_creado is not None
    from app.core.security import verify_password
    assert verify_password("Peralillo#1823", user_creado.hashed_password)
    sec = await db_session.scalar(
        select(ParametroSistema).where(ParametroSistema.clave == f"SEC_USR_{user_creado.id}")
    )
    assert sec is not None
    assert '"c": true' in sec.valor


# [ESTUDIANTE INFORMÁTICA] Valida que al rechazar la solicitud se despache el Correo #2B con la causal y sin crear cuenta de socio.
async def test_resolver_solicitud_rechazada_despacha_correo_motivo(
    db_session: AsyncSession, usuario_admin: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "AFILIACION_VALIDAR_PERIODO", False)
    payload = SolicitudIn(
        nombreCompleto="Patricio Abarca R.",
        run="19.234.567-7",
        grado="17",
        calidadContractual="Contrata",
        email="pabarca@mperalillo.cl",
        autorizaDescuento=True,
        aceptaCarencia=True,
    )
    comp = await AfiliacionService.crear_solicitud(db_session, payload)

    motivo = "No adjuntó decreto de nombramiento en contrata vigente."
    resolucion = ResolucionSolicitudIn(
        accion="rechazar",
        observaciones=motivo,
    )
    res = await AfiliacionService.resolver_solicitud(db_session, comp.folio, resolucion, usuario_admin)

    assert res.estado == EstadoSolicitud.RECHAZADA.value
    assert res.notificacionEmail is not None
    assert res.notificacionEmail["estadoResolucion"] == "RECHAZADA"
    assert motivo in res.notificacionEmail["motivo"]

    # Comprobar que NO se haya creado usuario en la BD
    user_no_creado = await db_session.scalar(select(User).where(User.rut == "19234567-7"))
    assert user_no_creado is None


# [ESTUDIANTE INFORMÁTICA] Valida que el reenvío de correo regenere y despache la notificación correspondiente al estado.
async def test_reenviar_correo_solicitud_actualiza_envio(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "AFILIACION_VALIDAR_PERIODO", False)
    payload = SolicitudIn(
        nombreCompleto="Gloria Pino Soto",
        run="12.456.789-0",
        grado="8",
        calidadContractual="Planta",
        email="gpino@mperalillo.cl",
        autorizaDescuento=True,
        aceptaCarencia=True,
    )
    comp = await AfiliacionService.crear_solicitud(db_session, payload)
    comp_reenviado = await AfiliacionService.reenviar_correo(db_session, comp.folio)

    assert comp_reenviado.folio == comp.folio
    assert comp_reenviado.notificacionEmail is not None
    assert comp_reenviado.notificacionEmail["destinatario"] == "gpino@mperalillo.cl"


# [ESTUDIANTE INFORMÁTICA] Valida que la bandeja institucional (buzón) recopile y filtre correos por folio y RUN.
async def test_obtener_buzon_correos_con_filtro(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "AFILIACION_VALIDAR_PERIODO", False)
    payload = SolicitudIn(
        nombreCompleto="Daniel Riquelme S.",
        run="15.489.123-4",
        grado="10",
        calidadContractual="Contrata",
        email="driquelme@mperalillo.cl",
        autorizaDescuento=True,
        aceptaCarencia=True,
    )
    comp = await AfiliacionService.crear_solicitud(db_session, payload)

    buzon_general = await AfiliacionService.obtener_buzon(db_session)
    assert "total" in buzon_general
    assert "correos" in buzon_general
    assert buzon_general["total"] >= 1

    buzon_filtrado = await AfiliacionService.obtener_buzon(db_session, q=comp.folio)
    assert buzon_filtrado["total"] >= 1
    assert any(m["folio"] == comp.folio for m in buzon_filtrado["correos"])
