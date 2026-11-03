'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';
import {
  EvaluacionDirectorioTable,
  SolicitudResumen,
} from '@/components/afiliacion/EvaluacionDirectorioTable';
import { ModalResolucionAfiliacion } from '@/components/afiliacion/ModalResolucionAfiliacion';
import { BuzonCorreosModal } from '@/components/ui/BuzonCorreosModal';

const ROLES_DIRECTIVA = ['presidente', 'secretario', 'tesorero', 'admin', 'auditor', 'superusuario'];
const ROLES_RESOLUTIVOS = ['presidente', 'secretario', 'superusuario'];

export default function AfiliacionPage() {
  const { user, token } = useAuth();
  const esDirectiva = !!user && (user.isSuperuser || ROLES_DIRECTIVA.includes(user.rol));
  const puedeResolver = !!user && (user.isSuperuser || ROLES_RESOLUTIVOS.includes(user.rol));

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

  // Modal de visualización del correo emitido (Confirmación / Aprobación con Clave / Rechazo)
  const [solicitudCorreo, setSolicitudCorreo] = useState<SolicitudResumen | null>(null);
  const [copiadoClave, setCopiadoClave] = useState(false);
  const [verTextoIntegro, setVerTextoIntegro] = useState(false);
  const [reenviandoSmtp, setReenviandoSmtp] = useState(false);
  const [buzonAbierto, setBuzonAbierto] = useState(false);

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
      if (res.notificacionEmail?.enviadoSmtp) {
        setMensajeExito(`¡Correo enviado por SMTP real a ${res.notificacionEmail.destinatario}! Revise su bandeja de entrada o carpeta de Spam.`);
      }
    } catch (err: any) {
      alert(err.message || 'Error al reenviar correo');
    } finally {
      setReenviandoSmtp(false);
    }
  };

  const cargarSolicitudes = () => {
    if (!esDirectiva || !token) return;
    setCargando(true);
    fetchFromApi<SolicitudResumen[]>('/afiliacion/solicitudes', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(setSolicitudes)
      .catch(() => setSolicitudes([]))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarSolicitudes();
  }, [esDirectiva, token]);

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
          ? `Solicitud ${solicitudSeleccionada.folio} APROBADA. Se activó la cuenta del socio con Clave Temporal y se envió el correo con los pasos de ingreso a ${res.notificacionEmail?.destinatario || res.email}.`
          : `Solicitud ${solicitudSeleccionada.folio} RECHAZADA. Se envió el correo de resolución con el motivo a ${res.notificacionEmail?.destinatario || res.email}.`
      );
      cerrarModal();
      setCopiadoClave(false);
      setVerTextoIntegro(false);
      setSolicitudCorreo(res);
      cargarSolicitudes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar resolución.';
      setErrorModal(msg);
    } finally {
      setResolviendo(false);
    }
  };

  const copiarClaveTemporal = (clave: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(clave);
      setCopiadoClave(true);
      setTimeout(() => setCopiadoClave(false), 2500);
    }
  };

  const cargas = [
    { id: 1, nombre: 'Valentina Valenzuela Gómez', parentesco: 'Hija', rut: '24.120.334-1', edad: '7 años', estado: 'Vigente' },
    { id: 2, nombre: 'Matías Valenzuela Gómez', parentesco: 'Hijo', rut: '26.445.892-3', edad: '4 años', estado: 'Vigente' },
  ];

  const mailActivo = solicitudCorreo?.notificacionEmail;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Afiliación y Cargas Familiares</h1>
          <p className="text-xs text-slate-500">
            Gestión de incorporación según acuerdos de sesión ordinaria, notificación por correo y registro de cargas
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/finanzas"
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-sm"
          >
            📋 Ver Nómina Retenciones (Finanzas)
          </Link>
          <Link
            href="/"
            className="px-4 py-2 text-xs font-semibold text-[#0077b6] bg-sky-50 hover:bg-sky-100 rounded-xl transition"
          >
            ← Volver al Dashboard
          </Link>
        </div>
      </div>

      {mensajeExito && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✔</span>
            <span>{mensajeExito}</span>
          </div>
          <button onClick={() => setMensajeExito(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Evaluación de Incorporaciones (HU-02) */}
      {esDirectiva && (
        <EvaluacionDirectorioTable
          solicitudes={solicitudes}
          cargando={cargando}
          puedeResolver={puedeResolver}
          onAbrirModal={abrirModal}
          onAbrirBuzonGeneral={() => setBuzonAbierto(true)}
          onVerCorreo={(sol) => {
            setCopiadoClave(false);
            setVerTextoIntegro(false);
            setSolicitudCorreo(sol);
          }}
        />
      )}

      <BuzonCorreosModal
        isOpen={buzonAbierto}
        onClose={() => setBuzonAbierto(false)}
      />

      {/* Cargas Familiares Reconocidas */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800">Cargas Familiares Reconocidas del Socio Titular</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold uppercase">
                <th className="py-3 px-4">Nombre Completo</th>
                <th className="py-3 px-4">Parentesco</th>
                <th className="py-3 px-4">RUT</th>
                <th className="py-3 px-4">Edad</th>
                <th className="py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargas.map((carga) => (
                <tr key={carga.id}>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{carga.nombre}</td>
                  <td className="py-3.5 px-4 text-slate-600">{carga.parentesco}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{carga.rut}</td>
                  <td className="py-3.5 px-4 text-slate-600">{carga.edad}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {carga.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* Modal de Correo Oficial Emitido (Confirmación / Aprobación con Credenciales / Rechazo con Motivo) */}
      {solicitudCorreo && mailActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-slate-100 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Cabecera del correo */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-sm ${
                    solicitudCorreo.estado === 'Aprobada'
                      ? 'bg-emerald-600 text-white'
                      : solicitudCorreo.estado === 'Rechazada'
                      ? 'bg-rose-600 text-white'
                      : 'bg-sky-600 text-white'
                  }`}
                >
                  ✉️
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Notificación Oficial por Correo Electrónico
                    </span>
                    {mailActivo.enviadoSmtp ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ✔ Enviado por SMTP Real a Bandeja de Entrada
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Comprobante en Plataforma (Falta configurar SMTP en Admin)
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-extrabold text-slate-800 mt-0.5">
                    {mailActivo.asunto}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSolicitudCorreo(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Metadatos De / Para / Folio */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Destinatario (Para)</span>
                <span className="font-bold text-slate-800">{mailActivo.destinatario}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Funcionario / RUN</span>
                <span className="font-semibold text-slate-700">
                  {solicitudCorreo.nombreCompleto} ({solicitudCorreo.run})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Solicitud N°</span>
                <span className="font-mono font-bold text-slate-800">{solicitudCorreo.folio}</span>
              </div>
            </div>

            {/* Estado Principal: Solicitud N° tanto fue ACEPTADA / RECHAZADA - Motivo */}
            <div
              className={`rounded-2xl p-4 border ${
                solicitudCorreo.estado === 'Aprobada'
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  : solicitudCorreo.estado === 'Rechazada'
                  ? 'bg-rose-50/90 border-rose-200 text-rose-950'
                  : 'bg-amber-50/90 border-amber-200 text-amber-950'
              }`}
            >
              <p className="text-xs font-extrabold uppercase tracking-wider mb-1">
                {solicitudCorreo.estado === 'Aprobada'
                  ? `✔ Solicitud N° ${solicitudCorreo.folio} fue ACEPTADA`
                  : solicitudCorreo.estado === 'Rechazada'
                  ? `✕ Solicitud N° ${solicitudCorreo.folio} fue RECHAZADA`
                  : `⏳ Solicitud N° ${solicitudCorreo.folio} EN GESTIÓN (Pendiente de Aprobación)`}
              </p>
              <p className="text-xs leading-relaxed">
                <strong>Motivo / Detalle:</strong>{' '}
                {mailActivo.motivo ||
                  solicitudCorreo.observacionesResolucion ||
                  mailActivo.resumenEstado}
              </p>
            </div>

            {/* Credenciales Iniciales si fue Aprobada */}
            {mailActivo.credencialesAcceso && (
              <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/60 via-white to-sky-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                      🔑 Credenciales Iniciales Enviadas al Nuevo Socio
                    </span>
                    <h4 className="text-sm font-bold text-slate-800">
                      Acceso habilitado con Clave Temporal de 1 solo uso
                    </h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Exige cambio en 1er ingreso
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Usuario (RUT)</span>
                    <span className="font-mono font-bold text-slate-800 text-sm">
                      {mailActivo.credencialesAcceso.usuarioRut}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">O Correo</span>
                    <span className="font-semibold text-slate-800 truncate block">
                      {mailActivo.credencialesAcceso.usuarioEmail}
                    </span>
                  </div>
                  <div className="bg-emerald-950 text-white p-3 rounded-xl flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-emerald-300 uppercase font-bold block">
                        Contraseña Temporal
                      </span>
                      <span className="font-mono font-extrabold text-sm tracking-wide text-white">
                        {mailActivo.credencialesAcceso.claveTemporal}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copiarClaveTemporal(mailActivo.credencialesAcceso!.claveTemporal)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition cursor-pointer"
                    >
                      {copiadoClave ? '✓ Copiada' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pasos a seguir incluidos en el correo */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
              <p className="text-xs font-bold text-slate-800">
                📋 Pasos a seguir informados en el correo al funcionario:
              </p>
              <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-700 leading-relaxed">
                {mailActivo.pasosSeguir.map((paso, i) => (
                  <li key={i}>{paso}</li>
                ))}
              </ol>
            </div>

            {/* Vista íntegra del cuerpo del correo */}
            <div>
              <button
                type="button"
                onClick={() => setVerTextoIntegro((v) => !v)}
                className="text-xs font-semibold text-sky-700 hover:text-sky-900 underline cursor-pointer"
              >
                {verTextoIntegro ? '▲ Ocultar texto íntegro del correo' : '▼ Ver texto íntegro del correo electrónico'}
              </button>
              {verTextoIntegro && (
                <pre className="mt-2.5 p-4 rounded-2xl bg-slate-900 text-slate-100 text-[11px] font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                  {mailActivo.cuerpoTexto}
                </pre>
              )}
            </div>

            {!mailActivo.enviadoSmtp && (
              <div className="rounded-2xl bg-sky-50 border border-sky-200 p-3.5 text-xs text-sky-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-bold">💡 ¿Desea que este correo llegue al buzón real ({mailActivo.destinatario})?</p>
                  <p className="text-[11px] text-sky-800 mt-0.5">
                    Configure el correo remitente (<code>SMTP_USER</code> y <code>SMTP_PASSWORD</code>) en{' '}
                    <Link href="/admin" className="underline font-bold">
                      Administración → Parámetros Base
                    </Link>{' '}
                    y luego presione <strong>&quot;Enviar a Bandeja Real&quot;</strong>.
                    {mailActivo.errorSmtp && (
                      <span className="block text-rose-700 font-semibold mt-1">
                        Detalle SMTP: {mailActivo.errorSmtp}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={reenviandoSmtp}
                  onClick={() => handleReenviarCorreoReal(solicitudCorreo.folio)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 transition whitespace-nowrap shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {reenviandoSmtp ? 'Enviando SMTP...' : '📨 Enviar a Bandeja Real'}
                </button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              {mailActivo.enviadoSmtp && (
                <button
                  type="button"
                  disabled={reenviandoSmtp}
                  onClick={() => handleReenviarCorreoReal(solicitudCorreo.folio)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition cursor-pointer"
                >
                  {reenviandoSmtp ? 'Reenviando...' : '📨 Reenviar copia al correo'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSolicitudCorreo(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition"
              >
                Entendido / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
