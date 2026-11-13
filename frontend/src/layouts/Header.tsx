'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';
import { User } from '@/types';
import {
  playNotificationChime,
  isSoundEnabled,
  toggleSoundEnabled,
} from '@/lib/notificationSound';

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

interface ToastData {
  id: string;
  titulo: string;
  mensaje: string;
  href: string;
}

// [ESTUDIANTE INFORMÁTICA] Banner flotante Toast en la esquina superior derecha con botón de acción rápida y autocierre.
const NotificationToast: React.FC<{
  toast: ToastData | null;
  onClose: () => void;
}> = ({ toast, onClose }) => {
  if (!toast || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed top-20 right-4 sm:right-6 z-[100] max-w-sm w-full animate-toast-in pointer-events-auto">
      <div className="relative overflow-hidden bg-white/95 backdrop-blur-md rounded-2xl border border-amber-300 shadow-2xl p-4 ring-1 ring-black/5">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-[#006799] to-[#166534]" />
        <div className="flex items-start gap-3 pt-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm shrink-0">
            <svg className="w-5 h-5 animate-bell-ring" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Alerta de Bandeja • Peralillo
              </span>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 transition-colors"
                aria-label="Cerrar notificación"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <h4 className="text-xs font-bold text-slate-900 mt-0.5 leading-snug">
              {toast.titulo}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              {toast.mensaje}
            </p>
            <div className="mt-2.5 flex items-center justify-end gap-2">
              <Link
                href={toast.href}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 rounded-xl shadow-xs transition-all"
              >
                <span>Revisar Solicitud</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface NotificationsDropdownProps {
  esDirectiva: boolean;
  esAdminOSuper: boolean;
  afiliacionPendientes: number;
  reembolsosPendientes: number;
  beneficiosPendientes: number;
  totalAlertas: number;
  sonidoHabilitado: boolean;
  onToggleSonido: () => void;
  onClose: () => void;
}

// [ESTUDIANTE INFORMÁTICA] Menú flotante de notificaciones con control de silencio y contadores en píldoras.
const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  esDirectiva,
  esAdminOSuper,
  afiliacionPendientes,
  reembolsosPendientes,
  beneficiosPendientes,
  totalAlertas,
  sonidoHabilitado,
  onToggleSonido,
  onClose,
}) => (
  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden z-50 animate-scale-in">
    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[#0c2b45]">Bandeja de Pendientes</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSonido();
          }}
          className={`p-1 rounded-lg border text-xs transition-colors cursor-pointer ${
            sonidoHabilitado
              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
          }`}
          title={sonidoHabilitado ? 'Silenciar alertas sonoras' : 'Activar alertas sonoras'}
          aria-label={sonidoHabilitado ? 'Silenciar alertas sonoras' : 'Activar alertas sonoras'}
        >
          {sonidoHabilitado ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
        </button>
      </div>
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
      {(esAdminOSuper || esDirectiva) && (
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
      {(esAdminOSuper || esDirectiva) && (
        <Link
          href="/beneficios"
          onClick={onClose}
          className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
        >
          <div>
            <p className="text-xs font-semibold text-slate-800">Beneficios y Bonos</p>
            <p className="text-[11px] text-slate-500">
              {beneficiosPendientes > 0
                ? `${beneficiosPendientes} solicitudes por evaluar`
                : 'Sin bonos pendientes'}
            </p>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums min-w-[24px] text-center ${
              beneficiosPendientes > 0
                ? 'bg-amber-100 text-[#b45309] border border-amber-300'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {beneficiosPendientes}
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

// [ESTUDIANTE INFORMÁTICA] Header institucional con alerta animada en tiempo real, sonido Web Audio API y sincronización.
export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, token, logout } = useAuth();
  const pathname = usePathname();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [reembolsosPendientes, setReembolsosPendientes] = useState(0);
  const [afiliacionPendientes, setAfiliacionPendientes] = useState(0);
  const [beneficiosPendientes, setBeneficiosPendientes] = useState(0);
  const [animandoCampana, setAnimandoCampana] = useState(false);
  const [campanaNuevaAlerta, setCampanaNuevaAlerta] = useState(false);
  const [toastActivo, setToastActivo] = useState<ToastData | null>(null);
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true);

  const notifRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bellAnimTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevTotalAlertasRef = useRef<number | null>(null);
  const prevAfiliacionRef = useRef<number | null>(null);
  const prevReembolsosRef = useRef<number | null>(null);
  const prevBeneficiosRef = useRef<number | null>(null);

  const esAdminOSuper = user?.rol === 'admin' || user?.rol === 'superusuario' || Boolean(user?.isSuperuser);
  const esDirectiva = Boolean(user && (user.isSuperuser || ROLES_DIRECTIVA.includes(user.rol)));

  // Inicializa la preferencia de sonido desde localStorage
  useEffect(() => {
    setSonidoHabilitado(isSoundEnabled());
  }, []);

  const dispararAlertaEnVivo = useCallback(
    (
      nuevoTotal: number,
      prevTotal: number,
      nuevoAfiliacion: number,
      prevAfiliacion: number,
      nuevoBeneficios: number,
      prevBeneficios: number
    ) => {
      // 1. Activar animación oscilatoria de campana
      setAnimandoCampana(true);
      setCampanaNuevaAlerta(true);
      if (bellAnimTimeoutRef.current) clearTimeout(bellAnimTimeoutRef.current);
      bellAnimTimeoutRef.current = setTimeout(() => {
        setAnimandoCampana(false);
      }, 2600);

      // 2. Reproducir chime institucional mediante Web Audio API
      playNotificationChime();

      // 3. Determinar módulo causante del incremento y armar Toast
      const diff = nuevoTotal - prevTotal;
      let href = '/aprobaciones';
      let titulo = '¡Nuevo Reembolso Médico por Revisar!';

      if (nuevoBeneficios > prevBeneficios) {
        href = '/beneficios';
        titulo = '¡Nueva Solicitud de Beneficio / Bono!';
      } else if (nuevoAfiliacion > prevAfiliacion) {
        href = '/afiliacion';
        titulo = '¡Nueva Solicitud de Afiliación / Carga!';
      }

      const mensaje =
        diff === 1
          ? 'Se ha recibido una nueva solicitud pendiente de resolución directiva.'
          : `Se han recibido ${diff} nuevas solicitudes pendientes de revisión.`;

      setToastActivo({
        id: String(Date.now()),
        titulo,
        mensaje,
        href,
      });

      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastActivo(null);
      }, 6500);
    },
    []
  );

  const dispararAlertaAprobacion = useCallback((modulo: string, folio?: string, accion?: string) => {
    setAnimandoCampana(true);
    setCampanaNuevaAlerta(true);
    if (bellAnimTimeoutRef.current) clearTimeout(bellAnimTimeoutRef.current);
    bellAnimTimeoutRef.current = setTimeout(() => {
      setAnimandoCampana(false);
    }, 2600);

    playNotificationChime();

    const accionStr = accion === 'RECHAZAR' ? 'Rechazada' : 'Aprobada';
    let moduloTitulo = 'Solicitud';
    let href = '/';
    if (modulo === 'afiliacion') {
      moduloTitulo = 'Incorporación / Carga';
      href = '/afiliacion';
    } else if (modulo === 'reembolsos') {
      moduloTitulo = 'Reembolso Médico';
      href = '/aprobaciones';
    } else if (modulo === 'beneficios') {
      moduloTitulo = 'Bono / Beneficio Social';
      href = '/beneficios';
    }

    setToastActivo({
      id: String(Date.now()),
      titulo: `¡${moduloTitulo} ${accionStr}!`,
      mensaje: folio
        ? `El expediente ${folio} ha sido procesado exitosamente.`
        : `Se ha registrado la resolución del trámite exitosamente.`,
      href,
    });

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastActivo(null);
    }, 6500);
  }, []);

  const cargarNotificaciones = useCallback(async () => {
    if (!token) return;

    let nuevoReembolsos = 0;
    let nuevoAfiliacion = 0;
    let nuevoBeneficios = 0;

    // 1. Reembolsos
    if (esAdminOSuper || esDirectiva) {
      try {
        const r = await fetchFromApi<{ pendientes: number }>('/reembolsos/conteo-pendientes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (typeof r?.pendientes === 'number') nuevoReembolsos = r.pendientes;
      } catch {
        // Ignorar error puntual
      }
    }

    // 2. Afiliaciones y Cargas
    if (esDirectiva) {
      try {
        const a = await fetchFromApi<{ pendientes: number }>('/afiliacion/conteo-pendientes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (typeof a?.pendientes === 'number') nuevoAfiliacion = a.pendientes;
      } catch {
        // Ignorar error puntual
      }
    }

    // 3. Beneficios y Bonos
    if (esAdminOSuper || esDirectiva) {
      try {
        const b = await fetchFromApi<{ pendientes: number }>('/beneficios/conteo-pendientes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (typeof b?.pendientes === 'number') nuevoBeneficios = b.pendientes;
      } catch {
        // Ignorar error puntual
      }
    }

    setReembolsosPendientes(nuevoReembolsos);
    setAfiliacionPendientes(nuevoAfiliacion);
    setBeneficiosPendientes(nuevoBeneficios);

    const nuevoTotal =
      (esDirectiva ? nuevoAfiliacion : 0) +
      (esAdminOSuper || esDirectiva ? nuevoReembolsos : 0) +
      (esAdminOSuper || esDirectiva ? nuevoBeneficios : 0);

    // Comparar con el conteo previo para detectar llegadas en caliente
    if (prevTotalAlertasRef.current !== null && nuevoTotal > prevTotalAlertasRef.current) {
      dispararAlertaEnVivo(
        nuevoTotal,
        prevTotalAlertasRef.current,
        nuevoAfiliacion,
        prevAfiliacionRef.current ?? 0,
        nuevoBeneficios,
        prevBeneficiosRef.current ?? 0
      );
    }

    prevTotalAlertasRef.current = nuevoTotal;
    prevAfiliacionRef.current = nuevoAfiliacion;
    prevReembolsosRef.current = nuevoReembolsos;
    prevBeneficiosRef.current = nuevoBeneficios;
  }, [dispararAlertaEnVivo, esAdminOSuper, esDirectiva, token]);

  // Sondeo inteligente cada 4 segundos para roles resolutivos con pausa si la pestaña está oculta
  useEffect(() => {
    cargarNotificaciones();

    const intervalMs = esDirectiva || esAdminOSuper ? 4000 : 25000;
    let intervalId: NodeJS.Timeout | null = null;

    const startInterval = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (typeof document !== 'undefined' && document.hidden) return;
          cargarNotificaciones();
        }, intervalMs);
      }
    };

    const stopInterval = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    startInterval();

    const handleVisibility = () => {
      if (!document.hidden) {
        cargarNotificaciones();
      }
    };

    const handleUpdate = () => cargarNotificaciones();

    // Sincronización entre pestañas mediante BroadcastChannel
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('bienestar_alertas_channel');
      bc.onmessage = (ev) => {
        if (ev.data?.type === 'SOLICITUD_CREADA') {
          cargarNotificaciones();
        } else if (ev.data?.type === 'SOLICITUD_APROBADA') {
          dispararAlertaAprobacion(ev.data?.modulo || '', ev.data?.folio, ev.data?.accion);
          cargarNotificaciones();
        } else if (ev.data?.type === 'SOLICITUD_ACTUALIZADA') {
          cargarNotificaciones();
        }
      };
    }

    window.addEventListener('solicitudes-updated', handleUpdate);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopInterval();
      window.removeEventListener('solicitudes-updated', handleUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (bc) bc.close();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (bellAnimTimeoutRef.current) clearTimeout(bellAnimTimeoutRef.current);
    };
  }, [cargarNotificaciones, dispararAlertaAprobacion, esAdminOSuper, esDirectiva, pathname]);

  // Cierre de menús contextuales al hacer clic fuera o presionar escape
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

  const handleToggleSonido = () => {
    const nuevo = toggleSoundEnabled();
    setSonidoHabilitado(nuevo);
  };

  const totalAlertas =
    (esDirectiva ? afiliacionPendientes : 0) +
    (esAdminOSuper || esDirectiva ? reembolsosPendientes : 0) +
    (esAdminOSuper || esDirectiva ? beneficiosPendientes : 0);

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
            <h1 className="text-base font-bold text-slate-900 tracking-tight truncate">
              Portal de Bienestar Municipal
            </h1>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#166534] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80 shrink-0 tabular-nums">
              <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
              Peralillo {new Date().getFullYear()}
            </span>
          </div>
          <p className="text-xs text-slate-500 truncate font-normal">
            Ilustre Municipalidad de Peralillo • <span className="text-[#ea580c] font-medium">La comuna que soñamos</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen((prev) => !prev);
              setCampanaNuevaAlerta(false);
            }}
            className={`relative p-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${
              animandoCampana || campanaNuevaAlerta
                ? 'bg-amber-50/90 text-amber-600 border-amber-300 shadow-md ring-4 ring-amber-400/30'
                : totalAlertas > 0
                ? 'bg-slate-50 text-slate-700 border-slate-200/90 hover:bg-slate-100'
                : 'text-slate-600 rounded-xl hover:bg-slate-100 border border-slate-200/70'
            }`}
            aria-label="Notificaciones"
            title={totalAlertas > 0 ? `${totalAlertas} solicitudes pendientes de atención` : 'Notificaciones'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${animandoCampana ? 'animate-bell-ring text-amber-600' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {totalAlertas > 0 && (
              <span
                className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[11px] font-bold tabular-nums flex items-center justify-center ring-2 ring-white shadow-xs transition-transform ${
                  animandoCampana ? 'bg-amber-600 scale-110' : 'bg-amber-500'
                }`}
              >
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
              beneficiosPendientes={beneficiosPendientes}
              totalAlertas={totalAlertas}
              sonidoHabilitado={sonidoHabilitado}
              onToggleSonido={handleToggleSonido}
              onClose={() => setNotifOpen(false)}
            />
          )}
        </div>

        <div className="hidden sm:block w-px h-7 bg-slate-200" />

        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#0c2b45] to-[#006799] text-white font-semibold text-xs shadow-xs">
              {getInitials(user?.nombreCompleto)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#166534] ring-2 ring-white" />
          </div>
          <div className="text-left hidden md:block leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-900 max-w-[160px] truncate">
                {user?.nombreCompleto || 'Socio'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-[#006799] border border-sky-200/80">
                {user?.rolLabel || 'Socio Activo'}
              </span>
            </div>
            <span className="text-xs text-slate-500 tabular-nums font-normal">
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

      {/* Banner flotante de notificación en vivo */}
      <NotificationToast
        toast={toastActivo}
        onClose={() => setToastActivo(null)}
      />
    </header>
  );
};
