/**
 * Formatea un número como moneda chilena (CLP) con formato "$150.000".
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea una fecha ISO a formato local legible (ej. 28 mar 2026).
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Retorna las clases de Tailwind CSS para badges según el estado del movimiento.
 */
export function getStatusBadgeStyle(estado: string): { bg: string; text: string; dot: string } {
  switch (estado) {
    case 'Aprobado':
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
      };
    case 'Pagado':
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        text: 'text-blue-700',
        dot: 'bg-blue-500',
      };
    case 'En Revisión':
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        text: 'text-amber-700',
        dot: 'bg-amber-500',
      };
    case 'Rechazado':
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        text: 'text-rose-700',
        dot: 'bg-rose-500',
      };
    default:
      return {
        bg: 'bg-slate-50 text-slate-700 border-slate-200',
        text: 'text-slate-700',
        dot: 'bg-slate-400',
      };
  }
}

/**
 * Valida un RUN chileno usando el algoritmo módulo 11.
 */
export function isValidRun(value: string): boolean {
  const clean = (value || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  let sum = 0;
  let mult = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const res = 11 - (sum % 11);
  const expected = res === 11 ? '0' : res === 10 ? 'K' : String(res);
  return dv === expected;
}

/**
 * Formatea un RUN como "12.345.678-9".
 */
export function formatRun(value: string): string {
  const clean = (value || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return value;
  const body = clean.slice(0, -1).replace(/^0+/, '');
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${clean.slice(-1)}`;
}
