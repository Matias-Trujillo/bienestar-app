"""Endpoints para el módulo de Administración, Auditoría Inmutable y Gestión de Usuarios."""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select, desc
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
from app.api.v1.endpoints.auth import UserOut, to_out

router = APIRouter()

ROLES_ADMIN = (UserRole.SUPERUSUARIO, UserRole.ADMIN)


# ---------------------------------------------------------------------------
# Esquemas Pydantic
# ---------------------------------------------------------------------------
class AuditLogOut(BaseModel):
    id: int
    created_at: Any
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
    saldo_salud_disponible: float = 250000.0
    saldo_salud_total_anual: float = 250000.0
    cargas_registradas: int = 0


class EditarUsuarioIn(BaseModel):
    rol: Optional[UserRole] = None
    is_active: Optional[bool] = None
    departamento: Optional[str] = None
    nueva_password: Optional[str] = None
    saldo_salud_disponible: Optional[float] = None
    meses_antiguedad: Optional[int] = None
    estado_previsional: Optional[str] = None


class ParametroUpdateIn(BaseModel):
    clave: str
    valor: str
    descripcion: Optional[str] = None


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
    """
    Retorna los registros cronológicos de auditoría.
    Inmutable: Este endpoint es estrictamente de sólo lectura. No existe endpoint DELETE ni PUT para audit-logs.
    """
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
    """Crea una nueva cuenta de usuario y registra el evento en la auditoría inmutable."""
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
        saldo_salud_disponible=body.saldo_salud_disponible,
        saldo_salud_total_anual=body.saldo_salud_total_anual,
        cargas_registradas=body.cargas_registradas,
    )
    db.add(nuevo)
    await db.flush()

    # Registro de auditoría
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


@router.patch("/usuarios/{usuario_id}", response_model=Dict[str, Any], summary="Modificar rol o estado de un usuario")
async def editar_usuario(
    usuario_id: int,
    body: EditarUsuarioIn,
    current_user: User = Depends(require_roles(*ROLES_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Modifica un usuario y genera trazabilidad obligatoria en los logs de auditoría."""
    u = await db.scalar(select(User).where(User.id == usuario_id))
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    cambios = []
    if body.rol is not None and body.rol != u.rol:
        cambios.append(f"Rol cambiado de {u.rol.value} a {body.rol.value}")
        u.rol = body.rol
        u.is_superuser = (body.rol == UserRole.SUPERUSUARIO)

    if body.is_active is not None and body.is_active != u.is_active:
        estado_txt = "activado" if body.is_active else "desactivado"
        cambios.append(f"Cuenta {estado_txt}")
        u.is_active = body.is_active

    if body.departamento is not None:
        cambios.append(f"Departamento: {body.departamento}")
        u.departamento = body.departamento

    if body.meses_antiguedad is not None:
        cambios.append(f"Antigüedad meses: {body.meses_antiguedad}")
        u.meses_antiguedad = body.meses_antiguedad
        u.antiguedad = f"{body.meses_antiguedad} Meses"

    if body.saldo_salud_disponible is not None:
        cambios.append(f"Saldo salud: ${body.saldo_salud_disponible:,.0f}")
        u.saldo_salud_disponible = body.saldo_salud_disponible

    if body.nueva_password and body.nueva_password.strip():
        u.hashed_password = get_password_hash(body.nueva_password.strip())
        cambios.append("Contraseña restablecida")

    if cambios:
        await registrar_auditoria(
            db=db,
            usuario=current_user,
            modulo="USUARIOS",
            accion="EDITAR_USUARIO",
            recurso_tipo="User",
            recurso_id=str(u.id),
            detalles=f"Modificado usuario {u.nombre_completo}: " + "; ".join(cambios),
        )
        await db.commit()

    return {"mensaje": f"Usuario {u.nombre_completo} actualizado.", "cambios": cambios}


@router.get("/parametros", summary="Listar parámetros de configuración global")
async def listar_parametros(
    _: User = Depends(require_roles(*ROLES_ADMIN)), db: AsyncSession = Depends(get_db)
):
    params = await db.scalars(select(ParametroSistema).order_by(ParametroSistema.clave))
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
            detalles=f"Parámetro {body.clave} modificado de '{valor_anterior}' a '{body.valor}'.",
        )
    await db.commit()
    return {"mensaje": f"Parámetro {body.clave} actualizado correctamente.", "valor": body.valor}


# ---------------------------------------------------------------------------
# Gestión Dinámica de Bonos del Catálogo (Superusuario)
# ---------------------------------------------------------------------------
from app.models.beneficios import BonoCatalogo

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
    """
    Elimina un beneficio del catálogo.
    Si ya cuenta con solicitudes históricas asociadas, se protege la integridad referencial y se sugiere desactivarlo.
    """
    bono = await db.scalar(select(BonoCatalogo).where(BonoCatalogo.id == bono_id))
    if not bono:
        raise HTTPException(status_code=404, detail="Bono no encontrado.")

    # Validar si tiene solicitudes históricas de socios
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

    # Registro de auditoría
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


