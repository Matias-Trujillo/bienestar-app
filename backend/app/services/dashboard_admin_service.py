"""Servicio de dominio (SRP + DIP) para el Resumen General de la Vista Admin.

[ESTUDIANTE INFORMÁTICA] Concentra exclusivamente la agregación de novedades desde el último
acceso del operador, bandejas de solicitudes por aprobar, solicitudes rechazadas recientes,
métricas de actividad de la plataforma y últimas entradas de la bitácora de auditoría.
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    AuditLog,
    EstadoReembolso,
    EstadoSolicitud,
    OfertaLaboral,
    PagoReembolso,
    PerfilTalentoVecino,
    SolicitudAfiliacion,
    SolicitudBeneficio,
    SolicitudCargaFamiliar,
    SolicitudReembolso,
    User,
    UserRole,
)
from app.schemas.dashboard_admin import (
    ActividadRecienteItem,
    ConteoBandejasOut,
    MetricasActividadOut,
    NovedadesDesdeAccesoOut,
    PendientesDesgloseOut,
    RechazadasDesgloseOut,
    ResumenGeneralAdminOut,
    SolicitudResumenItem,
)


def _as_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Normaliza fechas naive (SQLite en pruebas) y aware (PostgreSQL) a UTC comparable."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _iso_utc(dt: Optional[datetime], fallback: datetime) -> str:
    norm = _as_utc(dt) or fallback
    return norm.isoformat()


class DashboardAdminService:
    """Agregador de métricas y novedades para el Centro de Mando Ejecutivo (Vista Admin)."""

    async def obtener_resumen_general(
        self, db: AsyncSession, usuario: User
    ) -> ResumenGeneralAdminOut:
        ahora = datetime.now(timezone.utc)
        acceso_previo = _as_utc(getattr(usuario, "acceso_anterior", None))
        es_primer_acceso = acceso_previo is None
        desde = acceso_previo if acceso_previo is not None else (ahora - timedelta(hours=24))
        hace_30_dias = ahora - timedelta(days=30)
        inicio_hoy = ahora.replace(hour=0, minute=0, second=0, microsecond=0)
        hace_7_dias = ahora - timedelta(days=7)

        # 1. Métricas de padrón de usuarios y socios
        total_usuarios = int(await db.scalar(select(func.count(User.id))) or 0)
        socios_activos = int(
            await db.scalar(
                select(func.count(User.id)).where(
                    User.rol == UserRole.SOCIO,
                    User.is_active == True,  # noqa: E712
                )
            )
            or 0
        )
        socios_habilitados = int(
            await db.scalar(
                select(func.count(User.id)).where(
                    User.rol == UserRole.SOCIO,
                    User.is_active == True,  # noqa: E712
                    User.meses_antiguedad >= 6,
                )
            )
            or 0
        )
        socios_carencia = max(0, socios_activos - socios_habilitados)

        # 2. Consultas de solicitudes pendientes (para conteos, novedades y bandeja rápida)
        afil_pendientes = list(
            (
                await db.scalars(
                    select(SolicitudAfiliacion)
                    .where(SolicitudAfiliacion.estado == EstadoSolicitud.PENDIENTE)
                    .order_by(desc(SolicitudAfiliacion.created_at))
                )
            ).all()
        )
        cargas_pendientes = list(
            (
                await db.scalars(
                    select(SolicitudCargaFamiliar)
                    .where(SolicitudCargaFamiliar.estado == EstadoSolicitud.PENDIENTE)
                    .order_by(desc(SolicitudCargaFamiliar.created_at))
                )
            ).all()
        )
        reemb_revision = list(
            (
                await db.scalars(
                    select(SolicitudReembolso)
                    .options(selectinload(SolicitudReembolso.socio))
                    .where(SolicitudReembolso.estado == EstadoReembolso.EN_REVISION)
                    .order_by(desc(SolicitudReembolso.created_at))
                )
            ).all()
        )
        benef_pendientes = list(
            (
                await db.scalars(
                    select(SolicitudBeneficio)
                    .options(selectinload(SolicitudBeneficio.socio))
                    .where(SolicitudBeneficio.estado == "PENDIENTE")
                    .order_by(desc(SolicitudBeneficio.created_at))
                )
            ).all()
        )

        # Reembolsos aprobados aún sin pago efectivo registrado en pagos_reembolso (HU-04)
        pagos_ids_subq = select(PagoReembolso.solicitud_id)
        reembolsos_por_pagar = int(
            await db.scalar(
                select(func.count(SolicitudReembolso.id)).where(
                    SolicitudReembolso.estado == EstadoReembolso.APROBADO,
                    SolicitudReembolso.id.not_in(pagos_ids_subq),
                )
            )
            or 0
        )

        # 3. Solicitudes rechazadas recientes (últimos 30 días)
        afil_rechazadas_all = list(
            (
                await db.scalars(
                    select(SolicitudAfiliacion)
                    .where(SolicitudAfiliacion.estado == EstadoSolicitud.RECHAZADA)
                    .order_by(desc(SolicitudAfiliacion.updated_at))
                    .limit(20)
                )
            ).all()
        )
        cargas_rechazadas_all = list(
            (
                await db.scalars(
                    select(SolicitudCargaFamiliar)
                    .where(SolicitudCargaFamiliar.estado == EstadoSolicitud.RECHAZADA)
                    .order_by(desc(SolicitudCargaFamiliar.updated_at))
                    .limit(20)
                )
            ).all()
        )
        reemb_rechazados_all = list(
            (
                await db.scalars(
                    select(SolicitudReembolso)
                    .options(selectinload(SolicitudReembolso.socio))
                    .where(SolicitudReembolso.estado == EstadoReembolso.RECHAZADO)
                    .order_by(desc(SolicitudReembolso.updated_at))
                    .limit(20)
                )
            ).all()
        )
        benef_rechazados_all = list(
            (
                await db.scalars(
                    select(SolicitudBeneficio)
                    .options(selectinload(SolicitudBeneficio.socio))
                    .where(SolicitudBeneficio.estado == "RECHAZADO")
                    .order_by(desc(SolicitudBeneficio.updated_at))
                    .limit(20)
                )
            ).all()
        )

        def _en_ventana(dt: Optional[datetime], limite: datetime) -> bool:
            norm = _as_utc(dt)
            return norm is not None and norm >= limite

        afil_rech_30d = [s for s in afil_rechazadas_all if _en_ventana(s.resuelto_at or s.updated_at or s.created_at, hace_30_dias)]
        cargas_rech_30d = [s for s in cargas_rechazadas_all if _en_ventana(s.resuelto_at or s.updated_at or s.created_at, hace_30_dias)]
        reemb_rech_30d = [s for s in reemb_rechazados_all if _en_ventana(s.updated_at or s.created_at, hace_30_dias)]
        benef_rech_30d = [s for s in benef_rechazados_all if _en_ventana(s.fecha_revision or s.updated_at or s.created_at, hace_30_dias)]

        # 4. Novedades ingresadas desde el último acceso
        nuevas_afil = sum(1 for s in afil_pendientes if _en_ventana(s.created_at, desde))
        nuevas_cargas = sum(1 for s in cargas_pendientes if _en_ventana(s.created_at, desde))
        nuevos_reemb = sum(1 for s in reemb_revision if _en_ventana(s.created_at, desde))
        nuevos_benef = sum(1 for s in benef_pendientes if _en_ventana(s.created_at, desde))

        talento_recientes = list(
            (await db.scalars(select(PerfilTalentoVecino.created_at))).all()
        )
        nuevas_talento = sum(1 for dt in talento_recientes if _en_ventana(dt, desde))
        total_talento = len(talento_recientes)

        ofertas_activas = int(
            await db.scalar(
                select(func.count(OfertaLaboral.id)).where(OfertaLaboral.activa == True)  # noqa: E712
            )
            or 0
        )

        # 5. Métricas financieras y de actividad en AuditLog
        monto_reemb_revision = int(
            sum(int(r.monto_reembolso or r.monto_copago or 0) for r in reemb_revision)
        )
        monto_reemb_desembolsado = int(
            await db.scalar(
                select(func.coalesce(func.sum(SolicitudReembolso.monto_reembolso), 0)).where(
                    SolicitudReembolso.estado.in_(
                        [EstadoReembolso.APROBADO, EstadoReembolso.PAGADO]
                    )
                )
            )
            or 0
        )
        monto_benef_desembolsado = int(
            await db.scalar(
                select(func.coalesce(func.sum(SolicitudBeneficio.monto_calculado), 0)).where(
                    SolicitudBeneficio.estado.in_(["APROBADO", "LIQUIDADO"])
                )
            )
            or 0
        )

        total_logs = int(await db.scalar(select(func.count(AuditLog.id))) or 0)
        logs_recientes_rows = list(
            (await db.scalars(select(AuditLog).order_by(desc(AuditLog.id)).limit(100))).all()
        )
        eventos_hoy = sum(1 for lg in logs_recientes_rows if _en_ventana(lg.created_at, inicio_hoy))
        eventos_7d = sum(1 for lg in logs_recientes_rows if _en_ventana(lg.created_at, hace_7_dias))

        # 6. Lista unificada de Solicitudes Por Aprobar (Top 12 más recientes)
        pendientes_unificadas: List[SolicitudResumenItem] = []

        for s in afil_pendientes:
            pendientes_unificadas.append(
                SolicitudResumenItem(
                    id_referencia=f"afil-{s.id}",
                    modulo="AFILIACION",
                    folio=s.folio,
                    solicitante=s.nombre_completo,
                    detalle=f"Incorporación {s.calidad_contractual.value if hasattr(s.calidad_contractual, 'value') else s.calidad_contractual} • Grado {s.grado}",
                    estado="Pendiente de aprobación",
                    monto=None,
                    fecha_iso=_iso_utc(s.created_at, ahora),
                    es_nueva=_en_ventana(s.created_at, desde),
                    href="/afiliacion",
                )
            )

        for c in cargas_pendientes:
            pendientes_unificadas.append(
                SolicitudResumenItem(
                    id_referencia=f"carga-{c.id}",
                    modulo="CARGAS",
                    folio=c.folio,
                    solicitante=c.socio_nombre,
                    detalle=f"Nueva carga: {c.nombre_completo} ({c.parentesco})",
                    estado="Pendiente de aprobación",
                    monto=None,
                    fecha_iso=_iso_utc(c.created_at, ahora),
                    es_nueva=_en_ventana(c.created_at, desde),
                    href="/afiliacion",
                )
            )

        for r in reemb_revision:
            socio_nom = r.socio.nombre_completo if r.socio else r.beneficiario_nombre
            prest = r.tipo_prestacion.value if hasattr(r.tipo_prestacion, "value") else str(r.tipo_prestacion)
            pendientes_unificadas.append(
                SolicitudResumenItem(
                    id_referencia=f"reemb-{r.id}",
                    modulo="REEMBOLSOS",
                    folio=r.codigo,
                    solicitante=socio_nom,
                    detalle=f"Reembolso {prest.replace('_', ' ')} • Beneficiario: {r.beneficiario_nombre}",
                    estado="En revisión",
                    monto=int(r.monto_reembolso or r.monto_copago or 0),
                    fecha_iso=_iso_utc(r.created_at, ahora),
                    es_nueva=_en_ventana(r.created_at, desde),
                    href="/aprobaciones",
                )
            )

        for b in benef_pendientes:
            socio_nom = b.socio.nombre_completo if b.socio else f"Socio #{b.socio_id}"
            pendientes_unificadas.append(
                SolicitudResumenItem(
                    id_referencia=f"benef-{b.id}",
                    modulo="BENEFICIOS",
                    folio=f"BON-{b.id:04d}",
                    solicitante=socio_nom,
                    detalle=b.titulo_bono,
                    estado="Pendiente",
                    monto=int(b.monto_calculado or 0),
                    fecha_iso=_iso_utc(b.created_at, ahora),
                    es_nueva=_en_ventana(b.created_at, desde),
                    href="/beneficios",
                )
            )

        pendientes_unificadas.sort(key=lambda x: x.fecha_iso, reverse=True)

        # 7. Lista unificada de Solicitudes Rechazadas Recientes (Top 8)
        rechazadas_unificadas: List[SolicitudResumenItem] = []

        for s in afil_rech_30d:
            rechazadas_unificadas.append(
                SolicitudResumenItem(
                    id_referencia=f"afil-rech-{s.id}",
                    modulo="AFILIACION",
                    folio=s.folio,
                    solicitante=s.nombre_completo,
                    detalle=f"Incorporación Grado {s.grado}",
                    estado="Rechazada",
                    motivo_rechazo=s.observaciones_resolucion or "Sin observación registrada",
                    monto=None,
                    fecha_iso=_iso_utc(s.resuelto_at or s.updated_at or s.created_at, ahora),
                    es_nueva=_en_ventana(s.resuelto_at or s.updated_at, desde),
                    href="/afiliacion",
                )
            )

        for c in cargas_rech_30d:
            rechazadas_unificadas.append(
                SolicitudResumenItem(
                    id_referencia=f"carga-rech-{c.id}",
                    modulo="CARGAS",
                    folio=c.folio,
                    solicitante=c.socio_nombre,
                    detalle=f"Carga: {c.nombre_completo} ({c.parentesco})",
                    estado="Rechazada",
                    motivo_rechazo=c.observaciones_resolucion or "Sin observación registrada",
                    monto=None,
                    fecha_iso=_iso_utc(c.resuelto_at or c.updated_at or c.created_at, ahora),
                    es_nueva=_en_ventana(c.resuelto_at or c.updated_at, desde),
                    href="/afiliacion",
                )
            )

        for r in reemb_rech_30d:
            socio_nom = r.socio.nombre_completo if r.socio else r.beneficiario_nombre
            rechazadas_unificadas.append(
                SolicitudResumenItem(
                    id_referencia=f"reemb-rech-{r.id}",
                    modulo="REEMBOLSOS",
                    folio=r.codigo,
                    solicitante=socio_nom,
                    detalle=f"Reembolso médico • {r.beneficiario_nombre}",
                    estado="Rechazado",
                    motivo_rechazo=r.motivo_rechazo or "Sin motivo registrado",
                    monto=int(r.monto_reembolso or r.monto_copago or 0),
                    fecha_iso=_iso_utc(r.updated_at or r.created_at, ahora),
                    es_nueva=_en_ventana(r.updated_at, desde),
                    href="/aprobaciones",
                )
            )

        for b in benef_rech_30d:
            socio_nom = b.socio.nombre_completo if b.socio else f"Socio #{b.socio_id}"
            rechazadas_unificadas.append(
                SolicitudResumenItem(
                    id_referencia=f"benef-rech-{b.id}",
                    modulo="BENEFICIOS",
                    folio=f"BON-{b.id:04d}",
                    solicitante=socio_nom,
                    detalle=b.titulo_bono,
                    estado="Rechazado",
                    motivo_rechazo=b.motivo_rechazo or "Sin motivo registrado",
                    monto=int(b.monto_calculado or 0),
                    fecha_iso=_iso_utc(b.fecha_revision or b.updated_at or b.created_at, ahora),
                    es_nueva=_en_ventana(b.fecha_revision or b.updated_at, desde),
                    href="/beneficios",
                )
            )

        rechazadas_unificadas.sort(key=lambda x: x.fecha_iso, reverse=True)

        # 8. Feed de actividad reciente (Top 10 AuditLog)
        actividad_reciente = [
            ActividadRecienteItem(
                id=lg.id,
                modulo=lg.modulo or "SISTEMA",
                accion=lg.accion or "EVENTO",
                usuario_nombre=lg.usuario_nombre or "Sistema",
                usuario_rol=lg.usuario_rol or "",
                detalles=lg.detalles or "",
                fecha_iso=_iso_utc(lg.created_at, ahora),
            )
            for lg in logs_recientes_rows[:10]
        ]

        total_por_aprobar = (
            len(afil_pendientes)
            + len(cargas_pendientes)
            + len(reemb_revision)
            + len(benef_pendientes)
        )
        total_rech_30d = (
            len(afil_rech_30d)
            + len(cargas_rech_30d)
            + len(reemb_rech_30d)
            + len(benef_rech_30d)
        )

        return ResumenGeneralAdminOut(
            generado_en_iso=ahora.isoformat(),
            novedades=NovedadesDesdeAccesoOut(
                desde_iso=desde.isoformat(),
                es_primer_acceso=es_primer_acceso,
                nuevas_afiliaciones=nuevas_afil,
                nuevas_cargas=nuevas_cargas,
                nuevos_reembolsos=nuevos_reemb,
                nuevos_beneficios=nuevos_benef,
                nuevas_postulaciones_talento=nuevas_talento,
                total_novedades=(
                    nuevas_afil
                    + nuevas_cargas
                    + nuevos_reemb
                    + nuevos_benef
                    + nuevas_talento
                ),
            ),
            bandejas=ConteoBandejasOut(
                por_aprobar=PendientesDesgloseOut(
                    afiliaciones=len(afil_pendientes),
                    cargas=len(cargas_pendientes),
                    reembolsos_revision=len(reemb_revision),
                    reembolsos_por_pagar=reembolsos_por_pagar,
                    beneficios=len(benef_pendientes),
                    total=total_por_aprobar,
                ),
                rechazadas_30d=RechazadasDesgloseOut(
                    afiliaciones=len(afil_rech_30d),
                    cargas=len(cargas_rech_30d),
                    reembolsos=len(reemb_rech_30d),
                    beneficios=len(benef_rech_30d),
                    total=total_rech_30d,
                ),
            ),
            metricas=MetricasActividadOut(
                total_usuarios=total_usuarios,
                socios_activos=socios_activos,
                socios_habilitados=socios_habilitados,
                socios_carencia=socios_carencia,
                eventos_hoy=eventos_hoy,
                eventos_7d=eventos_7d,
                total_eventos_auditoria=total_logs,
                monto_reembolsos_revision=monto_reemb_revision,
                monto_desembolsado_periodo=monto_reemb_desembolsado + monto_benef_desembolsado,
                ofertas_activas=ofertas_activas,
                postulaciones_talento=total_talento,
            ),
            solicitudes_por_aprobar=pendientes_unificadas[:12],
            solicitudes_rechazadas=rechazadas_unificadas[:8],
            actividad_reciente=actividad_reciente,
        )
