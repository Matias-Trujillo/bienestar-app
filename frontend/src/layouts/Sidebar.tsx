'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  adminOnly?: boolean;
}

const ROLES_DIRECTIVA = ['presidente', 'secretario', 'tesorero', 'admin', 'auditor', 'superusuario'];

// [ESTUDIANTE INFORMÁTICA] Catálogo de navegación principal con iconos SVG vectoriales nítidos.
export const navigationItems: NavItem[] = [
  {
    name: 'Hoja de Socio',
    href: '/',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    badge: 'Inicio',
  },
  {
    name: 'Afiliación y Cargas',
    href: '/afiliacion',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: 'Reembolsos Médicos',
    href: '/reembolsos',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    badge: 'Salud',
  },
  {
    name: 'Aprobaciones',
    href: '/aprobaciones',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    adminOnly: true,
  },
  {
    name: 'Beneficios Sociales',
    href: '/beneficios',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
  },
  {
    name: 'Control Financiero',
    href: '/finanzas',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    name: 'Administración',
    href: '/admin',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    adminOnly: true,
  },
];

// [ESTUDIANTE INFORMÁTICA] Calcula el estilo de píldora para los contadores de pendientes en la barra lateral.
function resolveSidebarBadge(
  item: NavItem,
  isActive: boolean,
  esDirectiva: boolean,
  esAdminOSuper: boolean,
  afiliacionCount: number | null,
  reembolsosCount: number | null
): { text?: string; tooltip?: string; className: string } {
  const baseClass = isActive
    ? 'bg-white/20 text-white border border-white/25'
    : 'bg-slate-100 text-slate-600 border border-slate-200/80';

  if (item.href === '/afiliacion' && esDirectiva) {
    if (afiliacionCount === null) return { className: baseClass };
    const text = afiliacionCount > 99 ? '99+' : `${afiliacionCount}`;
    const alertClass =
      afiliacionCount > 0
        ? 'bg-amber-500 text-white font-bold shadow-xs'
        : baseClass;
    return { text, tooltip: `${afiliacionCount} solicitudes de incorporación pendientes`, className: alertClass };
  }

  if (item.href === '/aprobaciones' && esAdminOSuper) {
    if (reembolsosCount === null) return { className: baseClass };
    const text = reembolsosCount > 99 ? '99+' : `${reembolsosCount}`;
    const alertClass =
      reembolsosCount > 0
        ? 'bg-amber-500 text-white font-bold shadow-xs'
        : baseClass;
    return { text, tooltip: `${reembolsosCount} reembolsos pendientes`, className: alertClass };
  }

  return { text: item.badge, className: baseClass };
}

// [ESTUDIANTE INFORMÁTICA] Encabezado del Sidebar con logo institucional y filete superior de Peralillo.
const SidebarBrandHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="relative">
    <div className="h-1 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
    <div className="flex items-center justify-between h-[72px] px-4 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/60">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center p-1.5 bg-white rounded-xl border border-slate-200/90 shadow-xs shrink-0">
          <img
            src="/logo-peralillo.png"
            alt="I. Municipalidad de Peralillo"
            className="h-9 w-auto max-w-[52px] object-contain"
          />
        </div>
        <div className="min-w-0">
          <span className="block text-sm font-bold tracking-tight text-slate-900 truncate">
            Comité de Bienestar
          </span>
          <span className="block text-xs font-medium text-[#006799] truncate">
            I. Municipalidad de Peralillo
          </span>
          <span className="block text-xs text-[#ea580c] font-normal truncate">
            La comuna que soñamos
          </span>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1.5 text-slate-400 rounded-xl lg:hidden hover:bg-slate-100 hover:text-slate-700 transition-colors"
        aria-label="Cerrar menú"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
);

// [ESTUDIANTE INFORMÁTICA] Sidebar moderno con botones tipo píldora suave (rounded-xl), estado activo con relieve y tarjeta de soporte.
export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { user, token } = useAuth();
  const [pendientesCount, setPendientesCount] = useState<number | null>(null);
  const [afiliacionPendientesCount, setAfiliacionPendientesCount] = useState<number | null>(null);

  const esAdminOSuper = user?.rol === 'admin' || user?.rol === 'superusuario' || Boolean(user?.isSuperuser);
  const esDirectiva = Boolean(user && (user.isSuperuser || ROLES_DIRECTIVA.includes(user.rol)));
  const itemsVisibles = navigationItems.filter((item) => !item.adminOnly || esAdminOSuper);

  const cargarConteoPendientes = useCallback(async () => {
    if (!token) return;
    if (esAdminOSuper) {
      try {
        const data = await fetchFromApi<{ pendientes: number }>('/reembolsos/admin/conteo-pendientes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (typeof data?.pendientes === 'number') setPendientesCount(data.pendientes);
      } catch {
        // Silencioso
      }
    }
    if (esDirectiva) {
      try {
        const dataAf = await fetchFromApi<{ pendientes: number }>('/afiliacion/conteo-pendientes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (typeof dataAf?.pendientes === 'number') setAfiliacionPendientesCount(dataAf.pendientes);
      } catch {
        // Silencioso
      }
    }
  }, [esAdminOSuper, esDirectiva, token]);

  useEffect(() => {
    cargarConteoPendientes();
    const interval = setInterval(cargarConteoPendientes, 15000);
    const handleUpdate = () => cargarConteoPendientes();
    window.addEventListener('solicitudes-updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('solicitudes-updated', handleUpdate);
    };
  }, [cargarConteoPendientes, pathname]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-[268px] bg-white border-r border-slate-200/90 shadow-[2px_0_16px_-4px_rgba(15,23,42,0.04)] transition-transform duration-200 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarBrandHeader onClose={onClose} />

        <div className="flex-1 px-3.5 py-5 overflow-y-auto space-y-1">
          <p className="px-3 pb-2 text-xs font-semibold text-slate-400">
            Navegación del Portal
          </p>
          {itemsVisibles.map((item) => {
            const isActive = pathname === item.href;
            const badge = resolveSidebarBadge(
              item,
              isActive,
              esDirectiva,
              esAdminOSuper,
              afiliacionPendientesCount,
              pendientesCount
            );

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#0c2b45] to-[#006799] text-white font-semibold shadow-sm shadow-[#006799]/20'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`shrink-0 ${isActive ? 'text-sky-200' : 'text-slate-400 group-hover:text-[#006799]'}`}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.name}</span>
                </div>
                {badge.text !== undefined && (
                  <span
                    title={badge.tooltip}
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums min-w-[22px] text-center shrink-0 ml-2 ${badge.className}`}
                  >
                    {badge.text}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="p-3.5 mx-3.5 mb-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/50 border border-slate-200/80">
          <div className="flex items-center justify-between mb-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <span className="w-2 h-2 rounded-full bg-[#166534]" />
              Mesa de Ayuda
            </span>
            <span className="text-xs text-slate-400 tabular-nums">Bienestar</span>
          </div>
          <p className="text-xs text-slate-500 leading-snug mb-1.5 font-normal">
            ¿Dudas con tus reembolsos o beneficios?
          </p>
          <a
            href="mailto:bienestar@mperalillo.cl"
            className="text-xs font-semibold text-[#006799] hover:text-[#0c2b45] hover:underline block truncate"
          >
            bienestar@mperalillo.cl
          </a>
        </div>
      </aside>
    </>
  );
};
