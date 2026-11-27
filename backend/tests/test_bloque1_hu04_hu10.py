"""Pruebas automatizadas del Bloque 1: HU-04 (Liquidación Pago Cheque/Transferencia) y HU-10 (Recepción Conforme)."""
from datetime import date, timedelta
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reembolso import EstadoReembolso
from app.models.user import User
from app.schemas.reembolso import ReembolsoCreateRequest
from app.services.reembolso_service import (
    confirmar_recepcion_conforme_reembolso,
    crear_solicitud,
    registrar_pago_reembolso,
    resolver_solicitud_reembolso,
    solicitud_to_out,
)


@pytest.mark.asyncio
async def test_flujo_completo_hu04_pago_y_hu10_recepcion_conforme(
    db_session: AsyncSession, socio_habilitado: User, usuario_admin: User
) -> None:
    # 1. Crear solicitud (HU-03)
    payload = ReembolsoCreateRequest(
        tipo_prestacion="consulta",
        descripcion="Consulta medicina general",
        beneficiario_nombre=socio_habilitado.nombre_completo,
        beneficiario_parentesco="Titular",
        monto_boleta=40000,
        monto_copago=25000,
        fecha_atencion=date.today() - timedelta(days=3),
        fecha_boleta=date.today() - timedelta(days=3),
        tipo_documento="boleta_detallada",
        declaracion_aceptada=True,
    )
    sol = await crear_solicitud(socio_habilitado, payload, db_session)
    assert sol.estado == EstadoReembolso.EN_REVISION

    # 2. Aprobar solicitud (HU-04 paso 1)
    sol = await resolver_solicitud_reembolso(
        solicitud_id=sol.id,
        accion="APROBAR",
        motivo_rechazo="",
        admin_user=usuario_admin,
        db=db_session,
    )
    assert sol.estado == EstadoReembolso.APROBADO

    # 3. Registrar pago con cheque/transferencia (HU-04 paso 2 -> PAGADO)
    sol = await registrar_pago_reembolso(
        solicitud_id=sol.id,
        metodo_pago="Cheque",
        numero_cheque_o_transferencia="CHQ-998877",
        banco_emisor="BancoEstado",
        fecha_pago="2026-11-25",
        hora_proceso="15:40",
        admin_user=usuario_admin,
        db=db_session,
    )
    assert sol.estado == EstadoReembolso.PAGADO
    assert sol.pago is not None
    assert sol.pago.numero_cheque_o_transferencia == "CHQ-998877"
    assert sol.pago.fecha_pago == "2026-11-25"
    assert sol.pago.hora_proceso == "15:40"

    # 4. Confirmar Recepción Conforme por el socio (HU-10)
    sol = await confirmar_recepcion_conforme_reembolso(
        solicitud_id=sol.id,
        user=socio_habilitado,
        db=db_session,
    )
    assert sol.pago is not None
    assert sol.pago.recepcion_conforme is True
    assert sol.pago.recepcion_conforme_at is not None

    out = solicitud_to_out(sol)
    assert out.estado == "pagado"
    assert out.numero_cheque_o_transferencia == "CHQ-998877"
    assert out.recepcion_conforme is True


@pytest.mark.asyncio
async def test_registrar_pago_bloquea_probidad_autopago_y_rol_auditor(
    db_session: AsyncSession, socio_habilitado: User, usuario_admin: User
) -> None:
    from fastapi import HTTPException
    from app.api.v1.endpoints.reembolsos import get_solicitud_detalle, patch_pagar_solicitud
    from app.models.user import UserRole
    from app.schemas.reembolso import RegistrarPagoReembolsoRequest

    # Crear y aprobar solicitud del propio directivo (aprobada por otro usuario)
    otro_directivo = User(
        rut="12.345.678-9",
        email="presidente.hu04@mperalillo.cl",
        nombre_completo="Presidente HU04",
        hashed_password="hash",
        rol=UserRole.PRESIDENTE,
        is_active=True,
        meses_antiguedad=60,
    )
    auditor = User(
        rut="17.345.678-6",
        email="auditor.hu04@mperalillo.cl",
        nombre_completo="Auditor HU04",
        hashed_password="hash",
        rol=UserRole.AUDITOR,
        is_active=True,
        meses_antiguedad=36,
    )
    db_session.add_all([otro_directivo, auditor])
    await db_session.commit()

    payload = ReembolsoCreateRequest(
        tipo_prestacion="farmacia",
        descripcion="Compra receta directivo",
        beneficiario_nombre=usuario_admin.nombre_completo,
        beneficiario_parentesco="Titular",
        monto_boleta=20000,
        monto_copago=15000,
        fecha_atencion=date.today() - timedelta(days=2),
        fecha_boleta=date.today() - timedelta(days=2),
        tipo_documento="boleta_detallada",
        declaracion_aceptada=True,
    )
    sol = await crear_solicitud(usuario_admin, payload, db_session)
    sol = await resolver_solicitud_reembolso(
        solicitud_id=sol.id,
        accion="APROBAR",
        motivo_rechazo="",
        admin_user=otro_directivo,
        db=db_session,
    )

    body_pago = RegistrarPagoReembolsoRequest(
        metodo_pago="Transferencia Bancaria",
        numero_cheque_o_transferencia="TRF-554433",
        banco_emisor="BancoEstado",
        fecha_pago="2026-11-26",
        hora_proceso="10:15",
    )

    # 1. Auditor no puede registrar pagos (HTTP 403)
    with pytest.raises(HTTPException) as exc_aud:
        await patch_pagar_solicitud(sol.id, body_pago, user=auditor, db=db_session)
    assert exc_aud.value.status_code == 403

    # 2. Directivo no puede pagar su propio reembolso (HTTP 403 por probidad)
    with pytest.raises(HTTPException) as exc_propio:
        await patch_pagar_solicitud(sol.id, body_pago, user=usuario_admin, db=db_session)
    assert exc_propio.value.status_code == 403

    # 3. Otro directivo sí puede pagar y GET /solicitud/{id} devuelve los datos de pago
    pagado = await patch_pagar_solicitud(sol.id, body_pago, user=otro_directivo, db=db_session)
    assert pagado.numero_cheque_o_transferencia == "TRF-554433"

    detalle = await get_solicitud_detalle(sol.id, user=usuario_admin, db=db_session)
    assert detalle.estado == "pagado"
    assert detalle.numero_cheque_o_transferencia == "TRF-554433"
    assert detalle.metodo_pago == "Transferencia Bancaria"
