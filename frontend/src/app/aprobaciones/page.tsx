'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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

// [ESTUDIANTE INFORMÁTICA] Orquestador principal de la bandeja de aprobaciones de la Directiva (HU-04); Clean Architecture en frontend.
export default function AprobacionesPage() {
  const { user, token } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudReembolso[]>([]);
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
  const [motivoRechazo, setMotivoRechazo] = useState<string>('');
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  const cargarSolicitudes = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    try {
      const data = await fetchFromApi<SolicitudReembolso[]>('/reembolsos/admin/solicitudes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSolicitudes(data || []);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

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
      setSolicitudAprobar(null);
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
      setSolicitudRechazar(null);
      setMotivoRechazo('');
      await cargarSolicitudes();
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setProcesandoAccion(false);
    }
  };

  const solicitudesFiltradas = solicitudes.filter((sol) => {
    if (filtroEstado !== 'todos' && sol.estado !== filtroEstado) return false;
    if (filtroDias !== 'todos' && obtenerIndicadorDias(sol.created_at, sol.fecha_boleta).tramo !== filtroDias) return false;
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

  return (
    <div className="space-y-6 animate-fade-in min-w-0">
      <div className="hero-institutional">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
        <div className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-amber-200 border border-white/15 mb-1.5">
              Módulo 2 • HU-04 • Bandeja Colegiada de Directiva
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Auditoría y Resolución de Reembolsos Médicos
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Control de plazo de 30 días, visor de respaldos adjuntos y restitución automática de cupo ante rechazos.
            </p>
          </div>
          <Link
            href="/reembolsos"
            className="px-4 py-2 text-xs font-bold text-slate-100 bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 shrink-0 transition-colors"
          >
            ← Cartola Socio
          </Link>
        </div>
      </div>

      {successMsg && <div className="p-4 text-xs bg-emerald-50 text-[#166534] border border-emerald-200 rounded-2xl font-bold shadow-2xs">{successMsg}</div>}
      {errorMsg && <div className="p-4 text-xs bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl font-bold shadow-2xs">{errorMsg}</div>}

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
              url: `${API_BASE_URL}/reembolsos/solicitud/${sol.id}/comprobante`,
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
              url: `${API_BASE_URL}/reembolsos/solicitud/${sol.id}/comprobante`,
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
        />
      )}
      {previewComprobante && (
        <VisorComprobanteModal
          previewComprobante={previewComprobante}
          previewError={null}
          subiendoArchivoDirecto={false}
          onClose={() => setPreviewComprobante(null)}
          onSubirArchivo={() => {}}
          onErrorLoading={() => {}}
        />
      )}
    </div>
  );
}
