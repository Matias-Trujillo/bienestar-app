"""
Generador de Diccionario de Datos Oficial en formato Draw.io (bienestar_diccionario_datos.drawio).
Extrae las 11 tablas y los 201 atributos reales en vivo desde PostgreSQL 15 y genera
tablas formales con las 5 columnas solicitadas para el informe universitario:
  Atributo | Tipo de Dato | PK/FK | Nulo (Sí / No) | Descripción
Incluye:
- Pestaña 1: Vista General con las 11 tablas ordenadas por módulo funcional.
- Pestañas 2 a 12: Una pestaña individual por cada tabla para capturas directas.
"""
import subprocess
import json
import os
import html
import xml.etree.ElementTree as ET


TABLE_ORDER = [
    "usuarios",
    "solicitudes_afiliacion",
    "cargas_familiares",
    "solicitudes_cargas_familiares",
    "solicitudes_reembolso",
    "bonos_catalogo",
    "solicitudes_beneficio",
    "nominas_masivas",
    "detalles_nomina_masiva",
    "audit_logs",
    "parametros_sistema",
]

TABLE_INFO = {
    "usuarios": (
        "Entidad maestra de funcionarios municipales afiliados y cuentas con roles directivos/administrativos (HU-01, HU-09)."
    ),
    "solicitudes_afiliacion": (
        "Registro de postulaciones digitales de incorporación al Comité, autorización del 4% y resolución por Acta (HU-01, HU-02)."
    ),
    "cargas_familiares": (
        "Cargas familiares declaradas por el funcionario durante su solicitud de incorporación inicial al Comité (HU-01, HU-02)."
    ),
    "solicitudes_cargas_familiares": (
        "Bandeja de solicitudes de inscripción y evaluación de cargas familiares ante el Directorio con respaldo digital (HU-02)."
    ),
    "solicitudes_reembolso": (
        "Solicitudes de reembolso por prestaciones médicas, dentales y farmacéuticas con control de tope anual y plazo de 30 días (HU-03, HU-04)."
    ),
    "bonos_catalogo": (
        "Catálogo maestro de bonos sociales por contingencia y de calendario indexados al Sueldo Base Grado 15 (HU-05, HU-06)."
    ),
    "solicitudes_beneficio": (
        "Postulaciones individuales y liquidaciones de bonos sociales con snapshot financiero y datos de pago (HU-05)."
    ),
    "nominas_masivas": (
        "Cabecera de procesos de liquidación masiva de bonos periódicos de calendario para Tesorería Municipal (HU-06)."
    ),
    "detalles_nomina_masiva": (
        "Desglose individual por socio evaluado en una nómina masiva, indicando cumplimiento de carencia y cheque asignado (HU-06)."
    ),
    "audit_logs": (
        "Bitácora forense inmutable (Append-Only) de eventos críticos para fiscalización y Contraloría General de la República (HU-10)."
    ),
    "parametros_sistema": (
        "Tabla de configuración global institucional (Sueldo Base Grado 15, porcentajes reglamentarios y servidor SMTP)."
    ),
}

# Descripciones específicas por (tabla, columna) y descripciones transversales
SPECIFIC_COL_DESC = {
    # 1. usuarios
    ("usuarios", "id"): "Identificador único autoincremental del funcionario o usuario en el sistema.",
    ("usuarios", "rut"): "Rol Único Tributario (RUN) chileno normalizado con validación de Módulo 11 (identificador único de acceso).",
    ("usuarios", "email"): "Correo electrónico institucional (@mperalillo.cl) o personal registrado para notificaciones y acceso.",
    ("usuarios", "nombre_completo"): "Nombres y apellidos completos del funcionario municipal afiliado o directivo.",
    ("usuarios", "hashed_password"): "Hash criptográfico de la contraseña encriptada mediante algoritmo Bcrypt (costo 12).",
    ("usuarios", "rol"): "Rol de control de acceso basado en privilegios (superusuario, presidente, secretario, tesorero, admin, auditor, socio).",
    ("usuarios", "is_superuser"): "Indicador booleano que otorga privilegios totales de Superadministrador sobre el sistema.",
    ("usuarios", "is_active"): "Estado operativo de la cuenta (true = socio activo habilitado; false = socio suspendido o dado de baja).",
    ("usuarios", "departamento"): "Dirección o unidad municipal a la que pertenece el funcionario (ej. DIDECO, Obras, Secretaría Municipal).",
    ("usuarios", "antiguedad"): "Glosa descriptiva del tiempo de permanencia en el Comité de Bienestar (ej. '1 Año, 4 Meses').",
    ("usuarios", "estado_previsional"): "Estado de cumplimiento en las cotizaciones y retenciones mensuales del socio (ej. 'Al día').",
    ("usuarios", "saldo_salud_disponible"): "Cupo monetario remanente en pesos chilenos (CLP) para reembolsos médicos en el año calendario vigente.",
    ("usuarios", "saldo_salud_total_anual"): "Tope anual máximo de cobertura médica en CLP asignado al socio por año calendario ($150.000 CLP).",
    ("usuarios", "cargas_registradas"): "Cantidad total de cargas familiares vigentes y aprobadas asociadas al socio titular.",
    ("usuarios", "meses_antiguedad"): "Cantidad entera de meses continuos de afiliación para validar la regla de carencia mínima de 6 meses.",
    ("usuarios", "intentos_fallidos"): "Contador de intentos fallidos consecutivos de inicio de sesión (bloqueo preventivo al 5° intento).",
    ("usuarios", "password_bloqueada"): "Indica si la cuenta se encuentra bloqueada por seguridad tras superar el máximo de intentos fallidos.",
    ("usuarios", "debe_cambiar_password"): "Exige al usuario actualizar su clave temporal de un solo uso en su próximo inicio de sesión.",
    ("usuarios", "ultimo_cambio_password"): "Fecha y hora exacta de la última actualización de contraseña realizada por el funcionario.",

    # 2. solicitudes_afiliacion
    ("solicitudes_afiliacion", "id"): "Identificador único autoincremental de la solicitud de incorporación.",
    ("solicitudes_afiliacion", "folio"): "Código correlativo anual único del expediente de afiliación (formato AF-AAAA-NNNNN).",
    ("solicitudes_afiliacion", "nombre_completo"): "Nombre completo del funcionario municipal que postula a incorporarse al Comité.",
    ("solicitudes_afiliacion", "run"): "RUN chileno del funcionario postulante validado con dígito verificador Módulo 11.",
    ("solicitudes_afiliacion", "grado"): "Grado en el escalafón de la planta o contrata municipal del postulante (ej. Grado 10 a 15).",
    ("solicitudes_afiliacion", "calidad_contractual"): "Calidad jurídica del vínculo laboral con el municipio ('Planta' o 'Contrata').",
    ("solicitudes_afiliacion", "email"): "Correo electrónico declarado por el postulante para recibir el comprobante y la resolución.",
    ("solicitudes_afiliacion", "autoriza_descuento"): "Consentimiento expreso y obligatorio para el descuento mensual por planilla del 4% del sueldo base.",
    ("solicitudes_afiliacion", "porcentaje_descuento"): "Porcentaje estatutario de retención mensual sobre el sueldo base autorizado por el socio (4%).",
    ("solicitudes_afiliacion", "acepta_carencia"): "Declaración jurada de aceptación de la cláusula de 6 meses de carencia inicial para impetrar beneficios.",
    ("solicitudes_afiliacion", "estado"): "Estado de tramitación de la postulación ('Pendiente de aprobación', 'Aprobada' o 'Rechazada').",
    ("solicitudes_afiliacion", "socio_creado_id"): "Clave foránea hacia el usuario creado automáticamente en 'usuarios' tras aprobarse la incorporación.",
    ("solicitudes_afiliacion", "resuelto_por_id"): "Clave foránea hacia el directivo (Presidente/Secretario/Admin) que resolvió la solicitud.",
    ("solicitudes_afiliacion", "fecha_sesion"): "Fecha de la sesión ordinaria del Directorio de Bienestar en que se votó la solicitud.",
    ("solicitudes_afiliacion", "numero_acta"): "Número o identificador oficial del Acta de Directorio que respalda la resolución colegiada.",
    ("solicitudes_afiliacion", "fecha_fin_carencia"): "Fecha exacta en que concluye el período legal de 6 meses de carencia contados desde la sesión.",
    ("solicitudes_afiliacion", "observaciones_resolucion"): "Fundamento del acuerdo de Directorio o causal detallada en caso de rechazo de la postulación.",
    ("solicitudes_afiliacion", "resuelto_por"): "Snapshot inmutable con el nombre del directivo evaluador al momento de emitir la resolución.",
    ("solicitudes_afiliacion", "resuelto_at"): "Marca de tiempo exacta (fecha y hora con zona horaria) en que se firmó la resolución.",

    # 3. cargas_familiares
    ("cargas_familiares", "id"): "Identificador único autoincremental de la carga familiar declarada en la incorporación.",
    ("cargas_familiares", "solicitud_id"): "Clave foránea que vincula la carga familiar con la solicitud de afiliación inicial del titular.",
    ("cargas_familiares", "socio_id"): "Clave foránea que vincula la carga familiar directamente con la cuenta del socio titular en 'usuarios'.",
    ("cargas_familiares", "nombre_completo"): "Nombres y apellidos completos del causante o dependiente declarado como carga familiar.",
    ("cargas_familiares", "run"): "RUN chileno de la carga familiar validado con algoritmo de Módulo 11.",
    ("cargas_familiares", "parentesco"): "Vínculo legal con el socio titular (Cónyuge, Hijo/a, Conviviente Civil, Padre/Madre).",
    ("cargas_familiares", "certificado_nombre"): "Nombre original del archivo digital adjunto (fotografía frontal de cédula o certificado civil).",
    ("cargas_familiares", "certificado_tipo"): "Categoría documental del respaldo adjunto (ej. 'Cédula de Identidad (Frontal)').",
    ("cargas_familiares", "certificado_data"): "Contenido codificado en Base64 o referencia del documento acreditativo de la carga familiar.",

    # 4. solicitudes_cargas_familiares
    ("solicitudes_cargas_familiares", "id"): "Identificador único autoincremental de la solicitud de evaluación de carga familiar.",
    ("solicitudes_cargas_familiares", "folio"): "Código correlativo anual único de la solicitud de carga familiar (formato CF-AAAA-NNNNN).",
    ("solicitudes_cargas_familiares", "socio_id"): "Clave foránea hacia el socio titular solicitante en la tabla 'usuarios'.",
    ("solicitudes_cargas_familiares", "carga_id"): "Clave foránea opcional hacia 'cargas_familiares' cuando la solicitud deriva de la incorporación inicial.",
    ("solicitudes_cargas_familiares", "socio_nombre"): "Snapshot de auditoría con el nombre completo del socio titular al momento de la solicitud.",
    ("solicitudes_cargas_familiares", "socio_rut"): "Snapshot de auditoría con el RUN del socio titular al momento de presentar la solicitud.",
    ("solicitudes_cargas_familiares", "socio_email"): "Snapshot del correo electrónico del socio titular para despacho de notificaciones de resolución.",
    ("solicitudes_cargas_familiares", "nombre_completo"): "Nombres y apellidos completos del familiar que se solicita inscribir como carga vigente.",
    ("solicitudes_cargas_familiares", "run"): "RUN chileno de la carga familiar sujeto a verificación de unicidad y Módulo 11.",
    ("solicitudes_cargas_familiares", "parentesco"): "Relación de parentesco legal respecto del funcionario titular (Hijo/a, Cónyuge, etc.).",
    ("solicitudes_cargas_familiares", "observacion_socio"): "Nota o antecedente adicional ingresado por el socio o por la secretaría al registrar la carga.",
    ("solicitudes_cargas_familiares", "certificado_nombre"): "Nombre del archivo digital de respaldo (certificado de nacimiento, matrimonio o cédula).",
    ("solicitudes_cargas_familiares", "certificado_tipo"): "Tipo de certificado legal exigido según el parentesco declarado.",
    ("solicitudes_cargas_familiares", "certificado_data"): " Respaldo digital adjunto para verificación visual por parte de la Directiva.",
    ("solicitudes_cargas_familiares", "estado"): "Estado de resolución de la carga ('Pendiente de aprobación', 'Aprobada' o 'Rechazada').",
    ("solicitudes_cargas_familiares", "resuelto_por_id"): "Clave foránea hacia el directivo o administrador en 'usuarios' que evaluó la solicitud.",
    ("solicitudes_cargas_familiares", "fecha_sesion"): "Fecha de la sesión de Directorio en que se aprobó o rechazó la inscripción de la carga.",
    ("solicitudes_cargas_familiares", "numero_acta"): "Número de Acta de Directorio donde consta la incorporación oficial de la carga.",
    ("solicitudes_cargas_familiares", "observaciones_resolucion"): "Observaciones de aprobación o motivo fundado de rechazo para subsanación.",
    ("solicitudes_cargas_familiares", "resuelto_por"): "Snapshot histórico con el nombre y cargo del evaluador al momento de resolver.",
    ("solicitudes_cargas_familiares", "resuelto_at"): "Fecha y hora exacta en que la Directiva emitió la resolución sobre la carga familiar.",

    # 5. solicitudes_reembolso
    ("solicitudes_reembolso", "id"): "Identificador único autoincremental de la solicitud de reembolso médico.",
    ("solicitudes_reembolso", "codigo"): "Código correlativo institucional de la solicitud de reembolso (formato RMB-NNNN).",
    ("solicitudes_reembolso", "socio_id"): "Clave foránea hacia el socio titular en 'usuarios' a cuyo cupo anual se imputa el gasto.",
    ("solicitudes_reembolso", "tipo_prestacion"): "Categoría médica del gasto (farmacia, consulta, dental, examenes, optica, hospitalizacion, otros).",
    ("solicitudes_reembolso", "descripcion"): "Detalle descriptivo de la prestación médica, medicamentos o atención recibida.",
    ("solicitudes_reembolso", "beneficiario_nombre"): "Nombre completo del paciente atendido (puede ser el socio titular o una carga aprobada).",
    ("solicitudes_reembolso", "beneficiario_parentesco"): "Calidad del paciente respecto del socio ('Titular' o el parentesco de la carga familiar).",
    ("solicitudes_reembolso", "beneficiario_run"): "RUN chileno del paciente beneficiario de la prestación de salud.",
    ("solicitudes_reembolso", "monto_boleta"): "Monto total facturado en la boleta o bono médico expresado en pesos chilenos enteros (CLP).",
    ("solicitudes_reembolso", "monto_copago"): "Monto efectivo de bolsillo (copago no cubierto por Fonasa/Isapre) solicitado a reembolsar en CLP.",
    ("solicitudes_reembolso", "monto_reembolso"): "Monto final en CLP imputado al cupo anual del socio (retenido preventivamente al postular).",
    ("solicitudes_reembolso", "fecha_atencion"): "Fecha en que se efectuó la prestación médica (sujeta al plazo máximo de 30 días corridos).",
    ("solicitudes_reembolso", "fecha_boleta"): "Fecha de emisión del documento tributario, boleta de farmacia o bono de atención.",
    ("solicitudes_reembolso", "tipo_documento"): "Clase de respaldo adjunto (receta_medica, boleta_detallada, bono_copago, comprobante_isapre_fonasa).",
    ("solicitudes_reembolso", "comprobante_filename"): "Nombre original del archivo PDF o imagen del comprobante subido por el socio.",
    ("solicitudes_reembolso", "comprobante_url"): "Ruta interna del endpoint seguro para visualizar o descargar el comprobante médico.",
    ("solicitudes_reembolso", "declaracion_aceptada"): "Aceptación obligatoria de la declaración jurada sobre la veracidad y legalidad del gasto.",
    ("solicitudes_reembolso", "estado"): "Estado del flujo del reembolso ('borrador', 'en_revision', 'aprobado', 'rechazado', 'pagado').",
    ("solicitudes_reembolso", "motivo_rechazo"): "Justificación obligatoria registrada por la administración cuando se rechaza y restituye el saldo.",
    ("solicitudes_reembolso", "revisado_por_id"): "Clave foránea hacia el directivo o administrador en 'usuarios' que aprobó o rechazó el reembolso.",
    ("solicitudes_reembolso", "fecha_revision"): "Fecha y hora exacta en que la administración resolvió la solicitud de reembolso.",

    # 6. bonos_catalogo
    ("bonos_catalogo", "id"): "Identificador único autoincremental del bono en el catálogo oficial.",
    ("bonos_catalogo", "codigo"): "Clave única identificadora del beneficio (ej. vacaciones, escolaridad, nacimiento, invierno, navidad).",
    ("bonos_catalogo", "nombre"): "Título institucional oficial del bono o beneficio social en el reglamento.",
    ("bonos_catalogo", "porcentaje"): "Porcentaje reglamentario de cálculo sobre el Sueldo Base Imponible del Grado 15 Municipal.",
    ("bonos_catalogo", "categoria"): "Clasificación temática del beneficio (Descanso, Educación Familiar, Contingencia, Calendario, etc.).",
    ("bonos_catalogo", "requisitos"): "Condiciones estatutarias que debe acreditar el socio para acceder al beneficio.",
    ("bonos_catalogo", "documentacion_requerida"): "Certificados o decretos exigidos como respaldo obligatorio para cursar el bono.",
    ("bonos_catalogo", "regla_asignacion"): "Modalidad de otorgamiento (postulación del socio, asignación directa o nómina masiva).",
    ("bonos_catalogo", "periodo_devengo"): "Época o mes del año en que se devenga el beneficio según el calendario del Comité.",
    ("bonos_catalogo", "permite_postulacion_socio"): "Define si el bono admite postulación directa desde el portal del socio (true) o solo nómina (false).",
    ("bonos_catalogo", "es_calendario"): "Indica si corresponde a un bono periódico masivo de calendario (Invierno / Navidad).",
    ("bonos_catalogo", "activo"): "Indica si el bono se encuentra vigente y habilitado en el catálogo actual del Comité.",
    ("bonos_catalogo", "icono"): "Identificador del ícono vectorial asociado a la tarjeta del beneficio en la interfaz web.",

    # 7. solicitudes_beneficio
    ("solicitudes_beneficio", "id"): "Identificador único autoincremental de la postulación o liquidación de bono social.",
    ("solicitudes_beneficio", "socio_id"): "Clave foránea hacia el funcionario beneficiario en la tabla 'usuarios'.",
    ("solicitudes_beneficio", "bono_id"): "Clave foránea hacia la definición oficial del bono en la tabla 'bonos_catalogo'.",
    ("solicitudes_beneficio", "tipo_bono"): "Código identificador del bono solicitado (ej. vacaciones, escolaridad, nacimiento).",
    ("solicitudes_beneficio", "titulo_bono"): "Snapshot con el nombre oficial del bono al momento de registrarse la postulación.",
    ("solicitudes_beneficio", "porcentaje_base"): "Snapshot del porcentaje del Grado 15 aplicado para calcular el beneficio en esa fecha.",
    ("solicitudes_beneficio", "sueldo_base_referencia"): "Snapshot en CLP del Sueldo Base Grado 15 vigente al momento del cálculo (auditoría CGR).",
    ("solicitudes_beneficio", "monto_calculado"): "Monto líquido resultante en pesos chilenos enteros (CLP) a pagar al socio beneficiario.",
    ("solicitudes_beneficio", "estado"): "Estado administrativo de la solicitud ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'LIQUIDADO').",
    ("solicitudes_beneficio", "motivo"): "Descripción del evento o contingencia invocada por el socio al postular al bono.",
    ("solicitudes_beneficio", "documento_tipo"): "Tipo de documento legal presentado como respaldo (Decreto Alcaldicio, Certificado Civil, FIBE).",
    ("solicitudes_beneficio", "documento_nombre"): "Nombre del archivo digital adjunto que respalda el otorgamiento del beneficio.",
    ("solicitudes_beneficio", "documento_url"): "Ruta de almacenamiento interno del documento o decreto digitalizado.",
    ("solicitudes_beneficio", "decreto_numero"): "Número del Decreto Alcaldicio que autoriza el feriado legal o respalda el beneficio.",
    ("solicitudes_beneficio", "decreto_fecha"): "Fecha de emisión del Decreto Alcaldicio asociado a la solicitud.",
    ("solicitudes_beneficio", "dias_habiles_feriado"): "Cantidad de días hábiles continuos de feriado legal acreditados (mínimo 10 para Bono Vacaciones).",
    ("solicitudes_beneficio", "nombre_beneficiario"): "Nombre del causante directo del bono (ej. hijo estudiante o recién nacido).",
    ("solicitudes_beneficio", "rut_beneficiario"): "RUN chileno del causante o carga asociada al bono de escolaridad o nacimiento.",
    ("solicitudes_beneficio", "institucion_educacional"): "Establecimiento educacional o universidad reconocida por el MINEDUC (Bono Escolaridad).",
    ("solicitudes_beneficio", "nivel_educacional"): "Nivel cursado por el estudiante (Prebásica, Básica, Media o Superior).",
    ("solicitudes_beneficio", "edad_estudiante"): "Edad del estudiante al postular (regla estatutaria: tope máximo de 24 años para Escolaridad).",
    ("solicitudes_beneficio", "asignacion_directa"): "Indica si fue otorgado de oficio por administración/nómina (true) o por postulación del socio (false).",
    ("solicitudes_beneficio", "motivo_rechazo"): "Causal fundada en caso de que la Directiva rechace la postulación al bono.",
    ("solicitudes_beneficio", "observaciones_admin"): "Anotaciones internas de revisión y liquidación registradas por Secretaría o Tesorería.",
    ("solicitudes_beneficio", "revisado_por_id"): "Clave foránea hacia el directivo o administrador en 'usuarios' que visó la solicitud.",
    ("solicitudes_beneficio", "fecha_revision"): "Fecha y hora exacta en que se efectuó la revisión administrativa del bono.",
    ("solicitudes_beneficio", "metodo_pago"): "Medio de pago empleado por Tesorería ('Cheque' o 'Transferencia').",
    ("solicitudes_beneficio", "numero_cheque"): "Folio del cheque bancario o comprobante de transferencia emitido al socio.",
    ("solicitudes_beneficio", "banco_emisor"): "Entidad bancaria emisora del documento de pago (por defecto 'BancoEstado').",
    ("solicitudes_beneficio", "fecha_liquidacion"): "Fecha y hora exacta en que Tesorería formalizó el pago o entrega del cheque.",
    ("solicitudes_beneficio", "liquidado_por_id"): "Clave foránea hacia el Tesorero o Administrador en 'usuarios' que ejecutó la liquidación.",

    # 8. nominas_masivas
    ("nominas_masivas", "id"): "Identificador único autoincremental del proceso de nómina masiva.",
    ("nominas_masivas", "bono_id"): "Clave foránea hacia el bono de calendario correspondiente en 'bonos_catalogo'.",
    ("nominas_masivas", "tipo_bono"): "Código del beneficio masivo procesado ('invierno', 'navidad' o 'vacaciones_masivo').",
    ("nominas_masivas", "titulo"): "Título oficial de la planilla de liquidación masiva generada para Tesorería.",
    ("nominas_masivas", "periodo"): "Período o mes calendario al que corresponde la liquidación (ej. 'Julio 2026', 'Diciembre 2026').",
    ("nominas_masivas", "porcentaje"): "Porcentaje sobre el Grado 15 aplicado a la nómina (15% Invierno; 10% a 15% Navidad).",
    ("nominas_masivas", "sueldo_base_utilizado"): "Snapshot en CLP del Sueldo Base Grado 15 vigente al momento de ejecutar la nómina.",
    ("nominas_masivas", "monto_unitario"): "Monto individual en CLP calculado para cada socio habilitado dentro de la nómina.",
    ("nominas_masivas", "total_socios_evaluados"): "Cantidad total de socios activos del padrón analizados por el motor de nómina.",
    ("nominas_masivas", "total_socios_beneficiados"): "Cantidad de socios que cumplieron los 6 meses de carencia y recibieron el beneficio.",
    ("nominas_masivas", "total_socios_excluidos"): "Cantidad de socios excluidos automáticamente por encontrarse aún en período de carencia (< 6 meses).",
    ("nominas_masivas", "monto_total_liquidado"): "Desembolso financiero total en CLP requerido por la nómina (beneficiados × monto unitario).",
    ("nominas_masivas", "estado"): "Estado administrativo de la nómina masiva (ej. 'APROBADA_TESORERIA').",
    ("nominas_masivas", "decreto_marco"): "Número del Decreto Alcaldicio marco que autoriza el pago colectivo del beneficio.",
    ("nominas_masivas", "acuerdo_directorio_acta"): "Referencia al Acta del Directorio de Bienestar donde se aprobó el porcentaje y presupuesto.",
    ("nominas_masivas", "creado_por_id"): "Clave foránea hacia el directivo o administrador en 'usuarios' que generó y cerró la nómina.",

    # 9. detalles_nomina_masiva
    ("detalles_nomina_masiva", "id"): "Identificador único autoincremental del registro de detalle dentro de la nómina.",
    ("detalles_nomina_masiva", "nomina_id"): "Clave foránea hacia la cabecera del proceso en la tabla 'nominas_masivas'.",
    ("detalles_nomina_masiva", "socio_id"): "Clave foránea hacia el funcionario evaluado en la tabla 'usuarios'.",
    ("detalles_nomina_masiva", "rut"): "Snapshot inmutable con el RUN del socio evaluado al momento de cerrarse la nómina.",
    ("detalles_nomina_masiva", "nombre_completo"): "Snapshot inmutable con el nombre completo del funcionario evaluado en la planilla.",
    ("detalles_nomina_masiva", "departamento"): "Snapshot con la unidad o departamento municipal del socio a la fecha de la nómina.",
    ("detalles_nomina_masiva", "antiguedad_texto"): "Snapshot con la glosa de antigüedad que registraba el socio al momento del corte.",
    ("detalles_nomina_masiva", "antiguedad_meses"): "Snapshot con la cantidad exacta de meses de permanencia evaluada por la regla de carencia.",
    ("detalles_nomina_masiva", "cumple_antiguedad"): "Indica si el socio superó el filtro de 6 meses de carencia mínima (true = habilitado; false = excluido).",
    ("detalles_nomina_masiva", "motivo_exclusion"): "Causal registrada automáticamente cuando el socio queda excluido del pago (ej. carencia vigente).",
    ("detalles_nomina_masiva", "monto"): "Monto individual en CLP asignado al socio en la nómina ($0 si fue excluido por carencia).",
    ("detalles_nomina_masiva", "decreto_asociado"): "Número de decreto individual o marco asociado al pago de ese funcionario.",
    ("detalles_nomina_masiva", "decreto_digital_url"): "Ruta del archivo PDF del decreto digitalizado vinculado al registro de pago.",
    ("detalles_nomina_masiva", "metodo_pago"): "Modalidad de pago instruida a Tesorería para el socio (por defecto 'Cheque').",
    ("detalles_nomina_masiva", "numero_cheque"): "Folio correlativo del cheque asignado individualmente al socio beneficiado.",
    ("detalles_nomina_masiva", "banco"): "Institución bancaria contra la cual se gira el cheque del beneficio.",
    ("detalles_nomina_masiva", "estado_pago"): "Estado de emisión del pago individual ('EMITIDO' para habilitados o 'EXCLUIDO').",

    # 10. audit_logs
    ("audit_logs", "id"): "Identificador único secuencial del evento en la bitácora forense.",
    ("audit_logs", "created_at"): "Estampa de tiempo exacta e inalterable (TIMESTAMPTZ) en que ocurrió la acción auditada.",
    ("audit_logs", "usuario_id"): "Clave foránea hacia el actor en 'usuarios' que ejecutó la operación (NULL si es postulante externo).",
    ("audit_logs", "usuario_nombre"): "Snapshot forense inmutable con el nombre completo de quien ejecutó la acción.",
    ("audit_logs", "usuario_rut"): "Snapshot forense inmutable con el RUN del actor al momento del evento.",
    ("audit_logs", "usuario_rol"): "Snapshot forense con el rol con que operaba el usuario al ejecutar la acción.",
    ("audit_logs", "modulo"): "Módulo funcional donde se originó el evento (AFILIACION, REEMBOLSOS, BENEFICIOS, SEGURIDAD, etc.).",
    ("audit_logs", "accion"): "Código tipificado de la operación crítica realizada (ej. APROBAR_SOLICITUD_DIRECTORIO, LIQUIDAR_BONO).",
    ("audit_logs", "recurso_tipo"): "Nombre de la entidad de dominio afectada por la operación (User, SolicitudReembolso, etc.).",
    ("audit_logs", "recurso_id"): "Folio o identificador primario del registro específico afectado por la transacción.",
    ("audit_logs", "detalles"): "Evidencia descriptiva completa de los valores modificados, montos o acuerdos asociados.",
    ("audit_logs", "ip_origen"): "Dirección IP o identificador de origen desde donde se solicitó la transacción.",

    # 11. parametros_sistema
    ("parametros_sistema", "id"): "Identificador único autoincremental del parámetro de configuración.",
    ("parametros_sistema", "clave"): "Nombre único de la constante institucional (ej. SUELDO_BASE_GRADO_15, BONO_NAVIDAD_PORCENTAJE).",
    ("parametros_sistema", "valor"): "Valor vigente del parámetro (ej. '750000' para el Sueldo Base Grado 15 en CLP).",
    ("parametros_sistema", "descripcion"): "Explicación normativa de la finalidad del parámetro dentro del Reglamento de Bienestar.",
}


def get_col_description(tname: str, cname: str) -> str:
    if (tname, cname) in SPECIFIC_COL_DESC:
        return SPECIFIC_COL_DESC[(tname, cname)].strip()
    if cname == "created_at":
        return f"Fecha y hora exacta de creación del registro en la tabla '{tname}' (trazabilidad temporal)."
    if cname == "updated_at":
        return f"Fecha y hora de la última actualización experimentada por el registro en '{tname}'."
    raise KeyError(f"Falta descripción para ({tname}, {cname})")


def get_full_postgres_metadata():
    sql = """
    SELECT json_agg(t) FROM (
        SELECT 
            table_name,
            (
                SELECT json_agg(json_build_object(
                    'name', column_name,
                    'type', data_type,
                    'udt_name', udt_name,
                    'char_len', character_maximum_length,
                    'nullable', is_nullable,
                    'default', column_default
                ) ORDER BY ordinal_position)
                FROM information_schema.columns c
                WHERE c.table_schema = 'public' AND c.table_name = tables.table_name
            ) as columns,
            (
                SELECT coalesce(json_agg(kcu.column_name), '[]'::json)
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public' AND tc.table_name = tables.table_name
            ) as pks,
            (
                SELECT coalesce(json_agg(json_build_object(
                    'col', kcu.column_name,
                    'foreign_table', ccu.table_name,
                    'foreign_col', ccu.column_name
                )), '[]'::json)
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage ccu
                  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND tc.table_name = tables.table_name
            ) as fks
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name NOT LIKE 'v_%'
        ORDER BY table_name
    ) t;
    """
    cmd = [
        "docker", "exec", "-i", "bienestar_postgres",
        "psql", "-U", "bienestar_user", "-d", "bienestar_db", "-t", "-A", "-c", sql
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"Error consultando PostgreSQL: {res.stderr}")
    return json.loads(res.stdout.strip())


def format_sql_type(col: dict) -> str:
    raw = col["type"]
    if raw == "character varying":
        length = col.get("char_len")
        return f"VARCHAR({length})" if length else "VARCHAR"
    if raw == "timestamp with time zone":
        return "TIMESTAMPTZ"
    if raw == "double precision":
        return "FLOAT (FLOAT8)"
    if raw == "integer":
        return "INTEGER"
    if raw == "boolean":
        return "BOOLEAN"
    if raw == "date":
        return "DATE"
    if raw == "text":
        return "TEXT"
    if raw == "USER-DEFINED":
        return f"ENUM ({col.get('udt_name', 'enum')})"
    return raw.upper()


def build_html_table(idx: int, tname: str, tdata: dict) -> str:
    pks = set(tdata["pks"])
    fks = {fk["col"]: fk for fk in tdata["fks"]}
    cols = tdata["columns"]
    desc_tabla = TABLE_INFO.get(tname, "")

    rows_html = []
    # Título superior de la tabla
    rows_html.append(
        f'<tr style="background-color:#0c2b45; color:#ffffff;">'
        f'<td colspan="5" style="padding:10px 14px; font-size:13px; font-weight:bold; border:1px solid #0c2b45; text-align:left;">'
        f'TABLA {idx}: {html.escape(tname)} ({len(cols)} atributos) &mdash; '
        f'<span style="font-weight:normal; color:#e2e8f0;">{html.escape(desc_tabla)}</span>'
        f'</td></tr>'
    )
    # Cabecera de las 5 columnas solicitadas por Javiera
    rows_html.append(
        '<tr style="background-color:#006799; color:#ffffff; font-weight:bold; font-size:11.5px;">'
        '<td style="width:18%; padding:7px 10px; border:1px solid #cbd5e1; text-align:left;">Atributo</td>'
        '<td style="width:15%; padding:7px 10px; border:1px solid #cbd5e1; text-align:left;">Tipo de Dato</td>'
        '<td style="width:16%; padding:7px 10px; border:1px solid #cbd5e1; text-align:center;">PK / FK</td>'
        '<td style="width:7%; padding:7px 10px; border:1px solid #cbd5e1; text-align:center;">Nulo</td>'
        '<td style="width:44%; padding:7px 10px; border:1px solid #cbd5e1; text-align:left;">Descripci&oacute;n</td>'
        '</tr>'
    )

    for r_idx, c in enumerate(cols):
        cname = c["name"]
        ctype = format_sql_type(c)
        nulo_str = "Sí" if c["nullable"] == "YES" else "No"
        bg = "#ffffff" if r_idx % 2 == 0 else "#f8fafc"

        if cname in pks:
            pk_fk_html = '<b style="color:#0c2b45;">PK</b>'
            attr_html = f'<b><u>{html.escape(cname)}</u></b>'
        elif cname in fks:
            fk_info = fks[cname]
            pk_fk_html = f'<b style="color:#006799;">FK ({html.escape(fk_info["foreign_table"])}.{html.escape(fk_info["foreign_col"])})</b>'
            attr_html = f'<b>{html.escape(cname)}</b>'
        else:
            pk_fk_html = '-'
            attr_html = html.escape(cname)

        desc_col = get_col_description(tname, cname)

        rows_html.append(
            f'<tr style="background-color:{bg}; color:#1e293b; font-size:11px;">'
            f'<td style="padding:6px 10px; border:1px solid #cbd5e1; font-family:Consolas,monospace;">{attr_html}</td>'
            f'<td style="padding:6px 10px; border:1px solid #cbd5e1; font-family:Consolas,monospace; color:#334155;">{html.escape(ctype)}</td>'
            f'<td style="padding:6px 10px; border:1px solid #cbd5e1; text-align:center;">{pk_fk_html}</td>'
            f'<td style="padding:6px 10px; border:1px solid #cbd5e1; text-align:center; font-weight:bold;">{nulo_str}</td>'
            f'<td style="padding:6px 10px; border:1px solid #cbd5e1; text-align:left;">{html.escape(desc_col)}</td>'
            f'</tr>'
        )

    return (
        '<table style="width:100%; border-collapse:collapse; font-family:Helvetica,Arial,sans-serif; '
        'background-color:#ffffff; border:2px solid #0c2b45;">'
        + "".join(rows_html)
        + "</table>"
    )


def calc_box_height(num_cols: int) -> int:
    # Altura exacta para que la tabla HTML quepa con holgura sin recortar ninguna fila
    return 78 + (num_cols * 29)


def create_overview_diagram(t_map: dict) -> ET.Element:
    diagram = ET.Element("diagram", {"id": "diccionario_vista_general", "name": "Vista General (11 Tablas)"})
    curr_y = 100
    table_Width = 1280

    # Calcular alto total del lienzo
    total_h = 150
    for tname in TABLE_ORDER:
        total_h += calc_box_height(len(t_map[tname]["columns"])) + 50

    model = ET.SubElement(diagram, "mxGraphModel", {
        "dx": "1500", "dy": "1200", "grid": "1", "gridSize": "10", "guides": "1",
        "tooltips": "1", "connect": "1", "arrows": "1", "fold": "1", "page": "1",
        "pageScale": "1", "pageWidth": "1440", "pageHeight": str(total_h), "background": "#f8fafc"
    })
    root = ET.SubElement(model, "root")
    ET.SubElement(root, "mxCell", {"id": "0"})
    ET.SubElement(root, "mxCell", {"id": "1", "parent": "0"})

    banner = ET.SubElement(root, "mxCell", {
        "id": "banner_diccionario",
        "value": (
            "COMITE DE BIENESTAR - ILUSTRE MUNICIPALIDAD DE PERALILLO&#xa;"
            "DICCIONARIO DE DATOS OFICIAL EN POSTGRESQL 15 (11 TABLAS, 201 ATRIBUTOS, 18 CLAVES FORANEAS)"
        ),
        "style": (
            "text;html=1;strokeColor=#0c2b45;fillColor=#0c2b45;align=center;verticalAlign=middle;"
            "whiteSpace=wrap;rounded=1;fontColor=#ffffff;fontStyle=1;fontSize=15;"
        ),
        "parent": "1",
        "vertex": "1"
    })
    ET.SubElement(banner, "mxGeometry", {"x": "80", "y": "20", "width": str(table_Width), "height": "55", "as": "geometry"})

    for idx, tname in enumerate(TABLE_ORDER, 1):
        tdata = t_map[tname]
        html_tbl = build_html_table(idx, tname, tdata)
        box_h = calc_box_height(len(tdata["columns"]))

        cell = ET.SubElement(root, "mxCell", {
            "id": f"dict_tbl_{idx}_{tname}",
            "value": html_tbl,
            "style": (
                "text;html=1;strokeColor=none;fillColor=none;overflow=fill;"
                "align=left;verticalAlign=top;spacing=0;"
            ),
            "parent": "1",
            "vertex": "1"
        })
        ET.SubElement(cell, "mxGeometry", {
            "x": "80", "y": str(curr_y), "width": str(table_Width), "height": str(box_h), "as": "geometry"
        })
        curr_y += box_h + 45

    return diagram


def create_single_table_diagram(idx: int, tname: str, tdata: dict) -> ET.Element:
    box_h = calc_box_height(len(tdata["columns"]))
    table_Width = 1280
    page_h = max(900, box_h + 120)

    diagram = ET.Element("diagram", {"id": f"tab_{idx}_{tname}", "name": f"{idx}. {tname}"})
    model = ET.SubElement(diagram, "mxGraphModel", {
        "dx": "1500", "dy": "1000", "grid": "1", "gridSize": "10", "guides": "1",
        "tooltips": "1", "connect": "1", "arrows": "1", "fold": "1", "page": "1",
        "pageScale": "1", "pageWidth": "1440", "pageHeight": str(page_h), "background": "#ffffff"
    })
    root = ET.SubElement(model, "root")
    ET.SubElement(root, "mxCell", {"id": "0"})
    ET.SubElement(root, "mxCell", {"id": "1", "parent": "0"})

    html_tbl = build_html_table(idx, tname, tdata)
    cell = ET.SubElement(root, "mxCell", {
        "id": f"single_tbl_{idx}_{tname}",
        "value": html_tbl,
        "style": (
            "text;html=1;strokeColor=none;fillColor=none;overflow=fill;"
            "align=left;verticalAlign=top;spacing=0;"
        ),
        "parent": "1",
        "vertex": "1"
    })
    ET.SubElement(cell, "mxGeometry", {
        "x": "80", "y": "40", "width": str(table_Width), "height": str(box_h), "as": "geometry"
    })
    return diagram


def main():
    db_metadata = get_full_postgres_metadata()
    t_map = {t["table_name"]: t for t in db_metadata}

    assert set(t_map.keys()) == set(TABLE_ORDER), f"Diferencia de tablas: {set(t_map.keys()) ^ set(TABLE_ORDER)}"

    mxfile = ET.Element("mxfile", {
        "host": "app.diagrams.net",
        "modified": "2026-11-15T17:35:00.000Z",
        "agent": "Antigravity Peralillo Engine",
        "version": "21.0.0",
        "type": "device"
    })

    # Pestaña 1: Vista General con las 11 tablas
    mxfile.append(create_overview_diagram(t_map))

    # Pestañas 2 a 12: Una pestaña por cada tabla individual para facilitar capturas
    total_cols = 0
    for idx, tname in enumerate(TABLE_ORDER, 1):
        tdata = t_map[tname]
        total_cols += len(tdata["columns"])
        mxfile.append(create_single_table_diagram(idx, tname, tdata))

    output_path = "bienestar-app/docs/evidencias_bd/bienestar_diccionario_datos.drawio"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    ET.ElementTree(mxfile).write(output_path, encoding="utf-8", xml_declaration=True)
    print(f"Diccionario de Datos generado exitosamente: {output_path} ({len(TABLE_ORDER)} tablas, {total_cols} atributos documentados).")


if __name__ == "__main__":
    main()
