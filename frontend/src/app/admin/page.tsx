'use client';

import React from 'react';
import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Panel de Administración</h1>
          <p className="text-xs text-slate-500">Configuración global, gestión de directiva y aprobaciones</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition"
        >
          ← Volver al Dashboard
        </Link>
      </div>

      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800">Parámetros del Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1">Tope Anual Fondo de Salud</span>
            <span className="text-lg font-bold text-slate-800">$250.000 CLP</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1">Porcentaje Cobertura Farmacia</span>
            <span className="text-lg font-bold text-slate-800">60%</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1">Socios Activos Registrados</span>
            <span className="text-lg font-bold text-emerald-700">142 Socios</span>
          </div>
        </div>
      </div>
    </div>
  );
}
