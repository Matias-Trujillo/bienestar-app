'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi, API_BASE_URL, subirArchivoApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  TipoPrestacion,
  SolicitudReembolso,
  ResumenSaludSocio,
  ReembolsoHistorialResponse,
  ValidacionFechaResponse,
} from '@/types';
import { ResumenSaludCards } from '@/components/reembolsos/ResumenSaludCards';
import { TablaSolicitudes } from '@/components/reembolsos/TablaSolicitudes';
import { ModalNuevaSolicitud } from '@/components/reembolsos/ModalNuevaSolicitud';
import { DetalleSolicitudModal } from '@/components/reembolsos/DetalleSolicitudModal';
import { VisorComprobanteModal } from '@/components/reembolsos/VisorComprobanteModal';

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

export default function ReembolsosPage() {
  const { user, token, refreshUser } = useAuth();

  // Estados de datos
  const [resumen, setResumen] = useState<ResumenSaludSocio>(EMPTY_RESUMEN);
  const [solicitudes, setSolicitudes] = useState<SolicitudReembolso[]>([]);
  const [, setCargando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetalle, setShowDetalle] = useState<SolicitudReembolso | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

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

  // Formulario de nueva solicitud
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

  // Carga resumen e historial
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
    if (refreshUser) {
      refreshUser();
    }
    if (typeof window !== 'undefined' && window.location.search.includes('nueva=1')) {
      setShowModal(true);
    }
  }, [cargarReembolsos]);

  const handleAbrirModal = async () => {
    await cargarReembolsos();
    if (refreshUser) {
      await refreshUser();
    }
    setShowModal(true);
  };

  const puedeSolicitar = resumen.puede_solicitar;

  // Plazo 30 días
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
        if (!cancelado) setFechaValidacion(null);
      });

    return () => {
      cancelado = true;
    };
  }, [formData.fecha_atencion, formData.fecha_boleta, token]);

  // Sincronizar fecha boleta
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!puedeSolicitar) {
      setErrorMsg(resumen.mensaje_carencia || 'No cumple con la antigüedad mínima de 6 meses.');
      return;
    }

    if (fechaValidacion && !fechaValidacion.dentro) {
      setErrorMsg(fechaValidacion.mensaje);
      return;
    }

    const boleta = parseFloat(formData.monto_boleta) || 0;
    const copago = parseFloat(formData.monto_copago) || 0;

    if (copago > boleta) {
      setErrorMsg(
        `El monto a reembolsar ($${copago.toLocaleString('es-CL')}) no puede ser mayor al monto total de la boleta ($${boleta.toLocaleString('es-CL')}).`
      );
      return;
    }

    if (copago > resumen.saldo_salud_disponible) {
      setErrorMsg(
        `El monto de copago solicitado ($${copago.toLocaleString('es-CL')}) supera su saldo disponible ($${resumen.saldo_salud_disponible.toLocaleString('es-CL')}).`
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

      if (uploadedFile) {
        const formArchivo = new FormData();
        formArchivo.append('archivo', uploadedFile);
        try {
          await subirArchivoApi(`/reembolsos/solicitud/${nueva.id}/comprobante`, formArchivo);
        } catch (uploadErr) {
          console.error('Error al subir archivo adjunto:', uploadErr);
        }
      }

      await cargarReembolsos();
      if (refreshUser) {
        await refreshUser();
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('solicitudes-updated'));
      }

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
            onClick={handleAbrirModal}
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

      {/* Alerta de carencia */}
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

      {/* Tarjetas de Resumen Modulares */}
      <ResumenSaludCards resumen={resumen} solicitudes={solicitudes} />

      {/* Tabla de Historial Modular */}
      <TablaSolicitudes
        solicitudes={solicitudes}
        filtroEstado={filtroEstado}
        setFiltroEstado={setFiltroEstado}
        onVerComprobante={handleVerComprobante}
        onVerDetalle={(sol) => setShowDetalle(sol)}
      />

      {/* Modal Nueva Solicitud Modular */}
      <ModalNuevaSolicitud
        show={showModal}
        resumen={resumen}
        formData={formData}
        setFormData={setFormData}
        fechaValidacion={fechaValidacion}
        uploadedFile={uploadedFile}
        enviando={enviando}
        usuarioNombre={user?.nombreCompleto}
        onClose={() => {
          setShowModal(false);
          setUploadedFile(null);
          setFechaValidacion(null);
        }}
        onFileChange={handleFileChange}
        onSubmit={handleSubmit}
      />

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
