"""Endpoints REST para el Módulo de Beneficios Sociales y Bonos.
Implementa:
- HU-05: Postulación y Liquidación de Bonos por Contingencia / Evento.
- HU-06: Liquidación Masiva de Bonos Periódicos de Calendario (Invierno y Navidad).
- Parámetros dinámicos y base de cálculo sobre Sueldo Imponible Grado 15.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models import (
    User,
    UserRole,
    ParametroSistema,
    SolicitudBeneficio,
    NominaMasiva,
    DetalleNominaMasiva,
)
from app.schemas.beneficios import (
    CatalogoBeneficiosResponse,
    ParametroUpdate,
    PostulacionBeneficioCreate,
    AsignacionDirectaVacacionesCreate,
    ValidarSolicitudRequest,
    SolicitudBeneficioOut,
    SimularNominaRequest,
    SimularNominaResponse,
    EjecutarNominaRequest,
    SimularNominaItem,
)
from app.services.beneficios_service import BeneficiosService

router = APIRouter()

ROLES_DIRECTIVA = [
    UserRole.ADMIN,
    UserRole.PRESIDENTE,
    UserRole.SECRETARIO,
    UserRole.TESORERO,
    UserRole.SUPERUSUARIO,
    UserRole.AUDITOR,
]

ROLES_GESTION = [
    UserRole.ADMIN,
    UserRole.PRESIDENTE,
    UserRole.SECRETARIO,
    UserRole.TESORERO,
    UserRole.SUPERUSUARIO,
]


def _to_solicitud_out(s: SolicitudBeneficio, socio: Optional[User] = None) -> SolicitudBeneficioOut:
    socio_obj = socio or s.socio
    return SolicitudBeneficioOut(
        id=s.id,
        socio_id=s.socio_id,
        socio_nombre=socio_obj.nombre_completo if socio_obj else "Socio",
        socio_rut=socio_obj.rut if socio_obj else "",
        socio_departamento=socio_obj.departamento if socio_obj else "",
        socio_antiguedad=socio_obj.antiguedad if socio_obj else "",
        socio_meses_antiguedad=getattr(socio_obj, "meses_antiguedad", 12) if socio_obj else 12,
        tipo_bono=s.tipo_bono,
        titulo_bono=s.titulo_bono,
        porcentaje_base=s.porcentaje_base,
        sueldo_base_referencia=s.sueldo_base_referencia,
        monto_calculado=s.monto_calculado,
        estado=s.estado,
        motivo=s.motivo,
        documento_tipo=s.documento_tipo,
        documento_nombre=s.documento_nombre,
        documento_url=s.documento_url,
        decreto_numero=s.decreto_numero,
        decreto_fecha=s.decreto_fecha,
        dias_habiles_feriado=s.dias_habiles_feriado,
        nombre_beneficiario=s.nombre_beneficiario,
        rut_beneficiario=s.rut_beneficiario,
        institucion_educacional=s.institucion_educacional,
        nivel_educacional=s.nivel_educacional,
        edad_estudiante=s.edad_estudiante,
        asignacion_directa=s.asignacion_directa,
        motivo_rechazo=s.motivo_rechazo,
        observaciones_admin=s.observaciones_admin,
        metodo_pago=s.metodo_pago,
        numero_cheque=s.numero_cheque,
        banco_emisor=s.banco_emisor,
        fecha_liquidacion=s.fecha_liquidacion.strftime("%d-%m-%Y %H:%M") if s.fecha_liquidacion else None,
        created_at=s.created_at.strftime("%d-%m-%Y %H:%M") if s.created_at else datetime.now().strftime("%d-%m-%Y %H:%M"),
    )


@router.get("/catalogo", response_model=CatalogoBeneficiosResponse, summary="Obtener catálogo oficial y montos sobre Grado 15")
async def get_catalogo(db: AsyncSession = Depends(get_db)):
    """Retorna el catálogo completo con los montos dinámicamente calculados sobre Grado 15."""
    return await BeneficiosService.get_catalogo(db)


@router.get("/parametros", summary="Obtener parámetros de cálculo (Grado 15, Navidad)")
async def get_parametros(db: AsyncSession = Depends(get_db)):
    params = (await db.scalars(select(ParametroSistema))).all()
    base_g15 = await BeneficiosService.get_sueldo_base_grado_15(db)
    porc_navidad = await BeneficiosService.get_porcentaje_navidad(db)
    return {
        "sueldo_base_grado_15": base_g15,
        "bono_navidad_porcentaje": porc_navidad,
        "parametros": [{"clave": p.clave, "valor": p.valor, "descripcion": p.descripcion} for p in params],
    }


@router.put("/parametros", summary="Actualizar parámetro de configuración (Sueldo Grado 15 o Bono Navidad)")
async def update_parametro(
    payload: ParametroUpdate,
    user: User = Depends(require_roles(*ROLES_GESTION)),
    db: AsyncSession = Depends(get_db),
):
    param = await db.scalar(select(ParametroSistema).where(ParametroSistema.clave == payload.clave))
    if not param:
        param = ParametroSistema(clave=payload.clave, valor=payload.valor, descripcion=payload.descripcion or "")
        db.add(param)
    else:
        param.valor = payload.valor
        if payload.descripcion:
            param.descripcion = payload.descripcion
    await db.commit()
    return {"message": f"Parámetro {payload.clave} actualizado correctamente a {payload.valor}."}


@router.get("/solicitudes", response_model=List[SolicitudBeneficioOut], summary="Listar solicitudes / Hoja de Beneficios")
async def get_solicitudes(
    socio_id: Optional[int] = None,
    estado: Optional[str] = None,
    tipo_bono: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Si es socio regular: obtiene exclusivamente sus postulaciones y liquidaciones (su Hoja de Beneficios).
    Si es Directiva / Administrador: puede ver todas o filtrar por socio_id, estado o tipo de bono.
    """
    query = select(SolicitudBeneficio).options(selectinload(SolicitudBeneficio.socio)).order_by(desc(SolicitudBeneficio.id))
    
    # Restricción de permisos: socio común solo ve sus registros
    if user.rol == UserRole.SOCIO and not user.is_superuser:
        query = query.where(SolicitudBeneficio.socio_id == user.id)
    elif socio_id:
        query = query.where(SolicitudBeneficio.socio_id == socio_id)
        
    if estado:
        query = query.where(SolicitudBeneficio.estado == estado.upper())
    if tipo_bono:
        query = query.where(SolicitudBeneficio.tipo_bono == tipo_bono)
        
    solicitudes = (await db.scalars(query)).all()
    return [_to_solicitud_out(s) for s in solicitudes]


@router.post("/postular", response_model=SolicitudBeneficioOut, summary="HU-05: Postular a un Bono por Contingencia / Evento")
async def postular_beneficio(
    payload: PostulacionBeneficioCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    HU-05: Socio postula a bonos por contingencia/evento (Educación, Nacimiento, Duelo, Catástrofe, etc.).
    Valida antigüedad mínima de 6 meses y adjuntos legales.
    """
    solicitud = await BeneficiosService.postular_beneficio(db, user, payload)
    return _to_solicitud_out(solicitud, user)


@router.post("/asignacion-directa-vacaciones", response_model=SolicitudBeneficioOut, summary="HU-05 / Escenario 3: Asignación Directa Bono de Vacaciones")
async def asignacion_directa_vacaciones(
    payload: AsignacionDirectaVacacionesCreate,
    user: User = Depends(require_roles(*ROLES_GESTION)),
    db: AsyncSession = Depends(get_db),
):
    """
    Escenario 3: Administrador asigna directamente el Bono de Vacaciones (15% de Grado 15)
    acreditando Decreto Alcaldicio de feriado legal por al menos 10 días hábiles continuos.
    """
    solicitud = await BeneficiosService.asignar_directamente_vacaciones(db, user, payload)
    socio = await db.get(User, payload.socio_id)
    return _to_solicitud_out(solicitud, socio)


@router.patch("/solicitudes/{solicitud_id}/validar", response_model=SolicitudBeneficioOut, summary="Aprobar, Rechazar o Liquidar Postulación Individual")
async def validar_solicitud(
    solicitud_id: int,
    payload: ValidarSolicitudRequest,
    user: User = Depends(require_roles(*ROLES_GESTION)),
    db: AsyncSession = Depends(get_db),
):
    """
    Validación de Administrador o Secretario (Aprobar / Rechazar) y liquidación con cheque o transferencia.
    """
    solicitud = await BeneficiosService.validar_o_liquidar(db, user, solicitud_id, payload)
    socio = await db.get(User, solicitud.socio_id)
    return _to_solicitud_out(solicitud, socio)


@router.post("/nominas/simular", response_model=SimularNominaResponse, summary="HU-06: Simular Nómina Masiva de Calendario")
async def simular_nomina_masiva(
    req: SimularNominaRequest,
    user: User = Depends(require_roles(*ROLES_DIRECTIVA)),
    db: AsyncSession = Depends(get_db),
):
    """
    HU-06: Genera simulación automatizada de beneficiarios para bonos de calendario
    (Invierno en julio 15% o Navidad en diciembre 10-15%), seleccionando a socios con >= 6 meses.
    """
    return await BeneficiosService.simular_nomina_masiva(db, req)


@router.post("/nominas/ejecutar", summary="HU-06: Formalizar Nómina Masiva y Emitir Cheques para Tesorería")
async def ejecutar_nomina_masiva(
    req: EjecutarNominaRequest,
    user: User = Depends(require_roles(*ROLES_GESTION)),
    db: AsyncSession = Depends(get_db),
):
    """
    HU-06: Formaliza el acuerdo de pago, genera la nómina para Tesorería con número de cheque
    individual y registra automáticamente la información en la Hoja de Beneficios de cada socio.
    """
    nomina = await BeneficiosService.ejecutar_nomina_masiva(db, user, req)
    return {
        "id": nomina.id,
        "titulo": nomina.titulo,
        "periodo": nomina.periodo,
        "total_beneficiados": nomina.total_socios_beneficiados,
        "monto_total": nomina.monto_total_liquidado,
        "estado": nomina.estado,
        "mensaje": f"Nómina '{nomina.titulo}' formalizada con éxito. Se asignaron {nomina.total_socios_beneficiados} cheques para Tesorería y se impactaron las Hojas de Beneficios individuales.",
    }


@router.get("/nominas", summary="Historial de nóminas masivas de calendario")
async def listar_nominas_masivas(
    user: User = Depends(require_roles(*ROLES_DIRECTIVA)),
    db: AsyncSession = Depends(get_db),
):
    nominas = (await db.scalars(select(NominaMasiva).order_by(desc(NominaMasiva.id)))).all()
    return [
        {
            "id": n.id,
            "tipo_bono": n.tipo_bono,
            "titulo": n.titulo,
            "periodo": n.periodo,
            "porcentaje": n.porcentaje,
            "sueldo_base_utilizado": n.sueldo_base_utilizado,
            "monto_unitario": n.monto_unitario,
            "total_socios_beneficiados": n.total_socios_beneficiados,
            "total_socios_excluidos": n.total_socios_excluidos,
            "monto_total_liquidado": n.monto_total_liquidado,
            "estado": n.estado,
            "decreto_marco": n.decreto_marco,
            "created_at": n.created_at.strftime("%d-%m-%Y %H:%M") if n.created_at else "",
        }
        for n in nominas
    ]


@router.get("/nominas/{nomina_id}", summary="Detalle de nómina masiva con desglose de socios y cheques")
async def get_nomina_masiva_detalle(
    nomina_id: int,
    user: User = Depends(require_roles(*ROLES_DIRECTIVA)),
    db: AsyncSession = Depends(get_db),
):
    nomina = await db.scalar(
        select(NominaMasiva).where(NominaMasiva.id == nomina_id).options(selectinload(NominaMasiva.detalles))
    )
    if not nomina:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nómina no encontrada.")
    return {
        "id": nomina.id,
        "tipo_bono": nomina.tipo_bono,
        "titulo": nomina.titulo,
        "periodo": nomina.periodo,
        "porcentaje": nomina.porcentaje,
        "monto_unitario": nomina.monto_unitario,
        "monto_total_liquidado": nomina.monto_total_liquidado,
        "decreto_marco": nomina.decreto_marco,
        "detalles": [
            {
                "id": d.id,
                "rut": d.rut,
                "nombre_completo": d.nombre_completo,
                "departamento": d.departamento,
                "antiguedad_texto": d.antiguedad_texto,
                "cumple_antiguedad": d.cumple_antiguedad,
                "motivo_exclusion": d.motivo_exclusion,
                "monto": d.monto,
                "numero_cheque": d.numero_cheque,
                "banco": d.banco,
                "decreto_asociado": d.decreto_asociado,
                "decreto_digital_url": d.decreto_digital_url,
                "estado_pago": d.estado_pago,
            }
            for d in nomina.detalles
        ],
    }


@router.post("/cargar-planilla-csv", response_model=List[SimularNominaItem], summary="HU-06: Cargar Planilla Excel/CSV con Decretos Asociados")
async def cargar_planilla_csv(
    file: UploadFile = File(...),
    user: User = Depends(require_roles(*ROLES_GESTION)),
    db: AsyncSession = Depends(get_db),
):
    """
    HU-06: Carga de planilla Excel/CSV con nombres, apellidos, RUN y decreto asociado,
    incorporando decretos digitalizados correspondientes a cada socio.
    """
    content = await file.read()
    try:
        csv_text = content.decode("utf-8")
    except UnicodeDecodeError:
        csv_text = content.decode("latin-1")
    return await BeneficiosService.procesar_planilla_excel(db, csv_text)


@router.get("/tesoreria/exportar/{nomina_id}", summary="Exportar listado para Tesorería Municipal (confección de cheques)")
async def exportar_tesoreria(
    nomina_id: int,
    user: User = Depends(require_roles(*ROLES_DIRECTIVA)),
    db: AsyncSession = Depends(get_db),
):
    nomina = await db.scalar(
        select(NominaMasiva).where(NominaMasiva.id == nomina_id).options(selectinload(NominaMasiva.detalles))
    )
    if not nomina:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nómina no encontrada.")
        
    registros = []
    for d in nomina.detalles:
        if d.cumple_antiguedad:
            registros.append({
                "NroCheque": d.numero_cheque or "S/N",
                "Beneficiario": d.nombre_completo,
                "RUN": d.rut,
                "Departamento": d.departamento,
                "MontoCLP": d.monto,
                "Banco": d.banco or "BancoEstado",
                "Concepto": f"{nomina.titulo} ({d.decreto_asociado or nomina.decreto_marco or 'Decreto Municipal'})",
                "DecretoDigital": d.decreto_digital_url or "",
            })
    return {
        "nomina_id": nomina.id,
        "titulo": nomina.titulo,
        "fecha_emision": datetime.now().strftime("%d/%m/%Y"),
        "total_cheques": len(registros),
        "monto_total": sum(r["MontoCLP"] for r in registros),
        "registros": registros,
    }


# Compatibilidad retroactiva con el dashboard general
@router.get("/movimientos", summary="Movimientos para el dashboard")
async def get_movimientos_compat(
    user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    solicitudes = (await db.scalars(
        select(SolicitudBeneficio).order_by(desc(SolicitudBeneficio.id)).limit(10)
    )).all()
    
    if not solicitudes:
        return [
            {
                "id": "MOV-002",
                "fecha": "2026-03-15",
                "concepto": "Bono de Vacaciones Anual (15% Grado 15)",
                "modulo": "Beneficios Sociales",
                "monto": 112500,
                "estado": "Pagado",
                "comprobante_url": "/docs/decretos/DEC-1042-2026.pdf",
            }
        ]
        
    return [
        {
            "id": f"BEN-{s.id:04d}",
            "fecha": s.created_at.strftime("%Y-%m-%d") if s.created_at else "2026-04-01",
            "concepto": f"{s.titulo_bono} ({s.porcentaje_base}% G15)",
            "modulo": "Beneficios Sociales",
            "monto": s.monto_calculado,
            "estado": "Pagado" if s.estado == "LIQUIDADO" else ("Aprobado" if s.estado == "APROBADO" else ("Rechazado" if s.estado == "RECHAZADO" else "En Revisión")),
            "comprobante_url": s.documento_url or "/docs/comprobantes/bono.pdf",
        }
        for s in solicitudes
    ]
