import React from 'react';
import { CatalogoBeneficios, User } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { SettingsIcon } from './Icons';

interface BeneficiosHeaderProps {
  catalogo: CatalogoBeneficios | null;
  user: User | null;
  cumpleRequisito6Meses: boolean;
  esDirectivaOAdmin: boolean;
  onOpenConfigBaseG15: () => void;
}

export const BeneficiosHeader: React.FC<BeneficiosHeaderProps> = ({
  catalogo,
  user,
  cumpleRequisito6Meses,
  esDirectivaOAdmin,
  onOpenConfigBaseG15,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0b2742] via-[#0f3b5e] to-[#1a3818] text-white p-6 sm:p-8 shadow-xl border border-sky-800/30">
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-[#0077b6]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[#558b2f]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-sky-200 border border-white/15 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#558b2f] animate-pulse" />
            Ilustre Municipalidad de Peralillo • Comité de Bienestar
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Módulo de Beneficios Sociales y Bonos
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Gestión centralizada de asignaciones económicas calculadas sobre el{' '}
            <strong className="text-white">Sueldo Imponible de Grado 15</strong>, validación legal de documentos de respaldo y liquidación automatizada de bonos de contingencia y calendario.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col justify-between">
            <span className="text-slate-400 text-[11px] font-medium flex items-center justify-between">
              Base Grado 15
              {esDirectivaOAdmin && (
                <button
                  onClick={onOpenConfigBaseG15}
                  className="text-blue-300 hover:text-white transition"
                  title="Configurar sueldo Grado 15"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
            <span className="text-lg font-black text-white mt-1">
              {catalogo ? formatCurrency(catalogo.sueldo_base_grado_15) : '$750.000'}
            </span>
            <span className="text-[10px] text-emerald-300 mt-0.5">Base de cálculo activa</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col justify-between">
            <span className="text-slate-400 text-[11px] font-medium">Requisito Permanencia</span>
            <span className="text-base font-bold text-white mt-1">Mínimo 6 Meses</span>
            <span className={`text-[10px] font-semibold mt-0.5 ${cumpleRequisito6Meses ? 'text-emerald-300' : 'text-amber-300'}`}>
              {user?.nombreCompleto ? (cumpleRequisito6Meses ? '✓ Socio Habilitado' : '⚠ Antigüedad < 6 meses') : 'Regla activa'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 col-span-2 sm:col-span-1 flex flex-col justify-between">
            <span className="text-slate-400 text-[11px] font-medium">Próximo Bono Calendario</span>
            <span className="text-sm font-bold text-blue-200 mt-1">Invierno (Julio, 15%)</span>
            <span className="text-[10px] text-slate-300 mt-0.5">Navidad (Diciembre, 10-15%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
