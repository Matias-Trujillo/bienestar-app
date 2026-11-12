'use client';

import React from 'react';
import Link from 'next/link';
import { formatCurrency } from '../lib/utils';

interface DashboardCardsProps {
  saldoDisponible?: number;
  saldoTotal?: number;
  estadoPrevisional?: string;
  cargasFamiliares?: number;
}

interface PrimaryHealthPanelProps {
  anioActual: number;
  dispReal: number;
  topeReal: number;
  saldoUtilizado: number;
  porcentajeDisponible: number;
}

// [ESTUDIANTE INFORMÁTICA] Tarjeta principal del Saldo Anual de Salud con barra de progreso suave y desglose financiero.
const PrimaryHealthPanel: React.FC<PrimaryHealthPanelProps> = ({
  anioActual,
  dispReal,
  topeReal,
  saldoUtilizado,
  porcentajeDisponible,
}) => (
  <div className="lg:col-span-7 card-modern-interactive p-6 flex flex-col justify-between min-w-0">
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-50 text-[#166534] border border-emerald-200/80 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Fondo Médico y Dental
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#166534] border border-emerald-200/80 tabular-nums">
                Año {anioActual}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Saldo Anual de Salud Disponible</p>
          </div>
        </div>
        <Link
          href="/reembolsos"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[#006799] bg-sky-50 hover:bg-sky-100/80 border border-sky-200/70 transition-colors shrink-0"
        >
          <span>Cartola médica</span>
          <span>→</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4 items-center">
        <div className="sm:col-span-2 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {formatCurrency(dispReal)}
            </span>
            <span className="text-xs text-slate-400 font-semibold tabular-nums">
              / {formatCurrency(topeReal)} tope anual
            </span>
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-center min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
            Utilizado / En Revisión
          </span>
          <span className="text-base font-extrabold text-slate-800 tabular-nums mt-0.5">
            {formatCurrency(saldoUtilizado)}
          </span>
        </div>
      </div>
    </div>

    <div className="space-y-2.5 pt-3 border-t border-slate-100">
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-[#166534] via-[#558b2f] to-[#006799] h-full rounded-full transition-all duration-500"
          style={{ width: `${porcentajeDisponible}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 tabular-nums">
        <span>
          <strong className="text-slate-800">{porcentajeDisponible}% disponible</strong> del cupo anual
        </span>
        <span>Renueva el 01 Ene {anioActual + 1}</span>
      </div>
    </div>
  </div>
);

// [ESTUDIANTE INFORMÁTICA] Grilla moderna (7 + 5 columnas) con elevación suave y cero desbordamientos.
export const DashboardCards: React.FC<DashboardCardsProps> = ({
  saldoDisponible = 150000,
  saldoTotal = 150000,
  estadoPrevisional = 'Al día',
  cargasFamiliares = 2,
}) => {
  const anioActual = new Date().getFullYear();
  const topeReal = saldoTotal > 0 ? Math.min(saldoTotal, 150000) : 150000;
  const dispReal = Math.min(saldoDisponible, topeReal);
  const saldoUtilizado = Math.max(0, topeReal - dispReal);
  const porcentajeDisponible = Math.round((dispReal / topeReal) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-w-0">
      <PrimaryHealthPanel
        anioActual={anioActual}
        dispReal={dispReal}
        topeReal={topeReal}
        saldoUtilizado={saldoUtilizado}
        porcentajeDisponible={porcentajeDisponible}
      />

      <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5 min-w-0">
        {/* Tarjeta Secundaria 1: Estado Previsional */}
        <div className="card-modern-interactive p-5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-50 text-[#006799] border border-sky-200/70 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                  Condición Previsional
                </span>
                <span className="text-xl font-extrabold text-slate-900">{estadoPrevisional}</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-[#006799] border border-sky-200/80 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
              Habilitado
            </span>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="truncate">Cotización 4% por planilla RRHH</span>
            <Link href="/finanzas" className="font-bold text-[#006799] hover:underline shrink-0">
              Ver nómina →
            </Link>
          </div>
        </div>

        {/* Tarjeta Secundaria 2: Cargas Familiares */}
        <div className="card-modern-interactive p-5 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 text-[#b45309] border border-amber-200/70 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                  Grupo Familiar
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-slate-900 tabular-nums">{cargasFamiliares}</span>
                  <span className="text-xs text-slate-500 font-medium truncate">cargas vigentes</span>
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-[#b45309] border border-amber-200/80 shrink-0">
              100% Amparados
            </span>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="truncate">Cobertura médica y bonos activa</span>
            <Link href="/afiliacion" className="font-bold text-[#006799] hover:underline shrink-0">
              Gestionar →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
