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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Bandeja de Aprobaciones — Reembolsos Médicos</h1>
          <p className="text-xs text-slate-500">Auditoría, revisión colegiada de comprobantes y resolución directiva.</p>
        </div>
        <Link href="/reembolsos" className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">
          ← Portal Reembolsos
        </Link>
      </div>

      {successMsg && <div className="p-3 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-bold">{successMsg}</div>}
      {errorMsg && <div className="p-3 text-xs bg-rose-50 text-rose-800 border border-rose-200 rounded-lg font-bold">{errorMsg}</div>}

      <AprobacionesStatsCards solicitudes={solicitudes} />

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
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
