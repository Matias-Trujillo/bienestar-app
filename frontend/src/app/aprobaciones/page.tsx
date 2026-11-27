'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi, API_BASE_URL } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { SolicitudReembolso } from '@/types';
import { DetalleSolicitudModal } from '@/components/reembolsos/DetalleSolicitudModal';
import { VisorComprobanteModal } from '@/components/reembolsos/VisorComprobanteModal';
import { TramoDias, obtenerIndicadorDias } from '@/components/aprobaciones/IndicadorTramoBadge';
import { AprobacionesStatsCards } from '@/components/aprobaciones/AprobacionesStatsCards';
import { FiltrosAprobaciones } from '@/components/aprobaciones/FiltrosAprobaciones';
import { ModalResolucionReembolso } from '@/components/aprobaciones/ModalResolucionReembolso';
import { TablaAprobaciones } from '@/components/aprobaciones/TablaAprobaciones';
import {
  BandejaUnificadaAprobaciones,
  FiltroCategoria,
  SolicitudAfiliacionItem,
  SolicitudBeneficioItem,
  SolicitudCargaItem,
} from '@/components/aprobaciones/BandejaUnificadaAprobaciones';

// [ESTUDIANTE INFORMÁTICA] Orquestador principal de la bandeja consolidada de aprobaciones de la Directiva (HU-04).
export default function AprobacionesPage() {
  const { user, token, isAdminView, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [categoriaActiva, setCategoriaActiva] = useState<FiltroCategoria>('todas');
  const [solicitudes, setSolicitudes] = useState<SolicitudReembolso[]>([]);
  const [afiliaciones, setAfiliaciones] = useState<SolicitudAfiliacionItem[]>([]);
  const [cargas, setCargas] = useState<SolicitudCargaItem[]>([]);
  const [beneficios, setBeneficios] = useState<SolicitudBeneficioItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('en_revision');
  const [filtroDias, setFiltroDias] = useState<'todos' | TramoDias>('todos');
  const [busqueda, setBusqueda] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modales
  const [showDetalle, setShowDetalle] = useState<SolicitudReembolso | null>(null);
  const [previewComprobante, setPreviewComprobante] = useState<{
    id: number;
    url: string;
    filename: string;
    codigo: string;
    isPdf: boolean;
    isImage: boolean;
  } | null>(null);
  const [solicitudAprobar, setSolicitudAprobar] = useState<SolicitudReembolso | null>(null);
  const [solicitudRechazar, setSolicitudRechazar] = useState<SolicitudReembolso | null>(null);
  const [solicitudPagar, setSolicitudPagar] = useState<SolicitudReembolso | null>(null);
  const [metodoPago, setMetodoPago] = useState<string>('Cheque');
  const [numeroDocumentoPago, setNumeroDocumentoPago] = useState<string>('');
  const [bancoEmisorPago, setBancoEmisorPago] = useState<string>('BancoEstado');
  const [fechaPago, setFechaPago] = useState<string>(new Date().toISOString().split('T')[0]);
  const [horaProceso, setHoraProceso] = useState<string>(
    new Date().toTimeString().slice(0, 5)
  );
  const [motivoRechazo, setMotivoRechazo] = useState<string>('');
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  const cargarSolicitudes = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [rmbRes, afRes, cfRes, benRes] = await Promise.allSettled([
        fetchFromApi<SolicitudReembolso[]>('/reembolsos/admin/solicitudes', { headers }),
        fetchFromApi<SolicitudAfiliacionItem[]>('/afiliacion/solicitudes', { headers }),
        fetchFromApi<SolicitudCargaItem[]>('/afiliacion/solicitudes-cargas', { headers }),
        fetchFromApi<SolicitudBeneficioItem[]>('/beneficios/solicitudes', { headers }),
      ]);
      if (rmbRes.status === 'fulfilled') setSolicitudes(rmbRes.value || []);
      if (afRes.status === 'fulfilled') setAfiliaciones(afRes.value || []);
      if (cfRes.status === 'fulfilled') setCargas(cfRes.value || []);
      if (benRes.status === 'fulfilled') setBeneficios(benRes.value || []);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && user && !isAdminView) {
      router.replace('/');
      return;
    }
    if (isAdminView) {
      cargarSolicitudes();
    }
  }, [authLoading, user, isAdminView, router, cargarSolicitudes]);

  const handleConfirmarAprobar = async () => {
    if (!solicitudAprobar || !token) return;
    setProcesandoAccion(true);
    try {
      await fetchFromApi(`/reembolsos/admin/solicitud/${solicitudAprobar.id}/resolver`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'APROBAR', motivo_rechazo: '' }),
      });
      setSuccessMsg(`¡Solicitud ${solicitudAprobar.codigo} APROBADA exitosamente!`);
      setTimeout(() => setSuccessMsg(null), 5000);
      const codigoAprobado = solicitudAprobar.codigo;
      setSolicitudAprobar(null);
      await cargarSolicitudes();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('solicitudes-updated'));
        try {
          if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('bienestar_alertas_channel');
            bc.postMessage({
              type: 'SOLICITUD_APROBADA',
              modulo: 'reembolsos',
              folio: codigoAprobado,
              accion: 'APROBAR',
            });
            bc.close();
          }
        } catch { }
      }
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setProcesandoAccion(false);
    }
  };

  const handleConfirmarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solicitudPagar || !token || !numeroDocumentoPago.trim()) return;
    setProcesandoAccion(true);
    setErrorMsg(null);
    try {
      await fetchFromApi(`/reembolsos/admin/solicitud/${solicitudPagar.id}/pagar`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metodo_pago: metodoPago,
          numero_cheque_o_transferencia: numeroDocumentoPago.trim(),
          banco_emisor: bancoEmisorPago.trim() || 'BancoEstado',
          fecha_pago: fechaPago,
          hora_proceso: horaProceso,
        }),
      });
      setSuccessMsg(
        `¡Pago registrado para ${solicitudPagar.codigo} (${metodoPago} N° ${numeroDocumentoPago.trim()})! Estado actualizado a PAGADO.`
      );
      setTimeout(() => setSuccessMsg(null), 6000);
      setSolicitudPagar(null);
      setNumeroDocumentoPago('');
      await cargarSolicitudes();
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setProcesandoAccion(false);
    }
  };

  const handleConfirmarRechazar = async () => {
    if (!solicitudRechazar || !token || !motivoRechazo.trim()) return;
    setProcesandoAccion(true);
    try {
      await fetchFromApi(`/reembolsos/admin/solicitud/${solicitudRechazar.id}/resolver`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'RECHAZAR', motivo_rechazo: motivoRechazo.trim() }),
      });
      setSuccessMsg(`Solicitud ${solicitudRechazar.codigo} RECHAZADA. Cupo restituido al socio.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      const codigoRechazado = solicitudRechazar.codigo;
      setSolicitudRechazar(null);
      setMotivoRechazo('');
      await cargarSolicitudes();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('solicitudes-updated'));
        try {
          if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('bienestar_alertas_channel');
            bc.postMessage({
              type: 'SOLICITUD_APROBADA',
              modulo: 'reembolsos',
              folio: codigoRechazado,
              accion: 'RECHAZAR',
            });
            bc.close();
          }
        } catch { }
      }
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setProcesandoAccion(false);
    }
  };

  const solicitudesFiltradas = solicitudes.filter((sol) => {
    if (filtroEstado !== 'todos' && sol.estado !== filtroEstado) return false;
    if (filtroDias !== 'todos' && obtenerIndicadorDias(sol.created_at, sol.fecha_boleta, sol.estado).tramo !== filtroDias) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      return (
        sol.codigo?.toLowerCase().includes(q) ||
        sol.socio_nombre?.toLowerCase().includes(q) ||
        sol.socio_rut?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const conteoPendientes = solicitudes.filter((s) => s.estado === 'en_revision').length;
  const pendAfiliacion = afiliaciones.filter((a) => (a.estado || '').toLowerCase().includes('pend')).length;
  const pendCargas = cargas.filter((c) => (c.estado || '').toLowerCase().includes('pend')).length;
  const pendBeneficios = beneficios.filter((b) => (b.estado || '').toLowerCase().includes('pend')).length;
  const totalPendientesGlobal = conteoPendientes + pendAfiliacion + pendCargas + pendBeneficios;

  return (
    <div className="space-y-6 animate-fade-in min-w-0">
      <div className="hero-institutional">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
        <div className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-amber-200 border border-white/15 mb-1.5">
              Bandeja Colegiada Única • Todas las Aprobaciones
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Centro Consolidado de Aprobaciones de la Directiva
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Reembolsos médicos, creación de cuentas, cargas familiares y beneficios sociales con notificación automática por correo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {user?.rol !== 'auditor' && (
              <Link
                href="/reembolsos"
                className="px-3.5 py-2 text-xs font-bold text-emerald-100 bg-emerald-600/30 hover:bg-emerald-600/45 rounded-xl border border-emerald-400/35 shrink-0 transition-colors"
                title="Ingresar una solicitud de reembolso asistida para un trabajador en oficina"
              >
                + Reembolso Asistido
              </Link>
            )}
            <Link
              href="/"
              className="px-4 py-2 text-xs font-bold text-slate-100 bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 shrink-0 transition-colors"
            >
              ← Resumen General
            </Link>
          </div>
        </div>
      </div>

      {successMsg && <div className="p-4 text-xs bg-emerald-50 text-[#166534] border border-emerald-200 rounded-2xl font-bold shadow-2xs">{successMsg}</div>}
      {errorMsg && <div className="p-4 text-xs bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl font-bold shadow-2xs">{errorMsg}</div>}

      {/* Selector de Tipo de Aprobación con contadores en vivo */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap gap-1.5">
        {(
          [
            { id: 'todas', label: 'Todas las Aprobaciones', count: totalPendientesGlobal },
            { id: 'reembolso', label: 'Reembolsos Médicos', count: conteoPendientes },
            { id: 'afiliacion', label: 'Creación de Cuentas', count: pendAfiliacion },
            { id: 'carga', label: 'Cargas Familiares', count: pendCargas },
            { id: 'beneficio', label: 'Beneficios Sociales', count: pendBeneficios },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategoriaActiva(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-2 ${categoriaActiva === tab.id
                ? 'bg-gradient-to-r from-[#0c2b45] to-[#006799] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${categoriaActiva === tab.id
                  ? 'bg-white/20 text-white'
                  : tab.count > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

          {categoriaActiva === 'reembolso' ? (
            <>
              <AprobacionesStatsCards solicitudes={solicitudes} />

              <div className="card-modern overflow-hidden min-w-0">
                <FiltrosAprobaciones
                  filtroEstado={filtroEstado}
                  setFiltroEstado={setFiltroEstado}
                  filtroDias={filtroDias}
                  setFiltroDias={setFiltroDias}
                  busqueda={busqueda}
                  setBusqueda={setBusqueda}
                  conteoPendientes={conteoPendientes}
                />
                <TablaAprobaciones
                  solicitudes={solicitudesFiltradas}
                  cargando={cargando}
                  onVerComprobante={(sol) =>
                    setPreviewComprobante({
                      id: sol.id,
                      url: `${API_BASE_URL}/reembolsos/solicitud/${sol.id}/comprobante${token ? `?token=${encodeURIComponent(token)}` : ''}`,
                      filename: sol.comprobante_filename,
                      codigo: sol.codigo,
                      isPdf: sol.comprobante_filename.toLowerCase().endsWith('.pdf'),
                      isImage: !sol.comprobante_filename.toLowerCase().endsWith('.pdf'),
                    })
                  }
                  onVerDetalle={(sol) => setShowDetalle(sol)}
                  onIniciarAprobar={(sol) => setSolicitudAprobar(sol)}
                  onIniciarRechazar={(sol) => {
                    setSolicitudRechazar(sol);
                    setMotivoRechazo('');
                  }}
                />
              </div>
            </>
          ) : (
            <BandejaUnificadaAprobaciones
              token={token}
              userRol={user?.rol}
              isSuperuser={user?.isSuperuser}
              categoriaActiva={categoriaActiva}
              reembolsos={solicitudes}
              afiliaciones={afiliaciones}
              cargas={cargas}
              beneficios={beneficios}
              cargando={cargando}
                onRefreshTodo = { cargarSolicitudes }
                onNotificarOk = {(msg) => {
          setErrorMsg(null);
        setSuccessMsg(msg);
            setTimeout(() => setSuccessMsg(null), 6000);
          }}
        onNotificarError={(msg) => setErrorMsg(msg)}
        onAprobarReembolso={(sol) => setSolicitudAprobar(sol)}
        onRechazarReembolso={(sol) => {
          setSolicitudRechazar(sol);
          setMotivoRechazo('');
        }}
        onPagarReembolso={(sol) => {
          setSolicitudPagar(sol);
          setMetodoPago('Cheque');
          setNumeroDocumentoPago('');
          setBancoEmisorPago('BancoEstado');
          setFechaPago(new Date().toISOString().split('T')[0]);
          setHoraProceso(new Date().toTimeString().slice(0, 5));
        }}
        onVerDetalleReembolso={(sol) => setShowDetalle(sol)}
        />
      )}

      <ModalResolucionReembolso
        solicitudAprobar={solicitudAprobar}
        setSolicitudAprobar={setSolicitudAprobar}
        onConfirmarAprobar={handleConfirmarAprobar}
        solicitudRechazar={solicitudRechazar}
        setSolicitudRechazar={setSolicitudRechazar}
        motivoRechazo={motivoRechazo}
        setMotivoRechazo={setMotivoRechazo}
        onConfirmarRechazar={handleConfirmarRechazar}
        procesando={procesandoAccion}
      />

      {showDetalle && (
        <DetalleSolicitudModal
          solicitud={showDetalle}
          onClose={() => setShowDetalle(null)}
          onVerComprobante={(sol) => {
            setShowDetalle(null);
            setPreviewComprobante({
              id: sol.id,
              url: `${API_BASE_URL}/reembolsos/solicitud/${sol.id}/comprobante${token ? `?token=${encodeURIComponent(token)}` : ''}`,
              filename: sol.comprobante_filename,
              codigo: sol.codigo,
              isPdf: sol.comprobante_filename.toLowerCase().endsWith('.pdf'),
              isImage: !sol.comprobante_filename.toLowerCase().endsWith('.pdf'),
            });
          }}
          onIniciarAprobar={(sol) => setSolicitudAprobar(sol)}
          onIniciarRechazar={(sol) => {
            setSolicitudRechazar(sol);
            setMotivoRechazo('');
          }}
          onIniciarPagar={(sol) => {
            setSolicitudPagar(sol);
            setMetodoPago('Cheque');
            setNumeroDocumentoPago('');
            setBancoEmisorPago('BancoEstado');
            setFechaPago(new Date().toISOString().split('T')[0]);
            setHoraProceso(new Date().toTimeString().slice(0, 5));
          }}
        />
      )}

      {solicitudPagar && (
        <div
          className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setSolicitudPagar(null)}
        >
          <form
            onSubmit={handleConfirmarPago}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-scale-in"
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
            <div className="p-6 space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#006799]">
                  Tesorería • HU-04 • Liquidación de Pago
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Registrar Pago de Reembolso {solicitudPagar.codigo}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Socio: <strong>{solicitudPagar.socio_nombre}</strong> ({solicitudPagar.socio_rut})
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Método de Pago *</label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Cheque">Cheque</option>
                    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Banco Emisor *</label>
                  <input
                    type="text"
                    required
                    value={bancoEmisorPago}
                    onChange={(e) => setBancoEmisorPago(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-bold text-slate-700 mb-1">
                  N° Cheque o Comprobante de Transferencia *
                </label>
                <input
                  type="text"
                  required
                  value={numeroDocumentoPago}
                  onChange={(e) => setNumeroDocumentoPago(e.target.value)}
                  placeholder="Ej: CHQ-884512 o TRF-2026-0091"
                  className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha de Pago *</label>
                  <input
                    type="date"
                    required
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora de Proceso *</label>
                  <input
                    type="time"
                    required
                    value={horaProceso}
                    onChange={(e) => setHoraProceso(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={procesandoAccion}
                  onClick={() => setSolicitudPagar(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesandoAccion || !numeroDocumentoPago.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#166534] hover:bg-emerald-800 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {procesandoAccion ? 'Registrando...' : '✓ Confirmar Pago (Pagado)'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
      {previewComprobante && (
        <VisorComprobanteModal
          previewComprobante={previewComprobante}
          previewError={null}
          subiendoArchivoDirecto={false}
          onClose={() => setPreviewComprobante(null)}
          onSubirArchivo={() => { }}
          onErrorLoading={() => { }}
        />
      )}
    </div>
  );
}
