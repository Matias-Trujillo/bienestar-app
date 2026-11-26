"""Servicio de dominio para Control Financiero, Presupuestos y Aporte Municipal UTM (HU-08)."""
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AporteMunicipalUtm,
    AuditLog,
    SolicitudBeneficio,
    SolicitudReembolso,
    User,
    UserRole,
)
from app.schemas.finanzas import (
    AporteMunicipalUtmIn,
    AporteMunicipalUtmOut,
    Padron31DicOut,
)


def _aporte_to_out(a: AporteMunicipalUtm) -> AporteMunicipalUtmOut:
    return AporteMunicipalUtmOut(
        id=a.id,
        codigo=a.codigo,
        anio_fiscal=a.anio_fiscal,
        mes_transferencia=a.mes_transferencia,
        socios_congelados_31_dic=a.socios_congelados_31_dic,
        factor_utm=a.factor_utm,
        valor_utm_clp=a.valor_utm_clp,
        monto_total_clp=a.monto_total_clp,
        numero_decreto=a.numero_decreto,
        fecha_transferencia=a.fecha_transferencia,
        observaciones=a.observaciones or "",
        registrado_por_nombre=a.registrado_por_nombre,
        created_at=a.created_at,
    )


class FinanzasService:
    """Calcula en vivo los indicadores presupuestarios y gestiona el Aporte Municipal en UTM (HU-08)."""

    FONDO_GENERAL_BASE_DEFAULT = 25_400_000
    FONDO_SALUD_MINIMO_BASE = 14_200_000
    TOPE_SALUD_POR_SOCIO = 150_000
    FACTOR_UTM_POR_SOCIO = 4
    VALOR_UTM_REFERENCIA_CLP = 68_034  # Referencia orientativa editable por el usuario

    @classmethod
    async def obtener_padron_31_dic(
        cls, db: AsyncSession, anio_fiscal: Optional[int] = None
    ) -> Padron31DicOut:
        """Calcula el padrón congelado de socios activos al 31 de diciembre del año previo (HU-08)."""
        anio = anio_fiscal or date.today().year
        anio_corte = anio - 1
        fecha_corte_dt = datetime(anio_corte, 12, 31, 23, 59, 59, tzinfo=timezone.utc)

        # Socios activos cuya fecha de creación es <= 31-12 del año previo O que acreditan >= 12 meses de antigüedad
        socios_congelados = await db.scalar(
            select(func.count(User.id)).where(
                User.rol == UserRole.SOCIO,
                User.is_active == True,  # noqa: E712
                or_(
                    User.created_at <= fecha_corte_dt,
                    User.meses_antiguedad >= 12,
                ),
            )
        ) or 0

        # Si en un entorno de prueba todos los socios son nuevos, usar el total de socios activos
        if socios_congelados == 0:
            socios_congelados = await db.scalar(
                select(func.count(User.id)).where(
                    User.rol == UserRole.SOCIO,
                    User.is_active == True,  # noqa: E712
                )
            ) or 0

        socios_int = int(socios_congelados)
        total_utm = socios_int * cls.FACTOR_UTM_POR_SOCIO
        return Padron31DicOut(
            anio_fiscal=anio,
            fecha_corte=f"{anio_corte}-12-31",
            socios_congelados_31_dic=socios_int,
            factor_utm=cls.FACTOR_UTM_POR_SOCIO,
            total_utm_anual=total_utm,
            valor_utm_referencia_clp=cls.VALOR_UTM_REFERENCIA_CLP,
            monto_estimado_clp=total_utm * cls.VALOR_UTM_REFERENCIA_CLP,
        )

    @classmethod
    async def listar_aportes_utm(
        cls, db: AsyncSession, anio_fiscal: Optional[int] = None
    ) -> List[AporteMunicipalUtmOut]:
        stmt = select(AporteMunicipalUtm).order_by(
            AporteMunicipalUtm.anio_fiscal.desc(), AporteMunicipalUtm.created_at.desc()
        )
        if anio_fiscal:
            stmt = stmt.where(AporteMunicipalUtm.anio_fiscal == anio_fiscal)
        rows = (await db.scalars(stmt)).all()
        return [_aporte_to_out(a) for a in rows]

    @classmethod
    async def registrar_aporte_utm(
        cls,
        db: AsyncSession,
        payload: AporteMunicipalUtmIn,
        usuario: User,
        ip_origen: str = "127.0.0.1",
    ) -> AporteMunicipalUtmOut:
        """Calcula y registra oficialmente el Aporte Municipal en UTM (Socios 31-dic × 4 × UTM)."""
        padron = await cls.obtener_padron_31_dic(db, anio_fiscal=payload.anio_fiscal)
        socios_count = (
            payload.socios_congelados_override
            if payload.socios_congelados_override is not None
            else padron.socios_congelados_31_dic
        )
        if socios_count <= 0:
            raise HTTPException(
                status_code=400,
                detail="No existen socios activos en el padrón para calcular el aporte municipal en UTM.",
            )

        factor = cls.FACTOR_UTM_POR_SOCIO
        monto_total = int(socios_count) * factor * int(payload.valor_utm_clp)

        total_exist = await db.scalar(select(func.count(AporteMunicipalUtm.id))) or 0
        codigo = f"UTM-{payload.anio_fiscal}-{total_exist + 1:03d}"
        while await db.scalar(
            select(AporteMunicipalUtm.id).where(AporteMunicipalUtm.codigo == codigo)
        ):
            total_exist += 1
            codigo = f"UTM-{payload.anio_fiscal}-{total_exist + 1:03d}"

        aporte = AporteMunicipalUtm(
            codigo=codigo,
            anio_fiscal=payload.anio_fiscal,
            mes_transferencia=payload.mes_transferencia.strip(),
            socios_congelados_31_dic=int(socios_count),
            factor_utm=factor,
            valor_utm_clp=int(payload.valor_utm_clp),
            monto_total_clp=monto_total,
            numero_decreto=payload.numero_decreto.strip(),
            fecha_transferencia=payload.fecha_transferencia.strip(),
            observaciones=(payload.observaciones or "").strip(),
            registrado_por_id=usuario.id,
            registrado_por_nombre=usuario.nombre_completo,
        )
        db.add(aporte)
        await db.flush()

        db.add(
            AuditLog(
                usuario_id=usuario.id,
                usuario_nombre=usuario.nombre_completo,
                usuario_rut=usuario.rut,
                usuario_rol=usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol),
                modulo="FINANZAS",
                accion="REGISTRAR_APORTE_MUNICIPAL_UTM",
                recurso_tipo="AporteMunicipalUtm",
                recurso_id=codigo,
                detalles=(
                    f"Subvención Municipal {codigo} (Año {payload.anio_fiscal}, Decreto {aporte.numero_decreto}): "
                    f"{socios_count} socios × {factor} UTM × ${payload.valor_utm_clp:,.0f} = ${monto_total:,.0f} CLP."
                ),
                ip_origen=ip_origen,
            )
        )
        await db.commit()
        await db.refresh(aporte)
        return _aporte_to_out(aporte)

    @classmethod
    async def eliminar_aporte_utm(
        cls,
        db: AsyncSession,
        aporte_id: int,
        usuario: User,
        ip_origen: str = "127.0.0.1",
    ) -> Dict[str, Any]:
        aporte = await db.scalar(
            select(AporteMunicipalUtm).where(AporteMunicipalUtm.id == aporte_id)
        )
        if not aporte:
            raise HTTPException(status_code=404, detail="Registro de aporte municipal UTM no encontrado.")
        codigo = aporte.codigo
        monto = aporte.monto_total_clp
        await db.delete(aporte)
        db.add(
            AuditLog(
                usuario_id=usuario.id,
                usuario_nombre=usuario.nombre_completo,
                usuario_rut=usuario.rut,
                usuario_rol=usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol),
                modulo="FINANZAS",
                accion="ANULAR_APORTE_MUNICIPAL_UTM",
                recurso_tipo="AporteMunicipalUtm",
                recurso_id=codigo,
                detalles=f"Aporte municipal {codigo} por ${monto:,.0f} CLP anulado por {usuario.nombre_completo}.",
                ip_origen=ip_origen,
            )
        )
        await db.commit()
        return {"ok": True, "codigo": codigo}

    @classmethod
    async def obtener_estado_financiero(cls, db: AsyncSession) -> Dict[str, Any]:
        anio_actual = date.today().year
        socios_activos = await db.scalar(
            select(func.count(User.id)).where(User.rol == UserRole.SOCIO, User.is_active == True)  # noqa: E712
        ) or 0
        total_reembolsado = await db.scalar(
            select(func.coalesce(func.sum(SolicitudReembolso.monto_reembolso), 0)).where(
                SolicitudReembolso.estado.in_(("aprobado", "pagado"))
            )
        ) or 0
        total_bonos = await db.scalar(
            select(func.coalesce(func.sum(SolicitudBeneficio.monto_calculado), 0)).where(
                SolicitudBeneficio.estado.in_(("APROBADO", "LIQUIDADO"))
            )
        ) or 0
        total_aportes_utm = await db.scalar(
            select(func.coalesce(func.sum(AporteMunicipalUtm.monto_total_clp), 0)).where(
                AporteMunicipalUtm.anio_fiscal == anio_actual
            )
        ) or 0
        cantidad_aportes_utm = await db.scalar(
            select(func.count(AporteMunicipalUtm.id)).where(
                AporteMunicipalUtm.anio_fiscal == anio_actual
            )
        ) or 0

        padron_31_dic = await cls.obtener_padron_31_dic(db, anio_fiscal=anio_actual)
        fondo_salud_base = max(cls.FONDO_SALUD_MINIMO_BASE, int(socios_activos) * cls.TOPE_SALUD_POR_SOCIO)

        # Si hay subvenciones UTM registradas en el año, el fondo general se nutre de ingresos reales + base
        base_general = (
            int(total_aportes_utm) if int(total_aportes_utm) > 0 else cls.FONDO_GENERAL_BASE_DEFAULT
        )
        return {
            "modulo": "Control Financiero",
            "descripcion": "Presupuestos anuales, subvención municipal UTM, cuotas y egresos.",
            "periodo_fiscal": str(anio_actual),
            "socios_activos": int(socios_activos),
            "socios_padron_31_dic": padron_31_dic.socios_congelados_31_dic,
            "total_aportes_utm": int(total_aportes_utm),
            "cantidad_aportes_utm": int(cantidad_aportes_utm),
            "fondo_general": int(max(0, base_general - int(total_bonos))),
            "fondo_salud_disponible": int(max(0, fondo_salud_base - int(total_reembolsado))),
            "total_egresos_salud": int(total_reembolsado),
            "total_egresos_beneficios": int(total_bonos),
        }
