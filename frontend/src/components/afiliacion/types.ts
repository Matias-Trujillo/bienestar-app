/**
 * Contratos de tipos segregados para el módulo de Afiliación y Cargas Familiares (ISP).
 */

export interface CargaSocioItem {
  id: string;
  folio?: string;
  socioNombre?: string;
  socioRut?: string;
  nombre: string;
  parentesco: string;
  rut: string;
  observacion?: string;
  certificadoNombre?: string | null;
  certificadoTipo?: string | null;
  certificadoData?: string | null;
  estado: string;
  fechaSolicitud?: string;
  observacionesResolucion?: string | null;
}

export interface SolicitudCargaItem {
  id: number;
  folio: string;
  socioId: number;
  socioNombre: string;
  socioRut: string;
  socioEmail?: string | null;
  nombreCompleto: string;
  run: string;
  parentesco?: string | null;
  observacionSocio?: string | null;
  certificadoNombre?: string | null;
  certificadoTipo?: string | null;
  certificadoData?: string | null;
  estado: 'Pendiente de aprobación' | 'Aprobada' | 'Rechazada' | string;
  fechaIngreso: string;
  fechaSesion?: string | null;
  numeroActa?: string | null;
  observacionesResolucion?: string | null;
  resueltoPor?: string | null;
  resueltoAt?: string | null;
}

export interface CertificadoVisorData {
  titulo: string;
  nombreArchivo: string;
  dataUrl: string;
  cargaNombre: string;
  socioNombre?: string;
}
