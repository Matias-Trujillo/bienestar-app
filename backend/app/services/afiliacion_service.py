"""Servicio de lógica de negocio para el módulo de Afiliación y Cargas Familiares (HU-01 y HU-02).

Implementa las reglas de negocio estatutarias de Bienestar Municipal:
  - Validación del período de postulaciones (enero a junio).
  - Autorización obligatoria del 4% de retención sobre sueldo base.
  - Resolución colegiada en sesión de Directorio con N° de Acta (HU-02).
  - Cálculo de fin de carencia (+6 meses desde fecha de acta).
  - Creación automática de cuenta de socio activo y clave temporal.
  - Ingestión masiva de socios y cargas mediante nómina digital.
"""
import calendar
import json
import re
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Set

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_password_hash
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
from app.schemas.afiliacion import (
    CargaIn,
    CargaOut,
    ComprobanteOut,
    NuevaCargaIn,
    ResolucionSolicitudIn,
    SolicitudCargaOut,
    SolicitudIn,
    CargaMasivaRequestIn,
    formatear_run,
    normalizar_run,
)
from app.services.email_service import (
    actualizar_config_smtp_runtime,
    generar_correo_recepcion_solicitud,
    generar_correo_resolucion_carga_familiar,
    generar_correo_resolucion_solicitud,
    listar_buzon_memoria,
)

MESES = [
    "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
]

TIPO_CERTIFICADO_POR_PARENTESCO: Dict[str, str] = {
    "Hijo/a": "Certificado de Nacimiento del Hijo/a",
    "Hijo": "Certificado de Nacimiento del Hijo/a",
    "Hija": "Certificado de Nacimiento del Hijo/a",
    "Cónyuge": "Certificado de Matrimonio",
    "Conviviente Civil": "Certificado de Acuerdo de Unión Civil (AUC)",
    "Padre / Madre": "Certificado de Nacimiento del Socio Titular",
    "Otro vínculo legal": "Certificado o Resolución Judicial de Carga Legal",
}

CUENTAS_AUTORIZADAS_CARGA_MASIVA: Set[str] = {
    "superadmin@mperalillo.cl",
    "msoto@mperalillo.cl",
    "pfuentes@mperalillo.cl",
    "rmorales@mperalillo.cl",
    "jcontreras@mperalillo.cl",
    "aibarra@mperalillo.cl",
    "cvalenzuela@mperalillo.cl",
}

RUTS_AUTORIZADOS_CARGA_MASIVA: Set[str] = {
    "11111111-1",
    "12345678-9",
    "13456789-0",
    "14982112-4",
    "16234567-8",
    "17345678-K",
    "15489123-K",
}

_TABLA_CARGAS_LISTA = False


def _val(x: Any) -> str:
    """Extrae el valor en string de forma segura tanto para Enum como para str nativo de PostgreSQL."""
    if x is None:
        return ""
    if hasattr(x, "value"):
        return str(x.value)
    return str(x)


# [ESTUDIANTE INFORMÁTICA] Asegura que la tabla de cargas familiares exista e incluya los campos para certificados digitales.
async def asegurar_tabla_cargas(db: AsyncSession) -> None:
    global _TABLA_CARGAS_LISTA
    if _TABLA_CARGAS_LISTA:
        return
    try:
        bind = db.get_bind()
        if bind and "sqlite" in getattr(bind.dialect, "name", ""):
            _TABLA_CARGAS_LISTA = True
            return
    except Exception:
        pass
    try:
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
            "ALTER TABLE cargas_familiares ADD COLUMN IF NOT EXISTS certificado_nombre VARCHAR(255);",
            "ALTER TABLE cargas_familiares ADD COLUMN IF NOT EXISTS certificado_tipo VARCHAR(120);",
            "ALTER TABLE cargas_familiares ADD COLUMN IF NOT EXISTS certificado_data TEXT;",
        ):
            try:
                await db.execute(text(col_sql))
            except Exception:
                pass
        await db.commit()
    except Exception:
        pass
    _TABLA_CARGAS_LISTA = True


def texto_carencia() -> str:
    m = settings.AFILIACION_MESES_CARENCIA
    palabra = {3: "tres", 6: "seis", 12: "doce"}.get(m, str(m))
    return (
        f"De conformidad al Reglamento del Comité de Bienestar, el derecho a impetrar y percibir "
        f"beneficios rige exclusivamente una vez cumplidos {m} ({palabra}) meses continuos "
        f"como socio del Comité, contados desde la aprobación de la afiliación. Durante este período "
        f"de carencia se efectuará igualmente el descuento por planilla del "
        f"{settings.AFILIACION_PORCENTAJE_DESCUENTO}% del sueldo base."
    )


def generar_clave_temporal_rut(run: str) -> str:
    digitos = re.sub(r"[^0-9]", "", run or "")[:4] or "2026"
    return f"Peralillo#{digitos}"


async def sincronizar_smtp_desde_db(db: AsyncSession) -> None:
    try:
        params = (await db.scalars(select(ParametroSistema))).all()
        kv = {p.clave: (p.valor or "").strip() for p in params}
        host = kv.get("SMTP_HOST") or "smtp.gmail.com"
        port_raw = kv.get("SMTP_PORT") or "587"
        try:
            port = int(port_raw)
        except ValueError:
            port = 587
        user_smtp = kv.get("SMTP_USER") or ""
        pwd_smtp = kv.get("SMTP_PASSWORD") or ""
        if user_smtp and pwd_smtp:
            actualizar_config_smtp_runtime(host=host, port=port, user=user_smtp, password=pwd_smtp)
    except Exception:
        pass


def to_comprobante(
    s: SolicitudAfiliacion,
    notificacion_email: Optional[Dict[str, Any]] = None,
    ligero: bool = False,
    enviar_email: bool = False,
) -> ComprobanteOut:
    run_fmt = formatear_run(s.run)
    msg = (
        f"Su solicitud de incorporación N° {s.folio} fue ingresada correctamente y se encuentra "
        f"en estado \"{_val(s.estado)}\". Será revisada por la Directiva del Comité de Bienestar."
    )
    if _val(s.estado) == _val(EstadoSolicitud.APROBADA):
        msg = f"Solicitud N° {s.folio} APROBADA en sesión de Directorio del {s.fecha_sesion}. Socio habilitado como Activo."
    elif _val(s.estado) == _val(EstadoSolicitud.RECHAZADA):
        msg = f"Solicitud N° {s.folio} RECHAZADA. Observaciones: {s.observaciones_resolucion or 'Sin observaciones registradas'}."

    if notificacion_email is None and ligero:
        notificacion_email = {
            "folio": s.folio,
            "destinatario": s.email or "",
            "motivo": s.observaciones_resolucion,
        }
    elif notificacion_email is None:
        if _val(s.estado) == _val(EstadoSolicitud.PENDIENTE):
            notificacion_email = generar_correo_recepcion_solicitud(
                folio=s.folio,
                nombre_completo=s.nombre_completo,
                run_formateado=run_fmt,
                email_destino=s.email,
                grado=s.grado,
                calidad_contractual=_val(s.calidad_contractual),
                porcentaje_descuento=s.porcentaje_descuento,
                meses_carencia=settings.AFILIACION_MESES_CARENCIA,
                cantidad_cargas=len(s.cargas) if hasattr(s, "cargas") and s.cargas else 0,
                fecha_ingreso=s.created_at,
                enviar_smtp=enviar_email,
            )
        elif _val(s.estado) == _val(EstadoSolicitud.APROBADA):
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
                enviar_smtp=enviar_email,
            )
        elif _val(s.estado) == _val(EstadoSolicitud.RECHAZADA):
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
                enviar_smtp=enviar_email,
            )

    cargas_raw = []
    if hasattr(s, "__dict__") and "cargas" in s.__dict__:
        cargas_raw = s.__dict__["cargas"] or []

    return ComprobanteOut(
        folio=s.folio,
        estado=_val(s.estado),
        fechaIngreso=s.created_at,
        nombreCompleto=s.nombre_completo,
        run=run_fmt,
        grado=s.grado,
        calidadContractual=_val(s.calidad_contractual),
        email=s.email,
        porcentajeDescuento=s.porcentaje_descuento,
        cargas=[
            CargaOut(
                nombreCompleto=c.nombre_completo,
                run=formatear_run(c.run),
                parentesco=c.parentesco,
                certificadoNombre=getattr(c, "certificado_nombre", None),
                certificadoTipo=getattr(c, "certificado_tipo", None),
                certificadoData=getattr(c, "certificado_data", None),
            )
            for c in cargas_raw
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


class AfiliacionService:
    """Servicio central de casos de uso del módulo de Afiliación (Clean Architecture)."""

    @staticmethod
    def obtener_periodo_actual(hoy: Optional[date] = None) -> Dict[str, Any]:
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

    @staticmethod
    async def crear_solicitud(db: AsyncSession, payload: SolicitudIn) -> ComprobanteOut:
        periodo = AfiliacionService.obtener_periodo_actual()
        if not periodo["abierto"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fuera del período reglamentario. Solo se reciben solicitudes entre enero y junio ({periodo['descripcion']}).",
            )

        # Validar si ya existe como socio activo o solicitud pendiente
        existente = await db.scalar(
            select(SolicitudAfiliacion).where(
                SolicitudAfiliacion.run == payload.run,
                SolicitudAfiliacion.estado.in_([EstadoSolicitud.PENDIENTE, EstadoSolicitud.APROBADA]),
            )
        )
        if existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una solicitud registrada para el RUN {formatear_run(payload.run)} (Folio {existente.folio}).",
            )

        # Generar folio único correlativo anual
        anio = date.today().year
        folios = (
            await db.scalars(
                select(SolicitudAfiliacion.folio).where(SolicitudAfiliacion.folio.like(f"AF-{anio}-%"))
            )
        ).all()
        max_correlativo = 0
        for f in folios:
            try:
                num = int(f.split("-")[-1])
                if num > max_correlativo:
                    max_correlativo = num
            except ValueError:
                pass
        folio_nuevo = f"AF-{anio}-{max_correlativo + 1:05d}"

        await asegurar_tabla_cargas(db)

        solicitud = SolicitudAfiliacion(
            folio=folio_nuevo,
            nombre_completo=payload.nombreCompleto.strip(),
            run=payload.run,
            grado=payload.grado.strip(),
            calidad_contractual=CalidadContractual(payload.calidadContractual),
            email=payload.email.strip() if payload.email else None,
            autoriza_descuento=payload.autorizaDescuento,
            porcentaje_descuento=settings.AFILIACION_PORCENTAJE_DESCUENTO,
            acepta_carencia=payload.aceptaCarencia,
            estado=EstadoSolicitud.PENDIENTE,
        )

        for c in payload.cargas:
            solicitud.cargas.append(
                CargaFamiliar(
                    nombre_completo=c.nombreCompleto.strip(),
                    run=c.run,
                    parentesco=c.parentesco.strip() if c.parentesco else None,
                    certificado_nombre=c.certificadoNombre,
                    certificado_tipo=c.certificadoTipo or "Cédula de Identidad (Frontal)",
                    certificado_data=c.certificadoData,
                )
            )

        db.add(solicitud)
        await db.flush()

        await sincronizar_smtp_desde_db(db)
        correo_recepcion = generar_correo_recepcion_solicitud(
            folio=solicitud.folio,
            nombre_completo=solicitud.nombre_completo,
            run_formateado=formatear_run(solicitud.run),
            email_destino=solicitud.email,
            grado=solicitud.grado,
            calidad_contractual=_val(solicitud.calidad_contractual),
            porcentaje_descuento=solicitud.porcentaje_descuento,
            meses_carencia=settings.AFILIACION_MESES_CARENCIA,
            cantidad_cargas=len(payload.cargas),
            fecha_ingreso=solicitud.created_at,
            enviar_smtp=True,
        )

        db.add(
            AuditLog(
                usuario_nombre=solicitud.nombre_completo,
                usuario_rut=formatear_run(solicitud.run),
                usuario_rol="postulante",
                modulo="AFILIACION",
                accion="INGRESO_SOLICITUD_Y_CORREO",
                recurso_tipo="SolicitudAfiliacion",
                recurso_id=folio_nuevo,
                detalles=(
                    f"Solicitud {folio_nuevo} ingresada por {solicitud.nombre_completo} (RUN {formatear_run(solicitud.run)}). "
                    f"Autoriza {settings.AFILIACION_PORCENTAJE_DESCUENTO}% descuento y acepta {settings.AFILIACION_MESES_CARENCIA} meses carencia. "
                    f"Correo de confirmación enviado a {correo_recepcion['destinatario']}."
                ),
                ip_origen="127.0.0.1",
            )
        )
        await db.commit()
        creada = await db.scalar(
            select(SolicitudAfiliacion)
            .options(selectinload(SolicitudAfiliacion.cargas))
            .where(SolicitudAfiliacion.id == solicitud.id)
        )
        return to_comprobante(creada or solicitud, notificacion_email=correo_recepcion)

    @staticmethod
    async def consultar_solicitud(db: AsyncSession, folio: str, run: str) -> ComprobanteOut:
        run_norm = normalizar_run(run)
        solicitud = await db.scalar(
            select(SolicitudAfiliacion)
            .options(selectinload(SolicitudAfiliacion.cargas))
            .where(
                SolicitudAfiliacion.folio == folio,
                SolicitudAfiliacion.run == run_norm,
            )
        )
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada con el folio y RUN proporcionados.")
        return to_comprobante(solicitud)

    @staticmethod
    async def listar_solicitudes(db: AsyncSession, estado: Optional[str] = None) -> List[ComprobanteOut]:
        query = (
            select(SolicitudAfiliacion)
            .options(selectinload(SolicitudAfiliacion.cargas))
            .order_by(SolicitudAfiliacion.id.desc())
        )
        if estado:
            query = query.where(SolicitudAfiliacion.estado == EstadoSolicitud(estado))
        filas = (await db.scalars(query)).all()
        return [to_comprobante(s, ligero=True) for s in filas]

    # [ESTUDIANTE INFORMÁTICA] Cuenta las incorporaciones y cargas pendientes de resolución para los badges y alertas en vivo.
    @staticmethod
    async def contar_pendientes(db: AsyncSession) -> int:
        count_afiliaciones = await db.scalar(
            select(func.count(SolicitudAfiliacion.id)).where(
                SolicitudAfiliacion.estado == EstadoSolicitud.PENDIENTE
            )
        ) or 0
        try:
            await asegurar_tabla_cargas(db)
            count_cargas = await db.scalar(
                select(func.count(SolicitudCargaFamiliar.id)).where(
                    SolicitudCargaFamiliar.estado == EstadoSolicitud.PENDIENTE
                )
            ) or 0
        except Exception:
            count_cargas = 0
        return int(count_afiliaciones + count_cargas)

    @staticmethod
    async def contar_solicitudes_pendientes(db: AsyncSession) -> int:
        return await AfiliacionService.contar_pendientes(db)

    @staticmethod
    async def resolver_solicitud(
        db: AsyncSession,
        folio: str,
        payload: ResolucionSolicitudIn,
        evaluador: User,
    ) -> ComprobanteOut:
        try:
            await sincronizar_smtp_desde_db(db)
            solicitud = await db.scalar(
                select(SolicitudAfiliacion)
                .options(selectinload(SolicitudAfiliacion.cargas))
                .where(SolicitudAfiliacion.folio == folio)
            )
            if not solicitud:
                raise HTTPException(status_code=404, detail="Solicitud no encontrada.")

            if _val(solicitud.estado) != _val(EstadoSolicitud.PENDIENTE):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"La solicitud {folio} ya fue resuelta previamente ({_val(solicitud.estado)}).",
                )

            ahora_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
            if payload.accion == "aprobar":
                if not payload.fechaSesion:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="La fecha de la sesión de Directorio es obligatoria para aprobar.",
                    )
                f_sesion = date.fromisoformat(payload.fechaSesion)
                # Cálculo de término de carencia (+6 meses exactos)
                fin_carencia_mes = (f_sesion.month + settings.AFILIACION_MESES_CARENCIA - 1) % 12 + 1
                fin_carencia_anio = f_sesion.year + (f_sesion.month + settings.AFILIACION_MESES_CARENCIA - 1) // 12
                ultimo_dia = calendar.monthrange(fin_carencia_anio, fin_carencia_mes)[1]
                fin_carencia = date(fin_carencia_anio, fin_carencia_mes, min(f_sesion.day, ultimo_dia))

                solicitud.estado = EstadoSolicitud.APROBADA
                solicitud.fecha_sesion = f_sesion.isoformat()
                solicitud.numero_acta = (payload.numeroActa or "").strip() or "Acta Ordinaria de Directorio"
                solicitud.fecha_fin_carencia = fin_carencia.isoformat()
                solicitud.observaciones_resolucion = (payload.observaciones or "").strip() or "Aprobada por Directorio"
                solicitud.resuelto_por = evaluador.nombre_completo
                solicitud.resuelto_at = ahora_iso

                # Creación automática de cuenta de usuario con rol socio
                user_existente = await db.scalar(select(User).where(User.rut == solicitud.run))
                clave_temp = generar_clave_temporal_rut(solicitud.run)
                socio_id = None
                cargas_count = len(solicitud.cargas) if hasattr(solicitud, "cargas") and solicitud.cargas else 0
                if not user_existente:
                    target_email = (solicitud.email or f"{solicitud.run}@mperalillo.cl").strip().lower()
                    email_en_uso = await db.scalar(select(User).where(func.lower(User.email) == target_email))
                    if email_en_uso:
                        target_email = f"{solicitud.run.replace('-', '').lower()}@mperalillo.cl"
                    nuevo_user = User(
                        rut=solicitud.run,
                        email=target_email,
                        nombre_completo=solicitud.nombre_completo,
                        hashed_password=get_password_hash(clave_temp),
                        rol=UserRole.SOCIO,
                        departamento=f"{_val(solicitud.calidad_contractual)} ({solicitud.grado})",
                        antiguedad="0 Meses (Período Carencia)",
                        meses_antiguedad=0,
                        estado_previsional="Al día",
                        saldo_salud_disponible=150000,
                        saldo_salud_total_anual=150000,
                        cargas_registradas=0,
                    )
                    db.add(nuevo_user)
                    await db.flush()
                    socio_id = nuevo_user.id
                else:
                    socio_id = user_existente.id

                if socio_id:
                    # Marcar cambio obligatorio de contraseña en primer inicio de sesión
                    sec_param = await db.scalar(
                        select(ParametroSistema).where(ParametroSistema.clave == f"SEC_USR_{socio_id}")
                    )
                    sec_val = json.dumps({"i": 0, "b": False, "c": True, "u": None})
                    if sec_param:
                        sec_param.valor = sec_val
                    else:
                        db.add(
                            ParametroSistema(
                                clave=f"SEC_USR_{socio_id}",
                                valor=sec_val,
                                descripcion=f"Seguridad usuario {solicitud.run}",
                            )
                        )

                    # Derivación automática de cargas familiares declaradas en el formulario hacia solicitudes_cargas_familiares
                    await asegurar_tabla_cargas(db)
                    anio_carga = date.today().year
                    for carga_item in (solicitud.cargas or []):
                        carga_existente = await db.scalar(
                            select(SolicitudCargaFamiliar).where(
                                SolicitudCargaFamiliar.socio_id == socio_id,
                                SolicitudCargaFamiliar.run == carga_item.run,
                            )
                        )
                        if not carga_existente:
                            corr_carga = await db.scalar(select(func.count(SolicitudCargaFamiliar.id)))
                            next_corr = (corr_carga or 0) + 1
                            folio_carga = f"CF-{anio_carga}-{next_corr:05d}"
                            while await db.scalar(select(SolicitudCargaFamiliar.id).where(SolicitudCargaFamiliar.folio == folio_carga)):
                                next_corr += 1
                                folio_carga = f"CF-{anio_carga}-{next_corr:05d}"

                            sol_carga = SolicitudCargaFamiliar(
                                folio=folio_carga,
                                socio_id=socio_id,
                                socio_nombre=solicitud.nombre_completo,
                                socio_rut=solicitud.run,
                                socio_email=solicitud.email,
                                nombre_completo=carga_item.nombre_completo,
                                run=carga_item.run,
                                parentesco=carga_item.parentesco or "Carga Familiar",
                                observacion_socio=f"Declarada en postulación de incorporación digital (Folio {solicitud.folio})",
                                certificado_nombre=getattr(carga_item, "certificado_nombre", None),
                                certificado_tipo=getattr(carga_item, "certificado_tipo", "Cédula de Identidad (Frontal)"),
                                certificado_data=getattr(carga_item, "certificado_data", None),
                                estado=EstadoSolicitud.PENDIENTE,
                            )
                            db.add(sol_carga)
                            db.add(
                                AuditLog(
                                    usuario_id=evaluador.id,
                                    usuario_nombre=evaluador.nombre_completo,
                                    usuario_rut=evaluador.rut,
                                    usuario_rol=_val(evaluador.rol),
                                    modulo="AFILIACION",
                                    accion="DERIVAR_CARGA_DESDE_INCORPORACION",
                                    recurso_tipo="SolicitudCargaFamiliar",
                                    recurso_id=folio_carga,
                                    detalles=(
                                        f"Carga {carga_item.nombre_completo} (RUN: {carga_item.run}) "
                                        f"derivada automáticamente a la bandeja de evaluación de Directorio tras aprobar afiliación {solicitud.folio}."
                                    ),
                                    ip_origen="127.0.0.1",
                                )
                            )

                # Emitir Correo #2A: Aprobación con credenciales temporales y pasos a seguir
                correo_resolucion = generar_correo_resolucion_solicitud(
                    folio=solicitud.folio,
                    nombre_completo=solicitud.nombre_completo,
                    run_formateado=formatear_run(solicitud.run),
                    email_destino=solicitud.email,
                    aprobada=True,
                    motivo=solicitud.observaciones_resolucion,
                    fecha_sesion=solicitud.fecha_sesion,
                    numero_acta=solicitud.numero_acta,
                    fecha_fin_carencia=solicitud.fecha_fin_carencia,
                    porcentaje_descuento=solicitud.porcentaje_descuento,
                    clave_temporal=clave_temp,
                    enviar_smtp=True,
                )

                db.add(
                    AuditLog(
                        usuario_id=evaluador.id,
                        usuario_nombre=evaluador.nombre_completo,
                        usuario_rut=evaluador.rut,
                        usuario_rol=_val(evaluador.rol),
                        modulo="AFILIACION",
                        accion="APROBAR_SOLICITUD_DIRECTORIO",
                        recurso_tipo="SolicitudAfiliacion",
                        recurso_id=folio,
                        detalles=(
                            f"Aprobada en sesión del {f_sesion} ({solicitud.numero_acta}). Carencia hasta {fin_carencia}. "
                            f"Notificación con clave temporal emitida a {correo_resolucion['destinatario']}."
                        ),
                        ip_origen="127.0.0.1",
                    )
                )
            else:
                if not payload.observaciones or len(payload.observaciones.strip()) < 5:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Debe indicar el motivo de rechazo de forma obligatoria.",
                    )
                solicitud.estado = EstadoSolicitud.RECHAZADA
                solicitud.observaciones_resolucion = payload.observaciones.strip()
                solicitud.resuelto_por = evaluador.nombre_completo
                solicitud.resuelto_at = ahora_iso

                # Emitir Correo #2B: Rechazo con causal y pasos de subsanación
                correo_resolucion = generar_correo_resolucion_solicitud(
                    folio=solicitud.folio,
                    nombre_completo=solicitud.nombre_completo,
                    run_formateado=formatear_run(solicitud.run),
                    email_destino=solicitud.email,
                    aprobada=False,
                    motivo=solicitud.observaciones_resolucion,
                    fecha_sesion=solicitud.fecha_sesion,
                    numero_acta=solicitud.numero_acta,
                    porcentaje_descuento=solicitud.porcentaje_descuento,
                    enviar_smtp=True,
                )

                db.add(
                    AuditLog(
                        usuario_id=evaluador.id,
                        usuario_nombre=evaluador.nombre_completo,
                        usuario_rut=evaluador.rut,
                        usuario_rol=_val(evaluador.rol),
                        modulo="AFILIACION",
                        accion="RECHAZAR_SOLICITUD_DIRECTORIO",
                        recurso_tipo="SolicitudAfiliacion",
                        recurso_id=folio,
                        detalles=(
                            f"Rechazada. Motivo: {payload.observaciones.strip()}. "
                            f"Notificación de resolución emitida a {correo_resolucion['destinatario']}."
                        ),
                        ip_origen="127.0.0.1",
                    )
                )

            await db.commit()
            resuelta = await db.scalar(
                select(SolicitudAfiliacion)
                .options(selectinload(SolicitudAfiliacion.cargas))
                .where(SolicitudAfiliacion.id == solicitud.id)
            )
            return to_comprobante(resuelta or solicitud, notificacion_email=correo_resolucion)
        except HTTPException:
            raise
        except Exception as exc:
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error interno al resolver solicitud: {type(exc).__name__}: {str(exc)}",
            )

    @staticmethod
    async def reenviar_correo(db: AsyncSession, folio: str) -> ComprobanteOut:
        await sincronizar_smtp_desde_db(db)
        solicitud = await db.scalar(
            select(SolicitudAfiliacion)
            .options(selectinload(SolicitudAfiliacion.cargas))
            .where(SolicitudAfiliacion.folio == folio)
        )
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada.")

        run_fmt = formatear_run(solicitud.run)
        cargas_raw = []
        if hasattr(solicitud, "__dict__") and "cargas" in solicitud.__dict__:
            cargas_raw = solicitud.__dict__["cargas"] or []
        cantidad_cargas = len(cargas_raw)

        if _val(solicitud.estado) == _val(EstadoSolicitud.PENDIENTE):
            correo = generar_correo_recepcion_solicitud(
                folio=solicitud.folio,
                nombre_completo=solicitud.nombre_completo,
                run_formateado=run_fmt,
                email_destino=solicitud.email,
                grado=solicitud.grado,
                calidad_contractual=_val(solicitud.calidad_contractual),
                porcentaje_descuento=solicitud.porcentaje_descuento,
                meses_carencia=settings.AFILIACION_MESES_CARENCIA,
                cantidad_cargas=cantidad_cargas,
                fecha_ingreso=solicitud.created_at,
                enviar_smtp=True,
            )
        elif _val(solicitud.estado) == _val(EstadoSolicitud.APROBADA):
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

    @staticmethod
    async def obtener_buzon(db: AsyncSession, q: Optional[str] = None) -> Dict[str, Any]:
        solicitudes = (
            await db.scalars(select(SolicitudAfiliacion).order_by(SolicitudAfiliacion.id.desc()))
        ).all()

        mensajes: List[Dict[str, Any]] = []
        for s in solicitudes:
            run_fmt = formatear_run(s.run)
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
                c_res["fechaEmision"] = (s.resuelto_at or (s.created_at.isoformat() if s.created_at else ""))[:16].replace("T", " ")
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
                c_rech["fechaEmision"] = (s.resuelto_at or (s.created_at.isoformat() if s.created_at else ""))[:16].replace("T", " ")
                mensajes.append(c_rech)

            c_rec = generar_correo_recepcion_solicitud(
                folio=s.folio,
                nombre_completo=s.nombre_completo,
                run_formateado=run_fmt,
                email_destino=s.email,
                grado=s.grado,
                calidad_contractual=_val(s.calidad_contractual),
                porcentaje_descuento=s.porcentaje_descuento,
                meses_carencia=settings.AFILIACION_MESES_CARENCIA,
                cantidad_cargas=len(s.cargas) if hasattr(s, "cargas") and s.cargas else 0,
                fecha_ingreso=s.created_at,
                enviar_smtp=False,
            )
            c_rec["id"] = f"{s.folio}-recepcion"
            c_rec["fechaEmision"] = s.created_at.strftime("%Y-%m-%d %H:%M") if s.created_at else c_rec.get("fechaEmision", "")
            mensajes.append(c_rec)

        await asegurar_tabla_cargas(db)
        solicitudes_cargas = (
            await db.scalars(select(SolicitudCargaFamiliar).order_by(SolicitudCargaFamiliar.id.desc()))
        ).all()
        for sc in solicitudes_cargas:
            if _val(sc.estado) in (_val(EstadoSolicitud.APROBADA), _val(EstadoSolicitud.RECHAZADA)):
                aprob = _val(sc.estado) == _val(EstadoSolicitud.APROBADA)
                c_carga = generar_correo_resolucion_carga_familiar(
                    folio=sc.folio,
                    socio_nombre=sc.socio_nombre,
                    socio_rut=formatear_run(sc.socio_rut),
                    email_destino=sc.socio_email or "",
                    carga_nombre=sc.nombre_completo,
                    carga_run=formatear_run(sc.run),
                    parentesco=sc.parentesco or "Carga Familiar",
                    aprobada=aprob,
                    motivo=sc.observaciones_resolucion or "",
                    fecha_sesion=sc.fecha_sesion,
                    numero_acta=sc.numero_acta,
                    enviar_smtp=False,
                )
                c_carga["id"] = f"{sc.folio}-resolucion-{'aprobada' if aprob else 'rechazada'}"
                c_carga["fechaEmision"] = (sc.resuelto_at or (sc.created_at.isoformat() if sc.created_at else ""))[:16].replace("T", " ")
                mensajes.append(c_carga)

        extra_memoria = listar_buzon_memoria()
        for em in extra_memoria:
            if not any(m["id"] == em.get("id") or (m.get("folio") == em.get("folio") and m.get("tipo") == em.get("tipo")) for m in mensajes):
                mensajes.append(em)

        if q and q.strip():
            qn = q.strip().lower()
            q_clean = re.sub(r"[^0-9kKa-zA-Z@]", "", qn)
            res_filtrada = []
            for m in mensajes:
                d = (m.get("destinatario") or "").lower()
                fol = (m.get("folio") or "").lower()
                nom = (m.get("nombreDestinatario") or "").lower()
                cuerpo = (m.get("cuerpoTexto") or "").lower()
                cuerpo_clean = re.sub(r"[^0-9kKa-zA-Z@]", "", cuerpo)
                if qn in d or qn in fol or qn in nom or qn in cuerpo or q_clean in cuerpo_clean:
                    res_filtrada.append(m)
            mensajes = res_filtrada

        return {
            "total": len(mensajes),
            "correos": mensajes,
        }

    @staticmethod
    async def obtener_nomina_retenciones(db: AsyncSession) -> Dict[str, Any]:
        socios = (
            await db.scalars(
                select(User).where(User.rol == UserRole.SOCIO, User.is_active == True)
            )
        ).all()
        periodo_actual = date.today().strftime("%Y-%m")
        items = []
        for s in socios:
            items.append({
                "folio": f"RET-{s.id:04d}",
                "run": formatear_run(s.rut),
                "nombreCompleto": s.nombre_completo,
                "grado": s.departamento or "Grado Municipal",
                "calidadContractual": "Planta / Contrata",
                "porcentajeRetencion": settings.AFILIACION_PORCENTAJE_DESCUENTO,
                "inicioDescuento": periodo_actual,
                "finCarencia": "Vigente",
                "cargasLegales": s.cargas_registradas or 0,
            })
        return {
            "periodo": periodo_actual,
            "totalSociosEnNomina": len(items),
            "porcentajeAplicado": f"{settings.AFILIACION_PORCENTAJE_DESCUENTO}% Sueldo Base",
            "socios": items,
        }

    @staticmethod
    async def procesar_carga_masiva_socios(
        db: AsyncSession,
        payload: CargaMasivaRequestIn,
        evaluador: User,
    ) -> Dict[str, Any]:
        email_clean = (evaluador.email or "").strip().lower()
        rut_clean = re.sub(r"[^0-9kK]", "", evaluador.rut or "").upper()
        rut_norm = f"{rut_clean[:-1]}-{rut_clean[-1]}" if len(rut_clean) >= 2 else rut_clean
        if (
            email_clean not in CUENTAS_AUTORIZADAS_CARGA_MASIVA
            and rut_norm not in RUTS_AUTORIZADOS_CARGA_MASIVA
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operación restringida exclusivamente a la Directiva de la I. Municipalidad de Peralillo.",
            )

        socios_creados = 0
        socios_actualizados = 0
        cargas_creadas = 0
        errores = []

        for item in payload.registros:
            try:
                run_norm = normalizar_run(item.rut)
                user = await db.scalar(select(User).where(User.rut == run_norm))
                if user:
                    user.nombre_completo = item.nombreCompleto
                    user.email = item.email
                    user.departamento = item.departamento or user.departamento
                    user.meses_antiguedad = item.mesesAntiguedad or user.meses_antiguedad
                    socios_actualizados += 1
                else:
                    clave_temp = generar_clave_temporal_rut(run_norm)
                    user = User(
                        rut=run_norm,
                        email=item.email,
                        nombre_completo=item.nombreCompleto,
                        hashed_password=get_password_hash(clave_temp),
                        rol=UserRole(item.rol or "socio"),
                        departamento=item.departamento or "Departamento Municipal",
                        antiguedad=f"{item.mesesAntiguedad or 12} Meses",
                        meses_antiguedad=item.mesesAntiguedad or 12,
                        estado_previsional="Al día",
                        saldo_salud_disponible=item.saldoSaludDisponible or 150000,
                        cargas_registradas=len(item.cargas),
                    )
                    db.add(user)
                    socios_creados += 1
                cargas_creadas += len(item.cargas)
            except Exception as e:
                errores.append(f"Error procesando {item.rut}: {str(e)}")

        db.add(
            AuditLog(
                usuario_id=evaluador.id,
                usuario_nombre=evaluador.nombre_completo,
                usuario_rut=evaluador.rut,
                usuario_rol=_val(evaluador.rol),
                modulo="AFILIACION",
                accion="CARGA_MASIVA_SOCIOS_EXCEL",
                recurso_tipo="NominaMasiva",
                detalles=f"Carga masiva ejecutada: {socios_creados} nuevos, {socios_actualizados} actualizados, {cargas_creadas} cargas.",
                ip_origen="127.0.0.1",
            )
        )
        await db.commit()
        return {
            "mensaje": f"Carga masiva procesada: {socios_creados} socios nuevos y {socios_actualizados} actualizados.",
            "sociosCreados": socios_creados,
            "sociosActualizados": socios_actualizados,
            "cargasRegistradas": cargas_creadas,
            "errores": errores,
        }

    @staticmethod
    async def obtener_mis_cargas(db: AsyncSession, current_user: User) -> Dict[str, Any]:
        await asegurar_tabla_cargas(db)
        es_admin_o_super = bool(
            current_user.is_superuser or current_user.rol in (UserRole.ADMIN, UserRole.SUPERUSUARIO)
        )
        cargas_list: List[Dict[str, Any]] = []
        runs_vistos: set[str] = set()

        if es_admin_o_super:
            todas_solicitudes_extra = (
                await db.scalars(
                    select(SolicitudCargaFamiliar).order_by(SolicitudCargaFamiliar.id.desc())
                )
            ).all()

            for sc in todas_solicitudes_extra:
                run_norm = re.sub(r"[^0-9kK]", "", sc.run or "").upper()
                estado_val = sc.estado.value if isinstance(sc.estado, EstadoSolicitud) else str(sc.estado)
                if estado_val == EstadoSolicitud.APROBADA.value:
                    estado_mostrar = "Vigente"
                    runs_vistos.add(run_norm)
                elif estado_val == EstadoSolicitud.PENDIENTE.value:
                    estado_mostrar = "Pendiente de Revisión"
                elif estado_val == EstadoSolicitud.RECHAZADA.value:
                    estado_mostrar = "Rechazada"
                else:
                    estado_mostrar = estado_val

                parentesco_val = sc.parentesco or "Hijo/a"
                cert_tipo = sc.certificado_tipo or "Cédula de Identidad (Frontal)"
                cargas_list.append({
                    "id": f"cf-{sc.id}",
                    "folio": sc.folio,
                    "socioNombre": sc.socio_nombre,
                    "socioRut": formatear_run(sc.socio_rut),
                    "nombre": sc.nombre_completo,
                    "parentesco": parentesco_val,
                    "rut": formatear_run(sc.run),
                    "observacion": sc.observacion_socio,
                    "certificadoNombre": sc.certificado_nombre,
                    "certificadoTipo": cert_tipo,
                    "certificadoData": sc.certificado_data,
                    "estado": estado_mostrar,
                    "fechaSolicitud": sc.created_at.strftime("%Y-%m-%d") if sc.created_at else None,
                    "observacionesResolucion": sc.observaciones_resolucion,
                })

            todas_iniciales = (
                await db.scalars(
                    select(CargaFamiliar)
                    .join(SolicitudAfiliacion, CargaFamiliar.solicitud_id == SolicitudAfiliacion.id)
                    .where(SolicitudAfiliacion.estado == EstadoSolicitud.APROBADA)
                    .order_by(CargaFamiliar.id.desc())
                )
            ).all()
            for ci in todas_iniciales:
                run_norm = re.sub(r"[^0-9kK]", "", ci.run or "").upper()
                if run_norm not in runs_vistos:
                    runs_vistos.add(run_norm)
                    cargas_list.append({
                        "id": f"af-{ci.id}",
                        "folio": ci.solicitud.folio if ci.solicitud else "AF-INICIAL",
                        "socioNombre": ci.solicitud.nombre_completo if ci.solicitud else "Socio Activo",
                        "socioRut": formatear_run(ci.solicitud.run) if ci.solicitud else "",
                        "nombre": ci.nombre_completo,
                        "parentesco": ci.parentesco or "Carga Familiar",
                        "rut": formatear_run(ci.run),
                        "observacion": "Carga declarada en Solicitud de Incorporación inicial",
                        "certificadoNombre": None,
                        "certificadoTipo": "Incorporación Inicial",
                        "certificadoData": None,
                        "estado": "Vigente",
                        "fechaSolicitud": ci.created_at.strftime("%Y-%m-%d") if ci.created_at else None,
                        "observacionesResolucion": "Aprobada en sesión de Directorio",
                    })
            return {"modoVista": "admin", "cargas": cargas_list}

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
                estado_mostrar = "Vigente"
                runs_vistos.add(run_norm)
            elif estado_val == EstadoSolicitud.PENDIENTE.value:
                estado_mostrar = "Pendiente de Revisión"
            elif estado_val == EstadoSolicitud.RECHAZADA.value:
                estado_mostrar = "Rechazada"
            else:
                estado_mostrar = estado_val

            parentesco_val = sc.parentesco or "Hijo/a"
            cert_tipo = sc.certificado_tipo or "Cédula de Identidad (Frontal)"
            cargas_list.append({
                "id": f"cf-{sc.id}",
                "folio": sc.folio,
                "nombre": sc.nombre_completo,
                "parentesco": parentesco_val,
                "rut": formatear_run(sc.run),
                "observacion": sc.observacion_socio,
                "certificadoNombre": sc.certificado_nombre,
                "certificadoTipo": cert_tipo,
                "certificadoData": sc.certificado_data,
                "estado": estado_mostrar,
                "fechaSolicitud": sc.created_at.strftime("%Y-%m-%d") if sc.created_at else None,
                "observacionesResolucion": sc.observaciones_resolucion,
            })
        return {"modoVista": "socio", "cargas": cargas_list}

    @staticmethod
    async def solicitar_nueva_carga(db: AsyncSession, current_user: User, body: NuevaCargaIn) -> SolicitudCargaOut:
        await asegurar_tabla_cargas(db)

        # Doble vía: Si es directiva/admin y se proporciona socioId o socioRut, asociar al socio asistido
        es_directiva_o_admin = bool(
            current_user.is_superuser
            or _val(current_user.rol) in (
                UserRole.ADMIN.value,
                UserRole.SUPERUSUARIO.value,
                UserRole.PRESIDENTE.value,
                UserRole.SECRETARIO.value,
                UserRole.TESORERO.value,
            )
        )
        titular = current_user
        if es_directiva_o_admin and (body.socioId is not None or body.socioRut):
            if body.socioId is not None:
                titular = await db.scalar(select(User).where(User.id == body.socioId))
            elif body.socioRut:
                rut_norm_busc = normalizar_run(body.socioRut)
                titular = await db.scalar(select(User).where(User.rut == rut_norm_busc))
            if not titular:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Socio titular no encontrado en los registros de Bienestar.",
                )

        run_carga_norm = re.sub(r"[^0-9kK]", "", body.run).upper()
        run_titular_norm = re.sub(r"[^0-9kK]", "", titular.rut or "").upper()
        if run_carga_norm == run_titular_norm:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="El RUN de la carga familiar no puede ser igual al RUN del socio titular.",
            )

        # Exigencia de fotografía frontal de la cédula de identidad para verificar fehacientemente los datos
        if not body.certificadoData or not body.certificadoNombre:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Debe adjuntar la fotografía frontal de la cédula de identidad para verificar el RUN y nombres de la carga familiar.",
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
                detail=f"Ya existe un registro para esta carga familiar con RUN {formatear_run(body.run)}.",
            )

        anio = date.today().year
        folios_cf = (
            await db.scalars(select(SolicitudCargaFamiliar.folio).where(SolicitudCargaFamiliar.folio.like(f"CF-{anio}-%")))
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

        parentesco_limpio = (body.parentesco or "Hijo/a").strip()
        cert_tipo = body.certificadoTipo or "Cédula de Identidad (Frontal)"

        nueva_sc = SolicitudCargaFamiliar(
            folio=folio_nuevo,
            socio_id=titular.id,
            socio_nombre=titular.nombre_completo,
            socio_rut=formatear_run(titular.rut),
            socio_email=titular.email,
            nombre_completo=body.nombreCompleto.strip(),
            run=body.run,
            parentesco=parentesco_limpio,
            observacion_socio=(body.observacionSocio or "").strip() or cert_tipo,
            certificado_nombre=body.certificadoNombre.strip(),
            certificado_tipo=cert_tipo,
            certificado_data=body.certificadoData,
            estado=EstadoSolicitud.PENDIENTE,
        )
        db.add(nueva_sc)
        db.add(
            AuditLog(
                usuario_id=current_user.id,
                usuario_nombre=current_user.nombre_completo,
                usuario_rut=current_user.rut,
                usuario_rol=_val(current_user.rol),
                modulo="AFILIACION",
                accion="SOLICITUD_NUEVA_CARGA_FAMILIAR",
                recurso_tipo="SolicitudCargaFamiliar",
                recurso_id=folio_nuevo,
                detalles=(
                    f"Solicitud nueva carga {body.nombreCompleto.strip()} ({parentesco_limpio}) "
                    f"para titular {titular.nombre_completo} (RUN {titular.rut}) "
                    f"{'(asistida en oficina)' if titular.id != current_user.id else '(autogestión)'}."
                ),
                ip_origen="127.0.0.1",
            )
        )
        await db.commit()
        await db.refresh(nueva_sc)
        return to_solicitud_carga_out(nueva_sc)

    @staticmethod
    async def listar_solicitudes_cargas(db: AsyncSession) -> List[SolicitudCargaOut]:
        await asegurar_tabla_cargas(db)
        rows = (
            await db.scalars(select(SolicitudCargaFamiliar).order_by(SolicitudCargaFamiliar.id.desc()))
        ).all()
        return [to_solicitud_carga_out(r) for r in rows]

    @staticmethod
    async def resolver_solicitud_carga(
        db: AsyncSession,
        folio: str,
        body: ResolucionSolicitudIn,
        evaluador: User,
    ) -> SolicitudCargaOut:
        await asegurar_tabla_cargas(db)
        sc = await db.scalar(select(SolicitudCargaFamiliar).where(SolicitudCargaFamiliar.folio == folio))
        if not sc:
            raise HTTPException(status_code=404, detail="Solicitud de carga familiar no encontrada.")
        if _val(sc.estado) != _val(EstadoSolicitud.PENDIENTE):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"La solicitud {sc.folio} ya fue resuelta ({_val(sc.estado)}).",
            )

        socio = await db.scalar(select(User).where(User.id == sc.socio_id))
        email_dest = sc.socio_email or (socio.email if socio else None)
        run_formateado_carga = formatear_run(sc.run)
        run_formateado_socio = sc.socio_rut or (formatear_run(socio.rut) if socio else "")

        if body.accion == "aprobar":
            sc.estado = EstadoSolicitud.APROBADA
            sc.fecha_sesion = body.fechaSesion or date.today().isoformat()
            sc.numero_acta = (body.numeroActa or "").strip() or None
            sc.observaciones_resolucion = (body.observaciones or "").strip() or "Aprobada por Directorio"
            sc.resuelto_por = f"{evaluador.nombre_completo} ({_val(evaluador.rol)})"
            sc.resuelto_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

            if socio:
                socio.cargas_registradas = int(socio.cargas_registradas or 0) + 1

            generar_correo_resolucion_carga_familiar(
                folio=sc.folio,
                socio_nombre=sc.socio_nombre,
                socio_rut=run_formateado_socio,
                email_destino=email_dest,
                carga_nombre=sc.nombre_completo,
                carga_run=run_formateado_carga,
                parentesco=sc.parentesco or "Carga Familiar",
                aprobada=True,
                motivo=sc.observaciones_resolucion,
                fecha_sesion=sc.fecha_sesion,
                numero_acta=sc.numero_acta,
                enviar_smtp=True,
            )
        else:
            sc.estado = EstadoSolicitud.RECHAZADA
            sc.observaciones_resolucion = (body.observaciones or "").strip() or "Rechazada por Directorio"
            sc.resuelto_por = f"{evaluador.nombre_completo} ({_val(evaluador.rol)})"
            sc.resuelto_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

            generar_correo_resolucion_carga_familiar(
                folio=sc.folio,
                socio_nombre=sc.socio_nombre,
                socio_rut=run_formateado_socio,
                email_destino=email_dest,
                carga_nombre=sc.nombre_completo,
                carga_run=run_formateado_carga,
                parentesco=sc.parentesco or "Carga Familiar",
                aprobada=False,
                motivo=sc.observaciones_resolucion,
                fecha_sesion=sc.fecha_sesion,
                numero_acta=sc.numero_acta,
                enviar_smtp=True,
            )

        db.add(
            AuditLog(
                usuario_id=evaluador.id,
                usuario_nombre=evaluador.nombre_completo,
                usuario_rut=evaluador.rut,
                usuario_rol=_val(evaluador.rol),
                modulo="AFILIACION",
                accion="RESOLVER_CARGA_FAMILIAR",
                recurso_tipo="SolicitudCargaFamiliar",
                recurso_id=sc.folio,
                detalles=f"Carga {sc.folio} resuelta como {_val(sc.estado)}.",
                ip_origen="127.0.0.1",
            )
        )
        await db.commit()
        await db.refresh(sc)
        return to_solicitud_carga_out(sc)
