"""Pruebas automatizadas para el Servicio de Reembolsos Médicos (HU-03 y HU-04).

[ESTUDIANTE INFORMÁTICA] Este módulo valida las reglas de salud establecidas en el
reglamento municipal: carencia de 6 meses, caducidad de boletas de 30 días corridos,
retención preventiva de saldo y restitución automática inmediata al rechazar.
"""
from datetime import date, timedelta
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.afiliacion import EstadoSolicitud, SolicitudCargaFamiliar
from app.models.audit import AuditLog
from app.models.reembolso import EstadoReembolso, SolicitudReembolso
from app.models.user import User
from app.schemas.reembolso import ReembolsoCreateRequest
from app.services.afiliacion_service import AfiliacionService
from app.services.email_service import listar_buzon_memoria
from app.services.reembolso_service import (
    crear_solicitud,
    obtener_resumen_socio,
    resolver_solicitud_reembolso,
    validar_carencia,
    validar_plazo_30_dias,
)


# [ESTUDIANTE INFORMÁTICA] Valida que un socio con 1 año y 2 meses de antigüedad esté habilitado para reembolsos.
def test_validar_carencia_socio_habilitado(socio_habilitado: User) -> None:
    puede, fecha_hab, msg = validar_carencia(socio_habilitado)
    assert puede is True
    assert fecha_hab is None
    assert msg is None


# [ESTUDIANTE INFORMÁTICA] Valida que un socio con 2 meses de antigüedad quede bloqueado y se proyecte su fecha de alta.
def test_validar_carencia_socio_bloqueado(socio_nuevo: User) -> None:
    puede, fecha_hab, msg = validar_carencia(socio_nuevo)
    assert puede is False
    assert fecha_hab is not None
    assert "Debe tener al menos 6 meses" in (msg or "")


# [ESTUDIANTE INFORMÁTICA] Valida que una boleta médica emitida hace 10 días se encuentre dentro del plazo legal.
def test_validar_plazo_30_dias_dentro() -> None:
    fecha_reciente = date.today() - timedelta(days=10)
    resultado = validar_plazo_30_dias(fecha_reciente)
    assert resultado.dentro_de_plazo is True
    assert resultado.dias_transcurridos == 10
    assert "Dentro de plazo" in resultado.mensaje


# [ESTUDIANTE INFORMÁTICA] Valida que una boleta emitida hace 35 días sea rechazada por caducidad reglamentaria.
def test_validar_plazo_30_dias_vencido() -> None:
    fecha_antigua = date.today() - timedelta(days=35)
    resultado = validar_plazo_30_dias(fecha_antigua)
    assert resultado.dentro_de_plazo is False
    assert resultado.dias_transcurridos == 35
    assert "Fuera de plazo" in resultado.mensaje


# [ESTUDIANTE INFORMÁTICA] Valida la retención preventiva: al postular, el monto se descuenta de inmediato del cupo disponible.
async def test_crear_solicitud_retencion_preventiva(
    db_session: AsyncSession, socio_habilitado: User
) -> None:
    payload = ReembolsoCreateRequest(
        tipo_prestacion="farmacia",
        descripcion="Medicamentos recetados",
        beneficiario_nombre=socio_habilitado.nombre_completo,
        beneficiario_parentesco="Titular",
        monto_boleta=60000,
        monto_copago=45000,
        fecha_atencion=date.today() - timedelta(days=5),
        fecha_boleta=date.today() - timedelta(days=5),
        tipo_documento="receta_medica",
        declaracion_aceptada=True,
    )
    solicitud = await crear_solicitud(socio_habilitado, payload, db_session)

    assert solicitud.estado == EstadoReembolso.EN_REVISION
    assert solicitud.monto_reembolso == 45000

    resumen = await obtener_resumen_socio(socio_habilitado, db_session)
    assert resumen.saldo_salud_disponible == 105000.0
    assert resumen.solicitudes_en_revision == 1


# [ESTUDIANTE INFORMÁTICA] Valida la aprobación por la Directiva: el gasto se consolida y se registra en la auditoría inmutable.
async def test_resolver_solicitud_aprobada(
    db_session: AsyncSession, socio_habilitado: User, usuario_admin: User
) -> None:
    payload = ReembolsoCreateRequest(
        tipo_prestacion="consulta",
        descripcion="Consulta especialista traumatólogo",
        beneficiario_nombre=socio_habilitado.nombre_completo,
        beneficiario_parentesco="Titular",
        monto_boleta=50000,
        monto_copago=30000,
        fecha_atencion=date.today() - timedelta(days=2),
        fecha_boleta=date.today() - timedelta(days=2),
        tipo_documento="bono_copago",
        declaracion_aceptada=True,
    )
    solicitud = await crear_solicitud(socio_habilitado, payload, db_session)

    resuelta = await resolver_solicitud_reembolso(
        solicitud.id, "APROBAR", "", usuario_admin, db_session
    )
    assert resuelta.estado == EstadoReembolso.APROBADO

    resumen = await obtener_resumen_socio(socio_habilitado, db_session)
    assert resumen.saldo_salud_disponible == 120000.0
    assert resumen.total_reembolsado_periodo == 30000.0

    # Verificar registro inmutable en AuditLog
    audit = await db_session.scalar(
        select(AuditLog).where(AuditLog.recurso_id == solicitud.codigo)
    )
    assert audit is not None
    assert audit.accion == "APROBAR_REEMBOLSO"
    assert audit.usuario_rut == usuario_admin.rut


# [ESTUDIANTE INFORMÁTICA] Valida la restitución automática: al rechazar la solicitud, el cupo retenido se restaura al 100%.
async def test_resolver_solicitud_rechazada_restituye_saldo(
    db_session: AsyncSession, socio_habilitado: User, usuario_admin: User
) -> None:
    payload = ReembolsoCreateRequest(
        tipo_prestacion="examenes",
        descripcion="Tratamiento de radiografía médica",
        beneficiario_nombre=socio_habilitado.nombre_completo,
        beneficiario_parentesco="Titular",
        monto_boleta=70000,
        monto_copago=50000,
        fecha_atencion=date.today() - timedelta(days=3),
        fecha_boleta=date.today() - timedelta(days=3),
        tipo_documento="boleta_detallada",
        declaracion_aceptada=True,
    )
    solicitud = await crear_solicitud(socio_habilitado, payload, db_session)
    assert (await obtener_resumen_socio(socio_habilitado, db_session)).saldo_salud_disponible == 100000.0

    # Rechazar la solicitud
    motivo = "Documentación ilegible. Falta firma del médico tratante."
    resuelta = await resolver_solicitud_reembolso(
        solicitud.id, "RECHAZAR", motivo, usuario_admin, db_session
    )
    assert resuelta.estado == EstadoReembolso.RECHAZADO
    assert resuelta.motivo_rechazo == motivo

    # El saldo debe restituirse automáticamente a $150.000 íntegro
    resumen = await obtener_resumen_socio(socio_habilitado, db_session)
    assert resumen.saldo_salud_disponible == 150000.0

    # Verificar registro inmutable en AuditLog
    audit = await db_session.scalar(
        select(AuditLog).where(AuditLog.recurso_id == solicitud.codigo)
    )
    assert audit is not None
    assert audit.accion == "RECHAZAR_REEMBOLSO"
    assert motivo in audit.detalles


# [ESTUDIANTE INFORMÁTICA] Valida que un reembolso para una carga familiar debidamente aprobada descuente preventivamente el saldo y registre a la carga.
async def test_reembolso_para_carga_familiar_aprobada_exitoso(
    db_session: AsyncSession, socio_habilitado: User
) -> None:
    # 1. Registrar carga familiar aprobada
    carga = SolicitudCargaFamiliar(
        folio="CF-2026-00088",
        socio_id=socio_habilitado.id,
        socio_nombre=socio_habilitado.nombre_completo,
        socio_rut=socio_habilitado.rut,
        nombre_completo="Camila Valenzuela Soto",
        run="26.111.222-1",
        parentesco="Hija",
        estado=EstadoSolicitud.APROBADA,
    )
    db_session.add(carga)
    await db_session.commit()

    # 2. Solicitar reembolso imputable a la carga aprobada
    payload = ReembolsoCreateRequest(
        tipo_prestacion="farmacia",
        descripcion="Antibióticos para carga familiar Camila",
        beneficiario_nombre="Camila Valenzuela Soto",
        beneficiario_parentesco="Hija",
        beneficiario_run="26.111.222-1",
        monto_boleta=45000,
        monto_copago=35000,
        fecha_atencion=date.today() - timedelta(days=4),
        fecha_boleta=date.today() - timedelta(days=4),
        tipo_documento="receta_medica",
        declaracion_aceptada=True,
    )
    solicitud = await crear_solicitud(socio_habilitado, payload, db_session)

    assert solicitud.estado == EstadoReembolso.EN_REVISION
    assert solicitud.beneficiario_nombre == "Camila Valenzuela Soto"
    assert solicitud.beneficiario_parentesco == "Hija"
    assert solicitud.beneficiario_run == "26.111.222-1"

    # Saldo prevenido: $150.000 - $35.000 = $115.000
    resumen = await obtener_resumen_socio(socio_habilitado, db_session)
    assert resumen.saldo_salud_disponible == 115000.0


# [ESTUDIANTE INFORMÁTICA] Valida que el sistema bloquee intentos de reembolso para una carga no aprobada o inexistente.
async def test_reembolso_para_carga_no_aprobada_bloqueado(
    db_session: AsyncSession, socio_habilitado: User
) -> None:
    # Registrar carga en estado Pendiente (no aprobada aún por la Directiva)
    carga_pend = SolicitudCargaFamiliar(
        folio="CF-2026-00089",
        socio_id=socio_habilitado.id,
        socio_nombre=socio_habilitado.nombre_completo,
        socio_rut=socio_habilitado.rut,
        nombre_completo="Tomás Valenzuela Soto",
        run="27.333.444-0",
        parentesco="Hijo",
        estado=EstadoSolicitud.PENDIENTE,
    )
    db_session.add(carga_pend)
    await db_session.commit()

    payload = ReembolsoCreateRequest(
        tipo_prestacion="consulta",
        descripcion="Pediatra no autorizable antes de aprobación de carga",
        beneficiario_nombre="Tomás Valenzuela Soto",
        beneficiario_parentesco="Hijo",
        beneficiario_run="27.333.444-0",
        monto_boleta=30000,
        monto_copago=20000,
        fecha_atencion=date.today() - timedelta(days=2),
        fecha_boleta=date.today() - timedelta(days=2),
        tipo_documento="bono_copago",
        declaracion_aceptada=True,
    )

    with pytest.raises(ValueError) as excinfo:
        await crear_solicitud(socio_habilitado, payload, db_session)

    assert "no figura como carga familiar vigente y aprobada" in str(excinfo.value)


# [ESTUDIANTE INFORMÁTICA] Valida que un directivo/administrador pueda asistir a un socio en oficina presencial ingresando a nombre del titular.
async def test_directiva_asiste_reembolso_en_oficina(
    db_session: AsyncSession, socio_habilitado: User, usuario_admin: User
) -> None:
    payload = ReembolsoCreateRequest(
        socio_id=socio_habilitado.id,
        socio_rut=socio_habilitado.rut,
        tipo_prestacion="consulta",
        descripcion="Atención médica tramitada en mesón de Bienestar",
        beneficiario_nombre=socio_habilitado.nombre_completo,
        beneficiario_parentesco="Titular",
        monto_boleta=40000,
        monto_copago=25000,
        fecha_atencion=date.today() - timedelta(days=1),
        fecha_boleta=date.today() - timedelta(days=1),
        tipo_documento="bono_copago",
        declaracion_aceptada=True,
    )
    # Directiva ejecuta crear_solicitud a nombre del socio
    solicitud = await crear_solicitud(usuario_admin, payload, db_session)

    assert solicitud.socio_id == socio_habilitado.id
    assert solicitud.monto_reembolso == 25000.0

    resumen = await obtener_resumen_socio(socio_habilitado, db_session)
    assert resumen.saldo_salud_disponible == 125000.0


# [ESTUDIANTE INFORMÁTICA] Valida que la carencia de 6 meses se evalúe sobre el socio titular asistido y no sobre el directivo.
async def test_carencia_evaluada_en_socio_titular_asistido(
    db_session: AsyncSession, socio_nuevo: User, usuario_admin: User
) -> None:
    payload = ReembolsoCreateRequest(
        socio_id=socio_nuevo.id,
        socio_rut=socio_nuevo.rut,
        tipo_prestacion="farmacia",
        descripcion="Medicamentos para socio que aún está en carencia de 6 meses",
        beneficiario_nombre=socio_nuevo.nombre_completo,
        beneficiario_parentesco="Titular",
        monto_boleta=20000,
        monto_copago=15000,
        fecha_atencion=date.today() - timedelta(days=1),
        fecha_boleta=date.today() - timedelta(days=1),
        tipo_documento="receta_medica",
        declaracion_aceptada=True,
    )

    with pytest.raises(ValueError) as excinfo:
        await crear_solicitud(usuario_admin, payload, db_session)

    assert "Debe tener al menos 6 meses de afiliación activa" in str(excinfo.value)


# [ESTUDIANTE INFORMÁTICA] Valida la restitución del 100% del saldo al rechazar con causal y la emisión del correo transaccional.
async def test_restitucion_total_saldo_al_rechazar_reembolso_con_correo(
    db_session: AsyncSession, socio_habilitado: User, usuario_admin: User
) -> None:
    payload = ReembolsoCreateRequest(
        tipo_prestacion="farmacia",
        descripcion="Medicamentos con boleta borrosa",
        beneficiario_nombre=socio_habilitado.nombre_completo,
        beneficiario_parentesco="Titular",
        monto_boleta=80000,
        monto_copago=60000,
        fecha_atencion=date.today() - timedelta(days=3),
        fecha_boleta=date.today() - timedelta(days=3),
        tipo_documento="boleta_detallada",
        declaracion_aceptada=True,
    )
    solicitud = await crear_solicitud(socio_habilitado, payload, db_session)
    assert (await obtener_resumen_socio(socio_habilitado, db_session)).saldo_salud_disponible == 90000.0

    motivo = "Comprobante de copago no legible ni timbrado."
    resuelta = await resolver_solicitud_reembolso(
        solicitud.id, "RECHAZAR", motivo, usuario_admin, db_session
    )
    assert resuelta.estado == EstadoReembolso.RECHAZADO

    # Saldo 100% devuelto
    resumen = await obtener_resumen_socio(socio_habilitado, db_session)
    assert resumen.saldo_salud_disponible == 150000.0

    # Comprobar correo de rechazo emitido en el buzón
    correos = listar_buzon_memoria(filtro=solicitud.codigo)
    correo_rech = next((c for c in correos if c.get("tipo") == "resolucion_reembolso"), None)
    assert correo_rech is not None
    assert "RECHAZADA" in correo_rech["asunto"]
    assert motivo in correo_rech["resumenEstado"]


# [ESTUDIANTE INFORMÁTICA] Valida que los correos de recepción y resolución de reembolso se integren y persistan en el buzón institucional.
async def test_correos_reembolso_emitidos_y_persistentes_en_buzon(
    db_session: AsyncSession, socio_habilitado: User, usuario_admin: User
) -> None:
    payload = ReembolsoCreateRequest(
        tipo_prestacion="examenes",
        descripcion="Hemograma completo y perfil lipídico",
        beneficiario_nombre=socio_habilitado.nombre_completo,
        beneficiario_parentesco="Titular",
        monto_boleta=30000,
        monto_copago=20000,
        fecha_atencion=date.today() - timedelta(days=2),
        fecha_boleta=date.today() - timedelta(days=2),
        tipo_documento="bono_copago",
        declaracion_aceptada=True,
    )
    solicitud = await crear_solicitud(socio_habilitado, payload, db_session)
    await resolver_solicitud_reembolso(solicitud.id, "APROBAR", "", usuario_admin, db_session)

    buzon_data = await AfiliacionService.obtener_buzon(db_session, q=solicitud.codigo)
    assert buzon_data["total"] >= 1
    folios_buzon = [c.get("folio") for c in buzon_data["correos"]]
    assert solicitud.codigo in folios_buzon
