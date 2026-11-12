'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BottomNavProps {
  onOpenSidebar: () => void;
  pendientesCount?: number | null;
}

interface MobileNavEntry {
  name: string;
  href: string;
  iconPath: string;
}

// [ESTUDIANTE INFORMÁTICA] Accesos directos móviles para consulta rápida de saldos y trámites en smartphones.
const MOBILE_ITEMS: MobileNavEntry[] = [
  {
    name: 'Hoja Socio',
    href: '/',
    iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    name: 'Reembolsos',
    href: '/reembolsos',
    iconPath: 'M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    name: 'Beneficios',
    href: '/beneficios',
    iconPath: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
  },
  {
    name: 'Afiliación',
    href: '/afiliacion',
    iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
];

// [ESTUDIANTE INFORMÁTICA] Barra inferior compacta con bordes definidos para navegación móvil sin sombras invasivas.
export const BottomNav: React.FC<BottomNavProps> = ({ onOpenSidebar, pendientesCount }) => {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-5 h-14 max-w-lg mx-auto divide-x divide-slate-100">
        {MOBILE_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                isActive
                  ? 'text-[#006799] bg-sky-50/60 font-bold border-t-2 border-[#006799]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.iconPath} />
              </svg>
              <span className="text-[10px] tracking-tight mt-1 truncate">{item.name}</span>
            </Link>
          );
        })}

        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center py-1 text-slate-500 hover:text-slate-900 transition-colors relative"
          aria-label="Abrir menú completo"
        >
          <div className="relative">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {typeof pendientesCount === 'number' && pendientesCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-[#b45309] rounded-full ring-2 ring-white" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1">Módulos</span>
        </button>
      </div>
    </nav>
  );
};
