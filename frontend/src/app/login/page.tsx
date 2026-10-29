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

  // Estados para la animación moderna de bienvenida / splash
  const [showSplash, setShowSplash] = useState(true);
  const [isExitingSplash, setIsExitingSplash] = useState(false);

  const startLoginTransition = () => {
    setIsExitingSplash(true);
    setTimeout(() => {
      setShowSplash(false);
    }, 450); // Tiempo para la salida suave
  };

  React.useEffect(() => {
    // Transición automática tras 1.9 segundos de presentación del logo
    const timer = setTimeout(() => {
      startLoginTransition();
    }, 1900);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        startLoginTransition();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-[#061523] via-[#0b2842] to-[#122e17] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Luces y auras ambientales institucionales Peralillo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-[#0077b6]/20 rounded-full blur-[100px] animate-pulse-aura" />
        <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] bg-[#558b2f]/20 rounded-full blur-[100px] animate-pulse-aura" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#ca8a04]/10 rounded-full blur-[90px]" />
      </div>

      {/* =========================================================================
          FASE 1: SPLASH INTRO CINEMÁTICO MODERNO (LOGO PROTAGONISTA)
          ========================================================================= */}
      {showSplash && (
        <div
          onClick={startLoginTransition}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 cursor-pointer transition-all duration-500 backdrop-blur-md ${
            isExitingSplash
              ? 'opacity-0 scale-105 pointer-events-none'
              : 'opacity-100 scale-100'
          }`}
          title="Haz clic o presiona Enter para omitir"
        >
          {/* Contenedor central del logo con aura pulsante */}
          <div className="relative animate-splash-logo flex flex-col items-center text-center max-w-md w-full space-y-6">
            
            {/* Halo de luz tricolor Peralillo detrás del logo */}
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-tr from-[#0077b6] via-[#ca8a04] to-[#558b2f] rounded-[36px] blur-2xl opacity-75 animate-pulse-aura" />
              
              <div className="relative p-5 sm:p-7 bg-white/95 rounded-[32px] shadow-2xl border-2 border-white/50 backdrop-blur-xl transition transform hover:scale-105">
                <img
                  src="/logo-peralillo.png"
                  alt="Ilustre Municipalidad de Peralillo"
                  className="h-20 sm:h-28 w-auto object-contain mx-auto drop-shadow-md"
                />
              </div>
            </div>

            {/* Tipografía institucional de bienvenida */}
            <div className="space-y-2">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.25em] text-sky-300 drop-shadow">
                Ilustre Municipalidad de Peralillo
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-lg">
                Comité de Bienestar
              </h1>
              <p className="text-sm sm:text-base text-slate-200 font-medium">
                Portal Oficial de Gestión Operativa y Financiera
              </p>
              <p className="text-xs sm:text-sm text-[#ea580c] font-semibold italic drop-shadow">
                «La comuna que soñamos»
              </p>
            </div>

            {/* Barra de progreso de carga estilizada */}
            <div className="w-48 sm:w-56 space-y-2 pt-2">
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div className="h-full bg-gradient-to-r from-[#0077b6] via-[#ca8a04] to-[#558b2f] rounded-full animate-progress-fill" />
              </div>
              <p className="text-[11px] text-sky-200/80 font-mono tracking-wider">
                Iniciando portal seguro…
              </p>
            </div>

            {/* Botón sutil para saltar */}
            <div className="pt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-white/70 bg-white/10 border border-white/15 hover:bg-white/20 transition">
                Toca la pantalla para continuar ➔
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FASE 2: FORMULARIO DE LOGIN REVELADO CON TRANSICIÓN SUAVE
          ========================================================================= */}
      <div
        className={`relative z-10 w-full max-w-lg space-y-6 transition-all duration-700 ${
          showSplash && !isExitingSplash
            ? 'opacity-0 scale-95 translate-y-6 pointer-events-none'
            : 'animate-reveal-card opacity-100 scale-100 translate-y-0'
        }`}
      >
        {/* Cabecera / Marca con Logo Oficial de Peralillo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-white rounded-3xl shadow-2xl border border-white/20 backdrop-blur-md transition hover:scale-105">
            <img
              src="/logo-peralillo.png"
              alt="Ilustre Municipalidad de Peralillo"
              className="h-14 sm:h-16 w-auto object-contain mx-auto"
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
              «La comuna que soñamos»
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

        <div className="flex flex-col items-center justify-center gap-2 text-center text-xs text-slate-400">
          <p>Comité de Bienestar &copy; 2026 • Autenticación JWT</p>
          <button
            type="button"
            onClick={() => {
              setIsExitingSplash(false);
              setShowSplash(true);
            }}
            className="text-[11px] text-sky-300/80 hover:text-white underline underline-offset-2 transition flex items-center gap-1"
          >
            <span>↺</span> Ver animación de bienvenida nuevamente
          </button>
        </div>
      </div>
    </div>
  );
}
