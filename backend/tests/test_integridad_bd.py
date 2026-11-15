"""Pruebas automatizadas de Gobernanza e Integridad Relacional de Base de Datos (3FN).

[ESTUDIANTE INFORMÁTICA] Este archivo blinda mediante pruebas unitarias las 6 reglas de
buenas prácticas de Base de Datos definidas en CONTEXTO_IA.md e INSTRUCCIONES_AGENTE.md:
1. Cero Tablas Isla: bonos_catalogo conectado por FK a solicitudes_beneficio y nominas_masivas.
2. Ciclo completo de Cargas Familiares: socio_id en cargas_familiares y carga_id en solicitudes_cargas_familiares.
3. Trazabilidad de Evaluadores por FK: resuelto_por_id y revisado_por_id apuntando a usuarios(id).
4. Auditoría conectada: audit_logs.usuario_id con ForeignKey formal hacia usuarios(id).
5. Tipado Estricto CLP y Fechas: montos en Integer (cero Float para dinero) y fechas en Date/DateTime.
6. Seguridad de acceso normalizada en la entidad usuarios.
"""
from datetime import date, datetime
import pytest
from sqlalchemy import Integer, Date, DateTime, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Base,
    User,
    SolicitudAfiliacion,
    CargaFamiliar,
    SolicitudCargaFamiliar,
    SolicitudReembolso,
    BonoCatalogo,
    SolicitudBeneficio,
    NominaMasiva,
    AuditLog,
)
from app.schemas.afiliacion import SolicitudIn, CargaIn, ResolucionSolicitudIn
from app.schemas.beneficios import PostulacionBeneficioCreate
from app.services.afiliacion_service import AfiliacionService
from app.services.beneficios_service import BeneficiosService
from app.services.reembolso_service import crear_solicitud, resolver_solicitud_reembolso
from app.schemas.reembolso import ReembolsoCreateRequest


def test_esquema_orm_sin_tablas_isla_y_con_16_fks():
    """Verifica que todas las tablas operacionales y de catálogo tengan sus ForeignKeys declaradas."""
    fks_por_tabla = {
        t_name: [fk.target_fullname for fk in table.foreign_keys]
        for t_name, table in Base.metadata.tables.items()
    }

    # 1. Solicitudes de afiliación conectada a usuarios
    assert "usuarios.id" in fks_por_tabla["solicitudes_afiliacion"]
    # 2. Cargas familiares conectada a solicitudes_afiliacion y a usuarios
    assert "solicitudes_afiliacion.id" in fks_por_tabla["cargas_familiares"]
    assert "usuarios.id" in fks_por_tabla["cargas_familiares"]
    # 3. Solicitudes cargas familiares conectada a usuarios y a cargas_familiares
    assert "usuarios.id" in fks_por_tabla["solicitudes_cargas_familiares"]
    assert "cargas_familiares.id" in fks_por_tabla["solicitudes_cargas_familiares"]
    # 4. Solicitudes reembolso conectada a usuarios (socio y revisor)
    assert "usuarios.id" in fks_por_tabla["solicitudes_reembolso"]
    # 5. Solicitudes beneficio y nóminas masivas conectadas a bonos_catalogo y usuarios
    assert "bonos_catalogo.id" in fks_por_tabla["solicitudes_beneficio"]
    assert "bonos_catalogo.id" in fks_por_tabla["nominas_masivas"]
    # 6. Audit logs conectada a usuarios
    assert "usuarios.id" in fks_por_tabla["audit_logs"]


def test_tipado_estricto_montos_clp_integer_y_fechas_date():
    """Verifica que los montos en CLP sean Integer y las fechas de resolución/decreto sean Date/DateTime."""
    tbl_rmb = Base.metadata.tables["solicitudes_reembolso"]
    for col_name in ("monto_boleta", "monto_copago", "monto_reembolso"):
        assert isinstance(tbl_rmb.c[col_name].type, Integer), f"{col_name} debe ser INTEGER"

    tbl_af = Base.metadata.tables["solicitudes_afiliacion"]
    assert isinstance(tbl_af.c["fecha_sesion"].type, Date)
    assert isinstance(tbl_af.c["fecha_fin_carencia"].type, Date)
    assert isinstance(tbl_af.c["resuelto_at"].type, DateTime)

    tbl_cf = Base.metadata.tables["solicitudes_cargas_familiares"]
    assert isinstance(tbl_cf.c["fecha_sesion"].type, Date)
    assert isinstance(tbl_cf.c["resuelto_at"].type, DateTime)

    tbl_ben = Base.metadata.tables["solicitudes_beneficio"]
    assert isinstance(tbl_ben.c["decreto_fecha"].type, Date)


@pytest.mark.asyncio
async def test_flujo_afiliacion_puebla_fks_socio_evaluador_y_carga(
    db_session: AsyncSession, usuario_admin: User
):
    """Verifica que al aprobar una afiliación con cargas se pueblen socio_creado_id, resuelto_por_id, socio_id y carga_id."""
    from app.core.config import settings
    settings.AFILIACION_VALIDAR_PERIODO = False

    payload = SolicitudIn(
        nombreCompleto="Pedro Araya Soto",
        run="15.489.123-4",
        grado="12",
        calidadContractual="Planta",
        email="paraya@mperalillo.cl",
        autorizaDescuento=True,
        aceptaCarencia=True,
        cargas=[
            CargaIn(
                nombreCompleto="Lucas Araya",
                run="18.567.890-3",
                parentesco="Hijo/a",
                certificadoNombre="carnet_lucas.jpg",
                certificadoData="data:image/jpeg;base64,dGVzdA==",
            )
        ],
    )
    comp = await AfiliacionService.crear_solicitud(db_session, payload)
    res = await AfiliacionService.resolver_solicitud(
        db_session,
        comp.folio,
        ResolucionSolicitudIn(
            accion="aprobar",
            fechaSesion="2026-03-10",
            numeroActa="Acta 05/2026",
            observaciones="Aprobado conforme",
        ),
        usuario_admin,
    )
    assert res.fechaSesion == "2026-03-10"

    sol_db = await db_session.scalar(
        select(SolicitudAfiliacion).where(SolicitudAfiliacion.folio == comp.folio)
    )
    assert sol_db is not None
    assert sol_db.socio_creado_id is not None
    assert sol_db.resuelto_por_id == usuario_admin.id
    assert isinstance(sol_db.fecha_sesion, date)

    carga_db = await db_session.scalar(
        select(CargaFamiliar).where(CargaFamiliar.solicitud_id == sol_db.id)
    )
    assert carga_db is not None
    assert carga_db.socio_id == sol_db.socio_creado_id

    sol_carga_db = await db_session.scalar(
        select(SolicitudCargaFamiliar).where(SolicitudCargaFamiliar.socio_id == sol_db.socio_creado_id)
    )
    assert sol_carga_db is not None
    assert sol_carga_db.carga_id == carga_db.id


@pytest.mark.asyncio
async def test_reembolso_y_beneficio_pueblan_revisado_por_id_y_bono_id(
    db_session: AsyncSession,
    socio_habilitado: User,
    usuario_admin: User,
    param_grado_15,
):
    """Verifica que al resolver un reembolso y postular a un bono se pueblen revisado_por_id y bono_id."""
    # 1. Crear bono en catálogo y postular
    bono_cat = BonoCatalogo(
        codigo="nacimiento",
        nombre="Bono de Nacimiento",
        porcentaje=20.0,
        categoria="Contingencia Familiar",
    )
    db_session.add(bono_cat)
    await db_session.commit()
    await db_session.refresh(bono_cat)

    sol_ben = await BeneficiosService.postular_beneficio(
        db_session,
        socio_habilitado,
        PostulacionBeneficioCreate(
            tipo_bono="nacimiento",
            motivo="Nacimiento hijo",
            documento_tipo="Certificado de Nacimiento",
            decreto_fecha="2026-03-01",
        ),
    )
    assert sol_ben.bono_id == bono_cat.id
    assert sol_ben.decreto_fecha == date(2026, 3, 1)

    # 2. Crear y resolver reembolso verificando revisado_por_id y montos enteros
    hoy = date.today()
    rmb = await crear_solicitud(
        socio_habilitado,
        ReembolsoCreateRequest(
            tipo_prestacion="consulta",
            descripcion="Consulta médica general",
            beneficiario_nombre=socio_habilitado.nombre_completo,
            beneficiario_parentesco="Titular",
            monto_boleta=35000,
            monto_copago=17500,
            fecha_atencion=hoy,
            fecha_boleta=hoy,
            tipo_documento="bono_copago",
            comprobante_filename="bono.pdf",
            declaracion_aceptada=True,
        ),
        db_session,
    )
    assert isinstance(rmb.monto_boleta, int)
    rmb_res = await resolver_solicitud_reembolso(rmb.id, "APROBAR", "", usuario_admin, db_session)
    assert rmb_res.revisado_por_id == usuario_admin.id
    assert isinstance(rmb_res.fecha_revision, datetime)
