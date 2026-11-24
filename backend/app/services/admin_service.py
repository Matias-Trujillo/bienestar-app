"""Servicio de dominio para Administración, Gobernanza de Usuarios, Bonos y Parámetros (SRP + DIP).

[ESTUDIANTE INFORMÁTICA] Separa las reglas administrativas y operaciones SQL fuera del
controlador HTTP `endpoints/admin.py`, dependiendo de protocolos abstractos (`DIP`).
"""
from datetime import datetime, timezone
import re
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import desc, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.interfaces import (
    AuditLoggerProtocol,
    PasswordHasherProtocol,
    SmtpTransportProtocol,
)
from app.core.security import BcryptPasswordHasher
from app.models import (
    AuditLog,
    EstadoSolicitud,
    NominaMasiva,
    ParametroSistema,
    SolicitudAfiliacion,
    SolicitudBeneficio,
    SolicitudReembolso,
    User,
    UserRole,
)
from app.models.beneficios import BonoCatalogo
from app.schemas.admin import (
    CrearBonoIn,
    CrearUsuarioIn,
    EditarBonoIn,
    EditarUsuarioIn,
    ParametroUpdateIn,
    SmtpConfigIn,
)
from app.services.audit_service import SqlAlchemyAuditLogger
from app.services.auth_service import (
    evaluar_historial_usuario,
    guardar_seguridad_usuario,
    obtener_seguridad_usuario,
)
from app.services.email_service import enviar_correo_prueba_smtp
from app.services.email_transport import default_smtp_transport


class AdminService:
    """Servicio administrativo con dependencias inyectables por Protocolo."""

    def __init__(
        self,
        audit_logger: Optional[AuditLoggerProtocol] = None,
        hasher: Optional[PasswordHasherProtocol] = None,
        smtp_transport: Optional[SmtpTransportProtocol] = None,
    ) -> None:
        self.audit_logger: AuditLoggerProtocol = audit_logger or SqlAlchemyAuditLogger()
        self.hasher: PasswordHasherProtocol = hasher or BcryptPasswordHasher()
        self.smtp_transport: SmtpTransportProtocol = smtp_transport or default_smtp_transport

    async def obtener_estadisticas(self, db: AsyncSession) -> Dict[str, Any]:
        total_usuarios = await db.scalar(select(func.count(User.id))) or 0
        total_socios = await db.scalar(select(func.count(User.id)).where(User.rol == UserRole.SOCIO)) or 0
        socios_habilitados = await db.scalar(
            select(func.count(User.id)).where(User.rol == UserRole.SOCIO, User.meses_antiguedad >= 6)
        ) or 0
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
                "socios_carencia": total_socios - socios_habilitados,
            },
            "pendientes": {
                "afiliaciones": afiliaciones_pendientes,
                "reembolsos": reembolsos_pendientes,
                "beneficios": beneficios_pendientes,
                "total": afiliaciones_pendientes + reembolsos_pendientes + beneficios_pendientes,
            },
            "auditoria": {"total_eventos": total_logs},
        }

    async def listar_audit_logs(
        self, db: AsyncSession, modulo: Optional[str] = None, limit: int = 100
    ) -> List[AuditLog]:
        stmt = select(AuditLog).order_by(desc(AuditLog.id)).limit(limit)
        if modulo:
            stmt = stmt.where(AuditLog.modulo == modulo.upper())
        return list((await db.scalars(stmt)).all())

    async def crear_usuario(
        self, db: AsyncSession, body: CrearUsuarioIn, current_user: User
    ) -> Dict[str, Any]:
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
            hashed_password=self.hasher.hash(body.password),
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
        await self.audit_logger.registrar(
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

    async def editar_usuario(
        self, db: AsyncSession, usuario_id: int, body: EditarUsuarioIn, current_user: User
    ) -> Dict[str, Any]:
        u = await db.scalar(select(User).where(User.id == usuario_id))
        if not u:
            raise HTTPException(status_code=404, detail="Usuario no encontrado.")

        sec = await obtener_seguridad_usuario(db, u.id)
        intentos = int(sec["i"])
        bloqueada = bool(sec["b"])
        debe_cambiar = bool(sec["c"])
        ultimo_cambio = sec["u"]
        sec_modificado = False
        cambios: List[str] = []

        if body.rol is not None and body.rol != u.rol:
            cambios.append(f"Rol cambiado de {u.rol.value} a {body.rol.value}")
            u.rol = body.rol
            u.is_superuser = body.rol == UserRole.SUPERUSUARIO
        if body.is_active is not None and body.is_active != u.is_active:
            cambios.append(f"Estado del socio cambiado a {'ACTIVO' if body.is_active else 'INACTIVO'}")
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
            u.hashed_password = self.hasher.hash(body.nueva_password.strip())
            bloqueada = False
            intentos = 0
            debe_cambiar = True if body.debe_cambiar_password is None else body.debe_cambiar_password
            ultimo_cambio = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
            sec_modificado = True
            cambios.append("Contraseña restablecida (desbloqueada y marcada como temporal para cambio del usuario)")

        if sec_modificado:
            await guardar_seguridad_usuario(
                db, u.id, intentos=intentos, bloqueada=bloqueada, debe_cambiar=debe_cambiar, ultimo_cambio=ultimo_cambio
            )

        if cambios:
            await self.audit_logger.registrar(
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

    async def eliminar_usuario(self, db: AsyncSession, usuario_id: int, current_user: User) -> Dict[str, Any]:
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

        nombre_eliminado, rut_eliminado, rol_eliminado = u.nombre_completo, u.rut, u.rol.value
        param_sec = await db.scalar(select(ParametroSistema).where(ParametroSistema.clave == f"SEC_USR_{u.id}"))
        if param_sec:
            await db.delete(param_sec)

        rut_sin_puntos = u.rut.replace(".", "").strip().upper()
        for sol in await db.scalars(select(SolicitudAfiliacion).where(SolicitudAfiliacion.run == rut_sin_puntos)):
            await db.delete(sol)

        await db.delete(u)
        await self.audit_logger.registrar(
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

    async def listar_parametros(self, db: AsyncSession) -> List[Dict[str, Any]]:
        defaults_smtp = [
            ("SMTP_HOST", settings.SMTP_HOST or "smtp.gmail.com", "Servidor de correo saliente"),
            ("SMTP_PORT", str(settings.SMTP_PORT or 587), "Puerto SMTP (587 para STARTTLS, 465 para SSL)"),
            ("SMTP_USER", settings.SMTP_USER or settings.SMTP_FROM_EMAIL or "bperalillo@gmail.com", "Correo remitente"),
            ("SMTP_PASSWORD", settings.SMTP_PASSWORD or "", "Contraseña de Aplicación SMTP"),
        ]
        hubo_nuevos = False
        for clave_def, val_def, desc_def in defaults_smtp:
            if not await db.scalar(select(ParametroSistema).where(ParametroSistema.clave == clave_def)):
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
        self.smtp_transport.actualizar_configuracion(
            host=mapa.get("SMTP_HOST"),
            port=int(mapa["SMTP_PORT"]) if mapa.get("SMTP_PORT", "").isdigit() else None,
            user=mapa.get("SMTP_USER"),
            password=mapa.get("SMTP_PASSWORD"),
        )
        return [{"clave": p.clave, "valor": p.valor, "descripcion": p.descripcion} for p in params]

    async def actualizar_parametro(
        self, db: AsyncSession, body: ParametroUpdateIn, current_user: User
    ) -> Dict[str, Any]:
        p = await db.scalar(select(ParametroSistema).where(ParametroSistema.clave == body.clave))
        if not p:
            db.add(ParametroSistema(clave=body.clave, valor=body.valor, descripcion=body.descripcion))
        else:
            valor_anterior = p.valor
            p.valor = body.valor
            if body.descripcion:
                p.descripcion = body.descripcion
            await self.audit_logger.registrar(
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
            params_smtp = await db.scalars(select(ParametroSistema).where(ParametroSistema.clave.like("SMTP_%")))
            mapa = {x.clave: x.valor for x in params_smtp}
            self.smtp_transport.actualizar_configuracion(
                host=mapa.get("SMTP_HOST"),
                port=int(mapa["SMTP_PORT"]) if mapa.get("SMTP_PORT", "").isdigit() else None,
                user=mapa.get("SMTP_USER"),
                password=mapa.get("SMTP_PASSWORD"),
            )
        return {"mensaje": f"Parámetro {body.clave} actualizado correctamente.", "valor": body.valor}

    async def configurar_y_probar_smtp(
        self, db: AsyncSession, body: SmtpConfigIn, current_user: User
    ) -> Dict[str, Any]:
        user_clean = body.smtp_user.strip()
        pwd_clean = body.smtp_password.strip().replace(" ", "")
        host_clean = body.smtp_host.strip() or "smtp.gmail.com"
        for clave, valor in [
            ("SMTP_HOST", host_clean),
            ("SMTP_PORT", str(body.smtp_port or 587)),
            ("SMTP_USER", user_clean),
            ("SMTP_PASSWORD", pwd_clean),
        ]:
            p = await db.scalar(select(ParametroSistema).where(ParametroSistema.clave == clave))
            if not p:
                db.add(ParametroSistema(clave=clave, valor=valor, descripcion=f"Configuración SMTP ({clave})"))
            else:
                p.valor = valor

        await self.audit_logger.registrar(
            db=db,
            usuario=current_user,
            modulo="CONFIGURACION",
            accion="CONFIGURAR_SMTP_CORREO",
            recurso_tipo="ParametroSistema",
            recurso_id="SMTP",
            detalles=f"Configurado servidor de correo saliente {host_clean}:{body.smtp_port} con cuenta {user_clean}.",
        )
        await db.commit()

        estado_runtime = self.smtp_transport.actualizar_configuracion(
            host=host_clean, port=body.smtp_port or 587, user=user_clean, password=pwd_clean
        )
        dest_prueba = (body.destinatario_prueba or user_clean).strip()
        enviado, detalle = enviar_correo_prueba_smtp(dest_prueba, transport=self.smtp_transport)
        return {
            "enviado": enviado,
            "mensaje": detalle,
            "smtp_host": estado_runtime.get("host", host_clean),
            "smtp_user": user_clean,
        }

    async def listar_bonos(self, db: AsyncSession) -> List[Dict[str, Any]]:
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

    async def crear_bono(self, db: AsyncSession, body: CrearBonoIn, current_user: User) -> Dict[str, Any]:
        codigo_clean = body.codigo.strip().lower().replace(" ", "_")
        if await db.scalar(select(BonoCatalogo).where(BonoCatalogo.codigo == codigo_clean)):
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
        await self.audit_logger.registrar(
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

    async def editar_bono(
        self, db: AsyncSession, bono_id: int, body: EditarBonoIn, current_user: User
    ) -> Dict[str, Any]:
        bono = await db.scalar(select(BonoCatalogo).where(BonoCatalogo.id == bono_id))
        if not bono:
            raise HTTPException(status_code=404, detail="Bono no encontrado.")

        cambios: List[str] = []
        if body.nombre is not None and body.nombre != bono.nombre:
            cambios.append(f"Nombre: {body.nombre}")
            bono.nombre = body.nombre
        if body.porcentaje is not None and body.porcentaje != bono.porcentaje:
            cambios.append(f"Porcentaje: {bono.porcentaje}% -> {body.porcentaje}%")
            bono.porcentaje = body.porcentaje
        for attr in ("categoria", "requisitos", "documentacion_requerida", "regla_asignacion", "periodo_devengo", "permite_postulacion_socio", "es_calendario", "icono"):
            val = getattr(body, attr)
            if val is not None:
                setattr(bono, attr, val)
        if body.activo is not None and body.activo != bono.activo:
            cambios.append(f"Estado: {'Activado' if body.activo else 'Desactivado (Oculto del catálogo)'}")
            bono.activo = body.activo

        if cambios:
            await self.audit_logger.registrar(
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

    async def eliminar_bono(self, db: AsyncSession, bono_id: int, current_user: User) -> Dict[str, Any]:
        bono = await db.scalar(select(BonoCatalogo).where(BonoCatalogo.id == bono_id))
        if not bono:
            raise HTTPException(status_code=404, detail="Bono no encontrado.")

        solicitudes_asociadas = await db.scalar(
            select(func.count(SolicitudBeneficio.id)).where(
                (SolicitudBeneficio.bono_id == bono.id) | (SolicitudBeneficio.tipo_bono == bono.codigo)
            )
        ) or 0
        nominas_asociadas = await db.scalar(
            select(func.count(NominaMasiva.id)).where(
                (NominaMasiva.bono_id == bono.id) | (NominaMasiva.tipo_bono == bono.codigo)
            )
        ) or 0
        if (solicitudes_asociadas + nominas_asociadas) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"No se puede eliminar el beneficio '{bono.nombre}' porque cuenta con "
                    f"{solicitudes_asociadas + nominas_asociadas} registro(s) en el historial contable de los socios. "
                    "Utilice la opción 'Desactivar'."
                ),
            )

        codigo_bono, nombre_bono = bono.codigo, bono.nombre
        await db.delete(bono)
        await self.audit_logger.registrar(
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

    async def reset_ambiente_pruebas(self, db: AsyncSession, current_user: User) -> Dict[str, Any]:
        from app.db.init_db import SEED_USERS

        for tbl in (
            "detalles_nomina_masiva",
            "nominas_masivas",
            "solicitudes_beneficio",
            "solicitudes_reembolso",
            "solicitudes_cargas_familiares",
            "cargas_familiares",
            "solicitudes_afiliacion",
        ):
            await db.execute(text(f"DELETE FROM {tbl};"))

        await db.execute(text("DELETE FROM parametros_sistema WHERE clave LIKE 'SEC_USR_%';"))
        await db.execute(
            text(
                "DELETE FROM usuarios WHERE email IN ('mntrujillof@gmail.com', 'mntrujillog@gmail.com', 'ani.c.castro.v@gmail.com') "
                "OR REPLACE(REPLACE(UPPER(rut), '.', ''), '-', '') = '205452109';"
            )
        )
        await db.execute(
            text(
                "DELETE FROM usuarios WHERE id >= 12 AND email NOT IN ('riverajavieraa@gmail.com') "
                "AND REPLACE(REPLACE(UPPER(rut), '.', ''), '-', '') <> '191884361';"
            )
        )

        for c in SEED_USERS:
            rut_clean = re.sub(r"[^0-9kK]", "", c["rut"]).upper()
            user_existente = await db.scalar(
                select(User).where(
                    (func.replace(func.replace(func.upper(User.rut), ".", ""), "-", "") == rut_clean)
                    | (func.lower(User.email) == c["email"].lower())
                )
            )
            saldo = int(c.get("saldo_salud_disponible", 150000))
            saldo_anual = int(c.get("saldo_salud_total_anual", 150000))
            if user_existente:
                user_existente.rut = c["rut"]
                user_existente.email = c["email"]
                user_existente.nombre_completo = c["nombre_completo"]
                user_existente.hashed_password = self.hasher.hash(c["password"])
                user_existente.rol = c["rol"]
                user_existente.is_superuser = bool(c.get("is_superuser", False))
                user_existente.is_active = True
                user_existente.departamento = c["departamento"]
                user_existente.antiguedad = c["antiguedad"]
                user_existente.meses_antiguedad = c["meses_antiguedad"]
                user_existente.saldo_salud_disponible = saldo
                user_existente.saldo_salud_total_anual = saldo_anual
                user_existente.cargas_registradas = int(c.get("cargas_registradas", 0))
                user_existente.estado_previsional = "Al día"
                user_existente.intentos_fallidos = 0
                user_existente.password_bloqueada = False
                user_existente.debe_cambiar_password = False
                db.add(user_existente)
            else:
                db.add(
                    User(
                        rut=c["rut"],
                        email=c["email"],
                        nombre_completo=c["nombre_completo"],
                        hashed_password=self.hasher.hash(c["password"]),
                        rol=c["rol"],
                        is_superuser=bool(c.get("is_superuser", False)),
                        is_active=True,
                        departamento=c["departamento"],
                        antiguedad=c["antiguedad"],
                        meses_antiguedad=c["meses_antiguedad"],
                        saldo_salud_disponible=saldo,
                        saldo_salud_total_anual=saldo_anual,
                        cargas_registradas=int(c.get("cargas_registradas", 0)),
                        estado_previsional="Al día",
                    )
                )

        await self.audit_logger.registrar(
            db=db,
            usuario=current_user,
            modulo="ADMINISTRACION",
            accion="RESET_AMBIENTE_PRUEBAS",
            recurso_tipo="Sistema",
            recurso_id="GLOBAL",
            detalles="Reinicio completo del ambiente de pruebas: bandejas vaciadas, cupos a $150.000 y cuentas canónicas restablecidas.",
        )
        await db.commit()
        return {
            "status": "success",
            "mensaje": "Ambiente de pruebas reiniciado exitosamente. Todas las bandejas vaciadas y cuentas listas.",
            "matias_trujillo_liberado": True,
            "cuentas_activas": len(SEED_USERS),
        }
