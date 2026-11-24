'use client';

import React from 'react';
import { CargaSocioItem, CertificadoVisorData } from './types';

interface MisCargasSectionProps {
  esAdminOSuper: boolean;
  usuarioNombre?: string;
  usuarioRut?: string;
  cargando: boolean;
  cargas: CargaSocioItem[];
  onAbrirNuevaCarga: () => void;
  onVerCertificado: (data: CertificadoVisorData) => void;
  onAbrirSubsanacion: (carga: CargaSocioItem) => void;
}

export const MisCargasSection: React.FC<MisCargasSectionProps> = ({
  esAdminOSuper,
  usuarioNombre,
  usuarioRut,
  cargando,
  cargas,
  onAbrirNuevaCarga,
  onVerCertificado,
  onAbrirSubsanacion,
}) => {
  return (
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
              : `Cargas familiares asociadas exclusivamente al socio titular ${usuarioNombre || ''} (RUN ${usuarioRut || ''}).`}
          </p>
        </div>
        <button
          type="button"
          onClick={onAbrirNuevaCarga}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0f2942] hover:bg-[#006799] transition shadow-sm cursor-pointer shrink-0"
        >
          + Agregar Nueva Carga Familiar
        </button>
      </div>

      <div className="w-full">
        {/* Vista Dual Móvil */}
        <div className="block md:hidden space-y-3">
          {cargando ? (
            <div className="py-6 text-center text-xs text-slate-400">Cargando cargas familiares...</div>
          ) : cargas.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No registra cargas familiares en su ficha. Use el botón «+ Agregar Nueva Carga Familiar» para inscribir una carga adjuntando su certificado.
            </div>
          ) : (
            cargas.map((carga) => (
              <div key={carga.id} className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-2.5 shadow-2xs">
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-800 truncate">{carga.nombre}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-50 text-[#006799] border border-sky-200/70 font-semibold text-[10.5px]">
                        {carga.parentesco}
                      </span>
                      <span className="font-mono text-slate-500 text-[11px]">RUN {carga.rut}</span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border shrink-0 ${
                      carga.estado === 'Vigente'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : carga.estado === 'Rechazada'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        carga.estado === 'Vigente'
                          ? 'bg-emerald-500'
                          : carga.estado === 'Rechazada'
                          ? 'bg-rose-500'
                          : 'bg-amber-500 animate-pulse'
                      }`}
                    />
                    {carga.estado}
                  </span>
                </div>

                {esAdminOSuper && (
                  <div className="text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Socio Titular</span>
                    <span className="font-semibold text-[#0f2942]">{carga.socioNombre || 'Socio Titular'}</span>
                    {carga.socioRut && <span className="font-mono text-slate-400 text-[11px] ml-1.5">RUN {carga.socioRut}</span>}
                  </div>
                )}

                <div className="text-xs space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Certificado / Antecedente</span>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-slate-600 text-xs truncate max-w-[200px]">
                      {carga.certificadoTipo || carga.observacion || 'Incorporación inicial'}
                    </span>
                    {carga.certificadoData && (
                      <button
                        type="button"
                        onClick={() =>
                          onVerCertificado({
                            titulo: carga.certificadoTipo || 'Certificado de Respaldo',
                            nombreArchivo: carga.certificadoNombre || 'certificado',
                            dataUrl: carga.certificadoData!,
                            cargaNombre: carga.nombre,
                            socioNombre: carga.socioNombre,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-sky-50 text-[#0f2942] hover:text-[#006799] border border-slate-200 text-[11px] font-semibold transition cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5 text-[#006799]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Ver Cédula Frontal</span>
                      </button>
                    )}
                  </div>

                  {carga.estado === 'Rechazada' && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 text-[11px]">
                      <div className="font-bold flex items-center gap-1.5 text-rose-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        Motivo informado por Directorio:
                      </div>
                      <p className="mt-0.5 text-slate-700 italic">«{carga.observacionesResolucion || 'Fotografía ilegible o antecedentes discordantes.'}»</p>
                      <button
                        type="button"
                        onClick={() => onAbrirSubsanacion(carga)}
                        className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f2942] hover:bg-[#006799] text-white font-bold text-xs transition cursor-pointer"
                      >
                        <span>↻ Subsanar / Reintentar con nueva foto de carnet</span>
                      </button>
                    </div>
                  )}

                  {carga.estado === 'Pendiente de Revisión' && (
                    <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                      <span>⏳</span>
                      <span>En evaluación por el Directorio de Bienestar</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Vista Desktop */}
        <div className="hidden md:block w-full overflow-x-auto">
          <table className="w-full table-fixed text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold uppercase text-[11px]">
                {esAdminOSuper && <th className="w-[20%] py-3 px-4">Socio Titular</th>}
                <th className={esAdminOSuper ? 'w-[22%] py-3 px-4' : 'w-[28%] py-3 px-4'}>Nombre Completo de la Carga</th>
                <th className={esAdminOSuper ? 'w-[14%] py-3 px-4' : 'w-[16%] py-3 px-4'}>Parentesco y RUN</th>
                <th className={esAdminOSuper ? 'w-[24%] py-3 px-4' : 'w-[36%] py-3 px-4'}>Certificado / Antecedente</th>
                <th className="w-[20%] py-3 px-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td colSpan={esAdminOSuper ? 5 : 4} className="py-6 text-center text-slate-400">
                    Cargando cargas familiares...
                  </td>
                </tr>
              ) : cargas.length === 0 ? (
                <tr>
                  <td colSpan={esAdminOSuper ? 5 : 4} className="py-6 text-center text-slate-400">
                    No registra cargas familiares en su ficha. Use el botón «+ Agregar Nueva Carga Familiar» para inscribir una carga adjuntando su certificado.
                  </td>
                </tr>
              ) : (
                cargas.map((carga) => (
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
                              onVerCertificado({
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
                            onClick={() => onAbrirSubsanacion(carga)}
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
    </div>
  );
};
