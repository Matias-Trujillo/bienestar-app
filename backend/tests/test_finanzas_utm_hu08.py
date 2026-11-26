"""Pruebas automatizadas de HU-08: Cálculo y Registro del Aporte Municipal en UTM."""
from datetime import date

import pytest
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog, User
from app.schemas.finanzas import AporteMunicipalUtmIn
from app.services.finanzas_service import FinanzasService


def test_schema_utm_rechaza_valor_fuera_de_rango():
    anio_actual = date.today().year
    with pytest.raises(ValidationError):
        AporteMunicipalUtmIn(
            anio_fiscal=anio_actual,
            mes_transferencia=f"{anio_actual}-11",
            valor_utm_clp=5000,  # Muy por debajo del rango válido
            numero_decreto=f"DEC-100/{anio_actual}",
            fecha_transferencia=f"{anio_actual}-11-25",
        )


@pytest.mark.asyncio
async def test_registrar_aporte_municipal_utm_e_impacto_presupuesto(
    db_session: AsyncSession, socio_habilitado: User, usuario_admin: User
) -> None:
    anio_actual = date.today().year

    # 1. Consultar padrón congelado al 31-dic (socio_habilitado tiene 14 meses >= 12)
    padron = await FinanzasService.obtener_padron_31_dic(db_session, anio_fiscal=anio_actual)
    assert padron.socios_congelados_31_dic >= 1
    assert padron.factor_utm == 4
    assert padron.fecha_corte == f"{anio_actual - 1}-12-31"

    # 2. Registrar subvención municipal con valor UTM = $68.000
    payload = AporteMunicipalUtmIn(
        anio_fiscal=anio_actual,
        mes_transferencia=f"{anio_actual}-11",
        valor_utm_clp=68000,
        numero_decreto=f"DEC-ALC-450/{anio_actual}",
        fecha_transferencia=f"{anio_actual}-11-25",
        observaciones="Subvención municipal anual Ley 19.754",
    )
    aporte = await FinanzasService.registrar_aporte_utm(
        db_session, payload, usuario_admin, ip_origen="192.168.10.25"
    )
    esperado = padron.socios_congelados_31_dic * 4 * 68000
    assert aporte.codigo.startswith(f"UTM-{anio_actual}-")
    assert aporte.monto_total_clp == esperado
    assert aporte.numero_decreto == f"DEC-ALC-450/{anio_actual}"

    # 3. Verificar impacto real en estado financiero
    estado = await FinanzasService.obtener_estado_financiero(db_session)
    assert estado["total_aportes_utm"] == esperado
    assert estado["cantidad_aportes_utm"] == 1
    assert estado["fondo_general"] == esperado

    # 4. Verificar registro en bitácora de auditoría con IP real
    log = await db_session.scalar(
        select(AuditLog).where(AuditLog.recurso_id == aporte.codigo)
    )
    assert log is not None
    assert log.accion == "REGISTRAR_APORTE_MUNICIPAL_UTM"
    assert log.ip_origen == "192.168.10.25"

    # 5. Verificar que una conciliación Cód. 47 (cuotas 4%) suma al presupuesto real
    from app.schemas.finanzas import ConciliacionPlanillaIn, FilaCod47In
    from app.services.conciliacion_service import ConciliacionService

    await ConciliacionService.procesar_conciliacion_cod47(
        db_session,
        ConciliacionPlanillaIn(
            periodo=f"{anio_actual}-11",
            archivo_rrhh_nombre="rrhh_nov.csv",
            monto_cartola_banco=32000,
            comprobante_banco_ref="TRF-BE-001",
            filas_cod47=[
                FilaCod47In(
                    rut=socio_habilitado.rut,
                    nombre=socio_habilitado.nombre_completo,
                    monto_esperado=32000,
                    monto_descontado=32000,
                )
            ],
        ),
        usuario_admin,
        ip_origen="192.168.10.25",
    )
    estado_con_cuotas = await FinanzasService.obtener_estado_financiero(db_session)
    assert estado_con_cuotas["total_cuotas_4pct_conciliadas"] == 32000
    assert estado_con_cuotas["total_ingresos_reales"] == esperado + 32000
    assert estado_con_cuotas["fondo_general"] == esperado + 32000


@pytest.mark.asyncio
async def test_egresos_filtrados_estrictamente_por_anio_fiscal(
    db_session: AsyncSession, socio_habilitado: User
) -> None:
    from datetime import datetime, timezone
    from app.models import EstadoReembolso, SolicitudReembolso, TipoPrestacion

    anio_actual = date.today().year
    anio_anterior = anio_actual - 1

    sol_anterior = SolicitudReembolso(
        codigo="RMB-HIST-ANT01",
        socio_id=socio_habilitado.id,
        tipo_prestacion=TipoPrestacion.CONSULTA,
        descripcion="Reembolso del año anterior",
        beneficiario_nombre=socio_habilitado.nombre_completo,
        beneficiario_parentesco="Titular",
        monto_boleta=60000,
        monto_copago=50000,
        monto_reembolso=40000,
        fecha_atencion=date(anio_anterior, 6, 15),
        fecha_boleta=date(anio_anterior, 6, 15),
        declaracion_aceptada=True,
        estado=EstadoReembolso.PAGADO,
        created_at=datetime(anio_anterior, 6, 16, 12, 0, 0, tzinfo=timezone.utc),
    )
    sol_actual = SolicitudReembolso(
        codigo="RMB-HIST-ACT01",
        socio_id=socio_habilitado.id,
        tipo_prestacion=TipoPrestacion.FARMACIA,
        descripcion="Reembolso del año actual",
        beneficiario_nombre=socio_habilitado.nombre_completo,
        beneficiario_parentesco="Titular",
        monto_boleta=30000,
        monto_copago=25000,
        monto_reembolso=20000,
        fecha_atencion=date(anio_actual, 3, 10),
        fecha_boleta=date(anio_actual, 3, 10),
        declaracion_aceptada=True,
        estado=EstadoReembolso.PAGADO,
        created_at=datetime(anio_actual, 3, 11, 12, 0, 0, tzinfo=timezone.utc),
    )
    db_session.add_all([sol_anterior, sol_actual])
    await db_session.commit()

    estado_actual = await FinanzasService.obtener_estado_financiero(db_session, anio_fiscal=anio_actual)
    estado_anterior = await FinanzasService.obtener_estado_financiero(db_session, anio_fiscal=anio_anterior)

    assert estado_actual["total_egresos_salud"] == 20000
    assert estado_anterior["total_egresos_salud"] == 40000
