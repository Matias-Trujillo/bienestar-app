'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';
import { formatRun, isValidRun, getErrorMessage } from '@/lib/utils';
import {
  EvaluacionDirectorioTable,
  SolicitudResumen,
} from '@/components/afiliacion/EvaluacionDirectorioTable';
import { ModalResolucionAfiliacion } from '@/components/afiliacion/ModalResolucionAfiliacion';
import {
  ModalCargaMasivaSocios,
  esCuentaAutorizadaCargaMasiva,
} from '@/components/admin/ModalCargaMasivaSocios';
import { BuzonCorreosModal } from '@/components/ui/BuzonCorreosModal';

const ROLES_DIRECTIVA = ['presidente', 'secretario', 'tesorero', 'admin', 'auditor', 'superusuario'];
const ROLES_RESOLUTIVOS = ['presidente', 'secretario', 'admin', 'superusuario'];

const CERTIFICADO_INFO = {
  titulo: 'Cédula de Identidad (Frontal)',
  descripcion:
    'Fotografía frontal clara o escaneo del carnet de identidad de la carga familiar para contrastar su RUN y nombres antes de autorizar.',
};

const CERTIFICADO_POR_PARENTESCO: Record<string, { titulo: string; descripcion: string }> = {
  'Hijo/a': CERTIFICADO_INFO,
  'Cónyuge': CERTIFICADO_INFO,
  'Conviviente Civil': CERTIFICADO_INFO,
  'Padre / Madre': CERTIFICADO_INFO,
  'Otro vínculo legal': CERTIFICADO_INFO,
};

interface CargaSocioItem {
  id: string;
  folio?: string;
  socioNombre?: string;
  socioRut?: string;
  nombre: string;
  parentesco: string;
  rut: string;
  observacion?: string;
  certificadoNombre?: string | null;
  certificadoTipo?: string | null;
  certificadoData?: string | null;
  estado: string;
  fechaSolicitud?: string;
  observacionesResolucion?: string | null;
}

interface SolicitudCargaItem {
  id: number;
  folio: string;
  socioId: number;
  socioNombre: string;
  socioRut: string;
  socioEmail?: string | null;
  nombreCompleto: string;
  run: string;
  parentesco?: string | null;
  observacionSocio?: string | null;
  certificadoNombre?: string | null;
  certificadoTipo?: string | null;
  certificadoData?: string | null;
  estado: 'Pendiente de aprobación' | 'Aprobada' | 'Rechazada' | string;
  fechaIngreso: string;
  fechaSesion?: string | null;
  numeroActa?: string | null;
  observacionesResolucion?: string | null;
  resueltoPor?: string | null;
  resueltoAt?: string | null;
}

export default function AfiliacionPage() {
  const { user, token } = useAuth();
  const esDirectiva = !!user && (user.isSuperuser || ROLES_DIRECTIVA.includes(user.rol));
  const puedeResolver = !!user && (user.isSuperuser || ROLES_RESOLUTIVOS.includes(user.rol));
  const esAdminOSuper = !!user && (user.isSuperuser || user.rol === 'admin' || user.rol === 'superusuario');

  const [solicitudes, setSolicitudes] = useState<SolicitudResumen[] | null>(null);
  const [cargando, setCargando] = useState(false);

  // Modal de resolución (HU-02)
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudResumen | null>(null);
  const [modoResolucion, setModoResolucion] = useState<'aprobar' | 'rechazar' | null>(null);
  const [fechaSesion, setFechaSesion] = useState(new Date().toISOString().split('T')[0]);
  const [numeroActa, setNumeroActa] = useState('Acta Ordinaria N° 04-2026');
  const [observaciones, setObservaciones] = useState('');
  const [resolviendo, setResolviendo] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Modal de detalle de resolución
  const [solicitudCorreo, setSolicitudCorreo] = useState<SolicitudResumen | null>(null);
  const [panelResolucionFicha, setPanelResolucionFicha] = useState<'aprobar' | 'rechazar' | null>(null);
  const [reenviandoSmtp, setReenviandoSmtp] = useState(false);
  const [buzonAbierto, setBuzonAbierto] = useState(false);

  // Cargas familiares del socio actual y solicitudes de nuevas cargas (Directiva)
  const [misCargas, setMisCargas] = useState<CargaSocioItem[]>([]);
  const [cargandoMisCargas, setCargandoMisCargas] = useState(false);
  const [solicitudesCargas, setSolicitudesCargas] = useState<SolicitudCargaItem[]>([]);
  const [cargandoSolCargas, setCargandoSolCargas] = useState(false);

  // Modal: Solicitar Nueva Carga Familiar (Socio o Directiva asistida)
  const [modalNuevaCargaOpen, setModalNuevaCargaOpen] = useState(false);
  const [socioAsistidoRut, setSocioAsistidoRut] = useState('');
  const [nuevaCargaNombre, setNuevaCargaNombre] = useState('');
  const [nuevaCargaRun, setNuevaCargaRun] = useState('');
  const [nuevaCargaParentesco, setNuevaCargaParentesco] = useState('Hijo/a');
  const [nuevaCargaObservacion, setNuevaCargaObservacion] = useState('');
  const [certificadoNombre, setCertificadoNombre] = useState<string>('');
  const [certificadoData, setCertificadoData] = useState<string>('');
  const [enviandoNuevaCarga, setEnviandoNuevaCarga] = useState(false);
  const [errorNuevaCarga, setErrorNuevaCarga] = useState<string | null>(null);

  // Modal: Visor de Certificado adjunto
  const [certificadoVisor, setCertificadoVisor] = useState<{
    titulo: string;
    nombreArchivo: string;
    dataUrl: string;
    cargaNombre: string;
    socioNombre?: string;
  } | null>(null);

  // Modal: Resolver Solicitud de Carga Familiar (Directiva)
  const [cargaSeleccionada, setCargaSeleccionada] = useState<SolicitudCargaItem | null>(null);
  const [modoResolucionCarga, setModoResolucionCarga] = useState<'aprobar' | 'rechazar' | null>(null);
  const [obsResolucionCarga, setObsResolucionCarga] = useState('');
  const [resolviendoCarga, setResolviendoCarga] = useState(false);
  const [errorResolucionCarga, setErrorResolucionCarga] = useState<string | null>(null);

  // Modal: Carga Masiva (Exclusivo Directiva y Administradores autorizados de Muni Peralillo)
  const [modalCargaMasivaOpen, setModalCargaMasivaOpen] = useState(false);
  const puedeCargaMasiva = Boolean(esDirectiva && esCuentaAutorizadaCargaMasiva(user?.email, user?.rut));

  const cargarMisCargas = useCallback(() => {
    if (!token) return;
    setCargandoMisCargas(true);
    fetchFromApi<{ cargas: CargaSocioItem[] }>('/afiliacion/mis-cargas', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => setMisCargas(res.cargas || []))
      .catch(() => setMisCargas([]))
      .finally(() => setCargandoMisCargas(false));
  }, [token]);

  const cargarSolicitudesCargas = useCallback(() => {
    if (!esDirectiva || !token) return;
    setCargandoSolCargas(true);
    fetchFromApi<SolicitudCargaItem[]>('/afiliacion/solicitudes-cargas', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => setSolicitudesCargas(res || []))
      .catch(() => setSolicitudesCargas([]))
      .finally(() => setCargandoSolCargas(false));
  }, [esDirectiva, token]);

  const handleReenviarCorreoReal = async (folio: string) => {
    if (!token) return;
    setReenviandoSmtp(true);
    try {
      const res = await fetchFromApi<SolicitudResumen>(
        `/afiliacion/solicitudes/${folio}/reenviar-correo`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSolicitudCorreo(res);
      setMensajeExito(
        `Notificación reenviada correctamente al correo ${res.notificacionEmail?.destinatario || res.email}.`
      );
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Error al reenviar correo');
    } finally {
      setReenviandoSmtp(false);
    }
  };

  const cargarSolicitudes = useCallback(() => {
    if (!esDirectiva || !token) return;
    setCargando(true);
    fetchFromApi<SolicitudResumen[]>('/afiliacion/solicitudes', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(setSolicitudes)
      .catch(() => setSolicitudes([]))
      .finally(() => setCargando(false));
  }, [esDirectiva, token]);

  useEffect(() => {
    cargarSolicitudes();
    cargarMisCargas();
    cargarSolicitudesCargas();
  }, [cargarSolicitudes, cargarMisCargas, cargarSolicitudesCargas]);

  const handleSeleccionarCertificado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setErrorNuevaCarga(null);
    if (!file) {
      setCertificadoNombre('');
      setCertificadoData('');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorNuevaCarga('El archivo supera el tamaño máximo permitido de 5 MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCertificadoNombre(file.name);
        setCertificadoData(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSolicitarNuevaCarga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setErrorNuevaCarga(null);

    if (nuevaCargaNombre.trim().length < 3) {
      setErrorNuevaCarga('Ingrese el nombre completo de la carga familiar.');
      return;
    }
    if (!isValidRun(nuevaCargaRun)) {
      setErrorNuevaCarga('El RUN ingresado no es válido (verifique el dígito verificador Módulo 11).');
      return;
    }
    if (!certificadoData || !certificadoNombre) {
      setErrorNuevaCarga('Debe adjuntar la fotografía frontal de la cédula de identidad en formato JPG, PNG o PDF.');
      return;
    }

    setEnviandoNuevaCarga(true);
    try {
      const payloadBody: Record<string, unknown> = {
        nombreCompleto: nuevaCargaNombre.trim(),
        run: nuevaCargaRun.trim(),
        parentesco: nuevaCargaParentesco,
        observacionSocio: nuevaCargaObservacion.trim() || 'Cédula de Identidad (Frontal)',
        certificadoNombre,
        certificadoTipo: 'Cédula de Identidad (Frontal)',
        certificadoData,
      };
      if (esDirectiva && socioAsistidoRut.trim()) {
        payloadBody.socioRut = socioAsistidoRut.trim();
      }

      const creada = await fetchFromApi<SolicitudCargaItem>('/afiliacion/mis-cargas', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payloadBody),
      });
      setModalNuevaCargaOpen(false);
      setSocioAsistidoRut('');
      setNuevaCargaNombre('');
      setNuevaCargaRun('');
      setNuevaCargaParentesco('Hijo/a');
      setNuevaCargaObservacion('');
      setCertificadoNombre('');
      setCertificadoData('');
      setMensajeExito(
        `Solicitud ${creada.folio} enviada exitosamente. Se encuentra en estado Pendiente de Revisión por el Directorio de Bienestar.`
      );
      cargarMisCargas();
      cargarSolicitudesCargas();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('solicitudes-updated'));
        try {
          if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('bienestar_alertas_channel');
            bc.postMessage({ type: 'SOLICITUD_CREADA', folio: creada.folio });
            bc.close();
          }
        } catch {}
      }
    } catch (err: unknown) {
      setErrorNuevaCarga(err instanceof Error ? err.message : 'No fue posible registrar la solicitud.');
    } finally {
      setEnviandoNuevaCarga(false);
    }
  };

  const handleAbrirSubsanacion = (carga: CargaSocioItem) => {
    setNuevaCargaNombre(carga.nombre);
    setNuevaCargaRun(carga.rut);
    setNuevaCargaParentesco(carga.parentesco || 'Hijo/a');
    setNuevaCargaObservacion('Subsanación: Fotografía corregida de la cédula de identidad');
    setCertificadoNombre('');
    setCertificadoData('');
    setErrorNuevaCarga(null);
    setModalNuevaCargaOpen(true);
  };

  const abrirFichaCarga = (sc: SolicitudCargaItem, modoInicial: 'aprobar' | 'rechazar' = 'aprobar') => {
    setCargaSeleccionada(sc);
    setModoResolucionCarga(modoInicial);
    setErrorResolucionCarga(null);
    setFechaSesion(new Date().toISOString().split('T')[0]);
    if (modoInicial === 'aprobar') {
      setObsResolucionCarga(
        `Acredita vínculo legal mediante ${sc.certificadoTipo || 'certificado oficial'} conforme al Reglamento del Servicio de Bienestar.`
      );
    } else {
      setObsResolucionCarga(
        'El documento adjunto es ilegible o no corresponde al certificado exigido para acreditar el vínculo.'
      );
    }
  };

  const cambiarModoResolucionCarga = (modo: 'aprobar' | 'rechazar') => {
    setModoResolucionCarga(modo);
    setErrorResolucionCarga(null);
    if (modo === 'aprobar') {
      setObsResolucionCarga(
        `Acredita vínculo legal mediante ${cargaSeleccionada?.certificadoTipo || 'certificado oficial'} conforme al Reglamento del Servicio de Bienestar.`
      );
    } else {
      setObsResolucionCarga(
        'El documento adjunto es ilegible o no corresponde al certificado exigido para acreditar el vínculo.'
      );
    }
  };

  const handleResolverCarga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cargaSeleccionada || !modoResolucionCarga || !token) return;
    setErrorResolucionCarga(null);
    setResolviendoCarga(true);
    try {
      const res = await fetchFromApi<SolicitudCargaItem>(
        `/afiliacion/solicitudes-cargas/${cargaSeleccionada.folio}/resolucion`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            accion: modoResolucionCarga,
            fechaSesion,
            numeroActa,
            observaciones: obsResolucionCarga,
          }),
        }
      );
      setMensajeExito(
        modoResolucionCarga === 'aprobar'
          ? `Carga familiar ${res.nombreCompleto} (${res.run}) APROBADA e incorporada a la ficha del socio ${res.socioNombre}. Se notificó por correo.`
          : `Solicitud de carga familiar ${res.folio} RECHAZADA. Se envió notificación con el motivo al correo del socio.`
      );
      const folioCarga = res.folio;
      const accionCarga = modoResolucionCarga === 'aprobar' ? 'APROBAR' : 'RECHAZAR';
      setCargaSeleccionada(null);
      setModoResolucionCarga(null);
      cargarSolicitudesCargas();
      cargarMisCargas();
      cargarSolicitudes();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('solicitudes-updated'));
        try {
          if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('bienestar_alertas_channel');
            bc.postMessage({
              type: 'SOLICITUD_APROBADA',
              modulo: 'afiliacion',
              folio: folioCarga,
              accion: accionCarga,
            });
            bc.close();
          }
        } catch {}
      }
    } catch (err: unknown) {
      setErrorResolucionCarga(err instanceof Error ? err.message : 'Error al resolver solicitud de carga.');
    } finally {
      setResolviendoCarga(false);
    }
  };

  const abrirModal = (sol: SolicitudResumen, modo: 'aprobar' | 'rechazar') => {
    setSolicitudSeleccionada(sol);
    setModoResolucion(modo);
    setErrorModal(null);
    setMensajeExito(null);
    setFechaSesion(new Date().toISOString().split('T')[0]);
    if (modo === 'rechazar') {
      setObservaciones(
        'Inconsistencia en calidad contractual / antecedentes de cargas familiares incompletos para acreditar asignación.'
      );
    } else {
      setObservaciones(
        'Cumple requisitos reglamentarios de Planta/Contrata Municipal y autorización de descuento del 4% por planilla.'
      );
    }
  };

  const cerrarModal = () => {
    setSolicitudSeleccionada(null);
    setModoResolucion(null);
    setErrorModal(null);
  };

  const handleResolver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solicitudSeleccionada || !modoResolucion || !token) return;
    setErrorModal(null);
    setResolviendo(true);

    try {
      const res = await fetchFromApi<SolicitudResumen>(
        `/afiliacion/solicitudes/${solicitudSeleccionada.folio}/resolucion`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            accion: modoResolucion,
            fechaSesion,
            numeroActa,
            observaciones,
          }),
        }
      );

      setMensajeExito(
        modoResolucion === 'aprobar'
          ? `Solicitud ${solicitudSeleccionada.folio} aceptada correctamente. Las credenciales de acceso fueron enviadas de forma privada al correo ${res.notificacionEmail?.destinatario || res.email}.`
          : `Solicitud ${solicitudSeleccionada.folio} rechazada. Se notificó el detalle de la resolución al correo ${res.notificacionEmail?.destinatario || res.email}.`
      );
      const folioRes = res.folio;
      const accionRes = modoResolucion === 'aprobar' ? 'APROBAR' : 'RECHAZAR';
      cerrarModal();
      setSolicitudCorreo(res);
      cargarSolicitudes();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('solicitudes-updated'));
        try {
          if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('bienestar_alertas_channel');
            bc.postMessage({
              type: 'SOLICITUD_APROBADA',
              modulo: 'afiliacion',
              folio: folioRes,
              accion: accionRes,
            });
            bc.close();
          }
        } catch {}
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar resolución.';
      setErrorModal(msg);
    } finally {
      setResolviendo(false);
    }
  };

  const handleResolverFicha = async (accion: 'aprobar' | 'rechazar') => {
    if (!solicitudCorreo || !token) return;
    setResolviendo(true);
    try {
      const res = await fetchFromApi<SolicitudResumen>(
        `/afiliacion/solicitudes/${solicitudCorreo.folio}/resolucion`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            accion,
            fechaSesion,
            numeroActa,
            observaciones,
          }),
        }
      );

      setMensajeExito(
        accion === 'aprobar'
          ? `Solicitud ${solicitudCorreo.folio} aprobada exitosamente. Las credenciales fueron enviadas a ${res.notificacionEmail?.destinatario || res.email}.`
          : `Solicitud ${solicitudCorreo.folio} rechazada. Se notificó al correo ${res.notificacionEmail?.destinatario || res.email}.`
      );
      const folioFicha = res.folio;
      const accionFicha = accion === 'aprobar' ? 'APROBAR' : 'RECHAZAR';
      setPanelResolucionFicha(null);
      setSolicitudCorreo(res);
      cargarSolicitudes();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('solicitudes-updated'));
        try {
          if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('bienestar_alertas_channel');
            bc.postMessage({
              type: 'SOLICITUD_APROBADA',
              modulo: 'afiliacion',
              folio: folioFicha,
              accion: accionFicha,
            });
            bc.close();
          }
        } catch {}
      }
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Error al registrar la resolución.');
    } finally {
      setResolviendo(false);
    }
  };

  const cargasPendientesCount = solicitudesCargas.filter(
    (sc) => sc.estado === 'Pendiente de aprobación'
  ).length;
  const runCargaValido = nuevaCargaRun.trim().length > 0 && isValidRun(nuevaCargaRun);
  const runCargaInvalido = nuevaCargaRun.replace(/[^0-9kK]/g, '').length >= 8 && !isValidRun(nuevaCargaRun);
  const certRequeridoActual =
    CERTIFICADO_POR_PARENTESCO[nuevaCargaParentesco] || CERTIFICADO_POR_PARENTESCO['Hijo/a'];

  const mailActivo = solicitudCorreo?.notificacionEmail;

  return (
    <div className="space-y-6 animate-fade-in min-w-0">
      <div className="hero-institutional">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
        <div className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-sky-200 border border-white/15 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#78a200]" />
              Módulo 1 • HU-01 & HU-02 • Registro Estatutario
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Afiliación al Comité y Cargas Familiares
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {esDirectiva
                ? 'Resolución colegiada en sesión ordinaria (Presidente/Secretario), actas y acreditación de cargas'
                : 'Consulta de cargas familiares reconocidas y solicitud de incorporación de nuevos causantes'}
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {puedeCargaMasiva && (
              <button
                type="button"
                onClick={() => setModalCargaMasivaOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#006799] hover:bg-sky-700 rounded-xl border border-sky-400/30 shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                title="Exclusivo para las 7 cuentas institucionales de la Municipalidad de Peralillo"
              >
                <svg className="w-3.5 h-3.5 text-sky-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Carga Masiva CSV</span>
              </button>
            )}
            {esDirectiva && (
              <>
                <Link
                  href="/finanzas"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-100 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl transition-colors whitespace-nowrap"
                >
                  <span>Nómina 4% (Finanzas)</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setBuzonAbierto(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-sky-100 bg-sky-900/60 hover:bg-sky-900/80 border border-sky-400/40 rounded-xl transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                  title="Consultar registro de correos transaccionales emitidos por el sistema"
                >
                  <span>📬 Buzón de Correos</span>
                </button>
              </>
            )}
            <Link
              href="/"
              className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-slate-100 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl transition-colors whitespace-nowrap"
            >
              ← Hoja Socio
            </Link>
          </div>
        </div>
      </div>

      {mensajeExito && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#166534] text-xs font-bold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{mensajeExito}</span>
          </div>
          <button
            onClick={() => setMensajeExito(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Evaluación de Incorporaciones (HU-02) */}
      {esDirectiva && (
        <EvaluacionDirectorioTable
          solicitudes={solicitudes}
          cargando={cargando}
          puedeResolver={puedeResolver}
          onAbrirModal={abrirModal}
          onVerDetalle={(sol) => {
            setPanelResolucionFicha(null);
            setSolicitudCorreo(sol);
          }}
          onVerCorreo={(sol) => {
            setPanelResolucionFicha(null);
            setSolicitudCorreo(sol);
          }}
        />
      )}

      {/* Evaluación de Nuevas Cargas Familiares solicitadas por Socios Activos (Directiva) */}
      {esDirectiva && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-slate-800">
                  Solicitudes de Incorporación de Nuevas Cargas Familiares
                </h2>
                {cargasPendientesCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    {cargasPendientesCount}{' '}
                    {cargasPendientesCount === 1 ? 'pendiente de aprobación' : 'pendientes de aprobación'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Haga clic en el <strong>N° de Solicitud</strong> para revisar el certificado adjunto y autorizar o rechazar la incorporación de la carga.
              </p>
            </div>
          </div>

          {cargandoSolCargas ? (
            <div className="text-xs text-slate-400 py-6 text-center">
              Cargando solicitudes de cargas familiares...
            </div>
          ) : solicitudesCargas.length === 0 ? (
            <div className="text-xs text-slate-400 py-5 text-center bg-slate-50/70 rounded-xl border border-slate-100">
              No hay solicitudes adicionales de cargas familiares registradas.
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-500 font-semibold uppercase text-[11px]">
                    <th className="w-[20%] py-3 px-4">N° Solicitud / Ingreso</th>
                    <th className="w-[26%] py-3 px-4">Socio Titular</th>
                    <th className="w-[24%] py-3 px-4">Nueva Carga / Vínculo</th>
                    <th className="w-[18%] py-3 px-4">Certificado Adjunto</th>
                    <th className="w-[12%] py-3 px-4 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {solicitudesCargas.map((sc) => (
                    <tr
                      key={sc.folio}
                      onClick={() => abrirFichaCarga(sc, 'aprobar')}
                      className="hover:bg-sky-50/40 transition align-middle cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 align-middle">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirFichaCarga(sc, 'aprobar');
                          }}
                          className="inline-flex items-center gap-1.5 font-mono font-bold text-[#006799] bg-sky-50 group-hover:bg-[#006799] group-hover:text-white border border-sky-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                          title="Pinche aquí para abrir la solicitud, ver el certificado y resolver"
                        >
                          <span>{sc.folio}</span>
                          <span className="text-[10px]">→</span>
                        </button>
                        <div className="text-[11px] text-slate-400 mt-1 pl-0.5 tabular-nums">
                          {new Date(sc.fechaIngreso).toLocaleDateString('es-CL')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle min-w-0">
                        <div className="font-bold text-slate-800 truncate" title={sc.socioNombre}>{sc.socioNombre}</div>
                        <div className="font-mono text-[11px] text-slate-500 truncate mt-0.5">
                          RUN {sc.socioRut}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle min-w-0">
                        <div className="font-bold text-slate-800 truncate" title={sc.nombreCompleto}>{sc.nombreCompleto}</div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          <span className="font-mono">RUN {sc.run}</span>
                          <span className="text-[#006799] font-semibold"> · {sc.parentesco || 'Hijo/a'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle text-slate-600 text-xs min-w-0">
                        <div className="font-semibold text-slate-700 truncate" title={sc.certificadoTipo || sc.observacionSocio || 'Certificado de respaldo'}>
                          {sc.certificadoTipo || sc.observacionSocio || 'Certificado de respaldo'}
                        </div>
                        {sc.estado === 'Aprobada' && sc.fechaSesion ? (
                          <div className="text-emerald-700 text-[11px] font-semibold truncate">
                            {sc.numeroActa || 'Sesión Ordinaria'} ({sc.fechaSesion})
                          </div>
                        ) : sc.estado === 'Rechazada' && sc.observacionesResolucion ? (
                          <div className="text-rose-600 text-[11px] truncate" title={sc.observacionesResolucion}>
                            Motivo: {sc.observacionesResolucion}
                          </div>
                        ) : (
                          <div className="text-[#006799] text-[11px] font-medium truncate">
                            Pinche para revisar documento
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            sc.estado === 'Aprobada'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : sc.estado === 'Rechazada'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              sc.estado === 'Aprobada'
                                ? 'bg-emerald-600'
                                : sc.estado === 'Rechazada'
                                ? 'bg-rose-600'
                                : 'bg-amber-500'
                            }`}
                          />
                          {sc.estado === 'Aprobada' ? 'Aprobada' : sc.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Cargas Familiares Reconocidas (Solo las del socio, excepto Admin/Superusuario que ven todas) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-800">
                {esAdminOSuper
                  ? 'Registro General de Cargas Familiares de Socios'
                  : 'Mis Cargas Familiares Reconocidas'}
              </h2>
              {esAdminOSuper && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-[#006799] border border-sky-200">
                  Vista Admin / Superusuario (Todos los socios)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {esAdminOSuper
                ? 'Visualización completa de todas las cargas familiares registradas por los socios del Comité de Bienestar.'
                : `Cargas familiares asociadas exclusivamente al socio titular ${user?.nombreCompleto || ''} (RUN ${user?.rut || ''}).`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setErrorNuevaCarga(null);
              setCertificadoNombre('');
              setCertificadoData('');
              setModalNuevaCargaOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0f2942] hover:bg-[#006799] transition shadow-sm cursor-pointer shrink-0"
          >
            + Agregar Nueva Carga Familiar
          </button>
        </div>

        <div className="w-full overflow-hidden">
          <table className="w-full table-fixed text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold uppercase text-[11px]">
                {esAdminOSuper && <th className="w-[20%] py-3 px-4">Socio Titular</th>}
                <th className={esAdminOSuper ? "w-[22%] py-3 px-4" : "w-[28%] py-3 px-4"}>Nombre Completo de la Carga</th>
                <th className={esAdminOSuper ? "w-[14%] py-3 px-4" : "w-[16%] py-3 px-4"}>Parentesco y RUN</th>
                <th className={esAdminOSuper ? "w-[24%] py-3 px-4" : "w-[36%] py-3 px-4"}>Certificado / Antecedente</th>
                <th className={esAdminOSuper ? "w-[20%] py-3 px-4 text-right" : "w-[20%] py-3 px-4 text-right"}>Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargandoMisCargas ? (
                <tr>
                  <td colSpan={esAdminOSuper ? 5 : 4} className="py-6 text-center text-slate-400">
                    Cargando cargas familiares...
                  </td>
                </tr>
              ) : misCargas.length === 0 ? (
                <tr>
                  <td colSpan={esAdminOSuper ? 5 : 4} className="py-6 text-center text-slate-400">
                    No registra cargas familiares en su ficha. Use el botón «+ Agregar Nueva Carga Familiar» para inscribir una carga adjuntando su certificado.
                  </td>
                </tr>
              ) : (
                misCargas.map((carga) => (
                  <tr key={carga.id} className="hover:bg-slate-50/50 transition">
                    {esAdminOSuper && (
                      <td className="py-3.5 px-4 align-middle min-w-0">
                        <div className="font-semibold text-[#0f2942] truncate" title={carga.socioNombre || 'Socio Titular'}>
                          {carga.socioNombre || 'Socio Titular'}
                        </div>
                        {carga.socioRut && (
                          <div className="text-[11px] font-mono text-slate-400 truncate">RUN {carga.socioRut}</div>
                        )}
                      </td>
                    )}
                    <td className="py-3.5 px-4 font-semibold text-slate-800 align-middle min-w-0">
                      <div className="truncate" title={carga.nombre}>{carga.nombre}</div>
                    </td>
                    <td className="py-3.5 px-4 align-middle min-w-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-sky-50 text-[#006799] border border-sky-200/70 font-semibold text-[11px] whitespace-nowrap">
                        {carga.parentesco}
                      </span>
                      <div className="font-mono text-slate-600 text-[11px] mt-0.5 truncate">{carga.rut}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 align-middle min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="truncate max-w-[200px]" title={carga.certificadoTipo || carga.observacion || 'Incorporación inicial'}>
                          {carga.certificadoTipo || carga.observacion || 'Incorporación inicial'}
                        </span>
                        {carga.certificadoData && (
                          <button
                            type="button"
                            onClick={() =>
                              setCertificadoVisor({
                                titulo: carga.certificadoTipo || 'Certificado de Respaldo',
                                nombreArchivo: carga.certificadoNombre || 'certificado',
                                dataUrl: carga.certificadoData!,
                                cargaNombre: carga.nombre,
                                socioNombre: carga.socioNombre,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-sky-50 text-[#0f2942] hover:text-[#006799] border border-slate-200 hover:border-sky-300 text-[11px] font-semibold transition shadow-2xs cursor-pointer whitespace-nowrap"
                          >
                            <svg className="w-3.5 h-3.5 text-[#006799] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>Ver Cédula Frontal</span>
                          </button>
                        )}
                      </div>
                      {carga.estado === 'Rechazada' && (
                        <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 text-[11px] max-w-md">
                          <div className="font-bold flex items-center gap-1.5 text-rose-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            Motivo informado por Directorio:
                          </div>
                          <p className="mt-0.5 text-slate-700 italic truncate" title={carga.observacionesResolucion || 'Fotografía ilegible o antecedentes discordantes.'}>
                            «{carga.observacionesResolucion || 'Fotografía ilegible o antecedentes discordantes.'}»
                          </p>
                          <button
                            type="button"
                            onClick={() => handleAbrirSubsanacion(carga)}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0f2942] hover:bg-[#006799] text-white font-bold text-[10.5px] transition shadow-xs cursor-pointer"
                          >
                            <span>↻</span>
                            <span>Subsanar / Reintentar con nueva foto de carnet</span>
                          </button>
                        </div>
                      )}
                      {carga.estado === 'Pendiente de Revisión' && (
                        <div className="mt-1 text-[11px] text-amber-700 font-medium flex items-center gap-1">
                          <span>⏳</span>
                          <span>En evaluación por el Directorio de Bienestar</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${
                          carga.estado === 'Vigente'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : carga.estado === 'Rechazada'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            carga.estado === 'Vigente'
                              ? 'bg-emerald-500'
                              : carga.estado === 'Rechazada'
                              ? 'bg-rose-500'
                              : 'bg-amber-500 animate-pulse'
                          }`}
                        />
                        {carga.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Solicitar Nueva Carga Familiar con Certificado Obligatorio según Parentesco */}
      {modalNuevaCargaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200/80 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#0d9488] to-emerald-600" />
            <form onSubmit={handleSolicitarNuevaCarga} className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-[#006799] border border-sky-200">
                    SOLICITUD A LA DIRECTIVA
                  </span>
                  <h3 className="text-base font-extrabold text-[#0f2942] mt-1">
                    Agregar Nueva Carga Familiar
                  </h3>
                  <p className="text-xs text-slate-500">
                    Complete los datos de la carga y adjunte el certificado oficial según el vínculo familiar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalNuevaCargaOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5">
                {esDirectiva && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">
                      Atención Presencial Asistida en Oficina (Directiva)
                    </span>
                    <label className="block text-xs font-bold text-slate-700">
                      RUN del Socio Titular a quien se le inscribe la carga
                    </label>
                    <input
                      type="text"
                      value={socioAsistidoRut}
                      onChange={(e) => setSocioAsistidoRut(formatRun(e.target.value))}
                      placeholder="Ej: 13.579.246-2 (dejar vacío si es para usted)"
                      maxLength={12}
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006799] bg-white"
                    />
                    <span className="text-[10.5px] text-slate-500 block">
                      Permite ingresar la carga directamente a nombre de un socio que acudió con su carnet físico a la oficina.
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Completo de la Carga Familiar *
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevaCargaNombre}
                    onChange={(e) => setNuevaCargaNombre(e.target.value)}
                    placeholder="Ej: Lucas Valenzuela Gómez"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006799]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      RUN de la Carga *
                    </label>
                    <input
                      type="text"
                      required
                      value={nuevaCargaRun}
                      onChange={(e) => setNuevaCargaRun(formatRun(e.target.value))}
                      placeholder="Ej: 12.345.678-9"
                      maxLength={12}
                      className={`w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border focus:outline-none focus:ring-2 ${
                        runCargaInvalido
                          ? 'border-rose-300 bg-rose-50/40 focus:ring-rose-500'
                          : runCargaValido
                          ? 'border-emerald-300 bg-emerald-50/30 focus:ring-emerald-600'
                          : 'border-slate-200 focus:ring-[#006799]'
                      }`}
                    />
                    {runCargaInvalido && (
                      <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">
                        Dígito verificador inválido
                      </span>
                    )}
                    {runCargaValido && (
                      <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
                        ✓ RUN válido
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Parentesco / Vínculo *
                    </label>
                    <select
                      value={nuevaCargaParentesco}
                      onChange={(e) => setNuevaCargaParentesco(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
                    >
                      <option value="Hijo/a">Hijo/a</option>
                      <option value="Cónyuge">Cónyuge</option>
                      <option value="Padre / Madre">Padre / Madre</option>
                      <option value="Conviviente Civil">Conviviente Civil</option>
                      <option value="Otro vínculo legal">Otro vínculo legal</option>
                    </select>
                  </div>
                </div>

                {/* Fotografía Frontal de Cédula de Identidad */}
                <div className="rounded-2xl p-3.5 bg-sky-50/60 border border-sky-200/80 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#006799] block">
                        Fotografía Frontal de Cédula de Identidad (Carnet) *
                      </span>
                      <span className="text-xs font-bold text-[#0f2942] inline-flex items-center gap-1.5 mt-0.5">
                        <svg className="w-4 h-4 text-[#006799] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Cédula de Identidad (Frontal)</span>
                      </span>
                      <span className="text-[11px] text-slate-600 block mt-0.5">
                        Fotografía o escaneo claro del carnet de identidad por el frente para contrastar visualmente el RUN y nombre, evitando errores al autorizar.
                      </span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-dashed border-[#006799]/50 bg-white hover:bg-sky-50/40 transition cursor-pointer">
                      <div className="flex items-center gap-2 min-w-0">
                        {certificadoNombre ? (
                          <>
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold shrink-0">
                              ✓
                            </span>
                            <span className="text-xs font-bold text-emerald-700 truncate">
                              Foto cargada: {certificadoNombre}
                            </span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 text-[#006799] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span className="text-xs font-semibold text-[#006799] truncate">
                              Seleccionar foto frontal de carnet (JPG, PNG o PDF)
                            </span>
                          </>
                        )}
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-[#0f2942] text-white text-[11px] font-bold shrink-0">
                        Examinar
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        onChange={handleSeleccionarCertificado}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nota / Observación Adicional (Opcional)
                  </label>
                  <input
                    type="text"
                    value={nuevaCargaObservacion}
                    onChange={(e) => setNuevaCargaObservacion(e.target.value)}
                    placeholder="Ej: Se adjunta fotografía del carnet de identidad para contrastar datos"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006799]"
                  />
                </div>
              </div>

              {errorNuevaCarga && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {errorNuevaCarga}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalNuevaCargaOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviandoNuevaCarga}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0f2942] hover:bg-[#006799] transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {enviandoNuevaCarga ? 'Enviando solicitud...' : 'Enviar a Revisión de Directorio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ficha y Resolución de Solicitud de Carga Familiar (Al pinchar el N° de Solicitud) */}
      {cargaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200/80 overflow-hidden max-h-[92vh] flex flex-col">
            <div
              className={`h-1.5 w-full shrink-0 ${
                cargaSeleccionada.estado === 'Rechazada' || modoResolucionCarga === 'rechazar'
                  ? 'bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600'
                  : 'bg-gradient-to-r from-[#006799] via-[#0d9488] to-emerald-600'
              }`}
            />
            <form onSubmit={handleResolverCarga} className="p-6 space-y-4 overflow-y-auto">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        cargaSeleccionada.estado === 'Aprobada'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : cargaSeleccionada.estado === 'Rechazada'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {cargaSeleccionada.estado}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#006799]">
                      Solicitud {cargaSeleccionada.folio}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-[#0f2942] mt-1">
                    Incorporación de Carga Familiar: {cargaSeleccionada.nombreCompleto}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Socio Titular: <strong>{cargaSeleccionada.socioNombre}</strong> (RUN {cargaSeleccionada.socioRut})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCargaSeleccionada(null);
                    setModoResolucionCarga(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 text-xs grid grid-cols-2 gap-2.5">
                <div>
                  <span className="text-slate-400 block text-[11px]">Nueva Carga Familiar</span>
                  <span className="font-bold text-[#0f2942]">{cargaSeleccionada.nombreCompleto}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">RUN / Parentesco</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {cargaSeleccionada.run} • {cargaSeleccionada.parentesco || 'Hijo/a'}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Certificado Adjunto</span>
                    <span className="font-semibold text-slate-700">
                      {cargaSeleccionada.certificadoTipo || cargaSeleccionada.observacionSocio || 'Certificado de Respaldo'}
                    </span>
                  </div>
                  {cargaSeleccionada.certificadoData && (
                    <button
                      type="button"
                      onClick={() =>
                        setCertificadoVisor({
                          titulo: cargaSeleccionada.certificadoTipo || 'Certificado de Respaldo',
                          nombreArchivo: cargaSeleccionada.certificadoNombre || 'certificado',
                          dataUrl: cargaSeleccionada.certificadoData!,
                          cargaNombre: cargaSeleccionada.nombreCompleto,
                          socioNombre: cargaSeleccionada.socioNombre,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#006799] border border-sky-200 text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Ver Certificado Adjunto</span>
                    </button>
                  )}
                </div>
              </div>

              {cargaSeleccionada.estado === 'Pendiente de aprobación' && puedeResolver ? (
                <>
                  {/* Selector de Decisión dentro del modal */}
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Decisión de la Directiva
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => cambiarModoResolucionCarga('aprobar')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          modoResolucionCarga === 'aprobar'
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50/60'
                        }`}
                      >
                        <span>✓ Aprobar Carga</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => cambiarModoResolucionCarga('rechazar')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          modoResolucionCarga === 'rechazar'
                            ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50/60'
                        }`}
                      >
                        <span>✕ Rechazar Solicitud</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Fecha Sesión / Resolución *
                      </label>
                      <input
                        type="date"
                        required
                        value={fechaSesion}
                        onChange={(e) => setFechaSesion(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006799]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        N° Acta de Directorio
                      </label>
                      <input
                        type="text"
                        value={numeroActa}
                        onChange={(e) => setNumeroActa(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006799]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {modoResolucionCarga === 'aprobar'
                        ? 'Fundamento de Aprobación'
                        : 'Motivo de Rechazo *'}
                    </label>
                    <textarea
                      rows={2}
                      required={modoResolucionCarga === 'rechazar'}
                      value={obsResolucionCarga}
                      onChange={(e) => setObsResolucionCarga(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006799]"
                    />
                  </div>

                  {errorResolucionCarga && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                      {errorResolucionCarga}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setCargaSeleccionada(null);
                        setModoResolucionCarga(null);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={resolviendoCarga}
                      className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm cursor-pointer disabled:opacity-50 ${
                        modoResolucionCarga === 'aprobar'
                          ? 'bg-[#0f2942] hover:bg-[#006799]'
                          : 'bg-rose-700 hover:bg-rose-800'
                      }`}
                    >
                      {resolviendoCarga
                        ? 'Procesando...'
                        : modoResolucionCarga === 'aprobar'
                        ? '✓ Confirmar Aprobación de Carga'
                        : '✕ Confirmar Rechazo'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {cargaSeleccionada.observacionesResolucion && (
                    <div className="rounded-xl p-3.5 bg-white border border-slate-200 border-l-4 border-l-[#006799] text-xs space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-[#006799] block">
                        Resolución Registrada ({cargaSeleccionada.numeroActa || 'Acta'} • {cargaSeleccionada.fechaSesion || ''})
                      </span>
                      <p className="text-slate-700">{cargaSeleccionada.observacionesResolucion}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setCargaSeleccionada(null);
                        setModoResolucionCarga(null);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modal Visor de Certificado Adjunto (PDF o Imagen) */}
      {certificadoVisor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#0d9488] to-emerald-600 shrink-0" />
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#006799] block">
                  RESPALDO DOCUMENTAL DE CARGA FAMILIAR
                </span>
                <h3 className="text-sm font-extrabold text-[#0f2942]">
                  {certificadoVisor.titulo} • {certificadoVisor.cargaNombre}
                </h3>
                {certificadoVisor.socioNombre && (
                  <p className="text-[11px] text-slate-500">
                    Socio Titular: {certificadoVisor.socioNombre} • Archivo: {certificadoVisor.nombreArchivo}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setCertificadoVisor(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-50 flex-1 overflow-auto flex items-center justify-center min-h-[320px]">
              {certificadoVisor.dataUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={certificadoVisor.dataUrl}
                  title={certificadoVisor.nombreArchivo}
                  className="w-full h-[60vh] rounded-xl border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={certificadoVisor.dataUrl}
                  alt={certificadoVisor.titulo}
                  className="max-h-[60vh] w-auto object-contain rounded-xl border border-slate-200 shadow-sm bg-white"
                />
              )}
            </div>
            <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-2 bg-white">
              <a
                href={certificadoVisor.dataUrl}
                download={certificadoVisor.nombreArchivo}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#006799] bg-sky-50 hover:bg-sky-100 border border-sky-200 transition"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Descargar Certificado ({certificadoVisor.nombreArchivo})</span>
              </a>
              <button
                type="button"
                onClick={() => setCertificadoVisor(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resolución Modular (HU-02) */}
      <ModalResolucionAfiliacion
        solicitud={solicitudSeleccionada}
        modoResolucion={modoResolucion}
        fechaSesion={fechaSesion}
        setFechaSesion={setFechaSesion}
        numeroActa={numeroActa}
        setNumeroActa={setNumeroActa}
        observaciones={observaciones}
        setObservaciones={setObservaciones}
        resolviendo={resolviendo}
        errorModal={errorModal}
        onClose={cerrarModal}
        onSubmit={handleResolver}
      />

      {/* Modal Corporativo: Ficha Completa de la Solicitud de Incorporación */}
      {solicitudCorreo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200/80 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Franja institucional superior */}
            <div
              className={`h-1.5 w-full shrink-0 ${
                solicitudCorreo.estado === 'Aprobada'
                  ? 'bg-gradient-to-r from-[#006799] via-[#0d9488] to-emerald-600'
                  : solicitudCorreo.estado === 'Rechazada'
                  ? 'bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600'
                  : 'bg-gradient-to-r from-[#006799] to-sky-500'
              }`}
            />

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Cabecera */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3.5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                        solicitudCorreo.estado === 'Aprobada'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : solicitudCorreo.estado === 'Rechazada'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {solicitudCorreo.estado === 'Aprobada'
                        ? 'Solicitud Aceptada'
                        : solicitudCorreo.estado === 'Rechazada'
                        ? 'Solicitud Rechazada'
                        : 'Pendiente de Aprobación'}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#006799]">
                      Folio {solicitudCorreo.folio}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      • Ingreso: {new Date(solicitudCorreo.fechaIngreso).toLocaleDateString('es-CL')}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-[#0f2942] mt-1.5">
                    Solicitud de Incorporación al Comité de Bienestar
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSolicitudCorreo(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* 1. Antecedentes del Funcionario */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#006799]">
                  1. Antecedentes del Funcionario Postulante
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 text-xs">
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block text-[11px] font-medium">Nombre Completo</span>
                    <span className="font-bold text-[#0f2942]">{solicitudCorreo.nombreCompleto}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">RUN</span>
                    <span className="font-mono font-semibold text-slate-800">{solicitudCorreo.run}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Calidad y Grado</span>
                    <span className="font-semibold text-slate-800">
                      {solicitudCorreo.calidadContractual} · Grado {solicitudCorreo.grado}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[11px] font-medium">Correo Electrónico</span>
                    <span className="font-semibold text-[#006799] break-all">
                      {mailActivo?.destinatario || solicitudCorreo.email || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Cuota Autorizada</span>
                    <span className="font-semibold text-slate-800">
                      {solicitudCorreo.porcentajeDescuento || 4}% sueldo base
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Cargas Familiares Declaradas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#006799]">
                    2. Cargas Familiares Declaradas ({solicitudCorreo.cargas.length})
                  </h4>
                </div>
                {solicitudCorreo.cargas.length === 0 ? (
                  <div className="rounded-xl p-3 bg-slate-50/70 border border-slate-200/70 text-xs text-slate-500 italic">
                    El funcionario no declaró cargas familiares en esta solicitud.
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200/70 text-[10px] font-bold uppercase text-slate-500">
                          <th className="py-2 px-3">Nombre Completo de la Carga</th>
                          <th className="py-2 px-3">RUN</th>
                          <th className="py-2 px-3">Parentesco</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {solicitudCorreo.cargas.map((c, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{c.nombreCompleto}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">{c.run}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[#006799] border border-sky-200/70 font-semibold text-[11px]">
                                {c.parentesco || 'Carga legal'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 3. Cláusulas Aceptadas */}
              <div className="rounded-xl p-3.5 bg-slate-50/80 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                <span className="font-bold uppercase tracking-wider text-slate-500 block text-[10px]">
                  3. Declaraciones y Autorizaciones Firmadas Digitalmente
                </span>
                <p>✓ Tomó conocimiento de la cláusula de <strong>6 meses de carencia</strong> continua.</p>
                <p>✓ Autorizó el descuento por planilla del <strong>{solicitudCorreo.porcentajeDescuento || 4}% de su sueldo base</strong> como cuota social.</p>
              </div>

              {/* 4. Datos de Resolución si ya fue evaluada */}
              {(solicitudCorreo.fechaSesion || solicitudCorreo.observacionesResolucion || mailActivo?.motivo) && (
                <div className="rounded-xl p-3.5 bg-white border border-slate-200 border-l-4 border-l-[#006799] text-xs space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#006799]">
                      Resolución del Directorio
                    </span>
                    {solicitudCorreo.fechaSesion && (
                      <span className="text-[11px] font-semibold text-slate-600">
                        {solicitudCorreo.numeroActa || 'Sesión Ordinaria'} ({solicitudCorreo.fechaSesion})
                        {solicitudCorreo.fechaFinCarencia ? ` • Carencia hasta ${solicitudCorreo.fechaFinCarencia}` : ''}
                      </span>
                    )}
                  </div>
                  {(solicitudCorreo.observacionesResolucion || mailActivo?.motivo) && (
                    <p className="text-slate-700 leading-relaxed">
                      {solicitudCorreo.observacionesResolucion || mailActivo?.motivo}
                    </p>
                  )}
                </div>
              )}

              <div
                className={`rounded-xl px-4 py-3 border text-[11px] leading-relaxed ${
                  solicitudCorreo.estado === 'Aprobada'
                    ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
                    : solicitudCorreo.estado === 'Rechazada'
                    ? 'bg-rose-50/70 border-rose-200/80 text-rose-950'
                    : 'bg-sky-50/70 border-sky-200/80 text-sky-950'
                }`}
              >
                {solicitudCorreo.estado === 'Aprobada' ? (
                  <span>
                    <strong className="text-emerald-800">✔ Cuenta de socio habilitada:</strong> Por confidencialidad, el usuario y la contraseña temporal fueron enviados directamente al correo personal del funcionario (
                    <strong className="text-[#006799]">{mailActivo?.destinatario || solicitudCorreo.email}</strong>).
                  </span>
                ) : solicitudCorreo.estado === 'Rechazada' ? (
                  <span>
                    Se envió la notificación oficial con el motivo de la resolución al correo del funcionario (
                    <strong>{mailActivo?.destinatario || solicitudCorreo.email}</strong>).
                  </span>
                ) : (
                  <span>
                    Solicitud pendiente de evaluación. Revise los antecedentes y cargas declaradas antes de emitir la resolución del Directorio.
                  </span>
                )}
              </div>

              {/* Panel de Gestión de Resolución Directiva Integrada */}
              {solicitudCorreo.estado === 'Pendiente de aprobación' && puedeResolver && panelResolucionFicha && (
                <div
                  className={`p-4 rounded-2xl border space-y-3 animate-fade-in ${
                    panelResolucionFicha === 'aprobar'
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-rose-50/70 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        panelResolucionFicha === 'aprobar' ? 'text-emerald-800' : 'text-rose-800'
                      }`}
                    >
                      {panelResolucionFicha === 'aprobar'
                        ? 'Acuerdo de Directorio: Aprobar Incorporación'
                        : 'Acuerdo de Directorio: Rechazar Solicitud'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPanelResolucionFicha(null)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      ✕ Cancelar
                    </button>
                  </div>

                  {panelResolucionFicha === 'aprobar' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Fecha Sesión Ordinaria *
                        </label>
                        <input
                          type="date"
                          required
                          value={fechaSesion}
                          onChange={(e) => setFechaSesion(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006799]/20 focus:border-[#006799]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          N° Acta de Directorio
                        </label>
                        <input
                          type="text"
                          value={numeroActa}
                          onChange={(e) => setNumeroActa(e.target.value)}
                          placeholder="Ej: Acta N° 05-2026"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006799]/20 focus:border-[#006799]"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Motivo / Fundamento de Aprobación
                        </label>
                        <textarea
                          rows={2}
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          placeholder="Cumple requisitos reglamentarios de Planta/Contrata Municipal y autorización de descuento del 4% por planilla."
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006799]/20 focus:border-[#006799]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Motivo del Rechazo (Obligatorio) *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Detalle el motivo exacto del rechazo para notificar por correo al funcionario..."
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <p className="text-[11px] text-slate-500">
                      Se despachará correo automático a <strong className="text-slate-700">{solicitudCorreo.email}</strong>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPanelResolucionFicha(null)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={resolviendo || (panelResolucionFicha === 'rechazar' && !observaciones.trim())}
                        onClick={() => handleResolverFicha(panelResolucionFicha)}
                        className={`px-4 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs transition cursor-pointer ${
                          panelResolucionFicha === 'aprobar'
                            ? 'bg-emerald-700 hover:bg-emerald-800'
                            : 'bg-rose-700 hover:bg-rose-800'
                        } disabled:opacity-50`}
                      >
                        {resolviendo
                          ? 'Procesando...'
                          : panelResolucionFicha === 'aprobar'
                          ? '✓ Confirmar y Enviar Credenciales'
                          : '✕ Confirmar Rechazo'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Pie del modal: acciones según estado */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                <button
                  type="button"
                  disabled={reenviandoSmtp}
                  onClick={() => handleReenviarCorreoReal(solicitudCorreo.folio)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#006799] bg-sky-50 hover:bg-sky-100 border border-sky-200/80 transition cursor-pointer disabled:opacity-50"
                >
                  {reenviandoSmtp ? 'Reenviando...' : 'Reenviar notificación por correo'}
                </button>

                <div className="flex items-center gap-2">
                  {solicitudCorreo.estado === 'Pendiente de aprobación' && puedeResolver && !panelResolucionFicha && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setPanelResolucionFicha('rechazar');
                          setObservaciones(
                            'Inconsistencia en calidad contractual / antecedentes de cargas familiares incompletos para acreditar asignación.'
                          );
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                      >
                        ✕ Rechazar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPanelResolucionFicha('aprobar');
                          setFechaSesion(new Date().toISOString().split('T')[0]);
                          setNumeroActa('Acta Ordinaria N° 04-2026');
                          setObservaciones(
                            'Cumple requisitos reglamentarios de Planta/Contrata Municipal y autorización de descuento del 4% por planilla.'
                          );
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition cursor-pointer shadow-sm"
                      >
                        ✓ Aprobar Incorporación
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSolicitudCorreo(null);
                      setPanelResolucionFicha(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Carga Masiva de Socios y Cargas (Exclusivo 7 cuentas Muni Peralillo) */}
      <ModalCargaMasivaSocios
        isOpen={modalCargaMasivaOpen}
        onClose={() => setModalCargaMasivaOpen(false)}
        token={token}
        onSuccess={() => {
          cargarSolicitudes();
          cargarMisCargas();
          cargarSolicitudesCargas();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('solicitudes-updated'));
          }
        }}
      />
      <BuzonCorreosModal
        isOpen={buzonAbierto}
        onClose={() => setBuzonAbierto(false)}
      />
    </div>
  );
}
