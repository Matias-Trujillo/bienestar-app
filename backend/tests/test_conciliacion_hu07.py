"""Pruebas automatizadas de HU-07: Conciliación Cód. 47 RRHH y Cartola BancoEstado."""
from datetime import date, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AuditLog,
    EstadoReembolso,
    PagoReembolso,
    SolicitudReembolso,
    TipoPrestacion,
    User,
)
from app.schemas.finanzas import (
    CartolaBancoEstadoIn,
    ConciliacionPlanillaIn,
    FilaCod47In,
    MovimientoCartolaIn,
    RegularizarAporteIn,
)
from app.services.conciliacion_service import ConciliacionService


@pytest.mark.asyncio
async def test_conciliacion_cod47_brecha_y_regularizacion(
    db_session: AsyncSession, socio_habilitado: User, usuario_admin: User
) -> None:
    periodo = date.today().strftime("%Y-%m")

    # 1. Subir planilla RRHH con descuento inferior al esperado para gatillar BRECHA
    payload = ConciliacionPlanillaIn(
        periodo=periodo,
        archivo_rrhh_nombre="RRHH_Cod47_Test.csv",
        monto_cartola_banco=25000,
        comprobante_banco_ref="TRF-BE-998811",
        filas_cod47=[
            FilaCod47In(
                rut=socio_habilitado.rut,
                nombre=socio_habilitado.nombre_completo,
                monto_esperado=32000,
                monto_descontado=25000,
                observacion="Licencia médica parcial",
            )
        ],
    )
    resultado = await ConciliacionService.procesar_conciliacion_cod47(
        db_session, payload, usuario_admin, ip_origen="10.20.30.40"
    )
    assert resultado.codigo.startswith("CON-")
    assert resultado.monto_declarado_rrhh == 25000
    assert resultado.diferencia_clp == 0
    assert resultado.socios_con_brecha >= 1

    brecha = next(d for d in resultado.detalles if d.socio_id == socio_habilitado.id)
    assert brecha.estado == "BRECHA"
    assert brecha.diferencia == -7000

    # 2. Regularizar la brecha con modal de justificación
    reg = await ConciliacionService.regularizar_aporte(
        db_session,
        brecha.id,
        RegularizarAporteIn(
            motivo_regularizacion="Socio pagó diferencia de $7.000 por transferencia directa.",
            monto_regularizado=32000,
        ),
        usuario_admin,
        ip_origen="10.20.30.40",
    )
    assert reg.estado == "REGULARIZADO"
    assert reg.monto_descontado_cod47 == 32000
    assert reg.diferencia == 0

    # 3. Verificar auditoría con IP real
    log = await db_session.scalar(
        select(AuditLog).where(AuditLog.accion == "CONCILIAR_PLANILLA_COD47")
    )
    assert log is not None
    assert log.ip_origen == "10.20.30.40"


@pytest.mark.asyncio
async def test_cartola_bancoestado_cruce_cheques_y_alerta_60_dias(
    db_session: AsyncSession, socio_habilitado: User, usuario_admin: User
) -> None:
    # Crear un reembolso con cheque emitido hace 65 días (alerta > 60 días)
    fecha_antigua = (date.today() - timedelta(days=65)).isoformat()
    sol = SolicitudReembolso(
        codigo="RMB-TEST-CHQ01",
        socio_id=socio_habilitado.id,
        tipo_prestacion=TipoPrestacion.CONSULTA,
        descripcion="Consulta médica test conciliación",
        beneficiario_nombre=socio_habilitado.nombre_completo,
        beneficiario_parentesco="Titular",
        monto_boleta=50000,
        monto_copago=40000,
        monto_reembolso=32000,
        fecha_atencion=date.today() - timedelta(days=70),
        fecha_boleta=date.today() - timedelta(days=70),
        declaracion_aceptada=True,
        estado=EstadoReembolso.PAGADO,
    )
    db_session.add(sol)
    await db_session.flush()

    pago = PagoReembolso(
        solicitud_id=sol.id,
        metodo_pago="Cheque",
        numero_cheque_o_transferencia="0045123",
        banco_emisor="BancoEstado",
        fecha_pago=fecha_antigua,
        hora_proceso="11:30:00",
        pagado_por_id=usuario_admin.id,
        recepcion_conforme=False,
    )
    db_session.add(pago)
    await db_session.commit()

    # 1. Verificar que figura en cheques en tránsito con alerta_60_dias=True
    transito = await ConciliacionService.listar_cheques_en_transito(db_session)
    encontrado = next((c for c in transito if c.codigo_reembolso == "RMB-TEST-CHQ01"), None)
    assert encontrado is not None
    assert encontrado.dias_en_transito >= 65
    assert encontrado.alerta_60_dias is True

    # 2. Subir cartola BancoEstado con el cobro del cheque 45123 por $32.000
    cartola = CartolaBancoEstadoIn(
        archivo_nombre="Cartola_BancoEstado_Nov.csv",
        movimientos=[
            MovimientoCartolaIn(
                fecha=date.today().isoformat(),
                descripcion="PAGO CHEQUE CAMARA N° 45123",
                numero_documento="45123",
                monto_cargo=32000,
            ),
            MovimientoCartolaIn(
                fecha=date.today().isoformat(),
                descripcion="COMISION MANTENCION CUENTA",
                numero_documento="",
                monto_cargo=3500,
            ),
        ],
    )
    res = await ConciliacionService.conciliar_cartola_bancoestado(
        db_session, cartola, usuario_admin, ip_origen="10.20.30.41"
    )
    assert res.total_cheques_conciliados == 1
    assert res.monto_total_conciliado == 32000
    assert res.sin_coincidencia == 1

    # 3. Confirmar que el cheque quedó cerrado (recepcion_conforme=True) y ya no está en tránsito
    transito_despues = await ConciliacionService.listar_cheques_en_transito(db_session)
    assert all(c.codigo_reembolso != "RMB-TEST-CHQ01" for c in transito_despues)
