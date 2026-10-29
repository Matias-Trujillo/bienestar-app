export type EstadoPrevisional = 'Al día' | 'Pendiente' | 'En mora';

export type EstadoMovimiento = 'Aprobado' | 'Pagado' | 'En Revisión' | 'Rechazado';

export type UserRole =
  | 'superusuario'
  | 'presidente'
  | 'secretario'
  | 'tesorero'
  | 'admin'
  | 'auditor'
  | 'socio';

export interface User {
  id: string;
  rut: string;
  nombreCompleto: string;
  email: string;
  rol: UserRole;
  rolLabel: string;
  isSuperuser?: boolean;
  departamento: string;
  antiguedad: string;
  estadoPrevisional: EstadoPrevisional;
  saldoSaludDisponible: number;
  saldoSaludTotalAnual: number;
  cargasRegistradas: number;
  mesesAntiguedad?: number;
}

export interface BonoCatalogoItem {
  id: string;
  nombre: string;
  porcentaje: number;
  monto_calculado: number;
  categoria: string;
  requisitos: string;
  documentacion_requerida: string;
  regla_asignacion: string;
  periodo_devengo?: string;
  permite_postulacion_socio: boolean;
  icono: string;
}

export interface CatalogoBeneficios {
  sueldo_base_grado_15: number;
  fecha_actualizacion: string;
  bonos_contingencia: BonoCatalogoItem[];
  bonos_calendario: BonoCatalogoItem[];
}

export interface SolicitudBeneficio {
  id: number;
  socio_id: number;
  socio_nombre: string;
  socio_rut: string;
  socio_departamento: string;
  socio_antiguedad: string;
  socio_meses_antiguedad: number;
  tipo_bono: string;
  titulo_bono: string;
  porcentaje_base: number;
  sueldo_base_referencia: number;
  monto_calculado: number;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'LIQUIDADO';
  motivo?: string;
  documento_tipo: string;
  documento_nombre?: string;
  documento_url?: string;
  decreto_numero?: string;
  decreto_fecha?: string;
  dias_habiles_feriado?: number;
  nombre_beneficiario?: string;
  rut_beneficiario?: string;
  institucion_educacional?: string;
  nivel_educacional?: string;
  edad_estudiante?: number;
  asignacion_directa: boolean;
  motivo_rechazo?: string;
  observaciones_admin?: string;
  metodo_pago?: string;
  numero_cheque?: string;
  banco_emisor?: string;
  fecha_liquidacion?: string;
  created_at: string;
}

export interface SimularNominaItem {
  socio_id: number;
  rut: string;
  nombre_completo: string;
  departamento: string;
  antiguedad_texto: string;
  antiguedad_meses: number;
  cumple_antiguedad: boolean;
  motivo_exclusion?: string;
  monto: number;
  decreto_asociado?: string;
  decreto_digital_url?: string;
  numero_cheque_sugerido?: string;
}

export interface SimularNominaResponse {
  tipo_bono: string;
  titulo: string;
  periodo: string;
  porcentaje_aplicado: number;
  sueldo_base_utilizado: number;
  monto_unitario: number;
  total_socios_evaluados: number;
  total_socios_beneficiados: number;
  total_socios_excluidos: number;
  monto_total_requerido: number;
  decreto_marco?: string;
  items: SimularNominaItem[];
}

export interface NominaMasivaResumen {
  id: number;
  tipo_bono: string;
  titulo: string;
  periodo: string;
  porcentaje: number;
  sueldo_base_utilizado: number;
  monto_unitario: number;
  total_socios_beneficiados: number;
  total_socios_excluidos: number;
  monto_total_liquidado: number;
  estado: string;
  decreto_marco?: string;
  created_at: string;
}

export interface SocioProfile {
  id: number;
  rut: string;
  nombreCompleto: string;
  email: string;
  unidad: string;
  tipoContrato: string;
  fechaIngreso: string;
  estadoSocio: 'Socio Activo' | 'Socio Pasivo' | 'En Proceso';
  estadoPrevisional: EstadoPrevisional;
  saldoSaludDisponible: number;
  saldoSaludTotalAnual: number;
  cargasRegistradas: number;
}

export interface Movimiento {
  id: string;
  fecha: string;
  concepto: string;
  modulo: 'Afiliación' | 'Reembolsos Médicos' | 'Beneficios Sociales' | 'Control Financiero';
  monto: number;
  estado: EstadoMovimiento;
  comprobanteUrl?: string;
  detalle?: string;
}

export interface NavItem {
  name: string;
  href: string;
  description: string;
  badge?: string;
}

// ---------- Módulo Reembolsos Médicos (HU-03 y HU-04) ----------

// [ESTUDIANTE INFORMÁTICA] Unión de literales para tipos de prestación; permite tipar fuertemente en TypeScript y evitar errores en tiempo de compilación.
export type TipoPrestacion =
  | 'farmacia'
  | 'consulta'
  | 'dental'
  | 'examenes'
  | 'optica'
  | 'hospitalizacion'
  | 'programa_medico'
  | 'otros';

/** Tipos que el backend acepta para nuevas solicitudes. */
export const TIPOS_PRESTACION_SOLICITABLES: TipoPrestacion[] = [
  'farmacia',
  'consulta',
  'examenes',
  'programa_medico',
  'otros',
];

export const TIPOS_DOCUMENTO: Record<string, string> = {
  receta_medica: 'Receta médica',
  boleta_detallada: 'Boleta detallada',
  bono_copago: 'Bono con copago',
  comprobante_isapre_fonasa: 'Comprobante Isapre/Fonasa',
  timbre_no_reembolsable: "Timbre 'no reembolsable'",
};

export const TIPO_PRESTACION_LABELS: Record<TipoPrestacion, string> = {
  farmacia: 'Farmacia / Medicamentos con receta',
  consulta: 'Consulta Médica / Especialista',
  dental: 'Tratamiento Dental',
  examenes: 'Exámenes de Laboratorio o Radiología',
  optica: 'Lentes Ópticos',
  hospitalizacion: 'Hospitalización / Intervención',
  programa_medico: 'Programa Médico',
  otros: 'Otros',
};

// [ESTUDIANTE INFORMÁTICA] Estados posibles de una solicitud; permite validar que solo se manejen estados reconocidos por el flujo del sistema.
export type EstadoReembolso =
  | 'borrador'
  | 'en_revision'
  | 'aprobado'
  | 'rechazado'
  | 'pagado';

// [ESTUDIANTE INFORMÁTICA] Interfaz TypeScript que refleja una Solicitud de Reembolso completa; permite el autocompletado y validación de tipos al manipular solicitudes en React.
export interface SolicitudReembolso {
  id: number;
  codigo: string;
  socio_id?: number;
  socio_nombre?: string;
  socio_rut?: string;
  socio_departamento?: string;
  socio_email?: string;
  tipo_prestacion: TipoPrestacion;
  tipo_prestacion_label: string;
  descripcion: string;
  beneficiario_nombre: string;
  beneficiario_parentesco: string;
  monto_boleta: number;
  monto_copago: number;
  monto_reembolso: number;
  fecha_atencion: string;
  fecha_boleta: string;
  tipo_documento?: string;
  tipo_documento_label?: string;
  comprobante_filename: string;
  comprobante_url: string;
  estado: EstadoReembolso;
  estado_label: string;
  motivo_rechazo: string;
  created_at: string;
  anio_imputacion?: number;
}

export interface ResumenSaludSocio {
  socio_id: number;
  socio_nombre: string;
  rut: string;
  tipo_socio: string;
  estado_previsional: string;
  fecha_afiliacion: string;
  meses_antiguedad: number;
  puede_solicitar: boolean;
  fecha_habilitacion?: string | null;
  mensaje_carencia?: string | null;
  saldo_salud_disponible: number;
  saldo_salud_total_anual: number;
  porcentaje_utilizado: number;
  total_reembolsado_periodo: number;
  solicitudes_en_revision: number;
  solicitudes_aprobadas: number;
  anio_calendario?: number;
  fecha_inicio_periodo?: string;
  fecha_fin_periodo?: string;
  fecha_renovacion_anual?: string;
}

export interface ValidacionFechaResponse {
  fecha_atencion: string;
  fecha_limite: string;
  dias_transcurridos: int_or_num;
  dentro_de_plazo: boolean;
  mensaje: string;
}

type int_or_num = number;

export interface ReembolsoHistorialResponse {
  resumen: ResumenSaludSocio;
  solicitudes: SolicitudReembolso[];
}

export interface ReembolsoCreatePayload {
  tipo_prestacion: TipoPrestacion;
  descripcion: string;
  beneficiario_nombre: string;
  beneficiario_parentesco: string;
  monto_boleta: number;
  monto_copago: number;
  fecha_atencion: string;
  fecha_boleta: string;
}
