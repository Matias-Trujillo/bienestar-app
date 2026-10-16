'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Cerrar el modal con Escape
  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setConfirmOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmOpen]);

  // Se usa un modal propio en vez de window.confirm(), que algunos navegadores bloquean
  const handleLogout = () => setConfirmOpen(true);

  // Obtener iniciales del usuario actual
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-20 px-4 sm:px-8 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
      {/* Botón hamburguesa para móvil y saludo */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 rounded-xl lg:hidden hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Abrir menú"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="hidden sm:block">
          <h1 className="text-lg font-bold text-slate-800 leading-tight">
            Portal de Bienestar
          </h1>
          <p className="text-xs text-slate-500">
            Período Activo 2026 • Municipalidad de Peralillo
          </p>
        </div>
      </div>

      {/* Perfil de Usuario y Acciones */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Notificaciones */}
        <button
          className="relative p-2 text-slate-500 rounded-xl hover:bg-slate-100 hover:text-slate-700 transition"
          aria-label="Notificaciones"
          title="Notificaciones"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
        </button>

        {/* Separador vertical */}
        <div className="hidden sm:block w-px h-8 bg-slate-200"></div>

        {/* Ficha Usuario Dinámica */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm ring-2 ring-emerald-500/30">
              {getInitials(user?.nombreCompleto)}
            </div>
            <span
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white"
              title="En línea"
            ></span>
          </div>

          <div className="text-left hidden md:block">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">
                {user?.nombreCompleto || 'Invitado'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                {user?.rolLabel || 'Socio Activo'}
              </span>
            </div>
            <span className="text-xs text-slate-500">
              RUT: {user?.rut || 'Sin especificar'}
            </span>
          </div>
        </div>

        {/* Botón de Cierre de Sesión Real */}
        <button
          id="logout-button"
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition border border-rose-100"
          title="Cerrar Sesión y salir"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </button>
      </div>

      {confirmOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setConfirmOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
          >
            <div
              className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-100 text-rose-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div>
                  <h2 id="logout-title" className="text-base font-bold text-slate-800">Cerrar sesión</h2>
                  <p className="text-xs text-slate-500">¿Deseas cerrar la sesión del portal de Bienestar?</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  id="logout-cancel"
                  onClick={() => setConfirmOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  id="logout-confirm"
                  autoFocus
                  onClick={() => { setConfirmOpen(false); logout(); }}
                  className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};
