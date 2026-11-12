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

// [ESTUDIANTE INFORMÁTICA] Confirmación ejecutiva de inicio de sesión: ágil (1.5s), sin esferas difusas ni anillos giratorios.
export const WelcomeLoginExperience: React.FC = () => {
  const { user, justLoggedIn, dismissWelcome } = useAuth();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!justLoggedIn || !user) return;
    setIsExiting(false);
    const exitTimer = setTimeout(() => setIsExiting(true), 1200);
    const doneTimer = setTimeout(() => dismissWelcome(), 1500);
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
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-200 cursor-pointer select-none ${
        !isExiting ? 'opacity-100 bg-[#0c2b45]/80 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      title="Clic para ir directamente al panel"
    >
      <div className="w-full max-w-md bg-white border border-slate-300 rounded-lg overflow-hidden animate-scale-in">
        <div className="h-1.5 w-full bg-[#006799]" />
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#166534]">
              <span className="w-2 h-2 rounded-full bg-[#166534]" />
              Sesión Institucional Verificada
            </span>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">{user.rut}</span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-md bg-[#0c2b45] text-white font-bold text-base flex items-center justify-center shrink-0">
              {getInitials(user.nombreCompleto)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">{getGreetingByHour()}</p>
              <h2 className="text-base font-bold text-slate-900 truncate">{user.nombreCompleto}</h2>
              <p className="text-xs text-[#006799] font-semibold">
                {user.rolLabel} • {user.departamento || 'I. Municipalidad de Peralillo'}
              </p>
            </div>
          </div>

          <div className="h-1 w-full bg-slate-100 rounded-sm overflow-hidden">
            <div className="h-full bg-[#006799] animate-welcome-bar" />
          </div>
        </div>
      </div>
    </div>
  );
};
