"""Pruebas automatizadas de la Sección 2: Creación directa de socio desde Afiliación (SOLID)."""
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.api.v1.endpoints.afiliacion import ROLES_CREACION_SOCIO, crear_socio_directo
from app.models import AuditLog, User, UserRole
from app.schemas.afiliacion import CrearSocioDirectoIn
from app.services.socio_creacion_service import SocioCreacionService


@pytest.mark.asyncio
async def test_crear_socio_directo_exitoso_con_auditoria_y_clave_temporal(
    db_session: AsyncSession,
    usuario_admin: User,
):
    payload = CrearSocioDirectoIn(
        rut="18.765.432-7",
        nombreCompleto="Sofía Paredes Muñoz",
        email="sparedes@mperalillo.cl",
        departamento="DIDECO",
        calidadContractual="Planta",
        grado="14",
        mesesAntiguedad=0,
        enviarCorreo=False,
    )

    service = SocioCreacionService()
    res = await crear_socio_directo(
        body=payload,
        current_user=usuario_admin,
        db=db_session,
        service=service,
    )

    assert res.rut == "18.765.432-7"
    assert res.email == "sparedes@mperalillo.cl"
    assert res.claveTemporal == "Peralillo#1876"
    assert res.mesesAntiguedad == 0

    creado = await db_session.get(User, res.id)
    assert creado is not None
    assert creado.rol == UserRole.SOCIO
    assert creado.is_active is True
    assert creado.debe_cambiar_password is True
    assert creado.saldo_salud_disponible == 150000

    log = await db_session.scalar(
        select(AuditLog).where(
            AuditLog.modulo == "AFILIACION",
            AuditLog.accion == "CREAR_SOCIO_DIRECTO",
            AuditLog.recurso_id == str(res.id),
        )
    )
    assert log is not None
    assert log.usuario_id == usuario_admin.id


@pytest.mark.asyncio
async def test_crear_socio_directo_rechaza_rut_o_correo_duplicado(
    db_session: AsyncSession,
    socio_habilitado: User,
    usuario_admin: User,
):
    service = SocioCreacionService()

    # Correo duplicado
    payload_email = CrearSocioDirectoIn(
        rut="19.188.436-1",
        nombreCompleto="Usuario Duplicado Correo",
        email=socio_habilitado.email,
        enviarCorreo=False,
    )
    with pytest.raises(HTTPException) as exc_email:
        await service.crear_socio_directo(db_session, payload_email, usuario_admin)
    assert exc_email.value.status_code == 409

    # RUN duplicado
    payload_rut = CrearSocioDirectoIn(
        rut=socio_habilitado.rut,
        nombreCompleto="Usuario Duplicado RUN",
        email="otro.correo@mperalillo.cl",
        enviarCorreo=False,
    )
    with pytest.raises(HTTPException) as exc_rut:
        await service.crear_socio_directo(db_session, payload_rut, usuario_admin)
    assert exc_rut.value.status_code == 409


def test_crear_socio_directo_valida_run_modulo_11():
    with pytest.raises(ValidationError):
        CrearSocioDirectoIn(
            rut="12.345.678-0",  # dígito verificador incorrecto
            nombreCompleto="RUN Inválido",
            email="invalido@mperalillo.cl",
        )


@pytest.mark.asyncio
async def test_crear_socio_directo_rechaza_socio_y_auditor(
    db_session: AsyncSession,
    socio_habilitado: User,
):
    checker = require_roles(*ROLES_CREACION_SOCIO)

    with pytest.raises(HTTPException) as exc_socio:
        await checker(user=socio_habilitado)
    assert exc_socio.value.status_code == 403

    auditor = User(
        rut="17.345.678-6",
        email="auditor.test@mperalillo.cl",
        nombre_completo="Auditor Test",
        hashed_password="hash",
        rol=UserRole.AUDITOR,
        is_active=True,
    )
    with pytest.raises(HTTPException) as exc_auditor:
        await checker(user=auditor)
    assert exc_auditor.value.status_code == 403
