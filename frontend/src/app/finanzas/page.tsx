'use client';

import React from 'react';
import Link from 'next/link';

export default function FinanzasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Control Financiero del Comité</h1>
          <p className="text-xs text-slate-500">Transparencia, balances e ingresos por cuotas de socios</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition"
        >
          ← Volver al Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase">Resumen de Cuotas Sociales</h2>
          <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
            <span className="text-slate-600">Cuota Mensual Ordinaria:</span>
            <span className="font-bold text-slate-800">$12.500 CLP</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
            <span className="text-slate-600">Aporte Institucional (Empleador):</span>
            <span className="font-bold text-slate-800">$18.000 CLP</span>
          </div>
          <div className="flex justify-between items-center py-2 text-xs">
            <span className="text-slate-600">Total Aporte Mensual Socio:</span>
            <span className="font-extrabold text-emerald-700 text-sm">$30.500 CLP</span>
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase">Auditoría y Transparencia</h2>
          <p className="text-xs text-slate-500">
            Descarga las rendiciones de cuentas trimestrales aprobadas por la comisión revisora de cuentas.
          </p>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => alert('Descargando Balance Trimestral Q1-2026...')}
              className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-xs font-medium text-slate-700 transition"
            >
              <span>Balance Trimestral Q1-2026 (Auditoría Externa)</span>
              <span className="text-emerald-700 font-bold">PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
