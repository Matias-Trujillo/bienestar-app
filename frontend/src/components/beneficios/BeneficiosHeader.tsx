'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { CatalogoBeneficios, User } from '@/types';
import { SettingsIcon } from './Icons';

interface BeneficiosHeaderProps {
  catalogo: CatalogoBeneficios | null;
  user: User | null;
  cumpleRequisito6Meses: boolean;
  esDirectivaOAdmin: boolean;
  onOpenConfigBaseG15: () => void;
}

// [ESTUDIANTE INFORMÁTICA] Cabecera moderna del Módulo 3 (Beneficios Sociales) sin desbordes y con paneles traslúcidos.
export const BeneficiosHeader: React.FC<BeneficiosHeaderProps> = ({
  catalogo,
  user,
  cumpleRequisito6Meses,
  esDirectivaOAdmin,
  onOpenConfigBaseG15,
}) => {
  return (
    <div className="hero-institutional">
      <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
      <div className="p-6 sm:p-7 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="space-y-2 min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-sky-200 border border-white/15">
            <span className="w-2 h-2 rounded-full bg-[#78a200]" />
            Módulo 3 • HU-05 & HU-06 • Asignaciones Estatutarias
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            Módulo de Beneficios Sociales y Bonos
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Asignaciones económicas calculadas porcentualmente sobre el{' '}
            <strong className="text-amber-200">Sueldo Imponible de Grado 15</strong>, validación legal de respaldos y liquidación de bonos de calendario.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs w-full xl:w-auto xl:min-w-[460px] min-w-0">
          <div className="p-3.5 rounded-xl bg-white/[0.08] backdrop-blur-xs border border-white/15 flex flex-col justify-between min-w-0">
            <span className="text-slate-300 text-[10px] uppercase tracking-wider font-semibold flex items-center justify-between gap-2">
              <span className="truncate">Base Grado 15</span>
              {esDirectivaOAdmin && (
                <button
                  onClick={onOpenConfigBaseG15}
                  className="text-sky-300 hover:text-white transition-colors shrink-0"
                  title="Configurar sueldo Grado 15"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
            <span className="text-lg font-extrabold text-white font-mono tabular-nums mt-1">
              {catalogo ? formatCurrency(catalogo.sueldo_base_grado_15) : '$750.000'}
            </span>
            <span className="text-[10px] text-lime-300 font-medium">Base de cálculo activa</span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.08] backdrop-blur-xs border border-white/15 flex flex-col justify-between min-w-0">
            <span className="text-slate-300 text-[10px] uppercase tracking-wider font-semibold truncate">
              Permanencia
            </span>
            <span className="text-base font-extrabold text-white mt-1 tabular-nums">6 Meses Mín.</span>
            <span className={`text-[10px] font-semibold truncate ${cumpleRequisito6Meses ? 'text-lime-300' : 'text-amber-300'}`}>
              {user?.nombreCompleto ? (cumpleRequisito6Meses ? '✓ Socio Habilitado' : '⚠ En Carencia') : 'Regla activa'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.08] backdrop-blur-xs border border-white/15 flex flex-col justify-between min-w-0">
            <span className="text-slate-300 text-[10px] uppercase tracking-wider font-semibold truncate">
              Bonos Calendario
            </span>
            <span className="text-xs font-extrabold text-sky-200 mt-1 tabular-nums truncate">Invierno (15% G15)</span>
            <span className="text-[10px] text-slate-300 tabular-nums truncate">Navidad (10%–15% G15)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
