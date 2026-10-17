'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi, API_BASE_URL, subirArchivoApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  TipoPrestacion,
  TIPO_PRESTACION_LABELS,
  TIPOS_PRESTACION_SOLICITABLES,
  SolicitudReembolso,
  ResumenSaludSocio,
  EstadoReembolso,
  ReembolsoHistorialResponse,
  ValidacionFechaResponse,
} from '@/types';

/* ────────────────────────────────────────────
   Estado inicial mientras se carga desde el backend
   ──────────────────────────────────────────── */

const EMPTY_RESUMEN: ResumenSaludSocio = {
  socio_id: 0,
  socio_nombre: '',
  rut: '',
  tipo_socio: '',
  estado_previsional: '',
  fecha_afiliacion: '',
  meses_antiguedad: 0,
  puede_solicitar: true,
  fecha_habilitacion: null,
  mensaje_carencia: null,
  saldo_salud_disponible: 0,
  saldo_salud_total_anual: 0,
  porcentaje_utilizado: 0,
  total_reembolsado_periodo: 0,
  solicitudes_en_revision: 0,
  solicitudes_aprobadas: 0,
};

// Debe coincidir con TIPOS_DOCUMENTO del backend

const TIPOS_DOCUMENTO: Record<string, string> = {
  receta_medica: 'Receta médica',
  boleta_detallada: 'Boleta detallada',
  bono_copago: 'Bono con copago',
  comprobante_isapre_fonasa: 'Comprobante Isapre/Fonasa',
  timbre_no_reembolsable: "Timbre 'no reembolsable'",
};

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

function getEstadoBadge(estado: EstadoReembolso) {
  const map: Record<EstadoReembolso, { bg: string; dot: string }> = {
    borrador: { bg: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
    en_revision: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    aprobado: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    rechazado: { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
    pagado: { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  };
  return map[estado] || map.borrador;
}

function getTipoPrestacionIcon(tipo: TipoPrestacion) {
  const icons: Record<TipoPrestacion, string> = {
    farmacia: '💊',
    consulta: '🩺',
    dental: '🦷',
    examenes: '🔬',
    optica: '👓',
    hospitalizacion: '🏥',
  };
  return icons[tipo] || '📋';
}

/* ────────────────────────────────────────────
   Componente Principal
   ──────────────────────────────────────────── */

export default function ReembolsosPage() {
  const { user, token } = useAuth();

  // State
  const [resumen, setResumen] = useState<ResumenSaludSocio>(EMPTY_RESUMEN);
  const [solicitudes, setSolicitudes] = useState<SolicitudReembolso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetalle, setShowDetalle] = useState<SolicitudReembolso | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Visor de comprobante adjunto
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

  const handleVerComprobante = (sol: SolicitudReembolso) => {
    if (!sol.comprobante_filename) return;
    const ext = sol.comprobante_filename.split('.').pop()?.toLowerCase() || '';
    const isPdf = ext === 'pdf';
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);

    // URL completa al endpoint en FastAPI con token en query para iframe / imágenes
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
      await cargarReembolsos();

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
      setSuccessMsg(`¡Comprobante "${file.name}" cargado con éxito en la solicitud ${previewComprobante.codigo}!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'No se pudo subir el archivo.');
    } finally {
      setSubiendoArchivoDirecto(false);
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    tipo_prestacion: '' as TipoPrestacion | '',
    descripcion: '',
    beneficiario_nombre: user?.nombreCompleto || 'Carlos Valenzuela M.',
    beneficiario_parentesco: 'Titular',
    monto_boleta: '',
    monto_copago: '',
    fecha_atencion: '',
    fecha_boleta: '',
    tipo_documento: '',
    declaracion_aceptada: false,
  });

  // Validación de fecha en tiempo real
  const [fechaValidacion, setFechaValidacion] = useState<{
    dentro: boolean;
    mensaje: string;
    dias: number;
  } | null>(null);

  // Carga resumen (carencia, saldo) e historial desde el backend
  const cargarReembolsos = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchFromApi<ReembolsoHistorialResponse>('/reembolsos/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResumen(data.resumen);
      setSolicitudes(data.solicitudes);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo cargar el historial de reembolsos.');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargarReembolsos();
  }, [cargarReembolsos]);

  const puedeSolicitar = resumen.puede_solicitar;

  // Validar plazo de 30 días corridos (prestación médica o compra/boleta: rige la más antigua)
  useEffect(() => {
    const fechas = [
      { etiqueta: 'la atención', valor: formData.fecha_atencion },
      { etiqueta: 'la boleta/compra', valor: formData.fecha_boleta },
    ].filter((f) => f.valor);

    if (fechas.length === 0 || !token) {
      setFechaValidacion(null);
      return;
    }

    let cancelado = false;
    Promise.all(
      fechas.map((f) =>
        fetchFromApi<ValidacionFechaResponse>('/reembolsos/validar-fecha', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ fecha_atencion: f.valor }),
        }).then((res) => ({ etiqueta: f.etiqueta, res }))
      )
    )
      .then((resultados) => {
        if (cancelado) return;
        // Rige la fecha más antigua (más días transcurridos)
        const peor = resultados.reduce((a, b) =>
          b.res.dias_transcurridos > a.res.dias_transcurridos ? b : a
        );
        setFechaValidacion({
          dentro: resultados.every((r) => r.res.dentro_de_plazo),
          mensaje: peor.res.dentro_de_plazo
            ? peor.res.mensaje
            : `${peor.res.mensaje} (fecha de ${peor.etiqueta})`,
          dias: peor.res.dias_transcurridos,
        });
      })
      .catch(() => {
        // Si falla la consulta, se omite la vista previa; el backend revalida al enviar.
        if (!cancelado) setFechaValidacion(null);
      });

    return () => {
      cancelado = true;
    };
  }, [formData.fecha_atencion, formData.fecha_boleta, token]);


  // Auto-llenar fecha_boleta con fecha_atencion
  useEffect(() => {
    if (formData.fecha_atencion && !formData.fecha_boleta) {
      setFormData((prev) => ({ ...prev, fecha_boleta: prev.fecha_atencion }));
    }
  }, [formData.fecha_atencion]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('El archivo no puede superar los 10MB.');
        setTimeout(() => setErrorMsg(null), 4000);
        return;
      }
      setUploadedFile(file);
    }
  };

  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validar carencia
    if (!puedeSolicitar) {
      setErrorMsg(resumen.mensaje_carencia || 'No cumple con la antigüedad mínima de 6 meses.');
      return;
    }

    // Validar plazo
    if (fechaValidacion && !fechaValidacion.dentro) {
      setErrorMsg(fechaValidacion.mensaje);
      return;
    }

    // Validar monto vs saldo
    const copago = parseFloat(formData.monto_copago) || 0;
    if (copago > resumen.saldo_salud_disponible) {
      setErrorMsg(
        `El monto de copago solicitado (${formatCurrency(copago)}) supera su saldo disponible (${formatCurrency(resumen.saldo_salud_disponible)}).`
      );
      return;
    }

    if (!uploadedFile) {
      setErrorMsg('Debe adjuntar el comprobante de atención o boleta digital.');
      return;
    }

    if (!formData.declaracion_aceptada) {
      setErrorMsg('Debe aceptar que la información y documentación ingresada es correcta y legal.');
      return;
    }

    setEnviando(true);
    try {
      const nueva = await fetchFromApi<SolicitudReembolso>('/reembolsos/solicitud', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tipo_prestacion: formData.tipo_prestacion,
          descripcion: formData.descripcion,
          beneficiario_nombre: formData.beneficiario_nombre,
          beneficiario_parentesco: formData.beneficiario_parentesco,
          monto_boleta: parseFloat(formData.monto_boleta) || 0,
          monto_copago: copago,
          fecha_atencion: formData.fecha_atencion,
          fecha_boleta: formData.fecha_boleta,
          tipo_documento: formData.tipo_documento,
          comprobante_filename: uploadedFile.name,
          declaracion_aceptada: formData.declaracion_aceptada,
        }),
      });

      // Subir archivo binario adjunto al backend
      if (uploadedFile) {
        const formArchivo = new FormData();
        formArchivo.append('archivo', uploadedFile);
        try {
          await subirArchivoApi(`/reembolsos/solicitud/${nueva.id}/comprobante`, formArchivo);
        } catch (uploadErr) {
          console.error('Error al subir archivo adjunto:', uploadErr);
        }
      }

      // Refrescar saldo, contadores e historial con los datos reales del backend
      await cargarReembolsos();

      setShowModal(false);
      setUploadedFile(null);
      setFormData({
        tipo_prestacion: '',
        descripcion: '',
        beneficiario_nombre: user?.nombreCompleto || '',
        beneficiario_parentesco: 'Titular',
        monto_boleta: '',
        monto_copago: '',
        fecha_atencion: '',
        fecha_boleta: '',
        tipo_documento: '',
        declaracion_aceptada: false,
      });
      setFechaValidacion(null);
      setSuccessMsg(`¡Solicitud ${nueva.codigo} ingresada con éxito! Su estado es "${nueva.estado_label}".`);
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo ingresar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  const solicitudesFiltradas =
    filtroEstado === 'todos'
      ? solicitudes
      : solicitudes.filter((s) => s.estado === filtroEstado);

  // Totales para cards
  const totalReembolsado = solicitudes
    .filter((s) => s.estado === 'aprobado' || s.estado === 'pagado')
    .reduce((acc, s) => acc + s.monto_reembolso, 0);

  const totalFarmacia = solicitudes
    .filter((s) => s.tipo_prestacion === 'farmacia' && (s.estado === 'aprobado' || s.estado === 'pagado'))
    .reduce((acc, s) => acc + s.monto_reembolso, 0);

  const totalDental = solicitudes
    .filter((s) => s.tipo_prestacion === 'dental' && (s.estado === 'aprobado' || s.estado === 'pagado'))
    .reduce((acc, s) => acc + s.monto_reembolso, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reembolsos Médicos y Dentales</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Módulo de solicitud, auditoría y liquidación de reembolsos de salud • HU-03
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition"
          >
            ← Dashboard
          </Link>
          <button
            onClick={() => setShowModal(true)}
            disabled={!puedeSolicitar}
            title={!puedeSolicitar ? 'Requiere al menos 6 meses de antigüedad' : undefined}
            id="btn-nueva-solicitud"
            className={`px-5 py-2 text-xs font-semibold rounded-xl transition-all ${
              puedeSolicitar
                ? 'text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 hover:shadow-lg active:scale-[0.98]'
                : 'text-slate-400 bg-slate-200 cursor-not-allowed'
            }`}
          >
            ✚ Nueva Solicitud
          </button>
        </div>
      </div>

      {/* Alerta de carencia (si aplica) */}
      {!puedeSolicitar && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-amber-100 text-amber-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold">Período de Carencia Activo</p>
              <p className="text-xs mt-0.5">{resumen.mensaje_carencia}</p>
              {resumen.fecha_habilitacion && (
                <p className="text-xs mt-1 font-semibold text-amber-900">
                  📅 Fecha de habilitación estimada: {formatDate(resumen.fecha_habilitacion)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mensajes de éxito/error */}
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
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 font-bold text-sm">✕</button>
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
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-800 font-bold text-sm">✕</button>
        </div>
      )}

      {/* ─── Tarjetas de Resumen ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card: Saldo Disponible */}
        <div className="relative overflow-hidden p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
          <div className="relative">
            <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Saldo Disponible</span>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{formatCurrency(resumen.saldo_salud_disponible)}</p>
            <div className="mt-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Utilizado</span>
                <span className="font-semibold">{resumen.porcentaje_utilizado}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(resumen.porcentaje_utilizado, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">de {formatCurrency(resumen.saldo_salud_total_anual)} anuales</p>
            </div>
          </div>
        </div>

        {/* Card: Gasto Ambulatorio */}
        <div className="relative overflow-hidden p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl" />
          <div className="relative">
            <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Gasto Ambulatorio</span>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{formatCurrency(totalReembolsado - totalFarmacia - totalDental)}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="flex w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">
                {solicitudes.filter((s) => s.tipo_prestacion === 'consulta' || s.tipo_prestacion === 'examenes').length} atenciones liquidadas
              </span>
            </div>
          </div>
        </div>

        {/* Card: Gasto Farmacia */}
        <div className="relative overflow-hidden p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl" />
          <div className="relative">
            <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Gasto Farmacia</span>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{formatCurrency(totalFarmacia)}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-slate-500">💊 Recetas permanentes</span>
            </div>
          </div>
        </div>

        {/* Card: Fondo Dental */}
        <div className="relative overflow-hidden p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl" />
          <div className="relative">
            <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Fondo Dental</span>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{formatCurrency(totalDental)}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-slate-500">🦷 {solicitudes.filter((s) => s.tipo_prestacion === 'dental').length} atención(es) dental(es)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Filtros + Tabla de Solicitudes ─── */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Header de la tabla */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-4 border-b border-slate-100 gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Historial de Solicitudes</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {solicitudes.length} solicitud(es) en el período vigente
            </p>
          </div>

          {/* Filtro por estado */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: 'todos', label: 'Todos' },
              { key: 'en_revision', label: 'En Revisión' },
              { key: 'aprobado', label: 'Aprobados' },
              { key: 'pagado', label: 'Pagados' },
              { key: 'rechazado', label: 'Rechazados' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFiltroEstado(f.key)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                  filtroEstado === f.key
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido de la tabla */}
        {solicitudesFiltradas.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-400">No hay solicitudes que mostrar con el filtro seleccionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/60">
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Código</th>
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Tipo</th>
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Beneficiario</th>
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Fecha Atención</th>
                  <th className="text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Monto Boleta</th>
                  <th className="text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Reembolso</th>
                  <th className="text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Estado</th>
                  <th className="text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Comprobante</th>
                  <th className="text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {solicitudesFiltradas.map((sol) => {
                  const badge = getEstadoBadge(sol.estado);
                  return (
                    <tr key={sol.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-bold text-emerald-700">{sol.codigo}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{getTipoPrestacionIcon(sol.tipo_prestacion)}</span>
                          <span className="text-xs text-slate-700 font-medium">{sol.tipo_prestacion_label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div>
                          <span className="text-xs text-slate-800 font-semibold">{sol.beneficiario_nombre}</span>
                          <span className="block text-[11px] text-slate-400">{sol.beneficiario_parentesco}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">{formatDate(sol.fecha_atencion)}</td>
                      <td className="px-5 py-3.5 text-right text-xs font-semibold text-slate-700">{formatCurrency(sol.monto_boleta)}</td>
                      <td className="px-5 py-3.5 text-right text-xs font-bold text-emerald-700">{formatCurrency(sol.monto_reembolso)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {sol.estado_label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {sol.comprobante_filename ? (
                          <button
                            type="button"
                            onClick={() => handleVerComprobante(sol)}
                            title={`Pincha para ver ${sol.comprobante_filename}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200/80 shadow-xs transition group cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="truncate max-w-[110px]">{sol.comprobante_filename}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => setShowDetalle(sol)}
                          className="px-3 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── Modal: Nueva Solicitud de Reembolso ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Nueva Solicitud de Reembolso</h3>
                  <p className="text-xs text-slate-500">Complete los antecedentes del gasto de salud</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">✕</button>
            </div>

            {/* Info de saldo */}
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-700">Saldo disponible: {formatCurrency(resumen.saldo_salud_disponible)}</span>
              </div>
              <span className="text-[11px] text-emerald-600">de {formatCurrency(resumen.saldo_salud_total_anual)} anuales</span>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Tipo de prestación */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tipo de Prestación Médica <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.tipo_prestacion}
                  onChange={(e) => setFormData((p) => ({ ...p, tipo_prestacion: e.target.value as TipoPrestacion }))}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                  required
                  id="select-tipo-prestacion"
                >
                  <option value="">Seleccione una opción...</option>
                  {(Object.entries(TIPO_PRESTACION_LABELS) as [TipoPrestacion, string][])
                    .filter(([key]) => TIPOS_PRESTACION_SOLICITABLES.includes(key))
                    .map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                </select>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Fecha de Atención <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_atencion}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData((p) => ({ ...p, fecha_atencion: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                    required
                    id="input-fecha-atencion"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Fecha de Boleta / DTE <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_boleta}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData((p) => ({ ...p, fecha_boleta: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                    required
                    id="input-fecha-boleta"
                  />
                </div>
              </div>

              {/* Validación de plazo en tiempo real */}
              {fechaValidacion && (
                <div className={`p-3 rounded-xl border text-xs ${
                  fechaValidacion.dentro
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      {fechaValidacion.dentro ? '✓' : '✗'} Plazo 30 días:
                    </span>
                    <span>{fechaValidacion.mensaje}</span>
                  </div>
                </div>
              )}

              {/* Montos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Monto Total Boleta ($ CLP) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 35000"
                    min="1"
                    value={formData.monto_boleta}
                    onChange={(e) => setFormData((p) => ({ ...p, monto_boleta: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                    required
                    id="input-monto-boleta"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Copago a Reembolsar ($ CLP) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 25000"
                    min="1"
                    value={formData.monto_copago}
                    onChange={(e) => setFormData((p) => ({ ...p, monto_copago: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                    required
                    id="input-monto-copago"
                  />
                  {formData.monto_copago && parseFloat(formData.monto_copago) > resumen.saldo_salud_disponible && (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                      ⚠ Supera el saldo disponible ({formatCurrency(resumen.saldo_salud_disponible)})
                    </p>
                  )}
                </div>
              </div>

              {/* Beneficiario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Beneficiario <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.beneficiario_parentesco}
                    onChange={(e) => {
                      const sel = e.target.value;
                      const nombres: Record<string, string> = {
                        Titular: user?.nombreCompleto || 'Carlos Valenzuela M.',
                        Hija: 'Valentina Valenzuela',
                        Hijo: 'Matías Valenzuela',
                      };
                      setFormData((p) => ({
                        ...p,
                        beneficiario_parentesco: sel,
                        beneficiario_nombre: nombres[sel] || p.beneficiario_nombre,
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                    id="select-beneficiario"
                  >
                    <option value="Titular">{user?.nombreCompleto || 'Carlos Valenzuela M.'} (Titular)</option>
                    <option value="Hija">Valentina Valenzuela (Hija)</option>
                    <option value="Hijo">Matías Valenzuela (Hijo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Descripción del gasto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Compra de medicamentos receta crónica"
                    value={formData.descripcion}
                    onChange={(e) => setFormData((p) => ({ ...p, descripcion: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                    id="input-descripcion"
                  />
                </div>
              </div>

              {/* Adjuntar comprobante */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Adjuntar Comprobante de Atención <span className="text-rose-500">*</span>
                </label>
                <label
                  htmlFor="input-comprobante"
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all ${
                    uploadedFile
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30'
                  }`}
                >
                  {uploadedFile ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-700">{uploadedFile.name}</p>
                        <p className="text-[11px] text-emerald-600">{(uploadedFile.size / 1024).toFixed(0)} KB — Clic para cambiar</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mb-2">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Arrastra tu comprobante aquí o haz clic para subir</p>
                      <span className="text-[11px] text-slate-400 mt-0.5">Boleta, factura o bono • PDF, JPG o PNG hasta 10MB</span>
                    </>
                  )}
                  <input
                    type="file"
                    id="input-comprobante"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {/* Tipo de documento de respaldo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tipo de Documento de Respaldo <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.tipo_documento}
                  onChange={(e) => setFormData((p) => ({ ...p, tipo_documento: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                  required
                  id="select-tipo-documento"
                >
                  <option value="">Seleccione una opción...</option>
                  {Object.entries(TIPOS_DOCUMENTO).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Declaración de veracidad */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.declaracion_aceptada}
                  onChange={(e) => setFormData((p) => ({ ...p, declaracion_aceptada: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 accent-emerald-600"
                  required
                  id="check-declaracion"
                />
                <span className="text-xs text-slate-600">
                  Declaro que la información y documentación ingresada es verídica, correcta y legal.
                </span>
              </label>

              {/* Acciones */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setUploadedFile(null);
                    setFechaValidacion(null);
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando || (fechaValidacion !== null && !fechaValidacion.dentro)}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  id="btn-enviar-solicitud"
                >
                  {enviando ? 'Enviando...' : 'Enviar Solicitud de Reembolso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Detalle de Solicitud ─── */}
      {showDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-2xl flex items-center justify-center">
                  {getTipoPrestacionIcon(showDetalle.tipo_prestacion)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Solicitud {showDetalle.codigo}</h3>
                  <p className="text-xs text-slate-500">{showDetalle.tipo_prestacion_label}</p>
                </div>
              </div>
              <button onClick={() => setShowDetalle(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">✕</button>
            </div>

            {/* Estado */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Estado:</span>
              {(() => {
                const badge = getEstadoBadge(showDetalle.estado);
                return (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full border ${badge.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                    {showDetalle.estado_label}
                  </span>
                );
              })()}
            </div>

            {/* Motivo de rechazo */}
            {showDetalle.estado === 'rechazado' && showDetalle.motivo_rechazo && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                <p className="text-xs font-bold">Motivo de Rechazo:</p>
                <p className="text-xs mt-0.5">{showDetalle.motivo_rechazo}</p>
              </div>
            )}

            {/* Grid de datos */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="block text-[11px] text-slate-400 uppercase font-semibold">Beneficiario</span>
                <span className="block text-sm text-slate-800 font-semibold mt-0.5">{showDetalle.beneficiario_nombre}</span>
                <span className="block text-[11px] text-slate-400">{showDetalle.beneficiario_parentesco}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="block text-[11px] text-slate-400 uppercase font-semibold">Fecha Atención</span>
                <span className="block text-sm text-slate-800 font-semibold mt-0.5">{formatDate(showDetalle.fecha_atencion)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="block text-[11px] text-slate-400 uppercase font-semibold">Monto Boleta</span>
                <span className="block text-sm text-slate-800 font-bold mt-0.5">{formatCurrency(showDetalle.monto_boleta)}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50">
                <span className="block text-[11px] text-emerald-500 uppercase font-semibold">Monto Reembolso</span>
                <span className="block text-sm text-emerald-700 font-bold mt-0.5">{formatCurrency(showDetalle.monto_reembolso)}</span>
              </div>
            </div>

            {/* Descripción */}
            {showDetalle.descripcion && (
              <div className="mt-3">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Descripción</span>
                <p className="text-xs text-slate-600 mt-0.5">{showDetalle.descripcion}</p>
              </div>
            )}

            {/* Comprobante */}
            <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Comprobante Adjunto</span>
              {showDetalle.comprobante_filename ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="flex-shrink-0 p-2 bg-emerald-100 rounded-lg text-emerald-700">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-xs text-slate-700 font-semibold truncate" title={showDetalle.comprobante_filename}>
                      {showDetalle.comprobante_filename}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleVerComprobante(showDetalle)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg shadow-sm transition active:scale-[0.98]"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver archivo
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-1">Sin comprobante adjunto</p>
              )}
            </div>

            {/* Fecha ingreso */}
            <div className="mt-3 text-[11px] text-slate-400">
              Ingresada el {formatDate(showDetalle.created_at)}
            </div>

            {/* Botón cerrar */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowDetalle(null)}
                className="px-5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Visor de Comprobante Adjunto ─── */}
      {previewComprobante && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-scale-in">
            {/* Header del visor */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="truncate">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>Comprobante: {previewComprobante.codigo}</span>
                  </h3>
                  <p className="text-xs text-slate-500 truncate" title={previewComprobante.filename}>
                    {previewComprobante.filename}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewComprobante.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                  title="Abrir en pestaña nueva"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span className="hidden sm:inline">Pestaña nueva</span>
                </a>
                <a
                  href={previewComprobante.url}
                  download={previewComprobante.filename}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
                  title="Descargar archivo"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden sm:inline">Descargar</span>
                </a>
                <button
                  onClick={() => setPreviewComprobante(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 text-lg font-bold rounded-lg hover:bg-slate-100 transition ml-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenedor del documento */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-100/60 min-h-[450px]">
              {previewError ? (
                <div className="p-6 text-center max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm animate-fade-in">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-3">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Archivo no cargado físicamente aún</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Esta solicitud fue registrada con el nombre <strong>"{previewComprobante.filename}"</strong>, pero el archivo aún no ha sido cargado en el servidor físico.
                  </p>

                  <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <label
                      htmlFor="input-subir-comprobante-visor"
                      className={`w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-sm transition cursor-pointer flex items-center justify-center gap-2 ${
                        subiendoArchivoDirecto ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {subiendoArchivoDirecto ? 'Subiendo archivo...' : 'Adjuntar archivo ahora'}
                      <input
                        type="file"
                        id="input-subir-comprobante-visor"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        disabled={subiendoArchivoDirecto}
                        onChange={handleAdjuntarComprobanteExistente}
                      />
                    </label>

                    <a
                      href={previewComprobante.url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:w-auto px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
                    >
                      Enlace directo
                    </a>
                  </div>
                </div>
              ) : previewComprobante.isPdf ? (
                <div className="w-full h-full flex flex-col flex-1">
                  <iframe
                    src={previewComprobante.url}
                    className="w-full h-[65vh] rounded-xl border border-slate-200 bg-white shadow-inner"
                    title={`Visor PDF ${previewComprobante.filename}`}
                    onError={() => setPreviewError('El archivo PDF no está disponible en el servidor o ocurrió un problema al cargarlo.')}
                  />
                </div>
              ) : previewComprobante.isImage ? (
                <div className="flex flex-col items-center justify-center w-full h-full p-2">
                  <img
                    src={previewComprobante.url}
                    alt={previewComprobante.filename}
                    className="max-h-[65vh] max-w-full rounded-xl object-contain shadow-md border border-slate-200 bg-white"
                    onError={() => setPreviewError(`No se encontró el archivo físico '${previewComprobante.filename}' en el servidor.`)}
                  />
                </div>
              ) : (
                <iframe
                  src={previewComprobante.url}
                  className="w-full h-[65vh] rounded-xl border border-slate-200 bg-white"
                  title={previewComprobante.filename}
                  onError={() => setPreviewError('No se pudo visualizar el formato del archivo.')}
                />
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-white text-xs text-slate-400">
              <span>{previewComprobante.filename}</span>
              <button
                onClick={() => setPreviewComprobante(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
