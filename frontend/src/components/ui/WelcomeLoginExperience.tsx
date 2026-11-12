'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

// [ESTUDIANTE INFORMÁTICA] Calcula el saludo horario institucional según la hora local del funcionario.
function getGreetingByHour(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

// [ESTUDIANTE INFORMÁTICA] Obtiene las iniciales del socio o directivo para su identificador de sesión.
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// [ESTUDIANTE INFORMÁTICA] Tarjeta de bienvenida post-login moderna y elegante (1.6s), descartable al instante con un clic.
export const WelcomeLoginExperience: React.FC = () => {
  const { user, justLoggedIn, dismissWelcome } = useAuth();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!justLoggedIn || !user) return;
    setIsExiting(false);
    const exitTimer = setTimeout(() => setIsExiting(true), 1300);
    const doneTimer = setTimeout(() => dismissWelcome(), 1600);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [justLoggedIn, user, dismissWelcome]);

  if (!justLoggedIn || !user) return null;

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => dismissWelcome(), 150);
  };

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 cursor-pointer select-none ${
        !isExiting
          ? 'opacity-100 bg-slate-900/65 backdrop-blur-sm pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      }`}
      title="Clic para continuar inmediatamente"
    >
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-[#166534]">
              <span className="w-2 h-2 rounded-full bg-[#166534]" />
              Acceso Institucional Verificado
            </span>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">{user.rut}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-13 h-13 p-3.5 rounded-2xl bg-gradient-to-br from-[#0c2b45] to-[#006799] text-white font-extrabold text-base flex items-center justify-center shadow-sm shrink-0">
              {getInitials(user.nombreCompleto)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">{getGreetingByHour()}, bienvenido/a</p>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                {user.nombreCompleto}
              </h2>
              <p className="text-xs text-[#006799] font-semibold truncate">
                {user.rolLabel} • {user.departamento || 'I. Municipalidad de Peralillo'}
              </p>
            </div>
          </div>

          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#006799] to-[#166534] rounded-full animate-welcome-bar" />
          </div>
        </div>
      </div>
    </div>
  );
};
