'use client';

import React from 'react';
import Link from 'next/link';

interface ActionItemConfig {
  href: string;
  code: string;
  title: string;
  description: string;
  meta: string;
  iconStyle: string;
  badgeStyle: string;
  iconPath: string;
}

// [ESTUDIANTE INFORMÁTICA] Configuración de tarjetas de acción rápida con diseño moderno y micro-interacciones.
const QUICK_ACTIONS: ActionItemConfig[] = [
  {
    href: '/reembolsos?nueva=1',
    code: 'HU-03 • SALUD',
    title: 'Solicitar Reembolso Médico',
    description: 'Ingresa boletas de farmacia, consultas, exámenes u óptica.',
    meta: 'Plazo máx. 30 días corridos',
    iconStyle: 'bg-emerald-50 text-[#166534] border-emerald-200/80 group-hover:bg-[#166534] group-hover:text-white',
    badgeStyle: 'bg-emerald-50 text-[#166534] border-emerald-200/70',
    iconPath: 'M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    href: '/beneficios',
    code: 'HU-05 • BONOS',
    title: 'Postular a Beneficio Social',
    description: 'Bonos por vacaciones, escolaridad, natalidad o contingencia.',
    meta: 'Indexado al Sueldo Grado 15',
    iconStyle: 'bg-sky-50 text-[#006799] border-sky-200/80 group-hover:bg-[#006799] group-hover:text-white',
    badgeStyle: 'bg-sky-50 text-[#006799] border-sky-200/70',
    iconPath: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
  },
  {
    href: '/afiliacion',
    code: 'HU-01 • CARGAS',
    title: 'Gestionar Cargas Familiares',
    description: 'Acreditación de nuevos causantes o certificados estudiantiles.',
    meta: 'Validación por Secretaría',
    iconStyle: 'bg-amber-50 text-[#b45309] border-amber-200/80 group-hover:bg-[#b45309] group-hover:text-white',
    badgeStyle: 'bg-amber-50 text-[#b45309] border-amber-200/70',
    iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
];

// [ESTUDIANTE INFORMÁTICA] Tarjetas interactivas de acción rápida con elevación al pasar el cursor y cero desborde.
export const QuickActions: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group card-modern-interactive p-5 flex flex-col justify-between min-w-0"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div
                className={`flex items-center justify-center w-11 h-11 rounded-xl border transition-all duration-200 shadow-2xs shrink-0 ${action.iconStyle}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.iconPath} />
                </svg>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border tabular-nums ${action.badgeStyle}`}>
                {action.code}
              </span>
            </div>
            <h3 className="text-base font-semibold text-slate-900 group-hover:text-[#006799] transition-colors">
              {action.title}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed font-normal">{action.description}</p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 font-normal truncate">{action.meta}</span>
            <span className="inline-flex items-center gap-1 font-semibold text-[#006799] group-hover:translate-x-1 transition-transform shrink-0">
              <span>Iniciar</span>
              <span>→</span>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
};
