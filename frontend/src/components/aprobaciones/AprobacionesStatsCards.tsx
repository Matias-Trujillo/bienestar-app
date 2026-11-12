'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { SolicitudReembolso } from '@/types';

interface AprobacionesStatsCardsProps {
  solicitudes: SolicitudReembolso[];
}

// [ESTUDIANTE INFORMÁTICA] Paneles analíticos de bandeja directiva con bordes firmes y cifras tabulares.
export const AprobacionesStatsCards: React.FC<AprobacionesStatsCardsProps> = ({ solicitudes }) => {
  const pendientes = solicitudes.filter((s) => s.estado === 'en_revision');
  const aprobadas = solicitudes.filter((s) => s.estado === 'aprobado' || s.estado === 'pagado');
  const rechazadas = solicitudes.filter((s) => s.estado === 'rechazado');

  const montoPendiente = pendientes.reduce((acc, s) => acc + (s.monto_copago || 0), 0);
  const montoAprobado = aprobadas.reduce((acc, s) => acc + (s.monto_reembolso || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className="p-4 rounded-lg bg-white border border-slate-200 border-l-4 border-l-[#b45309] flex items-center justify-between">
        <div>
          <span className="block text-[10px] font-bold text-[#b45309] uppercase tracking-wider">
            Pendientes de Resolución
          </span>
          <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block tabular-nums">
            {pendientes.length}
          </span>
          <span className="text-xs text-slate-600 font-medium tabular-nums">
            Retenido: <strong className="text-slate-900">{formatCurrency(montoPendiente)}</strong>
          </span>
        </div>
        <span className="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-[#b45309] text-xs font-mono font-bold">
          REV
        </span>
      </div>

      <div className="p-4 rounded-lg bg-white border border-slate-200 border-l-4 border-l-[#166534] flex items-center justify-between">
        <div>
          <span className="block text-[10px] font-bold text-[#166534] uppercase tracking-wider">
            Aprobadas / Liquidadas
          </span>
          <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block tabular-nums">
            {aprobadas.length}
          </span>
          <span className="text-xs text-slate-600 font-medium tabular-nums">
            Imputado: <strong className="text-[#166534]">{formatCurrency(montoAprobado)}</strong>
          </span>
        </div>
        <span className="px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-[#166534] text-xs font-mono font-bold">
          APR
        </span>
      </div>

      <div className="p-4 rounded-lg bg-white border border-slate-200 border-l-4 border-l-rose-600 flex items-center justify-between">
        <div>
          <span className="block text-[10px] font-bold text-rose-700 uppercase tracking-wider">
            Rechazadas (Cupo Restituido)
          </span>
          <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block tabular-nums">
            {rechazadas.length}
          </span>
          <span className="text-xs text-slate-500">Con causal en auditoría</span>
        </div>
        <span className="px-2 py-1 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono font-bold">
          REC
        </span>
      </div>

      <div className="p-4 rounded-lg bg-white border border-slate-200 border-l-4 border-l-[#0c2b45] flex items-center justify-between">
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Volumen Total Bandeja
          </span>
          <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block tabular-nums">
            {solicitudes.length}
          </span>
          <span className="text-xs text-slate-500">Expedientes auditables</span>
        </div>
        <span className="px-2 py-1 rounded bg-slate-100 border border-slate-300 text-[#0c2b45] text-xs font-mono font-bold">
          TOT
        </span>
      </div>
    </div>
  );
};
