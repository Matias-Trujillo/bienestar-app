"""Pruebas automatizadas de la Sección 3: Reembolsos Médicos en Vista Admin (Ayuda Asistida).

Valida:
1. `listar_socios_para_asistencia` excluye siempre al operador autenticado y expone saldo + carencia real.
2. En `modo_asistido=True`, el backend bloquea con PermissionError (HTTP 403) que un admin solicite para sí mismo.
3. En `modo_asistido=True`, bloquea a roles sin facultad operativa (`SOCIO` y `AUDITOR`).
4. En `modo_asistido=True`, bloquea solicitudes para trabajadores con menos de 6 meses de carencia.
5. Permite crear una solicitud asistida válida para un trabajador habilitado, descontando de su saldo y auditando.
"""
from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog, User, UserRole
from app.schemas.reembolso import ReembolsoCreateRequest
from app.services.reembolso_service import (
    crear_solicitud,
    listar_socios_para_asistencia,
    obtener_resumen_socio,
)


def _payload_asistido(socio_id: int | None, socio_nombre: str) -> ReembolsoCreateRequest:
    hoy = date.today()
    return ReembolsoCreateRequest(
        socio_id=socio_id,
        modo_asistido=True,
        tipo_prestacion="farmacia",
        descripcion="Compra medicamentos recetados en oficina",
        beneficiario_nombre=socio_nombre,
        beneficiario_parentesco="Titular",
        monto_boleta=30000,
        monto_copago=20000,
        fecha_atencion=hoy,
        fecha_boleta=hoy,
        tipo_documento="boleta_detallada",
        declaracion_aceptada=True,
    )


@pytest.mark.asyncio
async def test_listar_socios_para_asistencia_excluye_al_propio_admin(
    db_session: AsyncSession,
    usuario_admin: User,
    socio_habilitado: User,
    socio_nuevo: User,
):
    lista = await listar_socios_para_asistencia(usuario_admin, db_session)
    ids = {item.id for item in lista}
    assert usuario_admin.id not in ids
    assert socio_habilitado.id in ids
    assert socio_nuevo.id in ids

    hab = next(i for i in lista if i.id == socio_habilitado.id)
    nuevo = next(i for i in lista if i.id == socio_nuevo.id)
    assert hab.puede_solicitar is True
    assert hab.saldo_salud_disponible == 150000
    assert nuevo.puede_solicitar is False


@pytest.mark.asyncio
async def test_modo_asistido_bloquea_autosolicitud_del_admin(
    db_session: AsyncSession,
    usuario_admin: User,
):
    payload = _payload_asistido(usuario_admin.id, usuario_admin.nombre_completo)
    with pytest.raises(PermissionError) as exc:
        await crear_solicitud(usuario_admin, payload, db_session)
    assert "no puede solicitar un reembolso para usted mismo" in str(exc.value).lower()


@pytest.mark.asyncio
async def test_modo_asistido_bloquea_socio_y_auditor(
    db_session: AsyncSession,
    socio_habilitado: User,
    socio_nuevo: User,
):
    payload = _payload_asistido(socio_nuevo.id, socio_nuevo.nombre_completo)

    with pytest.raises(PermissionError):
        await crear_solicitud(socio_habilitado, payload, db_session)

    auditor = User(
        rut="17.345.678-6",
        email="auditor.reemb@mperalillo.cl",
        nombre_completo="Auditor Reemb",
        hashed_password="hash",
        rol=UserRole.AUDITOR,
        is_active=True,
        meses_antiguedad=36,
    )
    db_session.add(auditor)
    await db_session.commit()

    with pytest.raises(PermissionError):
        await crear_solicitud(auditor, payload, db_session)


@pytest.mark.asyncio
async def test_modo_asistido_exige_carencia_6_meses_en_trabajador(
    db_session: AsyncSession,
    usuario_admin: User,
    socio_nuevo: User,
):
    payload = _payload_asistido(socio_nuevo.id, socio_nuevo.nombre_completo)
    with pytest.raises(ValueError) as exc:
        await crear_solicitud(usuario_admin, payload, db_session)
    assert "6 meses" in str(exc.value).lower() or "carencia" in str(exc.value).lower()


@pytest.mark.asyncio
async def test_modo_asistido_crea_solicitud_y_descuenta_saldo_del_trabajador(
    db_session: AsyncSession,
    usuario_admin: User,
    socio_habilitado: User,
):
    payload = _payload_asistido(socio_habilitado.id, socio_habilitado.nombre_completo)
    sol = await crear_solicitud(usuario_admin, payload, db_session)

    assert sol.socio_id == socio_habilitado.id
    assert sol.monto_reembolso == 20000

    resumen_trabajador = await obtener_resumen_socio(socio_habilitado, db_session)
    resumen_admin = await obtener_resumen_socio(usuario_admin, db_session)
    assert resumen_trabajador.saldo_salud_disponible == 130000
    assert resumen_admin.saldo_salud_disponible == 150000

    log = await db_session.scalar(
        select(AuditLog).where(
            AuditLog.modulo == "REEMBOLSOS",
            AuditLog.accion == "INGRESAR_REEMBOLSO_ASISTIDO",
        )
    )
    assert log is not None
    assert log.usuario_id == usuario_admin.id
