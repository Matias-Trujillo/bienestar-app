'use client';

import React, { useEffect, useState } from 'react';

interface PreLoginSplashIntroProps {
  onStartExit?: () => void;
  onFinish: () => void;
}

// [ESTUDIANTE INFORMÁTICA] Subcomponente del Escudo Oficial con iluminación ambiental idéntica a la vista de login.
const SplashEmblem: React.FC = () => (
  <div className="relative group">
    <div className="absolute -inset-4 bg-gradient-to-tr from-[#006799]/40 via-[#b45309]/30 to-[#166534]/40 rounded-full blur-2xl opacity-80 animate-pulse-aura" />
    <div className="relative inline-flex items-center justify-center transition-transform hover:scale-105">
      <img
        src="/escudo-peralillo.png"
        alt="Escudo Oficial de la I. Municipalidad de Peralillo"
        className="h-36 sm:h-44 md:h-52 w-auto object-contain mx-auto drop-shadow-[0_16px_32px_rgba(0,0,0,0.65)]"
      />
    </div>
  </div>
);

// [ESTUDIANTE INFORMÁTICA] Membretes institucionales oficiales del municipio.
const SplashBrandingText: React.FC = () => (
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
);

// [ESTUDIANTE INFORMÁTICA] Barra de progreso con estado de completitud iluminado y pausa de asimilación.
interface SplashProgressBarProps {
  isComplete: boolean;
}

const SplashProgressBar: React.FC<SplashProgressBarProps> = ({ isComplete }) => (
  <div className="w-56 sm:w-64 space-y-2.5 pt-2">
    <div className="h-2 w-full bg-slate-900/80 rounded-full overflow-hidden p-0.5 border border-white/20 shadow-inner">
      <div
        className={`h-full rounded-full transition-all duration-300 ${
          isComplete
            ? 'w-full bg-gradient-to-r from-emerald-400 to-teal-300 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
            : 'bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#006799] shadow-[0_0_10px_rgba(0,103,153,0.7)] animate-splash-progress'
        }`}
      />
    </div>
    <div className="flex items-center justify-between text-[11px] font-mono tracking-wider px-1">
      <span className={`transition-colors duration-300 ${isComplete ? 'text-emerald-300 font-semibold' : 'text-sky-200/90'}`}>
        {isComplete ? '✓ Acceso Verificado' : 'Iniciando portal seguro…'}
      </span>
      <span className="text-[10px] text-slate-400">Peralillo</span>
    </div>
    <div className="pt-1.5 text-center">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-white/70 bg-white/10 border border-white/15 hover:bg-white/20 transition">
        Toca la pantalla para continuar ➔
      </span>
    </div>
  </div>
);

/**
 * [ESTUDIANTE INFORMÁTICA]
 * Componente cinemático de bienvenida institucional previo al login.
 * Presenta el Escudo Oficial anclado continuamente con una transición ultra-suave
 * de 1.15 segundos que desvanece suavemente el overlay hacia el formulario de login.
 */
export const PreLoginSplashIntro: React.FC<PreLoginSplashIntroProps> = ({
  onStartExit,
  onFinish,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleDismiss = () => {
    if (isExiting) return;
    setIsComplete(true);
    setIsExiting(true);
    onStartExit?.();
    setTimeout(() => {
      onFinish();
    }, 880);
  };

  useEffect(() => {
    const completeTimer = setTimeout(() => setIsComplete(true), 1600);
    const autoTimer = setTimeout(() => handleDismiss(), 1820);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(completeTimer);
      clearTimeout(autoTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExiting]);

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 cursor-pointer select-none transition-all duration-[880ms] ease-[cubic-bezier(0.22,1,0.36,1)] bg-[#061523]/80 backdrop-blur-md ${
        isExiting
          ? 'opacity-0 scale-[0.98] -translate-y-2 blur-[4px] pointer-events-none'
          : 'opacity-100 scale-100 blur-0'
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

      <div className="relative z-10 animate-splash-logo flex flex-col items-center text-center max-w-lg w-full space-y-6">
        <SplashEmblem />
        <SplashBrandingText />
        <SplashProgressBar isComplete={isComplete} />
      </div>
    </div>
  );
};
