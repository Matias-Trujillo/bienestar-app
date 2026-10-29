'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

// Cuentas de prueba sembradas por el backend (app/db/init_db.py). Solo para entorno de desarrollo.
const TEST_ACCOUNTS = [
  { label: 'Superusuario', user: 'superadmin@mperalillo.cl', pass: 'Super#2026', color: 'rose' },
  { label: 'Presidente', user: 'msoto@mperalillo.cl', pass: 'Presi#2026', color: 'blue' },
  { label: 'Secretario', user: 'pfuentes@mperalillo.cl', pass: 'Secre#2026', color: 'sky' },
  { label: 'Tesorero', user: 'rmorales@mperalillo.cl', pass: 'Teso#2026', color: 'purple' },
  { label: 'Admin / Directiva', user: 'jcontreras@mperalillo.cl', pass: 'Admin#2026', color: 'indigo' },
  { label: 'Revisor / Auditor', user: 'aibarra@mperalillo.cl', pass: 'Audit#2026', color: 'amber' },
  { label: 'Socio', user: 'cvalenzuela@mperalillo.cl', pass: 'Socio#2026', color: 'emerald' },
] as const;

const COLOR_CLASSES: Record<string, string> = {
  rose: 'text-rose-700 hover:border-rose-500 hover:bg-rose-50/50',
  blue: 'text-blue-700 hover:border-blue-500 hover:bg-blue-50/50',
  sky: 'text-sky-700 hover:border-sky-500 hover:bg-sky-50/50',
  purple: 'text-purple-700 hover:border-purple-500 hover:bg-purple-50/50',
  indigo: 'text-indigo-700 hover:border-indigo-500 hover:bg-indigo-50/50',
  amber: 'text-amber-700 hover:border-amber-500 hover:bg-amber-50/50',
  emerald: 'text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50/50',
};

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username || !password) {
      setError('Ingresa tu RUT/correo y contraseña.');
      return;
    }
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg.includes('401') ? 'Credenciales incorrectas.' : 'No se pudo conectar con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a233a] via-[#0e314f] to-[#1a3818] flex items-center justify-center p-4 sm:p-6">
      {/* Fondo decorativo con luces institucionales Peralillo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0077b6]/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#558b2f]/15 rounded-full blur-3xl"></div>
        <div className="absolute top-2/3 right-1/3 w-80 h-80 bg-[#d97706]/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-lg space-y-6">
        {/* Cabecera / Marca con Logo Oficial de Peralillo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-white rounded-3xl shadow-2xl border border-white/20 backdrop-blur-md">
            <img
              src="/logo-peralillo.png"
              alt="Ilustre Municipalidad de Peralillo"
              className="h-16 sm:h-20 w-auto object-contain mx-auto"
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Comité de Bienestar
            </h1>
            <p className="text-sm text-sky-200 font-medium">
              Portal Oficial de Gestión Operativa y Financiera
            </p>
            <p className="text-xs text-[#ea580c] font-medium italic mt-0.5">
              "La comuna que soñamos"
            </p>
          </div>
        </div>

        {/* Tarjeta de Inicio de Sesión */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Iniciar Sesión</h2>
              <p className="text-xs text-slate-500">Ingresa tus credenciales institucionales</p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-[#0077b6] border border-sky-200">
              Período 2026
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-xs font-semibold text-slate-700 mb-1">
                RUT o Correo Electrónico
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej: 15.489.123-K o usuario@mperalillo.cl"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0077b6] transition"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0077b6] transition"
              />
            </div>

            {error && (
              <div id="login-error" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex justify-end text-xs">
              <a href="#" onClick={(e) => { e.preventDefault(); alert('Por favor contacte a mesa de ayuda: bienestar@mperalillo.cl'); }} className="text-slate-400 hover:text-slate-600">
                ¿Olvidaste tu clave?
              </a>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#0077b6] via-[#0284c7] to-[#558b2f] hover:from-[#0369a1] hover:to-[#436b1f] shadow-lg shadow-sky-950/20 transition active:scale-[0.99] disabled:opacity-60"
            >
              {submitting ? 'Verificando…' : 'Ingresar al Portal'}
            </button>
          </form>

          <a
            id="login-solicitar-incorporacion"
            href="/afiliacion/solicitud"
            className="mt-4 block w-full py-2.5 px-4 rounded-xl text-center font-semibold text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition"
          >
            ¿Aún no eres socio? Solicitar incorporación al Comité
          </a>

          {/* Cuentas de prueba (solo desarrollo): rellenan el formulario */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
                Cuentas de prueba (clic para rellenar)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TEST_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.user}
                    id={`test-account-${acc.label.split(' ')[0].toLowerCase()}`}
                    type="button"
                    onClick={() => { setUsername(acc.user); setPassword(acc.pass); setError(null); }}
                    className={`p-2.5 text-left rounded-xl border border-slate-200 transition ${COLOR_CLASSES[acc.color]}`}
                  >
                    <span className="block text-[11px] font-bold">{acc.label}</span>
                    <span className="block text-[10px] text-slate-400 truncate">{acc.user}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">
          Comité de Bienestar &copy; 2026 • Autenticación JWT
        </p>
      </div>
    </div>
  );
}
