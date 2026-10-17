/**
 * Cliente HTTP base para interactuar con la API en FastAPI.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Misma clave que usa AuthContext para guardar el token de sesión
const TOKEN_STORAGE_KEY = 'bienestar_token';

/** Convierte el cuerpo de error de FastAPI (`detail` string o lista de validaciones) en texto legible. */
function extraerMensajeError(body: string, fallback: string): string {
  if (!body) return fallback;
  try {
    const parsed = JSON.parse(body);
    const detail = parsed?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d: { msg?: string; loc?: (string | number)[] }) => {
          const campo = d.loc?.[d.loc.length - 1];
          const msg = (d.msg || '').replace(/^Value error, /, '');
          return campo ? `${campo}: ${msg}` : msg;
        })
        .join(' | ');
    }
  } catch {
    // El cuerpo no es JSON: se devuelve tal cual
  }
  return body;
}

export async function fetchFromApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Adjuntar automáticamente el token de sesión (en el navegador)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(extraerMensajeError(errorBody, `Error en API (${response.status}): ${response.statusText}`));
  }

  return response.json();
}

export async function subirArchivoApi<T>(endpoint: string, formData: FormData): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers: Record<string, string> = {};

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(extraerMensajeError(errorBody, `Error en subida de archivo (${response.status})`));
  }

  return response.json();
}
