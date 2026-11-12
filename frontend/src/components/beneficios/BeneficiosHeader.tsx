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

// [ESTUDIANTE INFORMÁTICA] Cabecera del Módulo 3 (HU-05 / HU-06): destaca la indexación al Sueldo Grado 15 sin efectos blur innecesarios.
export const BeneficiosHeader: React.FC<BeneficiosHeaderProps> = ({
  catalogo,
  user,
  cumpleRequisito6Meses,
  esDirectivaOAdmin,
  onOpenConfigBaseG15,
}) => {
  return (
    <div className="rounded-lg bg-[#0c2b45] text-white border border-slate-800 overflow-hidden">
      <div className="h-1 w-full bg-[#006799]" />
      <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-white/10 text-sky-200 border border-white/15">
            <span className="w-1.5 h-1.5 rounded-full bg-[#78a200]" />
            Módulo 3 • HU-05 & HU-06 • Asignaciones Estatutarias
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Beneficios Sociales y Bonos Indexados
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Asignaciones económicas calculadas porcentualmente sobre el{' '}
            <strong className="text-white">Sueldo Imponible de Referencia Grado 15 Municipal</strong> y nóminas de calendario.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/10 rounded-md bg-white/[0.04] border border-white/15 text-xs lg:min-w-[460px]">
          <div className="p-3 flex flex-col justify-between">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold flex items-center justify-between">
              Sueldo Base Grado 15
              {esDirectivaOAdmin && (
                <button
                  onClick={onOpenConfigBaseG15}
                  className="text-sky-300 hover:text-white transition-colors"
                  title="Configurar sueldo Grado 15"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
            <span className="text-base font-extrabold text-white font-mono tabular-nums mt-0.5">
              {catalogo ? formatCurrency(catalogo.sueldo_base_grado_15) : '$750.000'}
            </span>
            <span className="text-[10px] text-lime-300 font-medium">Parámetro vigente</span>
          </div>

          <div className="p-3 flex flex-col justify-between">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
              Carencia Estatutaria
            </span>
            <span className="text-sm font-bold text-white mt-0.5 tabular-nums">6 Meses Mín.</span>
            <span className={`text-[10px] font-semibold ${cumpleRequisito6Meses ? 'text-lime-300' : 'text-amber-300'}`}>
              {user?.nombreCompleto ? (cumpleRequisito6Meses ? '✓ Socio Habilitado' : '⚠ En Carencia') : 'Regla activa'}
            </span>
          </div>

          <div className="p-3 col-span-2 sm:col-span-1 flex flex-col justify-between">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
              Bonos Calendario
            </span>
            <span className="text-xs font-bold text-sky-200 mt-0.5 tabular-nums">Invierno (15% G15)</span>
            <span className="text-[10px] text-slate-300 tabular-nums">Navidad (10%–15% G15)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
