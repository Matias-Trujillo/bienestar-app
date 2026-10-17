"""Creación de tablas, migraciones seguras y carga inicial de usuarios y parámetros."""
import logging
from datetime import datetime, timezone
from sqlalchemy import select, text

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal, engine
from app.models import (
    Base,
    User,
    UserRole,
    ParametroSistema,
    SolicitudBeneficio,
    NominaMasiva,
    DetalleNominaMasiva,
)

logger = logging.getLogger("uvicorn.error")

# Credenciales y usuarios semilla del sistema
SEED_USERS = [
    dict(rut="11.111.111-1", email="superadmin@mperalillo.cl", nombre_completo="Super Administrador",
         password="Super#2026", rol=UserRole.SUPERUSUARIO, is_superuser=True,
         departamento="Soporte TI", antiguedad="10 Años", meses_antiguedad=120, cargas_registradas=0),
    dict(rut="12.345.678-9", email="msoto@mperalillo.cl", nombre_completo="María Elena Soto",
         password="Presi#2026", rol=UserRole.PRESIDENTE,
         departamento="Directiva de Bienestar", antiguedad="9 Años", meses_antiguedad=108,
         saldo_salud_disponible=220000, cargas_registradas=1),
    dict(rut="13.456.789-0", email="pfuentes@mperalillo.cl", nombre_completo="Patricia Fuentes R.",
         password="Secre#2026", rol=UserRole.SECRETARIO,
         departamento="Directiva de Bienestar", antiguedad="7 Años", meses_antiguedad=84,
         saldo_salud_disponible=210000, cargas_registradas=2),
    dict(rut="14.982.112-4", email="rmorales@mperalillo.cl", nombre_completo="Roberto Morales P.",
         password="Teso#2026", rol=UserRole.TESORERO,
         departamento="Finanzas Municipales", antiguedad="6 Años", meses_antiguedad=72,
         saldo_salud_disponible=195000, cargas_registradas=3),
    dict(rut="16.234.567-8", email="jcontreras@mperalillo.cl", nombre_completo="Jorge Contreras L.",
         password="Admin#2026", rol=UserRole.ADMIN,
         departamento="Administración Municipal", antiguedad="4 Años", meses_antiguedad=48,
         saldo_salud_disponible=230000, cargas_registradas=1),
    dict(rut="17.345.678-K", email="aibarra@mperalillo.cl", nombre_completo="Andrea Ibarra V.",
         password="Audit#2026", rol=UserRole.AUDITOR,
         departamento="Comisión Revisora de Cuentas", antiguedad="3 Años", meses_antiguedad=36,
         saldo_salud_disponible=240000, cargas_registradas=0),
    dict(rut="15.489.123-K", email="cvalenzuela@mperalillo.cl", nombre_completo="Carlos Valenzuela M.",
         password="Socio#2026", rol=UserRole.SOCIO,
         departamento="DIDECO", antiguedad="5 Años, 4 Meses", meses_antiguedad=64,
         saldo_salud_disponible=150000, cargas_registradas=2),
    # Socio nuevo con < 6 meses para validar HU-05 y HU-06
    dict(rut="19.876.543-2", email="fmorales@mperalillo.cl", nombre_completo="Felipe Morales Sandoval",
         password="Socio#2026", rol=UserRole.SOCIO,
         departamento="Obras Municipales", antiguedad="3 Meses", meses_antiguedad=3,
         saldo_salud_disponible=250000, cargas_registradas=0),
    # Socia con > 6 meses
    dict(rut="18.765.432-1", email="jherrera@mperalillo.cl", nombre_completo="Javiera Herrera Tapia",
         password="Socio#2026", rol=UserRole.SOCIO,
         departamento="Secretaría Municipal", antiguedad="1 Año, 2 Meses", meses_antiguedad=14,
         saldo_salud_disponible=200000, cargas_registradas=1),
]

SEED_PARAMETROS = [
    {"clave": "SUELDO_BASE_GRADO_15", "valor": "750000", "descripcion": "Sueldo imponible de referencia Grado 15 (CLP)"},
    {"clave": "BONO_NAVIDAD_PORCENTAJE", "valor": "12.5", "descripcion": "Porcentaje definido por Directorio para Bono Navidad (10% a 15%)"},
    {"clave": "BONO_INVIERNO_PORCENTAJE", "valor": "15.0", "descripcion": "Porcentaje para Bono de Invierno (15%)"},
    {"clave": "BONO_VACACIONES_PORCENTAJE", "valor": "15.0", "descripcion": "Porcentaje para Bono de Vacaciones (15%)"},
    {"clave": "BONO_ESCOLARIDAD_PORCENTAJE", "valor": "8.0", "descripcion": "Porcentaje para Bono de Escolaridad (8%)"},
    {"clave": "BONO_NACIMIENTO_PORCENTAJE", "valor": "20.0", "descripcion": "Porcentaje para Bono de Nacimiento (20%)"},
    {"clave": "BONO_FALLECIMIENTO_FAMILIAR_PORCENTAJE", "valor": "25.0", "descripcion": "Porcentaje Fallecimiento Familiar Directo (25%)"},
    {"clave": "BONO_FALLECIMIENTO_AFILIADO_PORCENTAJE", "valor": "50.0", "descripcion": "Porcentaje Fallecimiento del Afiliado (50%)"},
    {"clave": "BONO_ENFERMEDAD_CATASTROFICA_PORCENTAJE", "valor": "100.0", "descripcion": "Porcentaje Bono Enfermedad Catastrófica (100%)"},
    {"clave": "BONO_CATASTROFE_SINIESTRO_PORCENTAJE", "valor": "50.0", "descripcion": "Porcentaje Bono Catástrofe y Siniestros (50%)"},
]


async def init_db() -> None:
    async with engine.begin() as conn:
        # Migración no destructiva si la columna meses_antiguedad no existe
        await conn.execute(text("ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS meses_antiguedad INTEGER DEFAULT 12;"))
        # Crear tablas nuevas si no existen
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. Cargar Usuarios
        for data in SEED_USERS:
            exists = await db.scalar(select(User).where(User.email == data["email"]))
            if exists:
                if not hasattr(exists, "meses_antiguedad") or exists.meses_antiguedad is None:
                    exists.meses_antiguedad = data.get("meses_antiguedad", 12)
                continue
            data = dict(data)
            password = data.pop("password")
            db.add(User(hashed_password=get_password_hash(password), **data))
            logger.info("Usuario semilla creado: %s (%s)", data["email"], data["rol"].value)
        await db.commit()

        # 2. Cargar Parámetros de Sistema
        for param in SEED_PARAMETROS:
            p_exists = await db.scalar(select(ParametroSistema).where(ParametroSistema.clave == param["clave"]))
            if not p_exists:
                db.add(ParametroSistema(**param))
        await db.commit()

        # 3. Cargar Solicitudes Iniciales de Ejemplo para Demostración HU-05 y Hoja de Beneficios
        carlos = await db.scalar(select(User).where(User.email == "cvalenzuela@mperalillo.cl"))
        admin = await db.scalar(select(User).where(User.rol == UserRole.ADMIN))
        tesorero = await db.scalar(select(User).where(User.rol == UserRole.TESORERO))

        if carlos:
            # Comprobar si ya tiene beneficios cargados
            beneficios_count = await db.scalar(
                select(SolicitudBeneficio).where(SolicitudBeneficio.socio_id == carlos.id)
            )
            if not beneficios_count:
                # 1. Bono de Vacaciones: Asignación directa con Decreto Alcaldicio >= 10 días
                db.add(SolicitudBeneficio(
                    socio_id=carlos.id,
                    tipo_bono="vacaciones",
                    titulo_bono="Bono de Vacaciones",
                    porcentaje_base=15.0,
                    sueldo_base_referencia=750000,
                    monto_calculado=112500,
                    estado="LIQUIDADO",
                    motivo="Feriado legal de verano correspondiente a período 2025-2026",
                    documento_tipo="Decreto Alcaldicio",
                    documento_nombre="Decreto_Alcaldicio_1042_FeriadoLegal.pdf",
                    documento_url="/docs/decretos/DEC-1042-2026.pdf",
                    decreto_numero="DEC-ALC-1042/2026",
                    decreto_fecha="2026-01-15",
                    dias_habiles_feriado=15,
                    asignacion_directa=True,
                    observaciones_admin="Validado feriado legal por 15 días hábiles continuos. Asignación directa según nómina de personal municipal.",
                    revisado_por_id=admin.id if admin else None,
                    fecha_revision=datetime(2026, 1, 16, 10, 0, tzinfo=timezone.utc),
                    metodo_pago="Cheque",
                    numero_cheque="CHQ-884122",
                    banco_emisor="BancoEstado",
                    fecha_liquidacion=datetime(2026, 1, 20, 12, 30, tzinfo=timezone.utc),
                    liquidado_por_id=tesorero.id if tesorero else None,
                ))

                # 2. Bono de Escolaridad: Postulación aprobada devengada en abril
                db.add(SolicitudBeneficio(
                    socio_id=carlos.id,
                    tipo_bono="escolaridad",
                    titulo_bono="Bono de Escolaridad",
                    porcentaje_base=8.0,
                    sueldo_base_referencia=750000,
                    monto_calculado=60000,
                    estado="APROBADO",
                    motivo="Estudios de enseñanza básica - Hija Valentina Valenzuela",
                    documento_tipo="Certificado de Alumno Regular Vigente",
                    documento_nombre="Certificado_Alumno_Regular_Valentina_2026.pdf",
                    documento_url="/docs/certificados/CAR-Valentina-2026.pdf",
                    nombre_beneficiario="Valentina Valenzuela P.",
                    rut_beneficiario="24.512.980-3",
                    institucion_educacional="Colegio Básico Municipal Peralillo",
                    nivel_educacional="Básica",
                    edad_estudiante=7,
                    asignacion_directa=False,
                    observaciones_admin="Certificado de alumno regular verificado y conforme. Pasa a nómina de pago primera quincena de abril.",
                    revisado_por_id=admin.id if admin else None,
                    fecha_revision=datetime(2026, 4, 2, 11, 15, tzinfo=timezone.utc),
                ))

                # 3. Bono de Nacimiento: Liquidado anteriormente
                db.add(SolicitudBeneficio(
                    socio_id=carlos.id,
                    tipo_bono="nacimiento",
                    titulo_bono="Bono de Nacimiento",
                    porcentaje_base=20.0,
                    sueldo_base_referencia=750000,
                    monto_calculado=150000,
                    estado="LIQUIDADO",
                    motivo="Nacimiento hijo Matías Valenzuela",
                    documento_tipo="Certificado de Nacimiento Registro Civil",
                    documento_nombre="Certificado_Nacimiento_Matias.pdf",
                    documento_url="/docs/certificados/CN-Matias.pdf",
                    nombre_beneficiario="Matías Valenzuela P.",
                    rut_beneficiario="25.109.876-1",
                    asignacion_directa=False,
                    observaciones_admin="Partida de nacimiento verificada con Registro Civil.",
                    revisado_por_id=admin.id if admin else None,
                    fecha_revision=datetime(2025, 11, 5, 9, 30, tzinfo=timezone.utc),
                    metodo_pago="Transferencia",
                    numero_cheque="TRF-0994103",
                    banco_emisor="BancoEstado - Cta Rut",
                    fecha_liquidacion=datetime(2025, 11, 8, 14, 0, tzinfo=timezone.utc),
                    liquidado_por_id=tesorero.id if tesorero else None,
                ))

                # 4. Bono Catástrofe / Siniestros: En revisión con FIBE
                db.add(SolicitudBeneficio(
                    socio_id=carlos.id,
                    tipo_bono="catastrofe_siniestro",
                    titulo_bono="Bono por Catástrofe y Siniestros",
                    porcentaje_base=50.0,
                    sueldo_base_referencia=750000,
                    monto_calculado=375000,
                    estado="PENDIENTE",
                    motivo="Daños en techumbre y filtraciones severas por temporal invernal",
                    documento_tipo="Ficha Básica de Emergencia (FIBE)",
                    documento_nombre="FIBE_InformeTecnico_Bomberos_Peralillo.pdf",
                    documento_url="/docs/fibe/FIBE-2026-Peralillo-CV.pdf",
                    asignacion_directa=False,
                    observaciones_admin="Pendiente de ratificación por parte del Secretario y Administrador Municipal.",
                ))

                await db.commit()
                logger.info("Beneficios iniciales creados para Carlos Valenzuela")
