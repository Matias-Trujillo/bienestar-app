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

// ---------- Módulo Reembolsos Médicos (HU-03) ----------

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

export type EstadoReembolso =
  | 'borrador'
  | 'en_revision'
  | 'aprobado'
  | 'rechazado'
  | 'pagado';

export interface SolicitudReembolso {
  id: number;
  codigo: string;
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
}

export interface ValidacionFechaResponse {
  fecha_atencion: string;
  fecha_limite: string;
  dias_transcurridos: number;
  dentro_de_plazo: boolean;
  mensaje: string;
}

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
