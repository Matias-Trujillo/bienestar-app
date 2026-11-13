"""Endpoints para el módulo de Administración, Auditoría Inmutable y Gestión de Usuarios."""
from datetime import datetime, timezone
import re
from typing import Any, Dict, List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select, desc, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.security import get_password_hash
from app.db.session import get_db
from app.models import (
    AuditLog,
    User,
    UserRole,
    SolicitudAfiliacion,
    SolicitudReembolso,
    SolicitudBeneficio,
    ParametroSistema,
    EstadoSolicitud,
)
from app.api.v1.endpoints.auth import (
    evaluar_historial_usuario,
    guardar_seguridad_usuario,
    obtener_seguridad_usuario,
)
from app.models.beneficios import BonoCatalogo
from app.services.email_service import (
    actualizar_config_smtp_runtime,
    enviar_correo_prueba_smtp,
)

router = APIRouter()

ROLES_ADMIN = (UserRole.SUPERUSUARIO, UserRole.ADMIN)


# ---------------------------------------------------------------------------
# Esquemas Pydantic
# ---------------------------------------------------------------------------
class AuditLogOut(BaseModel):
    id: int
    created_at: Union[datetime, str]
    usuario_nombre: str
    usuario_rut: Optional[str] = None
    usuario_rol: str
    modulo: str
    accion: str
    recurso_tipo: str
    recurso_id: Optional[str] = None
    detalles: Optional[str] = None
    ip_origen: Optional[str] = None

    class Config:
        from_attributes = True


class CrearUsuarioIn(BaseModel):
    rut: str
    email: str
    nombre_completo: str
    password: str
    rol: UserRole
    departamento: str = "Departamento Municipal"
    antiguedad: str = "12 Meses"
    meses_antiguedad: int = 12
    estado_previsional: str = "Al día"
    saldo_salud_disponible: float = 150000.0
    saldo_salud_total_anual: float = 150000.0
    cargas_registradas: int = 0


class EditarUsuarioIn(BaseModel):
    rol: Optional[UserRole] = None
    is_active: Optional[bool] = None
    departamento: Optional[str] = None
    nueva_password: Optional[str] = None
    password_bloqueada: Optional[bool] = None
    debe_cambiar_password: Optional[bool] = None
    saldo_salud_disponible: Optional[float] = None
    meses_antiguedad: Optional[int] = None
    estado_previsional: Optional[str] = None


class ParametroUpdateIn(BaseModel):
    clave: str
    valor: str
    descripcion: Optional[str] = None


class SmtpConfigIn(BaseModel):
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    destinatario_prueba: Optional[str] = None


# Helper para registrar auditoría inmutable
async def registrar_auditoria(
    db: AsyncSession,
    usuario: User,
    modulo: str,
    accion: str,
    recurso_tipo: str,
    recurso_id: Optional[str],
    detalles: str,
    ip_origen: str = "127.0.0.1",
):
    log = AuditLog(
        usuario_id=usuario.id,
        usuario_nombre=usuario.nombre_completo,
        usuario_rut=usuario.rut,
        usuario_rol=usuario.rol.value,
        modulo=modulo,
        accion=accion,
        recurso_tipo=recurso_tipo,
        recurso_id=recurso_id,
        detalles=detalles,
        ip_origen=ip_origen,
    )
    db.add(log)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/stats", summary="Métricas y estadísticas globales del sistema")
async def get_admin_stats(
    _: User = Depends(require_roles(*ROLES_ADMIN)), db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Retorna contadores agregados de todos los módulos del Comité."""
    total_usuarios = await db.scalar(select(func.count(User.id))) or 0
    total_socios = await db.scalar(select(func.count(User.id)).where(User.rol == UserRole.SOCIO)) or 0
    socios_habilitados = await db.scalar(
        select(func.count(User.id)).where(User.rol == UserRole.SOCIO, User.meses_antiguedad >= 6)
    ) or 0
    socios_carencia = total_socios - socios_habilitados

    afiliaciones_pendientes = await db.scalar(
        select(func.count(SolicitudAfiliacion.id)).where(SolicitudAfiliacion.estado == EstadoSolicitud.PENDIENTE)
    ) or 0

    reembolsos_pendientes = await db.scalar(
        select(func.count(SolicitudReembolso.id)).where(SolicitudReembolso.estado == "en_revision")
    ) or 0

    beneficios_pendientes = await db.scalar(
        select(func.count(SolicitudBeneficio.id)).where(SolicitudBeneficio.estado == "PENDIENTE")
    ) or 0

    total_logs = await db.scalar(select(func.count(AuditLog.id))) or 0

    return {
        "usuarios": {
            "total": total_usuarios,
            "socios_total": total_socios,
            "socios_habilitados": socios_habilitados,
            "socios_carencia": socios_carencia,
        },
        "pendientes": {
            "afiliaciones": afiliaciones_pendientes,
            "reembolsos": reembolsos_pendientes,
            "beneficios": beneficios_pendientes,
            "total": afiliaciones_pendientes + reembolsos_pendientes + beneficios_pendientes,
        },
        "auditoria": {
            "total_eventos": total_logs,
        },
    }


@router.get("/audit-logs", response_model=List[AuditLogOut], summary="Listar bitácora de auditoría inmutable")
async def get_audit_logs(
    modulo: Optional[str] = None,
    limit: int = 100,
    _: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AuditLog).order_by(desc(AuditLog.id)).limit(limit)
    if modulo:
        stmt = stmt.where(AuditLog.modulo == modulo.upper())
    result = await db.scalars(stmt)
    return list(result.all())


@router.post("/usuarios", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED, summary="Crear nuevo usuario con rol específico")
async def crear_usuario(
    body: CrearUsuarioIn,
    current_user: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    existente = await db.scalar(select(User).where((User.email == body.email) | (User.rut == body.rut)))
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con este RUT o correo electrónico.",
        )

    nuevo = User(
        rut=body.rut.strip(),
        email=body.email.strip().lower(),
        nombre_completo=body.nombre_completo.strip(),
        hashed_password=get_password_hash(body.password),
        rol=body.rol,
        is_superuser=(body.rol == UserRole.SUPERUSUARIO),
        is_active=True,
        departamento=body.departamento,
        antiguedad=body.antiguedad,
        meses_antiguedad=body.meses_antiguedad,
        estado_previsional=body.estado_previsional,
        saldo_salud_disponible=int(body.saldo_salud_disponible),
        saldo_salud_total_anual=int(body.saldo_salud_total_anual),
        cargas_registradas=body.cargas_registradas,
    )
    db.add(nuevo)
    await db.flush()

    await guardar_seguridad_usuario(db, nuevo.id, intentos=0, bloqueada=False, debe_cambiar=True)

    await registrar_auditoria(
        db=db,
        usuario=current_user,
        modulo="USUARIOS",
        accion="CREAR_USUARIO",
        recurso_tipo="User",
        recurso_id=str(nuevo.id),
        detalles=f"Creado usuario {nuevo.nombre_completo} (RUT: {nuevo.rut}) con rol {nuevo.rol.value}.",
    )
    await db.commit()

    return {"mensaje": f"Usuario {nuevo.nombre_completo} creado correctamente.", "id": nuevo.id}


@router.patch("/usuarios/{usuario_id}", response_model=Dict[str, Any], summary="Modificar rol, estado de socio o estado de contraseña de un usuario")
async def editar_usuario(
    usuario_id: int,
    body: EditarUsuarioIn,
    current_user: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Modifica el estado de cuenta, rol o seguridad de contraseña de un socio y genera trazabilidad en auditoría."""
    u = await db.scalar(select(User).where(User.id == usuario_id))
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    sec = await obtener_seguridad_usuario(db, u.id)
    intentos = int(sec["i"])
    bloqueada = bool(sec["b"])
    debe_cambiar = bool(sec["c"])
    ultimo_cambio = sec["u"]
    sec_modificado = False

    cambios = []
    if body.rol is not None and body.rol != u.rol:
        cambios.append(f"Rol cambiado de {u.rol.value} a {body.rol.value}")
        u.rol = body.rol
        u.is_superuser = (body.rol == UserRole.SUPERUSUARIO)

    if body.is_active is not None and body.is_active != u.is_active:
        estado_txt = "ACTIVO" if body.is_active else "INACTIVO"
        cambios.append(f"Estado del socio cambiado a {estado_txt}")
        u.is_active = body.is_active

    if body.departamento is not None and body.departamento != u.departamento:
        cambios.append(f"Departamento: {body.departamento}")
        u.departamento = body.departamento

    if body.meses_antiguedad is not None:
        cambios.append(f"Antigüedad meses: {body.meses_antiguedad}")
        u.meses_antiguedad = body.meses_antiguedad
        u.antiguedad = f"{body.meses_antiguedad} Meses"

    if body.saldo_salud_disponible is not None and int(body.saldo_salud_disponible) != int(u.saldo_salud_disponible):
        cambios.append(f"Saldo salud: ${body.saldo_salud_disponible:,.0f}")
        u.saldo_salud_disponible = int(body.saldo_salud_disponible)

    if body.password_bloqueada is not None and body.password_bloqueada != bloqueada:
        bloqueada = body.password_bloqueada
        sec_modificado = True
        if not bloqueada:
            intentos = 0
            cambios.append("Contraseña DESBLOQUEADA y contador de intentos reiniciado")
        else:
            cambios.append("Contraseña BLOQUEADA preventivamente por administración")

    if body.debe_cambiar_password is not None and body.debe_cambiar_password != debe_cambiar:
        debe_cambiar = body.debe_cambiar_password
        sec_modificado = True
        cambios.append(
            "Exigir cambio de clave al próximo ingreso: SÍ"
            if debe_cambiar
            else "Exigir cambio de clave al próximo ingreso: NO"
        )

    if body.nueva_password and body.nueva_password.strip():
        u.hashed_password = get_password_hash(body.nueva_password.strip())
        bloqueada = False
        intentos = 0
        debe_cambiar = True if body.debe_cambiar_password is None else body.debe_cambiar_password
        ultimo_cambio = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
        sec_modificado = True
        cambios.append("Contraseña restablecida (desbloqueada y marcada como temporal para cambio del usuario)")

    if sec_modificado:
        await guardar_seguridad_usuario(
            db,
            u.id,
            intentos=intentos,
            bloqueada=bloqueada,
            debe_cambiar=debe_cambiar,
            ultimo_cambio=ultimo_cambio,
        )

    if cambios:
        await registrar_auditoria(
            db=db,
            usuario=current_user,
            modulo="SEGURIDAD",
            accion="GESTION_SEGURIDAD_USUARIO",
            recurso_tipo="User",
            recurso_id=str(u.id),
            detalles=f"Usuario {u.nombre_completo} ({u.rut}): " + "; ".join(cambios),
        )
        db.add(u)
        await db.commit()

    return {"mensaje": f"Usuario {u.nombre_completo} actualizado.", "cambios": cambios}


@router.delete("/usuarios/{usuario_id}", response_model=Dict[str, Any], summary="Eliminar usuario únicamente si no cuenta con historial ni descuentos")
async def eliminar_usuario(
    usuario_id: int,
    current_user: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """
    Elimina físicamente una cuenta de usuario SOLO mientras no registre historial
    (0 meses de descuentos por planilla, 0 reembolsos médicos, 0 beneficios sociales y 0 nóminas).
    Si ya tiene historial contable o de gestión, bloquea la eliminación y exige usar Activo/Inactivo.
    """
    u = await db.scalar(select(User).where(User.id == usuario_id))
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if u.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Por seguridad no puede eliminar su propia cuenta con sesión activa.",
        )

    puede_eliminar, motivo = await evaluar_historial_usuario(db, u)
    if not puede_eliminar:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar al usuario {u.nombre_completo} ({u.rut}): {motivo}",
        )

    nombre_eliminado = u.nombre_completo
    rut_eliminado = u.rut
    rol_eliminado = u.rol.value

    # Limpiar estado de seguridad en ParametroSistema si existe
    param_sec = await db.scalar(
        select(ParametroSistema).where(ParametroSistema.clave == f"SEC_USR_{u.id}")
    )
    if param_sec:
        await db.delete(param_sec)

    # Si proviene de una solicitud de incorporación reciente sin historial, limpiarla para liberar el RUN
    rut_sin_puntos = u.rut.replace(".", "").strip().upper()
    solicitudes_afiliacion = await db.scalars(
        select(SolicitudAfiliacion).where(SolicitudAfiliacion.run == rut_sin_puntos)
    )
    for sol in solicitudes_afiliacion:
        await db.delete(sol)

    await db.delete(u)

    await registrar_auditoria(
        db=db,
        usuario=current_user,
        modulo="USUARIOS",
        accion="ELIMINAR_USUARIO_SIN_HISTORIAL",
        recurso_tipo="User",
        recurso_id=str(usuario_id),
        detalles=(
            f"Eliminado usuario {nombre_eliminado} (RUT: {rut_eliminado}, Rol: {rol_eliminado}) "
            "tras verificar que no registraba descuentos por planilla ni gestiones en el sistema."
        ),
    )
    await db.commit()

    return {
        "mensaje": (
            f"Usuario {nombre_eliminado} ({rut_eliminado}) eliminado permanentemente del sistema "
            "(verificado sin descuentos ni historial de gestiones)."
        )
    }


@router.get("/parametros", summary="Listar parámetros de configuración global")
async def listar_parametros(
    _: User = Depends(require_roles(*ROLES_ADMIN)), db: AsyncSession = Depends(get_db)
):
    # Asegurar que existan los parámetros SMTP para configuración rápida desde la interfaz
    defaults_smtp = [
        ("SMTP_HOST", "smtp.gmail.com", "Servidor de correo saliente (ej: smtp.gmail.com o smtp.office365.com)"),
        ("SMTP_PORT", "587", "Puerto SMTP (587 para STARTTLS, 465 para SSL)"),
        ("SMTP_USER", "bperalillo@gmail.com", "Correo electrónico remitente para envío real de correos (ej: tucorreo@gmail.com)"),
        ("SMTP_PASSWORD", "xgsnewzymyqjumgc", "Contraseña de Aplicación de 16 letras (Google App Password) o clave SMTP"),
    ]
    hubo_nuevos = False
    for clave_def, val_def, desc_def in defaults_smtp:
        existe = await db.scalar(select(ParametroSistema).where(ParametroSistema.clave == clave_def))
        if not existe:
            db.add(ParametroSistema(clave=clave_def, valor=val_def, descripcion=desc_def))
            hubo_nuevos = True
    if hubo_nuevos:
        await db.commit()

    params = (
        await db.scalars(
            select(ParametroSistema)
            .where(~ParametroSistema.clave.like("SEC_USR_%"))
            .order_by(ParametroSistema.clave)
        )
    ).all()

    mapa = {p.clave: p.valor for p in params}
    actualizar_config_smtp_runtime(
        host=mapa.get("SMTP_HOST"),
        port=int(mapa["SMTP_PORT"]) if mapa.get("SMTP_PORT", "").isdigit() else None,
        user=mapa.get("SMTP_USER"),
        password=mapa.get("SMTP_PASSWORD"),
    )

    return [{"clave": p.clave, "valor": p.valor, "descripcion": p.descripcion} for p in params]


@router.put("/parametros", summary="Actualizar parámetro global")
async def actualizar_parametro(
    body: ParametroUpdateIn,
    current_user: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    p = await db.scalar(select(ParametroSistema).where(ParametroSistema.clave == body.clave))
    if not p:
        p = ParametroSistema(clave=body.clave, valor=body.valor, descripcion=body.descripcion)
        db.add(p)
    else:
        valor_anterior = p.valor
        p.valor = body.valor
        if body.descripcion:
            p.descripcion = body.descripcion

        await registrar_auditoria(
            db=db,
            usuario=current_user,
            modulo="CONFIGURACION",
            accion="ACTUALIZAR_PARAMETRO",
            recurso_tipo="ParametroSistema",
            recurso_id=body.clave,
            detalles=(
                f"Parámetro {body.clave} actualizado."
                if body.clave == "SMTP_PASSWORD"
                else f"Parámetro {body.clave} modificado de '{valor_anterior}' a '{body.valor}'."
            ),
        )
    await db.commit()

    if body.clave.startswith("SMTP_"):
        params_smtp = await db.scalars(
            select(ParametroSistema).where(ParametroSistema.clave.like("SMTP_%"))
        )
        mapa = {x.clave: x.valor for x in params_smtp}
        actualizar_config_smtp_runtime(
            host=mapa.get("SMTP_HOST"),
            port=int(mapa["SMTP_PORT"]) if mapa.get("SMTP_PORT", "").isdigit() else None,
            user=mapa.get("SMTP_USER"),
            password=mapa.get("SMTP_PASSWORD"),
        )

    return {"mensaje": f"Parámetro {body.clave} actualizado correctamente.", "valor": body.valor}


@router.post("/smtp-config", summary="Guardar configuración SMTP completa y enviar correo de prueba real")
async def configurar_y_probar_smtp(
    body: SmtpConfigIn,
    current_user: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    user_clean = body.smtp_user.strip()
    pwd_clean = body.smtp_password.strip().replace(" ", "")
    host_clean = body.smtp_host.strip() or "smtp.gmail.com"
    if any(user_clean.lower().endswith(d) for d in ("@hotmail.com", "@outlook.com", "@live.com", "@msn.com")) and host_clean == "smtp.gmail.com":
        host_clean = "smtp-mail.outlook.com"

    pares = [
        ("SMTP_HOST", host_clean),
        ("SMTP_PORT", str(body.smtp_port or 587)),
        ("SMTP_USER", user_clean),
        ("SMTP_PASSWORD", pwd_clean),
    ]
    for clave, valor in pares:
        p = await db.scalar(select(ParametroSistema).where(ParametroSistema.clave == clave))
        if not p:
            db.add(ParametroSistema(clave=clave, valor=valor, descripcion=f"Configuración SMTP ({clave})"))
        else:
            p.valor = valor

    await registrar_auditoria(
        db=db,
        usuario=current_user,
        modulo="CONFIGURACION",
        accion="CONFIGURAR_SMTP_CORREO",
        recurso_tipo="ParametroSistema",
        recurso_id="SMTP",
        detalles=f"Configurado servidor de correo saliente {host_clean}:{body.smtp_port} con cuenta {user_clean}.",
    )
    await db.commit()

    actualizar_config_smtp_runtime(
        host=host_clean,
        port=body.smtp_port or 587,
        user=user_clean,
        password=pwd_clean,
    )

    dest_prueba = (body.destinatario_prueba or user_clean).strip()
    enviado, detalle = enviar_correo_prueba_smtp(dest_prueba)
    return {
        "enviado": enviado,
        "mensaje": detalle,
        "smtp_host": host_clean,
        "smtp_user": user_clean,
    }


# ---------------------------------------------------------------------------
# Gestión Dinámica de Bonos del Catálogo (Superusuario)
# ---------------------------------------------------------------------------
class CrearBonoIn(BaseModel):
    codigo: str
    nombre: str
    porcentaje: float
    categoria: str = "Beneficio Económico"
    requisitos: str = ""
    documentacion_requerida: str = ""
    regla_asignacion: str = ""
    periodo_devengo: Optional[str] = None
    permite_postulacion_socio: bool = True
    es_calendario: bool = False
    activo: bool = True
    icono: str = "gift"


class EditarBonoIn(BaseModel):
    nombre: Optional[str] = None
    porcentaje: Optional[float] = None
    categoria: Optional[str] = None
    requisitos: Optional[str] = None
    documentacion_requerida: Optional[str] = None
    regla_asignacion: Optional[str] = None
    periodo_devengo: Optional[str] = None
    permite_postulacion_socio: Optional[bool] = None
    es_calendario: Optional[bool] = None
    activo: Optional[bool] = None
    icono: Optional[str] = None


@router.get("/bonos", summary="Listar todos los bonos configurados (activos e inactivos)")
async def listar_bonos_admin(
    _: User = Depends(require_roles(*ROLES_ADMIN)), db: AsyncSession = Depends(get_db)
):
    bonos = await db.scalars(select(BonoCatalogo).order_by(BonoCatalogo.id))
    return [
        {
            "id": b.id,
            "codigo": b.codigo,
            "nombre": b.nombre,
            "porcentaje": b.porcentaje,
            "categoria": b.categoria,
            "requisitos": b.requisitos,
            "documentacion_requerida": b.documentacion_requerida,
            "regla_asignacion": b.regla_asignacion,
            "periodo_devengo": b.periodo_devengo,
            "permite_postulacion_socio": b.permite_postulacion_socio,
            "es_calendario": b.es_calendario,
            "activo": b.activo,
            "icono": b.icono,
        }
        for b in bonos
    ]


@router.post("/bonos", status_code=status.HTTP_201_CREATED, summary="Crear un nuevo beneficio/bono en el catálogo")
async def crear_bono_admin(
    body: CrearBonoIn,
    current_user: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    codigo_clean = body.codigo.strip().lower().replace(" ", "_")
    existente = await db.scalar(select(BonoCatalogo).where(BonoCatalogo.codigo == codigo_clean))
    if existente:
        raise HTTPException(status_code=400, detail=f"Ya existe un bono con el código '{codigo_clean}'.")

    nuevo_bono = BonoCatalogo(
        codigo=codigo_clean,
        nombre=body.nombre.strip(),
        porcentaje=body.porcentaje,
        categoria=body.categoria.strip(),
        requisitos=body.requisitos.strip(),
        documentacion_requerida=body.documentacion_requerida.strip(),
        regla_asignacion=body.regla_asignacion.strip(),
        periodo_devengo=body.periodo_devengo,
        permite_postulacion_socio=body.permite_postulacion_socio,
        es_calendario=body.es_calendario,
        activo=body.activo,
        icono=body.icono,
    )
    db.add(nuevo_bono)
    await db.flush()

    await registrar_auditoria(
        db=db,
        usuario=current_user,
        modulo="CONFIGURACION",
        accion="CREAR_BONO_CATALOGO",
        recurso_tipo="BonoCatalogo",
        recurso_id=codigo_clean,
        detalles=f"Creado nuevo beneficio '{nuevo_bono.nombre}' ({nuevo_bono.porcentaje}% base G15, activo={nuevo_bono.activo}).",
    )
    await db.commit()

    return {"mensaje": f"Bono '{nuevo_bono.nombre}' creado con éxito.", "id": nuevo_bono.id}


@router.patch("/bonos/{bono_id}", summary="Modificar o Activar/Desactivar un bono")
async def editar_bono_admin(
    bono_id: int,
    body: EditarBonoIn,
    current_user: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    bono = await db.scalar(select(BonoCatalogo).where(BonoCatalogo.id == bono_id))
    if not bono:
        raise HTTPException(status_code=404, detail="Bono no encontrado.")

    cambios = []
    if body.nombre is not None and body.nombre != bono.nombre:
        cambios.append(f"Nombre: {body.nombre}")
        bono.nombre = body.nombre
    if body.porcentaje is not None and body.porcentaje != bono.porcentaje:
        cambios.append(f"Porcentaje: {bono.porcentaje}% -> {body.porcentaje}%")
        bono.porcentaje = body.porcentaje
    if body.categoria is not None:
        bono.categoria = body.categoria
    if body.requisitos is not None:
        bono.requisitos = body.requisitos
    if body.documentacion_requerida is not None:
        bono.documentacion_requerida = body.documentacion_requerida
    if body.regla_asignacion is not None:
        bono.regla_asignacion = body.regla_asignacion
    if body.periodo_devengo is not None:
        bono.periodo_devengo = body.periodo_devengo
    if body.permite_postulacion_socio is not None:
        bono.permite_postulacion_socio = body.permite_postulacion_socio
    if body.es_calendario is not None:
        bono.es_calendario = body.es_calendario
    if body.activo is not None and body.activo != bono.activo:
        estado_str = "Activado" if body.activo else "Desactivado (Oculto del catálogo)"
        cambios.append(f"Estado: {estado_str}")
        bono.activo = body.activo
    if body.icono is not None:
        bono.icono = body.icono

    if cambios:
        await registrar_auditoria(
            db=db,
            usuario=current_user,
            modulo="CONFIGURACION",
            accion="EDITAR_BONO_CATALOGO",
            recurso_tipo="BonoCatalogo",
            recurso_id=bono.codigo,
            detalles=f"Modificado bono '{bono.nombre}': " + "; ".join(cambios),
        )
        await db.commit()

    return {"mensaje": f"Bono '{bono.nombre}' actualizado correctamente.", "cambios": cambios}


@router.delete("/bonos/{bono_id}", summary="Eliminar un beneficio del catálogo")
async def eliminar_bono_admin(
    bono_id: int,
    current_user: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    bono = await db.scalar(select(BonoCatalogo).where(BonoCatalogo.id == bono_id))
    if not bono:
        raise HTTPException(status_code=404, detail="Bono no encontrado.")

    solicitudes_asociadas = await db.scalar(
        select(func.count(SolicitudBeneficio.id)).where(SolicitudBeneficio.tipo_bono == bono.codigo)
    ) or 0

    if solicitudes_asociadas > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"No se puede eliminar el beneficio '{bono.nombre}' porque cuenta con "
                f"{solicitudes_asociadas} solicitud(es) registradas en el historial de los socios. "
                "Para ocultarlo del portal de socios sin romper la integridad contable, utilice la opción 'Desactivar'."
            ),
        )

    codigo_bono = bono.codigo
    nombre_bono = bono.nombre

    await db.delete(bono)

    await registrar_auditoria(
        db=db,
        usuario=current_user,
        modulo="CONFIGURACION",
        accion="ELIMINAR_BONO_CATALOGO",
        recurso_tipo="BonoCatalogo",
        recurso_id=codigo_bono,
        detalles=f"Eliminado del catálogo el beneficio '{nombre_bono}' (código: {codigo_bono}).",
    )
    await db.commit()

    return {"mensaje": f"Beneficio '{nombre_bono}' eliminado exitosamente del catálogo."}


# ---------------------------------------------------------------------------
# Endpoint Especial: Reset Integral de Ambiente de Pruebas
# ---------------------------------------------------------------------------
@router.post(
    "/reset-ambiente-pruebas",
    summary="Restablecimiento integral del ambiente de pruebas (Solo Superusuario)",
)
async def reset_ambiente_pruebas(
    current_user: User = Depends(require_roles(UserRole.SUPERUSUARIO)),
    db: AsyncSession = Depends(get_db),
):
    """Vacía todas las solicitudes y nóminas de prueba, elimina cuentas de prueba no canónicas,
    libera la cuenta y RUN de Matías Trujillo para prueba de registro, reinicia el Super Administrador
    y restablece las cuentas canónicas con saldos de $150.000 y estado de carencia preciso (>= 6 meses y < 6 meses)."""
    
    # 1. Vaciar solicitudes y registros transaccionales
    tablas_a_vaciar = [
        "detalles_nomina_masiva",
        "nominas_masivas",
        "solicitudes_beneficio",
        "solicitudes_reembolso",
        "solicitudes_cargas_familiares",
        "cargas_familiares",
        "solicitudes_afiliacion",
    ]
    for tbl in tablas_a_vaciar:
        await db.execute(text(f"DELETE FROM {tbl};"))

    # 2. Limpiar bloqueos de seguridad temporales
    await db.execute(text("DELETE FROM parametros_sistema WHERE clave LIKE 'SEC_USR_%';"))

    # 3. Eliminar cuenta y registros de Matías Trujillo y Ani Castro
    await db.execute(
        text(
            "DELETE FROM usuarios WHERE email IN ('mntrujillof@gmail.com', 'mntrujillog@gmail.com', 'ani.c.castro.v@gmail.com') "
            "OR REPLACE(REPLACE(UPPER(rut), '.', ''), '-', '') = '205452109';"
        )
    )

    # 4. Eliminar usuarios dinámicos (id >= 12) que no sean Javiera Rivera
    await db.execute(
        text(
            "DELETE FROM usuarios WHERE id >= 12 AND email NOT IN ('riverajavieraa@gmail.com') "
            "AND REPLACE(REPLACE(UPPER(rut), '.', ''), '-', '') <> '191884361';"
        )
    )

    # 5. Restablecer cuentas semilla canónicas
    cuentas_a_sincronizar = [
        # Superadministrador
        {
            "rut": "11.111.111-1",
            "email": "superadmin@mperalillo.cl",
            "nombre_completo": "Super Administrador",
            "password": "Super#2026",
            "rol": UserRole.SUPERUSUARIO,
            "is_superuser": True,
            "is_active": True,
            "departamento": "Soporte TI",
            "antiguedad": "10 Años",
            "meses_antiguedad": 120,
            "saldo_salud_disponible": 150000,
            "saldo_salud_total_anual": 150000,
            "cargas_registradas": 0,
        },
        # Directiva
        {
            "rut": "12.345.678-9",
            "email": "msoto@mperalillo.cl",
            "nombre_completo": "María Elena Soto",
            "password": "Presi#2026",
            "rol": UserRole.PRESIDENTE,
            "is_superuser": False,
            "is_active": True,
            "departamento": "Directiva de Bienestar",
            "antiguedad": "9 Años",
            "meses_antiguedad": 108,
            "saldo_salud_disponible": 150000,
            "saldo_salud_total_anual": 150000,
            "cargas_registradas": 0,
        },
        {
            "rut": "13.456.789-0",
            "email": "pfuentes@mperalillo.cl",
            "nombre_completo": "Patricia Fuentes R.",
            "password": "Secre#2026",
            "rol": UserRole.SECRETARIO,
            "is_superuser": False,
            "is_active": True,
            "departamento": "Directiva de Bienestar",
            "antiguedad": "7 Años",
            "meses_antiguedad": 84,
            "saldo_salud_disponible": 150000,
            "saldo_salud_total_anual": 150000,
            "cargas_registradas": 0,
        },
        {
            "rut": "14.982.112-4",
            "email": "rmorales@mperalillo.cl",
            "nombre_completo": "Roberto Morales P.",
            "password": "Teso#2026",
            "rol": UserRole.TESORERO,
            "is_superuser": False,
            "is_active": True,
            "departamento": "Finanzas Municipales",
            "antiguedad": "6 Años",
            "meses_antiguedad": 72,
            "saldo_salud_disponible": 150000,
            "saldo_salud_total_anual": 150000,
            "cargas_registradas": 0,
        },
        {
            "rut": "16.234.567-8",
            "email": "jcontreras@mperalillo.cl",
            "nombre_completo": "Jorge Contreras L.",
            "password": "Admin#2026",
            "rol": UserRole.ADMIN,
            "is_superuser": False,
            "is_active": True,
            "departamento": "Administración Municipal",
            "antiguedad": "4 Años",
            "meses_antiguedad": 48,
            "saldo_salud_disponible": 150000,
            "saldo_salud_total_anual": 150000,
            "cargas_registradas": 0,
        },
        {
            "rut": "17.345.678-K",
            "email": "aibarra@mperalillo.cl",
            "nombre_completo": "Andrea Ibarra V.",
            "password": "Audit#2026",
            "rol": UserRole.AUDITOR,
            "is_superuser": False,
            "is_active": True,
            "departamento": "Comisión Revisora de Cuentas",
            "antiguedad": "3 Años",
            "meses_antiguedad": 36,
            "saldo_salud_disponible": 150000,
            "saldo_salud_total_anual": 150000,
            "cargas_registradas": 0,
        },
        # Socios Habilitados (>= 6 meses)
        {
            "rut": "15.489.123-K",
            "email": "cvalenzuela@mperalillo.cl",
            "nombre_completo": "Carlos Valenzuela M.",
            "password": "Socio#2026",
            "rol": UserRole.SOCIO,
            "is_superuser": False,
            "is_active": True,
            "departamento": "DIDECO",
            "antiguedad": "5 Años, 4 Meses",
            "meses_antiguedad": 64,
            "saldo_salud_disponible": 150000,
            "saldo_salud_total_anual": 150000,
            "cargas_registradas": 0,
        },
        {
            "rut": "18.567.890-1",
            "email": "faraya@mperalillo.cl",
            "nombre_completo": "Felipe Araya M.",
            "password": "Socio#2026",
            "rol": UserRole.SOCIO,
            "is_superuser": False,
            "is_active": True,
            "departamento": "Obras Municipales",
            "antiguedad": "1 Año, 4 Meses",
            "meses_antiguedad": 16,
            "saldo_salud_disponible": 150000,
            "saldo_salud_total_anual": 150000,
            "cargas_registradas": 0,
        },
        {
            "rut": "18.765.432-1",
            "email": "jherrera@mperalillo.cl",
            "nombre_completo": "Javiera Herrera Tapia",
            "password": "Socio#2026",
            "rol": UserRole.SOCIO,
            "is_superuser": False,
            "is_active": True,
            "departamento": "Secretaría Municipal",
            "antiguedad": "1 Año, 2 Meses",
            "meses_antiguedad": 14,
            "saldo_salud_disponible": 150000,
            "saldo_salud_total_anual": 150000,
            "cargas_registradas": 0,
        },
        # Socios en Carencia Activa (< 6 meses)
        {
            "rut": "19.876.543-2",
            "email": "fsepulveda@mperalillo.cl",
            "nombre_completo": "Francisca Sepúlveda T.",
            "password": "Socio#2026",
            "rol": UserRole.SOCIO,
            "is_superuser": False,
            "is_active": True,
            "departamento": "Secretaría Municipal",
            "antiguedad": "3 Meses",
            "meses_antiguedad": 3,
            "saldo_salud_disponible": 150000,
            "saldo_salud_total_anual": 150000,
            "cargas_registradas": 0,
        },
        # Socia Javiera Rivera (0 Meses - Caso solicitado)
        {
            "rut": "19.188.436-1",
            "email": "riverajavieraa@gmail.com",
            "nombre_completo": "Javiera Rivera Arraño",
            "password": "Socio#2026",
            "rol": UserRole.SOCIO,
            "is_superuser": False,
            "is_active": True,
            "departamento": "Secretaría Municipal",
            "antiguedad": "0 Meses",
            "meses_antiguedad": 0,
            "saldo_salud_disponible": 150000,
            "saldo_salud_total_anual": 150000,
            "cargas_registradas": 0,
        },
    ]

    for c in cuentas_a_sincronizar:
        rut_clean = re.sub(r"[^0-9kK]", "", c["rut"]).upper()
        # Buscar por RUT o email
        user_existente = await db.scalar(
            select(User).where(
                (func.replace(func.replace(func.upper(User.rut), ".", ""), "-", "") == rut_clean)
                | (func.lower(User.email) == c["email"].lower())
            )
        )
        if user_existente:
            user_existente.rut = c["rut"]
            user_existente.email = c["email"]
            user_existente.nombre_completo = c["nombre_completo"]
            user_existente.hashed_password = get_password_hash(c["password"])
            user_existente.rol = c["rol"]
            user_existente.is_superuser = c["is_superuser"]
            user_existente.is_active = c["is_active"]
            user_existente.departamento = c["departamento"]
            user_existente.antiguedad = c["antiguedad"]
            user_existente.meses_antiguedad = c["meses_antiguedad"]
            user_existente.saldo_salud_disponible = c["saldo_salud_disponible"]
            user_existente.saldo_salud_total_anual = c["saldo_salud_total_anual"]
            user_existente.cargas_registradas = c["cargas_registradas"]
            user_existente.estado_previsional = "Al día"
            db.add(user_existente)
        else:
            nuevo_u = User(
                rut=c["rut"],
                email=c["email"],
                nombre_completo=c["nombre_completo"],
                hashed_password=get_password_hash(c["password"]),
                rol=c["rol"],
                is_superuser=c["is_superuser"],
                is_active=c["is_active"],
                departamento=c["departamento"],
                antiguedad=c["antiguedad"],
                meses_antiguedad=c["meses_antiguedad"],
                saldo_salud_disponible=c["saldo_salud_disponible"],
                saldo_salud_total_anual=c["saldo_salud_total_anual"],
                cargas_registradas=c["cargas_registradas"],
                estado_previsional="Al día",
            )
            db.add(nuevo_u)

    await registrar_auditoria(
        db=db,
        usuario=current_user,
        modulo="ADMINISTRACION",
        accion="RESET_AMBIENTE_PRUEBAS",
        recurso_tipo="Sistema",
        recurso_id="GLOBAL",
        detalles="Reinicio completo del ambiente de pruebas: bandejas vaciadas, cupos a $150.000, cuentas de prueba limpiadas, cuenta de Javiera Rivera configurada con 0 meses y cuenta de Matías Trujillo liberada.",
    )

    await db.commit()

    return {
        "status": "success",
        "mensaje": "Ambiente de pruebas reiniciado exitosamente. Todas las bandejas vaciadas y cuentas listas.",
        "matias_trujillo_liberado": True,
        "cuentas_activas": len(cuentas_a_sincronizar),
    }
