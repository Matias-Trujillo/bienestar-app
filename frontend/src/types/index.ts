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
