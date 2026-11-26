'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';
import { isValidRun, getErrorMessage } from '@/lib/utils';
import {
  EvaluacionDirectorioTable,
  SolicitudResumen,
} from '@/components/afiliacion/EvaluacionDirectorioTable';
import { ModalResolucionAfiliacion } from '@/components/afiliacion/ModalResolucionAfiliacion';
import {
  ModalCargaMasivaSocios,
  esCuentaAutorizadaCargaMasiva,
} from '@/components/admin/ModalCargaMasivaSocios';
import { ModalCrearSocioDirecto } from '@/components/afiliacion/ModalCrearSocioDirecto';
import { MisCargasSection } from '@/components/afiliacion/MisCargasSection';
import { SolicitudesCargasDirectorioSection } from '@/components/afiliacion/SolicitudesCargasDirectorioSection';
import { ModalNuevaCargaFamiliar } from '@/components/afiliacion/ModalNuevaCargaFamiliar';
import { ModalResolucionCargaFamiliar } from '@/components/afiliacion/ModalResolucionCargaFamiliar';
import { ModalVisorCertificadoCarga } from '@/components/afiliacion/ModalVisorCertificadoCarga';
import { ModalFichaSolicitudAfiliacion } from '@/components/afiliacion/ModalFichaSolicitudAfiliacion';
import {
  CargaSocioItem,
  CertificadoVisorData,
  SolicitudCargaItem,
} from '@/components/afiliacion/types';

const ROLES_DIRECTIVA = ['presidente', 'secretario', 'tesorero', 'admin', 'auditor', 'superusuario'];
const ROLES_RESOLUTIVOS = ['presidente', 'secretario', 'admin', 'superusuario'];

function notificarActualizacionGlobal(type: 'SOLICITUD_CREADA' | 'SOLICITUD_APROBADA', payload: Record<string, string>) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('solicitudes-updated'));
  try {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('bienestar_alertas_channel');
      bc.postMessage({ type, ...payload });
      bc.close();
    }
  } catch {}
}

export default function AfiliacionPage() {
  const { user, token, isAdminView, viewMode } = useAuth();
  const esDirectiva = !!user && isAdminView && (user.isSuperuser || ROLES_DIRECTIVA.includes(user.rol));
  const puedeResolver = !!user && isAdminView && (user.isSuperuser || ROLES_RESOLUTIVOS.includes(user.rol));
  const esAdminOSuper = !!user && isAdminView && (user.isSuperuser || user.rol === 'admin' || user.rol === 'superusuario');
  const esCargaPropia = (sc: SolicitudCargaItem): boolean =>
    Boolean(
      user &&
        (sc.socioId === Number(user.id) ||
          (sc.socioRut &&
            user.rut &&
            sc.socioRut.replace(/[^0-9kK]/gi, '').toUpperCase() ===
              user.rut.replace(/[^0-9kK]/gi, '').toUpperCase()))
    );

  const [solicitudes, setSolicitudes] = useState<SolicitudResumen[] | null>(null);
  const [cargando, setCargando] = useState(false);

  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudResumen | null>(null);
  const [modoResolucion, setModoResolucion] = useState<'aprobar' | 'rechazar' | null>(null);
  const [fechaSesion, setFechaSesion] = useState(new Date().toISOString().split('T')[0]);
  const [numeroActa, setNumeroActa] = useState('Acta Ordinaria N° 04-2026');
  const [observaciones, setObservaciones] = useState('');
  const [resolviendo, setResolviendo] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const [solicitudCorreo, setSolicitudCorreo] = useState<SolicitudResumen | null>(null);
  const [panelResolucionFicha, setPanelResolucionFicha] = useState<'aprobar' | 'rechazar' | null>(null);
  const [reenviandoSmtp, setReenviandoSmtp] = useState(false);

  const [misCargas, setMisCargas] = useState<CargaSocioItem[]>([]);
  const [cargandoMisCargas, setCargandoMisCargas] = useState(false);
  const [solicitudesCargas, setSolicitudesCargas] = useState<SolicitudCargaItem[]>([]);
  const [cargandoSolCargas, setCargandoSolCargas] = useState(false);

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

  const [certificadoVisor, setCertificadoVisor] = useState<CertificadoVisorData | null>(null);

  const [cargaSeleccionada, setCargaSeleccionada] = useState<SolicitudCargaItem | null>(null);
  const [modoResolucionCarga, setModoResolucionCarga] = useState<'aprobar' | 'rechazar' | null>(null);
  const [obsResolucionCarga, setObsResolucionCarga] = useState('');
  const [resolviendoCarga, setResolviendoCarga] = useState(false);
  const [errorResolucionCarga, setErrorResolucionCarga] = useState<string | null>(null);

  const [modalCargaMasivaOpen, setModalCargaMasivaOpen] = useState(false);
  const [modalCrearSocioOpen, setModalCrearSocioOpen] = useState(false);
  const puedeCargaMasiva = Boolean(esDirectiva && esCuentaAutorizadaCargaMasiva(user?.email, user?.rut));
  const puedeCrearSocio = Boolean(
    esDirectiva &&
      user &&
      (user.isSuperuser || ['superusuario', 'admin', 'presidente', 'secretario', 'tesorero'].includes(user.rol))
  );

  useEffect(() => {
    setMensajeExito(null);
    setErrorModal(null);
    setErrorNuevaCarga(null);
    setErrorResolucionCarga(null);
    setSolicitudSeleccionada(null);
    setCargaSeleccionada(null);
  }, [viewMode]);

  const cargarMisCargas = useCallback(() => {
    if (!token) return;
    setCargandoMisCargas(true);
    const modoParam = isAdminView ? '?modo=admin' : '?modo=socio';
    fetchFromApi<{ cargas: CargaSocioItem[] }>(`/afiliacion/mis-cargas${modoParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => setMisCargas(res.cargas || []))
      .catch(() => setMisCargas([]))
      .finally(() => setCargandoMisCargas(false));
  }, [token, isAdminView, viewMode]);

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

  const handleReenviarCorreoReal = async (folio: string) => {
    if (!token) return;
    setReenviandoSmtp(true);
    try {
      const res = await fetchFromApi<SolicitudResumen>(`/afiliacion/solicitudes/${folio}/reenviar-correo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setSolicitudCorreo(res);
      setMensajeExito(`Notificación reenviada correctamente al correo ${res.notificacionEmail?.destinatario || res.email}.`);
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Error al reenviar correo');
    } finally {
      setReenviandoSmtp(false);
    }
  };

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
      setErrorNuevaCarga('RUN inválido.');
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
      notificarActualizacionGlobal('SOLICITUD_CREADA', { folio: creada.folio });
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
    setObsResolucionCarga(
      modoInicial === 'aprobar'
        ? `Acredita vínculo legal mediante ${sc.certificadoTipo || 'certificado oficial'} conforme al Reglamento del Servicio de Bienestar.`
        : 'El documento adjunto es ilegible o no corresponde al certificado exigido para acreditar el vínculo.'
    );
  };

  const cambiarModoResolucionCarga = (modo: 'aprobar' | 'rechazar') => {
    setModoResolucionCarga(modo);
    setErrorResolucionCarga(null);
    setObsResolucionCarga(
      modo === 'aprobar'
        ? `Acredita vínculo legal mediante ${cargaSeleccionada?.certificadoTipo || 'certificado oficial'} conforme al Reglamento del Servicio de Bienestar.`
        : 'El documento adjunto es ilegible o no corresponde al certificado exigido para acreditar el vínculo.'
    );
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
      notificarActualizacionGlobal('SOLICITUD_APROBADA', { modulo: 'afiliacion', folio: folioCarga, accion: accionCarga });
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
    setObservaciones(
      modo === 'rechazar'
        ? 'Inconsistencia en calidad contractual / antecedentes de cargas familiares incompletos para acreditar asignación.'
        : 'Cumple requisitos reglamentarios de Planta/Contrata Municipal y autorización de descuento del 4% por planilla.'
    );
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
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ accion: modoResolucion, fechaSesion, numeroActa, observaciones }),
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
      notificarActualizacionGlobal('SOLICITUD_APROBADA', { modulo: 'afiliacion', folio: folioRes, accion: accionRes });
    } catch (err: unknown) {
      setErrorModal(err instanceof Error ? err.message : 'Error al registrar resolución.');
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
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ accion, fechaSesion, numeroActa, observaciones }),
        }
      );
      setMensajeExito(
        accion === 'aprobar'
          ? `Solicitud ${solicitudCorreo.folio} aprobada exitosamente. Las credenciales fueron enviadas a ${res.notificacionEmail?.destinatario || res.email}.`
          : `Solicitud ${solicitudCorreo.folio} rechazada. Se notificó al correo ${res.notificacionEmail?.destinatario || res.email}.`
      );
      setPanelResolucionFicha(null);
      setSolicitudCorreo(res);
      cargarSolicitudes();
      notificarActualizacionGlobal('SOLICITUD_APROBADA', {
        modulo: 'afiliacion',
        folio: res.folio,
        accion: accion === 'aprobar' ? 'APROBAR' : 'RECHAZAR',
      });
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Error al registrar la resolución.');
    } finally {
      setResolviendo(false);
    }
  };

  const cargasPendientesCount = solicitudesCargas.filter((sc) => sc.estado === 'Pendiente de aprobación').length;
  const runCargaValido = nuevaCargaRun.trim().length > 0 && isValidRun(nuevaCargaRun);
  const runCargaInvalido = nuevaCargaRun.replace(/[^0-9kK]/g, '').length >= 8 && !isValidRun(nuevaCargaRun);

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
                title="Importar nómina masiva de socios y cargas en formato CSV"
              >
                <svg className="w-3.5 h-3.5 text-sky-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Carga Masiva CSV</span>
              </button>
            )}
            {puedeCrearSocio && (
              <button
                type="button"
                onClick={() => setModalCrearSocioOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#166534] to-[#558b2f] hover:opacity-95 rounded-xl border border-emerald-400/30 shadow-xs transition-all whitespace-nowrap cursor-pointer"
                title="Crear directamente la cuenta de acceso para un funcionario socio"
              >
                <UserPlus className="w-3.5 h-3.5 shrink-0" />
                <span>+ Crear Cuenta de Socio</span>
              </button>
            )}
            {!esDirectiva && (
              <Link
                href="/"
                className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-slate-100 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl transition-colors whitespace-nowrap"
              >
                ← Hoja Socio
              </Link>
            )}
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

      {esDirectiva && (
        <SolicitudesCargasDirectorioSection
          solicitudesCargas={solicitudesCargas}
          cargando={cargandoSolCargas}
          pendientesCount={cargasPendientesCount}
          esCargaPropia={esCargaPropia}
          onAbrirFicha={(sc) => abrirFichaCarga(sc, 'aprobar')}
        />
      )}

      {!esDirectiva && (
        <MisCargasSection
          esAdminOSuper={esAdminOSuper}
          usuarioNombre={user?.nombreCompleto}
          usuarioRut={user?.rut}
          cargando={cargandoMisCargas}
          cargas={misCargas}
          onAbrirNuevaCarga={() => {
            setErrorNuevaCarga(null);
            setCertificadoNombre('');
            setCertificadoData('');
            setModalNuevaCargaOpen(true);
          }}
          onVerCertificado={setCertificadoVisor}
          onAbrirSubsanacion={handleAbrirSubsanacion}
        />
      )}

      <ModalNuevaCargaFamiliar
        isOpen={modalNuevaCargaOpen}
        esDirectiva={esDirectiva}
        socioAsistidoRut={socioAsistidoRut}
        setSocioAsistidoRut={setSocioAsistidoRut}
        nuevaCargaNombre={nuevaCargaNombre}
        setNuevaCargaNombre={setNuevaCargaNombre}
        nuevaCargaRun={nuevaCargaRun}
        setNuevaCargaRun={setNuevaCargaRun}
        nuevaCargaParentesco={nuevaCargaParentesco}
        setNuevaCargaParentesco={setNuevaCargaParentesco}
        nuevaCargaObservacion={nuevaCargaObservacion}
        setNuevaCargaObservacion={setNuevaCargaObservacion}
        certificadoNombre={certificadoNombre}
        runCargaValido={runCargaValido}
        runCargaInvalido={runCargaInvalido}
        errorNuevaCarga={errorNuevaCarga}
        enviandoNuevaCarga={enviandoNuevaCarga}
        onSeleccionarCertificado={handleSeleccionarCertificado}
        onSubmit={handleSolicitarNuevaCarga}
        onClose={() => setModalNuevaCargaOpen(false)}
      />

      <ModalResolucionCargaFamiliar
        cargaSeleccionada={cargaSeleccionada}
        modoResolucionCarga={modoResolucionCarga}
        puedeResolver={puedeResolver}
        fechaSesion={fechaSesion}
        setFechaSesion={setFechaSesion}
        numeroActa={numeroActa}
        setNumeroActa={setNumeroActa}
        obsResolucionCarga={obsResolucionCarga}
        setObsResolucionCarga={setObsResolucionCarga}
        errorResolucionCarga={errorResolucionCarga}
        resolviendoCarga={resolviendoCarga}
        onCambiarModo={cambiarModoResolucionCarga}
        onVerCertificado={setCertificadoVisor}
        onSubmit={handleResolverCarga}
        onClose={() => {
          setCargaSeleccionada(null);
          setModoResolucionCarga(null);
        }}
      />

      <ModalVisorCertificadoCarga
        certificadoVisor={certificadoVisor}
        onClose={() => setCertificadoVisor(null)}
      />

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

      <ModalFichaSolicitudAfiliacion
        solicitud={solicitudCorreo}
        puedeResolver={puedeResolver}
        panelResolucionFicha={panelResolucionFicha}
        setPanelResolucionFicha={setPanelResolucionFicha}
        fechaSesion={fechaSesion}
        setFechaSesion={setFechaSesion}
        numeroActa={numeroActa}
        setNumeroActa={setNumeroActa}
        observaciones={observaciones}
        setObservaciones={setObservaciones}
        resolviendo={resolviendo}
        reenviandoSmtp={reenviandoSmtp}
        onResolverFicha={handleResolverFicha}
        onReenviarCorreo={handleReenviarCorreoReal}
        onClose={() => {
          setSolicitudCorreo(null);
          setPanelResolucionFicha(null);
        }}
      />

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
      <ModalCrearSocioDirecto
        isOpen={modalCrearSocioOpen}
        token={token}
        onClose={() => setModalCrearSocioOpen(false)}
        onSuccess={(msg) => {
          setMensajeExito(msg);
          setTimeout(() => setMensajeExito(null), 6000);
          cargarSolicitudes();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('solicitudes-updated'));
          }
        }}
      />
    </div>
  );
}
