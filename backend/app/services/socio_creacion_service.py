"""Servicio de dominio (SRP + DIP) para la creación directa de cuentas de socio desde Afiliación.

[ESTUDIANTE INFORMÁTICA] Encapsula la lógica de alta individual de un socio específico
(validación de unicidad RUN/correo, clave temporal segura, estado de carencia, auditoría
inmutable y notificación opcional por correo), dependiendo de protocolos abstractos (`DIP`).
"""
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.interfaces import AuditLoggerProtocol, PasswordHasherProtocol
from app.core.security import BcryptPasswordHasher
from app.models import User, UserRole
from app.schemas.afiliacion import (
    CrearSocioDirectoIn,
    CrearSocioDirectoOut,
    formatear_run,
)
from app.services.afiliacion_service import (
    generar_clave_temporal_rut,
    sincronizar_smtp_desde_db,
)
from app.services.audit_service import SqlAlchemyAuditLogger
from app.services.email_service import generar_correo_resolucion_solicitud
from app.services.reembolso_service import TOPE_ANUAL_SALUD


def _rut_plano(value: str) -> str:
    return (value or "").replace(".", "").replace("-", "").upper().strip()


def _texto_antiguedad(meses: int) -> str:
    if meses <= 0:
        return "0 Meses"
    if meses < 12:
        return f"{meses} {'Mes' if meses == 1 else 'Meses'}"
    anios, resto = divmod(meses, 12)
    anios_txt = f"{anios} {'Año' if anios == 1 else 'Años'}"
    if resto == 0:
        return anios_txt
    return f"{anios_txt}, {resto} {'Mes' if resto == 1 else 'Meses'}"


class SocioCreacionService:
    """Responsabilidad única: dar de alta cuentas individuales de socio con trazabilidad."""

    def __init__(
        self,
        audit_logger: Optional[AuditLoggerProtocol] = None,
        hasher: Optional[PasswordHasherProtocol] = None,
    ) -> None:
        self.audit_logger: AuditLoggerProtocol = audit_logger or SqlAlchemyAuditLogger()
        self.hasher: PasswordHasherProtocol = hasher or BcryptPasswordHasher()

    async def crear_socio_directo(
        self,
        db: AsyncSession,
        payload: CrearSocioDirectoIn,
        operador: User,
    ) -> CrearSocioDirectoOut:
        rut_formateado = formatear_run(payload.rut)
        rut_norm = _rut_plano(payload.rut)
        email_norm = payload.email.strip().lower()

        existente_email = await db.scalar(
            select(User.id).where(func.lower(User.email) == email_norm)
        )
        if existente_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una cuenta registrada con el correo {email_norm}.",
            )

        existente_rut = await db.scalar(
            select(User.id).where(
                func.upper(func.replace(func.replace(User.rut, ".", ""), "-", "")) == rut_norm
            )
        )
        if existente_rut:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una cuenta registrada con el RUN {rut_formateado}.",
            )

        clave_temporal = generar_clave_temporal_rut(rut_formateado)
        meses = int(payload.mesesAntiguedad or 0)

        nuevo_socio = User(
            rut=rut_formateado,
            email=email_norm,
            nombre_completo=payload.nombreCompleto.strip(),
            hashed_password=self.hasher.hash(clave_temporal),
            rol=UserRole.SOCIO,
            is_superuser=False,
            is_active=True,
            departamento=payload.departamento.strip(),
            antiguedad=_texto_antiguedad(meses),
            meses_antiguedad=meses,
            estado_previsional="Al día",
            saldo_salud_disponible=TOPE_ANUAL_SALUD,
            saldo_salud_total_anual=TOPE_ANUAL_SALUD,
            cargas_registradas=0,
            intentos_fallidos=0,
            password_bloqueada=False,
            debe_cambiar_password=True,
        )
        db.add(nuevo_socio)
        await db.flush()

        await self.audit_logger.registrar(
            db=db,
            usuario=operador,
            modulo="AFILIACION",
            accion="CREAR_SOCIO_DIRECTO",
            recurso_tipo="User",
            recurso_id=str(nuevo_socio.id),
            detalles=(
                f"Cuenta de socio creada directamente para {nuevo_socio.nombre_completo} "
                f"(RUN {rut_formateado}, {email_norm}, {payload.calidadContractual} Grado {payload.grado}, "
                f"antigüedad inicial: {meses} mes(es))."
            ),
        )
        await db.commit()
        await db.refresh(nuevo_socio)

        correo_enviado = False
        if payload.enviarCorreo:
            try:
                await sincronizar_smtp_desde_db(db)
                res_mail = generar_correo_resolucion_solicitud(
                    folio=f"ALT-{datetime.now(timezone.utc).year}-{nuevo_socio.id:04d}",
                    nombre_completo=nuevo_socio.nombre_completo,
                    run_formateado=rut_formateado,
                    email_destino=email_norm,
                    aprobada=True,
                    motivo="Cuenta de socio habilitada directamente por Administración / Directiva del Comité de Bienestar.",
                    fecha_sesion=date.today().isoformat(),
                    numero_acta="Alta Directa de Socio",
                    clave_temporal=clave_temporal,
                    enviar_smtp=True,
                )
                correo_enviado = bool(res_mail.get("enviadoSmtp"))
            except Exception:
                correo_enviado = False

        return CrearSocioDirectoOut(
            id=nuevo_socio.id,
            rut=rut_formateado,
            nombreCompleto=nuevo_socio.nombre_completo,
            email=nuevo_socio.email,
            departamento=nuevo_socio.departamento,
            calidadContractual=payload.calidadContractual,
            grado=payload.grado,
            mesesAntiguedad=meses,
            claveTemporal=clave_temporal,
            correoEnviado=correo_enviado,
            mensaje=(
                f"Cuenta de socio creada para {nuevo_socio.nombre_completo} ({rut_formateado}). "
                f"Deberá cambiar su contraseña temporal al primer ingreso."
            ),
        )
