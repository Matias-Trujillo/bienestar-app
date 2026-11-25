"""Creación de tablas, migraciones seguras y carga inicial de usuarios y parámetros."""
import logging
from datetime import date, datetime, timezone
from sqlalchemy import select, text, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.db.session import AsyncSessionLocal, engine
from app.models import (
    Base,
    User,
    UserRole,
    AuditLog,
    ParametroSistema,
    BonoCatalogo,
    SolicitudBeneficio,
    NominaMasiva,
    DetalleNominaMasiva,
)

logger = logging.getLogger("uvicorn.error")

# Credenciales y usuarios semilla del sistema (RUTs normalizados con Módulo 11)
SEED_USERS = [
    dict(rut="11.111.111-1", email="superadmin@mperalillo.cl", nombre_completo="Super Administrador",
         password="Super#2026", rol=UserRole.SUPERUSUARIO, is_superuser=True,
         departamento="Soporte TI", antiguedad="10 Años", meses_antiguedad=120, cargas_registradas=0),
    dict(rut="12.345.678-5", email="msoto@mperalillo.cl", nombre_completo="María Elena Soto",
         password="Presi#2026", rol=UserRole.PRESIDENTE,
         departamento="Directiva de Bienestar", antiguedad="9 Años", meses_antiguedad=108,
         saldo_salud_disponible=150000, cargas_registradas=0),
    dict(rut="13.456.789-9", email="pfuentes@mperalillo.cl", nombre_completo="Patricia Fuentes R.",
         password="Secre#2026", rol=UserRole.SECRETARIO,
         departamento="Directiva de Bienestar", antiguedad="7 Años", meses_antiguedad=84,
         saldo_salud_disponible=150000, cargas_registradas=0),
    dict(rut="14.982.112-0", email="rmorales@mperalillo.cl", nombre_completo="Roberto Morales P.",
         password="Teso#2026", rol=UserRole.TESORERO,
         departamento="Finanzas Municipales", antiguedad="6 Años", meses_antiguedad=72,
         saldo_salud_disponible=150000, cargas_registradas=0),
    dict(rut="16.234.567-2", email="jcontreras@mperalillo.cl", nombre_completo="Jorge Contreras L.",
         password="Admin#2026", rol=UserRole.ADMIN,
         departamento="Administración Municipal", antiguedad="4 Años", meses_antiguedad=48,
         saldo_salud_disponible=150000, cargas_registradas=0),
    dict(rut="17.345.678-6", email="aibarra@mperalillo.cl", nombre_completo="Andrea Ibarra V.",
         password="Audit#2026", rol=UserRole.AUDITOR,
         departamento="Comisión Revisora de Cuentas", antiguedad="3 Años", meses_antiguedad=36,
         saldo_salud_disponible=150000, cargas_registradas=0),
    dict(rut="15.489.123-4", email="cvalenzuela@mperalillo.cl", nombre_completo="Carlos Valenzuela M.",
         password="Socio#2026", rol=UserRole.SOCIO,
         departamento="DIDECO", antiguedad="5 Años, 4 Meses", meses_antiguedad=64,
         saldo_salud_disponible=150000, saldo_salud_total_anual=150000, cargas_registradas=0),
    dict(rut="18.567.890-3", email="faraya@mperalillo.cl", nombre_completo="Felipe Araya M. (> 6 meses)",
         password="Socio#2026", rol=UserRole.SOCIO,
         departamento="Obras Municipales", antiguedad="1 Año, 4 Meses", meses_antiguedad=16,
         saldo_salud_disponible=150000, saldo_salud_total_anual=150000, cargas_registradas=0),
    dict(rut="19.876.543-0", email="fsepulveda@mperalillo.cl", nombre_completo="Francisca Sepúlveda T. (< 6 meses)",
         password="Socio#2026", rol=UserRole.SOCIO,
         departamento="Secretaría Municipal", antiguedad="3 Meses", meses_antiguedad=3,
         saldo_salud_disponible=150000, saldo_salud_total_anual=150000, cargas_registradas=0),
    # Socia con > 6 meses
    dict(rut="18.765.432-7", email="jherrera@mperalillo.cl", nombre_completo="Javiera Herrera Tapia",
         password="Socio#2026", rol=UserRole.SOCIO,
         departamento="Secretaría Municipal", antiguedad="1 Año, 2 Meses", meses_antiguedad=14,
         saldo_salud_disponible=150000, saldo_salud_total_anual=150000, cargas_registradas=0),
    # Socia Javiera Rivera con 0 meses (caso de prueba de carencia inmediata)
    dict(rut="19.188.436-1", email="riverajavieraa@gmail.com", nombre_completo="Javiera Rivera Arraño",
         password="Socio#2026", rol=UserRole.SOCIO,
         departamento="Secretaría Municipal", antiguedad="0 Meses", meses_antiguedad=0,
         saldo_salud_disponible=150000, saldo_salud_total_anual=150000, cargas_registradas=0),
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


async def _sincronizar_usuario_semilla(
    db: AsyncSession,
    exists: User,
    data: dict,
) -> None:
    """Sincroniza atributos canónicos y, en entornos de desarrollo o pruebas compartidas, garantiza acceso con credenciales semilla."""
    cambiado = False

    if not hasattr(exists, "meses_antiguedad") or exists.meses_antiguedad is None:
        exists.meses_antiguedad = data.get("meses_antiguedad", 12)
        cambiado = True

    if exists.rut != data["rut"]:
        colision = await db.scalar(
            select(User.id).where(User.rut == data["rut"], User.id != exists.id)
        )
        if not colision:
            logger.info(
                "Sincronizando RUT Módulo 11 de %s: %s -> %s",
                exists.email,
                exists.rut,
                data["rut"],
            )
            exists.rut = data["rut"]
            cambiado = True

    if settings.ENVIRONMENT == "development" or settings.SEED_ENSURE_DEFAULT_ACCESS:
        if not exists.is_active:
            exists.is_active = True
            cambiado = True
        if (
            exists.password_bloqueada
            or (exists.intentos_fallidos or 0) > 0
            or exists.debe_cambiar_password
        ):
            exists.password_bloqueada = False
            exists.intentos_fallidos = 0
            exists.debe_cambiar_password = False
            cambiado = True
        if not verify_password(data["password"], exists.hashed_password):
            logger.info("Restaurando clave canónica de cuenta semilla %s.", exists.email)
            exists.hashed_password = get_password_hash(data["password"])
            cambiado = True

    if cambiado:
        db.add(exists)


async def init_db() -> None:
    async with engine.begin() as conn:
        # Migración no destructiva si la columna meses_antiguedad no existe
        await conn.execute(text("ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS meses_antiguedad INTEGER DEFAULT 12;"))
        # Crear tablas nuevas si no existen
        await conn.run_sync(Base.metadata.create_all)
        # Migraciones idempotentes para las 11 tablas (3FN, FKs completas y columnas tipadas)
        nuevas_columnas = [
            "ALTER TABLE solicitudes_afiliacion ADD COLUMN IF NOT EXISTS socio_creado_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;",
            "ALTER TABLE solicitudes_afiliacion ADD COLUMN IF NOT EXISTS resuelto_por_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;",
            "ALTER TABLE solicitudes_afiliacion ADD COLUMN IF NOT EXISTS fecha_sesion DATE;",
            "ALTER TABLE solicitudes_afiliacion ADD COLUMN IF NOT EXISTS numero_acta VARCHAR(50);",
            "ALTER TABLE solicitudes_afiliacion ADD COLUMN IF NOT EXISTS fecha_fin_carencia DATE;",
            "ALTER TABLE solicitudes_afiliacion ADD COLUMN IF NOT EXISTS observaciones_resolucion VARCHAR(500);",
            "ALTER TABLE solicitudes_afiliacion ADD COLUMN IF NOT EXISTS resuelto_por VARCHAR(150);",
            "ALTER TABLE solicitudes_afiliacion ADD COLUMN IF NOT EXISTS resuelto_at TIMESTAMPTZ;",
            "ALTER TABLE cargas_familiares ADD COLUMN IF NOT EXISTS socio_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;",
            "ALTER TABLE cargas_familiares ADD COLUMN IF NOT EXISTS certificado_nombre VARCHAR(255);",
            "ALTER TABLE cargas_familiares ADD COLUMN IF NOT EXISTS certificado_tipo VARCHAR(120);",
            "ALTER TABLE cargas_familiares ADD COLUMN IF NOT EXISTS certificado_data TEXT;",
            "ALTER TABLE solicitudes_cargas_familiares ADD COLUMN IF NOT EXISTS carga_id INTEGER REFERENCES cargas_familiares(id) ON DELETE SET NULL;",
            "ALTER TABLE solicitudes_cargas_familiares ADD COLUMN IF NOT EXISTS resuelto_por_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;",
            "ALTER TABLE solicitudes_cargas_familiares ADD COLUMN IF NOT EXISTS certificado_nombre VARCHAR(255);",
            "ALTER TABLE solicitudes_cargas_familiares ADD COLUMN IF NOT EXISTS certificado_tipo VARCHAR(120);",
            "ALTER TABLE solicitudes_cargas_familiares ADD COLUMN IF NOT EXISTS certificado_data TEXT;",
            "ALTER TABLE solicitudes_reembolso ADD COLUMN IF NOT EXISTS beneficiario_run VARCHAR(20) DEFAULT '';",
            "ALTER TABLE solicitudes_reembolso ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(40) DEFAULT '';",
            "ALTER TABLE solicitudes_reembolso ADD COLUMN IF NOT EXISTS comprobante_filename VARCHAR(255) DEFAULT '';",
            "ALTER TABLE solicitudes_reembolso ADD COLUMN IF NOT EXISTS comprobante_url VARCHAR(500) DEFAULT '';",
            "ALTER TABLE solicitudes_reembolso ADD COLUMN IF NOT EXISTS declaracion_aceptada BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE solicitudes_reembolso ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT DEFAULT '';",
            "ALTER TABLE solicitudes_reembolso ADD COLUMN IF NOT EXISTS revisado_por_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;",
            "ALTER TABLE solicitudes_reembolso ADD COLUMN IF NOT EXISTS fecha_revision TIMESTAMPTZ;",
            "ALTER TABLE solicitudes_beneficio ADD COLUMN IF NOT EXISTS bono_id INTEGER REFERENCES bonos_catalogo(id) ON DELETE SET NULL;",
            "ALTER TABLE nominas_masivas ADD COLUMN IF NOT EXISTS bono_id INTEGER REFERENCES bonos_catalogo(id) ON DELETE SET NULL;",
            "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS saldo_salud_disponible INTEGER DEFAULT 150000;",
            "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS saldo_salud_total_anual INTEGER DEFAULT 150000;",
            "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cargas_registradas INTEGER DEFAULT 0;",
            "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS meses_antiguedad INTEGER DEFAULT 12;",
            "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS antiguedad VARCHAR(60) DEFAULT '';",
            "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS departamento VARCHAR(120) DEFAULT '';",
            "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS estado_previsional VARCHAR(20) DEFAULT 'Al día';",
            "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS intentos_fallidos INTEGER NOT NULL DEFAULT 0;",
            "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_bloqueada BOOLEAN NOT NULL DEFAULT FALSE;",
            "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS debe_cambiar_password BOOLEAN NOT NULL DEFAULT FALSE;",
            "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_cambio_password TIMESTAMPTZ;",
        ]
        for sql in nuevas_columnas:
            await conn.execute(text(sql))

        # [ESTUDIANTE INFORMÁTICA] Capa de seguridad nativa en PostgreSQL y normalización estricta de tipos (CLP = INTEGER, Fechas = DATE/TIMESTAMPTZ)
        if engine.dialect.name == "postgresql":
            await conn.execute(text("ALTER TABLE solicitudes_afiliacion ALTER COLUMN resuelto_por TYPE VARCHAR(150);"))
            # Conversión segura e idempotente de tipos monetarios CLP (FLOAT -> INTEGER) y fechas (VARCHAR -> DATE / TIMESTAMPTZ)
            migraciones_tipos_pg = [
                "ALTER TABLE solicitudes_reembolso ALTER COLUMN monto_boleta TYPE INTEGER USING ROUND(COALESCE(monto_boleta, 0))::INTEGER;",
                "ALTER TABLE solicitudes_reembolso ALTER COLUMN monto_copago TYPE INTEGER USING ROUND(COALESCE(monto_copago, 0))::INTEGER;",
                "ALTER TABLE solicitudes_reembolso ALTER COLUMN monto_reembolso TYPE INTEGER USING ROUND(COALESCE(monto_reembolso, 0))::INTEGER;",
                "ALTER TABLE solicitudes_afiliacion ALTER COLUMN fecha_sesion TYPE DATE USING NULLIF(SUBSTRING(TRIM(fecha_sesion::text) FROM 1 FOR 10), '')::DATE;",
                "ALTER TABLE solicitudes_afiliacion ALTER COLUMN fecha_fin_carencia TYPE DATE USING NULLIF(SUBSTRING(TRIM(fecha_fin_carencia::text) FROM 1 FOR 10), '')::DATE;",
                "ALTER TABLE solicitudes_afiliacion ALTER COLUMN resuelto_at TYPE TIMESTAMPTZ USING NULLIF(TRIM(resuelto_at::text), '')::TIMESTAMPTZ;",
                "ALTER TABLE solicitudes_cargas_familiares ALTER COLUMN fecha_sesion TYPE DATE USING NULLIF(SUBSTRING(TRIM(fecha_sesion::text) FROM 1 FOR 10), '')::DATE;",
                "ALTER TABLE solicitudes_cargas_familiares ALTER COLUMN resuelto_at TYPE TIMESTAMPTZ USING NULLIF(TRIM(resuelto_at::text), '')::TIMESTAMPTZ;",
                "ALTER TABLE solicitudes_beneficio ALTER COLUMN decreto_fecha TYPE DATE USING NULLIF(SUBSTRING(TRIM(decreto_fecha::text) FROM 1 FOR 10), '')::DATE;",
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_usuario_id_fkey') THEN
                        UPDATE audit_logs SET usuario_id = NULL WHERE usuario_id IS NOT NULL AND usuario_id NOT IN (SELECT id FROM usuarios);
                        ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;
                    END IF;
                END $$;
                """,
            ]
            for sql_type in migraciones_tipos_pg:
                await conn.execute(text(sql_type))

            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto;"))
            await conn.execute(text("""
                CREATE OR REPLACE FUNCTION fn_usuarios_auto_bcrypt()
                RETURNS TRIGGER AS $$
                BEGIN
                    IF NEW.hashed_password IS NOT NULL
                       AND NEW.hashed_password NOT LIKE '$2a$%'
                       AND NEW.hashed_password NOT LIKE '$2b$%' THEN
                        IF length(trim(NEW.hashed_password)) < 8 THEN
                            RAISE EXCEPTION 'Seguridad BD: La contraseña debe tener al menos 8 caracteres.';
                        END IF;
                        NEW.hashed_password := crypt(NEW.hashed_password, gen_salt('bf', 12));
                        NEW.intentos_fallidos := 0;
                        NEW.password_bloqueada := FALSE;
                        IF NEW.id IS NOT NULL THEN
                            DELETE FROM parametros_sistema WHERE clave = 'SEC_USR_' || NEW.id::text;
                        END IF;
                    END IF;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            """))
            await conn.execute(text("DROP TRIGGER IF EXISTS trg_usuarios_auto_bcrypt ON usuarios;"))
            await conn.execute(text("""
                CREATE TRIGGER trg_usuarios_auto_bcrypt
                BEFORE INSERT OR UPDATE OF hashed_password ON usuarios
                FOR EACH ROW EXECUTE FUNCTION fn_usuarios_auto_bcrypt();
            """))
            await conn.execute(text("""
                CREATE OR REPLACE FUNCTION fn_usuarios_audit_db()
                RETURNS TRIGGER AS $$
                DECLARE
                    v_cambios TEXT := '';
                BEGIN
                    IF OLD.hashed_password IS DISTINCT FROM NEW.hashed_password THEN
                        v_cambios := v_cambios || 'password_hash_actualizado ';
                    END IF;
                    IF OLD.rol IS DISTINCT FROM NEW.rol THEN
                        v_cambios := v_cambios || 'rol(' || OLD.rol::text || '->' || NEW.rol::text || ') ';
                    END IF;
                    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
                        v_cambios := v_cambios || 'is_active(' || OLD.is_active::text || '->' || NEW.is_active::text || ') ';
                    END IF;
                    IF OLD.is_superuser IS DISTINCT FROM NEW.is_superuser THEN
                        v_cambios := v_cambios || 'is_superuser(' || OLD.is_superuser::text || '->' || NEW.is_superuser::text || ') ';
                    END IF;
                    IF v_cambios <> '' THEN
                        INSERT INTO audit_logs (
                            created_at, usuario_id, usuario_nombre, usuario_rut, usuario_rol,
                            modulo, accion, recurso_tipo, recurso_id, detalles, ip_origen
                        ) VALUES (
                            NOW(), NEW.id, NEW.nombre_completo, NEW.rut, NEW.rol::text,
                            'SEGURIDAD_BD', 'ACTUALIZACION_CREDencial_USUARIO', 'User', NEW.rut,
                            'Cambio registrado en tabla usuarios: ' || trim(v_cambios), 'motor-postgresql'
                        );
                    END IF;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            """))
            await conn.execute(text("DROP TRIGGER IF EXISTS trg_usuarios_audit_db ON usuarios;"))
            await conn.execute(text("""
                CREATE TRIGGER trg_usuarios_audit_db
                AFTER UPDATE ON usuarios
                FOR EACH ROW EXECUTE FUNCTION fn_usuarios_audit_db();
            """))

            # Diccionario de Datos Explicativo en Español grabado en el catálogo de PostgreSQL
            comentarios_esquema = [
                "COMMENT ON TABLE usuarios IS 'Nómina oficial de funcionarios y los 7 roles del Comité (Superusuario, Presidente, Secretario, Tesorero, Admin, Auditor, Socio). Para cambiar una contraseña, edite la columna hashed_password escribiendo la nueva clave (mín. 8 caracteres) y guarde: PostgreSQL la encriptará en Bcrypt Costo 12 automáticamente.';",
                "COMMENT ON COLUMN usuarios.rut IS 'RUN chileno validado con Módulo 11 (ej. 11.111.111-1). Identificador único de login.';",
                "COMMENT ON COLUMN usuarios.email IS 'Correo institucional municipal (@mperalillo.cl). También válido para iniciar sesión.';",
                "COMMENT ON COLUMN usuarios.hashed_password IS 'Hash Bcrypt ($2a$/$2b$ costo 12). Si escribe aquí una clave nueva en texto plano (mín. 8 caracteres) y guarda, el trigger trg_usuarios_auto_bcrypt la encripta en Bcrypt automáticamente y desbloquea la cuenta.';",
                "COMMENT ON COLUMN usuarios.rol IS 'Rol normativo: superusuario, presidente, secretario, tesorero, admin, auditor o socio.';",
                "COMMENT ON COLUMN usuarios.is_superuser IS 'true = Control total del sistema y del panel de Superusuario (/admin).';",
                "COMMENT ON COLUMN usuarios.is_active IS 'true = Cuenta habilitada para ingresar al portal; false = Cuenta suspendida.';",
                "COMMENT ON COLUMN usuarios.meses_antiguedad IS 'Meses de antigüedad en el Comité. Mínimo 6 meses requeridos para superar el período de carencia (Ley N° 19.754).';",
                "COMMENT ON COLUMN usuarios.saldo_salud_disponible IS 'Cupo anual remanente de reembolsos médicos en CLP (Tope anual: $150.000 por socio).';",
                "COMMENT ON TABLE parametros_sistema IS 'Parámetros globales del reglamento (Sueldo Base Grado 15 = $750.000, porcentajes de bonos, configuración SMTP y estados de bloqueo SEC_USR_<id>).';",
                "COMMENT ON TABLE bonos_catalogo IS 'Catálogo dinámico de los 9 beneficios y bonos sociales del Comité de Bienestar.';",
                "COMMENT ON TABLE solicitudes_afiliacion IS 'HU-01 y HU-02: Solicitudes digitales de incorporación al Comité con autorización del 4% de descuento y resolución por acta.';",
                "COMMENT ON TABLE cargas_familiares IS 'HU-01 y HU-02: Cargas familiares legalmente acreditadas asociadas a una solicitud de afiliación.';",
                "COMMENT ON TABLE solicitudes_cargas_familiares IS 'HU-02: Solicitudes posteriores de socios activos para inscribir nuevas cargas con certificado adjunto.';",
                "COMMENT ON TABLE solicitudes_reembolso IS 'HU-03 y HU-04: Solicitudes de reembolso médico/dental/óptico con control de plazo de 30 días, tope de $150.000 y semáforo SLA de 20 días hábiles.';",
                "COMMENT ON TABLE solicitudes_beneficio IS 'HU-05: Postulaciones y asignaciones individuales de bonos (Nacimiento, Escolaridad, Vacaciones, Catástrofe, etc.).';",
                "COMMENT ON TABLE nominas_masivas IS 'HU-06: Cabecera de nóminas masivas de Bono Invierno y Bono Navidad con filtro automático de carencia.';",
                "COMMENT ON TABLE detalles_nomina_masiva IS 'HU-06: Detalle individual por socio incluido o excluido en cada nómina masiva.';",
                "COMMENT ON TABLE audit_logs IS 'Bitácora forense inmutable (Append-Only) para Contraloría y Comisión Revisora de Cuentas.';",
            ]
            for sql_comment in comentarios_esquema:
                await conn.execute(text(sql_comment))

            # Vista 1: Manual Interactivo de las 11 Tablas del Sistema
            await conn.execute(text("""
                CREATE OR REPLACE VIEW v_01_guia_tablas_del_sistema AS
                SELECT
                    orden AS "N°",
                    tabla AS "Nombre de Tabla",
                    modulo AS "Módulo / Historia de Usuario",
                    explicacion AS "¿Para qué sirve y cómo se administra?"
                FROM (
                    VALUES
                        (1, 'usuarios', 'Seguridad y 7 Roles', 'Contiene al Superusuario y los socios/directiva. Si edita hashed_password con una clave nueva y guarda, se encripta en Bcrypt automáticamente.'),
                        (2, 'parametros_sistema', 'Reglamento Ley N° 19.754', 'Guarda el Sueldo Base Grado 15 ($750.000), % de bonos y estados de seguridad SEC_USR_<id>.'),
                        (3, 'bonos_catalogo', 'HU-05 Catálogo de Bonos', 'Define los 9 bonos oficiales, sus requisitos documentales y porcentajes sobre el Grado 15.'),
                        (4, 'solicitudes_afiliacion', 'HU-01 / HU-02 Afiliación', 'Postulaciones de funcionarios (descuento 4%) y resoluciones de directiva con N° de Acta.'),
                        (5, 'cargas_familiares', 'HU-01 Cargas Iniciales', 'Cargas declaradas junto con la solicitud de afiliación inicial.'),
                        (6, 'solicitudes_cargas_familiares', 'HU-02 Nuevas Cargas', 'Solicitudes de socios activos para agregar cargas familiares con certificado digital.'),
                        (7, 'solicitudes_reembolso', 'HU-03 / HU-04 Reembolsos', 'Solicitudes médicas sujetas a carencia (6 meses), caducidad (30 días), tope ($150.000) y SLA (20 días hábiles).'),
                        (8, 'solicitudes_beneficio', 'HU-05 Bonos Individuales', 'Solicitudes de bonos por evento (Nacimiento, Matrimonio, Escolaridad, Vacaciones, Catástrofe).'),
                        (9, 'nominas_masivas', 'HU-06 Nóminas Masivas', 'Procesos masivos de Bono Invierno y Bono Navidad generados por Tesorería/Directiva.'),
                        (10, 'detalles_nomina_masiva', 'HU-06 Detalle Nómina', 'Listado de cada socio evaluado en una nómina masiva (habilitado o excluido por carencia).'),
                        (11, 'audit_logs', 'Auditoría / Contraloría', 'Registro inmutable de todas las acciones críticas (incluye cambios hechos directamente en la BD).')
                ) AS t(orden, tabla, modulo, explicacion)
                ORDER BY orden;
            """))

            # Vista 2: Estado de Seguridad de los 7 Roles e Instrucciones de Administración
            await conn.execute(text("""
                CREATE OR REPLACE VIEW v_02_roles_y_estado_seguridad AS
                SELECT
                    u.id AS "ID",
                    UPPER(u.rol::text) AS "Rol Institucional",
                    u.rut AS "RUN (Login)",
                    u.email AS "Correo Institucional",
                    u.nombre_completo AS "Nombre Funcionario",
                    CASE WHEN u.is_active THEN 'ACTIVO' ELSE 'INACTIVO' END AS "Estado Cuenta",
                    CASE WHEN u.is_superuser THEN 'SÍ (Control Total)' ELSE 'NO' END AS "Es Superusuario",
                    CASE
                        WHEN u.hashed_password LIKE '$2b$12$%' OR u.hashed_password LIKE '$2a$12$%'
                        THEN 'BCRYPT COSTO 12 (Seguro)'
                        ELSE 'REVISAR'
                    END AS "Seguridad Contraseña",
                    COALESCE(u.intentos_fallidos, (p.valor::jsonb ->> 'i')::int, 0) AS "Intentos Fallidos",
                    CASE
                        WHEN COALESCE(u.password_bloqueada, (p.valor::jsonb ->> 'b')::boolean, false) THEN 'BLOQUEADO'
                        ELSE 'DESBLOQUEADO'
                    END AS "Estado Bloqueo",
                    'Para cambiar clave: abra tabla "usuarios" -> edite hashed_password con la nueva clave -> Guardar (Save)' AS "Instrucción Cambio Clave"
                FROM usuarios u
                LEFT JOIN parametros_sistema p ON p.clave = ('SEC_USR_' || u.id::text)
                ORDER BY
                    CASE u.rol::text
                        WHEN 'superusuario' THEN 1
                        WHEN 'presidente' THEN 2
                        WHEN 'secretario' THEN 3
                        WHEN 'tesorero' THEN 4
                        WHEN 'admin' THEN 5
                        WHEN 'auditor' THEN 6
                        ELSE 7
                    END,
                    u.id;
            """))

            # Vista 3: Resumen Ejecutivo en Tiempo Real de la Base de Datos
            await conn.execute(text("""
                CREATE OR REPLACE VIEW v_03_resumen_ejecutivo_bd AS
                SELECT
                    (SELECT COUNT(*) FROM usuarios) AS "Total Usuarios Registrados",
                    (SELECT COUNT(*) FROM usuarios WHERE is_active = true) AS "Usuarios Activos",
                    (SELECT COUNT(*) FROM usuarios WHERE meses_antiguedad >= 6) AS "Socios con Carencia Cumplida (>=6m)",
                    (SELECT COUNT(*) FROM solicitudes_afiliacion) AS "Solicitudes de Afiliación (HU-01)",
                    (SELECT COUNT(*) FROM solicitudes_reembolso) AS "Solicitudes de Reembolso (HU-03)",
                    (SELECT COUNT(*) FROM solicitudes_reembolso WHERE estado = 'en_revision') AS "Reembolsos Pendientes (HU-04)",
                    (SELECT COUNT(*) FROM solicitudes_beneficio) AS "Solicitudes de Bonos (HU-05)",
                    (SELECT COUNT(*) FROM audit_logs) AS "Eventos en Bitácora Auditoría";
            """))

    async with AsyncSessionLocal() as db:
        # 1. Cargar Usuarios y sincronizar RUTs Módulo 11 de cuentas semilla canónicas
        for data in SEED_USERS:
            exists = await db.scalar(select(User).where(User.email == data["email"]))
            if exists:
                await _sincronizar_usuario_semilla(db, exists, data)
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

        # 2.1 Cargar Catálogo Dinámico de Bonos (BonoCatalogo)
        from app.services.beneficios_service import CATALOGO_DEFINICION
        bonos_count = await db.scalar(select(func.count(BonoCatalogo.id)))
        if not bonos_count:
            for item in CATALOGO_DEFINICION:
                db.add(BonoCatalogo(
                    codigo=item["id"],
                    nombre=item["nombre"],
                    porcentaje=item["porcentaje"],
                    categoria=item["categoria"],
                    requisitos=item["requisitos"],
                    documentacion_requerida=item["documentacion_requerida"],
                    regla_asignacion=item["regla_asignacion"],
                    periodo_devengo=item.get("periodo_devengo"),
                    permite_postulacion_socio=item["permite_postulacion_socio"],
                    es_calendario=item["id"] in ["invierno", "navidad"],
                    activo=True,
                    icono=item["icono"],
                ))
            await db.commit()
            logger.info("Catálogo inicial de bonos creado en bonos_catalogo")

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
                    decreto_fecha=date(2026, 1, 15),
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

        # 4. Semillas de Auditoría (Trazabilidad inicial)
        audit_count = await db.scalar(select(func.count(AuditLog.id)))
        if not audit_count:
            db.add_all([
                AuditLog(
                    usuario_nombre="María Elena Soto",
                    usuario_rut="12.345.678-5",
                    usuario_rol="Presidente",
                    modulo="AFILIACION",
                    accion="APROBAR_INCORPORACION",
                    recurso_tipo="SolicitudAfiliacion",
                    recurso_id="AF-2026-00001",
                    detalles="Aprobada postulación según Acta Ordinaria N° 04-2026. Se fija carencia legal de 6 meses.",
                    ip_origen="192.168.1.45"
                ),
                AuditLog(
                    usuario_nombre="Roberto Morales P.",
                    usuario_rut="14.982.112-0",
                    usuario_rol="Tesorero",
                    modulo="BENEFICIOS",
                    accion="LIQUIDAR_BONO",
                    recurso_tipo="SolicitudBeneficio",
                    recurso_id="BONO-1",
                    detalles="Liquidación autorizada mediante cheque CHQ-885102 BancoEstado por $112.500.",
                    ip_origen="192.168.1.50"
                ),
                AuditLog(
                    usuario_nombre="Jorge Contreras L.",
                    usuario_rut="16.234.567-2",
                    usuario_rol="Admin",
                    modulo="CONFIGURACION",
                    accion="ACTUALIZAR_PARAMETRO",
                    recurso_tipo="ParametroSistema",
                    recurso_id="SUELDO_BASE_GRADO_15",
                    detalles="Actualización de parámetro base Grado 15 fijado en $750.000 CLP.",
                    ip_origen="192.168.1.10"
                ),
            ])
            await db.commit()
            logger.info("Registros de auditoría iniciales creados")

        # 4.1 Semillas iniciales de Reembolsos SLA (solo si la tabla está vacía al primer arranque)
        from app.models.reembolso import SolicitudReembolso
        from app.services.reembolso_service import _asegurar_semillas_sla_demo
        reembolsos_count = await db.scalar(select(func.count(SolicitudReembolso.id)))
        if not reembolsos_count:
            await _asegurar_semillas_sla_demo(db)

        # 5. Sincronización retroactiva (Backfill) de Claves Foráneas en registros existentes
        if engine.dialect.name == "postgresql":
            backfill_sqls = [
                # Vincular solicitudes_beneficio y nominas_masivas con bonos_catalogo
                """
                UPDATE solicitudes_beneficio sb
                SET bono_id = bc.id
                FROM bonos_catalogo bc
                WHERE sb.bono_id IS NULL
                  AND (sb.tipo_bono = bc.codigo OR (sb.tipo_bono = 'vacaciones_masivo' AND bc.codigo = 'vacaciones'));
                """,
                """
                UPDATE nominas_masivas nm
                SET bono_id = bc.id
                FROM bonos_catalogo bc
                WHERE nm.bono_id IS NULL
                  AND (nm.tipo_bono = bc.codigo OR (nm.tipo_bono = 'vacaciones_masivo' AND bc.codigo = 'vacaciones'));
                """,
                # Vincular solicitudes_afiliacion con usuarios (socio_creado_id y resuelto_por_id)
                """
                UPDATE solicitudes_afiliacion sa
                SET socio_creado_id = u.id
                FROM usuarios u
                WHERE sa.socio_creado_id IS NULL
                  AND REPLACE(REPLACE(UPPER(sa.run), '.', ''), '-', '') = REPLACE(REPLACE(UPPER(u.rut), '.', ''), '-', '');
                """,
                """
                UPDATE solicitudes_afiliacion sa
                SET resuelto_por_id = u.id
                FROM usuarios u
                WHERE sa.resuelto_por_id IS NULL
                  AND sa.resuelto_por IS NOT NULL
                  AND POSITION(LOWER(u.nombre_completo) IN LOWER(sa.resuelto_por)) > 0;
                """,
                # Vincular cargas_familiares con usuarios (socio_id) y solicitudes_cargas_familiares con cargas_familiares (carga_id)
                """
                UPDATE cargas_familiares cf
                SET socio_id = sa.socio_creado_id
                FROM solicitudes_afiliacion sa
                WHERE cf.solicitud_id = sa.id
                  AND cf.socio_id IS NULL
                  AND sa.socio_creado_id IS NOT NULL;
                """,
                """
                UPDATE solicitudes_cargas_familiares scf
                SET carga_id = cf.id
                FROM cargas_familiares cf
                WHERE scf.carga_id IS NULL
                  AND REPLACE(REPLACE(UPPER(scf.run), '.', ''), '-', '') = REPLACE(REPLACE(UPPER(cf.run), '.', ''), '-', '');
                """,
                """
                UPDATE solicitudes_cargas_familiares scf
                SET resuelto_por_id = u.id
                FROM usuarios u
                WHERE scf.resuelto_por_id IS NULL
                  AND scf.resuelto_por IS NOT NULL
                  AND POSITION(LOWER(u.nombre_completo) IN LOWER(scf.resuelto_por)) > 0;
                """,
                # Vincular audit_logs.usuario_id cuando coincida el nombre o RUT con usuarios
                """
                UPDATE audit_logs al
                SET usuario_id = u.id
                FROM usuarios u
                WHERE al.usuario_id IS NULL
                  AND LOWER(TRIM(al.usuario_nombre)) = LOWER(TRIM(u.nombre_completo));
                """,
                # Sincronizar seguridad desde SEC_USR_ en parametros_sistema hacia columnas tipadas de usuarios y limpiar residuos 1FN
                """
                UPDATE usuarios u
                SET
                    intentos_fallidos = COALESCE((p.valor::jsonb ->> 'i')::int, u.intentos_fallidos, 0),
                    password_bloqueada = COALESCE((p.valor::jsonb ->> 'b')::boolean, u.password_bloqueada, false),
                    debe_cambiar_password = COALESCE((p.valor::jsonb ->> 'c')::boolean, u.debe_cambiar_password, false)
                FROM parametros_sistema p
                WHERE p.clave = ('SEC_USR_' || u.id::text);
                """,
                "DELETE FROM parametros_sistema WHERE clave LIKE 'SEC_USR_%';",
                "UPDATE parametros_sistema SET valor = '' WHERE clave = 'SMTP_PASSWORD' AND valor = 'xgsnewzymyqjumgc';",
            ]
            for b_sql in backfill_sqls:
                await db.execute(text(b_sql))
            await db.commit()

        # 4. Catálogo inicial de competencias técnicas (Módulo Vecino y Nuevo Talento — Ley 21.015)
        from app.models.talento import CompetenciaCatalogo
        from app.services.talento_service import COMPETENCIAS_SEMILLA

        comp_count = await db.scalar(select(func.count(CompetenciaCatalogo.id)))
        if not comp_count:
            for comp in COMPETENCIAS_SEMILLA:
                db.add(
                    CompetenciaCatalogo(
                        nombre=comp["nombre"],
                        categoria=comp["categoria"],
                        activa=True,
                    )
                )
            await db.commit()
            logger.info("Catálogo inicial de competencias técnicas creado en competencias_catalogo")
