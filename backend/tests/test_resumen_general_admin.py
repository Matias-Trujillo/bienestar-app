"""Pruebas automatizadas de la Sección 1: Resumen General de la Vista Admin.

Valida:
1. Rotación de `ultimo_acceso` y `acceso_anterior` en `AuthService.login()`.
2. Agregación exacta en `DashboardAdminService`: novedades desde `acceso_anterior`,
   bandejas por aprobar (incluyendo reembolsos aprobados pendientes de pago),
   solicitudes rechazadas recientes, métricas de actividad y feed de `AuditLog`.
3. Autorización por rol en el endpoint `GET /api/v1/admin/resumen-general`.
"""
from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.admin import ROLES_DIRECTIVA_LECTURA, get_resumen_general_admin
from app.api.deps import require_roles
from app.core.security import get_password_hash
from app.models import (
    AuditLog,
    CalidadContractual,
    EstadoReembolso,
    EstadoSolicitud,
    OfertaLaboral,
    PerfilTalentoVecino,
    SolicitudAfiliacion,
    SolicitudBeneficio,
    SolicitudCargaFamiliar,
    SolicitudReembolso,
    TipoPrestacion,
    User,
    UserRole,
)
from app.services.auth_service import AuthService
from app.services.dashboard_admin_service import DashboardAdminService


@pytest.mark.asyncio
async def test_login_rota_ultimo_acceso_y_acceso_anterior(db_session: AsyncSession):
    """El segundo inicio de sesión debe mover el acceso previo a `acceso_anterior`."""
    usuario = User(
        rut="16.234.567-2",
        email="admin.accesos@mperalillo.cl",
        nombre_completo="Admin Accesos",
        hashed_password=get_password_hash("ClaveSegura#2026"),
        rol=UserRole.ADMIN,
        is_active=True,
        departamento="Administración",
        antiguedad="3 Años",
        meses_antiguedad=36,
    )
    db_session.add(usuario)
    await db_session.commit()

    auth_service = AuthService()

    # Primer login: acceso_anterior es None, ultimo_acceso queda poblado
    res1 = await auth_service.login(db_session, usuario.email, "ClaveSegura#2026")
    assert res1.user.accesoAnterior is None
    await db_session.refresh(usuario)
    primer_acceso = usuario.ultimo_acceso
    assert primer_acceso is not None

    # Simular que el primer login ocurrió hace 4 horas
    usuario.ultimo_acceso = datetime.now(timezone.utc) - timedelta(hours=4)
    await db_session.commit()

    # Segundo login: acceso_anterior debe heredar el timestamp previo
    res2 = await auth_service.login(db_session, usuario.email, "ClaveSegura#2026")
    assert res2.user.accesoAnterior is not None
    await db_session.refresh(usuario)
    assert usuario.acceso_anterior is not None
    assert usuario.ultimo_acceso is not None
    assert usuario.ultimo_acceso > usuario.acceso_anterior


@pytest.mark.asyncio
async def test_resumen_general_calcula_novedades_pendientes_rechazadas_y_actividad(
    db_session: AsyncSession,
    socio_habilitado: User,
    socio_nuevo: User,
    usuario_admin: User,
):
    """Valida todos los indicadores del Resumen General Admin con datos anteriores y posteriores al último acceso."""
    ahora = datetime.now(timezone.utc)
    hace_3h = ahora - timedelta(hours=3)
    hace_2d = ahora - timedelta(days=2)
    hace_1h = ahora - timedelta(hours=1)

    # El operador directivo tuvo su último acceso hace 3 horas
    usuario_admin.acceso_anterior = hace_3h
    usuario_admin.ultimo_acceso = ahora
    db_session.add(usuario_admin)

    # 1. Afiliaciones: 1 antigua pendiente + 1 nueva pendiente + 1 rechazada reciente
    db_session.add_all(
        [
            SolicitudAfiliacion(
                folio="AF-2026-0001",
                nombre_completo="Postulante Antiguo",
                run="13456789-9",
                grado="14",
                calidad_contractual=CalidadContractual.PLANTA,
                estado=EstadoSolicitud.PENDIENTE,
                created_at=hace_2d,
                updated_at=hace_2d,
            ),
            SolicitudAfiliacion(
                folio="AF-2026-0002",
                nombre_completo="Postulante Nuevo Hoy",
                run="15678901-2",
                grado="15",
                calidad_contractual=CalidadContractual.CONTRATA,
                estado=EstadoSolicitud.PENDIENTE,
                created_at=hace_1h,
                updated_at=hace_1h,
            ),
            SolicitudAfiliacion(
                folio="AF-2026-0003",
                nombre_completo="Postulante Rechazado",
                run="17890123-4",
                grado="16",
                calidad_contractual=CalidadContractual.CONTRATA,
                estado=EstadoSolicitud.RECHAZADA,
                observaciones_resolucion="Documentación incompleta",
                resuelto_at=hace_1h,
                created_at=hace_2d,
                updated_at=hace_1h,
            ),
        ]
    )

    # 2. Carga familiar nueva pendiente
    db_session.add(
        SolicitudCargaFamiliar(
            folio="CRG-2026-0001",
            socio_id=socio_habilitado.id,
            socio_nombre=socio_habilitado.nombre_completo,
            socio_rut=socio_habilitado.rut,
            nombre_completo="Hijo Carga Nueva",
            run="23456789-0",
            parentesco="Hijo/a",
            estado=EstadoSolicitud.PENDIENTE,
            created_at=hace_1h,
            updated_at=hace_1h,
        )
    )

    # 3. Reembolsos: 1 nuevo en revisión + 1 aprobado pendiente de pago + 1 rechazado reciente
    hoy = date.today()
    db_session.add_all(
        [
            SolicitudReembolso(
                codigo="RMB-2026-0101",
                socio_id=socio_habilitado.id,
                tipo_prestacion=TipoPrestacion.FARMACIA,
                descripcion="Medicamentos receta crónica",
                beneficiario_nombre=socio_habilitado.nombre_completo,
                beneficiario_parentesco="Titular",
                monto_boleta=40000,
                monto_copago=25000,
                monto_reembolso=25000,
                fecha_atencion=hoy,
                fecha_boleta=hoy,
                estado=EstadoReembolso.EN_REVISION,
                created_at=hace_1h,
                updated_at=hace_1h,
            ),
            SolicitudReembolso(
                codigo="RMB-2026-0102",
                socio_id=socio_habilitado.id,
                tipo_prestacion=TipoPrestacion.CONSULTA,
                descripcion="Consulta especialista aprobada por pagar",
                beneficiario_nombre=socio_habilitado.nombre_completo,
                beneficiario_parentesco="Titular",
                monto_boleta=50000,
                monto_copago=35000,
                monto_reembolso=35000,
                fecha_atencion=hoy,
                fecha_boleta=hoy,
                estado=EstadoReembolso.APROBADO,
                created_at=hace_2d,
                updated_at=hace_2d,
            ),
            SolicitudReembolso(
                codigo="RMB-2026-0103",
                socio_id=socio_habilitado.id,
                tipo_prestacion=TipoPrestacion.EXAMENES,
                descripcion="Examen fuera de plazo",
                beneficiario_nombre=socio_habilitado.nombre_completo,
                beneficiario_parentesco="Titular",
                monto_boleta=30000,
                monto_copago=20000,
                monto_reembolso=20000,
                fecha_atencion=hoy,
                fecha_boleta=hoy,
                estado=EstadoReembolso.RECHAZADO,
                motivo_rechazo="Boleta ilegible",
                created_at=hace_2d,
                updated_at=hace_1h,
            ),
        ]
    )

    # 4. Beneficios: 1 nuevo pendiente + 1 liquidado + 1 rechazado
    db_session.add_all(
        [
            SolicitudBeneficio(
                socio_id=socio_habilitado.id,
                tipo_bono="escolaridad",
                titulo_bono="Bono de Escolaridad",
                porcentaje_base=8.0,
                sueldo_base_referencia=750000,
                monto_calculado=60000,
                estado="PENDIENTE",
                documento_tipo="Certificado alumno regular",
                created_at=hace_1h,
                updated_at=hace_1h,
            ),
            SolicitudBeneficio(
                socio_id=socio_habilitado.id,
                tipo_bono="vacaciones",
                titulo_bono="Bono de Vacaciones",
                porcentaje_base=15.0,
                sueldo_base_referencia=750000,
                monto_calculado=112500,
                estado="LIQUIDADO",
                documento_tipo="Decreto Alcaldicio",
                created_at=hace_2d,
                updated_at=hace_2d,
            ),
            SolicitudBeneficio(
                socio_id=socio_habilitado.id,
                tipo_bono="nacimiento",
                titulo_bono="Bono de Nacimiento",
                porcentaje_base=20.0,
                sueldo_base_referencia=750000,
                monto_calculado=150000,
                estado="RECHAZADO",
                motivo_rechazo="Falta certificado Registro Civil",
                documento_tipo="Certificado nacimiento",
                fecha_revision=hace_1h,
                created_at=hace_2d,
                updated_at=hace_1h,
            ),
        ]
    )

    # 5. Talento y Oferta Laboral
    db_session.add(
        OfertaLaboral(
            codigo="OFL-2026-001",
            titulo="Profesional DIDECO",
            unidad="DIDECO",
            descripcion="Apoyo social comunitario",
            activa=True,
        )
    )
    db_session.add(
        PerfilTalentoVecino(
            folio="TAL-2026-00001",
            nombre_completo="Vecino Talento Nuevo",
            run="19123456-7",
            email="vecino@ejemplo.cl",
            telefono="+56912345678",
            direccion="Calle Central 123",
            comuna="Peralillo",
            resumen_profesional="Experiencia en gestión municipal.",
            renta_esperada_clp=850000,
            created_at=hace_1h,
            updated_at=hace_1h,
        )
    )

    # 6. Registro en AuditLog de hoy
    db_session.add(
        AuditLog(
            usuario_id=usuario_admin.id,
            usuario_nombre=usuario_admin.nombre_completo,
            usuario_rut=usuario_admin.rut,
            usuario_rol=usuario_admin.rol.value,
            modulo="REEMBOLSOS",
            accion="APROBAR_REEMBOLSO",
            recurso_tipo="SolicitudReembolso",
            recurso_id="RMB-2026-0102",
            detalles="Aprobado en revisión directiva.",
            created_at=hace_1h,
        )
    )
    await db_session.commit()

    # Ejecutar servicio mediante controlador (simulando inyección DIP)
    servicio = DashboardAdminService()
    resumen = await get_resumen_general_admin(
        current_user=usuario_admin,
        db=db_session,
        dashboard_service=servicio,
    )

    # Verificar novedades desde acceso_anterior (hace 3h)
    assert resumen.novedades.es_primer_acceso is False
    assert resumen.novedades.nuevas_afiliaciones == 1
    assert resumen.novedades.nuevas_cargas == 1
    assert resumen.novedades.nuevos_reembolsos == 1
    assert resumen.novedades.nuevos_beneficios == 1
    assert resumen.novedades.nuevas_postulaciones_talento == 1
    assert resumen.novedades.total_novedades == 5

    # Verificar bandejas por aprobar y por pagar
    assert resumen.bandejas.por_aprobar.afiliaciones == 2
    assert resumen.bandejas.por_aprobar.cargas == 1
    assert resumen.bandejas.por_aprobar.reembolsos_revision == 1
    assert resumen.bandejas.por_aprobar.reembolsos_por_pagar == 1
    assert resumen.bandejas.por_aprobar.beneficios == 1
    assert resumen.bandejas.por_aprobar.total == 5

    # Verificar rechazadas últimos 30 días
    assert resumen.bandejas.rechazadas_30d.afiliaciones == 1
    assert resumen.bandejas.rechazadas_30d.reembolsos == 1
    assert resumen.bandejas.rechazadas_30d.beneficios == 1
    assert resumen.bandejas.rechazadas_30d.total == 3

    # Verificar métricas de padrón y montos
    assert resumen.metricas.socios_activos == 2
    assert resumen.metricas.socios_habilitados == 1
    assert resumen.metricas.socios_carencia == 1
    assert resumen.metricas.monto_reembolsos_revision == 25000
    assert resumen.metricas.monto_desembolsado_periodo == 35000 + 112500
    assert resumen.metricas.ofertas_activas == 1
    assert resumen.metricas.postulaciones_talento == 1
    assert resumen.metricas.eventos_hoy >= 1
    assert len(resumen.actividad_reciente) == 1

    # Verificar bandera es_nueva en solicitudes_por_aprobar
    folios_nuevos = {s.folio for s in resumen.solicitudes_por_aprobar if s.es_nueva}
    assert "AF-2026-0002" in folios_nuevos
    assert "AF-2026-0001" not in folios_nuevos
    assert "RMB-2026-0101" in folios_nuevos


@pytest.mark.asyncio
async def test_resumen_general_rechaza_rol_socio_con_403(socio_habilitado: User):
    """Un socio regular no debe tener autorización para consumir el Resumen General Admin."""
    checker = require_roles(*ROLES_DIRECTIVA_LECTURA)
    with pytest.raises(HTTPException) as exc:
        await checker(user=socio_habilitado)
    assert exc.value.status_code == 403
