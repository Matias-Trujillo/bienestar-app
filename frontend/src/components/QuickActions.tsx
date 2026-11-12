'use client';

import React from 'react';
import Link from 'next/link';

interface ActionItemConfig {
  href: string;
  code: string;
  title: string;
  description: string;
  meta: string;
  accentColor: string;
  iconBg: string;
  iconPath: string;
}

// [ESTUDIANTE INFORMÁTICA] Configuración de accesos directos con metadatos normativos (plazo 30 días e indexación Grado 15).
const QUICK_ACTIONS: ActionItemConfig[] = [
  {
    href: '/reembolsos?nueva=1',
    code: 'HU-03 • SALUD',
    title: 'Solicitar Reembolso Médico o Dental',
    description: 'Ingreso de boletas de farmacia, consultas, exámenes u óptica.',
    meta: 'Plazo máx. 30 días corridos desde atención',
    accentColor: 'hover:border-[#166534]',
    iconBg: 'bg-emerald-50 text-[#166534] border-emerald-200',
    iconPath: 'M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    href: '/beneficios',
    code: 'HU-05 • BONOS',
    title: 'Postular a Beneficio Social',
    description: 'Bonos por vacaciones, escolaridad, natalidad o contingencia.',
    meta: 'Cálculo indexado al Sueldo Grado 15',
    accentColor: 'hover:border-[#006799]',
    iconBg: 'bg-sky-50 text-[#006799] border-sky-200',
    iconPath: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
  },
  {
    href: '/afiliacion',
    code: 'HU-01 • CARGAS',
    title: 'Actualizar Cargas Familiares',
    description: 'Acreditación de nuevos causantes o certificados de alumno regular.',
    meta: 'Sujeto a validación de Secretaría',
    accentColor: 'hover:border-[#b45309]',
    iconBg: 'bg-amber-50 text-[#b45309] border-amber-200',
    iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
];

// [ESTUDIANTE INFORMÁTICA] Barra de comandos interactiva con alto contraste y bordes firmes en lugar de botones con gradientes pesados.
export const QuickActions: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={`group flex flex-col justify-between p-4 rounded-lg bg-white border border-slate-200 ${action.accentColor} transition-all duration-150 active:translate-y-[0.5px]`}
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className={`flex items-center justify-center w-8 h-8 rounded-md border ${action.iconBg}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.iconPath} />
                </svg>
              </div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 group-hover:text-slate-700">
                {action.code}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#006799] transition-colors">
              {action.title}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{action.description}</p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">{action.meta}</span>
            <span className="font-bold text-[#006799] group-hover:translate-x-0.5 transition-transform">
              Iniciar →
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
};
