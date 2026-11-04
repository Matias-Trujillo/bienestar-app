"""Endpoints de autenticación (login JWT, perfil, cambio de clave y listado de usuarios)."""
import json
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models import (
    AuditLog,
    DetalleNominaMasiva,
    NominaMasiva,
    ParametroSistema,
    SolicitudBeneficio,
    SolicitudReembolso,
    User,
)
from app.models.user import ROLE_LABELS, UserRole
from app.services.email_service import (
    actualizar_config_smtp_runtime,
    generar_correo_recuperacion_password,
)
from app.services.reembolso_service import TOPE_ANUAL_SALUD, obtener_resumen_socio

router = APIRouter()

MAX_INTENTOS_LOGIN = 5


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
    clave = _clave_seguridad_usr(user_id)
    param = await db.scalar(select(ParametroSistema).where(ParametroSistema.clave == clave))
    return _parse_sec_json(param.valor if param else None)


async def guardar_seguridad_usuario(
    db: AsyncSession,
    user_id: int,
    intentos: int = 0,
    bloqueada: bool = False,
    debe_cambiar: bool = False,
    ultimo_cambio: Optional[str] = None,
) -> Dict[str, Any]:
    clave = _clave_seguridad_usr(user_id)
    param = await db.scalar(select(ParametroSistema).where(ParametroSistema.clave == clave))
    actual = _parse_sec_json(param.valor if param else None)

    nuevo_estado = {
        "i": int(intentos),
        "b": bool(bloqueada),
        "c": bool(debe_cambiar),
        "u": ultimo_cambio if ultimo_cambio is not None else actual.get("u"),
    }
    raw_val = json.dumps(nuevo_estado, separators=(",", ":"))

    if not param:
        param = ParametroSistema(
            clave=clave,
            valor=raw_val,
            descripcion=f"Estado de seguridad de contraseña usuario #{user_id}",
        )
        db.add(param)
    else:
        param.valor = raw_val
        db.add(param)

    return nuevo_estado


class LoginRequest(BaseModel):
    username: str  # RUT o correo
    password: str


class CambiarPasswordPropiaIn(BaseModel):
    password_actual: Optional[str] = None
    nueva_password: str


class UserOut(BaseModel):
    id: str
    rut: str
    nombreCompleto: str
    email: str
    rol: str
    rolLabel: str
    isSuperuser: bool
    isActive: bool = True
    departamento: str
    antiguedad: str
    estadoPrevisional: str
    saldoSaludDisponible: int
    saldoSaludTotalAnual: int
    cargasRegistradas: int
    mesesAntiguedad: int = 0
    intentosFallidos: int = 0
    passwordBloqueada: bool = False
    debeCambiarPassword: bool = False
    estadoPassword: str = "vigente"
    ultimoCambioPassword: Optional[str] = None
    puedeEliminar: bool = False
    motivoNoEliminable: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


async def evaluar_historial_usuario(db: AsyncSession, u: User) -> tuple[bool, Optional[str]]:
    """
    Verifica si un usuario puede ser eliminado físicamente.
    Solo puede eliminarse si NO cuenta con historial de descuentos por planilla (meses_antiguedad == 0)
    ni gestiones en reembolsos médicos, beneficios sociales o nóminas masivas.
    """
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
        return (
            False,
            "Cuenta con historial (" + ", ".join(razones) + "). Solo puede desactivarse (Inactivo).",
        )

    return True, None


def to_out(
    u: User,
    sec: Optional[Dict[str, Any]] = None,
    puede_eliminar: bool = False,
    motivo_no_eliminable: Optional[str] = None,
) -> UserOut:
    sec_data = sec or {"i": 0, "b": False, "c": False, "u": None}
    bloqueada = bool(sec_data.get("b", False))
    debe_cambiar = bool(sec_data.get("c", False))
    estado_pwd = "bloqueada" if bloqueada else ("cambio_pendiente" if debe_cambiar else "vigente")
    meses_ant = int(u.meses_antiguedad) if u.meses_antiguedad is not None else 0

    return UserOut(
        id=str(u.id),
        rut=u.rut,
        nombreCompleto=u.nombre_completo,
        email=u.email,
        rol=u.rol.value,
        rolLabel=ROLE_LABELS[u.rol],
        isSuperuser=bool(u.is_superuser),
        isActive=bool(u.is_active),
        departamento=u.departamento,
        antiguedad=u.antiguedad,
        estadoPrevisional=u.estado_previsional,
        saldoSaludDisponible=min(int(u.saldo_salud_disponible), TOPE_ANUAL_SALUD),
        saldoSaludTotalAnual=TOPE_ANUAL_SALUD,
        cargasRegistradas=u.cargas_registradas,
        mesesAntiguedad=meses_ant,
        intentosFallidos=int(sec_data.get("i", 0) or 0),
        passwordBloqueada=bloqueada,
        debeCambiarPassword=debe_cambiar,
        estadoPassword=estado_pwd,
        ultimoCambioPassword=sec_data.get("u"),
        puedeEliminar=puede_eliminar,
        motivoNoEliminable=motivo_no_eliminable,
    )


def _normalize_rut(value: str) -> str:
    return value.replace(".", "").replace("-", "").upper().strip()


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    ident = body.username.strip()
    rut_norm = _normalize_rut(ident)
    user = await db.scalar(
        select(User).where(
            or_(
                func.lower(User.email) == ident.lower(),
                func.upper(func.replace(func.replace(User.rut, ".", ""), "-", "")) == rut_norm,
            )
        )
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
        )

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

    if not verify_password(body.password, user.hashed_password):
        intentos = int(sec["i"]) + 1
        if intentos >= MAX_INTENTOS_LOGIN:
            await guardar_seguridad_usuario(
                db, user.id, intentos=intentos, bloqueada=True, debe_cambiar=sec["c"]
            )
            db.add(
                AuditLog(
                    usuario_id=user.id,
                    usuario_nombre=user.nombre_completo,
                    usuario_rut=user.rut,
                    usuario_rol=user.rol.value,
                    modulo="SEGURIDAD",
                    accion="BLOQUEO_AUTOMATICO_CLAVE",
                    recurso_tipo="User",
                    recurso_id=str(user.id),
                    detalles=f"Contraseña bloqueada automáticamente tras alcanzar {intentos} intentos fallidos consecutivos.",
                    ip_origen="127.0.0.1",
                )
            )
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Su contraseña ha sido BLOQUEADA por seguridad tras 5 intentos fallidos. Solicite al Super Administrador desbloquear o restablecer su clave.",
            )

        restantes = MAX_INTENTOS_LOGIN - intentos
        await guardar_seguridad_usuario(
            db, user.id, intentos=intentos, bloqueada=False, debe_cambiar=sec["c"]
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Contraseña incorrecta. Le quedan {restantes} intento(s) antes del bloqueo preventivo de su clave.",
        )

    # Login exitoso: reiniciar contador de intentos fallidos si tenía alguno
    if sec["i"] > 0:
        sec = await guardar_seguridad_usuario(
            db, user.id, intentos=0, bloqueada=False, debe_cambiar=sec["c"]
        )
        await db.commit()

    # Sincronizar el saldo disponible según el año calendario vigente (renovación automática 1 de enero)
    await obtener_resumen_socio(user, db)
    await db.refresh(user)

    token = create_access_token(user.id, extra_claims={"rol": user.rol.value})
    return TokenResponse(access_token=token, user=to_out(user, sec))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await obtener_resumen_socio(user, db)
    await db.refresh(user)
    sec = await obtener_seguridad_usuario(db, user.id)
    return to_out(user, sec)


@router.post("/cambiar-password", response_model=UserOut, summary="Cambiar contraseña personal del usuario autenticado")
async def cambiar_password_propia(
    body: CambiarPasswordPropiaIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    nueva = (body.nueva_password or "").strip()
    if len(nueva) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe tener al menos 8 caracteres.",
        )

    sec = await obtener_seguridad_usuario(db, user.id)

    if not sec["c"] and body.password_actual:
        if not verify_password(body.password_actual, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La contraseña actual ingresada no es correcta.",
            )

    if verify_password(nueva, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe ser distinta a la clave temporal o anterior.",
        )

    user.hashed_password = get_password_hash(nueva)
    ahora_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
    nuevo_sec = await guardar_seguridad_usuario(
        db,
        user.id,
        intentos=0,
        bloqueada=False,
        debe_cambiar=False,
        ultimo_cambio=ahora_str,
    )

    db.add(
        AuditLog(
            usuario_id=user.id,
            usuario_nombre=user.nombre_completo,
            usuario_rut=user.rut,
            usuario_rol=user.rol.value,
            modulo="SEGURIDAD",
            accion="CAMBIO_PASSWORD_USUARIO",
            recurso_tipo="User",
            recurso_id=str(user.id),
            detalles=f"El funcionario {user.nombre_completo} actualizó su contraseña personal exitosamente.",
            ip_origen="127.0.0.1",
        )
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return to_out(user, nuevo_sec)


@router.get("/usuarios", response_model=List[UserOut])
async def listar_usuarios(
    _: User = Depends(require_roles(UserRole.ADMIN)), db: AsyncSession = Depends(get_db)
):
    """Listado completo de usuarios con su estado de cuenta, rol, estado de contraseña y si puede eliminarse."""
    result = await db.scalars(select(User).order_by(User.id))
    users = list(result)

    params_sec = await db.scalars(
        select(ParametroSistema).where(ParametroSistema.clave.like("SEC_USR_%"))
    )
    mapa_sec: Dict[int, Dict[str, Any]] = {}
    for p in params_sec:
        try:
            uid = int(p.clave.replace("SEC_USR_", ""))
            mapa_sec[uid] = _parse_sec_json(p.valor)
        except ValueError:
            pass

    salida: List[UserOut] = []
    for u in users:
        puede_elim, motivo_no_elim = await evaluar_historial_usuario(db, u)
        salida.append(
            to_out(
                u,
                mapa_sec.get(u.id),
                puede_eliminar=puede_elim,
                motivo_no_eliminable=motivo_no_elim,
            )
        )
    return salida


class RecuperarPasswordIn(BaseModel):
    identificador: str  # RUT o correo electrónico


def _enmascarar_correo(email: str) -> str:
    partes = (email or "").strip().split("@")
    if len(partes) != 2:
        return email
    local, dominio = partes
    if len(local) <= 2:
        local_mask = local[0] + "***"
    else:
        local_mask = local[:2] + "***" + local[-1]
    return f"{local_mask}@{dominio}"


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
    "/recuperar-password",
    summary="Recuperar contraseña enviando una Clave Temporal al correo registrado (público)",
)
async def recuperar_password_por_correo(
    body: RecuperarPasswordIn,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    ident = (body.identificador or "").strip()
    if not ident:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Debe ingresar su RUT o Correo Electrónico.",
        )

    await _sincronizar_smtp_desde_db(db)

    rut_norm = _normalize_rut(ident)
    user = await db.scalar(
        select(User).where(
            or_(
                func.lower(User.email) == ident.lower(),
                func.upper(func.replace(func.replace(User.rut, ".", ""), "-", "")) == rut_norm,
            )
        )
    )
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

    # Generar Contraseña Temporal única de 1 solo uso y exigir cambio obligatorio en el próximo inicio de sesión
    codigo_random = secrets.randbelow(9000) + 1000
    clave_temporal = f"Peralillo#{codigo_random}"

    user.hashed_password = get_password_hash(clave_temporal)
    await guardar_seguridad_usuario(
        db,
        user.id,
        intentos=0,
        bloqueada=False,
        debe_cambiar=True,
    )

    rol_label = ROLE_LABELS.get(user.rol, "Socio Activo")
    resultado_email = generar_correo_recuperacion_password(
        nombre_completo=user.nombre_completo,
        run_formateado=user.rut,
        email_destino=user.email,
        clave_temporal=clave_temporal,
        rol_label=rol_label,
        enviar_smtp=True,
    )

    db.add(
        AuditLog(
            usuario_id=user.id,
            usuario_nombre=user.nombre_completo,
            usuario_rut=user.rut,
            usuario_rol=user.rol.value,
            modulo="SEGURIDAD",
            accion="RECUPERAR_PASSWORD_CORREO",
            recurso_tipo="User",
            recurso_id=str(user.id),
            detalles=(
                f"Solicitud de recuperación de contraseña para {user.nombre_completo} ({user.rut}). "
                f"Se envió Clave Temporal de un solo uso al correo {user.email} ({resultado_email['folio']})."
            ),
            ip_origen="127.0.0.1",
        )
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
