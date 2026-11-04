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
from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
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
    User,
    UserRole,
)
from app.services.email_service import (
    actualizar_config_smtp_runtime,
    generar_correo_recepcion_solicitud,
    generar_correo_resolucion_solicitud,
)

router = APIRouter()

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
    cuerpo, dv = run.split("-")
    return f"{int(cuerpo):,}".replace(",", ".") + f"-{dv}"


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

    # Si no se pasó explícitamente una notificación recién emitida, reconstruir vista previa del correo sin reenviar por SMTP
    if notificacion_email is None:
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


@router.get("/conteo-pendientes", summary="Conteo de solicitudes de incorporación pendientes (Directiva)")
async def conteo_solicitudes_pendientes(
    _: User = Depends(require_roles(*DIRECTIVA)), db: AsyncSession = Depends(get_db)
) -> Dict[str, int]:
    total = await db.scalar(
        select(func.count(SolicitudAfiliacion.id)).where(
            SolicitudAfiliacion.estado == EstadoSolicitud.PENDIENTE
        )
    )
    return {"pendientes": int(total or 0)}


@router.get("/solicitudes", response_model=List[ComprobanteOut], summary="Listar solicitudes de incorporación (Directiva)")
async def listar_solicitudes(
    _: User = Depends(require_roles(*DIRECTIVA)), db: AsyncSession = Depends(get_db)
):
    result = (await db.scalars(select(SolicitudAfiliacion).order_by(SolicitudAfiliacion.id.desc()))).all()
    hubo_cambios = False
    for s in result:
        if s.estado == EstadoSolicitud.APROBADA:
            rut_sin_simbolos = re.sub(r"[^0-9kK]", "", s.run).upper()
            user_s = await db.scalar(
                select(User).where(
                    func.upper(func.replace(func.replace(User.rut, ".", ""), "-", "")) == rut_sin_simbolos
                )
            )
            if user_s:
                sec = await obtener_seguridad_usuario(db, user_s.id)
                if not sec.get("ultimo_cambio_password") and not sec.get("debe_cambiar_password"):
                    clave_temp = generar_clave_temporal_rut(s.run)
                    user_s.hashed_password = get_password_hash(clave_temp)
                    user_s.rut = formatear_run(s.run)
                    await guardar_seguridad_usuario(
                        db,
                        user_s.id,
                        intentos=0,
                        bloqueada=False,
                        debe_cambiar=True,
                    )
                    hubo_cambios = True
    if hubo_cambios:
        await db.commit()
    return [to_comprobante(s) for s in result]


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


@router.get("/cargas", summary="Listar cargas familiares registradas")
async def get_cargas_familiares() -> Dict[str, Any]:
    return {
        "cargas": [
            {"id": 1, "nombre": "Valentina Peralillo", "parentesco": "Hija", "edad": 7, "estado": "Vigente"},
            {"id": 2, "nombre": "Matías Peralillo", "parentesco": "Hijo", "edad": 4, "estado": "Vigente"},
        ]
    }
