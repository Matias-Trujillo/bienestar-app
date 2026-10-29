'use client';

import React from 'react';
import { formatCurrency } from '../lib/utils';

interface DashboardCardsProps {
  saldoDisponible?: number;
  saldoTotal?: number;
  estadoPrevisional?: string;
  cargasFamiliares?: number;
}

export const DashboardCards: React.FC<DashboardCardsProps> = ({
  saldoDisponible = 150000,
  saldoTotal = 250000,
  estadoPrevisional = 'Al día',
  cargasFamiliares = 2,
}) => {
  const saldoUtilizado = saldoTotal - saldoDisponible;
  const porcentajeDisponible = Math.round((saldoDisponible / saldoTotal) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* Tarjeta 1: Saldo Anual de Salud Disponible */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition">
        {/* Decoración de fondo */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#558b2f]/10 blur-xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Fondo Médico y Dental
          </span>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-lime-50 text-[#558b2f] border border-lime-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        </div>

        <p className="text-sm font-medium text-slate-600 mb-1">
          Saldo Anual de Salud Disponible
        </p>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatCurrency(saldoDisponible)}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            / {formatCurrency(saldoTotal)} tope
          </span>
        </div>

        {/* Barra de progreso de saldo con Verde y Azul Peralillo */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#558b2f] via-[#65a30d] to-[#0077b6] h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${porcentajeDisponible}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{porcentajeDisponible}% disponible</span>
          <span>Utilizado: {formatCurrency(saldoUtilizado)}</span>
        </div>
      </div>

      {/* Tarjeta 2: Estado Previsional */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition">
        {/* Decoración de fondo */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#0077b6]/10 blur-xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Condición de Afiliado
          </span>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-50 text-[#0077b6] border border-sky-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>

        <p className="text-sm font-medium text-slate-600 mb-1">
          Estado Previsional
        </p>

        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {estadoPrevisional}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-[#0077b6] border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#558b2f]"></span>
            Habilitado
          </span>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Último aporte cuota: <strong className="text-slate-700">Marzo 2026</strong></span>
          <span>Descuento por planilla</span>
        </div>
      </div>

      {/* Tarjeta 3: Cargas Familiares y Cobertura (Complementaria) */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition md:col-span-2 lg:col-span-1">
        {/* Decoración de fondo */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Grupo Familiar
          </span>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>

        <p className="text-sm font-medium text-slate-600 mb-1">
          Cargas Familiares Vigentes
        </p>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {cargasFamiliares}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            beneficiarios registrados
          </span>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Cobertura de salud activa</span>
          <span className="text-emerald-600 font-semibold">100% amparados</span>
        </div>
      </div>
    </div>
  );
};
