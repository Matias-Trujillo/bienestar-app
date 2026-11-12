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
    <div className="w-full min-w-0">
      {/* Vista Móvil Apilada (Al pinchar abre la ficha completa para revisar y autorizar/rechazar) */}
      <div className="block md:hidden divide-y divide-slate-100">
        {solicitudes.map((sol) => (
          <div
            key={sol.id}
            onClick={() => onVerDetalle(sol)}
            className="p-4 space-y-2 hover:bg-slate-50/80 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onVerDetalle(sol);
                }}
                className="text-xs font-semibold text-[#006799] hover:underline tabular-nums inline-flex items-center gap-1"
              >
                <span>{sol.codigo}</span>
                <span>→</span>
              </button>
              <IndicadorTramoBadge fechaIngreso={sol.created_at} fechaFallback={sol.fecha_boleta} />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">{sol.socio_nombre || 'Socio'}</p>
                <p className="text-slate-500 tabular-nums truncate">
                  {sol.socio_rut} • {sol.tipo_prestacion_label}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-slate-900 tabular-nums">{formatCurrency(sol.monto_copago)}</p>
                <span
                  className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                    sol.estado === 'aprobado' || sol.estado === 'pagado'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : sol.estado === 'rechazado'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {sol.estado_label || sol.estado}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Vista Desktop: 5 Columnas Limpias con Estado al Final (Pinchar expediente abre ficha de resolución) */}
      <div className="hidden md:block w-full overflow-hidden">
        <table className="w-full table-fixed text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-semibold">
              <th className="w-[21%] py-3 px-4">Expediente y Plazo</th>
              <th className="w-[25%] py-3 px-4">Nombre del Socio</th>
              <th className="w-[22%] py-3 px-4">Tipo de Prestación</th>
              <th className="w-[15%] py-3 px-4 text-right">Copago</th>
              <th className="w-[17%] py-3 px-4 text-right">Estado de la Solicitud</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {solicitudes.map((sol) => (
              <tr
                key={sol.id}
                onClick={() => onVerDetalle(sol)}
                className="hover:bg-sky-50/40 cursor-pointer transition-colors group"
              >
                <td className="py-3 px-4 align-middle">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onVerDetalle(sol);
                    }}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#006799] group-hover:text-[#0c2b45] group-hover:underline tabular-nums truncate"
                    title="Pinchar para abrir ficha completa y resolver solicitud"
                  >
                    <span>{sol.codigo}</span>
                    <span className="text-[11px] opacity-75 group-hover:translate-x-0.5 transition-transform">→</span>
                  </button>
                  <div className="mt-1">
                    <IndicadorTramoBadge fechaIngreso={sol.created_at} fechaFallback={sol.fecha_boleta} />
                  </div>
                </td>
                <td className="py-3 px-4 align-middle">
                  <div className="font-medium text-slate-900 truncate" title={sol.socio_nombre || 'Socio'}>
                    {sol.socio_nombre || 'Socio'}
                  </div>
                  <div className="text-slate-500 font-normal tabular-nums truncate mt-0.5">
                    RUT {sol.socio_rut}
                  </div>
                </td>
                <td className="py-3 px-4 align-middle">
                  <div className="font-medium text-slate-800 truncate" title={sol.tipo_prestacion_label}>
                    {sol.tipo_prestacion_label}
                  </div>
                  <div className="text-slate-500 font-normal tabular-nums truncate mt-0.5">
                    Atención: {formatDate(sol.fecha_atencion)}
                  </div>
                </td>
                <td className="py-3 px-4 text-right align-middle">
                  <div className="font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(sol.monto_copago)}
                  </div>
                  <div className="text-slate-400 font-normal tabular-nums mt-0.5">
                    Reemb: {formatCurrency(sol.monto_reembolso)}
                  </div>
                </td>
                <td className="py-3 px-4 text-right align-middle">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      sol.estado === 'aprobado' || sol.estado === 'pagado'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : sol.estado === 'rechazado'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        sol.estado === 'aprobado' || sol.estado === 'pagado'
                          ? 'bg-emerald-600'
                          : sol.estado === 'rechazado'
                          ? 'bg-rose-600'
                          : 'bg-amber-500'
                      }`}
                    />
                    {sol.estado_label || sol.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
