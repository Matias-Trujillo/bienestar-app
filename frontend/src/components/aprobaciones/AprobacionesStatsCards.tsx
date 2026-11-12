'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { SolicitudReembolso } from '@/types';

interface AprobacionesStatsCardsProps {
  solicitudes: SolicitudReembolso[];
}

// [ESTUDIANTE INFORMÁTICA] Tarjetas analíticas modernas de la bandeja directiva con badges vectoriales suaves.
export const AprobacionesStatsCards: React.FC<AprobacionesStatsCardsProps> = ({ solicitudes }) => {
  const pendientes = solicitudes.filter((s) => s.estado === 'en_revision');
  const aprobadas = solicitudes.filter((s) => s.estado === 'aprobado' || s.estado === 'pagado');
  const rechazadas = solicitudes.filter((s) => s.estado === 'rechazado');

  const montoPendiente = pendientes.reduce((acc, s) => acc + (s.monto_copago || 0), 0);
  const montoAprobado = aprobadas.reduce((acc, s) => acc + (s.monto_reembolso || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
      <div className="card-modern-interactive p-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-xs font-medium text-[#b45309] truncate">
            Pendientes
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block tabular-nums">
            {pendientes.length}
          </span>
          <span className="text-xs text-slate-500 font-normal tabular-nums block truncate">
            Por liquidar: <strong className="text-slate-800 font-semibold">{formatCurrency(montoPendiente)}</strong>
          </span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/80 text-[#b45309] flex items-center justify-center text-xs font-semibold shrink-0">
          REV
        </div>
      </div>

      <div className="card-modern-interactive p-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-xs font-medium text-[#166534] truncate">
            Aprobadas
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block tabular-nums">
            {aprobadas.length}
          </span>
          <span className="text-xs text-slate-500 font-normal tabular-nums block truncate">
            Imputado: <strong className="text-[#166534] font-semibold">{formatCurrency(montoAprobado)}</strong>
          </span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[#166534] flex items-center justify-center text-xs font-semibold shrink-0">
          APR
        </div>
      </div>

      <div className="card-modern-interactive p-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-xs font-medium text-rose-700 truncate">
            Rechazadas
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block tabular-nums">
            {rechazadas.length}
          </span>
          <span className="text-xs text-slate-500 font-normal block truncate">Cupo restituido al socio</span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 flex items-center justify-center text-xs font-semibold shrink-0">
          REC
        </div>
      </div>

      <div className="card-modern-interactive p-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-xs font-medium text-slate-500 truncate">
            Total Histórico
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block tabular-nums">
            {solicitudes.length}
          </span>
          <span className="text-xs text-slate-500 font-normal block truncate">Expedientes auditados</span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/80 text-[#0c2b45] flex items-center justify-center text-xs font-semibold shrink-0">
          TOT
        </div>
      </div>
    </div>
  );
};
