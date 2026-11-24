'use client';

import React from 'react';
import { formatRun } from '@/lib/utils';

interface ModalNuevaCargaFamiliarProps {
  isOpen: boolean;
  esDirectiva: boolean;
  socioAsistidoRut: string;
  setSocioAsistidoRut: (v: string) => void;
  nuevaCargaNombre: string;
  setNuevaCargaNombre: (v: string) => void;
  nuevaCargaRun: string;
  setNuevaCargaRun: (v: string) => void;
  nuevaCargaParentesco: string;
  setNuevaCargaParentesco: (v: string) => void;
  nuevaCargaObservacion: string;
  setNuevaCargaObservacion: (v: string) => void;
  certificadoNombre: string;
  runCargaValido: boolean;
  runCargaInvalido: boolean;
  errorNuevaCarga: string | null;
  enviandoNuevaCarga: boolean;
  onSeleccionarCertificado: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const ModalNuevaCargaFamiliar: React.FC<ModalNuevaCargaFamiliarProps> = ({
  isOpen,
  esDirectiva,
  socioAsistidoRut,
  setSocioAsistidoRut,
  nuevaCargaNombre,
  setNuevaCargaNombre,
  nuevaCargaRun,
  setNuevaCargaRun,
  nuevaCargaParentesco,
  setNuevaCargaParentesco,
  nuevaCargaObservacion,
  setNuevaCargaObservacion,
  certificadoNombre,
  runCargaValido,
  runCargaInvalido,
  errorNuevaCarga,
  enviandoNuevaCarga,
  onSeleccionarCertificado,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200/80 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#0d9488] to-emerald-600 shrink-0" />
        <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
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
              onClick={onClose}
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
                    RUN inválido
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
                    onChange={onSeleccionarCertificado}
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
              disabled={enviandoNuevaCarga}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0f2942] hover:bg-[#006799] transition shadow-sm cursor-pointer disabled:opacity-50 text-center"
            >
              {enviandoNuevaCarga ? 'Enviando solicitud...' : 'Enviar a Revisión de Directorio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
