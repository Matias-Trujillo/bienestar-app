"""Servicio de dominio para Autenticación, Historial de Cuenta y Seguridad (SRP + DIP).

[ESTUDIANTE INFORMÁTICA] Encapsula la lógica de seguridad, bloqueo preventivo tras intentos fallidos,
evaluación de historial contable y recuperación de clave, dependiendo de protocolos abstractos (`DIP`).
"""
import json
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.interfaces import (
    AuditLoggerProtocol,
    PasswordHasherProtocol,
    SmtpTransportProtocol,
)
from app.core.security import BcryptPasswordHasher, create_access_token
from app.models import (
    DetalleNominaMasiva,
    NominaMasiva,
    ParametroSistema,
    SolicitudBeneficio,
    SolicitudReembolso,
    User,
)
from app.models.user import ROLE_LABELS, UserRole
from app.schemas.auth import TokenResponse, UserOut
from app.services.audit_service import SqlAlchemyAuditLogger
from app.services.email_service import generar_correo_recuperacion_password
from app.services.email_transport import default_smtp_transport
from app.services.reembolso_service import TOPE_ANUAL_SALUD, obtener_resumen_socio

MAX_INTENTOS_LOGIN = 5


def _val(x: Any) -> str:
    if x is None:
        return ""
    return str(x.value) if hasattr(x, "value") else str(x)


def _normalize_rut(value: str) -> str:
    return value.replace(".", "").replace("-", "").upper().strip()


def _enmascarar_correo(email: str) -> str:
    partes = (email or "").strip().split("@")
    if len(partes) != 2:
        return email
    local, dominio = partes
    local_mask = f"{local[0]}***" if len(local) <= 2 else f"{local[:2]}***{local[-1]}"
    return f"{local_mask}@{dominio}"


def _clave_seguridad_usr(user_id: int) -> str:
    return f"SEC_USR_{user_id}"


def _parse_sec_json(raw: Optional[str]) -> Dict[str, Any]:
    if not raw:
        return {"i": 0, "b": False, "c": False, "u": None}
    try:
        data = json.loads(raw)
        return {
            "i": int(data.get("i", 0) or 0),
            "b": bool(data.get("b", False)),
            "c": bool(data.get("c", False)),
            "u": data.get("u"),
        }
    except Exception:
        return {"i": 0, "b": False, "c": False, "u": None}


async def obtener_seguridad_usuario(db: AsyncSession, user_id: int) -> Dict[str, Any]:
    u = await db.get(User, user_id)
    if u is not None:
        ult_str = (
            u.ultimo_cambio_password.strftime("%Y-%m-%d %H:%M")
            if getattr(u, "ultimo_cambio_password", None)
            else None
        )
        return {
            "i": int(getattr(u, "intentos_fallidos", 0) or 0),
            "b": bool(getattr(u, "password_bloqueada", False)),
            "c": bool(getattr(u, "debe_cambiar_password", False)),
            "u": ult_str,
        }
    return {"i": 0, "b": False, "c": False, "u": None}


async def guardar_seguridad_usuario(
    db: AsyncSession,
    user_id: int,
    intentos: int = 0,
    bloqueada: bool = False,
    debe_cambiar: bool = False,
    ultimo_cambio: Optional[str] = None,
) -> Dict[str, Any]:
    u = await db.get(User, user_id)
    ult_str = ultimo_cambio
    if u is not None:
        u.intentos_fallidos = int(intentos)
        u.password_bloqueada = bool(bloqueada)
        u.debe_cambiar_password = bool(debe_cambiar)
        if ultimo_cambio is not None:
            try:
                u.ultimo_cambio_password = datetime.now(timezone.utc)
            except Exception:
                pass
        elif u.ultimo_cambio_password and not ult_str:
            ult_str = u.ultimo_cambio_password.strftime("%Y-%m-%d %H:%M")
        db.add(u)

    clave = _clave_seguridad_usr(user_id)
    param = await db.scalar(select(ParametroSistema).where(ParametroSistema.clave == clave))
    if param:
        await db.delete(param)

    return {
        "i": int(intentos),
        "b": bool(bloqueada),
        "c": bool(debe_cambiar),
        "u": ult_str,
    }


async def evaluar_historial_usuario(db: AsyncSession, u: User) -> tuple[bool, Optional[str]]:
    """Verifica si un usuario puede eliminarse físicamente (0 meses de antigüedad y sin historial)."""
    if u.is_superuser or u.rol == UserRole.SUPERUSUARIO:
        return False, "No se puede eliminar la cuenta principal de Superusuario."

    razones: List[str] = []
    meses = int(u.meses_antiguedad or 0)
    if (u.antiguedad or "").strip().startswith("0 ") and meses == 12:
        u.meses_antiguedad = 0
        meses = 0
    if meses > 0:
        razones.append(f"{meses} mes(es) de descuentos por planilla registrados")

    n_reembolsos = await db.scalar(
        select(func.count(SolicitudReembolso.id)).where(SolicitudReembolso.socio_id == u.id)
    ) or 0
    if n_reembolsos > 0:
        razones.append(f"{n_reembolsos} solicitud(es) de reembolso médico")

    n_beneficios = await db.scalar(
        select(func.count(SolicitudBeneficio.id)).where(
            or_(
                SolicitudBeneficio.socio_id == u.id,
                SolicitudBeneficio.revisado_por_id == u.id,
                SolicitudBeneficio.liquidado_por_id == u.id,
            )
        )
    ) or 0
    if n_beneficios > 0:
        razones.append(f"{n_beneficios} gestión(es) de beneficios/bonos")

    n_nominas = await db.scalar(
        select(func.count(DetalleNominaMasiva.id)).where(DetalleNominaMasiva.socio_id == u.id)
    ) or 0
    n_nominas_creadas = await db.scalar(
        select(func.count(NominaMasiva.id)).where(NominaMasiva.creado_por_id == u.id)
    ) or 0
    if (n_nominas + n_nominas_creadas) > 0:
        razones.append(f"{n_nominas + n_nominas_creadas} registro(s) en nóminas de pago")

    if razones:
        return False, "Cuenta con historial (" + ", ".join(razones) + "). Solo puede desactivarse (Inactivo)."
    return True, None


def to_out(
    u: User,
    sec: Optional[Dict[str, Any]] = None,
    puede_eliminar: bool = False,
    motivo_no_eliminable: Optional[str] = None,
) -> UserOut:
    sec_data = sec or {
        "i": getattr(u, "intentos_fallidos", 0) or 0,
        "b": getattr(u, "password_bloqueada", False) or False,
        "c": getattr(u, "debe_cambiar_password", False) or False,
        "u": (
            u.ultimo_cambio_password.strftime("%Y-%m-%d %H:%M")
            if getattr(u, "ultimo_cambio_password", None)
            else None
        ),
    }
    bloqueada = bool(sec_data.get("b", False) or getattr(u, "password_bloqueada", False))
    debe_cambiar = bool(sec_data.get("c", False) or getattr(u, "debe_cambiar_password", False))
    intentos_val = int(sec_data.get("i", 0) or getattr(u, "intentos_fallidos", 0) or 0)
    ult_cambio_val = sec_data.get("u") or (
        u.ultimo_cambio_password.strftime("%Y-%m-%d %H:%M")
        if getattr(u, "ultimo_cambio_password", None)
        else None
    )
    estado_pwd = "bloqueada" if bloqueada else ("cambio_pendiente" if debe_cambiar else "vigente")
    meses_ant = int(u.meses_antiguedad) if u.meses_antiguedad is not None else 0

    rol_str = _val(u.rol)
    try:
        rol_label = ROLE_LABELS.get(UserRole(rol_str), rol_str.capitalize())
    except Exception:
        rol_label = rol_str.capitalize()

    return UserOut(
        id=str(u.id),
        rut=u.rut,
        nombreCompleto=u.nombre_completo,
        email=u.email,
        rol=rol_str,
        rolLabel=rol_label,
        isSuperuser=bool(u.is_superuser),
        isActive=bool(u.is_active),
        departamento=u.departamento or "",
        antiguedad=u.antiguedad or "",
        estadoPrevisional=u.estado_previsional or "Al día",
        saldoSaludDisponible=min(int(u.saldo_salud_disponible or 0), TOPE_ANUAL_SALUD),
        saldoSaludTotalAnual=TOPE_ANUAL_SALUD,
        cargasRegistradas=int(u.cargas_registradas or 0),
        mesesAntiguedad=meses_ant,
        intentosFallidos=intentos_val,
        passwordBloqueada=bloqueada,
        debeCambiarPassword=debe_cambiar,
        estadoPassword=estado_pwd,
        ultimoCambioPassword=ult_cambio_val,
        puedeEliminar=puede_eliminar,
        motivoNoEliminable=motivo_no_eliminable,
        tieneDobleVista=bool(u.is_superuser or rol_str != UserRole.SOCIO.value),
    )


class AuthService:
    """Servicio de autenticación con dependencias inyectables por Protocolo (DIP)."""

    def __init__(
        self,
        hasher: Optional[PasswordHasherProtocol] = None,
        audit_logger: Optional[AuditLoggerProtocol] = None,
        smtp_transport: Optional[SmtpTransportProtocol] = None,
    ) -> None:
        self.hasher: PasswordHasherProtocol = hasher or BcryptPasswordHasher()
        self.audit_logger: AuditLoggerProtocol = audit_logger or SqlAlchemyAuditLogger()
        self.smtp_transport: SmtpTransportProtocol = smtp_transport or default_smtp_transport

    async def buscar_usuario_por_identificador(self, db: AsyncSession, identificador: str) -> Optional[User]:
        ident = identificador.strip()
        rut_norm = _normalize_rut(ident)
        return await db.scalar(
            select(User).where(
                or_(
                    func.lower(User.email) == ident.lower(),
                    func.upper(func.replace(func.replace(User.rut, ".", ""), "-", "")) == rut_norm,
                )
            )
        )

    async def login(self, db: AsyncSession, username: str, password: str) -> TokenResponse:
        user = await self.buscar_usuario_por_identificador(db, username)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas.")
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Su cuenta de socio se encuentra INACTIVA. Contacte a la administración del Comité de Bienestar.",
            )

        sec = await obtener_seguridad_usuario(db, user.id)
        if sec["b"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Su contraseña se encuentra BLOQUEADA por seguridad. Solicite al Super Administrador desbloquear o restablecer su clave.",
            )

        if not self.hasher.verify(password, user.hashed_password):
            intentos = int(sec["i"]) + 1
            if intentos >= MAX_INTENTOS_LOGIN:
                await guardar_seguridad_usuario(db, user.id, intentos=intentos, bloqueada=True, debe_cambiar=sec["c"])
                await self.audit_logger.registrar(
                    db=db,
                    usuario=user,
                    modulo="SEGURIDAD",
                    accion="BLOQUEO_AUTOMATICO_CLAVE",
                    recurso_tipo="User",
                    recurso_id=str(user.id),
                    detalles=f"Contraseña bloqueada automáticamente tras alcanzar {intentos} intentos fallidos consecutivos.",
                )
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Su contraseña ha sido BLOQUEADA por seguridad tras 5 intentos fallidos. Solicite al Super Administrador desbloquear o restablecer su clave.",
                )

            restantes = MAX_INTENTOS_LOGIN - intentos
            await guardar_seguridad_usuario(db, user.id, intentos=intentos, bloqueada=False, debe_cambiar=sec["c"])
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Contraseña incorrecta. Le quedan {restantes} intento(s) antes del bloqueo preventivo de su clave.",
            )

        if sec["i"] > 0:
            sec = await guardar_seguridad_usuario(db, user.id, intentos=0, bloqueada=False, debe_cambiar=sec["c"])
            await db.commit()

        try:
            await obtener_resumen_socio(user, db)
            await db.refresh(user)
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass
            try:
                user = (await db.get(User, user.id)) or user
            except Exception:
                pass

        token = create_access_token(user.id, extra_claims={"rol": _val(user.rol)})
        return TokenResponse(access_token=token, user=to_out(user, sec))

    async def cambiar_password(
        self, db: AsyncSession, user: User, nueva_password: str, password_actual: Optional[str] = None
    ) -> UserOut:
        nueva = (nueva_password or "").strip()
        if len(nueva) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La nueva contraseña debe tener al menos 8 caracteres.",
            )

        sec = await obtener_seguridad_usuario(db, user.id)
        if not sec["c"]:
            if not password_actual:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Debe ingresar su contraseña actual para autorizar el cambio de clave.",
                )
            if not self.hasher.verify(password_actual, user.hashed_password):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La contraseña actual ingresada no es correcta.",
                )

        if self.hasher.verify(nueva, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La nueva contraseña debe ser distinta a la clave temporal o anterior.",
            )

        rut_limpio = user.rut.replace(".", "").replace("-", "").strip()
        if rut_limpio and len(rut_limpio) >= 6 and (rut_limpio in nueva or rut_limpio[:-1] in nueva):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Por seguridad, la nueva contraseña no puede contener su RUN.",
            )

        user.hashed_password = self.hasher.hash(nueva)
        ahora_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
        nuevo_sec = await guardar_seguridad_usuario(
            db, user.id, intentos=0, bloqueada=False, debe_cambiar=False, ultimo_cambio=ahora_str
        )
        await self.audit_logger.registrar(
            db=db,
            usuario=user,
            modulo="SEGURIDAD",
            accion="CAMBIO_PASSWORD_USUARIO",
            recurso_tipo="User",
            recurso_id=str(user.id),
            detalles=f"El funcionario {user.nombre_completo} actualizó su contraseña personal exitosamente.",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return to_out(user, nuevo_sec)

    async def listar_usuarios(self, db: AsyncSession) -> List[UserOut]:
        result = await db.scalars(select(User).order_by(User.id))
        salida: List[UserOut] = []
        for u in list(result):
            puede_elim, motivo_no_elim = await evaluar_historial_usuario(db, u)
            salida.append(to_out(u, None, puede_eliminar=puede_elim, motivo_no_eliminable=motivo_no_elim))
        return salida

    async def recuperar_password(self, db: AsyncSession, identificador: str) -> Dict[str, Any]:
        ident = (identificador or "").strip()
        if not ident:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Debe ingresar su RUT o Correo Electrónico.",
            )

        params = await db.scalars(select(ParametroSistema).where(ParametroSistema.clave.like("SMTP_%")))
        mapa = {p.clave: p.valor for p in params}
        if mapa:
            self.smtp_transport.actualizar_configuracion(
                host=mapa.get("SMTP_HOST"),
                port=int(mapa["SMTP_PORT"]) if mapa.get("SMTP_PORT", "").isdigit() else None,
                user=mapa.get("SMTP_USER"),
                password=mapa.get("SMTP_PASSWORD"),
            )

        user = await self.buscar_usuario_por_identificador(db, ident)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una cuenta registrada con el RUT o correo electrónico ingresado.",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La cuenta asociada se encuentra inactiva. Contacte a la Directiva del Comité de Bienestar.",
            )

        codigo_random = secrets.randbelow(9000) + 1000
        clave_temporal = f"Peralillo#{codigo_random}"
        user.hashed_password = self.hasher.hash(clave_temporal)
        await guardar_seguridad_usuario(db, user.id, intentos=0, bloqueada=False, debe_cambiar=True)

        rol_label = ROLE_LABELS.get(user.rol, "Socio Activo")
        resultado_email = generar_correo_recuperacion_password(
            nombre_completo=user.nombre_completo,
            run_formateado=user.rut,
            email_destino=user.email,
            clave_temporal=clave_temporal,
            rol_label=rol_label,
            enviar_smtp=True,
            transport=self.smtp_transport,
        )
        await self.audit_logger.registrar(
            db=db,
            usuario=user,
            modulo="SEGURIDAD",
            accion="RECUPERAR_PASSWORD_CORREO",
            recurso_tipo="User",
            recurso_id=str(user.id),
            detalles=(
                f"Solicitud de recuperación de contraseña para {user.nombre_completo} ({user.rut}). "
                f"Se envió Clave Temporal de un solo uso al correo {user.email} ({resultado_email['folio']})."
            ),
        )
        db.add(user)
        await db.commit()

        return {
            "ok": True,
            "folio": resultado_email["folio"],
            "nombreCompleto": user.nombre_completo,
            "rut": user.rut,
            "emailEnmascarado": _enmascarar_correo(user.email),
            "emailDestino": user.email,
            "enviadoSmtp": resultado_email["enviadoSmtp"],
            "mensaje": (
                f"Hemos enviado una Contraseña Temporal de un solo uso e instrucciones de acceso "
                f"a su correo electrónico registrado ({_enmascarar_correo(user.email)})."
            ),
        }
