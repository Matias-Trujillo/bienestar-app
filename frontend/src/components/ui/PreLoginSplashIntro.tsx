'use client';

import React, { useEffect, useState } from 'react';

interface PreLoginSplashIntroProps {
  onFinish: () => void;
}

/**
 * [ESTUDIANTE INFORMÁTICA]
 * Componente cinemático de bienvenida institucional previo al login.
 * Muestra el escudo oficial de la I. Municipalidad de Peralillo con auras lumínicas
 * y barra de progreso. Se descarta automáticamente a los 1.9s o al hacer clic/presionar tecla.
 */
export const PreLoginSplashIntro: React.FC<PreLoginSplashIntroProps> = ({ onFinish }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onFinish();
    }, 680);
  };

  useEffect(() => {
    const autoTimer = setTimeout(() => {
      handleDismiss();
    }, 2800);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(autoTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 cursor-pointer select-none transition-all duration-700 ease-in-out bg-gradient-to-br from-[#061523] via-[#0b2842] to-[#122e17] ${
        isExiting ? 'opacity-0 scale-102 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      title="Haz clic o presiona Enter/Espacio para continuar"
    >
      {/* Luces y auras ambientales con paleta Peralillo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-[480px] h-[480px] bg-[#006799]/20 rounded-full blur-[100px] animate-pulse-aura" />
        <div
          className="absolute -bottom-24 -right-24 w-[480px] h-[480px] bg-[#166534]/20 rounded-full blur-[100px] animate-pulse-aura"
          style={{ animationDelay: '1.5s' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] bg-[#b45309]/10 rounded-full blur-[90px]" />
      </div>

      {/* Tarjeta del Logo con halo tricolor */}
      <div className="relative z-10 animate-splash-logo flex flex-col items-center text-center max-w-lg w-full space-y-6">
        <div className="relative group">
          <div className="absolute -inset-5 bg-gradient-to-tr from-[#006799] via-[#b45309] to-[#166534] rounded-[42px] blur-2xl opacity-80 animate-pulse-aura" />
          <div className="relative p-6 sm:p-8 md:p-9 bg-white/95 rounded-[36px] shadow-2xl border-2 border-white/60 backdrop-blur-xl transition-transform hover:scale-105">
            <img
              src="/logo-peralillo.png"
              alt="Ilustre Municipalidad de Peralillo"
              className="h-28 sm:h-36 md:h-44 w-auto object-contain mx-auto drop-shadow-lg"
            />
          </div>
        </div>

        {/* Tipografía institucional de bienvenida */}
        <div className="space-y-1.5">
          <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.25em] text-sky-300 drop-shadow">
            Ilustre Municipalidad de Peralillo
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">
            Comité de Bienestar
          </h1>
          <p className="text-sm sm:text-base text-slate-200 font-medium">
            Portal Oficial de Gestión Operativa y Financiera
          </p>
          <p className="text-xs sm:text-sm text-[#ea580c] font-semibold italic drop-shadow">
            «La comuna que soñamos»
          </p>
        </div>

        {/* Barra de progreso de inicio estilizada con alto contraste */}
        <div className="w-52 sm:w-64 space-y-2 pt-2">
          <div className="h-2 w-full bg-slate-900/70 rounded-full overflow-hidden p-0.5 border border-white/20 shadow-inner">
            <div className="h-full rounded-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#006799] shadow-[0_0_10px_rgba(0,103,153,0.7)] animate-splash-progress" />
          </div>
          <div className="flex items-center justify-between text-[11px] text-sky-200/80 font-mono tracking-wider px-0.5">
            <span>Iniciando portal seguro…</span>
            <span className="text-[10px] text-slate-400">Peralillo</span>
          </div>
        </div>

        {/* Indicador para omitir */}
        <div className="pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-white/70 bg-white/10 border border-white/15 hover:bg-white/20 transition">
            Toca la pantalla para continuar ➔
          </span>
        </div>
      </div>
    </div>
  );
};
