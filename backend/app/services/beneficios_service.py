"""Servicio de lógica de negocio para Beneficios Sociales y Bonos.
Implementa las reglas de cálculo sobre Grado 15, validaciones documentales,
HU-05 (Postulaciones por contingencia) y HU-06 (Liquidación masiva de calendario).
"""
import csv
import io
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models import (
    User,
    UserRole,
    ParametroSistema,
    SolicitudBeneficio,
    NominaMasiva,
    DetalleNominaMasiva,
)
from app.schemas.beneficios import (
    BonoCatalogoItem,
    CatalogoBeneficiosResponse,
    PostulacionBeneficioCreate,
    AsignacionDirectaVacacionesCreate,
    ValidarSolicitudRequest,
    SimularNominaRequest,
    SimularNominaResponse,
    SimularNominaItem,
    EjecutarNominaRequest,
    CargaPlanillaItem,
)

logger = logging.getLogger("uvicorn.error")

# Definición oficial del Catálogo según HU-05 y HU-06
CATALOGO_DEFINICION = [
    {
        "id": "vacaciones",
        "nombre": "Bono de Vacaciones",
        "porcentaje": 15.0,
        "categoria": "Descanso y Feriado Legal",
        "requisitos": "Feriado legal de al menos 10 días hábiles continuos acreditado por Decreto Alcaldicio.",
        "documentacion_requerida": "Decreto Alcaldicio de feriado legal (mínimo 10 días hábiles continuos digitalizado).",
        "regla_asignacion": "Asignación directa por administrador o bienal según decreto, sin solicitud obligatoria del socio.",
        "periodo_devengo": "Todo el año (períodos de feriado legal)",
        "permite_postulacion_socio": True,
        "icono": "palmtree",
    },
    {
        "id": "escolaridad",
        "nombre": "Bono de Escolaridad",
        "porcentaje": 8.0,
        "categoria": "Educación Familiar",
        "requisitos": "Hijos estudiantes en educación prebásica, básica, media o superior hasta 24 años de edad.",
        "documentacion_requerida": "Certificado de alumno regular vigente emitido por institución reconocida por el MINEDUC.",
        "regla_asignacion": "Postulación del socio con certificado. Se devenga durante la primera quincena de abril.",
        "periodo_devengo": "Primera quincena de abril",
        "permite_postulacion_socio": True,
        "icono": "graduation-cap",
    },
    {
        "id": "nacimiento",
        "nombre": "Bono de Nacimiento",
        "porcentaje": 20.0,
        "categoria": "Asignación Familiar",
        "requisitos": "Nacimiento de hijo o hija del socio afiliado.",
        "documentacion_requerida": "Certificado de nacimiento oficial emitido por el Servicio de Registro Civil e Identificación.",
        "regla_asignacion": "Postulación individual con presentación del certificado dentro del plazo reglamentario.",
        "periodo_devengo": "Acontecimiento del evento",
        "permite_postulacion_socio": True,
        "icono": "baby",
    },
    {
        "id": "fallecimiento_familiar",
        "nombre": "Bono por Fallecimiento de Familiar Directo",
        "porcentaje": 25.0,
        "categoria": "Duelo y Apoyo Familiar",
        "requisitos": "Fallecimiento de carga legal debidamente inscrita y reconocida por el Comité.",
        "documentacion_requerida": "Certificado de defunción de la carga legal debidamente reconocida.",
        "regla_asignacion": "Postulación del socio acreditando el vínculo legal.",
        "periodo_devengo": "Acontecimiento del evento",
        "permite_postulacion_socio": True,
        "icono": "heart-crack",
    },
    {
        "id": "fallecimiento_afiliado",
        "nombre": "Bono por Fallecimiento del Afiliado",
        "porcentaje": 50.0,
        "categoria": "Auxilio Póstumo",
        "requisitos": "Fallecimiento del socio funcionario. Liquidado a favor del beneficiario legal o familia directa.",
        "documentacion_requerida": "Certificado de defunción del socio funcionario y acreditación de heredero/beneficiario.",
        "regla_asignacion": "Validación directa de Administrador o Secretario a favor del beneficiario legal.",
        "periodo_devengo": "Acontecimiento del evento",
        "permite_postulacion_socio": True,
        "icono": "ribbon",
    },
    {
        "id": "enfermedad_catastrofica",
        "nombre": "Bono por Enfermedad Catastrófica",
        "porcentaje": 100.0,
        "categoria": "Salud de Alta Complejidad",
        "requisitos": "Diagnóstico de enfermedad catastrófica de alto costo del socio o sus cargas.",
        "documentacion_requerida": "Certificado o informe médico de médico especialista acreditando gravedad y carácter catastrófico.",
        "regla_asignacion": "Validación directa por el Administrador o Secretario.",
        "periodo_devengo": "Acontecimiento del evento",
        "permite_postulacion_socio": True,
        "icono": "stethoscope",
    },
    {
        "id": "catastrofe_siniestro",
        "nombre": "Bono por Catástrofe y Siniestros",
        "porcentaje": 50.0,
        "categoria": "Emergencia y Solidaridad",
        "requisitos": "Afectación grave de vivienda o enseres por incendios, temporales, terremoto u otros siniestros.",
        "documentacion_requerida": "Ficha Básica de Emergencia (FIBE) o informe técnico fundado de Bomberos o DIDECO.",
        "regla_asignacion": "Validación directa por el Administrador o Secretario.",
        "periodo_devengo": "Acontecimiento del evento",
        "permite_postulacion_socio": True,
        "icono": "flame",
    },
    # Bonos de Calendario (HU-06)
    {
        "id": "invierno",
        "nombre": "Bono de Invierno",
        "porcentaje": 15.0,
        "categoria": "Bono Periódico de Calendario",
        "requisitos": "Socio activo con permanencia mínima de 6 meses en el Comité de Bienestar.",
        "documentacion_requerida": "Proceso automatizado mediante Decreto Alcaldicio Marco y nómina de socios habilitados.",
        "regla_asignacion": "Liquidación masiva durante la última semana de julio. Emisión de cheques para Tesorería.",
        "periodo_devengo": "Última semana de julio",
        "permite_postulacion_socio": False,
        "icono": "snowflake",
    },
    {
        "id": "navidad",
        "nombre": "Bono de Navidad",
        "porcentaje": 12.5,  # Variable entre 10% y 15% según excedentes
        "categoria": "Bono Periódico de Calendario",
        "requisitos": "Socio activo con permanencia mínima de 6 meses. Porcentaje fijado por Directorio (10% a 15%).",
        "documentacion_requerida": "Acta de acuerdo de Directorio sobre excedentes presupuestarios y planilla de beneficiarios.",
        "regla_asignacion": "Liquidación masiva en diciembre con asignación de cheques y registro en Hoja de Beneficios individual.",
        "periodo_devengo": "Mes de diciembre",
        "permite_postulacion_socio": False,
        "icono": "gift",
    },
]


class BeneficiosService:
    @staticmethod
    async def get_sueldo_base_grado_15(db: AsyncSession) -> int:
        """Obtiene el sueldo imponible base de Grado 15 configurado en la base de datos."""
        param = await db.scalar(
            select(ParametroSistema).where(ParametroSistema.clave == "SUELDO_BASE_GRADO_15")
        )
        if param and param.valor.isdigit():
            return int(param.valor)
        return 750000  # Default referencial 2026

    @staticmethod
    async def get_porcentaje_navidad(db: AsyncSession) -> float:
        """Obtiene el porcentaje configurado por el Directorio para el Bono de Navidad (10% a 15%)."""
        param = await db.scalar(
            select(ParametroSistema).where(ParametroSistema.clave == "BONO_NAVIDAD_PORCENTAJE")
        )
        if param:
            try:
                val = float(param.valor)
                if 10.0 <= val <= 15.0:
                    return val
            except ValueError:
                pass
        return 12.5

    @classmethod
    async def get_catalogo(cls, db: AsyncSession) -> CatalogoBeneficiosResponse:
        """Genera el catálogo de beneficios con montos exactos actualizados al sueldo Grado 15."""
        base_g15 = await cls.get_sueldo_base_grado_15(db)
        porc_navidad = await cls.get_porcentaje_navidad(db)
        
        contingencia_items: List[BonoCatalogoItem] = []
        calendario_items: List[BonoCatalogoItem] = []
        
        for item in CATALOGO_DEFINICION:
            porc = item["porcentaje"]
            if item["id"] == "navidad":
                porc = porc_navidad
            
            monto_calc = int(round(base_g15 * (porc / 100.0)))
            bono_dto = BonoCatalogoItem(
                id=item["id"],
                nombre=item["nombre"],
                porcentaje=porc,
                monto_calculado=monto_calc,
                categoria=item["categoria"],
                requisitos=item["requisitos"],
                documentacion_requerida=item["documentacion_requerida"],
                regla_asignacion=item["regla_asignacion"],
                periodo_devengo=item.get("periodo_devengo"),
                permite_postulacion_socio=item["permite_postulacion_socio"],
                icono=item["icono"],
            )
            
            if item["id"] in ["invierno", "navidad"]:
                calendario_items.append(bono_dto)
            else:
                contingencia_items.append(bono_dto)
                
        return CatalogoBeneficiosResponse(
            sueldo_base_grado_15=base_g15,
            fecha_actualizacion=datetime.now().strftime("%d-%m-%Y"),
            bonos_contingencia=contingencia_items,
            bonos_calendario=calendario_items,
        )

    @staticmethod
    def verificar_antiguedad_socio(user: User) -> Tuple[bool, int, str]:
        """
        Valida que el socio tenga al menos 6 meses de permanencia en el Comité.
        Retorna: (cumple, meses, texto_explicativo)
        """
        meses = getattr(user, "meses_antiguedad", 12) or 12
        cumple = meses >= 6
        if cumple:
            return True, meses, f"Cumple antigüedad ({user.antiguedad or f'{meses} Meses'})"
        else:
            return False, meses, f"No cumple requisito mínimo de 6 meses (antigüedad actual: {user.antiguedad or f'{meses} Meses'})"

    @classmethod
    async def postular_beneficio(
        cls, db: AsyncSession, user: User, payload: PostulacionBeneficioCreate
    ) -> SolicitudBeneficio:
        """
        HU-05: Postulación de bonos por contingencia/evento con cálculo sobre Grado 15
        y validación estricta de permanencia mínima de 6 meses.
        """
        # 1. Validar permanencia mínima de 6 meses
        cumple, meses, motivo_ant = cls.verificar_antiguedad_socio(user)
        if not cumple:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Requisito no cumplido: Para postular a beneficios sociales debe contar con al menos 6 meses de permanencia en el Comité de Bienestar. ({motivo_ant})",
            )
        
        # 2. Localizar definición del bono
        bono_def = next((b for b in CATALOGO_DEFINICION if b["id"] == payload.tipo_bono), None)
        if not bono_def:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"El tipo de beneficio '{payload.tipo_bono}' no es válido en el catálogo.",
            )
        
        base_g15 = await cls.get_sueldo_base_grado_15(db)
        porcentaje = bono_def["porcentaje"]
        
        # Si es escolaridad, validar edad y nombre de estudiante
        if payload.tipo_bono == "escolaridad":
            if payload.edad_estudiante and payload.edad_estudiante > 24:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El Bono de Escolaridad aplica exclusivamente para hijos estudiantes de hasta 24 años de edad.",
                )
        
        # Si es vacaciones vía formulario de socio
        if payload.tipo_bono == "vacaciones":
            if payload.dias_habiles_feriado and payload.dias_habiles_feriado < 10:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El Bono de Vacaciones requiere un feriado legal continuo mínimo de 10 días hábiles respaldado por Decreto Alcaldicio.",
                )

        monto = int(round(base_g15 * (porcentaje / 100.0)))
        
        solicitud = SolicitudBeneficio(
            socio_id=user.id,
            tipo_bono=payload.tipo_bono,
            titulo_bono=bono_def["nombre"],
            porcentaje_base=porcentaje,
            sueldo_base_referencia=base_g15,
            monto_calculado=monto,
            estado="PENDIENTE",
            motivo=payload.motivo,
            documento_tipo=payload.documento_tipo or bono_def["documentacion_requerida"],
            documento_nombre=payload.documento_nombre or f"{payload.tipo_bono}_{user.rut}.pdf",
            documento_url=payload.documento_url or f"/docs/postulaciones/{payload.tipo_bono}_{user.id}.pdf",
            decreto_numero=payload.decreto_numero,
            decreto_fecha=payload.decreto_fecha,
            dias_habiles_feriado=payload.dias_habiles_feriado,
            nombre_beneficiario=payload.nombre_beneficiario,
            rut_beneficiario=payload.rut_beneficiario,
            institucion_educacional=payload.institucion_educacional,
            nivel_educacional=payload.nivel_educacional,
            edad_estudiante=payload.edad_estudiante,
            asignacion_directa=False,
        )
        
        db.add(solicitud)
        await db.commit()
        await db.refresh(solicitud)
        return solicitud

    @classmethod
    async def asignar_directamente_vacaciones(
        cls, db: AsyncSession, admin_user: User, payload: AsignacionDirectaVacacionesCreate
    ) -> SolicitudBeneficio:
        """
        HU-05 & Escenario 3: Asignación directa del Bono de Vacaciones (15% de Grado 15)
        sin requerir postulación del socio, acreditando feriado legal >= 10 días hábiles por Decreto Alcaldicio.
        """
        socio = await db.get(User, payload.socio_id)
        if not socio:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Socio no encontrado.")
        
        cumple, meses, motivo_ant = cls.verificar_antiguedad_socio(socio)
        if not cumple:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El socio no cumple con el requisito de 6 meses de permanencia. ({motivo_ant})",
            )
        
        if payload.dias_habiles_feriado < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El Bono de Vacaciones exige un mínimo de 10 días hábiles continuos de feriado legal.",
            )
        
        base_g15 = await cls.get_sueldo_base_grado_15(db)
        porcentaje = 15.0
        monto = int(round(base_g15 * (porcentaje / 100.0)))
        
        ahora = datetime.now(timezone.utc)
        
        # Asignación directa automática: se genera directamente aprobada/liquidada
        solicitud = SolicitudBeneficio(
            socio_id=socio.id,
            tipo_bono="vacaciones",
            titulo_bono="Bono de Vacaciones",
            porcentaje_base=porcentaje,
            sueldo_base_referencia=base_g15,
            monto_calculado=monto,
            estado="LIQUIDADO" if payload.numero_cheque else "APROBADO",
            motivo=f"Asignación directa por Decreto Alcaldicio N° {payload.decreto_numero} ({payload.dias_habiles_feriado} días hábiles)",
            documento_tipo="Decreto Alcaldicio de Feriado Legal",
            documento_nombre=payload.documento_nombre,
            documento_url=payload.documento_url,
            decreto_numero=payload.decreto_numero,
            decreto_fecha=payload.decreto_fecha,
            dias_habiles_feriado=payload.dias_habiles_feriado,
            asignacion_directa=True,
            observaciones_admin=payload.observaciones or "Asignación directa procesada por administración municipal.",
            revisado_por_id=admin_user.id,
            fecha_revision=ahora,
            metodo_pago=payload.metodo_pago,
            numero_cheque=payload.numero_cheque,
            banco_emisor=payload.banco or "BancoEstado",
            fecha_liquidacion=ahora if payload.numero_cheque else None,
            liquidado_por_id=admin_user.id if payload.numero_cheque else None,
        )
        
        db.add(solicitud)
        await db.commit()
        await db.refresh(solicitud)
        return solicitud

    @classmethod
    async def validar_o_liquidar(
        cls, db: AsyncSession, admin_user: User, solicitud_id: int, payload: ValidarSolicitudRequest
    ) -> SolicitudBeneficio:
        """
        Permite a directiva/administrador validar, aprobar, rechazar o liquidar (emitiendo cheque)
        una postulación individual.
        """
        solicitud = await db.get(SolicitudBeneficio, solicitud_id)
        if not solicitud:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada.")
        
        ahora = datetime.now(timezone.utc)
        accion = payload.accion.upper()
        
        if accion == "APROBAR":
            solicitud.estado = "APROBADO"
            solicitud.revisado_por_id = admin_user.id
            solicitud.fecha_revision = ahora
            solicitud.observaciones_admin = payload.observaciones
            solicitud.motivo_rechazo = None
            
        elif accion == "RECHAZAR":
            solicitud.estado = "RECHAZADO"
            solicitud.revisado_por_id = admin_user.id
            solicitud.fecha_revision = ahora
            solicitud.motivo_rechazo = payload.motivo_rechazo or "No cumple con las bases del Comité."
            solicitud.observaciones_admin = payload.observaciones
            
        elif accion == "LIQUIDAR":
            solicitud.estado = "LIQUIDADO"
            solicitud.liquidado_por_id = admin_user.id
            solicitud.fecha_liquidacion = ahora
            solicitud.metodo_pago = payload.metodo_pago or "Cheque"
            solicitud.numero_cheque = payload.numero_cheque
            solicitud.banco_emisor = payload.banco or "BancoEstado"
            if payload.observaciones:
                solicitud.observaciones_admin = (solicitud.observaciones_admin or "") + f" | Liquidación: {payload.observaciones}"
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Acción '{payload.accion}' inválida.")
            
        await db.commit()
        await db.refresh(solicitud)
        return solicitud

    @classmethod
    async def simular_nomina_masiva(
        cls, db: AsyncSession, req: SimularNominaRequest
    ) -> SimularNominaResponse:
        """
        HU-06: Simula la nómina de bonos de calendario (Invierno 15% o Navidad 10%-15%),
        filtrando automáticamente socios activos con >= 6 meses de permanencia.
        """
        base_g15 = await cls.get_sueldo_base_grado_15(db)
        
        # Validar porcentaje
        if req.tipo_bono == "invierno":
            porcentaje = 15.0
            titulo = f"Nómina Masiva Bono de Invierno - {req.periodo}"
            decreto_default = req.decreto_marco or "DEC-ALC-774/2026 (Bono Invierno Municipal)"
        elif req.tipo_bono == "navidad":
            porcentaje = req.porcentaje if req.porcentaje is not None else await cls.get_porcentaje_navidad(db)
            if not (10.0 <= porcentaje <= 15.0):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El porcentaje del Bono de Navidad debe ser fijado por el Directorio entre un 10% y un 15% según excedentes.",
                )
            titulo = f"Nómina Masiva Bono de Navidad ({porcentaje}%) - {req.periodo}"
            decreto_default = req.decreto_marco or "DEC-ALC-1290/2026 (Acuerdo Presupuestario Navidad)"
        else:
            porcentaje = 15.0
            titulo = f"Nómina Masiva Bono de Vacaciones - {req.periodo}"
            decreto_default = req.decreto_marco or "DEC-ALC-080/2026"
            
        monto_unitario = int(round(base_g15 * (porcentaje / 100.0)))
        
        # Obtener todos los socios activos
        usuarios = (await db.scalars(select(User).where(User.is_active == True).order_by(User.id))).all()
        
        items: List[SimularNominaItem] = []
        beneficiados = 0
        excluidos = 0
        correlativo_cheque = 901001
        
        for u in usuarios:
            cumple, meses, motivo = cls.verificar_antiguedad_socio(u)
            if cumple:
                beneficiados += 1
                items.append(
                    SimularNominaItem(
                        socio_id=u.id,
                        rut=u.rut,
                        nombre_completo=u.nombre_completo,
                        departamento=u.departamento,
                        antiguedad_texto=u.antiguedad or f"{meses} Meses",
                        antiguedad_meses=meses,
                        cumple_antiguedad=True,
                        monto=monto_unitario,
                        decreto_asociado=decreto_default,
                        decreto_digital_url=f"/docs/decretos/{req.tipo_bono}_{req.periodo.replace(' ', '_')}.pdf",
                        numero_cheque_sugerido=f"CHQ-{correlativo_cheque}",
                    )
                )
                correlativo_cheque += 1
            else:
                excluidos += 1
                items.append(
                    SimularNominaItem(
                        socio_id=u.id,
                        rut=u.rut,
                        nombre_completo=u.nombre_completo,
                        departamento=u.departamento,
                        antiguedad_texto=u.antiguedad or f"{meses} Meses",
                        antiguedad_meses=meses,
                        cumple_antiguedad=False,
                        motivo_exclusion=motivo,
                        monto=0,
                        decreto_asociado=None,
                        numero_cheque_sugerido=None,
                    )
                )
                
        total_requerido = beneficiados * monto_unitario
        
        return SimularNominaResponse(
            tipo_bono=req.tipo_bono,
            titulo=titulo,
            periodo=req.periodo,
            porcentaje_aplicado=porcentaje,
            sueldo_base_utilizado=base_g15,
            monto_unitario=monto_unitario,
            total_socios_evaluados=len(usuarios),
            total_socios_beneficiados=beneficiados,
            total_socios_excluidos=excluidos,
            monto_total_requerido=total_requerido,
            decreto_marco=decreto_default,
            items=items,
        )

    @classmethod
    async def ejecutar_nomina_masiva(
        cls, db: AsyncSession, admin_user: User, req: EjecutarNominaRequest
    ) -> NominaMasiva:
        """
        HU-06: Ejecuta y formaliza la nómina masiva, generando:
        1. Registro de nómina para Tesorería con números de cheque asignados.
        2. Registro automático en la Hoja de Beneficios individual de cada socio habilitado.
        """
        base_g15 = await cls.get_sueldo_base_grado_15(db)
        monto_unitario = int(round(base_g15 * (req.porcentaje / 100.0)))
        
        beneficiados = [d for d in req.detalles if d.cumple_antiguedad]
        excluidos = [d for d in req.detalles if not d.cumple_antiguedad]
        total_monto = len(beneficiados) * monto_unitario
        
        nomina = NominaMasiva(
            tipo_bono=req.tipo_bono,
            titulo=req.titulo,
            periodo=req.periodo,
            porcentaje=req.porcentaje,
            sueldo_base_utilizado=base_g15,
            monto_unitario=monto_unitario,
            total_socios_evaluados=len(req.detalles),
            total_socios_beneficiados=len(beneficiados),
            total_socios_excluidos=len(excluidos),
            monto_total_liquidado=total_monto,
            estado="APROBADA_TESORERIA",
            decreto_marco=req.decreto_marco,
            acuerdo_directorio_acta=req.acuerdo_directorio_acta or "Acta N° 04/2026 Directorio Bienestar",
            creado_por_id=admin_user.id,
        )
        db.add(nomina)
        await db.flush()  # Para obtener nomina.id
        
        ahora = datetime.now(timezone.utc)
        
        # Crear los detalles y registrar en Hoja de Beneficios individual
        for d in req.detalles:
            detalle = DetalleNominaMasiva(
                nomina_id=nomina.id,
                socio_id=d.socio_id,
                rut=d.rut,
                nombre_completo=d.nombre_completo,
                departamento=d.departamento,
                antiguedad_texto=d.antiguedad_texto,
                antiguedad_meses=d.antiguedad_meses,
                cumple_antiguedad=d.cumple_antiguedad,
                motivo_exclusion=d.motivo_exclusion,
                monto=d.monto if d.cumple_antiguedad else 0,
                decreto_asociado=d.decreto_asociado,
                decreto_digital_url=d.decreto_digital_url,
                metodo_pago="Cheque",
                numero_cheque=d.numero_cheque_sugerido if d.cumple_antiguedad else None,
                banco=req.banco_emisor,
                estado_pago="EMITIDO" if d.cumple_antiguedad else "EXCLUIDO",
            )
            db.add(detalle)
            
            # Registrar en la Hoja de Beneficios individual (SolicitudBeneficio) si cumple
            if d.cumple_antiguedad and d.socio_id:
                db.add(
                    SolicitudBeneficio(
                        socio_id=d.socio_id,
                        tipo_bono=req.tipo_bono,
                        titulo_bono=f"Bono de {req.tipo_bono.capitalize()} ({req.periodo})",
                        porcentaje_base=req.porcentaje,
                        sueldo_base_referencia=base_g15,
                        monto_calculado=d.monto,
                        estado="LIQUIDADO",
                        motivo=f"Liquidación masiva de calendario {req.periodo}. Formalizado mediante {req.decreto_marco or 'Decreto Alcaldicio'}.",
                        documento_tipo="Decreto Alcaldicio Marco y Nómina Masiva",
                        documento_nombre=f"Decreto_{req.tipo_bono}_{req.periodo.replace(' ', '_')}.pdf",
                        documento_url=d.decreto_digital_url,
                        decreto_numero=req.decreto_marco,
                        decreto_fecha=ahora.strftime("%Y-%m-%d"),
                        asignacion_directa=True,
                        revisado_por_id=admin_user.id,
                        fecha_revision=ahora,
                        metodo_pago="Cheque",
                        numero_cheque=d.numero_cheque_sugerido,
                        banco_emisor=req.banco_emisor,
                        fecha_liquidacion=ahora,
                        liquidado_por_id=admin_user.id,
                    )
                )
                
        await db.commit()
        await db.refresh(nomina)
        return nomina

    @classmethod
    async def procesar_planilla_excel(
        cls, db: AsyncSession, csv_text: str
    ) -> List[SimularNominaItem]:
        """
        HU-06: Procesa la carga de planilla Excel / CSV con RUN, Nombres, Apellidos y Decreto Asociado.
        Asocia decretos digitalizados e identifica socios en el sistema validando antigüedad.
        """
        base_g15 = await cls.get_sueldo_base_grado_15(db)
        reader = csv.DictReader(io.StringIO(csv_text))
        
        # Mapear socios existentes por RUT normalizado
        usuarios = (await db.scalars(select(User))).all()
        usuarios_map = {
            u.rut.replace(".", "").replace("-", "").upper().strip(): u for u in usuarios
        }
        
        items_procesados: List[SimularNominaItem] = []
        correlativo_cheque = 902001
        
        for row in reader:
            # Obtener datos de fila
            rut_raw = row.get("RUN") or row.get("rut") or row.get("RUT") or ""
            nombres = row.get("Nombres") or row.get("nombres") or ""
            apellidos = row.get("Apellidos") or row.get("apellidos") or ""
            nombre_completo = f"{nombres} {apellidos}".strip() or "Socio Municipal"
            decreto = row.get("Decreto") or row.get("decreto_asociado") or "DEC-ALC-PERIODO/2026"
            
            rut_norm = rut_raw.replace(".", "").replace("-", "").upper().strip()
            user = usuarios_map.get(rut_norm)
            
            if user:
                cumple, meses, motivo = cls.verificar_antiguedad_socio(user)
                monto = int(round(base_g15 * 0.15)) if cumple else 0
                items_procesados.append(
                    SimularNominaItem(
                        socio_id=user.id,
                        rut=user.rut,
                        nombre_completo=user.nombre_completo,
                        departamento=user.departamento,
                        antiguedad_texto=user.antiguedad or f"{meses} Meses",
                        antiguedad_meses=meses,
                        cumple_antiguedad=cumple,
                        motivo_exclusion=None if cumple else motivo,
                        monto=monto,
                        decreto_asociado=decreto,
                        decreto_digital_url=f"/docs/decretos/{rut_norm}_{decreto.replace('/', '_')}.pdf",
                        numero_cheque_sugerido=f"CHQ-{correlativo_cheque}" if cumple else None,
                    )
                )
                if cumple:
                    correlativo_cheque += 1
            else:
                # Socio informado en planilla pero no registrado en BD: se reporta con alerta
                items_procesados.append(
                    SimularNominaItem(
                        socio_id=0,
                        rut=rut_raw,
                        nombre_completo=nombre_completo,
                        departamento="Personal Externo / Sin Ficha",
                        antiguedad_texto="No registra ficha",
                        antiguedad_meses=0,
                        cumple_antiguedad=False,
                        motivo_exclusion="RUT no figura registrado en el padrón de socios del Comité.",
                        monto=0,
                        decreto_asociado=decreto,
                        decreto_digital_url=f"/docs/decretos/{rut_norm}_{decreto.replace('/', '_')}.pdf",
                        numero_cheque_sugerido=None,
                    )
                )
                
        return items_procesados
