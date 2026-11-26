'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';
import { formatCurrency, getErrorMessage } from '@/lib/utils';
import {
  ModuloResumenSolicitud,
  ResumenGeneralAdmin,
  SolicitudResumenAdminItem,
} from '@/types';

type TabBandeja = 'por_aprobar' | 'rechazadas';
type FiltroModulo = 'TODOS' | ModuloResumenSolicitud;

const MODULO_META: Record<
  ModuloResumenSolicitud,
  { label: string; badgeClass: string }
> = {
  REEMBOLSOS: {
    label: 'Reembolso Salud',
    badgeClass: 'bg-emerald-50 text-[#166534] border-emerald-200',
  },
  BENEFICIOS: {
    label: 'Beneficio Social',
    badgeClass: 'bg-sky-50 text-[#006799] border-sky-200',
  },
  AFILIACION: {
    label: 'Afiliación',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  CARGAS: {
    label: 'Carga Familiar',
    badgeClass: 'bg-amber-50 text-[#b45309] border-amber-200',
  },
};

function formatFechaHoraCorta(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dt);
}

function formatAccionLegible(accion: string): string {
  return (accion || 'EVENTO')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

const SolicitudRow: React.FC<{ item: SolicitudResumenAdminItem; esRechazada?: boolean }> = ({
  item,
  esRechazada = false,
}) => {
  const meta = MODULO_META[item.modulo];
  return (
    <div className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${meta.badgeClass}`}
          >
            {meta.label}
          </span>
          <span className="font-mono text-xs font-bold text-[#0c2b45]">{item.folio}</span>
          {item.es_nueva && !esRechazada && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white shadow-2xs">
              <Sparkles className="w-2.5 h-2.5" />
              Nuevo
            </span>
          )}
          <span className="text-[11px] text-slate-400 tabular-nums">
            • {formatFechaHoraCorta(item.fecha_iso)}
          </span>
        </div>

        <p className="text-sm font-semibold text-slate-900 truncate">{item.solicitante}</p>
        <p className="text-xs text-slate-600 leading-snug">{item.detalle}</p>

        {esRechazada && item.motivo_rechazo && (
          <p className="text-[11px] text-rose-700 bg-rose-50/90 border border-rose-200/80 rounded-lg px-2.5 py-1.5 mt-1">
            <strong>Motivo rechazo:</strong> {item.motivo_rechazo}
          </p>
        )}
      </div>

      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
        {typeof item.monto === 'number' && item.monto > 0 && (
          <span className="text-sm font-extrabold text-slate-900 tabular-nums">
            {formatCurrency(item.monto)}
          </span>
        )}
        <Link
          href={item.href}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 shadow-2xs transition-all whitespace-nowrap"
        >
          <span>{esRechazada ? 'Ver módulo' : 'Revisar'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

// [ESTUDIANTE INFORMÁTICA] Portada ejecutiva de la Vista Admin ("Resumen General") siguiendo SRP en frontend.
export const AdminOverviewDashboard: React.FC = () => {
  const { user, token, setViewMode, tieneDobleVista } = useAuth();
  const [resumen, setResumen] = useState<ResumenGeneralAdmin | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabBandeja, setTabBandeja] = useState<TabBandeja>('por_aprobar');
  const [filtroModulo, setFiltroModulo] = useState<FiltroModulo>('TODOS');

  const cargarResumen = useCallback(
    async (silencioso = false) => {
      if (!token) return;
      if (silencioso) setRefrescando(true);
      else setCargando(true);
      setError(null);
      try {
        const data = await fetchFromApi<ResumenGeneralAdmin>('/admin/resumen-general', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResumen(data);
      } catch (err: unknown) {
        setError(getErrorMessage(err) || 'No se pudo cargar el resumen general de la plataforma.');
      } finally {
        setCargando(false);
        setRefrescando(false);
      }
    },
    [token]
  );

  useEffect(() => {
    cargarResumen(false);

    const onUpdate = () => cargarResumen(true);
    window.addEventListener('solicitudes-updated', onUpdate);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('bienestar_alertas_channel');
      bc.onmessage = () => cargarResumen(true);
    }

    return () => {
      window.removeEventListener('solicitudes-updated', onUpdate);
      if (bc) bc.close();
    };
  }, [cargarResumen]);

  const solicitudesFiltradas = useMemo(() => {
    if (!resumen) return [];
    const base =
      tabBandeja === 'por_aprobar'
        ? resumen.solicitudes_por_aprobar
        : resumen.solicitudes_rechazadas;
    if (filtroModulo === 'TODOS') return base;
    return base.filter((item) => item.modulo === filtroModulo);
  }, [resumen, tabBandeja, filtroModulo]);

  const porcentajeHabilitados = useMemo(() => {
    if (!resumen || resumen.metricas.socios_activos <= 0) return 0;
    return Math.round(
      (resumen.metricas.socios_habilitados / resumen.metricas.socios_activos) * 100
    );
  }, [resumen]);

  return (
    <div className="space-y-6 animate-fade-in min-w-0">
      {/* Cabecera Ejecutiva de Vista Admin */}
      <div className="hero-institutional">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
        <div className="p-6 sm:p-7 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-amber-200 border border-white/15">
                  <ShieldCheck className="w-3.5 h-3.5 text-lime-300" />
                  Vista Administración • {user?.rolLabel || 'Directiva'}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/25">
                  Comité de Bienestar • Peralillo
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Resumen General de Actividad
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Hola, <strong className="text-white">{user?.nombreCompleto || 'Administrador'}</strong>. Aquí ves de forma inmediata todo lo nuevo que ingresó a la plataforma, las solicitudes por aprobar, los rechazos recientes y el pulso operativo del día.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => cargarResumen(true)}
                disabled={refrescando}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refrescando ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
              {tieneDobleVista && (
                <button
                  type="button"
                  onClick={() => setViewMode('socio')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-100 bg-emerald-600/30 hover:bg-emerald-600/45 border border-emerald-400/35 transition-colors cursor-pointer"
                  title="Cambiar a Vista Usuario para gestionar tus propios reembolsos, bonos o cargas"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Ir a mi Vista Usuario</span>
                </button>
              )}
            </div>
          </div>

          {/* Franja "Novedades mientras no estuviste activo" */}
          {resumen && (
            <div className="rounded-2xl bg-white/[0.08] border border-white/15 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-300/30 text-amber-200 flex items-center justify-center shrink-0">
                  <BellRing className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">
                    {resumen.novedades.total_novedades > 0
                      ? `Ingresaron ${resumen.novedades.total_novedades} novedad(es) mientras no estuviste activo`
                      : 'Sin ingresos nuevos desde tu última revisión'}
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {resumen.novedades.es_primer_acceso
                      ? `Ventana de las últimas 24 horas (desde ${formatFechaHoraCorta(resumen.novedades.desde_iso)})`
                      : `Comparado desde tu acceso anterior el ${formatFechaHoraCorta(resumen.novedades.desde_iso)}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                <Link
                  href="/aprobaciones"
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 border border-white/15 tabular-nums transition-colors"
                >
                  +{resumen.novedades.nuevos_reembolsos} reembolsos
                </Link>
                <Link
                  href="/beneficios"
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-sky-200 border border-white/15 tabular-nums transition-colors"
                >
                  +{resumen.novedades.nuevos_beneficios} bonos
                </Link>
                <Link
                  href="/afiliacion"
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-amber-200 border border-white/15 tabular-nums transition-colors"
                >
                  +{resumen.novedades.nuevas_afiliaciones} afil. / +{resumen.novedades.nuevas_cargas} cargas
                </Link>
                <Link
                  href="/ofertas"
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-purple-200 border border-white/15 tabular-nums transition-colors"
                >
                  +{resumen.novedades.nuevas_postulaciones_talento} talento
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => cargarResumen(false)}
            className="px-3 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {cargando && !resumen ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-white border border-slate-200/80 animate-pulse p-5"
            />
          ))}
        </div>
      ) : resumen ? (
        <>
          {/* 4 Tarjetas KPI de Estado y Actividad */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 min-w-0">
            {/* KPI 1: Por Aprobar */}
            <div className="card-modern-interactive p-5 min-w-0 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-[#b45309] block">
                    Solicitudes por Aprobar
                  </span>
                  <p className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
                    {resumen.bandejas.por_aprobar.total}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-[#b45309] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-[11px] text-slate-600 tabular-nums">
                <p className="truncate">
                  {resumen.bandejas.por_aprobar.reembolsos_revision} salud •{' '}
                  {resumen.bandejas.por_aprobar.beneficios} bonos •{' '}
                  {resumen.bandejas.por_aprobar.afiliaciones} afil. •{' '}
                  {resumen.bandejas.por_aprobar.cargas} cargas
                </p>
                {resumen.bandejas.por_aprobar.reembolsos_por_pagar > 0 && (
                  <p className="text-[#006799] font-semibold">
                    + {resumen.bandejas.por_aprobar.reembolsos_por_pagar} reembolso(s) aprobados por pagar
                  </p>
                )}
              </div>
            </div>

            {/* KPI 2: Rechazadas (30 días) */}
            <div className="card-modern-interactive p-5 min-w-0 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-rose-700 block">
                    Rechazadas (Últimos 30 días)
                  </span>
                  <p className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
                    {resumen.bandejas.rechazadas_30d.total}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 tabular-nums truncate">
                {resumen.bandejas.rechazadas_30d.reembolsos} salud •{' '}
                {resumen.bandejas.rechazadas_30d.beneficios} bonos •{' '}
                {resumen.bandejas.rechazadas_30d.afiliaciones} afil. •{' '}
                {resumen.bandejas.rechazadas_30d.cargas} cargas
              </div>
            </div>

            {/* KPI 3: Padrón de Socios */}
            <div className="card-modern-interactive p-5 min-w-0 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-[#006799] block">
                    Padrón de Socios Activos
                  </span>
                  <p className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
                    {resumen.metricas.socios_activos}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-[#006799] flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#006799] to-[#166534]"
                    style={{ width: `${porcentajeHabilitados}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-600 tabular-nums truncate">
                  {resumen.metricas.socios_habilitados} habilitados (≥6m) •{' '}
                  {resumen.metricas.socios_carencia} en carencia
                </p>
              </div>
            </div>

            {/* KPI 4: Actividad y Desembolso */}
            <div className="card-modern-interactive p-5 min-w-0 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-[#166534] block">
                    Actividad de Plataforma
                  </span>
                  <p className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
                    {resumen.metricas.eventos_hoy}{' '}
                    <span className="text-xs font-semibold text-slate-500">hoy</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-[#166534] flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-0.5 text-[11px] text-slate-600 tabular-nums">
                <p className="truncate">
                  {resumen.metricas.eventos_7d} eventos en 7 días • {resumen.metricas.ofertas_activas} oferta(s) activa(s)
                </p>
                <p className="font-semibold text-slate-800 truncate">
                  Gestionado: {formatCurrency(resumen.metricas.monto_desembolsado_periodo)}
                </p>
              </div>
            </div>
          </section>

          {/* Bloque Central: Bandejas Operativas (7 cols) + Actividad Reciente (5 cols) */}
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-w-0">
            {/* Bandeja Consolidada de Solicitudes */}
            <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden min-w-0 flex flex-col">
              <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      Bandeja Consolidada de Solicitudes
                    </h2>
                    <p className="text-xs text-slate-500">
                      Vista rápida de expedientes ingresados en todos los módulos para actuar de inmediato.
                    </p>
                  </div>
                  <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setTabBandeja('por_aprobar')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer tabular-nums ${
                        tabBandeja === 'por_aprobar'
                          ? 'bg-[#0c2b45] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Por Aprobar ({resumen.bandejas.por_aprobar.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTabBandeja('rechazadas')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer tabular-nums ${
                        tabBandeja === 'rechazadas'
                          ? 'bg-rose-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Rechazadas ({resumen.bandejas.rechazadas_30d.total})
                    </button>
                  </div>
                </div>

                {/* Filtros rápidos por módulo */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'TODOS', label: 'Todos los módulos' },
                      { id: 'REEMBOLSOS', label: 'Reembolsos' },
                      { id: 'BENEFICIOS', label: 'Beneficios' },
                      { id: 'AFILIACION', label: 'Afiliación' },
                      { id: 'CARGAS', label: 'Cargas' },
                    ] as { id: FiltroModulo; label: string }[]
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFiltroModulo(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        filtroModulo === f.id
                          ? 'bg-sky-50 text-[#006799] border border-sky-200'
                          : 'bg-slate-50 text-slate-600 border border-slate-200/70 hover:bg-slate-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {solicitudesFiltradas.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#166534] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    {tabBandeja === 'por_aprobar'
                      ? '¡Todo al día en esta bandeja!'
                      : 'No hay solicitudes rechazadas en este filtro.'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {tabBandeja === 'por_aprobar'
                      ? 'No existen solicitudes pendientes de aprobación para el criterio seleccionado.'
                      : 'Las resoluciones rechazadas de los últimos 30 días aparecerán aquí.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {solicitudesFiltradas.map((item) => (
                    <SolicitudRow
                      key={item.id_referencia}
                      item={item}
                      esRechazada={tabBandeja === 'rechazadas'}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Columna Derecha: Feed de Actividad Reciente */}
            <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden min-w-0 flex flex-col">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Actividad Reciente de la Plataforma
                  </h2>
                  <p className="text-xs text-slate-500">
                    Últimos movimientos auditados en tiempo real.
                  </p>
                </div>
                <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full tabular-nums">
                  {resumen.metricas.total_eventos_auditoria} registros
                </span>
              </div>

              {resumen.actividad_reciente.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Aún no existen registros recientes en la bitácora de actividad.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {resumen.actividad_reciente.map((ev) => (
                    <div key={ev.id} className="p-3.5 hover:bg-slate-50/70 transition-colors space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/80">
                          {ev.modulo}
                        </span>
                        <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                          {formatFechaHoraCorta(ev.fecha_iso)}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900">
                        {formatAccionLegible(ev.accion)}
                      </p>
                      {ev.detalles && (
                        <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                          {ev.detalles}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400">
                        Por <span className="font-semibold text-slate-600">{ev.usuario_nombre}</span>
                        {ev.usuario_rol ? ` (${ev.usuario_rol})` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
};
