'use client';

import React from 'react';
import { SolicitudResumen } from './EvaluacionDirectorioTable';

interface ModalFichaSolicitudAfiliacionProps {
  solicitud: SolicitudResumen | null;
  puedeResolver: boolean;
  panelResolucionFicha: 'aprobar' | 'rechazar' | null;
  setPanelResolucionFicha: (m: 'aprobar' | 'rechazar' | null) => void;
  fechaSesion: string;
  setFechaSesion: (v: string) => void;
  numeroActa: string;
  setNumeroActa: (v: string) => void;
  observaciones: string;
  setObservaciones: (v: string) => void;
  resolviendo: boolean;
  reenviandoSmtp: boolean;
  onResolverFicha: (accion: 'aprobar' | 'rechazar') => void;
  onReenviarCorreo: (folio: string) => void;
  onClose: () => void;
}

export const ModalFichaSolicitudAfiliacion: React.FC<ModalFichaSolicitudAfiliacionProps> = ({
  solicitud,
  puedeResolver,
  panelResolucionFicha,
  setPanelResolucionFicha,
  fechaSesion,
  setFechaSesion,
  numeroActa,
  setNumeroActa,
  observaciones,
  setObservaciones,
  resolviendo,
  reenviandoSmtp,
  onResolverFicha,
  onReenviarCorreo,
  onClose,
}) => {
  if (!solicitud) return null;

  const mailActivo = solicitud.notificacionEmail;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200/80 overflow-hidden max-h-[92vh] flex flex-col">
        <div
          className={`h-1.5 w-full shrink-0 ${
            solicitud.estado === 'Aprobada'
              ? 'bg-gradient-to-r from-[#006799] via-[#0d9488] to-emerald-600'
              : solicitud.estado === 'Rechazada'
              ? 'bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600'
              : 'bg-gradient-to-r from-[#006799] to-sky-500'
          }`}
        />

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3.5">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                    solicitud.estado === 'Aprobada'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : solicitud.estado === 'Rechazada'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {solicitud.estado === 'Aprobada'
                    ? 'Solicitud Aceptada'
                    : solicitud.estado === 'Rechazada'
                    ? 'Solicitud Rechazada'
                    : 'Pendiente de Aprobación'}
                </span>
                <span className="text-xs font-mono font-bold text-[#006799]">
                  Folio {solicitud.folio}
                </span>
                <span className="text-[11px] text-slate-400">
                  • Ingreso: {new Date(solicitud.fechaIngreso).toLocaleDateString('es-CL')}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-[#0f2942] mt-1.5">
                Solicitud de Incorporación al Comité de Bienestar
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#006799]">
              1. Antecedentes del Funcionario Postulante
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 text-xs">
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-400 block text-[11px] font-medium">Nombre Completo</span>
                <span className="font-bold text-[#0f2942]">{solicitud.nombreCompleto}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-medium">RUN</span>
                <span className="font-mono font-semibold text-slate-800">{solicitud.run}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-medium">Calidad y Grado</span>
                <span className="font-semibold text-slate-800">
                  {solicitud.calidadContractual} · Grado {solicitud.grado}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block text-[11px] font-medium">Correo Electrónico</span>
                <span className="font-semibold text-[#006799] break-all">
                  {mailActivo?.destinatario || solicitud.email || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-medium">Cuota Autorizada</span>
                <span className="font-semibold text-slate-800">
                  {solicitud.porcentajeDescuento || 4}% sueldo base
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#006799]">
                2. Cargas Familiares Declaradas ({solicitud.cargas.length})
              </h4>
            </div>
            {solicitud.cargas.length === 0 ? (
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
                    {solicitud.cargas.map((c, idx) => (
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

          <div className="rounded-xl p-3.5 bg-slate-50/80 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
            <span className="font-bold uppercase tracking-wider text-slate-500 block text-[10px]">
              3. Declaraciones y Autorizaciones Firmadas Digitalmente
            </span>
            <p>✓ Tomó conocimiento de la cláusula de <strong>6 meses de carencia</strong> continua.</p>
            <p>✓ Autorizó el descuento por planilla del <strong>{solicitud.porcentajeDescuento || 4}% de su sueldo base</strong> como cuota social.</p>
          </div>

          {(solicitud.fechaSesion || solicitud.observacionesResolucion || mailActivo?.motivo) && (
            <div className="rounded-xl p-3.5 bg-white border border-slate-200 border-l-4 border-l-[#006799] text-xs space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#006799]">
                  Resolución del Directorio
                </span>
                {solicitud.fechaSesion && (
                  <span className="text-[11px] font-semibold text-slate-600">
                    {solicitud.numeroActa || 'Sesión Ordinaria'} ({solicitud.fechaSesion})
                    {solicitud.fechaFinCarencia ? ` • Carencia hasta ${solicitud.fechaFinCarencia}` : ''}
                  </span>
                )}
              </div>
              {(solicitud.observacionesResolucion || mailActivo?.motivo) && (
                <p className="text-slate-700 leading-relaxed">
                  {solicitud.observacionesResolucion || mailActivo?.motivo}
                </p>
              )}
            </div>
          )}

          <div
            className={`rounded-xl px-4 py-3 border text-[11px] leading-relaxed ${
              solicitud.estado === 'Aprobada'
                ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
                : solicitud.estado === 'Rechazada'
                ? 'bg-rose-50/70 border-rose-200/80 text-rose-950'
                : 'bg-sky-50/70 border-sky-200/80 text-sky-950'
            }`}
          >
            {solicitud.estado === 'Aprobada' ? (
              <span>
                <strong className="text-emerald-800">✔ Cuenta de socio habilitada:</strong> Por confidencialidad, el usuario y la contraseña temporal fueron enviados directamente al correo personal del funcionario (
                <strong className="text-[#006799]">{mailActivo?.destinatario || solicitud.email}</strong>).
              </span>
            ) : solicitud.estado === 'Rechazada' ? (
              <span>
                Se envió la notificación oficial con el motivo de la resolución al correo del funcionario (
                <strong>{mailActivo?.destinatario || solicitud.email}</strong>).
              </span>
            ) : (
              <span>
                Solicitud pendiente de evaluación. Revise los antecedentes y cargas declaradas antes de emitir la resolución del Directorio.
              </span>
            )}
          </div>

          {solicitud.estado === 'Pendiente de aprobación' && puedeResolver && panelResolucionFicha && (
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
                  Se despachará correo automático a <strong className="text-slate-700">{solicitud.email}</strong>
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
                    onClick={() => onResolverFicha(panelResolucionFicha)}
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={reenviandoSmtp}
              onClick={() => onReenviarCorreo(solicitud.folio)}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold text-[#006799] bg-sky-50 hover:bg-sky-100 border border-sky-200/80 transition cursor-pointer disabled:opacity-50 text-center"
            >
              {reenviandoSmtp ? 'Reenviando...' : 'Reenviar notificación por correo'}
            </button>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
              {solicitud.estado === 'Pendiente de aprobación' && puedeResolver && !panelResolucionFicha && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setPanelResolucionFicha('rechazar');
                      setObservaciones(
                        'Inconsistencia en calidad contractual / antecedentes de cargas familiares incompletos para acreditar asignación.'
                      );
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer text-center"
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
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition cursor-pointer shadow-sm text-center"
                  >
                    ✓ Aprobar Incorporación
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer text-center"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
