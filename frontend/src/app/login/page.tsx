'use client';

import React, { useState } from 'react';
import { useAuth, SPLASH_SEEN_KEY, LOGOUT_USER_KEY } from '@/context/AuthContext';

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

  // Estados para la presentación inicial vs. despedida al cerrar sesión
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hasLogout = sessionStorage.getItem(LOGOUT_USER_KEY);
      const seenSplash = sessionStorage.getItem(SPLASH_SEEN_KEY);
      if (hasLogout || seenSplash === '1') return false;
    }
    return true;
  });
  const [isExitingSplash, setIsExitingSplash] = useState(false);
  const [splashStatus, setSplashStatus] = useState('Iniciando plataforma de atención para Funcionarios Municipales...');

  // Estado para la ceremonia de despedida cuando el usuario cierra sesión
  const [farewellUser, setFarewellUser] = useState<string | null>(null);
  const [isExitingFarewell, setIsExitingFarewell] = useState(false);

  const startLoginTransition = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
    }
    setIsExitingSplash(true);
    setTimeout(() => {
      setShowSplash(false);
    }, 1200);
  };

  const dismissFarewell = () => {
    setIsExitingFarewell(true);
    setTimeout(() => {
      setFarewellUser(null);
      setIsExitingFarewell(false);
    }, 650);
  };

  // Efecto al montar: detectar si venimos de un Cierre de Sesión para mostrar despedida en lugar del splash inicial
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const loggedOutName = sessionStorage.getItem(LOGOUT_USER_KEY);
    if (loggedOutName) {
      sessionStorage.removeItem(LOGOUT_USER_KEY);
      sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
      setShowSplash(false);
      setFarewellUser(loggedOutName);

      const exitTimer = setTimeout(() => {
        setIsExitingFarewell(true);
      }, 2400);

      const removeTimer = setTimeout(() => {
        setFarewellUser(null);
        setIsExitingFarewell(false);
      }, 3100);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(removeTimer);
      };
    }
  }, []);

  // Efecto de la presentación inicial (solo corre cuando showSplash es true)
  React.useEffect(() => {
    if (!showSplash) return;

    const statusTimer1 = setTimeout(() => {
      setSplashStatus('Cargando convenios de salud, reembolsos y beneficios...');
    }, 2400);

    const statusTimer2 = setTimeout(() => {
      setSplashStatus('Portal de Bienestar • Ilustre Municipalidad de Peralillo listo...');
    }, 4800);

    const mainTimer = setTimeout(() => {
      startLoginTransition();
    }, 7000);

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
  }, [showSplash]);

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
    <div className="min-h-screen bg-gradient-to-br from-[#061523] via-[#0a2133] to-[#112416] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Iluminación ambiental elegante inspirada en la paleta del escudo y logo de Peralillo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[620px] h-[620px] bg-[#006799]/25 rounded-full blur-[130px] animate-pulse-aura" />
        <div className="absolute -bottom-32 -right-32 w-[620px] h-[620px] bg-[#5b7c29]/25 rounded-full blur-[130px] animate-pulse-aura" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] bg-[#cfa145]/12 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:28px_28px] opacity-35" />
      </div>

      {/* =========================================================================
          CEREMONIA EJECUTIVA DE CIERRE DE SESIÓN (AL SALIR DEL PORTAL, SIN BUCLE)
          ========================================================================= */}
      {farewellUser && (
        <div
          onClick={dismissFarewell}
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 cursor-pointer transition-all duration-700 ${
            !isExitingFarewell
              ? 'opacity-100 backdrop-blur-2xl bg-[#061523]/88 pointer-events-auto'
              : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none scale-105'
          }`}
          title="Haz clic para volver al inicio de sesión"
        >
          <div className="relative z-10 w-full max-w-md animate-welcome-portal-in">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#006799] via-[#cfa145] to-[#5b7c29] rounded-[34px] blur-xl opacity-50" />

            <div className="relative bg-[#091e2e]/95 border border-[#cfa145]/35 rounded-[32px] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.7)] overflow-hidden p-8 sm:p-10 text-center">
              {/* Filete superior con la paleta del logo */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />

              {/* Escudo / Candado de Cierre Seguro con anillo SVG animado */}
              <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="peralilloFarewellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#cfa145" />
                      <stop offset="50%" stopColor="#78a200" />
                      <stop offset="100%" stopColor="#006799" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="3.5"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="url(#peralilloFarewellGrad)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray="283"
                    className="animate-draw-ring"
                  />
                </svg>

                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0c2b45] to-[#142b16] border border-[#cfa145]/40 flex items-center justify-center text-[#f3e3be] shadow-inner">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>

                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-tr from-[#5b7c29] to-[#78a200] border-2 border-[#091e2e] flex items-center justify-center shadow-lg animate-pop-badge">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              {/* Distintivo de sesión cerrada */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-[#cfa145]/30 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#cfa145]" />
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-[#f3e3be]">
                  Sesión Finalizada con Éxito
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight shimmer-text mb-2">
                ¡Hasta pronto, {farewellUser.split(' ')[0]}!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                Tus credenciales y datos previsionales han quedado resguardados de forma segura. Gracias por tu labor en la{' '}
                <strong className="text-[#f3e3be] font-semibold">I. Municipalidad de Peralillo</strong>.
              </p>

              <div className="pt-3 border-t border-white/10">
                <span className="text-[11px] text-sky-200/80 font-medium">
                  Volviendo al acceso principal...
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FASE 1: SPLASH INTRO INSTITUCIONAL ELEGANTE (SOLO EN LA PRIMERA VISITA)
          ========================================================================= */}
      {showSplash && (
        <div
          onClick={startLoginTransition}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-8 cursor-pointer transition-all duration-[1200ms] ease-in-out backdrop-blur-xl ${
            isExitingSplash
              ? 'opacity-0 scale-105 blur-lg pointer-events-none'
              : 'opacity-100 scale-100 blur-0'
          }`}
          title="Haz clic o presiona Enter para continuar al inicio de sesión"
        >
          <div className="relative animate-splash-logo flex flex-col items-center text-center max-w-3xl w-full space-y-7 sm:space-y-8">
            <div className="inline-flex items-center gap-3 px-5 py-1.5 rounded-full bg-[#091e2e]/80 border border-[#cfa145]/35 backdrop-blur-md shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-[#cfa145]" />
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[#f3e3be]">
                Atención al Personal y Socios • Municipalidad de Peralillo
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#78a200]" />
            </div>

            <div className="relative group w-full max-w-2xl mx-auto">
              <div className="absolute -inset-3 sm:-inset-4 bg-gradient-to-r from-[#006799]/55 via-[#cfa145]/45 to-[#5b7c29]/55 rounded-[36px] blur-2xl opacity-75 animate-rotate-halo" />
              
              <div className="relative animate-float-slow bg-white rounded-[30px] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.55)] ring-1 ring-[#cfa145]/40 overflow-hidden transition duration-700 transform hover:scale-[1.01]">
                <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />

                <div className="px-6 py-6 sm:px-12 sm:py-9">
                  <div className="relative w-full aspect-[2.85/1] overflow-hidden">
                    <img
                      src="/logo-peralillo.png"
                      alt="Ilustre Municipalidad de Peralillo - La comuna que soñamos"
                      className="w-[124%] max-w-none h-auto absolute left-1/2 -translate-x-[48.5%] -top-[27%] select-none pointer-events-none"
                    />
                  </div>
                </div>

                <div className="h-1 w-full bg-gradient-to-r from-[#5b7c29]/80 via-[#cfa145]/70 to-[#006799]/80" />
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight shimmer-text drop-shadow-xl">
                Servicio de Bienestar Municipal
              </h1>
              <div className="w-28 h-[2px] mx-auto rounded-full bg-gradient-to-r from-transparent via-[#cfa145] to-transparent opacity-80" />
              <p className="text-sm sm:text-base text-slate-200/90 font-normal tracking-wide max-w-xl mx-auto leading-relaxed">
                Acompañando y protegiendo a quienes sirven día a día a nuestra comunidad de Peralillo
              </p>
            </div>

            <div className="w-64 sm:w-80 space-y-2.5 pt-1">
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden p-[1px] border border-[#cfa145]/25 shadow-inner">
                <div className="h-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#e06324] rounded-full animate-progress-fill-slow" />
              </div>
              <p className="text-[11px] sm:text-xs text-[#f3e3be]/85 font-medium tracking-wider transition-all duration-500">
                {splashStatus}
              </p>
            </div>

            <div className="pt-1">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-slate-200/90 bg-white/5 border border-white/15 hover:border-[#cfa145]/50 hover:bg-white/10 hover:text-white transition shadow-sm">
                Haz clic en cualquier lugar para ir al Login ➔
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FASE 2: FORMULARIO DE LOGIN CON ACABADO INSTITUCIONAL ELEGANTE
          ========================================================================= */}
      <div
        className={`relative z-10 w-full max-w-lg space-y-5 transition-all duration-[1200ms] ease-out ${
          showSplash && !isExitingSplash
            ? 'opacity-0 scale-95 translate-y-8 pointer-events-none'
            : 'animate-reveal-card opacity-100 scale-100 translate-y-0'
        }`}
      >
        <div className="bg-white rounded-3xl shadow-2xl ring-1 ring-[#cfa145]/30 overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />

          <div className="p-6 sm:p-9">
            <div className="flex flex-col items-center text-center pb-5 mb-6 border-b border-slate-100">
              <div className="relative w-64 sm:w-72 aspect-[2.85/1] overflow-hidden mb-3">
                <img
                  src="/logo-peralillo.png"
                  alt="Ilustre Municipalidad de Peralillo"
                  className="w-[124%] max-w-none h-auto absolute left-1/2 -translate-x-[48.5%] -top-[27%] select-none pointer-events-none"
                />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#006799] bg-[#006799]/5 px-3.5 py-1 rounded-full border border-[#006799]/20 mb-2">
                Servicio de Bienestar • Atención al Funcionario
              </span>
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Iniciar Sesión en el Portal</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingresa tus credenciales de socio o funcionario municipal
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-username" className="block text-xs font-semibold text-slate-700 mb-1">
                  RUT o Correo Electrónico Institucional
                </label>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: 15.489.123-K o usuario@mperalillo.cl"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799] transition"
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
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799] transition"
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
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#006799] via-[#1c6e7d] to-[#5b7c29] hover:from-[#00547d] hover:to-[#486320] shadow-lg shadow-slate-900/15 transition active:scale-[0.99] disabled:opacity-60"
              >
                {submitting ? 'Verificando…' : 'Ingresar al Portal'}
              </button>
            </form>

            <a
              id="login-solicitar-incorporacion"
              href="/afiliacion/solicitud"
              className="mt-4 block w-full py-2.5 px-4 rounded-xl text-center font-semibold text-sm text-[#5b7c29] bg-[#5b7c29]/8 border border-[#5b7c29]/25 hover:bg-[#5b7c29]/15 transition"
            >
              ¿Aún no eres socio? Solicitar incorporación al Comité
            </a>

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
        </div>

        <div className="flex flex-col items-center justify-center gap-2 text-center text-xs text-slate-400">
          <p>Comité de Bienestar • Ilustre Municipalidad de Peralillo &copy; 2026</p>
          <button
            type="button"
            onClick={() => {
              setSplashStatus('Iniciando plataforma de atención para Funcionarios Municipales...');
              setIsExitingSplash(false);
              setShowSplash(true);
            }}
            className="text-[11px] text-[#f3e3be]/85 hover:text-white underline underline-offset-2 transition flex items-center gap-1"
          >
            <span>↺</span> Ver presentación de bienvenida nuevamente
          </button>
        </div>
      </div>
    </div>
  );
}
