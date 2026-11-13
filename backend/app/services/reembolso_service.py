"""Servicio de lógica de negocio para el módulo de Reembolsos Médicos (HU-03).

Implementa las reglas de negocio indicadas en los criterios de aceptación:
  - Validación de carencia de 6 meses de antigüedad.
  - Control del plazo de 30 días corridos desde la fecha de prestación.
  - Generación de código correlativo de solicitud.
  - Cálculo de resumen de saldo anual y porcentaje utilizado.
"""
import logging
import re
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.afiliacion import (
    CargaFamiliar,
    EstadoSolicitud,
    SolicitudAfiliacion,
    SolicitudCargaFamiliar,
)
from app.models.audit import AuditLog
from app.models.reembolso import (
    EstadoReembolso,
    ESTADO_REEMBOLSO_LABELS,
    SolicitudReembolso,
    TipoPrestacion,
    TIPO_PRESTACION_LABELS,
    TIPOS_DOCUMENTO,
)
from app.models.user import User, UserRole
from app.schemas.reembolso import (
    BeneficiarioReembolso,
    ReembolsoCreateRequest,
    ReembolsoOut,
    ResumenSaludSocio,
    ValidacionFechaResponse,
)
from app.services.email_service import (
    generar_correo_recepcion_reembolso,
    generar_correo_resolucion_reembolso,
)

logger = logging.getLogger("uvicorn.error")

# Meses mínimos de antigüedad para poder solicitar reembolso
MESES_CARENCIA = 6

# Días máximos desde la fecha de atención para poder ingresar la solicitud
DIAS_PLAZO_MAX = 30

# Tope anual de reembolso de salud por socio (CLP)
TOPE_ANUAL_SALUD = 150000


# [ESTUDIANTE INFORMÁTICA] Esta función auxiliar convierte textos como '5 Años, 4 Meses' a una cantidad entera de meses; esto permite hacer comparaciones numéricas directas con la carencia mínima.
def _parse_antiguedad_a_meses(antiguedad_str: str) -> int:
    """Convierte la cadena de antigüedad del usuario (ej: '5 Años, 4 Meses') a meses."""
    if not antiguedad_str:
        return 0

    texto = antiguedad_str.lower().strip()
    anios = 0
    meses = 0
    tokens = texto.replace(",", "").split()
    i = 0
    while i < len(tokens):
        try:
            val = int(tokens[i])
            if i + 1 < len(tokens):
                unit = tokens[i + 1]
                if "año" in unit:
                    anios = val
                elif "mes" in unit:
                    meses = val
        except ValueError:
            pass
        i += 1

    return anios * 12 + meses


# [ESTUDIANTE INFORMÁTICA] Esto calcula la fecha futura en que el socio cumplirá los 6 meses de permanencia; esto permite informarle con exactitud cuándo podrá solicitar beneficios.
def _calcular_fecha_habilitacion(antiguedad_meses: int) -> Optional[str]:
    """Si faltan meses para alcanzar la carencia, retorna la fecha estimada."""
    if antiguedad_meses >= MESES_CARENCIA:
        return None
    faltante = MESES_CARENCIA - antiguedad_meses
    fecha = date.today() + timedelta(days=faltante * 30)
    return fecha.isoformat()


# [ESTUDIANTE INFORMÁTICA] Esta función implementa la regla de negocio de carencia (HU-03: mínimo 6 meses); esto valida si el socio está habilitado y permite bloquear el formulario en caso contrario.
def validar_carencia(user: User) -> Tuple[bool, Optional[str], Optional[str]]:
    """Valida la carencia de 6 meses.
    
    Returns:
        (puede_solicitar, fecha_habilitacion, mensaje)
    """
    meses = _parse_antiguedad_a_meses(user.antiguedad)
    if meses >= MESES_CARENCIA:
        return True, None, None

    fecha_hab = _calcular_fecha_habilitacion(meses)
    return (
        False,
        fecha_hab,
        f"Su antigüedad actual es de {meses} mes(es). Debe tener al menos {MESES_CARENCIA} meses "
        f"de afiliación activa para poder solicitar reembolsos. "
        f"Podrá operar a partir del {fecha_hab}.",
    )


# [ESTUDIANTE INFORMÁTICA] Esta función calcula los días transcurridos desde la atención médica hasta hoy; esto permite validar la regla de los 30 días corridos de caducidad que exige el reglamento.
def validar_plazo_30_dias(fecha_atencion: date) -> ValidacionFechaResponse:
    """Verifica que la fecha de atención no supere los 30 días corridos."""
    hoy = date.today()
    fecha_limite = fecha_atencion + timedelta(days=DIAS_PLAZO_MAX)
    dias = (hoy - fecha_atencion).days

    dentro = dias <= DIAS_PLAZO_MAX

    if dentro:
        dias_restantes = DIAS_PLAZO_MAX - dias
        mensaje = f"Dentro de plazo. Le quedan {dias_restantes} día(s) para ingresar esta solicitud."
    else:
        dias_excedidos = dias - DIAS_PLAZO_MAX
        mensaje = (
            f"Fuera de plazo. Han transcurrido {dias} días desde la atención, "
            f"superando el máximo de {DIAS_PLAZO_MAX} días corridos por {dias_excedidos} día(s). "
            f"No es posible adjuntar este gasto por caducidad del plazo."
        )

    return ValidacionFechaResponse(
        fecha_atencion=fecha_atencion.isoformat(),
        fecha_limite=fecha_limite.isoformat(),
        dias_transcurridos=dias,
        dentro_de_plazo=dentro,
        mensaje=mensaje,
    )


# [ESTUDIANTE INFORMÁTICA] Esto consulta la cantidad de solicitudes en la base de datos y genera el siguiente correlativo (ej: RMB-0005); esto permite mantener un orden numérico auditable.
async def generar_codigo(db: AsyncSession) -> str:
    """Genera un código correlativo RMB-XXXX."""
    result = await db.scalar(select(func.count(SolicitudReembolso.id)))
    siguiente = (result or 0) + 1
    codigo = f"RMB-{siguiente:04d}"
    while await db.scalar(select(SolicitudReembolso.id).where(SolicitudReembolso.codigo == codigo)):
        siguiente += 1
        codigo = f"RMB-{siguiente:04d}"
    return codigo


def _obtener_anio_imputacion(sol: SolicitudReembolso) -> int:
    """Determina el año calendario (1 ene - 31 dic) al que se imputa el reembolso.

    Por regla de negocio del Comité de Bienestar, el tope anual de $150.000 se
    renueva cada 1 de enero (año calendario). Si una solicitud fue ingresada en
    diciembre del año anterior, consume el cupo de ese año y en enero el socio
    vuelve a contar con su tope anual íntegro de $150.000.
    """
    fecha_at: Optional[date] = None
    if sol.fecha_atencion:
        if isinstance(sol.fecha_atencion, date):
            fecha_at = sol.fecha_atencion
        else:
            try:
                fecha_at = date.fromisoformat(str(sol.fecha_atencion)[:10])
            except ValueError:
                fecha_at = None

    if sol.created_at:
        anio_creacion = sol.created_at.year
        if fecha_at and fecha_at.year < anio_creacion:
            dias_diferencia = (sol.created_at.date() - fecha_at).days
            # Si es un registro histórico cuya atención fue el año anterior fuera de la ventana de cambio de año
            if dias_diferencia > DIAS_PLAZO_MAX:
                return fecha_at.year
        return anio_creacion

    if fecha_at:
        return fecha_at.year

    return date.today().year


# [ESTUDIANTE INFORMÁTICA] Esto mapea una entidad ORM al DTO de salida ReembolsoOut; esto permite preparar los datos con formato legible para enviárselos al frontend.
def solicitud_to_out(sol: SolicitudReembolso) -> ReembolsoOut:
    """Convierte una instancia ORM a su schema de salida."""
    return ReembolsoOut(
        id=sol.id,
        codigo=sol.codigo,
        socio_id=sol.socio_id,
        socio_nombre=sol.socio.nombre_completo if sol.socio else "",
        socio_rut=sol.socio.rut if sol.socio else "",
        socio_departamento=sol.socio.departamento if sol.socio else "",
        tipo_prestacion=sol.tipo_prestacion.value,
        tipo_prestacion_label=TIPO_PRESTACION_LABELS.get(
            sol.tipo_prestacion, sol.tipo_prestacion.value
        ),
        descripcion=sol.descripcion or "",
        beneficiario_nombre=sol.beneficiario_nombre,
        beneficiario_parentesco=sol.beneficiario_parentesco,
        beneficiario_run=getattr(sol, "beneficiario_run", "") or "",
        monto_boleta=sol.monto_boleta,
        monto_copago=sol.monto_copago,
        monto_reembolso=sol.monto_reembolso,
        fecha_atencion=str(sol.fecha_atencion),
        fecha_boleta=str(sol.fecha_boleta),
        tipo_documento=sol.tipo_documento or "",
        tipo_documento_label=TIPOS_DOCUMENTO.get(sol.tipo_documento or "", ""),
        comprobante_filename=sol.comprobante_filename or "",
        comprobante_url=sol.comprobante_url or (
            f"/api/v1/reembolsos/solicitud/{sol.id}/comprobante" if sol.comprobante_filename else ""
        ),
        declaracion_aceptada=bool(sol.declaracion_aceptada),
        estado=sol.estado.value,
        estado_label=ESTADO_REEMBOLSO_LABELS.get(sol.estado, sol.estado.value),
        motivo_rechazo=sol.motivo_rechazo or "",
        created_at=sol.created_at.isoformat() if sol.created_at else "",
        anio_imputacion=_obtener_anio_imputacion(sol),
    )


_COLUMNAS_REEMBOLSO_LISTAS = False


async def asegurar_columnas_reembolso(db: AsyncSession) -> None:
    """Asegura de forma idempotente que las columnas opcionales existan en PostgreSQL."""
    global _COLUMNAS_REEMBOLSO_LISTAS
    if _COLUMNAS_REEMBOLSO_LISTAS:
        return
    try:
        bind = db.get_bind()
        if bind and "sqlite" in getattr(bind.dialect, "name", ""):
            _COLUMNAS_REEMBOLSO_LISTAS = True
            return
    except Exception:
        pass
    try:
        await db.execute(
            text(
                "ALTER TABLE solicitudes_reembolso ADD COLUMN IF NOT EXISTS beneficiario_run VARCHAR(20) DEFAULT ''"
            )
        )
        await db.commit()
        _COLUMNAS_REEMBOLSO_LISTAS = True
    except Exception:
        await db.rollback()


async def obtener_beneficiarios_socio(user: User, db: AsyncSession) -> List[BeneficiarioReembolso]:
    """Retorna la lista de beneficiarios válidos para un socio (Titular + Cargas Familiares Aprobadas)."""
    beneficiarios: List[BeneficiarioReembolso] = [
        BeneficiarioReembolso(
            nombre=user.nombre_completo,
            rut=user.rut,
            parentesco="Titular",
            es_titular=True,
        )
    ]
    runs_vistos = {re.sub(r"[^0-9kK]", "", user.rut or "").upper()}

    # 1. Cargas aprobadas en SolicitudCargaFamiliar
    try:
        cargas_solicitudes = (
            await db.scalars(
                select(SolicitudCargaFamiliar)
                .where(
                    SolicitudCargaFamiliar.socio_id == user.id,
                    SolicitudCargaFamiliar.estado == EstadoSolicitud.APROBADA,
                )
                .order_by(SolicitudCargaFamiliar.id.asc())
            )
        ).all()
        for cs in cargas_solicitudes:
            norm_r = re.sub(r"[^0-9kK]", "", cs.run or "").upper()
            if norm_r and norm_r not in runs_vistos:
                runs_vistos.add(norm_r)
                beneficiarios.append(
                    BeneficiarioReembolso(
                        nombre=cs.nombre_completo,
                        rut=cs.run,
                        parentesco=cs.parentesco or "Carga Familiar",
                        es_titular=False,
                    )
                )
    except Exception as e:
        logger.warning("Error consultando SolicitudCargaFamiliar para beneficiarios: %s", e)

    # 2. Cargas aprobadas en SolicitudAfiliacion inicial
    try:
        user_clean_rut = re.sub(r"[^0-9kK]", "", user.rut or "").upper()
        solicitud_af = await db.scalar(
            select(SolicitudAfiliacion).where(
                func.replace(func.replace(func.upper(SolicitudAfiliacion.run), ".", ""), "-", "")
                == user_clean_rut,
                SolicitudAfiliacion.estado == EstadoSolicitud.APROBADA,
            )
        )
        if solicitud_af:
            cargas_af = (
                await db.scalars(
                    select(CargaFamiliar).where(CargaFamiliar.solicitud_id == solicitud_af.id)
                )
            ).all()
            for ca in cargas_af:
                norm_r = re.sub(r"[^0-9kK]", "", ca.run or "").upper()
                if norm_r and norm_r not in runs_vistos:
                    runs_vistos.add(norm_r)
                    beneficiarios.append(
                        BeneficiarioReembolso(
                            nombre=ca.nombre_completo,
                            rut=ca.run,
                            parentesco=ca.parentesco or "Carga Familiar",
                            es_titular=False,
                        )
                    )
    except Exception as e:
        logger.warning("Error consultando CargaFamiliar inicial para beneficiarios: %s", e)

    return beneficiarios


async def _asegurar_semilla_diciembre_anterior(user: User, db: AsyncSession) -> None:
    """Garantiza de forma idempotente un reembolso histórico de diciembre del año anterior por $150.000
    para demostrar que el cupo es por año calendario y se renueva al 100% en enero del nuevo año."""
    if user.email != "cvalenzuela@mperalillo.cl":
        return

    anio_anterior = date.today().year - 1
    codigo_dic = f"RMB-{anio_anterior}-DIC"
    existe = await db.scalar(
        select(SolicitudReembolso.id).where(SolicitudReembolso.codigo == codigo_dic)
    )
    if existe:
        return

    fecha_dic = date(anio_anterior, 12, 18)
    creado_dic = datetime(anio_anterior, 12, 18, 15, 30, tzinfo=timezone.utc)

    semilla_dic = SolicitudReembolso(
        codigo=codigo_dic,
        socio_id=user.id,
        tipo_prestacion=TipoPrestacion.EXAMENES,
        descripcion=f"Exámenes y procedimientos diciembre {anio_anterior} (Tope anual {anio_anterior} utilizado al 100%)",
        beneficiario_nombre=user.nombre_completo,
        beneficiario_parentesco="Titular",
        monto_boleta=168000,
        monto_copago=150000,
        monto_reembolso=150000,
        fecha_atencion=fecha_dic,
        fecha_boleta=fecha_dic,
        tipo_documento="bono_copago",
        declaracion_aceptada=True,
        estado=EstadoReembolso.PAGADO,
        created_at=creado_dic,
        updated_at=creado_dic,
    )
    db.add(semilla_dic)
    await db.commit()


# [ESTUDIANTE INFORMÁTICA] Esta función calcula las finanzas de salud del socio por AÑO CALENDARIO (1 ene al 31 dic); suma únicamente lo que está en revisión y lo aprobado dentro del año calendario vigente para restar del tope anual de $150.000, renovando automáticamente el cupo cada 1 de enero.
async def obtener_resumen_socio(
    user: User, db: AsyncSession, anio: Optional[int] = None
) -> ResumenSaludSocio:
    """Calcula el resumen de salud y fondos del socio para el año calendario vigente."""
    await _asegurar_semilla_diciembre_anterior(user, db)

    anio_calendario = anio or date.today().year
    puede, fecha_hab, msg_carencia = validar_carencia(user)
    meses = _parse_antiguedad_a_meses(user.antiguedad)

    # Obtener todas las solicitudes del socio y filtrar exclusivamente por el año calendario consultado
    result = await db.scalars(
        select(SolicitudReembolso).where(SolicitudReembolso.socio_id == user.id)
    )
    solicitudes_anio = [
        s for s in result if _obtener_anio_imputacion(s) == anio_calendario
    ]

    en_revision_list = [
        s for s in solicitudes_anio if s.estado == EstadoReembolso.EN_REVISION
    ]
    aprobadas_list = [
        s
        for s in solicitudes_anio
        if s.estado in (EstadoReembolso.APROBADO, EstadoReembolso.PAGADO)
    ]

    monto_en_revision = sum(float(s.monto_reembolso or 0) for s in en_revision_list)
    total_reembolsado = sum(float(s.monto_reembolso or 0) for s in aprobadas_list)
    en_revision_count = len(en_revision_list)
    aprobadas_count = len(aprobadas_list)

    total_anual = float(TOPE_ANUAL_SALUD)
    total_comprometido = float(monto_en_revision + total_reembolsado)
    disponible = float(max(0.0, total_anual - total_comprometido))
    pct = ((total_anual - disponible) / total_anual * 100) if total_anual > 0 else 0

    # Sincronizar en la BD el saldo_salud_disponible y el tope anual ($150.000) del año calendario actual
    if anio_calendario == date.today().year:
        user_db = await db.get(User, user.id)
        if user_db and (
            user_db.saldo_salud_disponible != int(disponible)
            or user_db.saldo_salud_total_anual != int(TOPE_ANUAL_SALUD)
        ):
            user_db.saldo_salud_disponible = int(disponible)
            user_db.saldo_salud_total_anual = int(TOPE_ANUAL_SALUD)
            db.add(user_db)
            await db.commit()

    return ResumenSaludSocio(
        socio_id=user.id,
        socio_nombre=user.nombre_completo,
        rut=user.rut,
        tipo_socio="Socio Activo" if user.is_active else "Inactivo",
        estado_previsional=user.estado_previsional,
        fecha_afiliacion="",
        meses_antiguedad=meses,
        puede_solicitar=puede,
        fecha_habilitacion=fecha_hab,
        mensaje_carencia=msg_carencia,
        saldo_salud_disponible=disponible,
        saldo_salud_total_anual=total_anual,
        porcentaje_utilizado=round(pct, 1),
        total_reembolsado_periodo=float(total_reembolsado),
        solicitudes_en_revision=en_revision_count,
        solicitudes_aprobadas=aprobadas_count,
        anio_calendario=anio_calendario,
        fecha_inicio_periodo=f"{anio_calendario}-01-01",
        fecha_fin_periodo=f"{anio_calendario}-12-31",
        fecha_renovacion_anual=f"{anio_calendario + 1}-01-01",
    )


# [ESTUDIANTE INFORMÁTICA] Esta función persiste la solicitud (HU-03) y recalcula de inmediato el saldo del año calendario vigente del socio; esto permite apartar el dinero preventivamente para que no ingrese otra solicitud duplicada sin fondos.
async def crear_solicitud(
    user: User,
    payload: ReembolsoCreateRequest,
    db: AsyncSession,
    comprobante_filename: str = "",
    comprobante_url: str = "",
) -> SolicitudReembolso:
    """Crea y persiste una nueva solicitud de reembolso tras validar reglas de negocio."""
    await asegurar_columnas_reembolso(db)

    # Cargar usuario fresco en la sesión activa
    socio_actual = (await db.get(User, user.id)) or user

    # 1. Determinar el socio titular a evaluar (atención presencial asistida o autogestión)
    es_admin_o_directiva = bool(
        getattr(socio_actual, "is_superuser", False)
        or (
            hasattr(socio_actual, "rol")
            and (
                socio_actual.rol
                in (
                    UserRole.ADMIN,
                    UserRole.SUPERUSUARIO,
                    UserRole.PRESIDENTE,
                    UserRole.TESORERO,
                    UserRole.SECRETARIO,
                )
                or getattr(socio_actual.rol, "value", "")
                in ("ADMIN", "SUPERUSUARIO", "PRESIDENTE", "TESORERO", "SECRETARIO")
            )
        )
    )

    socio_a_evaluar = socio_actual
    if es_admin_o_directiva and payload.socio_id and payload.socio_id != socio_actual.id:
        target = await db.get(User, payload.socio_id)
        if not target:
            raise ValueError(f"Socio titular con ID {payload.socio_id} no encontrado.")
        socio_a_evaluar = target
    elif es_admin_o_directiva and payload.socio_rut:
        clean_rut = re.sub(r"[^0-9kK]", "", payload.socio_rut).upper()
        todos_usuarios = (await db.scalars(select(User))).all()
        target = next(
            (u for u in todos_usuarios if re.sub(r"[^0-9kK]", "", u.rut or "").upper() == clean_rut),
            None,
        )
        if not target:
            raise ValueError(f"Socio titular con RUN {payload.socio_rut} no encontrado.")
        socio_a_evaluar = target

    # 2. Validación de carencia de 6 meses sobre el socio titular a evaluar (Art. 14)
    puede, _, msg_carencia = validar_carencia(socio_a_evaluar)
    if not puede:
        raise ValueError(msg_carencia or "El socio titular no cumple con el período de carencia de 6 meses.")

    # 3. Validación de plazo de 30 días corridos
    hoy = date.today()
    if payload.fecha_atencion > hoy or payload.fecha_boleta > hoy:
        raise ValueError("Las fechas de atención y de boleta no pueden ser futuras.")
    res_atencion = validar_plazo_30_dias(payload.fecha_atencion)
    if not res_atencion.dentro_de_plazo:
        raise ValueError(f"Fecha de atención: {res_atencion.mensaje}")
    res_boleta = validar_plazo_30_dias(payload.fecha_boleta)
    if not res_boleta.dentro_de_plazo:
        raise ValueError(f"Fecha de boleta/compra: {res_boleta.mensaje}")

    # 4. Validación de montos
    if payload.monto_copago > payload.monto_boleta:
        raise ValueError("El monto a reembolsar no puede ser superior al total de la boleta.")

    resumen = await obtener_resumen_socio(socio_a_evaluar, db)
    if payload.monto_copago > resumen.saldo_salud_disponible:
        raise ValueError(
            f"El copago solicitado (${payload.monto_copago:,.0f}) supera el saldo disponible "
            f"(${resumen.saldo_salud_disponible:,.0f} de $150.000 anuales)."
        )

    # 5. Validación de beneficiario (Titular o Carga Familiar aprobada)
    beneficiario_run = (payload.beneficiario_run or "").strip()
    if (payload.beneficiario_parentesco or "").strip().lower() != "titular":
        beneficiarios_validos = await obtener_beneficiarios_socio(socio_a_evaluar, db)
        nom_buscado = payload.beneficiario_nombre.strip().lower()
        run_buscado = re.sub(r"[^0-9kK]", "", beneficiario_run).upper() if beneficiario_run else ""

        carga_encontrada = next(
            (
                b for b in beneficiarios_validos
                if not b.es_titular
                and (
                    b.nombre.strip().lower() == nom_buscado
                    or (run_buscado and re.sub(r"[^0-9kK]", "", b.rut or "").upper() == run_buscado)
                )
            ),
            None,
        )
        if not carga_encontrada:
            raise ValueError(
                f"El beneficiario '{payload.beneficiario_nombre}' ({payload.beneficiario_parentesco}) "
                f"no figura como carga familiar vigente y aprobada del socio {socio_a_evaluar.nombre_completo}."
            )
        if not beneficiario_run and carga_encontrada.rut:
            beneficiario_run = carga_encontrada.rut

    codigo = await generar_codigo(db)

    solicitud = SolicitudReembolso(
        codigo=codigo,
        socio_id=socio_a_evaluar.id,
        tipo_prestacion=TipoPrestacion(payload.tipo_prestacion),
        descripcion=payload.descripcion,
        beneficiario_nombre=payload.beneficiario_nombre,
        beneficiario_parentesco=payload.beneficiario_parentesco,
        beneficiario_run=beneficiario_run,
        monto_boleta=payload.monto_boleta,
        monto_copago=payload.monto_copago,
        monto_reembolso=payload.monto_copago,
        fecha_atencion=payload.fecha_atencion,
        fecha_boleta=payload.fecha_boleta,
        tipo_documento=payload.tipo_documento,
        declaracion_aceptada=payload.declaracion_aceptada,
        comprobante_filename=comprobante_filename,
        comprobante_url=comprobante_url,
        estado=EstadoReembolso.EN_REVISION,
    )

    db.add(solicitud)
    await db.commit()
    await db.refresh(solicitud)

    # Recalcular y sincronizar el saldo disponible del año calendario vigente
    resumen_post = await obtener_resumen_socio(socio_a_evaluar, db)
    await db.refresh(solicitud)

    # Emitir y registrar correo oficial de confirmación de recepción
    try:
        prestacion_lbl = TIPO_PRESTACION_LABELS.get(
            solicitud.tipo_prestacion, solicitud.tipo_prestacion.value
        )
        generar_correo_recepcion_reembolso(
            codigo=solicitud.codigo,
            socio_nombre=socio_a_evaluar.nombre_completo,
            socio_rut=socio_a_evaluar.rut,
            email_destino=socio_a_evaluar.email or "",
            tipo_prestacion_label=prestacion_lbl,
            beneficiario_nombre=solicitud.beneficiario_nombre,
            beneficiario_parentesco=solicitud.beneficiario_parentesco,
            monto_boleta=solicitud.monto_boleta,
            monto_copago=solicitud.monto_copago,
            saldo_restante=resumen_post.saldo_salud_disponible,
            fecha_atencion=str(solicitud.fecha_atencion),
            enviar_smtp=True,
        )
    except Exception as exc:
        logger.warning(
            "No se pudo emitir correo de recepción de reembolso %s: %s", solicitud.codigo, exc
        )

    return solicitud


# [ESTUDIANTE INFORMÁTICA] Esta función recupera las solicitudes del socio autenticado ordenadas cronológicamente; permite renderizar la tabla del historial personal.
async def listar_solicitudes_socio(
    user: User, db: AsyncSession
) -> List[SolicitudReembolso]:
    """Lista todas las solicitudes de reembolso del socio, ordenadas por fecha."""
    result = await db.scalars(
        select(SolicitudReembolso)
        .options(selectinload(SolicitudReembolso.socio))
        .where(SolicitudReembolso.socio_id == user.id)
        .order_by(SolicitudReembolso.created_at.desc())
    )
    return list(result)


async def _asegurar_semillas_sla_demo(db: AsyncSession) -> None:
    """Garantiza de forma idempotente 3 solicitudes de demostración con distintos tramos de antigüedad SLA (<5d, 5-9d, >10d)."""
    existe_demo = await db.scalar(
        select(SolicitudReembolso.id).where(SolicitudReembolso.codigo == "RMB-0091")
    )
    if existe_demo:
        return

    carlos = await db.scalar(select(User).where(User.email == "cvalenzuela@mperalillo.cl"))
    javiera = await db.scalar(select(User).where(User.email == "jherrera@mperalillo.cl"))
    felipe = await db.scalar(select(User).where(User.email == "faraya@mperalillo.cl"))

    socio_1 = carlos or javiera or felipe
    if not socio_1:
        return
    socio_2 = javiera or socio_1
    socio_3 = felipe or socio_1

    ahora = datetime.now(timezone.utc)
    hoy = date.today()

    semillas = [
        # 1. ROJO (> 10 días): 14 días en bandeja
        SolicitudReembolso(
            codigo="RMB-0091",
            socio_id=socio_1.id,
            tipo_prestacion=TipoPrestacion.EXAMENES,
            descripcion="Resonancia magnética lumbar y perfil bioquímico completo",
            beneficiario_nombre=socio_1.nombre_completo,
            beneficiario_parentesco="Titular",
            monto_boleta=85000,
            monto_copago=42500,
            monto_reembolso=42500,
            fecha_atencion=hoy - timedelta(days=16),
            fecha_boleta=hoy - timedelta(days=15),
            tipo_documento="bono_copago",
            declaracion_aceptada=True,
            estado=EstadoReembolso.EN_REVISION,
            created_at=ahora - timedelta(days=14),
            updated_at=ahora - timedelta(days=14),
        ),
        # 2. AMARILLO (5 a 9 días): 7 días en bandeja
        SolicitudReembolso(
            codigo="RMB-0092",
            socio_id=socio_2.id,
            tipo_prestacion=TipoPrestacion.CONSULTA,
            descripcion="Consulta médica especialista en traumatología",
            beneficiario_nombre=socio_2.nombre_completo,
            beneficiario_parentesco="Titular",
            monto_boleta=48000,
            monto_copago=24000,
            monto_reembolso=24000,
            fecha_atencion=hoy - timedelta(days=9),
            fecha_boleta=hoy - timedelta(days=8),
            tipo_documento="bono_copago",
            declaracion_aceptada=True,
            estado=EstadoReembolso.EN_REVISION,
            created_at=ahora - timedelta(days=7),
            updated_at=ahora - timedelta(days=7),
        ),
        # 3. VERDE (< 5 días): 2 días en bandeja
        SolicitudReembolso(
            codigo="RMB-0093",
            socio_id=socio_3.id,
            tipo_prestacion=TipoPrestacion.FARMACIA,
            descripcion="Medicamentos crónicos con receta médica retenida",
            beneficiario_nombre=socio_3.nombre_completo,
            beneficiario_parentesco="Titular",
            monto_boleta=32000,
            monto_copago=18500,
            monto_reembolso=18500,
            fecha_atencion=hoy - timedelta(days=3),
            fecha_boleta=hoy - timedelta(days=2),
            tipo_documento="receta_medica",
            declaracion_aceptada=True,
            estado=EstadoReembolso.EN_REVISION,
            created_at=ahora - timedelta(days=2),
            updated_at=ahora - timedelta(days=2),
        ),
    ]

    for s in semillas:
        ya_existe = await db.scalar(
            select(SolicitudReembolso.id).where(SolicitudReembolso.codigo == s.codigo)
        )
        if not ya_existe:
            db.add(s)

    await db.commit()


# [ESTUDIANTE INFORMÁTICA] Esta función carga todas las solicitudes de todos los socios (HU-04); esto permite a la Directiva y Administradores gestionar y auditar la bandeja central.
async def listar_todas_solicitudes_admin(
    db: AsyncSession, estado: Optional[str] = None
) -> List[SolicitudReembolso]:
    """Lista todas las solicitudes de reembolso de los socios para la bandeja de administración."""
    await _asegurar_semillas_sla_demo(db)

    query = (
        select(SolicitudReembolso)
        .options(selectinload(SolicitudReembolso.socio))
        .order_by(SolicitudReembolso.created_at.desc())
    )
    if estado and estado.lower() != "todos":
        try:
            estado_enum = EstadoReembolso(estado.lower())
            query = query.where(SolicitudReembolso.estado == estado_enum)
        except ValueError:
            pass

    result = await db.scalars(query)
    return list(result)


# [ESTUDIANTE INFORMÁTICA] Esto cuenta las solicitudes en estado 'en_revision'; permite mostrar el globito de alerta roja con la cantidad de pendientes en el menú.
async def contar_solicitudes_pendientes_admin(db: AsyncSession) -> int:
    """Retorna la cantidad de solicitudes de reembolso en estado EN_REVISION."""
    await _asegurar_semillas_sla_demo(db)

    count = await db.scalar(
        select(func.count(SolicitudReembolso.id)).where(
            SolicitudReembolso.estado == EstadoReembolso.EN_REVISION
        )
    )
    return count or 0


# [ESTUDIANTE INFORMÁTICA] Esta función es el corazón de la HU-04: resuelve la solicitud (APROBAR o RECHAZAR). Si se rechaza, le devuelve el saldo al socio; además, registra el suceso en AuditLog para que quede constancia inmutable de quién tomó la decisión y por qué.
async def resolver_solicitud_reembolso(
    solicitud_id: int,
    accion: str,
    motivo_rechazo: str,
    admin_user: User,
    db: AsyncSession,
) -> SolicitudReembolso:
    """Aprueba o rechaza una solicitud de reembolso de salud."""
    solicitud = await db.get(SolicitudReembolso, solicitud_id)
    if not solicitud:
        raise ValueError("Solicitud de reembolso no encontrada.")

    accion_upper = accion.upper().strip()
    if accion_upper not in ("APROBAR", "RECHAZAR"):
        raise ValueError("Acción no válida. Debe ser 'APROBAR' o 'RECHAZAR'.")

    # Obtener el socio para actualizar saldos si se rechaza
    socio = await db.get(User, solicitud.socio_id)

    if accion_upper == "APROBAR":
        solicitud.estado = EstadoReembolso.APROBADO
        solicitud.motivo_rechazo = ""
    else:
        # Al rechazar, liberamos el monto comprometido en su año calendario correspondiente
        solicitud.estado = EstadoReembolso.RECHAZADO
        solicitud.motivo_rechazo = motivo_rechazo or "Rechazado por administración"

    # Registrar evento inmutable en AuditLog
    audit = AuditLog(
        usuario_id=admin_user.id,
        usuario_nombre=admin_user.nombre_completo,
        usuario_rut=admin_user.rut,
        usuario_rol=admin_user.rol.value if hasattr(admin_user.rol, 'value') else str(admin_user.rol),
        modulo="REEMBOLSOS",
        accion=f"{accion_upper}_REEMBOLSO",
        recurso_tipo="SolicitudReembolso",
        recurso_id=solicitud.codigo,
        detalles=(
            f"Solicitud {solicitud.codigo} por ${solicitud.monto_copago:,.0f} "
            f"resuelta como {accion_upper}. Socio: {socio.nombre_completo if socio else ''}"
            + (f" | Motivo: {motivo_rechazo}" if accion_upper == "RECHAZAR" and motivo_rechazo else "")
        ),
    )
    db.add(audit)
    db.add(solicitud)
    await db.commit()

    resumen_post = None
    if socio:
        resumen_post = await obtener_resumen_socio(socio, db)

    await db.refresh(solicitud)

    # Emitir y registrar correo transaccional de resolución oficial
    if socio:
        try:
            prestacion_lbl = TIPO_PRESTACION_LABELS.get(
                solicitud.tipo_prestacion, solicitud.tipo_prestacion.value
            )
            generar_correo_resolucion_reembolso(
                codigo=solicitud.codigo,
                socio_nombre=socio.nombre_completo,
                socio_rut=socio.rut,
                email_destino=socio.email or "",
                aprobada=(accion_upper == "APROBAR"),
                tipo_prestacion_label=prestacion_lbl,
                beneficiario_nombre=solicitud.beneficiario_nombre,
                beneficiario_parentesco=solicitud.beneficiario_parentesco,
                monto_reembolso=solicitud.monto_copago,
                saldo_disponible_actual=resumen_post.saldo_salud_disponible if resumen_post else 150000.0,
                motivo_rechazo=solicitud.motivo_rechazo,
                enviar_smtp=True,
            )
        except Exception as exc:
            logger.warning(
                "No se pudo emitir correo de resolución de reembolso %s: %s", solicitud.codigo, exc
            )

    return solicitud
