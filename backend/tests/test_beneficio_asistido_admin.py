"""Pruebas automatizadas de la Sección 4: Beneficios Sociales en Vista Admin (Ayuda Asistida).

Valida:
1. Fix del bug `0 or 12`: un socio con `0` meses de antigüedad NO cumple los 6 meses de carencia.
2. `listar_socios_para_asistencia` excluye siempre al operador autenticado.
3. `postular_beneficio` con `modo_asistido=True` bloquea con HTTP 403 la auto-postulación del admin.
4. Bloquea con HTTP 403 a roles sin facultad operativa (`SOCIO` / `AUDITOR`).
5. Bloquea con HTTP 400 a trabajadores en carencia (`0` o `2` meses).
6. Registra exitosamente una postulación asistida para un trabajador habilitado con auditoría `POSTULAR_BENEFICIO_ASISTIDO`.
"""
import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog, User, UserRole
from app.schemas.beneficios import PostulacionBeneficioCreate
from app.services.beneficios_service import BeneficiosService


def _payload_beneficio_asistido(socio_id: int) -> PostulacionBeneficioCreate:
    return PostulacionBeneficioCreate(
        tipo_bono="escolaridad",
        socio_id=socio_id,
        modo_asistido=True,
        motivo="Postulación asistida en oficina",
        documento_tipo="Certificado de alumno regular",
        nombre_beneficiario="Hijo Estudiante",
        institucion_educacional="Liceo Víctor Jara",
        nivel_educacional="Media",
        edad_estudiante=15,
    )


def test_verificar_antiguedad_socio_rechaza_cero_meses():
    """Regresión del bug `0 or 12`: 0 meses nunca debe pasar como 12 meses."""
    socio_cero = User(
        rut="19.188.436-1",
        email="cero@mperalillo.cl",
        nombre_completo="Socio Recién Ingresado",
        hashed_password="hash",
        rol=UserRole.SOCIO,
        is_active=True,
        meses_antiguedad=0,
        antiguedad="0 Meses",
    )
    cumple, meses, _ = BeneficiosService.verificar_antiguedad_socio(socio_cero)
    assert cumple is False
    assert meses == 0


@pytest.mark.asyncio
async def test_listar_socios_beneficios_excluye_al_propio_admin(
    db_session: AsyncSession,
    usuario_admin: User,
    socio_habilitado: User,
    socio_nuevo: User,
):
    lista = await BeneficiosService.listar_socios_para_asistencia(db_session, usuario_admin)
    ids = {item.id for item in lista}
    assert usuario_admin.id not in ids
    assert socio_habilitado.id in ids
    assert socio_nuevo.id in ids

    hab = next(i for i in lista if i.id == socio_habilitado.id)
    nuevo = next(i for i in lista if i.id == socio_nuevo.id)
    assert hab.cumple_antiguedad is True
    assert nuevo.cumple_antiguedad is False


@pytest.mark.asyncio
async def test_beneficio_asistido_bloquea_autopostulacion_del_admin(
    db_session: AsyncSession,
    usuario_admin: User,
    param_grado_15,
):
    payload = _payload_beneficio_asistido(usuario_admin.id)
    with pytest.raises(HTTPException) as exc:
        await BeneficiosService.postular_beneficio(db_session, usuario_admin, payload)
    assert exc.value.status_code == 403
    assert "no puede solicitar un beneficio social para usted mismo" in str(exc.value.detail).lower()


@pytest.mark.asyncio
async def test_beneficio_asistido_bloquea_socio_y_auditor(
    db_session: AsyncSession,
    socio_habilitado: User,
    socio_nuevo: User,
    param_grado_15,
):
    payload = _payload_beneficio_asistido(socio_nuevo.id)
    with pytest.raises(HTTPException) as exc_socio:
        await BeneficiosService.postular_beneficio(db_session, socio_habilitado, payload)
    assert exc_socio.value.status_code == 403

    auditor = User(
        rut="17.345.678-6",
        email="auditor.benef@mperalillo.cl",
        nombre_completo="Auditor Benef",
        hashed_password="hash",
        rol=UserRole.AUDITOR,
        is_active=True,
        meses_antiguedad=36,
    )
    db_session.add(auditor)
    await db_session.commit()

    with pytest.raises(HTTPException) as exc_aud:
        await BeneficiosService.postular_beneficio(db_session, auditor, payload)
    assert exc_aud.value.status_code == 403


@pytest.mark.asyncio
async def test_beneficio_asistido_exige_6_meses_y_crea_solicitud_para_socio_habilitado(
    db_session: AsyncSession,
    usuario_admin: User,
    socio_nuevo: User,
    socio_habilitado: User,
    param_grado_15,
):
    # Trabajador en carencia (< 6 meses) rechazado con 400
    with pytest.raises(HTTPException) as exc_carencia:
        await BeneficiosService.postular_beneficio(
            db_session, usuario_admin, _payload_beneficio_asistido(socio_nuevo.id)
        )
    assert exc_carencia.value.status_code == 400

    # Trabajador habilitado (>= 6 meses) creado a su nombre con auditoría asistida
    sol = await BeneficiosService.postular_beneficio(
        db_session, usuario_admin, _payload_beneficio_asistido(socio_habilitado.id)
    )
    assert sol.socio_id == socio_habilitado.id
    assert sol.tipo_bono == "escolaridad"
    assert sol.monto_calculado == 60000  # 8% de 750.000
    assert sol.estado == "PENDIENTE"

    log = await db_session.scalar(
        select(AuditLog).where(
            AuditLog.modulo == "BENEFICIOS",
            AuditLog.accion == "POSTULAR_BENEFICIO_ASISTIDO",
        )
    )
    assert log is not None
    assert log.usuario_id == usuario_admin.id
