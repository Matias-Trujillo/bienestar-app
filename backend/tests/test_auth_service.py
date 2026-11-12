"""Pruebas automatizadas para el Servicio de Autenticación y Seguridad (Punto 2).

[ESTUDIANTE INFORMÁTICA] Este módulo valida las políticas de seguridad institucional:
  - Primer inicio de sesión con contraseña temporal y flag de cambio obligatorio.
  - Validación de robustez de contraseña (>= 8 caracteres, no idéntica a la anterior, sin RUN).
  - Cambio obligatorio (sin requerir clave actual) vs. cambio de rutina (con clave actual).
  - Bloqueo preventivo de cuenta al alcanzar 5 intentos fallidos consecutivos.
  - Trazabilidad y auditoría inmutable de eventos de seguridad (bloqueos y cambios de clave).
"""
import json
import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import (
    CambiarPasswordPropiaIn,
    LoginRequest,
    cambiar_password_propia,
    guardar_seguridad_usuario,
    login,
    obtener_seguridad_usuario,
)
from app.core.security import get_password_hash, verify_password
from app.models import AuditLog, ParametroSistema, User, UserRole


@pytest.fixture
async def socio_temporal(db_session: AsyncSession) -> User:
    """Crea un socio con contraseña temporal de aprobación 'Peralillo#1357' y cambio obligatorio activo."""
    user = User(
        rut="13.579.246-2",
        email="gvaldes@mperalillo.cl",
        nombre_completo="Gonzalo Valdés Mardones",
        hashed_password=get_password_hash("Peralillo#1357"),
        rol=UserRole.SOCIO,
        is_active=True,
        departamento="Dirección de Administración y Finanzas (DAF)",
        antiguedad="0 Meses (Período Carencia)",
        meses_antiguedad=0,
        estado_previsional="Al día",
        saldo_salud_disponible=150000,
        saldo_salud_total_anual=150000,
        cargas_registradas=1,
    )
    db_session.add(user)
    await db_session.flush()

    # Parámetro SEC_USR_<id> con cambio obligatorio c: True
    await guardar_seguridad_usuario(
        db_session,
        user.id,
        intentos=0,
        bloqueada=False,
        debe_cambiar=True,
    )
    await db_session.commit()
    await db_session.refresh(user)
    return user


# [ESTUDIANTE INFORMÁTICA] 1. Valida que el login con clave temporal entregue debeCambiarPassword=True.
async def test_login_con_clave_temporal_marca_debe_cambiar_password(
    db_session: AsyncSession, socio_temporal: User
) -> None:
    req = LoginRequest(username="13.579.246-2", password="Peralillo#1357")
    resp = await login(req, db=db_session)

    assert resp.access_token is not None
    assert len(resp.access_token) > 20
    assert resp.user.rut == "13.579.246-2"
    assert resp.user.debeCambiarPassword is True
    assert resp.user.estadoPassword == "cambio_pendiente"


# [ESTUDIANTE INFORMÁTICA] 2. Valida que el socio pueda cambiar su clave temporal sin password_actual previa.
async def test_cambio_password_obligatorio_exitoso(
    db_session: AsyncSession, socio_temporal: User
) -> None:
    body = CambiarPasswordPropiaIn(nueva_password="PeralilloSeguro2026!")
    user_out = await cambiar_password_propia(body, user=socio_temporal, db=db_session)

    assert user_out.debeCambiarPassword is False
    assert user_out.estadoPassword == "vigente"

    # Verificar que el hash se haya actualizado con la nueva contraseña
    await db_session.refresh(socio_temporal)
    assert verify_password("PeralilloSeguro2026!", socio_temporal.hashed_password) is True
    assert verify_password("Peralillo#1357", socio_temporal.hashed_password) is False

    # Verificar que el parámetro SEC_USR_<id> tenga c: false
    sec = await obtener_seguridad_usuario(db_session, socio_temporal.id)
    assert sec["c"] is False
    assert sec["u"] is not None


# [ESTUDIANTE INFORMÁTICA] 3. Valida que el sistema rechace reingresar la misma clave temporal como nueva contraseña.
async def test_cambio_password_rechaza_misma_clave_temporal(
    db_session: AsyncSession, socio_temporal: User
) -> None:
    body = CambiarPasswordPropiaIn(nueva_password="Peralillo#1357")
    with pytest.raises(HTTPException) as exc_info:
        await cambiar_password_propia(body, user=socio_temporal, db=db_session)

    assert exc_info.value.status_code == 400
    assert "distinta a la clave temporal o anterior" in exc_info.value.detail


# [ESTUDIANTE INFORMÁTICA] 4. Valida que el sistema rechace contraseñas menores a 8 caracteres.
async def test_cambio_password_rechaza_clave_corta(
    db_session: AsyncSession, socio_temporal: User
) -> None:
    body = CambiarPasswordPropiaIn(nueva_password="Corta1!")
    with pytest.raises(HTTPException) as exc_info:
        await cambiar_password_propia(body, user=socio_temporal, db=db_session)

    assert exc_info.value.status_code == 400
    assert "al menos 8 caracteres" in exc_info.value.detail


# [ESTUDIANTE INFORMÁTICA] 5. Valida que el sistema rechace contraseñas que contengan los dígitos del RUN.
async def test_cambio_password_rechaza_clave_con_rut(
    db_session: AsyncSession, socio_temporal: User
) -> None:
    # RUN del socio: 13.579.246-2 -> cuerpo '13579246'
    body = CambiarPasswordPropiaIn(nueva_password="Peralillo13579246!")
    with pytest.raises(HTTPException) as exc_info:
        await cambiar_password_propia(body, user=socio_temporal, db=db_session)

    assert exc_info.value.status_code == 400
    assert "no puede contener su RUN" in exc_info.value.detail


# [ESTUDIANTE INFORMÁTICA] 6. Valida que en cambios de rutina (debeCambiar=False) se exija la contraseña actual válida.
async def test_cambio_password_rutina_exige_clave_actual(
    db_session: AsyncSession, socio_temporal: User
) -> None:
    # Desactivar obligatoriedad previa para simular un cambio voluntario
    await guardar_seguridad_usuario(
        db_session, socio_temporal.id, intentos=0, bloqueada=False, debe_cambiar=False
    )
    await db_session.commit()

    # 6a. Intento sin contraseña actual -> Rechazado
    body_sin_actual = CambiarPasswordPropiaIn(nueva_password="NuevaClaveValida2026!")
    with pytest.raises(HTTPException) as exc1:
        await cambiar_password_propia(body_sin_actual, user=socio_temporal, db=db_session)
    assert exc1.value.status_code == 400
    assert "Debe ingresar su contraseña actual" in exc1.value.detail

    # 6b. Intento con contraseña actual errónea -> Rechazado
    body_clave_erronea = CambiarPasswordPropiaIn(
        password_actual="ClaveEquivocada999!",
        nueva_password="NuevaClaveValida2026!"
    )
    with pytest.raises(HTTPException) as exc2:
        await cambiar_password_propia(body_clave_erronea, user=socio_temporal, db=db_session)
    assert exc2.value.status_code == 400
    assert "no es correcta" in exc2.value.detail

    # 6c. Intento con contraseña actual correcta -> Aprobado
    body_correcto = CambiarPasswordPropiaIn(
        password_actual="Peralillo#1357",
        nueva_password="NuevaClaveValida2026!"
    )
    res = await cambiar_password_propia(body_correcto, user=socio_temporal, db=db_session)
    assert res.estadoPassword == "vigente"


# [ESTUDIANTE INFORMÁTICA] 7. Valida bloqueo preventivo de cuenta tras 5 intentos fallidos consecutivos y auditoría forense.
async def test_bloqueo_despues_de_5_intentos_fallidos(
    db_session: AsyncSession, socio_temporal: User
) -> None:
    # Intentos 1 al 4: Debe responder 401 informando los intentos restantes
    for i in range(1, 5):
        with pytest.raises(HTTPException) as exc:
            await login(
                LoginRequest(username="13.579.246-2", password="ClaveErronea!"),
                db=db_session,
            )
        assert exc.value.status_code == 401
        assert f"{5 - i} intento(s)" in exc.value.detail

    # Intento 5: Debe responder 403 notificando el bloqueo preventivo
    with pytest.raises(HTTPException) as exc5:
        await login(
            LoginRequest(username="13.579.246-2", password="ClaveErronea!"),
            db=db_session,
        )
    assert exc5.value.status_code == 403
    assert "BLOQUEADA por seguridad" in exc5.value.detail

    # Verificar que el parámetro en BD marque bloqueada=True
    sec = await obtener_seguridad_usuario(db_session, socio_temporal.id)
    assert sec["b"] is True
    assert sec["i"] >= 5

    # Intento 6 (incluso con la contraseña correcta): Debe ser rechazado con 403
    with pytest.raises(HTTPException) as exc6:
        await login(
            LoginRequest(username="13.579.246-2", password="Peralillo#1357"),
            db=db_session,
        )
    assert exc6.value.status_code == 403
    assert "BLOQUEADA" in exc6.value.detail

    # Verificar bitácora de auditoría inmutable
    audit = await db_session.scalar(
        select(AuditLog).where(
            AuditLog.usuario_id == socio_temporal.id,
            AuditLog.accion == "BLOQUEO_AUTOMATICO_CLAVE"
        )
    )
    assert audit is not None
    assert audit.modulo == "SEGURIDAD"


# [ESTUDIANTE INFORMÁTICA] 8. Valida que un login exitoso resetee el contador de intentos fallidos.
async def test_login_exitoso_reinicia_intentos_fallidos(
    db_session: AsyncSession, socio_temporal: User
) -> None:
    # 2 intentos fallidos previos
    for _ in range(2):
        try:
            await login(
                LoginRequest(username="13.579.246-2", password="ClaveErronea!"),
                db=db_session,
            )
        except HTTPException:
            pass

    sec_intermedio = await obtener_seguridad_usuario(db_session, socio_temporal.id)
    assert sec_intermedio["i"] == 2

    # Login con contraseña correcta
    res = await login(
        LoginRequest(username="13.579.246-2", password="Peralillo#1357"),
        db=db_session,
    )
    assert res.access_token is not None

    sec_final = await obtener_seguridad_usuario(db_session, socio_temporal.id)
    assert sec_final["i"] == 0
