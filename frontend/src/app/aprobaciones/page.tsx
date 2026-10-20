'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi, API_BASE_URL, subirArchivoApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { SolicitudReembolso } from '@/types';
import { getEstadoBadge } from '@/components/reembolsos/TablaSolicitudes';
import { DetalleSolicitudModal } from '@/components/reembolsos/DetalleSolicitudModal';
import { VisorComprobanteModal } from '@/components/reembolsos/VisorComprobanteModal';

export default function AprobacionesPage() {
  const { user, token } = useAuth();

  const [solicitudes, setSolicitudes] = useState<SolicitudReembolso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('en_revision');
  const [busqueda, setBusqueda] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modales de detalle y visor
  const [showDetalle, setShowDetalle] = useState<SolicitudReembolso | null>(null);
  const [previewComprobante, setPreviewComprobante] = useState<{
    id: number;
    url: string;
    filename: string;
    codigo: string;
    isPdf: boolean;
    isImage: boolean;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [subiendoArchivoDirecto, setSubiendoArchivoDirecto] = useState<boolean>(false);

  // Estados para resolución (Aprobar / Rechazar)
  const [solicitudAprobar, setSolicitudAprobar] = useState<SolicitudReembolso | null>(null);
  const [solicitudRechazar, setSolicitudRechazar] = useState<SolicitudReembolso | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState<string>('');
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  const esAdminOSuper =
    user?.rol === 'admin' || user?.rol === 'superusuario' || Boolean(user?.isSuperuser);

  // Cargar todas las solicitudes para el panel de administración
  const cargarSolicitudes = useCallback(async () => {
    if (!token || !esAdminOSuper) return;
    setCargando(true);
    try {
      const data = await fetchFromApi<SolicitudReembolso[]>('/reembolsos/admin/solicitudes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSolicitudes(data || []);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las solicitudes para aprobación.'
      );
    } finally {
      setCargando(false);
    }
  }, [token, esAdminOSuper]);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  // Manejo de visualización de comprobante
  const handleVerComprobante = (sol: SolicitudReembolso) => {
    if (!sol.comprobante_filename) return;
    const ext = sol.comprobante_filename.split('.').pop()?.toLowerCase() || '';
    const isPdf = ext === 'pdf';
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    const url = `${API_BASE_URL}/reembolsos/solicitud/${sol.id}/comprobante${
      token ? `?token=${encodeURIComponent(token)}` : ''
    }`;

    setPreviewError(null);
    setPreviewComprobante({
      id: sol.id,
      url,
      filename: sol.comprobante_filename,
      codigo: sol.codigo,
      isPdf,
      isImage,
    });
  };

  const handleAdjuntarComprobanteExistente = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !previewComprobante) return;

    setSubiendoArchivoDirecto(true);
    setPreviewError(null);
    try {
      const formArchivo = new FormData();
      formArchivo.append('archivo', file);
      await subirArchivoApi<SolicitudReembolso>(
        `/reembolsos/solicitud/${previewComprobante.id}/comprobante`,
        formArchivo
      );
      await cargarSolicitudes();

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isPdf = ext === 'pdf';
      const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
      const url = `${API_BASE_URL}/reembolsos/solicitud/${previewComprobante.id}/comprobante${
        token ? `?token=${encodeURIComponent(token)}&t=${Date.now()}` : `?t=${Date.now()}`
      }`;

      setPreviewComprobante({
        id: previewComprobante.id,
        url,
        filename: file.name,
        codigo: previewComprobante.codigo,
        isPdf,
        isImage,
      });
      setSuccessMsg(`¡Comprobante actualizado en solicitud ${previewComprobante.codigo}!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'No se pudo subir el archivo.');
    } finally {
      setSubiendoArchivoDirecto(false);
    }
  };

  // Resolver: Aprobar Solicitud
  const handleConfirmarAprobar = async () => {
    if (!solicitudAprobar || !token) return;
    setProcesandoAccion(true);
    setErrorMsg(null);
    try {
      await fetchFromApi(`/reembolsos/admin/solicitud/${solicitudAprobar.id}/resolver`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accion: 'APROBAR',
          motivo_rechazo: '',
        }),
      });

      setSuccessMsg(
        `¡Solicitud ${solicitudAprobar.codigo} APROBADA exitosamente por ${formatCurrency(
          solicitudAprobar.monto_copago
        )}!`
      );
      setTimeout(() => setSuccessMsg(null), 5000);
      setSolicitudAprobar(null);
      await cargarSolicitudes();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error al procesar la aprobación de la solicitud.'
      );
    } finally {
      setProcesandoAccion(false);
    }
  };

  // Resolver: Rechazar Solicitud
  const handleConfirmarRechazar = async () => {
    if (!solicitudRechazar || !token) return;
    if (!motivoRechazo.trim()) {
      setErrorMsg('Debe indicar un motivo o justificación para rechazar la solicitud.');
      return;
    }
    setProcesandoAccion(true);
    setErrorMsg(null);
    try {
      await fetchFromApi(`/reembolsos/admin/solicitud/${solicitudRechazar.id}/resolver`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accion: 'RECHAZAR',
          motivo_rechazo: motivoRechazo.trim(),
        }),
      });

      setSuccessMsg(
        `Solicitud ${solicitudRechazar.codigo} RECHAZADA. Se liberó el saldo al socio.`
      );
      setTimeout(() => setSuccessMsg(null), 5000);
      setSolicitudRechazar(null);
      setMotivoRechazo('');
      await cargarSolicitudes();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error al procesar el rechazo de la solicitud.'
      );
    } finally {
      setProcesandoAccion(false);
    }
  };

  // Cálculos estadísticos
  const pendientes = solicitudes.filter((s) => s.estado === 'en_revision');
  const aprobadas = solicitudes.filter((s) => s.estado === 'aprobado' || s.estado === 'pagado');
  const rechazadas = solicitudes.filter((s) => s.estado === 'rechazado');

  const montoPendiente = pendientes.reduce((acc, s) => acc + (s.monto_copago || 0), 0);
  const montoAprobado = aprobadas.reduce((acc, s) => acc + (s.monto_reembolso || 0), 0);

  // Filtrado de solicitudes para la tabla
  const solicitudesFiltradas = solicitudes.filter((sol) => {
    // Filtro por tab de estado
    if (filtroEstado !== 'todos' && sol.estado !== filtroEstado) {
      return false;
    }
    // Filtro por búsqueda
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      const matchCodigo = sol.codigo?.toLowerCase().includes(q);
      const matchSocio = sol.socio_nombre?.toLowerCase().includes(q);
      const matchRut = sol.socio_rut?.toLowerCase().includes(q);
      const matchBeneficiario = sol.beneficiario_nombre?.toLowerCase().includes(q);
      const matchTipo = sol.tipo_prestacion_label?.toLowerCase().includes(q);
      return matchCodigo || matchSocio || matchRut || matchBeneficiario || matchTipo;
    }
    return true;
  });

  // Si no tiene permisos, mostrar aviso de acceso restringido
  if (!esAdminOSuper) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Acceso Restringido</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md">
          Este módulo está reservado exclusivamente para los roles de <strong>Administrador</strong> y <strong>Superusuario</strong>.
        </p>
        <Link
          href="/"
          className="mt-5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm"
        >
          Volver al Inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado Superior */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">Bandeja de Aprobaciones</h1>
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Admin & Superusuario
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Módulo de auditoría y aprobación de solicitudes de reembolsos de salud en primera instancia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargarSolicitudes}
            disabled={cargando}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition flex items-center gap-1.5 shadow-2xs"
            title="Recargar solicitudes"
          >
            <svg
              className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
          <Link
            href="/reembolsos"
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition shadow-sm"
          >
            Ver Portal de Reembolsos
          </Link>
        </div>
      </div>

      {/* Notificaciones */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold">{successMsg}</p>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-500 text-white flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm font-semibold">{errorMsg}</p>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-600 hover:text-rose-800 font-bold text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tarjetas KPI de Estado de Aprobaciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pendientes */}
        <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Pendientes de Aprobación
            </span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">
              {pendientes.length}
            </span>
            <span className="text-xs text-amber-800 font-medium">
              Por liquidar: <strong>{formatCurrency(montoPendiente)}</strong>
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Aprobadas */}
        <div className="p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="block text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Aprobadas / Pagadas
            </span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">
              {aprobadas.length}
            </span>
            <span className="text-xs text-emerald-800 font-medium">
              Total: <strong>{formatCurrency(montoAprobado)}</strong>
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Rechazadas */}
        <div className="p-4 rounded-2xl bg-white border border-rose-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="block text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              Rechazadas
            </span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">
              {rechazadas.length}
            </span>
            <span className="text-xs text-slate-500">Con motivo registrado</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Total General */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Histórico
            </span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">
              {solicitudes.length}
            </span>
            <span className="text-xs text-slate-500">Solicitudes procesadas</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
      </div>

      {/* Contenedor Principal: Filtros y Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Barra de Filtros y Búsqueda */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs de Estado */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setFiltroEstado('en_revision')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                filtroEstado === 'en_revision'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Pendientes</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  filtroEstado === 'en_revision'
                    ? 'bg-white text-amber-700 font-bold'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {pendientes.length}
              </span>
            </button>

            <button
              onClick={() => setFiltroEstado('aprobado')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filtroEstado === 'aprobado'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Aprobadas ({aprobadas.length})
            </button>

            <button
              onClick={() => setFiltroEstado('rechazado')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filtroEstado === 'rechazado'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Rechazadas ({rechazadas.length})
            </button>

            <button
              onClick={() => setFiltroEstado('todos')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filtroEstado === 'todos'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todas ({solicitudes.length})
            </button>
          </div>

          {/* Campo de Búsqueda */}
          <div className="relative min-w-[240px] sm:min-w-[280px]">
            <input
              type="text"
              placeholder="Buscar por código, socio, RUT o beneficiario..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Tabla de Solicitudes */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Código / Fecha</th>
                <th className="py-3 px-4">Socio Solicitante</th>
                <th className="py-3 px-4">Prestación / Beneficiario</th>
                <th className="py-3 px-4 text-right">Monto Boleta</th>
                <th className="py-3 px-4 text-right">Copago Solicitado</th>
                <th className="py-3 px-4 text-center">Comprobante</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones de Resolución</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p>Cargando bandeja de aprobaciones...</p>
                  </td>
                </tr>
              ) : solicitudesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <svg className="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="font-semibold text-slate-600">No hay solicitudes en esta sección.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {filtroEstado === 'en_revision'
                        ? '¡Excelente! No hay solicitudes pendientes de aprobación en este momento.'
                        : 'No se encontraron registros para los filtros seleccionados.'}
                    </p>
                  </td>
                </tr>
              ) : (
                solicitudesFiltradas.map((sol) => {
                  const badge = getEstadoBadge(sol.estado);
                  const esPendiente = sol.estado === 'en_revision';

                  return (
                    <tr
                      key={sol.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Código y Fechas */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-800 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                          {sol.codigo}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Ingreso: {formatDate(sol.created_at)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Atención: {formatDate(sol.fecha_atencion)}
                        </div>
                      </td>

                      {/* Socio Solicitante */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">
                          {sol.socio_nombre || 'Socio Solicitante'}
                        </div>
                        {sol.socio_rut && (
                          <div className="text-[11px] text-slate-500 font-mono">
                            {sol.socio_rut}
                          </div>
                        )}
                        {sol.socio_departamento && (
                          <div className="text-[10px] text-slate-400">
                            {sol.socio_departamento}
                          </div>
                        )}
                      </td>

                      {/* Prestación y Beneficiario */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-700">
                          {sol.tipo_prestacion_label}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Beneficiario: <strong>{sol.beneficiario_nombre}</strong> ({sol.beneficiario_parentesco})
                        </div>
                        {sol.descripcion && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={sol.descripcion}>
                            {sol.descripcion}
                          </div>
                        )}
                      </td>

                      {/* Monto Boleta */}
                      <td className="py-3 px-4 text-right font-medium text-slate-600 whitespace-nowrap">
                        {formatCurrency(sol.monto_boleta)}
                      </td>

                      {/* Copago Solicitado */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="font-bold text-emerald-700 text-sm">
                          {formatCurrency(sol.monto_copago)}
                        </span>
                      </td>

                      {/* Comprobante */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {sol.comprobante_filename ? (
                          <button
                            type="button"
                            onClick={() => handleVerComprobante(sol)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
                            title="Ver archivo comprobante"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Ver
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Sin archivo</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {sol.estado.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Acciones de Resolución */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {esPendiente ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setSolicitudAprobar(sol)}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition flex items-center gap-1 active:scale-95"
                                title="Aprobar esta solicitud"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Aprobar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSolicitudRechazar(sol);
                                  setMotivoRechazo('');
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition flex items-center gap-1 active:scale-95"
                                title="Rechazar esta solicitud"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Rechazar
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowDetalle(sol)}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition border border-slate-200"
                            >
                              Detalle
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmación de Aprobación */}
      {solicitudAprobar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">
              ¿Aprobar Solicitud de Reembolso?
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Está a punto de aprobar la solicitud <strong>{solicitudAprobar.codigo}</strong> correspondiente a{' '}
              <strong>{solicitudAprobar.socio_nombre || 'Socio'}</strong>.
            </p>

            <div className="my-4 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Tipo de Prestación:</span>
                <span className="font-semibold text-slate-700">{solicitudAprobar.tipo_prestacion_label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Monto Boleta:</span>
                <span className="font-semibold text-slate-700">{formatCurrency(solicitudAprobar.monto_boleta)}</span>
              </div>
              <div className="flex justify-between border-t border-emerald-200/60 pt-1 mt-1">
                <span className="text-emerald-800 font-bold">Monto a Liquidar:</span>
                <span className="text-emerald-800 font-extrabold text-sm">{formatCurrency(solicitudAprobar.monto_copago)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setSolicitudAprobar(null)}
                disabled={procesandoAccion}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAprobar}
                disabled={procesandoAccion}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {procesandoAccion ? 'Aprobando...' : 'Confirmar Aprobación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rechazo de Solicitud */}
      {solicitudRechazar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Rechazar Solicitud {solicitudRechazar.codigo}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Al rechazar esta solicitud, el monto comprometido de{' '}
              <strong>{formatCurrency(solicitudRechazar.monto_copago)}</strong> será reintegrado al saldo disponible del socio.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo del Rechazo <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Indique detalladamente el motivo del rechazo (ej: Comprobante ilegible, prestación no contemplada en estatuto, etc.)..."
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition resize-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setSolicitudRechazar(null);
                  setMotivoRechazo('');
                }}
                disabled={procesandoAccion}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarRechazar}
                disabled={procesandoAccion || !motivoRechazo.trim()}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {procesandoAccion ? 'Rechazando...' : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle Modular */}
      <DetalleSolicitudModal
        solicitud={showDetalle}
        onClose={() => setShowDetalle(null)}
        onVerComprobante={handleVerComprobante}
      />

      {/* Modal Visor de Comprobante Modular */}
      <VisorComprobanteModal
        previewComprobante={previewComprobante}
        previewError={previewError}
        subiendoArchivoDirecto={subiendoArchivoDirecto}
        onClose={() => setPreviewComprobante(null)}
        onSubirArchivo={handleAdjuntarComprobanteExistente}
        onErrorLoading={() => setPreviewError('No se pudo visualizar el archivo en línea.')}
      />
    </div>
  );
}
