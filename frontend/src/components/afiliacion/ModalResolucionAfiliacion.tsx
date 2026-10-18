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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-6">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                modoResolucion === 'aprobar'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {modoResolucion === 'aprobar' ? 'Acuerdo: Aprobar Incorporación' : 'Acuerdo: Rechazar Solicitud'}
            </span>
            <h3 className="text-lg font-bold text-slate-800 mt-1">
              Solicitud {solicitud.folio}
            </h3>
            <p className="text-xs text-slate-500">
              Postulante: {solicitud.nombreCompleto} (RUN: {solicitud.run})
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
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
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={resolviendo}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition shadow-md ${
                modoResolucion === 'aprobar'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              } disabled:opacity-50`}
            >
              {resolviendo ? 'Procesando...' : modoResolucion === 'aprobar' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
