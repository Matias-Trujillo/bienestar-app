import React from 'react';
import { SolicitudResumen } from './EvaluacionDirectorioTable';

interface ModalResolucionAfiliacionProps {
  solicitud: SolicitudResumen | null;
  modoResolucion: 'aprobar' | 'rechazar' | null;
  fechaSesion: string;
  setFechaSesion: (val: string) => void;
  numeroActa: string;
  setNumeroActa: (val: string) => void;
  observaciones: string;
  setObservaciones: (val: string) => void;
  resolviendo: boolean;
  errorModal: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ModalResolucionAfiliacion: React.FC<ModalResolucionAfiliacionProps> = ({
  solicitud,
  modoResolucion,
  fechaSesion,
  setFechaSesion,
  numeroActa,
  setNumeroActa,
  observaciones,
  setObservaciones,
  resolviendo,
  errorModal,
  onClose,
  onSubmit,
}) => {
  if (!solicitud || !modoResolucion) return null;

  const correoDestino =
    solicitud.email || `${solicitud.run.replace(/[^0-9kK]/g, '').toLowerCase()}@mperalillo.cl`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200/80 overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Franja institucional superior */}
        <div
          className={`h-1.5 w-full ${
            modoResolucion === 'aprobar'
              ? 'bg-gradient-to-r from-[#006799] via-[#0d9488] to-emerald-600'
              : 'bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600'
          }`}
        />

        <div className="p-6 sm:p-7 space-y-4">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
            <div>
              <span
                className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  modoResolucion === 'aprobar'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {modoResolucion === 'aprobar' ? 'Acuerdo: Aprobar Incorporación' : 'Acuerdo: Rechazar Solicitud'}
              </span>
              <h3 className="text-lg font-extrabold text-[#0f2942] mt-1.5">
                Solicitud N° {solicitud.folio}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Postulante: <strong className="text-slate-800">{solicitud.nombreCompleto}</strong> (RUN: {solicitud.run})
              </p>
              <p className="text-[11px] text-[#006799] font-semibold mt-1 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#006799]" />
                Notificación oficial a: <span className="underline decoration-[#006799]/30">{correoDestino}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Resumen de antecedentes y cargas declaradas en la solicitud */}
            <div className="rounded-xl bg-slate-50/80 border border-slate-200/80 p-3.5 text-xs space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#006799]">
                  Antecedentes de la Solicitud
                </span>
                <span className="font-semibold text-slate-700">
                  {solicitud.calidadContractual} · Grado {solicitud.grado} · Descuento {solicitud.porcentajeDescuento || 4}%
                </span>
              </div>

              {solicitud.cargas.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  Sin cargas familiares declaradas en esta solicitud.
                </p>
              ) : (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    Cargas familiares declaradas ({solicitud.cargas.length}):
                  </span>
                  <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                    {solicitud.cargas.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-1.5 text-[11px]">
                        <span className="font-semibold text-slate-800">{c.nombreCompleto}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-500">{c.run}</span>
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 text-[#006799] border border-sky-200/70 font-semibold text-[10px]">
                            {c.parentesco || 'Carga'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0f2942] mb-1">
                  Fecha Sesión Ordinaria *
                </label>
                <input
                  type="date"
                  required
                  value={fechaSesion}
                  onChange={(e) => setFechaSesion(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50/70 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/20 focus:border-[#006799] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0f2942] mb-1">
                  N° Acta de Directorio
                </label>
                <input
                  type="text"
                  value={numeroActa}
                  onChange={(e) => setNumeroActa(e.target.value)}
                  placeholder="Ej: Acta N° 05-2026"
                  className="w-full px-3 py-2 text-sm bg-slate-50/70 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/20 focus:border-[#006799] transition"
                />
              </div>
            </div>

            {modoResolucion === 'aprobar' ? (
              <>
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-sky-50/40 border border-emerald-200/80 border-l-4 border-l-emerald-600 text-xs text-slate-700 space-y-1.5">
                  <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <span className="text-emerald-700">●</span> Resumen de efectos de la aprobación:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-700">
                    <li>
                      Se registra la incorporación oficial del funcionario y se inicia el cómputo de{' '}
                      <strong className="text-emerald-950">6 meses de carencia</strong> y el descuento del{' '}
                      <strong className="text-emerald-950">4% por planilla</strong>.
                    </li>
                    <li>
                      El sistema enviará automáticamente y de forma privada al correo{' '}
                      <strong className="text-[#006799]">{correoDestino}</strong> la notificación de aceptación junto con sus credenciales e instrucciones de acceso.
                    </li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#0f2942]">
                    Motivo / Fundamento de Aprobación
                  </label>
                  <textarea
                    rows={2}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Cumple requisitos reglamentarios de Planta/Contrata Municipal y autorización de descuento del 4% por planilla."
                    className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/20 focus:border-[#006799] transition"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#0f2942]">
                  Motivo del Rechazo y Observaciones *
                </label>
                <textarea
                  required
                  rows={3}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Detalle el motivo exacto del rechazo para notificar por correo al funcionario..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition"
                />
                <p className="text-[11px] text-slate-500">
                  Se notificará por correo a <strong className="text-slate-700">{correoDestino}</strong> el rechazo de la solicitud N° {solicitud.folio} junto con el motivo indicado.
                </p>
              </div>
            )}

            {errorModal && (
              <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
                {errorModal}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={resolviendo}
                className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition shadow-sm cursor-pointer ${
                  modoResolucion === 'aprobar'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-rose-700 hover:bg-rose-800'
                } disabled:opacity-50`}
              >
                {resolviendo
                  ? 'Procesando...'
                  : modoResolucion === 'aprobar'
                  ? '✓ Confirmar Aprobación'
                  : '✕ Confirmar Rechazo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
