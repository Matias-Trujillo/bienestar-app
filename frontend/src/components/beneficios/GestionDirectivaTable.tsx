'use client';

import React from 'react';
import { SolicitudBeneficio } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  PalmtreeIcon,
  FileTextIcon,
} from './Icons';

interface GestionDirectivaTableProps {
  solicitudes: SolicitudBeneficio[];
  onAsignacionDirecta: () => void;
  onResolverSolicitud: (sol: SolicitudBeneficio) => void;
  onVerDocumento: (doc: { titulo: string; tipo: string; num?: string; url?: string; detalle?: string }) => void;
}

export const GestionDirectivaTable: React.FC<GestionDirectivaTableProps> = ({
  solicitudes,
  onAsignacionDirecta,
  onResolverSolicitud,
  onVerDocumento,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Bandeja de Validación de Postulaciones (HU-05)
          </h2>
          <p className="text-xs text-slate-500">
            Revisión de solicitudes de socios, cotejo de antecedentes legales y liquidación de pagos.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAsignacionDirecta}
            className="px-3.5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition flex items-center gap-1.5"
          >
            <PalmtreeIcon className="w-3.5 h-3.5" />
            Asignación Directa Vacaciones (Escenario 3)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Vista Móvil: Tarjetas */}
        <div className="block md:hidden divide-y divide-slate-100">
          {solicitudes.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-400">No hay postulaciones registradas.</p>
          ) : (
            solicitudes.map((sol) => (
              <div key={sol.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{sol.socio_nombre}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {sol.socio_rut} • {sol.socio_departamento}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                      sol.estado === 'LIQUIDADO'
                        ? 'bg-emerald-50 text-emerald-700'
                        : sol.estado === 'APROBADO'
                        ? 'bg-blue-50 text-blue-700'
                        : sol.estado === 'PENDIENTE'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {sol.estado}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Beneficio</span>
                    <span className="font-bold text-slate-800 text-[11px] block">{sol.titulo_bono}</span>
                    <span className="text-[10px] text-slate-500">{sol.porcentaje_base}% Grado 15</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Monto a Liquidar</span>
                    <span className="text-sm font-extrabold text-emerald-700 block">
                      {formatCurrency(sol.monto_calculado)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`font-semibold inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                        sol.socio_meses_antiguedad >= 6
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700 font-bold'
                      }`}
                    >
                      {sol.socio_meses_antiguedad >= 6 ? '✓ ' : '⚠ '}
                      {sol.socio_antiguedad || `${sol.socio_meses_antiguedad} Meses`}
                    </span>
                    <button
                      onClick={() =>
                        onVerDocumento({
                          titulo: `${sol.titulo_bono} - ${sol.socio_nombre}`,
                          tipo: sol.documento_tipo,
                          num: sol.decreto_numero || undefined,
                          url: sol.documento_url || undefined,
                          detalle: sol.motivo || undefined,
                        })
                      }
                      className="text-blue-600 hover:text-blue-800 font-semibold underline flex items-center gap-1 text-[11px]"
                    >
                      <FileTextIcon className="w-3.5 h-3.5" />
                      Doc
                    </button>
                  </div>

                  <button
                    onClick={() => onResolverSolicitud(sol)}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition shadow-sm"
                  >
                    Resolver
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Vista Desktop: 5 Columnas Limpias con table-fixed y Estado al Final (Pinchar folio abre resolución directiva) */}
        <div className="hidden md:block w-full overflow-hidden">
          <table className="w-full table-fixed text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-semibold">
                <th className="w-[18%] py-3 px-4">Expediente y Plazo</th>
                <th className="w-[25%] py-3 px-4">Nombre del Socio</th>
                <th className="w-[24%] py-3 px-4">Beneficio Solicitado</th>
                <th className="w-[15%] py-3 px-4 text-right">Monto (G15)</th>
                <th className="w-[18%] py-3 px-4 text-right">Estado de la Solicitud</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {solicitudes.map((sol) => (
                <tr
                  key={sol.id}
                  onClick={() => onResolverSolicitud(sol)}
                  className="hover:bg-sky-50/40 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4 align-middle tabular-nums">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onResolverSolicitud(sol);
                      }}
                      className="inline-flex items-center gap-1.5 font-semibold text-[#006799] group-hover:text-[#0c2b45] group-hover:underline truncate"
                      title="Pinchar para revisar respaldo y resolver solicitud"
                    >
                      <span>BEN-{String(sol.id).padStart(4, '0')}</span>
                      <span className="text-[11px] opacity-75">→</span>
                    </button>
                    <div className="mt-1">
                      <span
                        className={`font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${
                          sol.socio_meses_antiguedad >= 6
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {sol.socio_meses_antiguedad >= 6 ? '✓ ' : '⚠ '}
                        {sol.socio_antiguedad || `${sol.socio_meses_antiguedad} Meses`}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <span className="font-medium text-slate-900 block truncate" title={sol.socio_nombre}>
                      {sol.socio_nombre}
                    </span>
                    <span className="text-slate-500 font-normal tabular-nums block truncate mt-0.5">
                      {sol.socio_rut} • {sol.socio_departamento}
                    </span>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <span className="font-medium text-slate-800 block truncate" title={sol.titulo_bono}>
                      {sol.titulo_bono}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onVerDocumento({
                          titulo: `${sol.titulo_bono} - ${sol.socio_nombre}`,
                          tipo: sol.documento_tipo,
                          num: sol.decreto_numero || undefined,
                          url: sol.documento_url || undefined,
                          detalle: sol.motivo || undefined,
                        });
                      }}
                      className="text-[#006799] hover:underline font-medium inline-flex items-center gap-1 mt-0.5 truncate max-w-full"
                    >
                      <FileTextIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{sol.documento_nombre || sol.documento_tipo}</span>
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right align-middle tabular-nums">
                    <span className="font-semibold text-[#166534] block">
                      {formatCurrency(sol.monto_calculado)}
                    </span>
                    <span className="text-slate-400 font-normal block mt-0.5">
                      {sol.porcentaje_base}% G15
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right align-middle">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${
                        sol.estado === 'LIQUIDADO'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : sol.estado === 'APROBADO'
                          ? 'bg-sky-50 text-[#006799] border border-sky-200'
                          : sol.estado === 'PENDIENTE'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          sol.estado === 'LIQUIDADO'
                            ? 'bg-emerald-500'
                            : sol.estado === 'APROBADO'
                            ? 'bg-[#006799]'
                            : sol.estado === 'PENDIENTE'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      />
                      {sol.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
