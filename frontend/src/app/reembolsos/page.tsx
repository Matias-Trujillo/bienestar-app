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
  BeneficiarioReembolso,
} from '@/types';
import { ResumenSaludCards } from '@/components/reembolsos/ResumenSaludCards';
import { TablaSolicitudes } from '@/components/reembolsos/TablaSolicitudes';
import { ModalNuevaSolicitud, FormReembolsoState } from '@/components/reembolsos/ModalNuevaSolicitud';
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

// [ESTUDIANTE INFORMÁTICA] Componente principal de la vista del socio para el Módulo 2 (HU-03); orquesta la presentación del saldo de salud, historial de reembolsos y el formulario de ingreso.
export default function ReembolsosPage() {
  const { user, token, refreshUser } = useAuth();

  // [ESTUDIANTE INFORMÁTICA] Estados de React: guardan la información reactiva traída desde la API (resumen financiero y lista de solicitudes) y controlan la visibilidad de los modales.
  const [resumen, setResumen] = useState<ResumenSaludSocio>(EMPTY_RESUMEN);
  const [solicitudes, setSolicitudes] = useState<SolicitudReembolso[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<BeneficiarioReembolso[]>([]);
  const [, setCargando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetalle, setShowDetalle] = useState<SolicitudReembolso | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  // [ESTUDIANTE INFORMÁTICA] Estado para el visor modal de comprobantes; permite mostrar el documento adjunto (PDF o imagen) sin salir de la página.
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

  // [ESTUDIANTE INFORMÁTICA] Estado del formulario controlado: almacena los valores tipeados por el socio para enviarlos luego al backend.
  const [formData, setFormData] = useState<FormReembolsoState>({
    tipo_prestacion: '' as TipoPrestacion | '',
    descripcion: '',
    beneficiario_nombre: user?.nombreCompleto || 'Carlos Valenzuela M.',
    beneficiario_parentesco: 'Titular',
    beneficiario_run: user?.rut || '',
    socio_id: undefined,
    socio_rut: '',
    monto_boleta: '',
    monto_copago: '',
    fecha_atencion: '',
    fecha_boleta: '',
    tipo_documento: '',
    declaracion_aceptada: false,
  });

  // [ESTUDIANTE INFORMÁTICA] Estado de validación en tiempo real; almacena si las fechas ingresadas están dentro de los 30 días corridos para avisarle al usuario al instante.
  const [fechaValidacion, setFechaValidacion] = useState<{
    dentro: boolean;
    mensaje: string;
    dias: number;
  } | null>(null);

  // [ESTUDIANTE INFORMÁTICA] Función asíncrona que consume 'GET /reembolsos'; obtiene el resumen actualizado y las solicitudes para alimentar los componentes hijos.
  const cargarReembolsos = useCallback(async () => {
    if (!token) return;
    try {
      const [data, bens] = await Promise.all([
        fetchFromApi<ReembolsoHistorialResponse>('/reembolsos', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetchFromApi<BeneficiarioReembolso[]>('/reembolsos/beneficiarios', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => [] as BeneficiarioReembolso[]),
      ]);
      setResumen(data.resumen);
      setSolicitudes(data.solicitudes);
      setBeneficiarios(bens);
      if (bens && bens.length > 0) {
        setFormData((prev) => ({
          ...prev,
          beneficiario_nombre: prev.beneficiario_nombre || bens[0].nombre,
          beneficiario_parentesco: prev.beneficiario_parentesco || bens[0].parentesco,
          beneficiario_run: prev.beneficiario_run || bens[0].rut,
        }));
      }
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
    const url = `${API_BASE_URL}/reembolsos/solicitud/${sol.id}/comprobante${token ? `?token=${encodeURIComponent(token)}` : ''
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
      const url = `${API_BASE_URL}/reembolsos/solicitud/${previewComprobante.id}/comprobante${token ? `?token=${encodeURIComponent(token)}&t=${Date.now()}` : `?t=${Date.now()}`
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

  const handleBuscarSocioAsistido = async (rutBuscado: string) => {
    if (!token) return;
    try {
      const [resumenAsistido, bensAsistido] = await Promise.all([
        fetchFromApi<ResumenSaludSocio>(
          `/reembolsos/resumen-socio?socio_rut=${encodeURIComponent(rutBuscado)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        fetchFromApi<BeneficiarioReembolso[]>(
          `/reembolsos/beneficiarios?socio_rut=${encodeURIComponent(rutBuscado)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ]);
      setResumen(resumenAsistido);
      setBeneficiarios(bensAsistido);
      if (bensAsistido && bensAsistido.length > 0) {
        setFormData((prev) => ({
          ...prev,
          socio_rut: rutBuscado,
          beneficiario_nombre: bensAsistido[0].nombre,
          beneficiario_parentesco: bensAsistido[0].parentesco,
          beneficiario_run: bensAsistido[0].rut,
        }));
      }
      setSuccessMsg(`Socio titular "${resumenAsistido.socio_nombre}" cargado para atención asistida.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo cargar al socio asistido.');
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

    // [ESTUDIANTE INFORMÁTICA] Validación lógica: el copago a reembolsar no puede superar el total pagado en la boleta.
    if (copago > boleta) {
      setErrorMsg(
        `El monto a reembolsar ($${copago.toLocaleString('es-CL')}) no puede ser mayor al monto total de la boleta ($${boleta.toLocaleString('es-CL')}).`
      );
      return;
    }

    // [ESTUDIANTE INFORMÁTICA] Validación financiera: el copago no puede superar el saldo de salud disponible del socio.
    if (copago > resumen.saldo_salud_disponible) {
      setErrorMsg(
        `El monto de copago solicitado ($${copago.toLocaleString('es-CL')}) supera su saldo disponible ($${resumen.saldo_salud_disponible.toLocaleString('es-CL')}).`
      );
      return;
    }

    // [ESTUDIANTE INFORMÁTICA] Validación documental: es obligatorio adjuntar el archivo físico de respaldo.
    if (!uploadedFile) {
      setErrorMsg('Debe adjuntar el comprobante de atención o boleta digital.');
      return;
    }

    // [ESTUDIANTE INFORMÁTICA] Validación legal: el socio debe haber marcado la declaración jurada de veracidad.
    if (!formData.declaracion_aceptada) {
      setErrorMsg('Debe aceptar que la información y documentación ingresada es correcta y legal.');
      return;
    }

    // [ESTUDIANTE INFORMÁTICA] Proceso de guardado en dos pasos: 1° crea la entidad en la base de datos vía JSON; 2° sube el archivo binario asociado al ID generado.
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
          beneficiario_run: formData.beneficiario_run || undefined,
          socio_id: formData.socio_id,
          socio_rut: formData.socio_rut || undefined,
          monto_boleta: parseFloat(formData.monto_boleta) || 0,
          monto_copago: copago,
          fecha_atencion: formData.fecha_atencion,
          fecha_boleta: formData.fecha_boleta,
          tipo_documento: formData.tipo_documento,
          comprobante_filename: uploadedFile.name,
          declaracion_aceptada: formData.declaracion_aceptada,
        }),
      });

      // [ESTUDIANTE INFORMÁTICA] Segundo paso: envío del archivo adjunto como multipart/form-data.
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
        beneficiario_run: user?.rut || '',
        socio_id: undefined,
        socio_rut: '',
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
    <div className="space-y-6 animate-fade-in min-w-0">
      {/* Cabecera Ejecutiva del Módulo Reembolsos */}
      <div className="hero-institutional">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
        <div className="p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-emerald-200 border border-white/15 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#78a200]" />
              Módulo 2 • HU-03 • Prestaciones de Salud
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Reembolsos Médicos, Farmacia y Dental
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Plazo reglamentario de 30 días corridos desde la atención • Retención preventiva de cupo en revisión
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/"
              className="px-3.5 py-2 text-xs font-bold text-slate-100 bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 transition-colors"
            >
              ← Hoja Socio
            </Link>
            <button
              onClick={handleAbrirModal}
              disabled={!puedeSolicitar}
              title={!puedeSolicitar ? 'Requiere al menos 6 meses de antigüedad' : undefined}
              id="btn-nueva-solicitud"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm ${
                puedeSolicitar
                  ? 'text-white bg-gradient-to-r from-[#166534] to-[#558b2f] hover:opacity-95'
                  : 'text-slate-400 bg-slate-700 cursor-not-allowed'
              }`}
            >
              + Nueva Solicitud
            </button>
          </div>
        </div>
      </div>

      {/* Alerta normativa de carencia (6 meses) */}
      {!puedeSolicitar && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#b45309]">
                Período de Carencia Estatutaria Activo (6 Meses)
              </p>
              <p className="text-xs mt-0.5 text-slate-700">{resumen.mensaje_carencia}</p>
            </div>
            {resumen.fecha_habilitacion && (
              <span className="px-3 py-1 rounded-xl bg-white border border-amber-300 text-xs font-mono font-bold text-[#b45309] tabular-nums shrink-0">
                Habilitación: {formatDate(resumen.fecha_habilitacion)}
              </span>
            )}
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#166534] flex items-center justify-between text-xs font-bold shadow-2xs">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="px-2 hover:text-emerald-950">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-xs font-bold shadow-2xs">
          <span>✕ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="px-2 hover:text-rose-950">✕</button>
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
        beneficiarios={beneficiarios}
        esDirectiva={Boolean(
          user?.isSuperuser ||
          ['ADMIN', 'SUPERUSUARIO', 'PRESIDENTE', 'TESORERO'].includes((user?.rol || '').toUpperCase())
        )}
        onBuscarSocioAsistido={handleBuscarSocioAsistido}
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
