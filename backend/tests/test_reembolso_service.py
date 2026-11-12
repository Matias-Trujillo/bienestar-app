"""Pruebas automatizadas para el Servicio de Reembolsos Médicos (HU-03 y HU-04).

[ESTUDIANTE INFORMÁTICA] Este módulo valida las reglas de salud establecidas en el
reglamento municipal: carencia de 6 meses, caducidad de boletas de 30 días corridos,
retención preventiva de saldo y restitución automática inmediata al rechazar.
"""
from datetime import date, timedelta
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.reembolso import EstadoReembolso, SolicitudReembolso
from app.models.user import User
from app.schemas.reembolso import ReembolsoCreateRequest
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
