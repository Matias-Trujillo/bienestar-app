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

  // Modal de detalle de resolución
  const [solicitudCorreo, setSolicitudCorreo] = useState<SolicitudResumen | null>(null);
  const [reenviandoSmtp, setReenviandoSmtp] = useState(false);

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
          ? `Solicitud ${solicitudSeleccionada.folio} aceptada correctamente. Las credenciales de acceso fueron enviadas de forma privada al correo ${res.notificacionEmail?.destinatario || res.email}.`
          : `Solicitud ${solicitudSeleccionada.folio} rechazada. Se notificó el detalle de la resolución al correo ${res.notificacionEmail?.destinatario || res.email}.`
      );
      cerrarModal();
      setSolicitudCorreo(res);
      cargarSolicitudes();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('solicitudes-updated'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar resolución.';
      setErrorModal(msg);
    } finally {
      setResolviendo(false);
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
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-sky-50/60 border border-emerald-200/80 border-l-4 border-l-emerald-600 text-emerald-950 text-xs font-medium flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[11px] font-bold">
              ✓
            </span>
            <span>{mensajeExito}</span>
          </div>
          <button
            onClick={() => setMensajeExito(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
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
          onVerCorreo={(sol) => {
            setSolicitudCorreo(sol);
          }}
        />
      )}

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
                  {solicitudCorreo.estado === 'Pendiente de aprobación' && puedeResolver && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const sol = solicitudCorreo;
                          setSolicitudCorreo(null);
                          abrirModal(sol, 'rechazar');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                      >
                        ✕ Rechazar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const sol = solicitudCorreo;
                          setSolicitudCorreo(null);
                          abrirModal(sol, 'aprobar');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition cursor-pointer shadow-sm"
                      >
                        ✓ Aprobar Incorporación
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setSolicitudCorreo(null)}
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
    </div>
  );
}
