'use client';

import React from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { SolicitudReembolso } from '@/types';
import { IndicadorTramoBadge } from './IndicadorTramoBadge';

interface TablaAprobacionesProps {
  solicitudes: SolicitudReembolso[];
  cargando: boolean;
  onVerComprobante: (sol: SolicitudReembolso) => void;
  onVerDetalle: (sol: SolicitudReembolso) => void;
  onIniciarAprobar: (sol: SolicitudReembolso) => void;
  onIniciarRechazar: (sol: SolicitudReembolso) => void;
}

// [ESTUDIANTE INFORMÁTICA] Renderiza la tabla de reembolsos en estilo Data-Dense con bordes definidos y acciones rápidas.
export const TablaAprobaciones: React.FC<TablaAprobacionesProps> = ({
  solicitudes,
  cargando,
  onVerComprobante,
  onVerDetalle,
  onIniciarAprobar,
  onIniciarRechazar,
}) => {
  if (cargando) {
    return <div className="p-8 text-center text-xs text-slate-500">Cargando solicitudes de reembolso...</div>;
  }

  if (solicitudes.length === 0) {
    return <div className="p-8 text-center text-xs text-slate-500">No se encontraron solicitudes con los filtros aplicados.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
            <th className="py-2.5 px-3">Código</th>
            <th className="py-2.5 px-3">Antigüedad</th>
            <th className="py-2.5 px-3">Socio Titular</th>
            <th className="py-2.5 px-3">Prestación</th>
            <th className="py-2.5 px-3">Fecha Atención</th>
            <th className="py-2.5 px-3 text-right">Copago CLP</th>
            <th className="py-2.5 px-3">Estado</th>
            <th className="py-2.5 px-3 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium">
          {solicitudes.map((sol) => (
            <tr key={sol.id} className="hover:bg-slate-50/80 transition-colors">
              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{sol.codigo}</td>
              <td className="py-2.5 px-3">
                <IndicadorTramoBadge fechaIngreso={sol.created_at} fechaFallback={sol.fecha_boleta} />
              </td>
              <td className="py-2.5 px-3">
                <div className="font-semibold text-slate-800">{sol.socio_nombre || 'Socio'}</div>
                <div className="text-[11px] text-slate-500 font-mono">{sol.socio_rut}</div>
              </td>
              <td className="py-2.5 px-3 text-slate-700">{sol.tipo_prestacion_label}</td>
              <td className="py-2.5 px-3 text-slate-600">{formatDate(sol.fecha_atencion)}</td>
              <td className="py-2.5 px-3 text-right font-extrabold text-slate-800">
                {formatCurrency(sol.monto_copago)}
              </td>
              <td className="py-2.5 px-3">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  sol.estado === 'aprobado' || sol.estado === 'pagado'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : sol.estado === 'rechazado'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {sol.estado_label || sol.estado}
                </span>
              </td>
              <td className="py-2.5 px-3 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => onVerComprobante(sol)}
                    title="Ver Boleta / Comprobante"
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    Doc
                  </button>
                  <button
                    onClick={() => onVerDetalle(sol)}
                    title="Ver Ficha Detallada"
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    Detalle
                  </button>
                  {sol.estado === 'en_revision' && (
                    <>
                      <button
                        onClick={() => onIniciarAprobar(sol)}
                        className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => onIniciarRechazar(sol)}
                        className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px]"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
