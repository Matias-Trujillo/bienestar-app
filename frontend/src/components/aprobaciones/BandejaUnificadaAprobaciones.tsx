'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Gift,
  HeartPulse,
  Printer,
  RotateCcw,
  Search,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { fetchFromApi } from '@/lib/api';
import { imprimirColillaReembolso } from '@/lib/colillaReembolso';
import { getErrorMessage } from '@/lib/utils';
import { SolicitudReembolso } from '@/types';

export type TipoAprobacion = 'reembolso' | 'afiliacion' | 'carga' | 'beneficio';
export type FiltroCategoria = 'todas' | TipoAprobacion;

export interface SolicitudAfiliacionItem {
  folio: string;
  estado: string;
  fechaIngreso: string;
  nombreCompleto: string;
  run: string;
  grado: string;
  calidadContractual: string;
  email?: string | null;
  cargas?: { nombreCompleto: string; run: string; parentesco?: string | null }[];
  observacionesResolucion?: string | null;
}

export interface SolicitudCargaItem {
  id: number;
  folio: string;
  socioId: number;
  socioNombre: string;
  socioRut: string;
  nombreCompleto: string;
  run: string;
  parentesco?: string | null;
  certificadoTipo?: string | null;
  estado: string;
  fechaIngreso: string;
  observacionesResolucion?: string | null;
}

export interface SolicitudBeneficioItem {
  id: number;
  socio_id: number;
  socio_nombre: string;
  socio_rut: string;
  tipo_bono: string;
  titulo_bono: string;
  monto_calculado: number;
  estado: string;
  motivo?: string | null;
  motivo_rechazo?: string | null;
  created_at: string;
}

interface FilaUnificada {
  uid: string;
  tipo: TipoAprobacion;
  folio: string;
  solicitanteNombre: string;
  solicitanteRut: string;
  detallePrincipal: string;
  detalleSecundario: string;
  montoClp: number | null;
  fechaTexto: string;
  estadoNormalizado: 'pendiente' | 'aprobada' | 'rechazada' | 'pagada';
  estadoLabel: string;
  rawReembolso?: SolicitudReembolso;
  rawAfiliacion?: SolicitudAfiliacionItem;
  rawCarga?: SolicitudCargaItem;
  rawBeneficio?: SolicitudBeneficioItem;
}

interface Props {
  token: string | null;
  userRol?: string;
  isSuperuser?: boolean;
  categoriaActiva: FiltroCategoria;
  reembolsos: SolicitudReembolso[];
  afiliaciones: SolicitudAfiliacionItem[];
  cargas: SolicitudCargaItem[];
  beneficios: SolicitudBeneficioItem[];
  cargando: boolean;
  onRefreshTodo: () => Promise<void>;
  onNotificarOk: (msg: string) => void;
  onNotificarError: (msg: string) => void;
  onAprobarReembolso: (sol: SolicitudReembolso) => void;
  onRechazarReembolso: (sol: SolicitudReembolso) => void;
  onPagarReembolso: (sol: SolicitudReembolso) => void;
  onVerDetalleReembolso: (sol: SolicitudReembolso) => void;
}

function formatClp(monto: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(monto || 0);
}

function normalizarEstado(raw: string): 'pendiente' | 'aprobada' | 'rechazada' | 'pagada' {
  const s = (raw || '').toLowerCase().trim();
  if (s.includes('rechaz')) return 'rechazada';
  if (s.includes('pagad') || s.includes('liquidad')) return 'pagada';
  if (s.includes('aprob')) return 'aprobada';
  return 'pendiente';
}

const BADGE_TIPO: Record<
  TipoAprobacion,
  { label: string; className: string; icon: React.ReactNode }
> = {
  reembolso: {
    label: 'Reembolso Médico',
    className: 'bg-sky-50 text-[#006799] border border-sky-200',
    icon: <HeartPulse className="h-3.5 w-3.5" />,
  },
  afiliacion: {
    label: 'Creación de Cuenta',
    className: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    icon: <UserPlus className="h-3.5 w-3.5" />,
  },
  carga: {
    label: 'Carga Familiar',
    className: 'bg-teal-50 text-teal-700 border border-teal-200',
    icon: <Users className="h-3.5 w-3.5" />,
  },
  beneficio: {
    label: 'Beneficio Social',
    className: 'bg-amber-50 text-amber-800 border border-amber-200',
    icon: <Gift className="h-3.5 w-3.5" />,
  },
};

export function BandejaUnificadaAprobaciones({
  token,
  userRol,
  isSuperuser,
  categoriaActiva,
  reembolsos,
  afiliaciones,
  cargas,
  beneficios,
  cargando,
  onRefreshTodo,
  onNotificarOk,
  onNotificarError,
  onAprobarReembolso,
  onRechazarReembolso,
  onPagarReembolso,
  onVerDetalleReembolso,
}: Props) {
  const rolUpper = String(userRol || '').toUpperCase();
  const puedeRevertirPago =
    Boolean(isSuperuser) ||
    rolUpper === 'ADMIN' ||
    rolUpper === 'SUPERUSUARIO' ||
    rolUpper === 'PRESIDENTE';

  const [filtroEstado, setFiltroEstado] = useState<'pendiente' | 'todos' | 'aprobada' | 'rechazada' | 'pagada'>('pendiente');
  const [busqueda, setBusqueda] = useState('');

  // Modal moderno unificado para Afiliación / Carga / Beneficio
  const [itemModal, setItemModal] = useState<{
    fila: FilaUnificada;
    accion: 'aprobar' | 'rechazar';
  } | null>(null);
  const [fechaSesion, setFechaSesion] = useState(new Date().toISOString().slice(0, 10));
  const [numeroActa, setNumeroActa] = useState('Acta Ordinaria');
  const [observaciones, setObservaciones] = useState('');
  const [procesando, setProcesando] = useState(false);

  // Modal moderno de Pago para Beneficios Sociales (mismo flujo simple que Reembolsos)
  const [beneficioAPagar, setBeneficioAPagar] = useState<SolicitudBeneficioItem | null>(null);
  const [metodoPagoBen, setMetodoPagoBen] = useState<'Cheque' | 'Transferencia'>('Cheque');
  const [numeroDocBen, setNumeroDocBen] = useState('');
  const [bancoBen, setBancoBen] = useState('BancoEstado');

  // Modal exclusivo de Admin para Revertir Pago (Reembolso o Beneficio)
  const [filaARevertir, setFilaARevertir] = useState<FilaUnificada | null>(null);
  const [motivoReversion, setMotivoReversion] = useState('');

  const filasUnificadas: FilaUnificada[] = useMemo(() => {
    const lista: FilaUnificada[] = [];

    reembolsos.forEach((r) => {
      const est = normalizarEstado(r.estado);
      lista.push({
        uid: `rmb-${r.id}`,
        tipo: 'reembolso',
        folio: r.codigo,
        solicitanteNombre: r.socio_nombre || r.beneficiario_nombre || 'Socio',
        solicitanteRut: r.socio_rut || '',
        detallePrincipal: r.tipo_prestacion_label || r.tipo_prestacion || 'Prestación médica',
        detalleSecundario: `Beneficiario: ${r.beneficiario_nombre || 'Titular'}`,
        montoClp: r.monto_reembolso ?? null,
        fechaTexto: (r.created_at || '').slice(0, 10),
        estadoNormalizado: est,
        estadoLabel: r.estado_label || r.estado,
        rawReembolso: r,
      });
    });

    afiliaciones.forEach((a) => {
      const est = normalizarEstado(a.estado);
      lista.push({
        uid: `af-${a.folio}`,
        tipo: 'afiliacion',
        folio: a.folio,
        solicitanteNombre: a.nombreCompleto,
        solicitanteRut: a.run,
        detallePrincipal: `Incorporación Socio (${a.calidadContractual || 'Municipal'})`,
        detalleSecundario: `Grado ${a.grado || '—'} • ${a.cargas?.length || 0} carga(s) declaradas`,
        montoClp: null,
        fechaTexto: (a.fechaIngreso || '').slice(0, 10),
        estadoNormalizado: est,
        estadoLabel: a.estado,
        rawAfiliacion: a,
      });
    });

    cargas.forEach((c) => {
      const est = normalizarEstado(c.estado);
      lista.push({
        uid: `cf-${c.folio}`,
        tipo: 'carga',
        folio: c.folio,
        solicitanteNombre: c.socioNombre,
        solicitanteRut: c.socioRut,
        detallePrincipal: `Carga: ${c.nombreCompleto} (${c.parentesco || 'Familiar'})`,
        detalleSecundario: `RUN Carga: ${c.run} • ${c.certificadoTipo || 'Certificado adjunto'}`,
        montoClp: null,
        fechaTexto: (c.fechaIngreso || '').slice(0, 10),
        estadoNormalizado: est,
        estadoLabel: c.estado,
        rawCarga: c,
      });
    });

    beneficios.forEach((b) => {
      const est = normalizarEstado(b.estado);
      lista.push({
        uid: `ben-${b.id}`,
        tipo: 'beneficio',
        folio: `BEN-${String(b.id).padStart(4, '0')}`,
        solicitanteNombre: b.socio_nombre,
        solicitanteRut: b.socio_rut,
        detallePrincipal: b.titulo_bono,
        detalleSecundario: b.motivo || 'Postulación a beneficio reglamentario',
        montoClp: b.monto_calculado,
        fechaTexto: (b.created_at || '').slice(0, 10),
        estadoNormalizado: est,
        estadoLabel: b.estado,
        rawBeneficio: b,
      });
    });

    return lista;
  }, [reembolsos, afiliaciones, cargas, beneficios]);

  const filasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return filasUnificadas.filter((f) => {
      if (categoriaActiva !== 'todas' && f.tipo !== categoriaActiva) return false;
      if (filtroEstado !== 'todos' && f.estadoNormalizado !== filtroEstado) return false;
      if (q) {
        return (
          f.folio.toLowerCase().includes(q) ||
          f.solicitanteNombre.toLowerCase().includes(q) ||
          f.solicitanteRut.toLowerCase().includes(q) ||
          f.detallePrincipal.toLowerCase().includes(q) ||
          BADGE_TIPO[f.tipo].label.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filasUnificadas, categoriaActiva, filtroEstado, busqueda]);

  const abrirResolucion = (fila: FilaUnificada, accion: 'aprobar' | 'rechazar') => {
    if (fila.tipo === 'reembolso' && fila.rawReembolso) {
      if (accion === 'aprobar') onAprobarReembolso(fila.rawReembolso);
      else onRechazarReembolso(fila.rawReembolso);
      return;
    }
    setObservaciones('');
    setFechaSesion(new Date().toISOString().slice(0, 10));
    setNumeroActa('Acta Ordinaria');
    setItemModal({ fila, accion });
  };

  const handleConfirmarResolucionUnificada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemModal || !token) return;
    const { fila, accion } = itemModal;

    if (accion === 'rechazar' && observaciones.trim().length < 4) {
      onNotificarError('Debes indicar el motivo del rechazo (mínimo 4 caracteres).');
      return;
    }

    setProcesando(true);
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      if (fila.tipo === 'afiliacion' && fila.rawAfiliacion) {
        await fetchFromApi(`/afiliacion/solicitudes/${encodeURIComponent(fila.rawAfiliacion.folio)}/resolucion`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            accion,
            fechaSesion: accion === 'aprobar' ? fechaSesion : undefined,
            numeroActa: accion === 'aprobar' ? numeroActa.trim() || 'Acta Ordinaria' : undefined,
            observaciones: observaciones.trim() || (accion === 'aprobar' ? 'Aprobada por Directorio' : ''),
          }),
        });
      } else if (fila.tipo === 'carga' && fila.rawCarga) {
        await fetchFromApi(`/afiliacion/solicitudes-cargas/${encodeURIComponent(fila.rawCarga.folio)}/resolucion`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            accion,
            fechaSesion: accion === 'aprobar' ? fechaSesion : undefined,
            numeroActa: accion === 'aprobar' ? numeroActa.trim() || 'Acta Ordinaria' : undefined,
            observaciones: observaciones.trim() || (accion === 'aprobar' ? 'Carga acreditada por Directiva' : ''),
          }),
        });
      } else if (fila.tipo === 'beneficio' && fila.rawBeneficio) {
        await fetchFromApi(`/beneficios/solicitudes/${fila.rawBeneficio.id}/validar`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            accion: accion === 'aprobar' ? 'APROBAR' : 'RECHAZAR',
            motivo_rechazo: accion === 'rechazar' ? observaciones.trim() : undefined,
            observaciones: observaciones.trim() || undefined,
          }),
        });
      }

      setItemModal(null);
      onNotificarOk(
        `${BADGE_TIPO[fila.tipo].label} ${fila.folio} ${
          accion === 'aprobar' ? 'APROBADA' : 'RECHAZADA'
        } correctamente. Se despachó notificación por correo al solicitante.`
      );
      await onRefreshTodo();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('solicitudes-updated'));
      }
    } catch (err: unknown) {
      onNotificarError(getErrorMessage(err));
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmarPagoBeneficio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beneficioAPagar || !token || numeroDocBen.trim().length < 2) {
      onNotificarError('Ingresa el número de cheque o comprobante de transferencia.');
      return;
    }
    setProcesando(true);
    try {
      await fetchFromApi(`/beneficios/solicitudes/${beneficioAPagar.id}/validar`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accion: 'LIQUIDAR',
          metodo_pago: metodoPagoBen,
          numero_cheque: numeroDocBen.trim(),
          banco: bancoBen.trim() || 'BancoEstado',
        }),
      });
      setBeneficioAPagar(null);
      setNumeroDocBen('');
      onNotificarOk(
        `Beneficio BEN-${String(beneficioAPagar.id).padStart(4, '0')} marcado como PAGADO (${metodoPagoBen} N° ${numeroDocBen.trim()}). Se envió correo al socio con aviso de retiro.`
      );
      await onRefreshTodo();
    } catch (err: unknown) {
      onNotificarError(getErrorMessage(err));
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmarReversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filaARevertir || !token || motivoReversion.trim().length < 5) {
      onNotificarError('Ingresa un motivo de al menos 5 caracteres para revertir el pago.');
      return;
    }
    setProcesando(true);
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      if (filaARevertir.tipo === 'reembolso' && filaARevertir.rawReembolso) {
        await fetchFromApi(`/reembolsos/admin/solicitud/${filaARevertir.rawReembolso.id}/revertir-pago`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ motivo: motivoReversion.trim() }),
        });
      } else if (filaARevertir.tipo === 'beneficio' && filaARevertir.rawBeneficio) {
        await fetchFromApi(`/beneficios/solicitudes/${filaARevertir.rawBeneficio.id}/revertir-pago`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ motivo: motivoReversion.trim() }),
        });
      }
      const folioRev = filaARevertir.folio;
      setFilaARevertir(null);
      setMotivoReversion('');
      onNotificarOk(
        `Pago revertido para ${folioRev}. La solicitud volvió a "2. Listos para Pagar" y quedó registrada en auditoría.`
      );
      await onRefreshTodo();
    } catch (err: unknown) {
      onNotificarError(getErrorMessage(err));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="card-modern overflow-hidden min-w-0">
      {/* Barra de filtros unificada con lenguaje claro en 3 pasos */}
      <div className="p-4 sm:px-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'pendiente', label: '1. Por Revisar' },
              { id: 'aprobada', label: '2. Listos para Pagar' },
              { id: 'pagada', label: '3. Pagados / Finalizados' },
              { id: 'rechazada', label: 'Rechazados' },
              { id: 'todos', label: 'Todos' },
            ] as const
          ).map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setFiltroEstado(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                filtroEstado === st.id
                  ? 'bg-[#0c2b45] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar folio, RUN, socio o tipo..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
          />
        </div>
      </div>

      {/* Tabla consolidada */}
      {cargando && filasUnificadas.length === 0 ? (
        <div className="p-10 text-center text-xs text-slate-400">
          Cargando bandeja consolidada de aprobaciones...
        </div>
      ) : filasFiltradas.length === 0 ? (
        <div className="p-10 text-center text-xs text-slate-500">
          No hay solicitudes para los filtros seleccionados.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-600 font-semibold">
                <th className="py-3 px-4">Tipo de Aprobación</th>
                <th className="py-3 px-4">Folio y Fecha</th>
                <th className="py-3 px-4">Solicitante</th>
                <th className="py-3 px-4">Detalle / Monto</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filasFiltradas.map((f) => {
                const badge = BADGE_TIPO[f.tipo];
                return (
                  <tr key={f.uid} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 align-middle whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.className}`}
                      >
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 align-middle tabular-nums whitespace-nowrap">
                      <div className="font-bold text-slate-900">{f.folio}</div>
                      <div className="text-[11px] text-slate-500">{f.fechaTexto}</div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="font-semibold text-slate-900">{f.solicitanteNombre}</div>
                      <div className="text-[11px] text-slate-500 tabular-nums">{f.solicitanteRut}</div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="font-medium text-slate-800">{f.detallePrincipal}</div>
                      <div className="text-[11px] text-slate-500">
                        {f.detalleSecundario}
                        {f.montoClp !== null && (
                          <span className="ml-1.5 font-bold text-[#166534] tabular-nums">
                            • {formatClp(f.montoClp)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          f.estadoNormalizado === 'pendiente'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : f.estadoNormalizado === 'aprobada'
                            ? 'bg-emerald-50 text-[#166534] border border-emerald-200'
                            : f.estadoNormalizado === 'pagada'
                            ? 'bg-sky-50 text-[#006799] border border-sky-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {f.estadoLabel}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {f.tipo === 'reembolso' && f.rawReembolso && (
                          <button
                            type="button"
                            onClick={() => onVerDetalleReembolso(f.rawReembolso!)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                          >
                            Ver
                          </button>
                        )}
                        {f.estadoNormalizado === 'pendiente' && (
                          <>
                            <button
                              type="button"
                              onClick={() => abrirResolucion(f, 'aprobar')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Aprobar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirResolucion(f, 'rechazar')}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold cursor-pointer inline-flex items-center gap-1"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Rechazar</span>
                            </button>
                          </>
                        )}
                        {f.tipo === 'reembolso' &&
                          f.estadoNormalizado === 'aprobada' &&
                          f.rawReembolso && (
                            <button
                              type="button"
                              onClick={() => onPagarReembolso(f.rawReembolso!)}
                              className="px-2.5 py-1 rounded-lg bg-[#006799] hover:bg-[#0c2b45] text-white font-semibold cursor-pointer inline-flex items-center gap-1"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>Registrar Pago</span>
                            </button>
                          )}
                        {f.tipo === 'beneficio' &&
                          f.estadoNormalizado === 'aprobada' &&
                          f.rawBeneficio && (
                            <button
                              type="button"
                              onClick={() => {
                                setBeneficioAPagar(f.rawBeneficio!);
                                setMetodoPagoBen('Cheque');
                                setNumeroDocBen('');
                                setBancoBen('BancoEstado');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#006799] hover:bg-[#0c2b45] text-white font-semibold cursor-pointer inline-flex items-center gap-1"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>Registrar Pago</span>
                            </button>
                          )}
                        {f.tipo === 'reembolso' &&
                          f.estadoNormalizado === 'pagada' &&
                          f.rawReembolso && (
                            <button
                              type="button"
                              onClick={() => {
                                const r = f.rawReembolso!;
                                imprimirColillaReembolso({
                                  codigo: r.codigo,
                                  socioNombre: r.socio_nombre || r.beneficiario_nombre || '',
                                  socioRut: r.socio_rut || r.beneficiario_run || '',
                                  beneficiarioNombre: r.beneficiario_nombre,
                                  beneficiarioParentesco: r.beneficiario_parentesco,
                                  prestacionLabel: r.tipo_prestacion_label,
                                  montoReembolso: r.monto_reembolso || r.monto_copago,
                                  metodoPago: r.metodo_pago,
                                  numeroDocumento: r.numero_cheque_o_transferencia,
                                  bancoEmisor: r.banco_emisor,
                                  fechaPago: r.fecha_pago,
                                  horaProceso: r.hora_proceso,
                                  recepcionConforme: r.recepcion_conforme,
                                  recepcionConformeAt: r.recepcion_conforme_at,
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer inline-flex items-center gap-1"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>Colilla</span>
                            </button>
                          )}
                        {puedeRevertirPago &&
                          f.estadoNormalizado === 'pagada' &&
                          (f.tipo === 'reembolso' || f.tipo === 'beneficio') && (
                            <button
                              type="button"
                              onClick={() => {
                                setFilaARevertir(f);
                                setMotivoReversion('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold cursor-pointer inline-flex items-center gap-1"
                              title="Solo Admin/Presidente: devolver a Listo para Pagar (ej. cheque caducado o corrección)"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Revertir Pago</span>
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Moderno de Resolución (Afiliación / Carga / Beneficio) */}
      {itemModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-fade-in">
            <div
              className={`px-6 py-4 text-white flex items-center justify-between ${
                itemModal.accion === 'aprobar'
                  ? 'bg-gradient-to-r from-[#166534] to-emerald-600'
                  : 'bg-gradient-to-r from-rose-700 to-rose-600'
              }`}
            >
              <div>
                <h3 className="text-sm font-bold">
                  {itemModal.accion === 'aprobar' ? 'Aprobar' : 'Rechazar'}{' '}
                  {BADGE_TIPO[itemModal.fila.tipo].label}
                </h3>
                <p className="text-[11px] text-white/85 mt-0.5">
                  Folio {itemModal.fila.folio} • {itemModal.fila.solicitanteNombre}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setItemModal(null)}
                className="text-white/80 hover:text-white text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleConfirmarResolucionUnificada} className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900">{itemModal.fila.detallePrincipal}</div>
                <div className="text-slate-500">{itemModal.fila.detalleSecundario}</div>
              </div>

              {itemModal.accion === 'aprobar' &&
                (itemModal.fila.tipo === 'afiliacion' || itemModal.fila.tipo === 'carga') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Fecha Sesión Directorio
                      </label>
                      <input
                        type="date"
                        required
                        value={fechaSesion}
                        onChange={(e) => setFechaSesion(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">N° de Acta</label>
                      <input
                        type="text"
                        required
                        value={numeroActa}
                        onChange={(e) => setNumeroActa(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
                      />
                    </div>
                  </div>
                )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {itemModal.accion === 'rechazar'
                    ? 'Motivo del rechazo (obligatorio)'
                    : 'Observaciones (opcional)'}
                </label>
                <textarea
                  rows={3}
                  required={itemModal.accion === 'rechazar'}
                  placeholder={
                    itemModal.accion === 'rechazar'
                      ? 'Indica claramente el motivo del rechazo para notificar al socio...'
                      : 'Observaciones de aprobación...'
                  }
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
                />
              </div>

              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200/80 text-[11px] text-[#006799]">
                Al confirmar, el sistema actualizará el estado y <strong>enviará automáticamente un correo electrónico</strong> al solicitante con el resultado.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={procesando}
                  onClick={() => setItemModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesando}
                  className={`px-4 py-2 rounded-xl text-white font-semibold cursor-pointer disabled:opacity-50 ${
                    itemModal.accion === 'aprobar'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {procesando
                    ? 'Procesando...'
                    : itemModal.accion === 'aprobar'
                    ? 'Confirmar Aprobación y Notificar'
                    : 'Confirmar Rechazo y Notificar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Simple de Registro de Pago para Beneficio Social */}
      {beneficioAPagar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-gradient-to-r from-[#0c2b45] to-[#006799] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Registrar Pago — Beneficio Social</h3>
                <p className="text-[11px] text-sky-100 mt-0.5">
                  BEN-{String(beneficioAPagar.id).padStart(4, '0')} • {beneficioAPagar.socio_nombre} ({formatClp(beneficioAPagar.monto_calculado)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBeneficioAPagar(null)}
                className="text-white/80 hover:text-white text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleConfirmarPagoBeneficio} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Medio de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Cheque', 'Transferencia'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMetodoPagoBen(m)}
                      className={`py-2 rounded-xl border font-semibold cursor-pointer ${
                        metodoPagoBen === m
                          ? 'bg-sky-50 border-[#006799] text-[#006799]'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  N° de {metodoPagoBen === 'Cheque' ? 'Cheque' : 'Comprobante de Transferencia'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={metodoPagoBen === 'Cheque' ? 'Ej: 0045123' : 'Ej: TRF-202611-889'}
                  value={numeroDocBen}
                  onChange={(e) => setNumeroDocBen(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Banco Emisor</label>
                <input
                  type="text"
                  value={bancoBen}
                  onChange={(e) => setBancoBen(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
                />
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-[#166534]">
                Al confirmar, quedará en estado <strong>Pagado / Finalizado</strong> y se enviará correo automático al socio avisando el retiro del documento (plazo legal cheque: 60 días).
              </div>
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBeneficioAPagar(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesando}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0c2b45] to-[#006799] text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {procesando ? 'Registrando...' : 'Confirmar Pago y Notificar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Exclusivo de Admin para Revertir Pago (Cheque Caducado / Corrección) */}
      {filaARevertir && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Revertir Pago (Solo Administración)</h3>
                <p className="text-[11px] text-amber-100 mt-0.5">
                  Folio {filaARevertir.folio} • {filaARevertir.solicitanteNombre}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFilaARevertir(null)}
                className="text-white/80 hover:text-white text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleConfirmarReversion} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Esta acción anulará el pago actual y devolverá la solicitud a <strong>“2. Listos para Pagar”</strong> para que Tesorería pueda emitir un nuevo cheque o transferencia.
              </p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Motivo de la reversión (obligatorio)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ej: Cheque caducado tras 60 días sin retiro por el socio; se reemitirá transferencia."
                  value={motivoReversion}
                  onChange={(e) => setMotivoReversion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFilaARevertir(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesando}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {procesando ? 'Revirtiendo...' : 'Sí, Revertir a Listo para Pagar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
