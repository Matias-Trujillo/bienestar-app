"""Servicio de dominio para HU-07: Conciliación Cód. 47 RRHH y Cartola BancoEstado."""
from datetime import date, datetime, timezone
import re
from typing import Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AuditLog,
    ConciliacionPlanilla,
    PagoAporteMensual,
    PagoReembolso,
    SolicitudReembolso,
    User,
    UserRole,
)
from app.schemas.finanzas import (
    CartolaBancoEstadoIn,
    CartolaConciliacionResultOut,
    ChequeConciliadoOut,
    ChequeEnTransitoOut,
    ConciliacionPlanillaDetalleOut,
    ConciliacionPlanillaIn,
    ConciliacionPlanillaOut,
    PagoAporteMensualOut,
    RegularizarAporteIn,
)


def _normalizar_rut(rut: str) -> str:
    return re.sub(r"[^0-9kK]", "", (rut or "")).upper()


def _normalizar_numero_cheque(valor: str) -> str:
    limpio = re.sub(r"[^0-9]", "", (valor or ""))
    return limpio.lstrip("0") or limpio


def _extraer_cheque_de_texto(texto: str) -> str:
    # Busca patrones como "CHQ 0045123", "CHEQUE N° 45123", "CH-45123" o secuencias de 4+ dígitos
    m = re.search(r"(?:cheque|chq|ch|doc|nro|n°)\D{0,6}(\d{3,12})", texto or "", re.IGNORECASE)
    if m:
        return _normalizar_numero_cheque(m.group(1))
    m2 = re.search(r"\b(\d{4,12})\b", texto or "")
    return _normalizar_numero_cheque(m2.group(1)) if m2 else ""


def _conciliacion_to_out(c: ConciliacionPlanilla) -> ConciliacionPlanillaOut:
    return ConciliacionPlanillaOut(
        id=c.id,
        codigo=c.codigo,
        periodo=c.periodo,
        archivo_rrhh_nombre=c.archivo_rrhh_nombre,
        monto_declarado_rrhh=c.monto_declarado_rrhh,
        monto_cartola_banco=c.monto_cartola_banco,
        diferencia_clp=c.diferencia_clp,
        comprobante_banco_ref=c.comprobante_banco_ref,
        total_socios_evaluados=c.total_socios_evaluados,
        socios_al_dia=c.socios_al_dia,
        socios_con_brecha=c.socios_con_brecha,
        estado=c.estado,
        observaciones=c.observaciones or "",
        registrado_por_nombre=c.registrado_por_nombre,
        created_at=c.created_at,
    )


def _detalle_to_out(d: PagoAporteMensual) -> PagoAporteMensualOut:
    return PagoAporteMensualOut(
        id=d.id,
        conciliacion_id=d.conciliacion_id,
        socio_id=d.socio_id,
        socio_rut=d.socio_rut,
        socio_nombre=d.socio_nombre,
        periodo=d.periodo,
        monto_esperado=d.monto_esperado,
        monto_descontado_cod47=d.monto_descontado_cod47,
        diferencia=d.diferencia,
        estado=d.estado,
        motivo_brecha=d.motivo_brecha or "",
        regularizado_por_nombre=d.regularizado_por_nombre,
        regularizado_at=d.regularizado_at,
    )


class ConciliacionService:
    """Gestiona la conciliación de aportes 4% (Cód. 47) y el cruce bancario de cheques."""

    DIAS_ALERTA_CHEQUE = 60

    @classmethod
    async def listar_conciliaciones(
        cls, db: AsyncSession
    ) -> List[ConciliacionPlanillaOut]:
        rows = (
            await db.scalars(
                select(ConciliacionPlanilla).order_by(ConciliacionPlanilla.created_at.desc())
            )
        ).all()
        return [_conciliacion_to_out(c) for c in rows]

    @classmethod
    async def obtener_detalle_conciliacion(
        cls, db: AsyncSession, conciliacion_id: int
    ) -> ConciliacionPlanillaDetalleOut:
        conc = await db.scalar(
            select(ConciliacionPlanilla).where(ConciliacionPlanilla.id == conciliacion_id)
        )
        if not conc:
            raise HTTPException(status_code=404, detail="Conciliación de planilla no encontrada.")

        detalles = (
            await db.scalars(
                select(PagoAporteMensual)
                .where(PagoAporteMensual.conciliacion_id == conciliacion_id)
                .order_by(PagoAporteMensual.estado.desc(), PagoAporteMensual.socio_nombre.asc())
            )
        ).all()

        base = _conciliacion_to_out(conc)
        return ConciliacionPlanillaDetalleOut(
            **base.model_dump(),
            detalles=[_detalle_to_out(d) for d in detalles],
        )

    @classmethod
    async def procesar_conciliacion_cod47(
        cls,
        db: AsyncSession,
        payload: ConciliacionPlanillaIn,
        usuario: User,
        ip_origen: str = "127.0.0.1",
    ) -> ConciliacionPlanillaDetalleOut:
        """Cruza la planilla RRHH (Cód. 47) contra el padrón de socios activos y el depósito BancoEstado."""
        socios_activos = (
            await db.scalars(
                select(User).where(
                    User.rol == UserRole.SOCIO,
                    User.is_active == True,  # noqa: E712
                )
            )
        ).all()
        mapa_socios: Dict[str, User] = {_normalizar_rut(s.rut): s for s in socios_activos}

        # Indexar filas cargadas desde RRHH por RUN normalizado
        mapa_filas: Dict[str, Dict] = {}
        monto_declarado_rrhh = 0
        for fila in payload.filas_cod47:
            rut_norm = _normalizar_rut(fila.rut)
            if not rut_norm:
                continue
            monto_declarado_rrhh += int(fila.monto_descontado)
            if rut_norm in mapa_filas:
                mapa_filas[rut_norm]["monto_descontado"] += int(fila.monto_descontado)
            else:
                mapa_filas[rut_norm] = {
                    "rut_raw": fila.rut.strip(),
                    "nombre": (fila.nombre or "").strip(),
                    "monto_esperado": fila.monto_esperado,
                    "monto_descontado": int(fila.monto_descontado),
                    "observacion": (fila.observacion or "").strip(),
                }

        correlativo = (
            await db.scalar(
                select(func.count(ConciliacionPlanilla.id)).where(
                    ConciliacionPlanilla.periodo == payload.periodo
                )
            )
            or 0
        ) + 1
        periodo_compact = payload.periodo.replace("-", "")
        codigo = f"CON-{periodo_compact}-{correlativo:03d}"

        diferencia_clp = int(payload.monto_cartola_banco) - int(monto_declarado_rrhh)

        conciliacion = ConciliacionPlanilla(
            codigo=codigo,
            periodo=payload.periodo,
            archivo_rrhh_nombre=payload.archivo_rrhh_nombre.strip() or "planilla_cod47.csv",
            monto_declarado_rrhh=monto_declarado_rrhh,
            monto_cartola_banco=int(payload.monto_cartola_banco),
            diferencia_clp=diferencia_clp,
            comprobante_banco_ref=payload.comprobante_banco_ref.strip(),
            observaciones=(payload.observaciones or "").strip(),
            registrado_por_id=usuario.id,
            registrado_por_nombre=usuario.nombre_completo,
        )
        db.add(conciliacion)
        await db.flush()

        detalles_creados: List[PagoAporteMensual] = []
        ruts_procesados = set()
        al_dia = 0
        con_brecha = 0

        # 1. Evaluar todos los socios activos contra la planilla RRHH
        for rut_norm, socio in mapa_socios.items():
            ruts_procesados.add(rut_norm)
            fila_rrhh = mapa_filas.get(rut_norm)
            if fila_rrhh:
                descontado = int(fila_rrhh["monto_descontado"])
                esperado = (
                    int(fila_rrhh["monto_esperado"])
                    if fila_rrhh["monto_esperado"] is not None
                    else descontado
                )
                diff = descontado - esperado
                if descontado > 0 and diff >= 0:
                    estado_fila = "AL_DIA"
                    motivo = fila_rrhh["observacion"]
                    al_dia += 1
                else:
                    estado_fila = "BRECHA"
                    motivo = (
                        fila_rrhh["observacion"]
                        or "Descuento inferior al 4% esperado o en cero (posible licencia/permiso)."
                    )
                    con_brecha += 1
            else:
                esperado = 0
                descontado = 0
                diff = 0
                estado_fila = "BRECHA"
                motivo = "Socio activo no figura con descuento Cód. 47 en la planilla RRHH."
                con_brecha += 1

            det = PagoAporteMensual(
                conciliacion_id=conciliacion.id,
                socio_id=socio.id,
                socio_rut=socio.rut,
                socio_nombre=socio.nombre_completo,
                periodo=payload.periodo,
                monto_esperado=esperado,
                monto_descontado_cod47=descontado,
                diferencia=diff,
                estado=estado_fila,
                motivo_brecha=motivo,
            )
            db.add(det)
            detalles_creados.append(det)

        # 2. Incluir filas de RRHH cuyos RUN no estaban en el padrón de socios (para visibilidad contable)
        for rut_norm, fila_rrhh in mapa_filas.items():
            if rut_norm in ruts_procesados:
                continue
            descontado = int(fila_rrhh["monto_descontado"])
            esperado = (
                int(fila_rrhh["monto_esperado"])
                if fila_rrhh["monto_esperado"] is not None
                else descontado
            )
            det = PagoAporteMensual(
                conciliacion_id=conciliacion.id,
                socio_id=None,
                socio_rut=fila_rrhh["rut_raw"],
                socio_nombre=fila_rrhh["nombre"] or "Funcionario sin ficha activa",
                periodo=payload.periodo,
                monto_esperado=esperado,
                monto_descontado_cod47=descontado,
                diferencia=descontado - esperado,
                estado="BRECHA",
                motivo_brecha="RUN descontado por RRHH pero sin ficha de socio activo en Bienestar.",
            )
            db.add(det)
            detalles_creados.append(det)
            con_brecha += 1

        conciliacion.total_socios_evaluados = len(detalles_creados)
        conciliacion.socios_al_dia = al_dia
        conciliacion.socios_con_brecha = con_brecha
        conciliacion.estado = (
            "CUADRADA" if (diferencia_clp == 0 and con_brecha == 0) else "CON_DIFERENCIA"
        )

        db.add(
            AuditLog(
                usuario_id=usuario.id,
                usuario_nombre=usuario.nombre_completo,
                usuario_rut=usuario.rut,
                usuario_rol=usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol),
                modulo="FINANZAS",
                accion="CONCILIAR_PLANILLA_COD47",
                recurso_tipo="ConciliacionPlanilla",
                recurso_id=codigo,
                detalles=(
                    f"Conciliación {codigo} período {payload.periodo}: RRHH ${monto_declarado_rrhh:,.0f} vs "
                    f"BancoEstado ${payload.monto_cartola_banco:,.0f} (dif ${diferencia_clp:,.0f}). "
                    f"Al día: {al_dia}, Brechas: {con_brecha}."
                ),
                ip_origen=ip_origen,
            )
        )
        await db.commit()
        await db.refresh(conciliacion)
        for d in detalles_creados:
            await db.refresh(d)

        base = _conciliacion_to_out(conciliacion)
        return ConciliacionPlanillaDetalleOut(
            **base.model_dump(),
            detalles=[_detalle_to_out(d) for d in detalles_creados],
        )

    @classmethod
    async def regularizar_aporte(
        cls,
        db: AsyncSession,
        aporte_id: int,
        payload: RegularizarAporteIn,
        usuario: User,
        ip_origen: str = "127.0.0.1",
    ) -> PagoAporteMensualOut:
        aporte = await db.scalar(
            select(PagoAporteMensual).where(PagoAporteMensual.id == aporte_id)
        )
        if not aporte:
            raise HTTPException(status_code=404, detail="Registro de aporte mensual no encontrado.")

        aporte.estado = "REGULARIZADO"
        aporte.motivo_brecha = payload.motivo_regularizacion.strip()
        if payload.monto_regularizado is not None:
            aporte.monto_descontado_cod47 = int(payload.monto_regularizado)
            aporte.diferencia = aporte.monto_descontado_cod47 - aporte.monto_esperado
        aporte.regularizado_por_nombre = usuario.nombre_completo
        aporte.regularizado_at = datetime.now(timezone.utc)

        # Actualizar contadores de la conciliación padre
        conc = await db.scalar(
            select(ConciliacionPlanilla).where(ConciliacionPlanilla.id == aporte.conciliacion_id)
        )
        if conc:
            brechas_restantes = (
                await db.scalar(
                    select(func.count(PagoAporteMensual.id)).where(
                        PagoAporteMensual.conciliacion_id == conc.id,
                        PagoAporteMensual.estado == "BRECHA",
                    )
                )
                or 0
            )
            # Restar 1 si la flush aún no reflejó el cambio en SQLite
            await db.flush()
            brechas_restantes = (
                await db.scalar(
                    select(func.count(PagoAporteMensual.id)).where(
                        PagoAporteMensual.conciliacion_id == conc.id,
                        PagoAporteMensual.estado == "BRECHA",
                    )
                )
                or 0
            )
            conc.socios_con_brecha = int(brechas_restantes)
            conc.socios_al_dia = max(0, conc.total_socios_evaluados - int(brechas_restantes))
            if brechas_restantes == 0:
                conc.estado = "REGULARIZADA" if conc.diferencia_clp != 0 else "CUADRADA"

        db.add(
            AuditLog(
                usuario_id=usuario.id,
                usuario_nombre=usuario.nombre_completo,
                usuario_rut=usuario.rut,
                usuario_rol=usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol),
                modulo="FINANZAS",
                accion="REGULARIZAR_APORTE_COD47",
                recurso_tipo="PagoAporteMensual",
                recurso_id=f"{aporte.periodo}-{aporte.socio_rut}",
                detalles=(
                    f"Brecha regularizada para {aporte.socio_nombre} ({aporte.socio_rut}) "
                    f"período {aporte.periodo}: {aporte.motivo_brecha}"
                ),
                ip_origen=ip_origen,
            )
        )
        await db.commit()
        await db.refresh(aporte)
        return _detalle_to_out(aporte)

    @classmethod
    async def listar_cheques_en_transito(
        cls, db: AsyncSession
    ) -> List[ChequeEnTransitoOut]:
        """Retorna cheques emitidos pendientes de cobro/recepción conforme, con alerta > 60 días."""
        stmt = (
            select(PagoReembolso, SolicitudReembolso, User)
            .join(SolicitudReembolso, PagoReembolso.solicitud_id == SolicitudReembolso.id)
            .join(User, SolicitudReembolso.socio_id == User.id)
            .where(PagoReembolso.recepcion_conforme == False)  # noqa: E712
            .order_by(PagoReembolso.fecha_pago.asc())
        )
        rows = (await db.execute(stmt)).all()
        hoy = date.today()
        salida: List[ChequeEnTransitoOut] = []
        for pago, sol, socio in rows:
            dias = 0
            if pago.fecha_pago:
                try:
                    f_emision = date.fromisoformat(pago.fecha_pago[:10])
                    dias = max(0, (hoy - f_emision).days)
                except ValueError:
                    dias = 0
            salida.append(
                ChequeEnTransitoOut(
                    solicitud_id=sol.id,
                    codigo_reembolso=sol.codigo,
                    socio_nombre=socio.nombre_completo,
                    socio_rut=socio.rut,
                    numero_cheque=pago.numero_cheque_o_transferencia or "",
                    banco_emisor=pago.banco_emisor or "BancoEstado",
                    monto_reembolso=int(sol.monto_reembolso),
                    fecha_emision=pago.fecha_pago or "",
                    dias_en_transito=dias,
                    alerta_60_dias=dias >= cls.DIAS_ALERTA_CHEQUE,
                )
            )
        return salida

    @classmethod
    async def conciliar_cartola_bancoestado(
        cls,
        db: AsyncSession,
        payload: CartolaBancoEstadoIn,
        usuario: User,
        ip_origen: str = "127.0.0.1",
    ) -> CartolaConciliacionResultOut:
        """Cruza movimientos de cartola BancoEstado por N° de Cheque y Monto para marcar cobros en lote."""
        stmt = (
            select(PagoReembolso, SolicitudReembolso, User)
            .join(SolicitudReembolso, PagoReembolso.solicitud_id == SolicitudReembolso.id)
            .join(User, SolicitudReembolso.socio_id == User.id)
            .where(PagoReembolso.recepcion_conforme == False)  # noqa: E712
        )
        pendientes = (await db.execute(stmt)).all()

        # Mapa por (numero_cheque_normalizado, monto_reembolso)
        mapa_pendientes = {}
        for pago, sol, socio in pendientes:
            num_norm = _normalizar_numero_cheque(pago.numero_cheque_o_transferencia)
            if num_norm:
                mapa_pendientes[(num_norm, int(sol.monto_reembolso))] = (pago, sol, socio)

        conciliados: List[ChequeConciliadoOut] = []
        sin_coincidencia = 0
        monto_total = 0
        ahora = datetime.now(timezone.utc)

        for mov in payload.movimientos:
            num_doc = _normalizar_numero_cheque(mov.numero_documento or "")
            if not num_doc:
                num_doc = _extraer_cheque_de_texto(mov.descripcion)
            clave = (num_doc, int(mov.monto_cargo))
            match = mapa_pendientes.pop(clave, None) if num_doc else None
            if match:
                pago, sol, socio = match
                pago.recepcion_conforme = True
                pago.recepcion_conforme_at = ahora
                monto_total += int(sol.monto_reembolso)
                conciliados.append(
                    ChequeConciliadoOut(
                        solicitud_id=sol.id,
                        codigo_reembolso=sol.codigo,
                        socio_nombre=socio.nombre_completo,
                        numero_cheque=pago.numero_cheque_o_transferencia,
                        monto_reembolso=int(sol.monto_reembolso),
                        fecha_cobro_banco=mov.fecha or date.today().isoformat(),
                    )
                )
            else:
                sin_coincidencia += 1

        db.add(
            AuditLog(
                usuario_id=usuario.id,
                usuario_nombre=usuario.nombre_completo,
                usuario_rut=usuario.rut,
                usuario_rol=usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol),
                modulo="FINANZAS",
                accion="CONCILIAR_CARTOLA_BANCOESTADO",
                recurso_tipo="CartolaBancoEstado",
                recurso_id=payload.archivo_nombre[:60],
                detalles=(
                    f"Cartola {payload.archivo_nombre}: {len(conciliados)} cheque(s) conciliados "
                    f"automáticamente por ${monto_total:,.0f} CLP ({sin_coincidencia} movimientos sin cruce)."
                ),
                ip_origen=ip_origen,
            )
        )
        await db.commit()

        return CartolaConciliacionResultOut(
            archivo_nombre=payload.archivo_nombre,
            total_movimientos_leidos=len(payload.movimientos),
            total_cheques_conciliados=len(conciliados),
            monto_total_conciliado=monto_total,
            cheques_conciliados=conciliados,
            sin_coincidencia=sin_coincidencia,
        )
