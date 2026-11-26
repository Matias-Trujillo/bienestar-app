export interface Padron31Dic {
  anio_fiscal: number;
  fecha_corte: string;
  socios_congelados_31_dic: number;
  factor_utm: number;
  total_utm_anual: number;
  valor_utm_referencia_clp: number;
  monto_estimado_clp: number;
}

export interface AporteMunicipalUtm {
  id: number;
  codigo: string;
  anio_fiscal: number;
  mes_transferencia: string;
  socios_congelados_31_dic: number;
  factor_utm: number;
  valor_utm_clp: number;
  monto_total_clp: number;
  numero_decreto: string;
  fecha_transferencia: string;
  observaciones: string;
  registrado_por_nombre: string | null;
  created_at: string;
}

export interface EstadoFinanciero {
  periodo_fiscal: string;
  socios_activos: number;
  socios_padron_31_dic: number;
  total_aportes_utm: number;
  cantidad_aportes_utm: number;
  fondo_general: number;
  fondo_salud_disponible: number;
  total_egresos_salud: number;
  total_egresos_beneficios: number;
}

export interface SimulacionUtmDraft {
  socios: number;
  valorUtmClp: number;
}

export function formatClp(monto: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(monto || 0);
}

export function formatCompactClp(monto: number): string {
  const abs = Math.abs(monto || 0);
  if (abs >= 1_000_000) {
    return `$${(monto / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `$${Math.round(monto / 1_000)}k`;
  }
  return formatClp(monto);
}
