'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { SolicitudCargaItem } from './types';

interface SolicitudesCargasDirectorioSectionProps {
  solicitudesCargas: SolicitudCargaItem[];
  cargando: boolean;
  pendientesCount: number;
  esCargaPropia: (sc: SolicitudCargaItem) => boolean;
  onAbrirFicha: (sc: SolicitudCargaItem) => void;
}

export const SolicitudesCargasDirectorioSection: React.FC<SolicitudesCargasDirectorioSectionProps> = ({
  solicitudesCargas,
  cargando,
  pendientesCount,
  esCargaPropia,
  onAbrirFicha,
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base font-bold text-slate-800">
              Solicitudes de Incorporación de Nuevas Cargas Familiares
            </h2>
            {pendientesCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                {pendientesCount}{' '}
                {pendientesCount === 1 ? 'pendiente de aprobación' : 'pendientes de aprobación'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Haga clic en el <strong>N° de Solicitud</strong> para revisar el certificado adjunto y autorizar o rechazar la incorporación de la carga.
          </p>
        </div>
      </div>

      {cargando ? (
        <div className="text-xs text-slate-400 py-6 text-center">
          Cargando solicitudes de cargas familiares...
        </div>
      ) : solicitudesCargas.length === 0 ? (
        <div className="text-xs text-slate-400 py-5 text-center bg-slate-50/70 rounded-xl border border-slate-100">
          No hay solicitudes adicionales de cargas familiares registradas.
        </div>
      ) : (
        <div className="w-full">
          {/* Vista Dual Móvil */}
          <div className="block md:hidden space-y-3">
            {solicitudesCargas.map((sc) => {
              const propia = esCargaPropia(sc);
              return (
                <div
                  key={sc.folio}
                  onClick={() => {
                    if (!propia) onAbrirFicha(sc);
                  }}
                  className={`p-4 rounded-xl border transition ${
                    propia
                      ? 'bg-amber-50/20 border-amber-200/60 cursor-not-allowed'
                      : 'bg-white border-slate-200/90 hover:border-sky-300 hover:shadow-xs cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#006799] bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200">
                        {sc.folio}
                      </span>
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {new Date(sc.fechaIngreso).toLocaleDateString('es-CL')}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        sc.estado === 'Aprobada'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : sc.estado === 'Rechazada'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          sc.estado === 'Aprobada'
                            ? 'bg-emerald-600'
                            : sc.estado === 'Rechazada'
                            ? 'bg-rose-600'
                            : 'bg-amber-500'
                        }`}
                      />
                      {sc.estado}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Socio Titular</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">{sc.socioNombre}</span>
                        {propia && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Propia</span>
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">RUN {sc.socioRut}</span>
                    </div>

                    <div className="pt-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Carga a Incorporar</span>
                      <p className="font-bold text-slate-800">{sc.nombreCompleto}</p>
                      <p className="text-[11px] text-slate-500">
                        <span className="font-mono">RUN {sc.run}</span>
                        <span className="text-[#006799] font-semibold"> · {sc.parentesco || 'Hijo/a'}</span>
                      </p>
                    </div>

                    <div className="pt-0.5 text-[11px]">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Certificado</span>
                      <p className="font-medium text-slate-700">{sc.certificadoTipo || sc.observacionSocio || 'Certificado de respaldo'}</p>
                      {sc.estado === 'Aprobada' && sc.fechaSesion && (
                        <p className="text-emerald-700 font-semibold">{sc.numeroActa || 'Sesión Ordinaria'} ({sc.fechaSesion})</p>
                      )}
                      {sc.estado === 'Rechazada' && sc.observacionesResolucion && (
                        <p className="text-rose-600 italic">Motivo: {sc.observacionesResolucion}</p>
                      )}
                    </div>
                  </div>

                  {!propia && (
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <span className="text-xs font-bold text-[#006799] inline-flex items-center gap-1">
                        <span>Revisar y resolver</span>
                        <span>→</span>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Vista Desktop */}
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="w-full table-fixed text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="w-[20%] py-3 px-4">N° Solicitud / Ingreso</th>
                  <th className="w-[26%] py-3 px-4">Socio Titular</th>
                  <th className="w-[24%] py-3 px-4">Nueva Carga / Vínculo</th>
                  <th className="w-[18%] py-3 px-4">Certificado Adjunto</th>
                  <th className="w-[12%] py-3 px-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {solicitudesCargas.map((sc) => {
                  const propia = esCargaPropia(sc);
                  return (
                    <tr
                      key={sc.folio}
                      onClick={() => {
                        if (!propia) onAbrirFicha(sc);
                      }}
                      className={`transition align-middle group ${
                        propia ? 'bg-amber-50/20 cursor-not-allowed' : 'hover:bg-sky-50/40 cursor-pointer'
                      }`}
                    >
                      <td className="py-3.5 px-4 align-middle">
                        <button
                          type="button"
                          disabled={propia}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!propia) onAbrirFicha(sc);
                          }}
                          className={`inline-flex items-center gap-1.5 font-mono font-bold px-2.5 py-1 rounded-lg transition border ${
                            propia
                              ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
                              : 'text-[#006799] bg-sky-50 group-hover:bg-[#006799] group-hover:text-white border-sky-200 cursor-pointer'
                          }`}
                          title={
                            propia
                              ? 'Principio de Probidad: No puede resolver su propia solicitud de carga familiar'
                              : 'Pinche aquí para abrir la solicitud, ver el certificado y resolver'
                          }
                        >
                          <span>{sc.folio}</span>
                          {!propia && <span className="text-[10px]">→</span>}
                        </button>
                        <div className="text-[11px] text-slate-400 mt-1 pl-0.5 tabular-nums">
                          {new Date(sc.fechaIngreso).toLocaleDateString('es-CL')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 truncate" title={sc.socioNombre}>{sc.socioNombre}</span>
                          {propia && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Propia</span>
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 truncate mt-0.5">
                          RUN {sc.socioRut}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle min-w-0">
                        <div className="font-bold text-slate-800 truncate" title={sc.nombreCompleto}>{sc.nombreCompleto}</div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          <span className="font-mono">RUN {sc.run}</span>
                          <span className="text-[#006799] font-semibold"> · {sc.parentesco || 'Hijo/a'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle text-slate-600 text-xs min-w-0">
                        <div className="font-semibold text-slate-700 truncate" title={sc.certificadoTipo || sc.observacionSocio || 'Certificado de respaldo'}>
                          {sc.certificadoTipo || sc.observacionSocio || 'Certificado de respaldo'}
                        </div>
                        {sc.estado === 'Aprobada' && sc.fechaSesion ? (
                          <div className="text-emerald-700 text-[11px] font-semibold truncate">
                            {sc.numeroActa || 'Sesión Ordinaria'} ({sc.fechaSesion})
                          </div>
                        ) : sc.estado === 'Rechazada' && sc.observacionesResolucion ? (
                          <div className="text-rose-600 text-[11px] truncate" title={sc.observacionesResolucion}>
                            Motivo: {sc.observacionesResolucion}
                          </div>
                        ) : (
                          <div className="text-[#006799] text-[11px] font-medium truncate">
                            Pinche para revisar documento
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            sc.estado === 'Aprobada'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : sc.estado === 'Rechazada'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              sc.estado === 'Aprobada'
                                ? 'bg-emerald-600'
                                : sc.estado === 'Rechazada'
                                ? 'bg-rose-600'
                                : 'bg-amber-500'
                            }`}
                          />
                          {sc.estado === 'Aprobada' ? 'Aprobada' : sc.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
