'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';

interface CargaInfo {
  nombreCompleto: string;
  run: string;
  parentesco?: string | null;
}

interface SolicitudResumen {
  folio: string;
  estado: string;
  fechaIngreso: string;
  nombreCompleto: string;
  run: string;
  grado: string;
  calidadContractual: string;
  email?: string | null;
  porcentajeDescuento: number;
  cargas: CargaInfo[];
  fechaSesion?: string | null;
  numeroActa?: string | null;
  fechaFinCarencia?: string | null;
  observacionesResolucion?: string | null;
  resueltoPor?: string | null;
  resueltoAt?: string | null;
}

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
      setObservaciones('Inconsistencia en calidad contractual / antecedentes de cargas familiares incompletos para acreditar asignación.');
    } else {
      setObservaciones('');
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
      await fetchFromApi(`/afiliacion/solicitudes/${solicitudSeleccionada.folio}/resolucion`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accion: modoResolucion,
          fechaSesion: fechaSesion,
          numeroActa: numeroActa,
          observaciones: observaciones,
        }),
      });

      setMensajeExito(
        modoResolucion === 'aprobar'
          ? `Solicitud ${solicitudSeleccionada.folio} aprobada con éxito. El funcionario es ahora Socio Activo con cómputo de 6 meses de carencia y nómina de retenciones asignada.`
          : `Solicitud ${solicitudSeleccionada.folio} rechazada. Se registró la causal para notificación formal.`
      );
      cerrarModal();
      cargarSolicitudes();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Afiliación y Cargas Familiares</h1>
          <p className="text-xs text-slate-500">Gestión de incorporación según acuerdos de sesión ordinaria y registro de cargas</p>
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
            className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition"
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

      {esDirectiva && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Sesión de Directorio: Evaluación de Incorporaciones (HU-02)
              </h2>
              <p className="text-xs text-slate-500">
                Rol autorizado: Presidente/a o Secretario/a según acta ordinaria de sesión.
              </p>
            </div>
            <Link href="/afiliacion/solicitud" className="text-xs font-semibold text-emerald-700 hover:underline">
              + Abrir formulario público (HU-01) →
            </Link>
          </div>

          {cargando && !solicitudes ? (
            <p className="text-xs text-slate-400">Cargando solicitudes...</p>
          ) : !solicitudes || solicitudes.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No hay solicitudes recepcionadas en el sistema.</p>
          ) : (
            <div className="overflow-x-auto">
              <table id="tabla-solicitudes" className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold uppercase">
                    <th className="py-3 px-4">Folio</th>
                    <th className="py-3 px-4">Fecha Ingreso</th>
                    <th className="py-3 px-4">Funcionario</th>
                    <th className="py-3 px-4">RUN</th>
                    <th className="py-3 px-4">Grado / Calidad</th>
                    <th className="py-3 px-4">Cargas Legales</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Detalle / Carencia</th>
                    <th className="py-3 px-4 text-center">Acciones Sesión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {solicitudes.map((s) => (
                    <tr key={s.folio} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{s.folio}</td>
                      <td className="py-3.5 px-4 text-slate-600">{new Date(s.fechaIngreso).toLocaleDateString('es-CL')}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{s.nombreCompleto}</div>
                        {s.email && <div className="text-[10px] text-slate-400">{s.email}</div>}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{s.run}</td>
                      <td className="py-3.5 px-4 text-slate-600">{s.grado} • {s.calidadContractual}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700">{s.cargas.length} cargas</span>
                        {s.cargas.length > 0 && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[130px]" title={s.cargas.map(c => c.nombreCompleto).join(', ')}>
                            {s.cargas.map(c => c.nombreCompleto.split(' ')[0]).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${
                            s.estado === 'Aprobada'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : s.estado === 'Rechazada'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {s.estado}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        {s.estado === 'Aprobada' && s.fechaFinCarencia ? (
                          <div>
                            <div className="text-emerald-700 font-semibold">Carencia hasta: {s.fechaFinCarencia}</div>
                            <div className="text-slate-400 text-[10px]">Acta: {s.numeroActa || 'S/N'} ({s.fechaSesion})</div>
                          </div>
                        ) : s.estado === 'Rechazada' ? (
                          <div className="text-rose-600 truncate max-w-[150px]" title={s.observacionesResolucion || ''}>
                            Obs: {s.observacionesResolucion}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Pendiente de sesión</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {s.estado === 'Pendiente de aprobación' ? (
                          puedeResolver ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => abrirModal(s, 'aprobar')}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm"
                                title="Aprobar en sesión de directorio"
                              >
                                Aprobar
                              </button>
                              <button
                                onClick={() => abrirModal(s, 'rechazar')}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                                title="Rechazar con observaciones"
                              >
                                Rechazar
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Solo Presidente/Secretario</span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400">Resuelto por {s.resueltoPor?.split(' ')[0] || 'Directorio'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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

      {/* Modal de Resolución de Solicitud (HU-02) */}
      {solicitudSeleccionada && modoResolucion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  modoResolucion === 'aprobar' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {modoResolucion === 'aprobar' ? 'Acuerdo: Aprobar Incorporación' : 'Acuerdo: Rechazar Solicitud'}
                </span>
                <h3 className="text-lg font-bold text-slate-800 mt-1">
                  Solicitud {solicitudSeleccionada.folio}
                </h3>
                <p className="text-xs text-slate-500">
                  Postulante: {solicitudSeleccionada.nombreCompleto} (RUN: {solicitudSeleccionada.run})
                </p>
              </div>
              <button onClick={cerrarModal} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleResolver} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha Sesión Ordinaria *
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaSesion}
                    onChange={(e) => setFechaSesion(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {modoResolucion === 'aprobar' ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                  <p className="font-bold">Efectos inmediatos de la Aprobación (HU-02):</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>El funcionario pasa a estado <strong>&quot;Socio Activo&quot;</strong>.</li>
                    <li>Se fija el cómputo exacto de los <strong>6 meses de carencia</strong> para percibir beneficios (a partir de la fecha de sesión).</li>
                    <li>Se incorpora a la nómina de retenciones de Finanzas / RRHH con el <strong>4% del sueldo base</strong>.</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Causal de Rechazo y Observaciones Manuales *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Detalle de inconsistencias contractuales o de cargas para notificación por correo al funcionario..."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Se enviará notificación formal con estas observaciones al funcionario para su subsanación.
                  </p>
                </div>
              )}

              {errorModal && (
                <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
                  {errorModal}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resolviendo}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition disabled:opacity-50 ${
                    modoResolucion === 'aprobar'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  {resolviendo
                    ? 'Procesando...'
                    : modoResolucion === 'aprobar'
                    ? 'Confirmar y Habilitar Socio'
                    : 'Registrar Rechazo y Notificar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
