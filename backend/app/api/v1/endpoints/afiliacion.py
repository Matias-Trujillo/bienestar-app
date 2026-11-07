"""Endpoints para el módulo de Afiliación y Cargas Familiares.

HU-01: Solicitud de incorporación y registro de cargas familiares.
- El funcionario (Planta o Contrata) postula en línea, sin sesión (aún no es socio).
- Solo se aceptan postulaciones dentro del período reglamentario (enero a junio del año en curso).
- Debe autorizar el descuento por planilla del 4% del sueldo base.
- La solicitud queda "Pendiente de aprobación", se emite un comprobante digital y se envía
  Correo #1 de Confirmación de Recepción y Gestión.
- Al resolverse en sesión de Directorio (HU-02), se envía Correo #2 con la resolución
  (ACEPTADA / RECHAZADA + Motivo), generando automáticamente su Clave Temporal e instrucciones
  paso a paso para activar su cuenta cuando es aprobada.
"""
import calendar
import re
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.api.v1.endpoints.auth import guardar_seguridad_usuario, obtener_seguridad_usuario
from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import get_db
from app.models import (
    AuditLog,
    CalidadContractual,
    CargaFamiliar,
    EstadoSolicitud,
    ParametroSistema,
    SolicitudAfiliacion,
    SolicitudCargaFamiliar,
    User,
    UserRole,
)
from app.services.email_service import (
    actualizar_config_smtp_runtime,
    generar_correo_recepcion_solicitud,
    generar_correo_resolucion_carga_familiar,
    generar_correo_resolucion_solicitud,
)

router = APIRouter()

_TABLA_CARGAS_LISTA = False


async def _asegurar_tabla_cargas(db: AsyncSession) -> None:
    global _TABLA_CARGAS_LISTA
    if _TABLA_CARGAS_LISTA:
        return
    await db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS solicitudes_cargas_familiares (
                id SERIAL PRIMARY KEY,
                folio VARCHAR(24) UNIQUE NOT NULL,
                socio_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                socio_nombre VARCHAR(120) NOT NULL,
                socio_rut VARCHAR(20) NOT NULL,
                socio_email VARCHAR(120),
                nombre_completo VARCHAR(120) NOT NULL,
                run VARCHAR(15) NOT NULL,
                parentesco VARCHAR(40) NOT NULL,
                observacion_socio VARCHAR(300),
                certificado_nombre VARCHAR(255),
                certificado_tipo VARCHAR(120),
                certificado_data TEXT,
                estado estado_solicitud NOT NULL DEFAULT 'Pendiente de aprobación',
                fecha_sesion VARCHAR(10),
                numero_acta VARCHAR(50),
                observaciones_resolucion VARCHAR(500),
                resuelto_por VARCHAR(120),
                resuelto_at VARCHAR(30),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
    )
    for col_sql in (
        "ALTER TABLE solicitudes_cargas_familiares ADD COLUMN IF NOT EXISTS certificado_nombre VARCHAR(255);",
        "ALTER TABLE solicitudes_cargas_familiares ADD COLUMN IF NOT EXISTS certificado_tipo VARCHAR(120);",
        "ALTER TABLE solicitudes_cargas_familiares ADD COLUMN IF NOT EXISTS certificado_data TEXT;",
    ):
        await db.execute(text(col_sql))
    await db.commit()
    _TABLA_CARGAS_LISTA = True

MESES = [
    "",
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
]


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
    if len(limpio) < 8 or len(limpio) > 9:
        raise ValueError("RUN inválido (debe tener entre 7 y 8 dígitos más dígito verificador)")
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
    limpio = re.sub(r"[^0-9kK]", "", run or "").upper()
    if len(limpio) < 2:
        return run or ""
    cuerpo_num = re.sub(r"[^0-9]", "", limpio[:-1])
    dv = limpio[-1]
    if not cuerpo_num:
        return run or ""
    return f"{int(cuerpo_num):,}".replace(",", ".") + f"-{dv}"


def generar_clave_temporal_rut(run: str) -> str:
    """Genera la contraseña temporal inicial `Peralillo#{4_digitos_rut}`."""
    digitos = re.sub(r"[^0-9]", "", run or "")[:4] or "2026"
    return f"Peralillo#{digitos}"


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
    notificacionEmail: Optional[Dict[str, Any]] = None


class ResolucionSolicitudIn(BaseModel):
    accion: Literal["aprobar", "rechazar"]
    fechaSesion: Optional[str] = None  # Requerido si accion == "aprobar" (YYYY-MM-DD)
    numeroActa: Optional[str] = None
    observaciones: Optional[str] = None  # Requerido si accion == "rechazar"


def to_comprobante(
    s: SolicitudAfiliacion,
    notificacion_email: Optional[Dict[str, Any]] = None,
    ligero: bool = False,
) -> ComprobanteOut:
    run_fmt = formatear_run(s.run)
    msg = (
        f"Su solicitud de incorporación N° {s.folio} fue ingresada correctamente y se encuentra "
        f"en estado \"{s.estado.value}\". Será revisada por la Directiva del Comité de Bienestar."
    )
    if s.estado == EstadoSolicitud.APROBADA:
        msg = f"Solicitud N° {s.folio} APROBADA en sesión de Directorio del {s.fecha_sesion}. Socio habilitado como Activo."
    elif s.estado == EstadoSolicitud.RECHAZADA:
        msg = f"Solicitud N° {s.folio} RECHAZADA. Observaciones: {s.observaciones_resolucion or 'Sin observaciones registradas'}."

    if notificacion_email is None and ligero:
        notificacion_email = {
            "folio": s.folio,
            "destinatario": s.email or "",
            "motivo": s.observaciones_resolucion,
        }
    elif notificacion_email is None:
        if s.estado == EstadoSolicitud.PENDIENTE:
            notificacion_email = generar_correo_recepcion_solicitud(
                folio=s.folio,
                nombre_completo=s.nombre_completo,
                run_formateado=run_fmt,
                email_destino=s.email,
                grado=s.grado,
                calidad_contractual=s.calidad_contractual.value,
                porcentaje_descuento=s.porcentaje_descuento,
                meses_carencia=settings.AFILIACION_MESES_CARENCIA,
                cantidad_cargas=len(s.cargas),
                fecha_ingreso=s.created_at,
                enviar_smtp=False,
            )
        elif s.estado == EstadoSolicitud.APROBADA:
            notificacion_email = generar_correo_resolucion_solicitud(
                folio=s.folio,
                nombre_completo=s.nombre_completo,
                run_formateado=run_fmt,
                email_destino=s.email,
                aprobada=True,
                motivo=s.observaciones_resolucion,
                fecha_sesion=s.fecha_sesion,
                numero_acta=s.numero_acta,
                fecha_fin_carencia=s.fecha_fin_carencia,
                porcentaje_descuento=s.porcentaje_descuento,
                clave_temporal=generar_clave_temporal_rut(s.run),
                enviar_smtp=False,
            )
        elif s.estado == EstadoSolicitud.RECHAZADA:
            notificacion_email = generar_correo_resolucion_solicitud(
                folio=s.folio,
                nombre_completo=s.nombre_completo,
                run_formateado=run_fmt,
                email_destino=s.email,
                aprobada=False,
                motivo=s.observaciones_resolucion,
                fecha_sesion=s.fecha_sesion,
                numero_acta=s.numero_acta,
                porcentaje_descuento=s.porcentaje_descuento,
                enviar_smtp=False,
            )

    return ComprobanteOut(
        folio=s.folio,
        estado=s.estado.value,
        fechaIngreso=s.created_at,
        nombreCompleto=s.nombre_completo,
        run=run_fmt,
        grado=s.grado,
        calidadContractual=s.calidad_contractual.value,
        email=s.email,
        porcentajeDescuento=s.porcentaje_descuento,
        cargas=[
            CargaOut(
                nombreCompleto=c.nombre_completo,
                run=formatear_run(c.run),
                parentesco=c.parentesco,
            )
            for c in s.cargas
        ],
        mesesCarencia=settings.AFILIACION_MESES_CARENCIA,
        textoCarencia=texto_carencia(),
        mensaje=msg,
        fechaSesion=s.fecha_sesion,
        numeroActa=s.numero_acta,
        fechaFinCarencia=s.fecha_fin_carencia,
        observacionesResolucion=s.observaciones_resolucion,
        resueltoPor=s.resuelto_por,
        resueltoAt=s.resuelto_at,
        notificacionEmail=notificacion_email,
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


async def _sincronizar_smtp_desde_db(db: AsyncSession) -> None:
    params = await db.scalars(
        select(ParametroSistema).where(ParametroSistema.clave.like("SMTP_%"))
    )
    mapa = {p.clave: p.valor for p in params}
    if mapa:
        actualizar_config_smtp_runtime(
            host=mapa.get("SMTP_HOST"),
            port=int(mapa["SMTP_PORT"]) if mapa.get("SMTP_PORT", "").isdigit() else None,
            user=mapa.get("SMTP_USER"),
            password=mapa.get("SMTP_PASSWORD"),
        )


@router.post(
    "/solicitudes",
    response_model=ComprobanteOut,
    status_code=status.HTTP_201_CREATED,
    summary="Enviar solicitud de incorporación con cargas familiares (público)",
)
async def crear_solicitud(body: SolicitudIn, db: AsyncSession = Depends(get_db)):
    await _sincronizar_smtp_desde_db(db)
    periodo = periodo_actual()
    if not periodo["abierto"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Fuera del período de postulación ({periodo['descripcion']}).",
        )

    await _asegurar_tabla_cargas(db)
    run_postulante_limpio = re.sub(r"[^0-9kK]", "", body.run).upper()

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

    usuario_ya_existe = await db.scalar(
        select(User).where(
            func.upper(func.replace(func.replace(User.rut, ".", ""), "-", "")) == run_postulante_limpio
        )
    )
    if usuario_ya_existe:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El RUN {formatear_run(body.run)} ya se encuentra registrado como usuario en el sistema.",
        )

    # Validar unicidad de los RUN de las cargas familiares declaradas
    runs_cargas_form: set[str] = set()
    for c_item in body.cargas:
        c_limpio = re.sub(r"[^0-9kK]", "", c_item.run).upper()
        if c_limpio == run_postulante_limpio:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"La carga familiar '{c_item.nombreCompleto}' no puede tener el mismo RUN que el funcionario titular.",
            )
        if c_limpio in runs_cargas_form:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El RUN {formatear_run(c_item.run)} está repetido más de una vez en las cargas familiares ingresadas.",
            )
        runs_cargas_form.add(c_limpio)

        carga_en_af = await db.scalar(
            select(CargaFamiliar)
            .join(SolicitudAfiliacion, CargaFamiliar.solicitud_id == SolicitudAfiliacion.id)
            .where(
                func.upper(func.replace(func.replace(CargaFamiliar.run, ".", ""), "-", "")) == c_limpio,
                SolicitudAfiliacion.estado.in_([EstadoSolicitud.PENDIENTE, EstadoSolicitud.APROBADA]),
            )
        )
        if carga_en_af:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El RUN {formatear_run(c_item.run)} ({c_item.nombreCompleto}) ya se encuentra registrado como carga familiar en el sistema.",
            )

        carga_en_sc = await db.scalar(
            select(SolicitudCargaFamiliar).where(
                func.upper(func.replace(func.replace(SolicitudCargaFamiliar.run, ".", ""), "-", "")) == c_limpio,
                SolicitudCargaFamiliar.estado.in_([EstadoSolicitud.PENDIENTE, EstadoSolicitud.APROBADA]),
            )
        )
        if carga_en_sc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El RUN {formatear_run(c_item.run)} ({c_item.nombreCompleto}) ya registra una solicitud de carga familiar activa.",
            )

    anio = date.today().year
    folios_existentes = (
        await db.scalars(
            select(SolicitudAfiliacion.folio).where(SolicitudAfiliacion.folio.like(f"AF-{anio}-%"))
        )
    ).all()
    max_correlativo = 0
    for f_str in folios_existentes:
        try:
            num = int(f_str.split("-")[-1])
            if num > max_correlativo:
                max_correlativo = num
        except ValueError:
            pass
    folio_nuevo = f"AF-{anio}-{max_correlativo + 1:05d}"
    email_limpio = (body.email or "").strip() or None

    solicitud = SolicitudAfiliacion(
        folio=folio_nuevo,
        nombre_completo=body.nombreCompleto.strip(),
        run=body.run,
        grado=body.grado.strip(),
        calidad_contractual=CalidadContractual(body.calidadContractual),
        email=email_limpio,
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

    # Emitir Correo #1: Confirmación de Recepción y Gestión de la Solicitud
    correo_recepcion = generar_correo_recepcion_solicitud(
        folio=folio_nuevo,
        nombre_completo=body.nombreCompleto.strip(),
        run_formateado=formatear_run(body.run),
        email_destino=email_limpio,
        grado=body.grado.strip(),
        calidad_contractual=body.calidadContractual,
        porcentaje_descuento=settings.AFILIACION_PORCENTAJE_DESCUENTO,
        meses_carencia=settings.AFILIACION_MESES_CARENCIA,
        cantidad_cargas=len(body.cargas),
    )

    db.add(
        AuditLog(
            usuario_nombre=body.nombreCompleto.strip(),
            usuario_rut=formatear_run(body.run),
            usuario_rol="postulante",
            modulo="AFILIACION",
            accion="INGRESO_SOLICITUD_Y_CORREO",
            recurso_tipo="SolicitudAfiliacion",
            recurso_id=folio_nuevo,
            detalles=(
                f"Solicitud {folio_nuevo} ingresada por {body.nombreCompleto.strip()} (RUN {formatear_run(body.run)}). "
                f"Autoriza {settings.AFILIACION_PORCENTAJE_DESCUENTO}% descuento y acepta {settings.AFILIACION_MESES_CARENCIA} meses carencia. "
                f"Correo de confirmación enviado a {correo_recepcion['destinatario']}."
            ),
            ip_origen="127.0.0.1",
        )
    )

    await db.commit()
    creada = await db.scalar(
        select(SolicitudAfiliacion)
        .where(SolicitudAfiliacion.id == solicitud.id)
        .execution_options(populate_existing=True)
    )
    return to_comprobante(creada, notificacion_email=correo_recepcion)


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


@router.get("/conteo-pendientes", summary="Conteo de solicitudes de incorporación y cargas pendientes (Directiva)")
async def conteo_solicitudes_pendientes(
    _: User = Depends(require_roles(*DIRECTIVA)), db: AsyncSession = Depends(get_db)
) -> Dict[str, int]:
    await _asegurar_tabla_cargas(db)
    total_af = int(
        await db.scalar(
            select(func.count(SolicitudAfiliacion.id)).where(
                SolicitudAfiliacion.estado == EstadoSolicitud.PENDIENTE
            )
        )
        or 0
    )
    total_cf = int(
        await db.scalar(
            select(func.count(SolicitudCargaFamiliar.id)).where(
                SolicitudCargaFamiliar.estado == EstadoSolicitud.PENDIENTE
            )
        )
        or 0
    )
    return {
        "pendientes": total_af + total_cf,
        "afiliacionesPendientes": total_af,
        "cargasPendientes": total_cf,
    }


@router.get("/solicitudes", response_model=List[ComprobanteOut], summary="Listar solicitudes de incorporación (Directiva)")
async def listar_solicitudes(
    _: User = Depends(require_roles(*DIRECTIVA)), db: AsyncSession = Depends(get_db)
):
    result = (await db.scalars(select(SolicitudAfiliacion).order_by(SolicitudAfiliacion.id.desc()))).all()
    return [to_comprobante(s, ligero=True) for s in result]


DIRECTORIO_RESOLUTIVO = (UserRole.PRESIDENTE, UserRole.SECRETARIO, UserRole.SUPERUSUARIO)


def calcular_fin_carencia(fecha_sesion_str: str) -> str:
    """Calcula la fecha exacta cumplidos los 6 meses continuos de carencia."""
    f = datetime.strptime(fecha_sesion_str, "%Y-%m-%d").date()
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
    await _sincronizar_smtp_desde_db(db)
    solicitud = await db.scalar(
        select(SolicitudAfiliacion).where(SolicitudAfiliacion.folio == folio)
    )
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    if solicitud.estado != EstadoSolicitud.PENDIENTE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"La solicitud {solicitud.folio} ya fue resuelta ({solicitud.estado.value}) y no puede volver a modificarse.",
        )

    run_formateado = formatear_run(solicitud.run)
    rut_sin_simbolos = re.sub(r"[^0-9kK]", "", solicitud.run).upper()
    email_usuario = (solicitud.email or "").strip() or f"{rut_sin_simbolos.lower()}@mperalillo.cl"
    correo_resolucion: Optional[Dict[str, Any]] = None

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

        motivo_aprobacion = (
            (body.observaciones or "").strip()
            or "Cumple requisitos reglamentarios de Planta/Contrata Municipal y autorización de descuento del 4% por planilla."
        )

        solicitud.estado = EstadoSolicitud.APROBADA
        solicitud.fecha_sesion = body.fechaSesion
        solicitud.numero_acta = body.numeroActa.strip() if body.numeroActa else None
        solicitud.fecha_fin_carencia = fin_carencia
        solicitud.observaciones_resolucion = motivo_aprobacion
        solicitud.resuelto_por = f"{current_user.nombre_completo} ({current_user.rol.value})"
        solicitud.resuelto_at = datetime.now().isoformat()

        # Generar contraseña temporal inicial para que el socio pueda ingresar y cambiar su clave
        clave_temporal = generar_clave_temporal_rut(solicitud.run)

        # Buscar usuario existente por RUT (con o sin puntos) o por Email
        user_existente = await db.scalar(
            select(User).where(
                or_(
                    func.upper(func.replace(func.replace(User.rut, ".", ""), "-", "")) == rut_sin_simbolos,
                    func.lower(User.email) == email_usuario.lower(),
                )
            )
        )
        if user_existente:
            user_existente.rol = UserRole.SOCIO
            user_existente.is_active = True
            user_existente.hashed_password = get_password_hash(clave_temporal)
            user_existente.cargas_registradas = len(solicitud.cargas)
            user_existente.estado_previsional = "Al día"
            user_existente.meses_antiguedad = 0
            user_existente.antiguedad = "0 Meses (Socio Nuevo)"
            socio_user = user_existente
        else:
            nuevo_socio = User(
                rut=run_formateado,
                email=email_usuario,
                nombre_completo=solicitud.nombre_completo,
                hashed_password=get_password_hash(clave_temporal),
                rol=UserRole.SOCIO,
                is_superuser=False,
                is_active=True,
                departamento=f"Grado {solicitud.grado} - {solicitud.calidad_contractual.value}"[:120],
                antiguedad="0 Meses (Socio Nuevo)",
                meses_antiguedad=0,
                estado_previsional="Al día",
                saldo_salud_disponible=150000,
                saldo_salud_total_anual=150000,
                cargas_registradas=len(solicitud.cargas),
            )
            db.add(nuevo_socio)
            socio_user = nuevo_socio

        await db.flush()
        # Marcar cuenta con Clave Temporal activa para exigir cambio obligatorio en el primer inicio de sesión
        await guardar_seguridad_usuario(
            db,
            socio_user.id,
            intentos=0,
            bloqueada=False,
            debe_cambiar=True,
        )

        # Emitir Correo #2 (Aprobación con credenciales temporales y pasos a seguir)
        correo_resolucion = generar_correo_resolucion_solicitud(
            folio=solicitud.folio,
            nombre_completo=solicitud.nombre_completo,
            run_formateado=run_formateado,
            email_destino=email_usuario,
            aprobada=True,
            motivo=motivo_aprobacion,
            fecha_sesion=solicitud.fecha_sesion,
            numero_acta=solicitud.numero_acta,
            fecha_fin_carencia=fin_carencia,
            porcentaje_descuento=solicitud.porcentaje_descuento,
            clave_temporal=clave_temporal,
        )

        db.add(
            AuditLog(
                usuario_id=current_user.id,
                usuario_nombre=current_user.nombre_completo,
                usuario_rut=current_user.rut,
                usuario_rol=current_user.rol.value,
                modulo="AFILIACION",
                accion="APROBAR_AFILIACION_Y_CREDENCIALES",
                recurso_tipo="SolicitudAfiliacion",
                recurso_id=solicitud.folio,
                detalles=(
                    f"Solicitud N° {solicitud.folio} ACEPTADA ({motivo_aprobacion}). "
                    f"Cuenta activada para {solicitud.nombre_completo} ({run_formateado}) con cambio de clave "
                    f"obligatorio en primer ingreso. Credenciales enviadas por correo a {email_usuario}."
                ),
                ip_origen="127.0.0.1",
            )
        )

    elif body.accion == "rechazar":
        if not body.observaciones or not body.observaciones.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Debe ingresar la causal y detalle de observaciones para rechazar la solicitud.",
            )
        motivo_rechazo = body.observaciones.strip()
        solicitud.estado = EstadoSolicitud.RECHAZADA
        solicitud.fecha_sesion = body.fechaSesion
        solicitud.numero_acta = body.numeroActa.strip() if body.numeroActa else None
        solicitud.observaciones_resolucion = motivo_rechazo
        solicitud.resuelto_por = f"{current_user.nombre_completo} ({current_user.rol.value})"
        solicitud.resuelto_at = datetime.now().isoformat()

        # Emitir Correo #2 (Rechazo con motivo y pasos de subsanación)
        correo_resolucion = generar_correo_resolucion_solicitud(
            folio=solicitud.folio,
            nombre_completo=solicitud.nombre_completo,
            run_formateado=run_formateado,
            email_destino=email_usuario,
            aprobada=False,
            motivo=motivo_rechazo,
            fecha_sesion=solicitud.fecha_sesion,
            numero_acta=solicitud.numero_acta,
            porcentaje_descuento=solicitud.porcentaje_descuento,
        )

        db.add(
            AuditLog(
                usuario_id=current_user.id,
                usuario_nombre=current_user.nombre_completo,
                usuario_rut=current_user.rut,
                usuario_rol=current_user.rol.value,
                modulo="AFILIACION",
                accion="RECHAZAR_AFILIACION_Y_CORREO",
                recurso_tipo="SolicitudAfiliacion",
                recurso_id=solicitud.folio,
                detalles=(
                    f"Solicitud N° {solicitud.folio} RECHAZADA. Motivo: {motivo_rechazo}. "
                    f"Notificación enviada a {email_usuario}."
                ),
                ip_origen="127.0.0.1",
            )
        )

    await db.commit()
    actualizada = await db.scalar(
        select(SolicitudAfiliacion)
        .where(SolicitudAfiliacion.id == solicitud.id)
        .execution_options(populate_existing=True)
    )
    return to_comprobante(actualizada, notificacion_email=correo_resolucion)


@router.post(
    "/solicitudes/{folio}/reenviar-correo",
    response_model=ComprobanteOut,
    summary="Reenviar por SMTP real el correo correspondiente al estado actual de la solicitud",
)
async def reenviar_correo_solicitud(
    folio: str,
    _: User = Depends(require_roles(*DIRECTIVA)),
    db: AsyncSession = Depends(get_db),
):
    await _sincronizar_smtp_desde_db(db)
    solicitud = await db.scalar(
        select(SolicitudAfiliacion).where(SolicitudAfiliacion.folio == folio)
    )
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    run_fmt = formatear_run(solicitud.run)
    if solicitud.estado == EstadoSolicitud.PENDIENTE:
        correo = generar_correo_recepcion_solicitud(
            folio=solicitud.folio,
            nombre_completo=solicitud.nombre_completo,
            run_formateado=run_fmt,
            email_destino=solicitud.email,
            grado=solicitud.grado,
            calidad_contractual=solicitud.calidad_contractual.value,
            porcentaje_descuento=solicitud.porcentaje_descuento,
            meses_carencia=settings.AFILIACION_MESES_CARENCIA,
            cantidad_cargas=len(solicitud.cargas),
            enviar_smtp=True,
        )
    elif solicitud.estado == EstadoSolicitud.APROBADA:
        correo = generar_correo_resolucion_solicitud(
            folio=solicitud.folio,
            nombre_completo=solicitud.nombre_completo,
            run_formateado=run_fmt,
            email_destino=solicitud.email,
            aprobada=True,
            motivo=solicitud.observaciones_resolucion,
            fecha_sesion=solicitud.fecha_sesion,
            numero_acta=solicitud.numero_acta,
            fecha_fin_carencia=solicitud.fecha_fin_carencia,
            porcentaje_descuento=solicitud.porcentaje_descuento,
            clave_temporal=generar_clave_temporal_rut(solicitud.run),
            enviar_smtp=True,
        )
    else:
        correo = generar_correo_resolucion_solicitud(
            folio=solicitud.folio,
            nombre_completo=solicitud.nombre_completo,
            run_formateado=run_fmt,
            email_destino=solicitud.email,
            aprobada=False,
            motivo=solicitud.observaciones_resolucion,
            fecha_sesion=solicitud.fecha_sesion,
            numero_acta=solicitud.numero_acta,
            porcentaje_descuento=solicitud.porcentaje_descuento,
            enviar_smtp=True,
        )

    return to_comprobante(solicitud, notificacion_email=correo)


@router.get(
    "/buzon",
    summary="Auditoría interna de correos emitidos (Solo Directiva autenticada)",
)
async def obtener_buzon_correos(
    q: Optional[str] = None,
    _: User = Depends(require_roles(*DIRECTIVA)),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Retorna la bandeja de entrada con todos los correos transaccionales emitidos para las solicitudes:
    1) Correo de Recepción y Gestión (al crearse cada solicitud)
    2) Correo de Resolución (Aceptada con Clave Temporal + Pasos, o Rechazada con Motivo)
    """
    solicitudes = (
        await db.scalars(select(SolicitudAfiliacion).order_by(SolicitudAfiliacion.id.desc()))
    ).all()

    mensajes: List[Dict[str, Any]] = []
    for s in solicitudes:
        run_fmt = formatear_run(s.run)
        # Si ya está resuelta, primero aparece el correo más reciente (Resolución) y luego el de Recepción
        if s.estado == EstadoSolicitud.APROBADA:
            c_res = generar_correo_resolucion_solicitud(
                folio=s.folio,
                nombre_completo=s.nombre_completo,
                run_formateado=run_fmt,
                email_destino=s.email,
                aprobada=True,
                motivo=s.observaciones_resolucion,
                fecha_sesion=s.fecha_sesion,
                numero_acta=s.numero_acta,
                fecha_fin_carencia=s.fecha_fin_carencia,
                porcentaje_descuento=s.porcentaje_descuento,
                clave_temporal=generar_clave_temporal_rut(s.run),
                enviar_smtp=False,
            )
            c_res["id"] = f"{s.folio}-resolucion-aprobada"
            c_res["fechaEmision"] = (s.resuelto_at or s.created_at.isoformat())[:16].replace("T", " ")
            mensajes.append(c_res)
        elif s.estado == EstadoSolicitud.RECHAZADA:
            c_rech = generar_correo_resolucion_solicitud(
                folio=s.folio,
                nombre_completo=s.nombre_completo,
                run_formateado=run_fmt,
                email_destino=s.email,
                aprobada=False,
                motivo=s.observaciones_resolucion,
                fecha_sesion=s.fecha_sesion,
                numero_acta=s.numero_acta,
                porcentaje_descuento=s.porcentaje_descuento,
                enviar_smtp=False,
            )
            c_rech["id"] = f"{s.folio}-resolucion-rechazada"
            c_rech["fechaEmision"] = (s.resuelto_at or s.created_at.isoformat())[:16].replace("T", " ")
            mensajes.append(c_rech)

        # Correo #1: Recepción y Gestión (emitido al crearse la solicitud)
        c_rec = generar_correo_recepcion_solicitud(
            folio=s.folio,
            nombre_completo=s.nombre_completo,
            run_formateado=run_fmt,
            email_destino=s.email,
            grado=s.grado,
            calidad_contractual=s.calidad_contractual.value,
            porcentaje_descuento=s.porcentaje_descuento,
            meses_carencia=settings.AFILIACION_MESES_CARENCIA,
            cantidad_cargas=len(s.cargas),
            fecha_ingreso=s.created_at,
            enviar_smtp=False,
        )
        c_rec["id"] = f"{s.folio}-recepcion"
        c_rec["fechaEmision"] = s.created_at.strftime("%Y-%m-%d %H:%M") if s.created_at else c_rec["fechaEmision"]
        mensajes.append(c_rec)

    if q and q.strip():
        qn = q.strip().lower()
        q_clean = re.sub(r"[^0-9kKa-zA-Z@]", "", qn)
        filtrados = []
        for m in mensajes:
            texto_busqueda = (
                f"{m.get('destinatario', '')} {m.get('folio', '')} {m.get('nombreDestinatario', '')} {m.get('runDestinatario', '')}"
            ).lower()
            texto_clean = re.sub(r"[^0-9kKa-zA-Z@]", "", texto_busqueda)
            if qn in texto_busqueda or (q_clean and q_clean in texto_clean):
                filtrados.append(m)
        mensajes = filtrados

    return {
        "total": len(mensajes),
        "correos": mensajes,
    }


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


TIPO_CERTIFICADO_POR_PARENTESCO = {
    "Hijo/a": "Certificado de Nacimiento del Hijo/a",
    "Hijo": "Certificado de Nacimiento del Hijo/a",
    "Hija": "Certificado de Nacimiento del Hijo/a",
    "Cónyuge": "Certificado de Matrimonio",
    "Conviviente Civil": "Certificado de Acuerdo de Unión Civil (AUC)",
    "Padre / Madre": "Certificado de Nacimiento del Socio Titular",
    "Otro vínculo legal": "Certificado o Resolución Judicial de Carga Legal",
}


class NuevaCargaIn(BaseModel):
    nombreCompleto: str = Field(..., min_length=3, max_length=160)
    run: str = Field(..., min_length=7, max_length=16)
    parentesco: Optional[str] = Field("Hijo/a", max_length=60)
    observacionSocio: Optional[str] = Field(None, max_length=500)
    certificadoNombre: Optional[str] = Field(None, max_length=255)
    certificadoTipo: Optional[str] = Field(None, max_length=120)
    certificadoData: Optional[str] = None

    @field_validator("run")
    @classmethod
    def check_run(cls, v: str) -> str:
        return normalizar_run(v)


class SolicitudCargaOut(BaseModel):
    id: int
    folio: str
    socioId: int
    socioNombre: str
    socioRut: str
    socioEmail: Optional[str] = None
    nombreCompleto: str
    run: str
    parentesco: Optional[str] = None
    observacionSocio: Optional[str] = None
    certificadoNombre: Optional[str] = None
    certificadoTipo: Optional[str] = None
    certificadoData: Optional[str] = None
    estado: str
    fechaIngreso: datetime
    fechaSesion: Optional[str] = None
    numeroActa: Optional[str] = None
    observacionesResolucion: Optional[str] = None
    resueltoPor: Optional[str] = None
    resueltoAt: Optional[str] = None


def to_solicitud_carga_out(sc: SolicitudCargaFamiliar) -> SolicitudCargaOut:
    parentesco_val = sc.parentesco or "Hijo/a"
    cert_tipo = sc.certificado_tipo or TIPO_CERTIFICADO_POR_PARENTESCO.get(
        parentesco_val, "Certificado de Respaldo"
    )
    return SolicitudCargaOut(
        id=sc.id,
        folio=sc.folio,
        socioId=sc.socio_id,
        socioNombre=sc.socio_nombre,
        socioRut=formatear_run(sc.socio_rut),
        socioEmail=sc.socio_email,
        nombreCompleto=sc.nombre_completo,
        run=formatear_run(sc.run),
        parentesco=parentesco_val,
        observacionSocio=sc.observacion_socio,
        certificadoNombre=sc.certificado_nombre,
        certificadoTipo=cert_tipo,
        certificadoData=sc.certificado_data,
        estado=sc.estado.value if isinstance(sc.estado, EstadoSolicitud) else str(sc.estado),
        fechaIngreso=sc.created_at or datetime.now(),
        fechaSesion=sc.fecha_sesion,
        numeroActa=sc.numero_acta,
        observacionesResolucion=sc.observaciones_resolucion,
        resueltoPor=sc.resuelto_por,
        resueltoAt=sc.resuelto_at,
    )


@router.get("/mis-cargas", summary="Listar cargas familiares (propias para el socio; todas para Admin/Superusuario)")
async def get_mis_cargas(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    await _asegurar_tabla_cargas(db)
    es_admin_o_super = bool(
        current_user.is_superuser or current_user.rol in (UserRole.ADMIN, UserRole.SUPERUSUARIO)
    )

    cargas_list: List[Dict[str, Any]] = []
    runs_vistos: set[str] = set()

    if es_admin_o_super:
        # Admin y Superusuario ven TODAS las cargas familiares de todos los socios
        todas_solicitudes_extra = (
            await db.scalars(
                select(SolicitudCargaFamiliar).order_by(SolicitudCargaFamiliar.id.desc())
            )
        ).all()

        for sc in todas_solicitudes_extra:
            run_norm = re.sub(r"[^0-9kK]", "", sc.run or "").upper()
            estado_val = sc.estado.value if isinstance(sc.estado, EstadoSolicitud) else str(sc.estado)
            if estado_val == EstadoSolicitud.APROBADA.value:
                runs_vistos.add(run_norm)
                estado_mostrar = "Vigente"
            else:
                estado_mostrar = estado_val

            parentesco_val = sc.parentesco or "Hijo/a"
            cert_tipo = sc.certificado_tipo or TIPO_CERTIFICADO_POR_PARENTESCO.get(
                parentesco_val, "Certificado de Respaldo"
            )
            cargas_list.append(
                {
                    "id": f"cf-{sc.id}",
                    "folio": sc.folio,
                    "socioNombre": sc.socio_nombre,
                    "socioRut": formatear_run(sc.socio_rut),
                    "nombre": sc.nombre_completo,
                    "parentesco": parentesco_val,
                    "rut": formatear_run(sc.run),
                    "observacion": sc.observacion_socio or cert_tipo,
                    "certificadoNombre": sc.certificado_nombre,
                    "certificadoTipo": cert_tipo,
                    "certificadoData": sc.certificado_data,
                    "estado": estado_mostrar,
                    "fechaSolicitud": (sc.created_at or datetime.now()).strftime("%Y-%m-%d"),
                    "observacionesResolucion": sc.observaciones_resolucion,
                }
            )

        aprobadas_af = (
            await db.scalars(
                select(SolicitudAfiliacion)
                .where(SolicitudAfiliacion.estado == EstadoSolicitud.APROBADA)
                .order_by(SolicitudAfiliacion.id.desc())
            )
        ).all()
        for sol in aprobadas_af:
            for c in sol.cargas:
                run_norm = re.sub(r"[^0-9kK]", "", c.run or "").upper()
                if run_norm in runs_vistos:
                    continue
                runs_vistos.add(run_norm)
                parentesco_val = c.parentesco or "Carga legal"
                cargas_list.append(
                    {
                        "id": f"init-{c.id}",
                        "folio": sol.folio,
                        "socioNombre": sol.nombre_completo,
                        "socioRut": formatear_run(sol.run),
                        "nombre": c.nombre_completo,
                        "parentesco": parentesco_val,
                        "rut": formatear_run(c.run),
                        "observacion": f"Incorporación inicial ({sol.folio})",
                        "certificadoNombre": None,
                        "certificadoTipo": TIPO_CERTIFICADO_POR_PARENTESCO.get(
                            parentesco_val, "Declaración de Incorporación"
                        ),
                        "certificadoData": None,
                        "estado": "Vigente",
                        "fechaSolicitud": sol.fecha_sesion or "",
                        "observacionesResolucion": None,
                    }
                )

        # Incluir las cargas semilla de Carlos Valenzuela M. en la vista global
        for seed_item in (
            {
                "id": "seed-1",
                "folio": "AF-2024-00012",
                "socioNombre": "Carlos Valenzuela M.",
                "socioRut": "15.489.123-K",
                "nombre": "Valentina Valenzuela Gómez",
                "parentesco": "Hijo/a",
                "rut": "24.120.334-1",
                "observacion": "Certificado de Nacimiento del Hijo/a (Incorporación inicial)",
                "certificadoNombre": None,
                "certificadoTipo": "Certificado de Nacimiento del Hijo/a",
                "certificadoData": None,
                "estado": "Vigente",
                "fechaSolicitud": "2024-03-15",
                "observacionesResolucion": None,
            },
            {
                "id": "seed-2",
                "folio": "AF-2024-00012",
                "socioNombre": "Carlos Valenzuela M.",
                "socioRut": "15.489.123-K",
                "nombre": "Matías Valenzuela Gómez",
                "parentesco": "Hijo/a",
                "rut": "26.445.892-3",
                "observacion": "Certificado de Nacimiento del Hijo/a (Incorporación inicial)",
                "certificadoNombre": None,
                "certificadoTipo": "Certificado de Nacimiento del Hijo/a",
                "certificadoData": None,
                "estado": "Vigente",
                "fechaSolicitud": "2024-03-15",
                "observacionesResolucion": None,
            },
        ):
            run_norm = re.sub(r"[^0-9kK]", "", seed_item["rut"]).upper()
            if run_norm not in runs_vistos:
                runs_vistos.add(run_norm)
                cargas_list.append(seed_item)

        return {"modoVista": "global", "cargas": cargas_list}

    # Vista individual: el socio solo ve sus propias cargas familiares
    rut_sin_simbolos = re.sub(r"[^0-9kK]", "", current_user.rut or "").upper()

    sol_aprobada = await db.scalar(
        select(SolicitudAfiliacion).where(
            func.upper(func.replace(func.replace(SolicitudAfiliacion.run, ".", ""), "-", "")) == rut_sin_simbolos,
            SolicitudAfiliacion.estado == EstadoSolicitud.APROBADA,
        )
    )

    solicitudes_extra = (
        await db.scalars(
            select(SolicitudCargaFamiliar)
            .where(SolicitudCargaFamiliar.socio_id == current_user.id)
            .order_by(SolicitudCargaFamiliar.id.desc())
        )
    ).all()

    for sc in solicitudes_extra:
        run_norm = re.sub(r"[^0-9kK]", "", sc.run or "").upper()
        estado_val = sc.estado.value if isinstance(sc.estado, EstadoSolicitud) else str(sc.estado)
        if estado_val == EstadoSolicitud.APROBADA.value:
            runs_vistos.add(run_norm)
            estado_mostrar = "Vigente"
        else:
            estado_mostrar = estado_val

        parentesco_val = sc.parentesco or "Hijo/a"
        cert_tipo = sc.certificado_tipo or TIPO_CERTIFICADO_POR_PARENTESCO.get(
            parentesco_val, "Certificado de Respaldo"
        )
        cargas_list.append(
            {
                "id": f"cf-{sc.id}",
                "folio": sc.folio,
                "socioNombre": current_user.nombre_completo,
                "socioRut": formatear_run(current_user.rut),
                "nombre": sc.nombre_completo,
                "parentesco": parentesco_val,
                "rut": formatear_run(sc.run),
                "observacion": sc.observacion_socio or cert_tipo,
                "certificadoNombre": sc.certificado_nombre,
                "certificadoTipo": cert_tipo,
                "certificadoData": sc.certificado_data,
                "estado": estado_mostrar,
                "fechaSolicitud": (sc.created_at or datetime.now()).strftime("%Y-%m-%d"),
                "observacionesResolucion": sc.observaciones_resolucion,
            }
        )

    if sol_aprobada and sol_aprobada.cargas:
        for c in sol_aprobada.cargas:
            run_norm = re.sub(r"[^0-9kK]", "", c.run or "").upper()
            if run_norm in runs_vistos:
                continue
            runs_vistos.add(run_norm)
            parentesco_val = c.parentesco or "Carga legal"
            cargas_list.append(
                {
                    "id": f"init-{c.id}",
                    "folio": sol_aprobada.folio,
                    "socioNombre": current_user.nombre_completo,
                    "socioRut": formatear_run(current_user.rut),
                    "nombre": c.nombre_completo,
                    "parentesco": parentesco_val,
                    "rut": formatear_run(c.run),
                    "observacion": f"Incorporación inicial ({sol_aprobada.folio})",
                    "certificadoNombre": None,
                    "certificadoTipo": TIPO_CERTIFICADO_POR_PARENTESCO.get(
                        parentesco_val, "Declaración de Incorporación"
                    ),
                    "certificadoData": None,
                    "estado": "Vigente",
                    "fechaSolicitud": sol_aprobada.fecha_sesion or "",
                    "observacionesResolucion": None,
                }
            )
    elif (current_user.email or "").lower() == "cvalenzuela@mperalillo.cl":
        for seed_item in (
            {
                "id": "seed-1",
                "folio": "AF-2024-00012",
                "socioNombre": current_user.nombre_completo,
                "socioRut": formatear_run(current_user.rut),
                "nombre": "Valentina Valenzuela Gómez",
                "parentesco": "Hijo/a",
                "rut": "24.120.334-1",
                "observacion": "Certificado de Nacimiento del Hijo/a (Incorporación inicial)",
                "certificadoNombre": None,
                "certificadoTipo": "Certificado de Nacimiento del Hijo/a",
                "certificadoData": None,
                "estado": "Vigente",
                "fechaSolicitud": "2024-03-15",
                "observacionesResolucion": None,
            },
            {
                "id": "seed-2",
                "folio": "AF-2024-00012",
                "socioNombre": current_user.nombre_completo,
                "socioRut": formatear_run(current_user.rut),
                "nombre": "Matías Valenzuela Gómez",
                "parentesco": "Hijo/a",
                "rut": "26.445.892-3",
                "observacion": "Certificado de Nacimiento del Hijo/a (Incorporación inicial)",
                "certificadoNombre": None,
                "certificadoTipo": "Certificado de Nacimiento del Hijo/a",
                "certificadoData": None,
                "estado": "Vigente",
                "fechaSolicitud": "2024-03-15",
                "observacionesResolucion": None,
            },
        ):
            run_norm = re.sub(r"[^0-9kK]", "", seed_item["rut"]).upper()
            if run_norm not in runs_vistos:
                runs_vistos.add(run_norm)
                cargas_list.append(seed_item)

    return {"modoVista": "socio", "cargas": cargas_list}


@router.post(
    "/mis-cargas",
    response_model=SolicitudCargaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Solicitar la incorporación de una nueva carga familiar posterior al alta del socio",
)
async def solicitar_nueva_carga_familiar(
    body: NuevaCargaIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _asegurar_tabla_cargas(db)
    run_carga_norm = re.sub(r"[^0-9kK]", "", body.run).upper()
    run_socio_norm = re.sub(r"[^0-9kK]", "", current_user.rut or "").upper()

    if run_carga_norm == run_socio_norm:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El RUN de la carga familiar no puede ser igual al RUN del socio titular.",
        )

    parentesco_limpio = (body.parentesco or "Hijo/a").strip()
    cert_tipo_exigido = TIPO_CERTIFICADO_POR_PARENTESCO.get(
        parentesco_limpio, "Certificado de Respaldo Legal"
    )
    if not body.certificadoData or not body.certificadoNombre:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Debe adjuntar el {cert_tipo_exigido} (formato PDF, JPG o PNG) para respaldar la solicitud.",
        )

    # Verificar unicidad global: el RUN de la carga no puede pertenecer a otro socio ni estar ya registrado como carga
    es_socio_existente = await db.scalar(
        select(User).where(
            func.upper(func.replace(func.replace(User.rut, ".", ""), "-", "")) == run_carga_norm
        )
    )
    if es_socio_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El RUN {formatear_run(body.run)} ya pertenece a un socio titular registrado ({es_socio_existente.nombre_completo}).",
        )

    carga_inicial_existente = await db.scalar(
        select(CargaFamiliar)
        .join(SolicitudAfiliacion, CargaFamiliar.solicitud_id == SolicitudAfiliacion.id)
        .where(
            func.upper(func.replace(func.replace(CargaFamiliar.run, ".", ""), "-", "")) == run_carga_norm,
            SolicitudAfiliacion.estado.in_([EstadoSolicitud.PENDIENTE, EstadoSolicitud.APROBADA]),
        )
    )
    if carga_inicial_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El RUN {formatear_run(body.run)} ya se encuentra registrado como carga familiar en el sistema.",
        )

    existente = await db.scalar(
        select(SolicitudCargaFamiliar).where(
            func.upper(func.replace(func.replace(SolicitudCargaFamiliar.run, ".", ""), "-", "")) == run_carga_norm,
            SolicitudCargaFamiliar.estado.in_([EstadoSolicitud.PENDIENTE, EstadoSolicitud.APROBADA]),
        )
    )
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un registro para esta carga familiar con RUN {formatear_run(body.run)} (folio {existente.folio}, estado \"{existente.estado.value}\").",
        )

    anio = date.today().year
    folios_cf = (
        await db.scalars(
            select(SolicitudCargaFamiliar.folio).where(SolicitudCargaFamiliar.folio.like(f"CF-{anio}-%"))
        )
    ).all()
    max_corr = 0
    for f_str in folios_cf:
        try:
            num = int(f_str.split("-")[-1])
            if num > max_corr:
                max_corr = num
        except ValueError:
            pass
    folio_nuevo = f"CF-{anio}-{max_corr + 1:05d}"

    nueva_sc = SolicitudCargaFamiliar(
        folio=folio_nuevo,
        socio_id=current_user.id,
        socio_nombre=current_user.nombre_completo,
        socio_rut=formatear_run(current_user.rut),
        socio_email=current_user.email,
        nombre_completo=body.nombreCompleto.strip(),
        run=body.run,
        parentesco=parentesco_limpio,
        observacion_socio=(body.observacionSocio or "").strip() or cert_tipo_exigido,
        certificado_nombre=body.certificadoNombre.strip(),
        certificado_tipo=body.certificadoTipo or cert_tipo_exigido,
        certificado_data=body.certificadoData,
        estado=EstadoSolicitud.PENDIENTE,
    )
    db.add(nueva_sc)
    db.add(
        AuditLog(
            usuario_id=current_user.id,
            usuario_nombre=current_user.nombre_completo,
            usuario_rut=current_user.rut,
            usuario_rol=current_user.rol.value,
            modulo="AFILIACION",
            accion="SOLICITUD_NUEVA_CARGA_FAMILIAR",
            recurso_tipo="SolicitudCargaFamiliar",
            recurso_id=folio_nuevo,
            detalles=(
                f"Socio {current_user.nombre_completo} solicitó incorporar nueva carga familiar: "
                f"{body.nombreCompleto.strip()} (RUN {formatear_run(body.run)}, {parentesco_limpio}) "
                f"adjuntando {cert_tipo_exigido} ({body.certificadoNombre.strip()})."
            ),
            ip_origen="127.0.0.1",
        )
    )
    await db.commit()
    await db.refresh(nueva_sc)
    return to_solicitud_carga_out(nueva_sc)


@router.get(
    "/solicitudes-cargas",
    response_model=List[SolicitudCargaOut],
    summary="Listar solicitudes de nuevas cargas familiares para evaluación de la Directiva",
)
async def listar_solicitudes_cargas(
    _: User = Depends(require_roles(*DIRECTIVA)),
    db: AsyncSession = Depends(get_db),
):
    await _asegurar_tabla_cargas(db)
    rows = (
        await db.scalars(
            select(SolicitudCargaFamiliar).order_by(SolicitudCargaFamiliar.id.desc())
        )
    ).all()
    return [to_solicitud_carga_out(r) for r in rows]


@router.post(
    "/solicitudes-cargas/{folio}/resolucion",
    response_model=SolicitudCargaOut,
    summary="Aprobar o rechazar solicitud de nueva carga familiar (Directiva Resolutiva)",
)
async def resolver_solicitud_carga(
    folio: str,
    body: ResolucionSolicitudIn,
    current_user: User = Depends(require_roles(*DIRECTORIO_RESOLUTIVO)),
    db: AsyncSession = Depends(get_db),
):
    await _asegurar_tabla_cargas(db)
    await _sincronizar_smtp_desde_db(db)

    sc = await db.scalar(
        select(SolicitudCargaFamiliar).where(SolicitudCargaFamiliar.folio == folio)
    )
    if not sc:
        raise HTTPException(status_code=404, detail="Solicitud de carga familiar no encontrada.")

    if sc.estado != EstadoSolicitud.PENDIENTE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"La solicitud {sc.folio} ya fue resuelta ({sc.estado.value}) y no puede modificarse.",
        )

    socio = await db.scalar(select(User).where(User.id == sc.socio_id))

    if body.accion == "aprobar":
        motivo = (
            (body.observaciones or "").strip()
            or "Acredita vínculo legal / certificado de nacimiento conforme al Reglamento del Servicio de Bienestar."
        )
        sc.estado = EstadoSolicitud.APROBADA
        sc.fecha_sesion = body.fechaSesion or date.today().isoformat()
        sc.numero_acta = (body.numeroActa or "").strip() or None
        sc.observaciones_resolucion = motivo
        sc.resuelto_por = f"{current_user.nombre_completo} ({current_user.rol.value})"
        sc.resuelto_at = datetime.now().isoformat()

        if socio:
            socio.cargas_registradas = int(socio.cargas_registradas or 0) + 1
            rut_socio_norm = re.sub(r"[^0-9kK]", "", socio.rut or "").upper()
            sol_af = await db.scalar(
                select(SolicitudAfiliacion).where(
                    func.upper(func.replace(func.replace(SolicitudAfiliacion.run, ".", ""), "-", "")) == rut_socio_norm,
                    SolicitudAfiliacion.estado == EstadoSolicitud.APROBADA,
                )
            )
            if sol_af:
                run_cf_norm = re.sub(r"[^0-9kK]", "", sc.run or "").upper()
                ya_en_af = any(
                    re.sub(r"[^0-9kK]", "", c.run or "").upper() == run_cf_norm
                    for c in sol_af.cargas
                )
                if not ya_en_af:
                    db.add(
                        CargaFamiliar(
                            solicitud_id=sol_af.id,
                            nombre_completo=sc.nombre_completo,
                            run=sc.run,
                            parentesco=sc.parentesco,
                        )
                    )

        generar_correo_resolucion_carga_familiar(
            folio=sc.folio,
            socio_nombre=sc.socio_nombre,
            socio_rut=formatear_run(sc.socio_rut),
            email_destino=sc.socio_email or "",
            carga_nombre=sc.nombre_completo,
            carga_run=formatear_run(sc.run),
            parentesco=sc.parentesco or "Hijo/a",
            aprobada=True,
            motivo=motivo,
            fecha_sesion=sc.fecha_sesion,
            numero_acta=sc.numero_acta,
        )

        db.add(
            AuditLog(
                usuario_id=current_user.id,
                usuario_nombre=current_user.nombre_completo,
                usuario_rut=current_user.rut,
                usuario_rol=current_user.rol.value,
                modulo="AFILIACION",
                accion="APROBAR_CARGA_FAMILIAR",
                recurso_tipo="SolicitudCargaFamiliar",
                recurso_id=sc.folio,
                detalles=(
                    f"Carga familiar {sc.nombre_completo} (RUN {formatear_run(sc.run)}, {sc.parentesco}) "
                    f"APROBADA para socio {sc.socio_nombre}."
                ),
                ip_origen="127.0.0.1",
            )
        )
    else:
        if not body.observaciones or not body.observaciones.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Debe indicar el motivo o causal de rechazo de la carga familiar.",
            )
        motivo = body.observaciones.strip()
        sc.estado = EstadoSolicitud.RECHAZADA
        sc.fecha_sesion = body.fechaSesion or date.today().isoformat()
        sc.numero_acta = (body.numeroActa or "").strip() or None
        sc.observaciones_resolucion = motivo
        sc.resuelto_por = f"{current_user.nombre_completo} ({current_user.rol.value})"
        sc.resuelto_at = datetime.now().isoformat()

        generar_correo_resolucion_carga_familiar(
            folio=sc.folio,
            socio_nombre=sc.socio_nombre,
            socio_rut=formatear_run(sc.socio_rut),
            email_destino=sc.socio_email or "",
            carga_nombre=sc.nombre_completo,
            carga_run=formatear_run(sc.run),
            parentesco=sc.parentesco or "Hijo/a",
            aprobada=False,
            motivo=motivo,
            fecha_sesion=sc.fecha_sesion,
            numero_acta=sc.numero_acta,
        )

        db.add(
            AuditLog(
                usuario_id=current_user.id,
                usuario_nombre=current_user.nombre_completo,
                usuario_rut=current_user.rut,
                usuario_rol=current_user.rol.value,
                modulo="AFILIACION",
                accion="RECHAZAR_CARGA_FAMILIAR",
                recurso_tipo="SolicitudCargaFamiliar",
                recurso_id=sc.folio,
                detalles=(
                    f"Carga familiar {sc.nombre_completo} (RUN {formatear_run(sc.run)}) "
                    f"RECHAZADA para socio {sc.socio_nombre}. Motivo: {motivo}."
                ),
                ip_origen="127.0.0.1",
            )
        )

    await db.commit()
    await db.refresh(sc)
    return to_solicitud_carga_out(sc)


@router.get("/cargas", summary="Listar cargas familiares registradas")
async def get_cargas_familiares() -> Dict[str, Any]:
    return {
        "cargas": [
            {"id": 1, "nombre": "Valentina Peralillo", "parentesco": "Hija", "edad": 7, "estado": "Vigente"},
            {"id": 2, "nombre": "Matías Peralillo", "parentesco": "Hijo", "edad": 4, "estado": "Vigente"},
        ]
    }


# ---------------------------------------------------------------------------
# Carga Masiva de Socios y Cargas Familiares (Exclusivo 7 cuentas Muni Peralillo)
# ---------------------------------------------------------------------------
CUENTAS_MUNI_PERALILLO_CARGA_MASIVA = {
    "superadmin@mperalillo.cl",
    "msoto@mperalillo.cl",
    "pfuentes@mperalillo.cl",
    "rmorales@mperalillo.cl",
    "jcontreras@mperalillo.cl",
    "aibarra@mperalillo.cl",
    "cvalenzuela@mperalillo.cl",
}

RUTS_MUNI_PERALILLO_CARGA_MASIVA = {
    "11111111-1",
    "12345678-9",
    "13456789-0",
    "14982112-4",
    "16234567-8",
    "17345678-K",
    "15489123-K",
}


class CargaMasivaDependienteIn(BaseModel):
    nombreCompleto: str
    run: str
    parentesco: Optional[str] = "Hijo/a"


class CargaMasivaSocioIn(BaseModel):
    rut: str
    nombreCompleto: str
    email: str
    calidadContractual: Optional[str] = "Planta"
    grado: Optional[str] = "Grado 10"
    departamento: Optional[str] = "Departamento Municipal"
    mesesAntiguedad: Optional[int] = 12
    rol: Optional[str] = "socio"
    saldoSaludDisponible: Optional[float] = 150000.0
    cargas: List[CargaMasivaDependienteIn] = Field(default_factory=list)


class CargaMasivaRequestIn(BaseModel):
    registros: List[CargaMasivaSocioIn]
    numeroActa: Optional[str] = "Nómina Masiva Muni Peralillo"
    enviarCorreos: bool = False


def _es_cuenta_autorizada_muni_peralillo(user: User) -> bool:
    email_clean = (user.email or "").strip().lower()
    rut_clean = re.sub(r"[^0-9kK]", "", user.rut or "").upper()
    if len(rut_clean) >= 2:
        rut_norm = f"{rut_clean[:-1]}-{rut_clean[-1]}"
    else:
        rut_norm = rut_clean
    return (
        email_clean in CUENTAS_MUNI_PERALILLO_CARGA_MASIVA
        or rut_norm in RUTS_MUNI_PERALILLO_CARGA_MASIVA
    )


@router.post(
    "/carga-masiva",
    summary="Carga masiva de socios, cuentas y cargas familiares (Exclusivo 7 cuentas Muni Peralillo)",
)
async def procesar_carga_masiva_socios(
    body: CargaMasivaRequestIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    if not _es_cuenta_autorizada_muni_peralillo(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Acceso restringido: Solo las 7 cuentas institucionales autorizadas de la "
                "Municipalidad de Peralillo (@mperalillo.cl) pueden ejecutar la carga masiva."
            ),
        )

    if not body.registros:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El archivo o listado de carga masiva no contiene registros válidos.",
        )

    await _asegurar_tabla_cargas(db)
    if body.enviarCorreos:
        await _sincronizar_smtp_desde_db(db)

    anio = date.today().year
    folios_existentes = (
        await db.scalars(
            select(SolicitudAfiliacion.folio).where(SolicitudAfiliacion.folio.like(f"AF-{anio}-%"))
        )
    ).all()
    max_correlativo = 0
    for f_str in folios_existentes:
        try:
            num = int(f_str.split("-")[-1])
            if num > max_correlativo:
                max_correlativo = num
        except ValueError:
            pass

    fecha_hoy = date.today().isoformat()
    fin_carencia_default = calcular_fin_carencia(fecha_hoy)
    acta_str = (body.numeroActa or "Carga Masiva Inicial Muni Peralillo").strip()

    creados = 0
    duplicados_omitidos = 0
    cargas_agregadas = 0
    errores: List[str] = []
    detalle_procesados: List[Dict[str, Any]] = []
    correos_pendientes_envio: List[Dict[str, Any]] = []

    # Precargar todos los RUTs y correos ya existentes en la base de datos para garantizar unicidad estricta
    usuarios_db = (await db.scalars(select(User))).all()
    ruts_socios_existentes: set[str] = {
        re.sub(r"[^0-9kK]", "", u.rut or "").upper() for u in usuarios_db if u.rut
    }
    emails_existentes: set[str] = {
        (u.email or "").strip().lower() for u in usuarios_db if u.email
    }

    solicitudes_af_db = (
        await db.scalars(
            select(SolicitudAfiliacion).where(
                SolicitudAfiliacion.estado.in_([EstadoSolicitud.PENDIENTE, EstadoSolicitud.APROBADA])
            )
        )
    ).all()
    for s_db in solicitudes_af_db:
        if s_db.run:
            ruts_socios_existentes.add(re.sub(r"[^0-9kK]", "", s_db.run).upper())

    cargas_af_db = (
        await db.scalars(
            select(CargaFamiliar)
            .join(SolicitudAfiliacion, CargaFamiliar.solicitud_id == SolicitudAfiliacion.id)
            .where(SolicitudAfiliacion.estado.in_([EstadoSolicitud.PENDIENTE, EstadoSolicitud.APROBADA]))
        )
    ).all()
    ruts_cargas_existentes: set[str] = {
        re.sub(r"[^0-9kK]", "", cf.run or "").upper() for cf in cargas_af_db if cf.run
    }

    cargas_extra_db = (
        await db.scalars(
            select(SolicitudCargaFamiliar).where(
                SolicitudCargaFamiliar.estado.in_([EstadoSolicitud.PENDIENTE, EstadoSolicitud.APROBADA])
            )
        )
    ).all()
    for sc_db in cargas_extra_db:
        if sc_db.run:
            ruts_cargas_existentes.add(re.sub(r"[^0-9kK]", "", sc_db.run).upper())

    # Conjuntos para evitar duplicados dentro de la misma planilla subida
    ruts_socios_en_planilla: set[str] = set()
    ruts_cargas_en_planilla: set[str] = set()

    mapa_roles = {
        "socio": UserRole.SOCIO,
        "presidente": UserRole.PRESIDENTE,
        "secretario": UserRole.SECRETARIO,
        "tesorero": UserRole.TESORERO,
        "admin": UserRole.ADMIN,
        "auditor": UserRole.AUDITOR,
        "superusuario": UserRole.SUPERUSUARIO,
    }

    for idx, item in enumerate(body.registros, start=1):
        try:
            run_norm = normalizar_run(item.rut)
        except ValueError as e:
            errores.append(f"Fila {idx} ({item.nombreCompleto or item.rut}): {str(e)}")
            continue

        run_fmt = formatear_run(run_norm)
        rut_sin_simbolos = re.sub(r"[^0-9kK]", "", run_norm).upper()
        nombre_clean = (item.nombreCompleto or "").strip()
        if len(nombre_clean) < 3:
            errores.append(f"Fila {idx} (RUN {run_fmt}): Nombre completo demasiado corto o vacío.")
            continue

        # 1. Validar que el RUT del socio sea único (no repetido en la planilla, ni como socio ni como carga en la BD)
        if rut_sin_simbolos in ruts_socios_en_planilla:
            duplicados_omitidos += 1
            errores.append(
                f"Fila {idx} (RUN {run_fmt} - {nombre_clean}): Omitido porque el RUT del socio está repetido dentro de la misma planilla."
            )
            continue

        if rut_sin_simbolos in ruts_socios_existentes:
            duplicados_omitidos += 1
            errores.append(
                f"Fila {idx} (RUN {run_fmt} - {nombre_clean}): Omitido porque este RUT de socio ya se encuentra registrado en la base de datos."
            )
            continue

        if rut_sin_simbolos in ruts_cargas_existentes or rut_sin_simbolos in ruts_cargas_en_planilla:
            duplicados_omitidos += 1
            errores.append(
                f"Fila {idx} (RUN {run_fmt} - {nombre_clean}): Omitido porque este RUT ya figura registrado como carga familiar."
            )
            continue

        email_clean = (item.email or "").strip().lower() or f"{rut_sin_simbolos.lower()}@mperalillo.cl"
        if email_clean in emails_existentes:
            duplicados_omitidos += 1
            errores.append(
                f"Fila {idx} (RUN {run_fmt} - {nombre_clean}): Omitido porque el correo '{email_clean}' ya pertenece a otro usuario registrado."
            )
            continue

        calidad_raw = (item.calidadContractual or "Planta").strip().capitalize()
        calidad_enum = (
            CalidadContractual.CONTRATA
            if "contrata" in calidad_raw.lower()
            else CalidadContractual.PLANTA
        )
        grado_raw = (item.grado or "10").strip()
        grado_clean = re.sub(r"(?i)^grado\s*", "", grado_raw).strip()[:10] or "10"

        depto_clean = (item.departamento or f"Grado {grado_clean} - {calidad_enum.value}").strip()[:120]
        meses_ant = max(0, int(item.mesesAntiguedad if item.mesesAntiguedad is not None else 12))
        if meses_ant >= 12:
            anios_ant = meses_ant // 12
            resto_meses = meses_ant % 12
            antiguedad_str = (
                f"{anios_ant} Año{'s' if anios_ant > 1 else ''}"
                + (f", {resto_meses} Mes{'es' if resto_meses > 1 else ''}" if resto_meses > 0 else "")
            )
        elif meses_ant == 0:
            antiguedad_str = "0 Meses (Socio Nuevo)"
        else:
            antiguedad_str = f"{meses_ant} Mes{'es' if meses_ant > 1 else ''}"

        rol_str = (item.rol or "socio").strip().lower()
        rol_enum = mapa_roles.get(rol_str, UserRole.SOCIO)
        saldo_disp = int(item.saldoSaludDisponible if item.saldoSaludDisponible is not None else 150000)

        # 2. Validar cargas familiares de este socio garantizando unicidad total del RUT de cada carga
        cargas_validas: List[Dict[str, str]] = []
        for c_in in item.cargas:
            c_nombre = (c_in.nombreCompleto or "").strip()
            if not c_nombre:
                continue
            try:
                c_run_norm = normalizar_run(c_in.run)
            except ValueError as e_carga:
                errores.append(
                    f"Fila {idx} (Socio {nombre_clean} - Carga {c_nombre}): {str(e_carga)}"
                )
                continue

            c_rut_limpio = re.sub(r"[^0-9kK]", "", c_run_norm).upper()
            c_run_fmt = formatear_run(c_run_norm)

            if c_rut_limpio == rut_sin_simbolos:
                errores.append(
                    f"Fila {idx} (Carga {c_nombre} - RUN {c_run_fmt}): Omitida porque tiene el mismo RUT que el socio titular."
                )
                continue

            if c_rut_limpio in ruts_socios_existentes or c_rut_limpio in ruts_socios_en_planilla:
                errores.append(
                    f"Fila {idx} (Carga {c_nombre} - RUN {c_run_fmt}): Omitida porque su RUT corresponde a un socio titular."
                )
                continue

            if c_rut_limpio in ruts_cargas_existentes or c_rut_limpio in ruts_cargas_en_planilla:
                errores.append(
                    f"Fila {idx} (Carga {c_nombre} - RUN {c_run_fmt}): Omitida porque este RUT de carga familiar ya está registrado o repetido."
                )
                continue

            c_parentesco = (c_in.parentesco or "Hijo/a").strip()
            cargas_validas.append(
                {
                    "nombre_completo": c_nombre,
                    "run": c_run_norm,
                    "parentesco": c_parentesco,
                }
            )
            ruts_cargas_en_planilla.add(c_rut_limpio)

        # Registrar como vistos para bloquear cualquier repetición en filas posteriores
        ruts_socios_en_planilla.add(rut_sin_simbolos)
        emails_existentes.add(email_clean)

        clave_temporal = generar_clave_temporal_rut(run_norm)

        # 3. Crear usuario único en tabla `usuarios`
        socio_user = User(
            rut=run_fmt,
            email=email_clean,
            nombre_completo=nombre_clean,
            hashed_password=get_password_hash(clave_temporal),
            rol=rol_enum,
            is_superuser=(rol_enum == UserRole.SUPERUSUARIO),
            is_active=True,
            departamento=depto_clean,
            antiguedad=antiguedad_str,
            meses_antiguedad=meses_ant,
            estado_previsional="Al día",
            saldo_salud_disponible=saldo_disp,
            saldo_salud_total_anual=max(saldo_disp, 150000),
            cargas_registradas=len(cargas_validas),
        )
        db.add(socio_user)
        creados += 1
        await db.flush()

        await guardar_seguridad_usuario(
            db,
            socio_user.id,
            intentos=0,
            bloqueada=False,
            debe_cambiar=True,
        )

        # 4. Crear su SolicitudAfiliacion APROBADA y sus cargas familiares únicas
        max_correlativo += 1
        folio_af = f"AF-{anio}-{max_correlativo:05d}"
        sol_af = SolicitudAfiliacion(
            folio=folio_af,
            nombre_completo=nombre_clean,
            run=run_norm,
            grado=grado_clean,
            calidad_contractual=calidad_enum,
            email=email_clean,
            autoriza_descuento=True,
            porcentaje_descuento=settings.AFILIACION_PORCENTAJE_DESCUENTO,
            acepta_carencia=True,
            estado=EstadoSolicitud.APROBADA,
            fecha_sesion=fecha_hoy,
            numero_acta=acta_str,
            fecha_fin_carencia=fecha_hoy if meses_ant >= 6 else fin_carencia_default,
            observaciones_resolucion=f"Incorporación por Carga Masiva ({acta_str}).",
            resuelto_por=f"{current_user.nombre_completo} ({current_user.rol.value})",
            resuelto_at=datetime.now().isoformat(),
            cargas=[
                CargaFamiliar(
                    nombre_completo=cv["nombre_completo"],
                    run=cv["run"],
                    parentesco=cv["parentesco"],
                )
                for cv in cargas_validas
            ],
        )
        db.add(sol_af)
        cargas_agregadas += len(cargas_validas)

        if body.enviarCorreos:
            correos_pendientes_envio.append(
                {
                    "folio": sol_af.folio,
                    "nombre_completo": nombre_clean,
                    "run_formateado": run_fmt,
                    "email_destino": email_clean,
                    "aprobada": True,
                    "motivo": f"Incorporación oficial mediante Nómina de Carga Masiva ({acta_str}).",
                    "fecha_sesion": fecha_hoy,
                    "numero_acta": acta_str,
                    "fecha_fin_carencia": sol_af.fecha_fin_carencia,
                    "porcentaje_descuento": settings.AFILIACION_PORCENTAJE_DESCUENTO,
                    "clave_temporal": clave_temporal,
                }
            )

        detalle_procesados.append(
            {
                "rut": run_fmt,
                "nombreCompleto": nombre_clean,
                "email": email_clean,
                "accion": "Creado",
                "cargas": len(cargas_validas),
            }
        )

    db.add(
        AuditLog(
            usuario_id=current_user.id,
            usuario_nombre=current_user.nombre_completo,
            usuario_rut=current_user.rut,
            usuario_rol=current_user.rol.value,
            modulo="AFILIACION",
            accion="CARGA_MASIVA_SOCIOS_Y_CARGAS",
            recurso_tipo="CargaMasiva",
            recurso_id=acta_str,
            detalles=(
                f"Carga masiva ejecutada por {current_user.email}: "
                f"{creados} socios nuevos creados, {duplicados_omitidos} duplicados omitidos, "
                f"{cargas_agregadas} cargas familiares únicas registradas."
            ),
            ip_origen="127.0.0.1",
        )
    )
    await db.commit()

    if correos_pendientes_envio:
        import threading

        def _despachar_lote_correos(lote: List[Dict[str, Any]]) -> None:
            for item_c in lote:
                try:
                    generar_correo_resolucion_solicitud(**item_c, enviar_smtp=True)
                except Exception:
                    pass

        threading.Thread(
            target=_despachar_lote_correos,
            args=(correos_pendientes_envio,),
            daemon=True,
        ).start()

    return {
        "ok": True,
        "sociosCreados": creados,
        "sociosActualizados": duplicados_omitidos,
        "duplicadosOmitidos": duplicados_omitidos,
        "cargasRegistradas": cargas_agregadas,
        "errores": errores,
        "procesados": detalle_procesados,
        "ejecutadoPor": current_user.email,
    }

