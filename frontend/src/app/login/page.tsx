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
  const [splashStatus, setSplashStatus] = useState('Inicializando entorno municipal...');

  const startLoginTransition = () => {
    setIsExitingSplash(true);
    setTimeout(() => {
      setShowSplash(false);
    }, 600); // Salida cinematográfica suave de 600ms
  };

  React.useEffect(() => {
    // Progresión gradual de estados del splash (ritmo más pausado y cinematográfico)
    const statusTimer1 = setTimeout(() => {
      setSplashStatus('Cargando módulos y convenios de salud...');
    }, 1100);

    const statusTimer2 = setTimeout(() => {
      setSplashStatus('Comité de Bienestar listo...');
    }, 2200);

    // Transición automática tras ~3.1 segundos para apreciar la presentación
    const mainTimer = setTimeout(() => {
      startLoginTransition();
    }, 3100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        startLoginTransition();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(statusTimer1);
      clearTimeout(statusTimer2);
      clearTimeout(mainTimer);
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
    <div className="min-h-screen bg-gradient-to-br from-[#05131d] via-[#092236] to-[#0f2814] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Luces y auras ambientales institucionales Peralillo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-28 -left-28 w-[550px] h-[550px] bg-[#0077b6]/20 rounded-full blur-[110px] animate-pulse-aura" />
        <div className="absolute -bottom-28 -right-28 w-[550px] h-[550px] bg-[#558b2f]/20 rounded-full blur-[110px] animate-pulse-aura" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-[#ca8a04]/10 rounded-full blur-[100px]" />
        
        {/* Trama sutil de cuadrícula futurista / moderna */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* =========================================================================
          FASE 1: SPLASH INTRO CINEMÁTICO MODERNO (LOGO PROTAGONISTA)
          ========================================================================= */}
      {showSplash && (
        <div
          onClick={startLoginTransition}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 cursor-pointer transition-all duration-700 backdrop-blur-lg ${
            isExitingSplash
              ? 'opacity-0 scale-105 blur-md pointer-events-none'
              : 'opacity-100 scale-100 blur-0'
          }`}
          title="Haz clic o presiona Enter para omitir"
        >
          {/* Contenedor central con animación de entrada suave */}
          <div className="relative animate-splash-logo flex flex-col items-center text-center max-w-lg w-full space-y-7">
            
            {/* Halo de luz rotatorio tricolor Peralillo detrás del logo */}
            <div className="relative group">
              <div className="absolute -inset-6 bg-gradient-to-tr from-[#0077b6] via-[#ca8a04] to-[#558b2f] rounded-[48px] blur-2xl opacity-80 animate-rotate-halo" />
              
              <div className="relative animate-float-slow p-6 sm:p-8 bg-white/95 rounded-[36px] shadow-[0_20px_60px_-15px_rgba(0,119,182,0.4)] border-2 border-white/60 backdrop-blur-2xl transition transform hover:scale-105">
                <img
                  src="/logo-peralillo.png"
                  alt="Ilustre Municipalidad de Peralillo"
                  className="h-24 sm:h-32 w-auto object-contain mx-auto drop-shadow-md"
                />
              </div>
            </div>

            {/* Tipografía institucional de bienvenida con Shimmer moderno */}
            <div className="space-y-2.5">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.28em] text-sky-300 drop-shadow flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ca8a04] animate-ping" />
                Ilustre Municipalidad de Peralillo
                <span className="w-1.5 h-1.5 rounded-full bg-[#558b2f]" />
              </span>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight shimmer-text drop-shadow-2xl">
                Comité de Bienestar
              </h1>
              <p className="text-sm sm:text-base text-slate-200 font-medium tracking-wide">
                Portal Oficial de Gestión Operativa y Financiera
              </p>
              <p className="text-xs sm:text-sm text-[#ea580c] font-bold italic tracking-wider drop-shadow">
                «La comuna que soñamos»
              </p>
            </div>

            {/* Barra de progreso de carga estilizada y mensaje dinámico */}
            <div className="w-56 sm:w-64 space-y-2.5 pt-1">
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/15 shadow-inner">
                <div className="h-full bg-gradient-to-r from-[#0077b6] via-[#ca8a04] to-[#558b2f] rounded-full animate-progress-fill-slow" />
              </div>
              <p className="text-[11px] text-sky-200/90 font-mono tracking-wider transition-all duration-300">
                {splashStatus}
              </p>
            </div>

            {/* Botón sutil para saltar */}
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-white/80 bg-white/10 border border-white/20 hover:bg-white/25 hover:text-white transition shadow-sm">
                Toca la pantalla para continuar ➔
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FASE 2: FORMULARIO DE LOGIN LIMPIO Y MODERNO (SIN DUPLICACIÓN SUPERIOR)
          ========================================================================= */}
      <div
        className={`relative z-10 w-full max-w-lg space-y-5 transition-all duration-700 ${
          showSplash && !isExitingSplash
            ? 'opacity-0 scale-95 translate-y-8 pointer-events-none'
            : 'animate-reveal-card opacity-100 scale-100 translate-y-0'
        }`}
      >
        {/* Tarjeta de Inicio de Sesión Limpia */}
        <div className="bg-white rounded-3xl p-6 sm:p-9 shadow-2xl border border-slate-100">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0077b6] block mb-0.5">
                Portal de Bienestar • Peralillo
              </span>
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Iniciar Sesión</h2>
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
