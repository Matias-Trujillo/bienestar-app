'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';
import { User } from '@/types';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const ROLES_DIRECTIVA = ['presidente', 'secretario', 'tesorero', 'admin', 'auditor', 'superusuario'];

// [ESTUDIANTE INFORMÁTICA] Obtiene las iniciales del socio o directivo para el avatar superior.
function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface LogoutModalProps {
  user: User | null;
  onCancel: () => void;
  onConfirm: () => void;
}

// [ESTUDIANTE INFORMÁTICA] Modal moderno de cierre de sesión con esquinas suaves (rounded-2xl) y jerarquía visual clara.
const LogoutConfirmModal: React.FC<LogoutModalProps> = ({ user, onCancel, onConfirm }) =>
  createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-[#0c2b45] to-[#006799] text-white shadow-sm shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#006799] block">
                Seguridad del Portal • Peralillo
              </span>
              <h2 id="logout-title" className="text-base font-extrabold text-slate-900">
                ¿Finalizar tu sesión actual?
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Se cerrará de forma segura el acceso de <strong className="text-slate-800">{user?.nombreCompleto || 'tu cuenta'}</strong> en este equipo.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <span className="font-semibold text-slate-700 truncate">
              {user?.rolLabel || 'Socio Activo'} • {user?.departamento || 'I. Municipalidad'}
            </span>
            <span className="font-mono text-slate-500 tabular-nums shrink-0 ml-2">
              {user?.rut || ''}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              id="logout-cancel"
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Permanecer en el portal
            </button>
            <button
              id="logout-confirm"
              type="button"
              autoFocus
              onClick={onConfirm}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 rounded-xl shadow-sm transition-all"
            >
              Cerrar sesión segura
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

interface NotificationsDropdownProps {
  esDirectiva: boolean;
  esAdminOSuper: boolean;
  afiliacionPendientes: number;
  reembolsosPendientes: number;
  totalAlertas: number;
  onClose: () => void;
}

// [ESTUDIANTE INFORMÁTICA] Menú flotante de notificaciones con diseño limpio y contadores en píldoras.
const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  esDirectiva,
  esAdminOSuper,
  afiliacionPendientes,
  reembolsosPendientes,
  totalAlertas,
  onClose,
}) => (
  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden z-50 animate-scale-in">
    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
      <span className="text-xs font-bold text-[#0c2b45]">Bandeja de Pendientes</span>
      <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
        {totalAlertas} {totalAlertas === 1 ? 'pendiente' : 'pendientes'}
      </span>
    </div>
    <div className="divide-y divide-slate-100">
      {esDirectiva && (
        <Link
          href="/afiliacion"
          onClick={onClose}
          className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
        >
          <div>
            <p className="text-xs font-semibold text-slate-800">Afiliación y Cargas</p>
            <p className="text-[11px] text-slate-500">
              {afiliacionPendientes > 0
                ? `${afiliacionPendientes} solicitudes por resolver`
                : 'Sin solicitudes pendientes'}
            </p>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums min-w-[24px] text-center ${
              afiliacionPendientes > 0
                ? 'bg-amber-100 text-[#b45309] border border-amber-300'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {afiliacionPendientes}
          </span>
        </Link>
      )}
      {esAdminOSuper && (
        <Link
          href="/aprobaciones"
          onClick={onClose}
          className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
        >
          <div>
            <p className="text-xs font-semibold text-slate-800">Reembolsos Médicos</p>
            <p className="text-[11px] text-slate-500">
              {reembolsosPendientes > 0
                ? `${reembolsosPendientes} boletas en revisión`
                : 'Sin reembolsos pendientes'}
            </p>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums min-w-[24px] text-center ${
              reembolsosPendientes > 0
                ? 'bg-amber-100 text-[#b45309] border border-amber-300'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {reembolsosPendientes}
          </span>
        </Link>
      )}
      {!esDirectiva && !esAdminOSuper && (
        <div className="px-4 py-5 text-center text-xs text-slate-400">
          No tienes notificaciones pendientes.
        </div>
      )}
    </div>
  </div>
);

// [ESTUDIANTE INFORMÁTICA] Header institucional con efecto cristal (backdrop-blur) y controles adaptables sin desborde.
export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, token, logout } = useAuth();
  const pathname = usePathname();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [reembolsosPendientes, setReembolsosPendientes] = useState(0);
  const [afiliacionPendientes, setAfiliacionPendientes] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const esAdminOSuper = user?.rol === 'admin' || user?.rol === 'superusuario' || Boolean(user?.isSuperuser);
  const esDirectiva = Boolean(user && (user.isSuperuser || ROLES_DIRECTIVA.includes(user.rol)));

  const cargarNotificaciones = useCallback(async () => {
    if (!token) return;
    if (esAdminOSuper) {
      try {
        const r = await fetchFromApi<{ pendientes: number }>('/reembolsos/admin/conteo-pendientes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (typeof r?.pendientes === 'number') setReembolsosPendientes(r.pendientes);
      } catch {
        // Ignorar
      }
    }
    if (esDirectiva) {
      try {
        const a = await fetchFromApi<{ pendientes: number }>('/afiliacion/conteo-pendientes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (typeof a?.pendientes === 'number') setAfiliacionPendientes(a.pendientes);
      } catch {
        // Ignorar
      }
    }
  }, [esAdminOSuper, esDirectiva, token]);

  useEffect(() => {
    cargarNotificaciones();
    const interval = setInterval(cargarNotificaciones, 15000);
    const handleUpdate = () => cargarNotificaciones();
    window.addEventListener('solicitudes-updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('solicitudes-updated', handleUpdate);
    };
  }, [cargarNotificaciones, pathname]);

  useEffect(() => {
    if (!notifOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setConfirmOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmOpen]);

  const totalAlertas = (esDirectiva ? afiliacionPendientes : 0) + (esAdminOSuper ? reembolsosPendientes : 0);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-[72px] px-4 sm:px-6 lg:px-8 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-600 rounded-xl lg:hidden hover:bg-slate-100 border border-slate-200/80 shrink-0"
          aria-label="Abrir menú"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 sm:hidden min-w-0">
          <img src="/logo-peralillo.png" alt="Peralillo" className="h-7 w-auto object-contain shrink-0" />
          <span className="text-xs font-bold text-[#0c2b45] truncate">Bienestar Peralillo</span>
        </div>

        <div className="hidden sm:block min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight truncate">
              Portal de Bienestar Municipal
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#166534] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
              Peralillo {new Date().getFullYear()}
            </span>
          </div>
          <p className="text-xs text-slate-500 truncate">
            Ilustre Municipalidad de Peralillo • <span className="text-[#ea580c] font-medium italic">La comuna que soñamos</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            className="relative p-2.5 text-slate-600 rounded-xl hover:bg-slate-100 border border-slate-200/70 transition-colors cursor-pointer"
            aria-label="Notificaciones"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {totalAlertas > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold tabular-nums flex items-center justify-center ring-2 ring-white">
                {totalAlertas > 99 ? '99+' : totalAlertas}
              </span>
            )}
          </button>

          {notifOpen && (
            <NotificationsDropdown
              esDirectiva={esDirectiva}
              esAdminOSuper={esAdminOSuper}
              afiliacionPendientes={afiliacionPendientes}
              reembolsosPendientes={reembolsosPendientes}
              totalAlertas={totalAlertas}
              onClose={() => setNotifOpen(false)}
            />
          )}
        </div>

        <div className="hidden sm:block w-px h-7 bg-slate-200" />

        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#0c2b45] to-[#006799] text-white font-bold text-xs shadow-xs">
              {getInitials(user?.nombreCompleto)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#166534] ring-2 ring-white" />
          </div>
          <div className="text-left hidden md:block leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 max-w-[160px] truncate">
                {user?.nombreCompleto || 'Socio'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-[#006799] border border-sky-200/80">
                {user?.rolLabel || 'Socio Activo'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
              RUT {user?.rut || 'Sin especificar'}
            </span>
          </div>
        </div>

        <button
          id="logout-button"
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100/80 rounded-xl transition-colors border border-rose-200/70"
          title="Cerrar Sesión"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </button>
      </div>

      {confirmOpen && (
        <LogoutConfirmModal
          user={user}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            logout();
          }}
        />
      )}
    </header>
  );
};
