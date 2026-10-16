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
