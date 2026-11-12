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
 * Valida un RUN chileno usando el algoritmo módulo 11 (requiere entre 7 y 8 dígitos base + 1 dígito verificador).
 */
export function isValidRun(value: string): boolean {
  const clean = (value || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 8 || clean.length > 9) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d{7,8}$/.test(body)) return false;
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
 * Formatea un RUN en tiempo real mientras el usuario escribe (ej: "171836972" -> "17.183.697-2").
 * Sólo permite números en el cuerpo y número o K en el dígito verificador (máx 9 caracteres limpios).
 */
export function formatRun(value: string): string {
  const raw = (value || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (!raw) return '';
  // Solo el último carácter puede ser 'K'; eliminar cualquier 'K' intermedia y limitar a 9 caracteres
  const digitsOnlyPrefix = raw.slice(0, -1).replace(/[^0-9]/g, '');
  const lastChar = raw.slice(-1);
  const clean = (digitsOnlyPrefix + lastChar).slice(0, 9);
  if (clean.length <= 1) return clean;
  const body = clean.slice(0, -1).replace(/^0+/, '') || '0';
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${clean.slice(-1)}`;
}

export const formatRut = formatRun;

/**
 * Diagnóstico detallado en vivo para un RUN chileno mientras se digita.
 */
export function validateRunLive(value: string): {
  isValid: boolean;
  cleanLength: number;
  error: string | null;
  successMsg: string | null;
} {
  const clean = (value || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length === 0) {
    return { isValid: false, cleanLength: 0, error: 'El RUN es obligatorio.', successMsg: null };
  }
  if (clean.length < 8) {
    return {
      isValid: false,
      cleanLength: clean.length,
      error: `RUN incompleto (${clean.length}/8 dígitos mínimos, ej: 12.345.678-9).`,
      successMsg: null,
    };
  }
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d{7,8}$/.test(body)) {
    return {
      isValid: false,
      cleanLength: clean.length,
      error: 'Formato de RUN inválido (solo números y dígito verificador).',
      successMsg: null,
    };
  }
  let sum = 0;
  let mult = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const res = 11 - (sum % 11);
  const expected = res === 11 ? '0' : res === 10 ? 'K' : String(res);
  if (dv !== expected) {
    return {
      isValid: false,
      cleanLength: clean.length,
      error: `RUN inválido (dígito verificador no corresponde).`,
      successMsg: null,
    };
  }
  return {
    isValid: true,
    cleanLength: clean.length,
    error: null,
    successMsg: '✔ RUN válido',
  };
}

/**
 * Extrae de forma segura el mensaje de error de una excepción desconocida (sin usar `any`).
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return 'Ocurrió un error inesperado';
}

