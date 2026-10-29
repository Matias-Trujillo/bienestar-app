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
      <div className="flex items-center gap-2.5 sm:gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 rounded-xl lg:hidden hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0077b6] min-w-[40px] min-h-[40px] flex items-center justify-center"
          aria-label="Abrir menú"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Identidad compacta en pantallas móviles */}
        <div className="flex items-center gap-2 sm:hidden">
          <img
            src="/logo-peralillo.png"
            alt="Peralillo"
            className="h-8 w-auto object-contain"
          />
          <div className="leading-tight">
            <span className="block text-xs font-bold text-slate-800">Bienestar</span>
            <span className="block text-[10px] font-semibold text-[#0077b6]">Peralillo</span>
          </div>
        </div>

        {/* Identidad en pantallas medianas y grandes */}
        <div className="hidden sm:block">
          <h1 className="text-lg font-bold text-slate-800 leading-tight flex items-center gap-2">
            <span>Portal de Bienestar</span>
            <span className="text-[11px] font-semibold text-[#558b2f] bg-[#558b2f]/10 px-2.5 py-0.5 rounded-full border border-[#558b2f]/20">
              Peralillo 2026
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Ilustre Municipalidad de Peralillo • <span className="text-[#ea580c] font-medium italic">La comuna que soñamos</span>
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
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ea580c] ring-2 ring-white"></span>
        </button>

        {/* Separador vertical */}
        <div className="hidden sm:block w-px h-8 bg-slate-200"></div>

        {/* Ficha Usuario Dinámica */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-sky-100 text-[#0077b6] font-bold text-sm ring-2 ring-[#0077b6]/30">
              {getInitials(user?.nombreCompleto)}
            </div>
            <span
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#558b2f] ring-2 ring-white"
              title="En línea"
            ></span>
          </div>

          <div className="text-left hidden md:block">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">
                {user?.nombreCompleto || 'Invitado'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-[#0077b6] border border-sky-200">
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#061523]/70 backdrop-blur-md animate-fade-in"
            onClick={() => setConfirmOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
          >
            <div
              className="relative w-full max-w-md bg-white rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.45)] ring-1 ring-[#cfa145]/35 overflow-hidden animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Filete superior institucional Peralillo */}
              <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />

              <div className="p-6 sm:p-7 space-y-5">
                <div className="flex items-start gap-4">
                  {/* Icono ejecutivo de cierre de sesión */}
                  <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#061523] to-[#0c2b45] text-[#f3e3be] shadow-md ring-1 ring-[#cfa145]/40">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#006799] block mb-0.5">
                      Seguridad del Portal • Peralillo
                    </span>
                    <h2 id="logout-title" className="text-lg font-extrabold text-slate-800 tracking-tight">
                      ¿Finalizar tu sesión actual?
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Se cerrará de forma segura el acceso de{' '}
                      <strong className="text-slate-700 font-semibold">{user?.nombreCompleto || 'tu cuenta'}</strong> y se protegerán tus datos previsionales en este equipo.
                    </p>
                  </div>
                </div>

                {/* Resumen compacto de la sesión que se cerrará */}
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#5b7c29]" />
                    <span className="font-semibold text-slate-700 truncate">
                      {user?.rolLabel || 'Socio Activo'} • {user?.departamento || 'I. Municipalidad'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0 ml-2">
                    {user?.rut || ''}
                  </span>
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <button
                    id="logout-cancel"
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                  >
                    Permanecer en el portal
                  </button>
                  <button
                    id="logout-confirm"
                    type="button"
                    autoFocus
                    onClick={() => {
                      setConfirmOpen(false);
                      logout();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#061523] via-[#0c2b45] to-[#006799] hover:from-[#0a2133] hover:to-[#00547d] rounded-xl shadow-md transition"
                  >
                    <svg className="w-4 h-4 text-[#f3e3be]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Cerrar sesión de forma segura
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};
