'use client';

import React from 'react';
import { CertificadoVisorData, SolicitudCargaItem } from './types';

interface ModalResolucionCargaFamiliarProps {
  cargaSeleccionada: SolicitudCargaItem | null;
  modoResolucionCarga: 'aprobar' | 'rechazar' | null;
  puedeResolver: boolean;
  fechaSesion: string;
  setFechaSesion: (v: string) => void;
  numeroActa: string;
  setNumeroActa: (v: string) => void;
  obsResolucionCarga: string;
  setObsResolucionCarga: (v: string) => void;
  errorResolucionCarga: string | null;
  resolviendoCarga: boolean;
  onCambiarModo: (modo: 'aprobar' | 'rechazar') => void;
  onVerCertificado: (data: CertificadoVisorData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const ModalResolucionCargaFamiliar: React.FC<ModalResolucionCargaFamiliarProps> = ({
  cargaSeleccionada,
  modoResolucionCarga,
  puedeResolver,
  fechaSesion,
  setFechaSesion,
  numeroActa,
  setNumeroActa,
  obsResolucionCarga,
  setObsResolucionCarga,
  errorResolucionCarga,
  resolviendoCarga,
  onCambiarModo,
  onVerCertificado,
  onSubmit,
  onClose,
}) => {
  if (!cargaSeleccionada) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200/80 overflow-hidden max-h-[92vh] flex flex-col">
        <div
          className={`h-1.5 w-full shrink-0 ${
            cargaSeleccionada.estado === 'Rechazada' || modoResolucionCarga === 'rechazar'
              ? 'bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600'
              : 'bg-gradient-to-r from-[#006799] via-[#0d9488] to-emerald-600'
          }`}
        />
        <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
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
              onClick={onClose}
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
                    onVerCertificado({
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
              <div className="space-y-1.5">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Decisión de la Directiva
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onCambiarModo('aprobar')}
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
                    onClick={() => onCambiarModo('rechazar')}
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

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resolviendoCarga}
                  className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm cursor-pointer disabled:opacity-50 text-center ${
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
                  onClick={onClose}
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
  );
};
