'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

function getGreetingByHour(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const WelcomeLoginExperience: React.FC = () => {
  const { user, justLoggedIn, dismissWelcome } = useAuth();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!justLoggedIn || !user) return;
    setIsExiting(false);

    // Inicia el desvanecimiento suave hacia el Dashboard tras 2.8s
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2800);

    // Desmonta el componente tras completar la transición (3.5s)
    const doneTimer = setTimeout(() => {
      dismissWelcome();
    }, 3500);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [justLoggedIn, user, dismissWelcome]);

  if (!justLoggedIn || !user) return null;

  const greeting = getGreetingByHour();
  const initials = getInitials(user.nombreCompleto);

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      dismissWelcome();
    }, 500);
  };

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-all duration-700 cursor-pointer select-none ${
        !isExiting
          ? 'opacity-100 backdrop-blur-2xl bg-[#061523]/88 pointer-events-auto'
          : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none scale-105'
      }`}
      title="Haz clic para continuar inmediatamente"
    >
      {/* Auras cromáticas institucionales de Peralillo en segundo plano */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#006799]/30 rounded-full blur-[110px] animate-pulse-aura" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-[#5b7c29]/30 rounded-full blur-[110px] animate-pulse-aura" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#cfa145]/20 rounded-full blur-[90px]" />
      </div>

      {/* Tarjeta ejecutiva de bienvenida única (centrada en el saludo y verificación de acceso) */}
      <div className="relative z-10 w-full max-w-md animate-welcome-portal-in">
        {/* Halo sutil multicolor Peralillo */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#006799] via-[#cfa145] to-[#5b7c29] rounded-[34px] blur-xl opacity-55" />

        <div className="relative bg-[#091e2e]/95 border border-[#cfa145]/35 rounded-[32px] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.7)] overflow-hidden p-8 sm:p-10 text-center">
          {/* Filete superior con la paleta del logo */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />

          {/* Avatar con anillo biométrico SVG animado y check de verificación */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-[#cfa145]/25 animate-spin" style={{ animationDuration: '14s' }} />

            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="peralilloWelcomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#006799" />
                  <stop offset="50%" stopColor="#cfa145" />
                  <stop offset="100%" stopColor="#78a200" />
                </linearGradient>
              </defs>
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="3.5"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#peralilloWelcomeGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="283"
                className="animate-draw-ring"
              />
            </svg>

            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#006799] via-[#0e4f68] to-[#5b7c29] flex items-center justify-center text-white text-2xl sm:text-3xl font-black tracking-tight shadow-inner ring-2 ring-white/15">
              {initials}
            </div>

            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-tr from-[#5b7c29] to-[#78a200] border-2 border-[#091e2e] flex items-center justify-center shadow-lg animate-pop-badge">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Etiqueta de acceso verificado */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-[#cfa145]/30 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#78a200] animate-ping" />
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-[#f3e3be]">
              Acceso Institucional Verificado
            </span>
          </div>

          {/* Saludo personalizado único (solo aparece aquí al iniciar sesión) */}
          <p className="text-xs sm:text-sm font-medium text-sky-200/85 tracking-wide mb-1">
            {greeting}, qué gusto verte de nuevo
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight shimmer-text mb-6">
            ¡Bienvenido/a, {user.nombreCompleto}!
          </h2>

          {/* Indicador de apertura de la Ficha Ejecutiva */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="h-1 w-48 mx-auto bg-white/10 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-gradient-to-r from-[#006799] via-[#cfa145] to-[#78a200] rounded-full animate-welcome-bar" />
            </div>
            <p className="text-[11px] text-slate-400">
              Abriendo tu Ficha Ejecutiva de Filiación Municipal...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
