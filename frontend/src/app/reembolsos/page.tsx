'use client';

import React from 'react';
import Link from 'next/link';

export default function ReembolsosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reembolsos Médicos y Dentales</h1>
          <p className="text-xs text-slate-500">Módulo de auditoría médica y liquidaciones de salud</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition"
        >
          ← Volver al Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs text-slate-400 uppercase font-semibold">Gasto Ambulatorio</span>
          <p className="text-2xl font-bold text-slate-800 mt-1">$57.500</p>
          <span className="text-xs text-emerald-600">3 atenciones liquidadas</span>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs text-slate-400 uppercase font-semibold">Gasto Farmacia</span>
          <p className="text-2xl font-bold text-slate-800 mt-1">$42.500</p>
          <span className="text-xs text-emerald-600">Recetas permanentes</span>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs text-slate-400 uppercase font-semibold">Fondo Dental Disponible</span>
          <p className="text-2xl font-bold text-slate-800 mt-1">$50.000</p>
          <span className="text-xs text-slate-400">Sin uso en el período</span>
        </div>
      </div>
    </div>
  );
}
