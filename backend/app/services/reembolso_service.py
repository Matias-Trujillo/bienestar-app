"""Servicio de lógica de negocio para el módulo de Reembolsos Médicos (HU-03).

Implementa las reglas de negocio indicadas en los criterios de aceptación:
  - Validación de carencia de 6 meses de antigüedad.
  - Control del plazo de 30 días corridos desde la fecha de prestación.
  - Generación de código correlativo de solicitud.
  - Cálculo de resumen de saldo anual y porcentaje utilizado.
"""
import logging
from datetime import date, timedelta
from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit import AuditLog
from app.models.reembolso import (
    EstadoReembolso,
    ESTADO_REEMBOLSO_LABELS,
    SolicitudReembolso,
    TipoPrestacion,
    TIPO_PRESTACION_LABELS,
    TIPOS_DOCUMENTO,
)
from app.models.user import User
from app.schemas.reembolso import (
    ReembolsoCreateRequest,
    ReembolsoOut,
    ResumenSaludSocio,
    ValidacionFechaResponse,
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
    return f"RMB-{siguiente:04d}"


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
    )


# [ESTUDIANTE INFORMÁTICA] Esta función calcula las finanzas de salud del socio; suma lo que está en revisión y lo ya aprobado para restar del tope anual de $150.000 y permite saber exactamente cuánto saldo disponible le queda para nuevos gastos.
async def obtener_resumen_socio(user: User, db: AsyncSession) -> ResumenSaludSocio:
    """Calcula el resumen de salud y fondos del socio."""
    puede, fecha_hab, msg_carencia = validar_carencia(user)
    meses = _parse_antiguedad_a_meses(user.antiguedad)

    # Calcular monto total en revisión (comprometido preventivamente)
    monto_en_revision = await db.scalar(
        select(func.coalesce(func.sum(SolicitudReembolso.monto_reembolso), 0)).where(
            SolicitudReembolso.socio_id == user.id,
            SolicitudReembolso.estado == EstadoReembolso.EN_REVISION,
        )
    ) or 0

    # Calcular total reembolsado en el período (aprobado + pagado)
    total_reembolsado = await db.scalar(
        select(func.coalesce(func.sum(SolicitudReembolso.monto_reembolso), 0)).where(
            SolicitudReembolso.socio_id == user.id,
            SolicitudReembolso.estado.in_([
                EstadoReembolso.APROBADO,
                EstadoReembolso.PAGADO,
            ]),
        )
    ) or 0

    en_revision_count = await db.scalar(
        select(func.count(SolicitudReembolso.id)).where(
            SolicitudReembolso.socio_id == user.id,
            SolicitudReembolso.estado == EstadoReembolso.EN_REVISION,
        )
    ) or 0

    aprobadas_count = await db.scalar(
        select(func.count(SolicitudReembolso.id)).where(
            SolicitudReembolso.socio_id == user.id,
            SolicitudReembolso.estado.in_([
                EstadoReembolso.APROBADO,
                EstadoReembolso.PAGADO,
            ]),
        )
    ) or 0

    total_anual = float(min(user.saldo_salud_total_anual, TOPE_ANUAL_SALUD))
    total_comprometido = float(monto_en_revision + total_reembolsado)
    disponible = float(max(0.0, total_anual - total_comprometido))
    pct = ((total_anual - disponible) / total_anual * 100) if total_anual > 0 else 0

    # Sincronizar en la BD el saldo_salud_disponible del usuario para que quede consistente
    user_db = await db.get(User, user.id)
    if user_db and user_db.saldo_salud_disponible != int(disponible):
        user_db.saldo_salud_disponible = int(disponible)
        db.add(user_db)
        await db.commit()

    return ResumenSaludSocio(
        socio_id=user.id,
        socio_nombre=user.nombre_completo,
        rut=user.rut,
        tipo_socio="Socio Activo" if user.is_active else "Inactivo",
        estado_previsional=user.estado_previsional,
        fecha_afiliacion="",  # Se puede enriquecer cuando se tenga el campo
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
    )


# [ESTUDIANTE INFORMÁTICA] Esta función persiste la solicitud (HU-03) y descuenta de inmediato el copago del saldo del socio; esto permite apartar el dinero preventivamente para que no ingrese otra solicitud duplicada sin fondos.
async def crear_solicitud(
    user: User,
    payload: ReembolsoCreateRequest,
    db: AsyncSession,
    comprobante_filename: str = "",
    comprobante_url: str = "",
) -> SolicitudReembolso:
    """Crea y persiste una nueva solicitud de reembolso tras validar reglas de negocio."""
    codigo = await generar_codigo(db)

    solicitud = SolicitudReembolso(
        codigo=codigo,
        socio_id=user.id,
        tipo_prestacion=TipoPrestacion(payload.tipo_prestacion),
        descripcion=payload.descripcion,
        beneficiario_nombre=payload.beneficiario_nombre,
        beneficiario_parentesco=payload.beneficiario_parentesco,
        monto_boleta=payload.monto_boleta,
        monto_copago=payload.monto_copago,
        monto_reembolso=payload.monto_copago,  # Inicialmente el reembolso = copago solicitado
        fecha_atencion=payload.fecha_atencion,
        fecha_boleta=payload.fecha_boleta,
        tipo_documento=payload.tipo_documento,
        declaracion_aceptada=payload.declaracion_aceptada,
        comprobante_filename=comprobante_filename,
        comprobante_url=comprobante_url,
        estado=EstadoReembolso.EN_REVISION,
    )

    db.add(solicitud)
    await db.flush()

    # Actualizar preventivamente el saldo en BD
    user_db = await db.get(User, user.id)
    if user_db:
        user_db.saldo_salud_disponible = max(0, int(user_db.saldo_salud_disponible - payload.monto_copago))
        db.add(user_db)

    await db.commit()
    await db.refresh(solicitud)
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


# [ESTUDIANTE INFORMÁTICA] Esta función carga todas las solicitudes de todos los socios (HU-04); esto permite a la Directiva y Administradores gestionar y auditar la bandeja central.
async def listar_todas_solicitudes_admin(
    db: AsyncSession, estado: Optional[str] = None
) -> List[SolicitudReembolso]:
    """Lista todas las solicitudes de reembolso de los socios para la bandeja de administración."""
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
        # Al rechazar, restauramos el saldo preventivo en el usuario
        solicitud.estado = EstadoReembolso.RECHAZADO
        solicitud.motivo_rechazo = motivo_rechazo or "Rechazado por administración"
        if socio:
            socio.saldo_salud_disponible = min(
                socio.saldo_salud_total_anual,
                int(socio.saldo_salud_disponible + solicitud.monto_reembolso)
            )
            db.add(socio)

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
    await db.refresh(solicitud)
    return solicitud

