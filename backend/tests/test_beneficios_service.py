"""Pruebas automatizadas para el Servicio de Beneficios Sociales y Bonos (HU-05 y HU-06).

[ESTUDIANTE INFORMÁTICA] Este módulo valida que los montos de los beneficios no estén
fijos en el código, sino que se indexen dinámicamente al Sueldo Imponible de Referencia del
Grado 15 ($750.000 CLP), y que la simulación de nóminas masivas excluya a socios en carencia.
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.beneficios import ParametroSistema
from app.models.user import User
from app.schemas.beneficios import SimularNominaRequest
from app.services.beneficios_service import BeneficiosService


# [ESTUDIANTE INFORMÁTICA] Valida que el valor por defecto del Grado 15 sea $750.000 CLP si no existe en BD.
async def test_sueldo_base_grado_15_default(db_session: AsyncSession) -> None:
    sueldo_base = await BeneficiosService.get_sueldo_base_grado_15(db_session)
    assert sueldo_base == 750000


# [ESTUDIANTE INFORMÁTICA] Valida el cálculo del Bono de Vacaciones: 15% de $750.000 = $112.500 CLP.
async def test_catalogo_calculo_bono_vacaciones_15_porciento(
    db_session: AsyncSession, param_grado_15: ParametroSistema
) -> None:
    catalogo = await BeneficiosService.get_catalogo(db_session)
    bono_vacaciones = next((b for b in catalogo.bonos_contingencia if b.id == "vacaciones"), None)
    assert bono_vacaciones is not None
    assert bono_vacaciones.porcentaje == 15.0
    assert bono_vacaciones.monto_calculado == 112500


# [ESTUDIANTE INFORMÁTICA] Valida el cálculo del Bono de Escolaridad: 8% de $750.000 = $60.000 CLP.
async def test_catalogo_calculo_bono_escolaridad_8_porciento(
    db_session: AsyncSession, param_grado_15: ParametroSistema
) -> None:
    catalogo = await BeneficiosService.get_catalogo(db_session)
    bono_escolaridad = next((b for b in catalogo.bonos_contingencia if b.id == "escolaridad"), None)
    assert bono_escolaridad is not None
    assert bono_escolaridad.porcentaje == 8.0
    assert bono_escolaridad.monto_calculado == 60000


# [ESTUDIANTE INFORMÁTICA] Valida el cálculo del Bono de Nacimiento: 20% de $750.000 = $150.000 CLP.
async def test_catalogo_calculo_bono_nacimiento_20_porciento(
    db_session: AsyncSession, param_grado_15: ParametroSistema
) -> None:
    catalogo = await BeneficiosService.get_catalogo(db_session)
    bono_nacimiento = next((b for b in catalogo.bonos_contingencia if b.id == "nacimiento"), None)
    assert bono_nacimiento is not None
    assert bono_nacimiento.porcentaje == 20.0
    assert bono_nacimiento.monto_calculado == 150000


# [ESTUDIANTE INFORMÁTICA] Valida la reactividad: si el Grado 15 sube a $800.000, los bonos se recalculan automáticamente.
async def test_catalogo_actualizacion_dinamica_parametro(
    db_session: AsyncSession, param_grado_15: ParametroSistema
) -> None:
    param_grado_15.valor = "800000"
    db_session.add(param_grado_15)
    await db_session.commit()

    catalogo = await BeneficiosService.get_catalogo(db_session)
    bono_vac = next((b for b in catalogo.bonos_contingencia if b.id == "vacaciones"), None)
    assert bono_vac is not None
    # 15% de 800.000 = 120.000
    assert bono_vac.monto_calculado == 120000


# [ESTUDIANTE INFORMÁTICA] Valida la nómina masiva de Invierno (HU-06): incluye al socio habilitado y excluye al socio en carencia.
async def test_simulacion_nomina_invierno_filtra_carencia(
    db_session: AsyncSession,
    socio_habilitado: User,
    socio_nuevo: User,
    param_grado_15: ParametroSistema,
) -> None:
    req = SimularNominaRequest(
        tipo_bono="invierno",
        periodo="2026-07",
    )
    simulacion = await BeneficiosService.simular_nomina_masiva(db_session, req)

    assert simulacion.total_socios_beneficiados == 1
    assert simulacion.total_socios_excluidos == 1
    assert simulacion.monto_unitario == 112500
    assert simulacion.monto_total_requerido == 112500

    item_habilitado = next((i for i in simulacion.items if i.socio_id == socio_habilitado.id), None)
    item_excluido = next((i for i in simulacion.items if i.socio_id == socio_nuevo.id), None)

    assert item_habilitado is not None and item_habilitado.cumple_antiguedad is True
    assert item_habilitado.monto == 112500

    assert item_excluido is not None and item_excluido.cumple_antiguedad is False
    assert item_excluido.monto == 0
    assert "carencia" in (item_excluido.motivo_exclusion or "").lower() or "meses" in (item_excluido.motivo_exclusion or "").lower()
