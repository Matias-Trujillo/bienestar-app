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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Socio & RUN</th>
                <th className="py-3.5 px-4">Antigüedad</th>
                <th className="py-3.5 px-4">Bono Solicitado</th>
                <th className="py-3.5 px-4">Monto (G15)</th>
                <th className="py-3.5 px-4">Documento Presentado</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {solicitudes.map((sol) => (
                <tr key={sol.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block">{sol.socio_nombre}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {sol.socio_rut} • {sol.socio_departamento}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
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
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-800 block">{sol.titulo_bono}</span>
                    <span className="text-[10px] text-slate-400">
                      {sol.porcentaje_base}% sueldo Grado 15
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-sm font-extrabold text-emerald-700">
                      {formatCurrency(sol.monto_calculado)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
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
                      className="text-blue-600 hover:text-blue-800 font-semibold underline flex items-center gap-1"
                    >
                      <FileTextIcon className="w-3.5 h-3.5" />
                      {sol.documento_nombre || sol.documento_tipo}
                    </button>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onResolverSolicitud(sol)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition"
                    >
                      Resolver
                    </button>
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
