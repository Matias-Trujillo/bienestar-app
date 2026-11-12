'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { SolicitudReembolso } from '@/types';

interface AprobacionesStatsCardsProps {
  solicitudes: SolicitudReembolso[];
}

// [ESTUDIANTE INFORMÁTICA] Renderiza las 4 tarjetas analíticas de estado (Pendientes, Aprobadas, Rechazadas, Total).
export const AprobacionesStatsCards: React.FC<AprobacionesStatsCardsProps> = ({ solicitudes }) => {
  const pendientes = solicitudes.filter((s) => s.estado === 'en_revision');
  const aprobadas = solicitudes.filter((s) => s.estado === 'aprobado' || s.estado === 'pagado');
  const rechazadas = solicitudes.filter((s) => s.estado === 'rechazado');

  const montoPendiente = pendientes.reduce((acc, s) => acc + (s.monto_copago || 0), 0);
  const montoAprobado = aprobadas.reduce((acc, s) => acc + (s.monto_reembolso || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="p-4 rounded-xl bg-white border border-amber-200/80 shadow-xs flex items-center justify-between">
        <div>
          <span className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider">
            Pendientes de Aprobación
          </span>
          <span className="text-2xl font-black text-slate-800 mt-0.5 block">{pendientes.length}</span>
          <span className="text-xs text-amber-800 font-medium">
            Por liquidar: <strong>{formatCurrency(montoPendiente)}</strong>
          </span>
        </div>
        <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
          ⏱
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white border border-emerald-200/80 shadow-xs flex items-center justify-between">
        <div>
          <span className="block text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            Aprobadas / Pagadas
          </span>
          <span className="text-2xl font-black text-slate-800 mt-0.5 block">{aprobadas.length}</span>
          <span className="text-xs text-emerald-800 font-medium">
            Total: <strong>{formatCurrency(montoAprobado)}</strong>
          </span>
        </div>
        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
          ✓
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white border border-rose-200/80 shadow-xs flex items-center justify-between">
        <div>
          <span className="block text-[11px] font-bold text-rose-700 uppercase tracking-wider">
            Rechazadas
          </span>
          <span className="text-2xl font-black text-slate-800 mt-0.5 block">{rechazadas.length}</span>
          <span className="text-xs text-slate-500">Con motivo registrado</span>
        </div>
        <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
          ✕
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Histórico
          </span>
          <span className="text-2xl font-black text-slate-800 mt-0.5 block">{solicitudes.length}</span>
          <span className="text-xs text-slate-500">Solicitudes procesadas</span>
        </div>
        <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center font-bold">
          Σ
        </div>
      </div>
    </div>
  );
};
