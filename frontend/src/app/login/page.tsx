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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4 sm:p-6">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-lg space-y-6">
        {/* Cabecera / Marca */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/25 mb-2">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Comité de Bienestar
          </h1>
          <p className="text-sm text-slate-400">
            Portal Oficial de Gestión Operativa y Financiera • Ilustre Municipalidad de Peralillo
          </p>
        </div>

        {/* Tarjeta de Inicio de Sesión */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Iniciar Sesión</h2>
              <p className="text-xs text-slate-500">Ingresa tus credenciales institucionales</p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
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
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
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
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 transition active:scale-[0.99] disabled:opacity-60"
            >
              {submitting ? 'Verificando…' : 'Iniciar Sesión'}
            </button>
          </form>

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
