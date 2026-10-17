"""Endpoints para el módulo de Afiliación y Cargas Familiares.

HU-01: Solicitud de incorporación y registro de cargas familiares.
- El funcionario (Planta o Contrata) postula en línea, sin sesión (aún no es socio).
- Solo se aceptan postulaciones dentro del período reglamentario (enero a junio del año en curso).
- Debe autorizar el descuento por planilla del 4% del sueldo base.
- La solicitud queda "Pendiente de aprobación" y se emite un comprobante digital.
- Se informa el período de carencia: beneficios solo tras 6 meses continuos como socio.
"""
import calendar
import re
from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.config import settings
from app.db.session import get_db
from app.models import (
    CalidadContractual,
    CargaFamiliar,
    EstadoSolicitud,
    SolicitudAfiliacion,
    User,
    UserRole,
)

router = APIRouter()

MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def texto_carencia() -> str:
    m = settings.AFILIACION_MESES_CARENCIA
    return (
        f"De conformidad al Reglamento del Comité de Bienestar, el derecho a impetrar y percibir "
        f"beneficios rige exclusivamente una vez cumplidos {m} ({_num_palabra(m)}) meses continuos "
        f"como socio del Comité, contados desde la aprobación de la afiliación. Durante este período "
        f"de carencia se efectuará igualmente el descuento por planilla del "
        f"{settings.AFILIACION_PORCENTAJE_DESCUENTO}% del sueldo base."
    )


def _num_palabra(n: int) -> str:
    return {3: "tres", 6: "seis", 12: "doce"}.get(n, str(n))


# ---------------------------------------------------------------------------
# Utilidades RUN (módulo 11)
# ---------------------------------------------------------------------------
def normalizar_run(value: str) -> str:
    limpio = re.sub(r"[^0-9kK]", "", value or "").upper()
    if len(limpio) < 2:
        raise ValueError("RUN inválido")
    cuerpo, dv = limpio[:-1], limpio[-1]
    if not cuerpo.isdigit():
        raise ValueError("RUN inválido")
    suma, mult = 0, 2
    for d in reversed(cuerpo):
        suma += int(d) * mult
        mult = 2 if mult == 7 else mult + 1
    resto = 11 - (suma % 11)
    esperado = "0" if resto == 11 else "K" if resto == 10 else str(resto)
    if dv != esperado:
        raise ValueError("RUN inválido (dígito verificador incorrecto)")
    return f"{int(cuerpo)}-{dv}"


def formatear_run(run: str) -> str:
    cuerpo, dv = run.split("-")
    return f"{int(cuerpo):,}".replace(",", ".") + f"-{dv}"


def periodo_actual(hoy: Optional[date] = None) -> Dict[str, Any]:
    hoy = hoy or date.today()
    ini = date(hoy.year, settings.AFILIACION_MES_INICIO, 1)
    fin_mes = settings.AFILIACION_MES_FIN
    fin = date(hoy.year, fin_mes, calendar.monthrange(hoy.year, fin_mes)[1])
    en_rango = ini <= hoy <= fin
    return {
        "inicio": ini.isoformat(),
        "fin": fin.isoformat(),
        "descripcion": f"Desde el 1 de {MESES[ini.month]} al {fin.day} de {MESES[fin.month]} de {hoy.year}",
        "enPeriodo": en_rango,
        "validacionActiva": settings.AFILIACION_VALIDAR_PERIODO,
        "abierto": en_rango or not settings.AFILIACION_VALIDAR_PERIODO,
    }


# ---------------------------------------------------------------------------
# Esquemas
# ---------------------------------------------------------------------------
class CargaIn(BaseModel):
    nombreCompleto: str = Field(min_length=3, max_length=120)
    run: str
    parentesco: Optional[str] = Field(default=None, max_length=40)

    @field_validator("run")
    @classmethod
    def _run(cls, v: str) -> str:
        return normalizar_run(v)


class SolicitudIn(BaseModel):
    nombreCompleto: str = Field(min_length=3, max_length=120)
    run: str
    grado: str = Field(min_length=1, max_length=10)
    calidadContractual: Literal["Planta", "Contrata"]
    email: Optional[str] = Field(default=None, max_length=120)
    cargas: List[CargaIn] = Field(default_factory=list, max_length=15)
    autorizaDescuento: bool
    aceptaCarencia: bool

    @field_validator("run")
    @classmethod
    def _run(cls, v: str) -> str:
        return normalizar_run(v)

    @model_validator(mode="after")
    def _reglas(self):
        if not self.autorizaDescuento:
            raise ValueError(
                f"Debe autorizar el descuento por planilla del {settings.AFILIACION_PORCENTAJE_DESCUENTO}% del sueldo base"
            )
        if not self.aceptaCarencia:
            raise ValueError("Debe declarar haber leído la cláusula del período de carencia")
        runs = [c.run for c in self.cargas]
        if len(runs) != len(set(runs)):
            raise ValueError("Hay cargas familiares con RUN repetido")
        if self.run in runs:
            raise ValueError("El RUN del titular no puede registrarse como carga")
        return self


class CargaOut(BaseModel):
    nombreCompleto: str
    run: str
    parentesco: Optional[str]


class ComprobanteOut(BaseModel):
    folio: str
    estado: str
    fechaIngreso: datetime
    nombreCompleto: str
    run: str
    grado: str
    calidadContractual: str
    email: Optional[str]
    porcentajeDescuento: int
    cargas: List[CargaOut]
    mesesCarencia: int
    textoCarencia: str
    mensaje: str
    fechaSesion: Optional[str] = None
    numeroActa: Optional[str] = None
    fechaFinCarencia: Optional[str] = None
    observacionesResolucion: Optional[str] = None
    resueltoPor: Optional[str] = None
    resueltoAt: Optional[str] = None


class ResolucionSolicitudIn(BaseModel):
    accion: Literal["aprobar", "rechazar"]
    fechaSesion: Optional[str] = None  # Requerido si accion == "aprobar" (YYYY-MM-DD)
    numeroActa: Optional[str] = None
    observaciones: Optional[str] = None  # Requerido si accion == "rechazar"


def to_comprobante(s: SolicitudAfiliacion) -> ComprobanteOut:
    msg = (
        f"Su solicitud de incorporación N° {s.folio} fue ingresada correctamente y se encuentra "
        f"en estado \"{s.estado.value}\". Será revisada por la Directiva del Comité de Bienestar."
    )
    if s.estado == EstadoSolicitud.APROBADA:
        msg = f"Solicitud N° {s.folio} APROBADA en sesión de Directorio del {s.fecha_sesion}. Socio habilitado como Activo."
    elif s.estado == EstadoSolicitud.RECHAZADA:
        msg = f"Solicitud N° {s.folio} RECHAZADA. Observaciones: {s.observaciones_resolucion or 'Sin observaciones registradas'}."

    return ComprobanteOut(
        folio=s.folio, estado=s.estado.value, fechaIngreso=s.created_at,
        nombreCompleto=s.nombre_completo, run=formatear_run(s.run), grado=s.grado,
        calidadContractual=s.calidad_contractual.value, email=s.email,
        porcentajeDescuento=s.porcentaje_descuento,
        cargas=[CargaOut(nombreCompleto=c.nombre_completo, run=formatear_run(c.run), parentesco=c.parentesco)
                for c in s.cargas],
        mesesCarencia=settings.AFILIACION_MESES_CARENCIA,
        textoCarencia=texto_carencia(),
        mensaje=msg,
        fechaSesion=s.fecha_sesion,
        numeroActa=s.numero_acta,
        fechaFinCarencia=s.fecha_fin_carencia,
        observacionesResolucion=s.observaciones_resolucion,
        resueltoPor=s.resuelto_por,
        resueltoAt=s.resuelto_at,
    )


# ---------------------------------------------------------------------------
# Endpoints públicos (funcionario postulante)
# ---------------------------------------------------------------------------
@router.get("/", summary="Obtener información de afiliación del socio")
async def get_afiliacion() -> Dict[str, Any]:
    return {
        "modulo": "Afiliación y Cargas",
        "descripcion": "Gestión de fichas de socios, historial de afiliación y registro de cargas familiares.",
        "status": "activo",
    }


@router.get("/periodo", summary="Período de postulación y cláusulas informativas (público)")
async def get_periodo() -> Dict[str, Any]:
    return {
        **periodo_actual(),
        "porcentajeDescuento": settings.AFILIACION_PORCENTAJE_DESCUENTO,
        "mesesCarencia": settings.AFILIACION_MESES_CARENCIA,
        "textoCarencia": texto_carencia(),
    }


@router.post(
    "/solicitudes",
    response_model=ComprobanteOut,
    status_code=status.HTTP_201_CREATED,
    summary="Enviar solicitud de incorporación con cargas familiares (público)",
)
async def crear_solicitud(body: SolicitudIn, db: AsyncSession = Depends(get_db)):
    periodo = periodo_actual()
    if not periodo["abierto"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Fuera del período de postulación ({periodo['descripcion']}).",
        )

    pendiente = await db.scalar(
        select(SolicitudAfiliacion).where(
            SolicitudAfiliacion.run == body.run,
            SolicitudAfiliacion.estado.in_([EstadoSolicitud.PENDIENTE, EstadoSolicitud.APROBADA]),
        )
    )
    if pendiente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una solicitud para este RUN (folio {pendiente.folio}, estado \"{pendiente.estado.value}\").",
        )

    anio = date.today().year
    total = await db.scalar(
        select(func.count(SolicitudAfiliacion.id)).where(SolicitudAfiliacion.folio.like(f"AF-{anio}-%"))
    )
    solicitud = SolicitudAfiliacion(
        folio=f"AF-{anio}-{(total or 0) + 1:05d}",
        nombre_completo=body.nombreCompleto.strip(),
        run=body.run,
        grado=body.grado.strip(),
        calidad_contractual=CalidadContractual(body.calidadContractual),
        email=(body.email or "").strip() or None,
        autoriza_descuento=True,
        porcentaje_descuento=settings.AFILIACION_PORCENTAJE_DESCUENTO,
        acepta_carencia=True,
        estado=EstadoSolicitud.PENDIENTE,
        cargas=[
            CargaFamiliar(nombre_completo=c.nombreCompleto.strip(), run=c.run, parentesco=c.parentesco)
            for c in body.cargas
        ],
    )
    db.add(solicitud)
    await db.commit()
    creada = await db.scalar(
        select(SolicitudAfiliacion)
        .where(SolicitudAfiliacion.id == solicitud.id)
        .execution_options(populate_existing=True)
    )
    return to_comprobante(creada)


@router.get("/solicitudes/{folio}", response_model=ComprobanteOut, summary="Consultar comprobante por folio y RUN (público)")
async def consultar_solicitud(folio: str, run: str, db: AsyncSession = Depends(get_db)):
    try:
        run_n = normalizar_run(run)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    s = await db.scalar(
        select(SolicitudAfiliacion).where(SolicitudAfiliacion.folio == folio, SolicitudAfiliacion.run == run_n)
    )
    if not s:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return to_comprobante(s)


# ---------------------------------------------------------------------------
# Endpoints de la Directiva
# ---------------------------------------------------------------------------
DIRECTIVA = (UserRole.PRESIDENTE, UserRole.SECRETARIO, UserRole.TESORERO, UserRole.ADMIN, UserRole.AUDITOR)


@router.get("/solicitudes", response_model=List[ComprobanteOut], summary="Listar solicitudes de incorporación (Directiva)")
async def listar_solicitudes(
    _: User = Depends(require_roles(*DIRECTIVA)), db: AsyncSession = Depends(get_db)
):
    result = await db.scalars(select(SolicitudAfiliacion).order_by(SolicitudAfiliacion.id.desc()))
    return [to_comprobante(s) for s in result]


DIRECTORIO_RESOLUTIVO = (UserRole.PRESIDENTE, UserRole.SECRETARIO, UserRole.SUPERUSUARIO)


def calcular_fin_carencia(fecha_sesion_str: str) -> str:
    """Calcula la fecha exacta cumplidos los 6 meses continuos de carencia."""
    f = datetime.strptime(fecha_sesion_str, "%Y-%m-%d").date()
    # Sumar 6 meses
    mes = f.month + settings.AFILIACION_MESES_CARENCIA
    anio = f.year + (mes - 1) // 12
    mes_final = ((mes - 1) % 12) + 1
    dia_final = min(f.day, calendar.monthrange(anio, mes_final)[1])
    return date(anio, mes_final, dia_final).isoformat()


@router.post(
    "/solicitudes/{folio}/resolucion",
    response_model=ComprobanteOut,
    summary="Aprobar o rechazar solicitud de incorporación según acta ordinaria (Presidente/a o Secretario/a)",
)
async def resolver_solicitud(
    folio: str,
    body: ResolucionSolicitudIn,
    current_user: User = Depends(require_roles(*DIRECTORIO_RESOLUTIVO)),
    db: AsyncSession = Depends(get_db),
):
    solicitud = await db.scalar(
        select(SolicitudAfiliacion).where(SolicitudAfiliacion.folio == folio)
    )
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    if solicitud.estado != EstadoSolicitud.PENDIENTE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La solicitud ya se encuentra en estado \"{solicitud.estado.value}\". No puede resolverse nuevamente.",
        )

    if body.accion == "aprobar":
        if not body.fechaSesion:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Debe ingresar la fecha de la sesión ordinaria de Directorio para aprobar.",
            )
        try:
            fin_carencia = calcular_fin_carencia(body.fechaSesion)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Formato de fecha de sesión inválido (se espera YYYY-MM-DD).",
            )

        solicitud.estado = EstadoSolicitud.APROBADA
        solicitud.fecha_sesion = body.fechaSesion
        solicitud.numero_acta = body.numeroActa.strip() if body.numeroActa else None
        solicitud.fecha_fin_carencia = fin_carencia
        solicitud.observaciones_resolucion = (body.observaciones or "").strip() or None
        solicitud.resuelto_por = f"{current_user.nombre_completo} ({current_user.rol.value})"
        solicitud.resuelto_at = datetime.now().isoformat()

        # Incorporar/activar cuenta de usuario como Socio Activo
        rut_normalizado = solicitud.run
        user_existente = await db.scalar(
            select(User).where(User.rut == rut_normalizado)
        )
        if user_existente:
            user_existente.rol = UserRole.SOCIO
            user_existente.is_active = True
            user_existente.cargas_registradas = len(solicitud.cargas)
            user_existente.estado_previsional = "Al día"
        else:
            email_usuario = solicitud.email or f"{rut_normalizado.replace('-', '')}@mperalillo.cl"
            from app.core.security import get_password_hash
            nuevo_socio = User(
                rut=rut_normalizado,
                email=email_usuario,
                nombre_completo=solicitud.nombre_completo,
                hashed_password=get_password_hash("Socio#2026"),
                rol=UserRole.SOCIO,
                is_superuser=False,
                is_active=True,
                departamento=f"Grado {solicitud.grado} - {solicitud.calidad_contractual.value}",
                antiguedad="0 Meses (Socio Nuevo)",
                estado_previsional="Al día",
                saldo_salud_disponible=250000,
                saldo_salud_total_anual=250000,
                cargas_registradas=len(solicitud.cargas),
            )
            db.add(nuevo_socio)

    elif body.accion == "rechazar":
        if not body.observaciones or not body.observaciones.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Debe ingresar la causal y detalle de observaciones para rechazar la solicitud.",
            )
        solicitud.estado = EstadoSolicitud.RECHAZADA
        solicitud.fecha_sesion = body.fechaSesion
        solicitud.numero_acta = body.numeroActa.strip() if body.numeroActa else None
        solicitud.observaciones_resolucion = body.observaciones.strip()
        solicitud.resuelto_por = f"{current_user.nombre_completo} ({current_user.rol.value})"
        solicitud.resuelto_at = datetime.now().isoformat()

    await db.commit()
    actualizada = await db.scalar(
        select(SolicitudAfiliacion)
        .where(SolicitudAfiliacion.id == solicitud.id)
        .execution_options(populate_existing=True)
    )
    return to_comprobante(actualizada)


@router.get("/nomina-retenciones", summary="Nómina mensual de retenciones para Finanzas / RRHH (Directiva)")
async def get_nomina_retenciones(
    _: User = Depends(require_roles(*DIRECTIVA)), db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Retorna la lista de socios activos incorporados con retención del 4% autorizada."""
    aprobadas = await db.scalars(
        select(SolicitudAfiliacion)
        .where(SolicitudAfiliacion.estado == EstadoSolicitud.APROBADA)
        .order_by(SolicitudAfiliacion.fecha_sesion.desc())
    )
    items = []
    for s in aprobadas:
        items.append({
            "folio": s.folio,
            "run": formatear_run(s.run),
            "nombreCompleto": s.nombre_completo,
            "grado": s.grado,
            "calidadContractual": s.calidad_contractual.value,
            "porcentajeRetencion": s.porcentaje_descuento,
            "fechaSesionAprobacion": s.fecha_sesion,
            "numeroActa": s.numero_acta,
            "inicioDescuento": s.fecha_sesion,
            "finCarencia": s.fecha_fin_carencia,
            "cargasLegales": len(s.cargas),
        })
    return {
        "periodo": datetime.now().strftime("%Y-%m"),
        "totalSociosEnNomina": len(items),
        "porcentajeAplicado": f"{settings.AFILIACION_PORCENTAJE_DESCUENTO}% sueldo base",
        "socios": items,
    }


@router.get("/cargas", summary="Listar cargas familiares registradas")
async def get_cargas_familiares() -> Dict[str, Any]:
    return {
        "cargas": [
            {"id": 1, "nombre": "Valentina Peralillo", "parentesco": "Hija", "edad": 7, "estado": "Vigente"},
            {"id": 2, "nombre": "Matías Peralillo", "parentesco": "Hijo", "edad": 4, "estado": "Vigente"},
        ]
    }
