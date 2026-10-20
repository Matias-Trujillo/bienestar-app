'use client';

import React from 'react';
import Link from 'next/link';

export const QuickActions: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Botón Acción 1: Solicitar Reembolso (Dirige al módulo oficial con modal preabierto) */}
      <Link
        href="/reembolsos?nueva=1"
        className="group relative overflow-hidden flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/20 hover:shadow-lg hover:shadow-emerald-700/30 hover:scale-[1.01] active:scale-[0.99] transition-all text-left"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md text-white group-hover:bg-white group-hover:text-emerald-700 transition">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <span className="block text-base font-bold tracking-tight">
              Solicitar Reembolso
            </span>
            <span className="block text-xs text-emerald-100">
              Gastos médicos, medicamentos o dentales
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-white/10 group-hover:translate-x-1 transition-transform">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>

      {/* Botón Acción 2: Postular a Beneficio (Dirige al catálogo de beneficios) */}
      <Link
        href="/beneficios"
        className="group relative overflow-hidden flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-700/20 hover:shadow-lg hover:shadow-blue-700/30 hover:scale-[1.01] active:scale-[0.99] transition-all text-left"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md text-white group-hover:bg-white group-hover:text-blue-700 transition">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <div>
            <span className="block text-base font-bold tracking-tight">
              Postular a Beneficio
            </span>
            <span className="block text-xs text-blue-100">
              Bonos por vacaciones, escolaridad o asignaciones
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-white/10 group-hover:translate-x-1 transition-transform">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    </div>
  );
};
