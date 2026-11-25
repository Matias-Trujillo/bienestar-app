"""Servicio de negocio del Módulo Vecino y Nuevo Talento — Trabaja con Nosotros (Ley N° 21.015)."""
import base64
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.audit import AuditLog
from app.models.beneficios import ParametroSistema
from app.models.talento import (
    CompetenciaCatalogo,
    CursoPerfeccionamiento,
    EducacionTalento,
    EstadoPostulacionTalento,
    ExperienciaLaboralTalento,
    OfertaLaboral,
    PerfilTalentoVecino,
)
from app.models.user import User
from app.schemas.afiliacion import formatear_run
from app.schemas.talento import (
    CompetenciaOut,
    OfertaLaboralIn,
    OfertaLaboralOut,
    PostulacionTalentoIn,
    PostulacionTalentoOut,
)
from app.services.afiliacion_service import sincronizar_smtp_desde_db
from app.services.email_service import (
    generar_correos_postulacion_talento,
    obtener_estado_smtp_runtime,
)

logger = logging.getLogger("uvicorn.error")

JORNADA_LABELS = {
    "completa": "Jornada Completa (44 hrs)",
    "parcial": "Jornada Parcial",
    "turnos": "Sistema de Turnos",
}

MODALIDAD_LABELS = {
    "presencial": "Presencial",
    "hibrida": "Híbrida",
    "teletrabajo": "Teletrabajo",
}

COMPETENCIAS_SEMILLA: List[Dict[str, str]] = [
    # Gestión y Administración
    {"nombre": "Atención Ciudadana y Público", "categoria": "Gestión Municipal"},
    {"nombre": "Gestión Administrativa", "categoria": "Gestión Municipal"},
    {"nombre": "Contabilidad y Finanzas Públicas", "categoria": "Gestión Municipal"},
    {"nombre": "Compras Públicas (Mercado Público)", "categoria": "Gestión Municipal"},
    {"nombre": "Gestión de Proyectos Sociales", "categoria": "Gestión Municipal"},
    {"nombre": "Recursos Humanos y Remuneraciones", "categoria": "Gestión Municipal"},
    {"nombre": "Secretariado y Archivo Documental", "categoria": "Gestión Municipal"},
    {"nombre": "Derecho Administrativo / Jurídico", "categoria": "Gestión Municipal"},
    # Tecnología y Herramientas Digitales
    {"nombre": "Microsoft Excel Avanzado", "categoria": "Digital y TI"},
    {"nombre": "Ofimática (Word, PowerPoint, Correo)", "categoria": "Digital y TI"},
    {"nombre": "Soporte Técnico y Redes", "categoria": "Digital y TI"},
    {"nombre": "Desarrollo de Software / Web", "categoria": "Digital y TI"},
    {"nombre": "Bases de Datos (SQL / PostgreSQL)", "categoria": "Digital y TI"},
    {"nombre": "Diseño Gráfico y Comunicaciones", "categoria": "Digital y TI"},
    # Salud, Educación y Social
    {"nombre": "Trabajo Social / DIDECO", "categoria": "Social y Salud"},
    {"nombre": "Enfermería / TENS / Salud Primaria", "categoria": "Social y Salud"},
    {"nombre": "Primeros Auxilios y Prevención de Riesgos", "categoria": "Social y Salud"},
    {"nombre": "Pedagogía y Educación Parvularia", "categoria": "Social y Salud"},
    {"nombre": "Psicología Comunitaria", "categoria": "Social y Salud"},
    # Operaciones y Oficios
    {"nombre": "Licencia de Conducir Clase B", "categoria": "Operaciones y Oficios"},
    {"nombre": "Licencia Profesional Clase A", "categoria": "Operaciones y Oficios"},
    {"nombre": "Electricidad y Mantención General", "categoria": "Operaciones y Oficios"},
    {"nombre": "Obras Civiles y Construcción", "categoria": "Operaciones y Oficios"},
    {"nombre": "Áreas Verdes y Agricultura", "categoria": "Operaciones y Oficios"},
]


def _decodificar_cv_base64(raw_data: Optional[str]) -> Optional[bytes]:
    if not raw_data:
        return None
    contenido = raw_data.strip()
    if "," in contenido and contenido.startswith("data:"):
        contenido = contenido.split(",", 1)[1]
    try:
        return base64.b64decode(contenido)
    except Exception:
        return None


def _perfil_to_out(
    p: PerfilTalentoVecino,
    notificaciones: Optional[Dict[str, Any]] = None,
    mensaje: str = "",
) -> PostulacionTalentoOut:
    return PostulacionTalentoOut(
        id=p.id,
        folio=p.folio,
        estado=p.estado,
        fechaIngreso=p.created_at,
        nombreCompleto=p.nombre_completo,
        run=formatear_run(p.run),
        email=p.email,
        telefono=p.telefono,
        direccion=p.direccion,
        comuna=p.comuna,
        resumenProfesional=p.resumen_profesional,
        rentaEsperadaClp=p.renta_esperada_clp,
        jornadaDeseada=p.jornada_deseada,
        modalidadDeseada=p.modalidad_deseada,
        poseeDiscapacidadLey21015=bool(p.posee_discapacidad_ley_21015),
        credencialRndSenadis=p.credencial_rnd_senadis,
        cvFilename=p.cv_filename,
        tieneCv=bool(p.cv_filename and p.cv_data_base64),
        ofertaId=p.oferta_id,
        ofertaTitulo=p.oferta_titulo,
        competencias=[
            CompetenciaOut(id=c.id, nombre=c.nombre, categoria=c.categoria)
            for c in (p.competencias or [])
        ],
        educaciones=[
            {
                "id": e.id,
                "institucion": e.institucion,
                "titulo": e.titulo,
                "nivelEducacional": e.nivel_educacional,
                "estadoEstudios": e.estado_estudios,
                "anioInicio": e.anio_inicio,
                "anioTermino": e.anio_termino,
            }
            for e in (p.educaciones or [])
        ],
        experiencias=[
            {
                "id": ex.id,
                "empresa": ex.empresa,
                "cargo": ex.cargo,
                "anioInicio": ex.anio_inicio,
                "anioTermino": ex.anio_termino,
                "actualmenteTrabajando": ex.actualmente_trabajando,
                "funciones": ex.funciones or "",
            }
            for ex in (p.experiencias or [])
        ],
        cursos=[
            {
                "id": cu.id,
                "nombreCurso": cu.nombre_curso,
                "institucion": cu.institucion,
                "horas": cu.horas,
                "anio": cu.anio,
            }
            for cu in (p.cursos or [])
        ],
        notificaciones=notificaciones,
        mensaje=mensaje,
    )


class TalentoService:
    """Orquestador de lógica de negocio para Vecino y Nuevo Talento (Trabaja con Nosotros)."""

    @staticmethod
    async def listar_competencias(db: AsyncSession) -> List[CompetenciaOut]:
        items = (
            await db.scalars(
                select(CompetenciaCatalogo)
                .where(CompetenciaCatalogo.activa == True)  # noqa: E712
                .order_by(CompetenciaCatalogo.categoria.asc(), CompetenciaCatalogo.nombre.asc())
            )
        ).all()

        if not items:
            for comp in COMPETENCIAS_SEMILLA:
                db.add(
                    CompetenciaCatalogo(
                        nombre=comp["nombre"],
                        categoria=comp["categoria"],
                        activa=True,
                    )
                )
            await db.commit()
            items = (
                await db.scalars(
                    select(CompetenciaCatalogo)
                    .where(CompetenciaCatalogo.activa == True)  # noqa: E712
                    .order_by(CompetenciaCatalogo.categoria.asc(), CompetenciaCatalogo.nombre.asc())
                )
            ).all()

        return [CompetenciaOut(id=c.id, nombre=c.nombre, categoria=c.categoria) for c in items]

    @staticmethod
    async def _resolver_email_institucional(db: AsyncSession) -> str:
        """Determina el correo institucional receptor (RRHH / Comité) para recibir las postulaciones."""
        try:
            param_talento = await db.scalar(
                select(ParametroSistema).where(ParametroSistema.clave == "EMAIL_TRABAJA_CON_NOSOTROS")
            )
            if param_talento and (param_talento.valor or "").strip():
                return param_talento.valor.strip()
        except Exception:
            pass

        estado_smtp = obtener_estado_smtp_runtime()
        smtp_user = (estado_smtp.get("user") or "").strip()
        if smtp_user and "@" in smtp_user:
            return smtp_user
        return (settings.SMTP_FROM_EMAIL or "bienestar@mperalillo.cl").strip()

    @staticmethod
    async def crear_postulacion(
        db: AsyncSession,
        payload: PostulacionTalentoIn,
        ip_origen: str = "127.0.0.1",
    ) -> PostulacionTalentoOut:
        anio = datetime.now(timezone.utc).year
        total_actual = await db.scalar(select(func.count(PerfilTalentoVecino.id))) or 0
        folio = f"TAL-{anio}-{total_actual + 1:05d}"

        # Garantizar unicidad del folio
        while await db.scalar(select(PerfilTalentoVecino.id).where(PerfilTalentoVecino.folio == folio)):
            total_actual += 1
            folio = f"TAL-{anio}-{total_actual + 1:05d}"

        competencias_objs: List[CompetenciaCatalogo] = []
        if payload.competenciaIds:
            competencias_objs = list(
                (
                    await db.scalars(
                        select(CompetenciaCatalogo).where(
                            CompetenciaCatalogo.id.in_(payload.competenciaIds)
                        )
                    )
                ).all()
            )

        oferta_obj: Optional[OfertaLaboral] = None
        oferta_label: Optional[str] = None
        if payload.ofertaId:
            oferta_obj = await db.scalar(
                select(OfertaLaboral).where(
                    OfertaLaboral.id == payload.ofertaId,
                    OfertaLaboral.activa == True,  # noqa: E712
                )
            )
            if not oferta_obj:
                raise HTTPException(
                    status_code=404,
                    detail="La oferta laboral seleccionada ya no se encuentra disponible.",
                )
            oferta_label = f"{oferta_obj.codigo} — {oferta_obj.titulo}"

        perfil = PerfilTalentoVecino(
            folio=folio,
            nombre_completo=payload.nombreCompleto.strip(),
            run=payload.run,
            email=payload.email,
            telefono=payload.telefono.strip(),
            direccion=payload.direccion.strip(),
            comuna=payload.comuna.strip(),
            resumen_profesional=payload.resumenProfesional.strip(),
            renta_esperada_clp=payload.rentaEsperadaClp,
            jornada_deseada=payload.jornadaDeseada,
            modalidad_deseada=payload.modalidadDeseada,
            posee_discapacidad_ley_21015=payload.poseeDiscapacidadLey21015,
            credencial_rnd_senadis=(payload.credencialRndSenadis or "").strip() or None,
            acepta_tratamiento_datos=payload.aceptaTratamientoDatos,
            cv_filename=(payload.cvFilename or "").strip() or None,
            cv_content_type=(payload.cvContentType or "").strip() or None,
            cv_data_base64=payload.cvDataBase64,
            estado=EstadoPostulacionTalento.RECIBIDA.value,
            oferta_id=oferta_obj.id if oferta_obj else None,
            oferta_titulo=oferta_label,
            competencias=competencias_objs,
        )

        for edu in payload.educaciones:
            perfil.educaciones.append(
                EducacionTalento(
                    institucion=edu.institucion.strip(),
                    titulo=edu.titulo.strip(),
                    nivel_educacional=edu.nivelEducacional.strip(),
                    estado_estudios=edu.estadoEstudios.strip(),
                    anio_inicio=edu.anioInicio,
                    anio_termino=edu.anioTermino,
                )
            )

        for exp in payload.experiencias:
            perfil.experiencias.append(
                ExperienciaLaboralTalento(
                    empresa=exp.empresa.strip(),
                    cargo=exp.cargo.strip(),
                    anio_inicio=exp.anioInicio,
                    anio_termino=None if exp.actualmenteTrabajando else exp.anioTermino,
                    actualmente_trabajando=exp.actualmenteTrabajando,
                    funciones=(exp.funciones or "").strip() or None,
                )
            )

        for cur in payload.cursos:
            perfil.cursos.append(
                CursoPerfeccionamiento(
                    nombre_curso=cur.nombreCurso.strip(),
                    institucion=cur.institucion.strip(),
                    horas=cur.horas,
                    anio=cur.anio,
                )
            )

        db.add(perfil)
        await db.flush()

        # Sincronizar SMTP desde BD y enviar correos a AMBAS PARTES
        await sincronizar_smtp_desde_db(db)
        email_institucion = await TalentoService._resolver_email_institucional(db)
        cv_bytes = _decodificar_cv_base64(payload.cvDataBase64)

        competencias_txt = (
            ", ".join(c.nombre for c in competencias_objs) if competencias_objs else "Sin competencias seleccionadas"
        )
        edu_txt = (
            "; ".join(f"{e.titulo} — {e.institucion} ({e.estado_estudios})" for e in perfil.educaciones)
            if perfil.educaciones
            else "No informada"
        )
        exp_txt = (
            "; ".join(
                f"{ex.cargo} en {ex.empresa} ({ex.anio_inicio or '?'}-{'Actual' if ex.actualmente_trabajando else (ex.anio_termino or '?')})"
                for ex in perfil.experiencias
            )
            if perfil.experiencias
            else "No informada"
        )
        cur_txt = (
            "; ".join(f"{cu.nombre_curso} ({cu.institucion})" for cu in perfil.cursos)
            if perfil.cursos
            else "No informados"
        )

        notificaciones = generar_correos_postulacion_talento(
            folio=folio,
            nombre_completo=perfil.nombre_completo,
            run_formateado=formatear_run(perfil.run),
            email_postulante=perfil.email,
            email_institucion=email_institucion,
            telefono=perfil.telefono,
            direccion=perfil.direccion,
            comuna=perfil.comuna,
            resumen_profesional=perfil.resumen_profesional,
            renta_esperada_clp=perfil.renta_esperada_clp,
            jornada_label=JORNADA_LABELS.get(perfil.jornada_deseada, perfil.jornada_deseada),
            modalidad_label=MODALIDAD_LABELS.get(perfil.modalidad_deseada, perfil.modalidad_deseada),
            competencias_texto=competencias_txt,
            educacion_resumen=edu_txt,
            experiencia_resumen=exp_txt,
            cursos_resumen=cur_txt,
            cv_filename=perfil.cv_filename,
            cv_bytes=cv_bytes,
            cv_content_type=perfil.cv_content_type,
            posee_discapacidad=perfil.posee_discapacidad_ley_21015,
            credencial_rnd=perfil.credencial_rnd_senadis,
            oferta_label=oferta_label,
            enviar_smtp=True,
        )

        db.add(
            AuditLog(
                usuario_nombre=perfil.nombre_completo,
                usuario_rut=formatear_run(perfil.run),
                usuario_rol="postulante_vecino",
                modulo="TALENTO",
                accion="INGRESO_POSTULACION_TRABAJA_CON_NOSOTROS",
                recurso_tipo="PerfilTalentoVecino",
                recurso_id=folio,
                detalles=(
                    f"Postulación {folio} recibida de {perfil.nombre_completo} ({perfil.email}). "
                    f"Correos emitidos a postulante ({perfil.email}) e institución ({email_institucion})."
                ),
                ip_origen=ip_origen,
            )
        )
        await db.commit()
        await db.refresh(perfil)

        return _perfil_to_out(
            perfil,
            notificaciones=notificaciones,
            mensaje=(
                f"¡Postulación {folio} enviada con éxito! Se ha enviado una copia de confirmación a "
                f"{perfil.email} y su perfil con CV fue derivado a {email_institucion}."
            ),
        )

    @staticmethod
    async def listar_postulaciones(
        db: AsyncSession,
        q: Optional[str] = None,
        jornada: Optional[str] = None,
        modalidad: Optional[str] = None,
        solo_ley_21015: bool = False,
    ) -> List[PostulacionTalentoOut]:
        stmt = select(PerfilTalentoVecino).order_by(PerfilTalentoVecino.created_at.desc())
        if jornada:
            stmt = stmt.where(PerfilTalentoVecino.jornada_deseada == jornada)
        if modalidad:
            stmt = stmt.where(PerfilTalentoVecino.modalidad_deseada == modalidad)
        if solo_ley_21015:
            stmt = stmt.where(PerfilTalentoVecino.posee_discapacidad_ley_21015 == True)  # noqa: E712

        rows = (await db.scalars(stmt)).all()
        if q and q.strip():
            needle = q.strip().lower()
            rows = [
                p
                for p in rows
                if needle in (p.nombre_completo or "").lower()
                or needle in (p.run or "").lower()
                or needle in (p.email or "").lower()
                or needle in (p.folio or "").lower()
                or needle in (p.resumen_profesional or "").lower()
                or any(needle in c.nombre.lower() for c in (p.competencias or []))
            ]
        return [_perfil_to_out(p) for p in rows]

    @staticmethod
    async def obtener_cv_descarga(db: AsyncSession, folio: str) -> Tuple[str, str, bytes]:
        perfil = await db.scalar(
            select(PerfilTalentoVecino).where(PerfilTalentoVecino.folio == folio)
        )
        if not perfil or not perfil.cv_data_base64 or not perfil.cv_filename:
            raise HTTPException(status_code=404, detail="Currículum (CV) no encontrado para el folio indicado.")
        raw = _decodificar_cv_base64(perfil.cv_data_base64)
        if not raw:
            raise HTTPException(status_code=404, detail="No se pudo decodificar el archivo CV almacenado.")
        return perfil.cv_filename, (perfil.cv_content_type or "application/pdf"), raw

    @staticmethod
    async def _oferta_to_out(db: AsyncSession, o: OfertaLaboral) -> OfertaLaboralOut:
        count = await db.scalar(
            select(func.count(PerfilTalentoVecino.id)).where(PerfilTalentoVecino.oferta_id == o.id)
        ) or 0
        return OfertaLaboralOut(
            id=o.id,
            codigo=o.codigo,
            titulo=o.titulo,
            unidad=o.unidad,
            descripcion=o.descripcion,
            requisitos=o.requisitos or "",
            rentaReferencialClp=o.renta_referencial_clp,
            jornada=o.jornada,
            modalidad=o.modalidad,
            vacantes=o.vacantes,
            fechaCierre=o.fecha_cierre,
            inclusivaLey21015=bool(o.inclusiva_ley_21015),
            activa=bool(o.activa),
            publicadoPorNombre=o.publicado_por_nombre,
            fechaPublicacion=o.created_at,
            postulacionesCount=int(count),
        )

    @staticmethod
    async def listar_ofertas(
        db: AsyncSession,
        solo_activas: bool = True,
    ) -> List[OfertaLaboralOut]:
        stmt = select(OfertaLaboral).order_by(OfertaLaboral.activa.desc(), OfertaLaboral.created_at.desc())
        if solo_activas:
            stmt = stmt.where(OfertaLaboral.activa == True)  # noqa: E712
        ofertas = (await db.scalars(stmt)).all()
        return [await TalentoService._oferta_to_out(db, o) for o in ofertas]

    @staticmethod
    async def crear_oferta(
        db: AsyncSession,
        payload: OfertaLaboralIn,
        usuario: User,
        ip_origen: str = "127.0.0.1",
    ) -> OfertaLaboralOut:
        anio = datetime.now(timezone.utc).year
        total = await db.scalar(select(func.count(OfertaLaboral.id))) or 0
        codigo = f"OFL-{anio}-{total + 1:03d}"
        while await db.scalar(select(OfertaLaboral.id).where(OfertaLaboral.codigo == codigo)):
            total += 1
            codigo = f"OFL-{anio}-{total + 1:03d}"

        oferta = OfertaLaboral(
            codigo=codigo,
            titulo=payload.titulo.strip(),
            unidad=payload.unidad.strip(),
            descripcion=payload.descripcion.strip(),
            requisitos=(payload.requisitos or "").strip() or None,
            renta_referencial_clp=payload.rentaReferencialClp,
            jornada=payload.jornada,
            modalidad=payload.modalidad,
            vacantes=payload.vacantes,
            fecha_cierre=(payload.fechaCierre or "").strip() or None,
            inclusiva_ley_21015=payload.inclusivaLey21015,
            activa=True,
            publicado_por_id=usuario.id,
            publicado_por_nombre=usuario.nombre_completo,
        )
        db.add(oferta)
        await db.flush()

        db.add(
            AuditLog(
                usuario_id=usuario.id,
                usuario_nombre=usuario.nombre_completo,
                usuario_rut=usuario.rut,
                usuario_rol=usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol),
                modulo="TALENTO",
                accion="PUBLICAR_OFERTA_LABORAL",
                recurso_tipo="OfertaLaboral",
                recurso_id=codigo,
                detalles=f"Oferta laboral {codigo} ({oferta.titulo} — {oferta.unidad}) publicada.",
                ip_origen=ip_origen,
            )
        )
        await db.commit()
        await db.refresh(oferta)
        return await TalentoService._oferta_to_out(db, oferta)

    @staticmethod
    async def actualizar_estado_oferta(
        db: AsyncSession,
        oferta_id: int,
        activa: bool,
        usuario: User,
        ip_origen: str = "127.0.0.1",
    ) -> OfertaLaboralOut:
        oferta = await db.scalar(select(OfertaLaboral).where(OfertaLaboral.id == oferta_id))
        if not oferta:
            raise HTTPException(status_code=404, detail="Oferta laboral no encontrada.")
        oferta.activa = activa
        db.add(
            AuditLog(
                usuario_id=usuario.id,
                usuario_nombre=usuario.nombre_completo,
                usuario_rut=usuario.rut,
                usuario_rol=usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol),
                modulo="TALENTO",
                accion="REABRIR_OFERTA_LABORAL" if activa else "CERRAR_OFERTA_LABORAL",
                recurso_tipo="OfertaLaboral",
                recurso_id=oferta.codigo,
                detalles=f"Oferta {oferta.codigo} ({oferta.titulo}) marcada como {'Activa' if activa else 'Cerrada'}.",
                ip_origen=ip_origen,
            )
        )
        await db.commit()
        await db.refresh(oferta)
        return await TalentoService._oferta_to_out(db, oferta)

    @staticmethod
    async def eliminar_oferta(
        db: AsyncSession,
        oferta_id: int,
        usuario: User,
        ip_origen: str = "127.0.0.1",
    ) -> Dict[str, Any]:
        oferta = await db.scalar(select(OfertaLaboral).where(OfertaLaboral.id == oferta_id))
        if not oferta:
            raise HTTPException(status_code=404, detail="Oferta laboral no encontrada.")
        codigo = oferta.codigo
        titulo = oferta.titulo
        await db.delete(oferta)
        db.add(
            AuditLog(
                usuario_id=usuario.id,
                usuario_nombre=usuario.nombre_completo,
                usuario_rut=usuario.rut,
                usuario_rol=usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol),
                modulo="TALENTO",
                accion="ELIMINAR_OFERTA_LABORAL",
                recurso_tipo="OfertaLaboral",
                recurso_id=codigo,
                detalles=f"Oferta laboral {codigo} ({titulo}) eliminada por {usuario.nombre_completo}.",
                ip_origen=ip_origen,
            )
        )
        await db.commit()
        return {"ok": True, "codigo": codigo}
