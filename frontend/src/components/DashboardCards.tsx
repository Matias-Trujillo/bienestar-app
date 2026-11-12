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

// [ESTUDIANTE INFORMÁTICA] Panel principal (7 columnas) para el Saldo Anual de Salud con cifras tabulares y desglose exacto.
const PrimaryHealthPanel: React.FC<PrimaryHealthPanelProps> = ({
  anioActual,
  dispReal,
  topeReal,
  saldoUtilizado,
  porcentajeDisponible,
}) => (
  <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 border-l-4 border-l-[#166534] p-5 flex flex-col justify-between">
    <div>
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0c2b45]">
            Cupo Anual de Reembolsos Médicos y Dentales
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-[#166534] border border-emerald-200 tabular-nums">
            Ejercicio {anioActual}
          </span>
        </div>
        <Link
          href="/reembolsos"
          className="text-xs font-semibold text-[#006799] hover:underline shrink-0"
        >
          Ver cartola médica →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
        <div className="sm:col-span-2">
          <p className="text-xs font-medium text-slate-500 mb-1">Saldo Disponible Actual</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {formatCurrency(dispReal)}
            </span>
            <span className="text-xs text-slate-500 font-medium tabular-nums">
              de {formatCurrency(topeReal)}
            </span>
          </div>
        </div>
        <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex flex-col justify-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Monto Utilizado / Retenido
          </span>
          <span className="text-base font-bold text-slate-800 tabular-nums mt-0.5">
            {formatCurrency(saldoUtilizado)}
          </span>
        </div>
      </div>
    </div>

    <div className="space-y-2 pt-2 border-t border-slate-100">
      <div className="w-full bg-slate-100 rounded-sm h-2 overflow-hidden border border-slate-200/60">
        <div
          className="bg-[#166534] h-full transition-all duration-300"
          style={{ width: `${porcentajeDisponible}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
        <span>
          <strong className="text-slate-800">{porcentajeDisponible}%</strong> del tope anual disponible
        </span>
        <span>Renovación estatutaria: 01/01/{anioActual + 1}</span>
      </div>
    </div>
  </div>
);

// [ESTUDIANTE INFORMÁTICA] Composición asimétrica (7 + 5 columnas) que jerarquiza el saldo financiero sobre los indicadores de filiación.
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <PrimaryHealthPanel
        anioActual={anioActual}
        dispReal={dispReal}
        topeReal={topeReal}
        saldoUtilizado={saldoUtilizado}
        porcentajeDisponible={porcentajeDisponible}
      />

      <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
        {/* Panel Secundario 1: Estado Previsional y Retención 4% */}
        <div className="bg-white rounded-lg border border-slate-200 border-l-4 border-l-[#006799] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Situación Previsional (Cuota 4%)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-sky-50 text-[#006799] border border-sky-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
              Habilitado
            </span>
          </div>
          <div className="flex items-baseline justify-between my-1">
            <span className="text-xl font-extrabold text-slate-900">{estadoPrevisional}</span>
            <span className="text-xs font-mono text-slate-500 tabular-nums">Desc. Planilla RRHH</span>
          </div>
          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Cotización al día según Ley N° 19.754</span>
            <Link href="/finanzas" className="font-semibold text-[#006799] hover:underline">
              Nómina →
            </Link>
          </div>
        </div>

        {/* Panel Secundario 2: Cargas Familiares Registradas */}
        <div className="bg-white rounded-lg border border-slate-200 border-l-4 border-l-[#b45309] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Grupo Familiar Acreditado
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-[#b45309] border border-amber-200">
              Cobertura 100%
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-xl font-extrabold text-slate-900 tabular-nums">
              {cargasFamiliares}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {cargasFamiliares === 1 ? 'carga familiar vigente' : 'cargas familiares vigentes'}
            </span>
          </div>
          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Habilitadas para reembolsos y escolaridad</span>
            <Link href="/afiliacion" className="font-semibold text-[#006799] hover:underline">
              Gestionar cargas →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
