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
