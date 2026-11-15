-- ==============================================================================
-- DDL Completo de Base de Datos PostgreSQL 15 — Bienestar App (I. M. Peralillo)
-- 100% de Fidelidad Física: 11 Tablas y 186 Columnas Oficiales
-- Optimizado para Importación Directa en Draw.io: Menú '+' -> Avanzado -> SQL
-- ==============================================================================

CREATE TABLE audit_logs (
    id INTEGER NOT NULL DEFAULT AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL,
    usuario_id INTEGER,
    usuario_nombre VARCHAR(150) NOT NULL,
    usuario_rut VARCHAR(20),
    usuario_rol VARCHAR(50) NOT NULL,
    modulo VARCHAR(50) NOT NULL,
    accion VARCHAR(100) NOT NULL,
    recurso_tipo VARCHAR(50) NOT NULL,
    recurso_id VARCHAR(100),
    detalles TEXT,
    ip_origen VARCHAR(60)
);

CREATE TABLE bonos_catalogo (
    id INTEGER NOT NULL DEFAULT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(60) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    porcentaje DOUBLE NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    requisitos TEXT NOT NULL,
    documentacion_requerida TEXT NOT NULL,
    regla_asignacion TEXT NOT NULL,
    periodo_devengo VARCHAR(100),
    permite_postulacion_socio BOOLEAN NOT NULL,
    es_calendario BOOLEAN NOT NULL,
    activo BOOLEAN NOT NULL,
    icono VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE cargas_familiares (
    id INTEGER NOT NULL DEFAULT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INTEGER NOT NULL,
    nombre_completo VARCHAR(120) NOT NULL,
    run VARCHAR(12) NOT NULL,
    parentesco VARCHAR(40),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_afiliacion(id)
);

CREATE TABLE detalles_nomina_masiva (
    id INTEGER NOT NULL DEFAULT AUTO_INCREMENT PRIMARY KEY,
    nomina_id INTEGER NOT NULL,
    socio_id INTEGER,
    rut VARCHAR(20) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    departamento VARCHAR(120) NOT NULL,
    antiguedad_texto VARCHAR(60) NOT NULL,
    antiguedad_meses INTEGER NOT NULL,
    cumple_antiguedad BOOLEAN NOT NULL,
    motivo_exclusion VARCHAR(255),
    monto INTEGER NOT NULL,
    decreto_asociado VARCHAR(100),
    decreto_digital_url VARCHAR(500),
    metodo_pago VARCHAR(40) NOT NULL,
    numero_cheque VARCHAR(60),
    banco VARCHAR(100),
    estado_pago VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (nomina_id) REFERENCES nominas_masivas(id),
    FOREIGN KEY (socio_id) REFERENCES usuarios(id)
);

CREATE TABLE nominas_masivas (
    id INTEGER NOT NULL DEFAULT AUTO_INCREMENT PRIMARY KEY,
    tipo_bono VARCHAR(60) NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    periodo VARCHAR(60) NOT NULL,
    porcentaje DOUBLE NOT NULL,
    sueldo_base_utilizado INTEGER NOT NULL,
    monto_unitario INTEGER NOT NULL,
    total_socios_evaluados INTEGER NOT NULL,
    total_socios_beneficiados INTEGER NOT NULL,
    total_socios_excluidos INTEGER NOT NULL,
    monto_total_liquidado INTEGER NOT NULL,
    estado VARCHAR(40) NOT NULL,
    decreto_marco VARCHAR(100),
    acuerdo_directorio_acta VARCHAR(100),
    creado_por_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (creado_por_id) REFERENCES usuarios(id)
);

CREATE TABLE parametros_sistema (
    id INTEGER NOT NULL DEFAULT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(60) NOT NULL,
    valor VARCHAR(255) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE solicitudes_afiliacion (
    id INTEGER NOT NULL DEFAULT AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(20) NOT NULL,
    nombre_completo VARCHAR(120) NOT NULL,
    run VARCHAR(12) NOT NULL,
    grado VARCHAR(10) NOT NULL,
    calidad_contractual USER-DEFINED NOT NULL,
    email VARCHAR(120),
    autoriza_descuento BOOLEAN NOT NULL,
    porcentaje_descuento INTEGER NOT NULL,
    acepta_carencia BOOLEAN NOT NULL,
    estado USER-DEFINED NOT NULL,
    fecha_sesion VARCHAR(10),
    numero_acta VARCHAR(50),
    fecha_fin_carencia VARCHAR(10),
    observaciones_resolucion VARCHAR(500),
    resuelto_por VARCHAR(150),
    resuelto_at VARCHAR(60),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE solicitudes_beneficio (
    id INTEGER NOT NULL DEFAULT AUTO_INCREMENT PRIMARY KEY,
    socio_id INTEGER NOT NULL,
    tipo_bono VARCHAR(60) NOT NULL,
    titulo_bono VARCHAR(120) NOT NULL,
    porcentaje_base DOUBLE NOT NULL,
    sueldo_base_referencia INTEGER NOT NULL,
    monto_calculado INTEGER NOT NULL,
    estado VARCHAR(30) NOT NULL,
    motivo TEXT,
    documento_tipo VARCHAR(120) NOT NULL,
    documento_nombre VARCHAR(255),
    documento_url VARCHAR(500),
    decreto_numero VARCHAR(100),
    decreto_fecha VARCHAR(50),
    dias_habiles_feriado INTEGER,
    nombre_beneficiario VARCHAR(150),
    rut_beneficiario VARCHAR(20),
    institucion_educacional VARCHAR(150),
    nivel_educacional VARCHAR(60),
    edad_estudiante INTEGER,
    asignacion_directa BOOLEAN NOT NULL,
    motivo_rechazo TEXT,
    observaciones_admin TEXT,
    revisado_por_id INTEGER,
    fecha_revision TIMESTAMP,
    metodo_pago VARCHAR(50),
    numero_cheque VARCHAR(60),
    banco_emisor VARCHAR(100),
    fecha_liquidacion TIMESTAMP,
    liquidado_por_id INTEGER,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (socio_id) REFERENCES usuarios(id),
    FOREIGN KEY (revisado_por_id) REFERENCES usuarios(id),
    FOREIGN KEY (liquidado_por_id) REFERENCES usuarios(id)
);

CREATE TABLE solicitudes_cargas_familiares (
    id INTEGER NOT NULL DEFAULT AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(24) NOT NULL,
    socio_id INTEGER NOT NULL,
    socio_nombre VARCHAR(120) NOT NULL,
    socio_rut VARCHAR(20) NOT NULL,
    socio_email VARCHAR(120),
    nombre_completo VARCHAR(120) NOT NULL,
    run VARCHAR(15) NOT NULL,
    parentesco VARCHAR(40) NOT NULL,
    observacion_socio VARCHAR(300),
    certificado_nombre VARCHAR(255),
    certificado_tipo VARCHAR(120),
    certificado_data TEXT,
    estado USER-DEFINED NOT NULL,
    fecha_sesion VARCHAR(10),
    numero_acta VARCHAR(50),
    observaciones_resolucion VARCHAR(500),
    resuelto_por VARCHAR(120),
    resuelto_at VARCHAR(30),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (socio_id) REFERENCES usuarios(id)
);

CREATE TABLE solicitudes_reembolso (
    id INTEGER NOT NULL DEFAULT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL,
    socio_id INTEGER NOT NULL,
    tipo_prestacion USER-DEFINED NOT NULL,
    descripcion TEXT NOT NULL,
    beneficiario_nombre VARCHAR(120) NOT NULL,
    beneficiario_parentesco VARCHAR(30) NOT NULL,
    monto_boleta DOUBLE NOT NULL,
    monto_copago DOUBLE NOT NULL,
    monto_reembolso DOUBLE NOT NULL,
    fecha_atencion DATE NOT NULL,
    fecha_boleta DATE NOT NULL,
    tipo_documento VARCHAR(40) NOT NULL,
    comprobante_filename VARCHAR(255) NOT NULL,
    comprobante_url VARCHAR(500) NOT NULL,
    declaracion_aceptada BOOLEAN NOT NULL,
    estado USER-DEFINED NOT NULL,
    motivo_rechazo TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    beneficiario_run VARCHAR(20),
    FOREIGN KEY (socio_id) REFERENCES usuarios(id)
);

CREATE TABLE usuarios (
    id INTEGER NOT NULL DEFAULT AUTO_INCREMENT PRIMARY KEY,
    rut VARCHAR(15) NOT NULL,
    email VARCHAR(120) NOT NULL,
    nombre_completo VARCHAR(120) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    rol USER-DEFINED NOT NULL,
    is_superuser BOOLEAN NOT NULL,
    is_active BOOLEAN NOT NULL,
    departamento VARCHAR(120) NOT NULL,
    antiguedad VARCHAR(60) NOT NULL,
    estado_previsional VARCHAR(20) NOT NULL,
    saldo_salud_disponible INTEGER NOT NULL,
    saldo_salud_total_anual INTEGER NOT NULL,
    cargas_registradas INTEGER NOT NULL,
    meses_antiguedad INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
