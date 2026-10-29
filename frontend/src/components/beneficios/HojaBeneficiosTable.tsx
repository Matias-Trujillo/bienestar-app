'use client';

import React from 'react';
import { SolicitudBeneficio } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  FileTextIcon,
  PlusCircleIcon,
  FileCheckIcon,
  EyeIcon,
} from './Icons';

interface HojaBeneficiosTableProps {
  solicitudes: SolicitudBeneficio[];
  nombreCompleto?: string;
  onNuevaPostulacion: () => void;
  onVerDocumento: (doc: { titulo: string; tipo: string; num?: string; url?: string; detalle?: string }) => void;
}

export const HojaBeneficiosTable: React.FC<HojaBeneficiosTableProps> = ({
  solicitudes,
  nombreCompleto,
  onNuevaPostulacion,
  onVerDocumento,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">Hoja Individual de Beneficios y Bonos</h2>
          <p className="text-xs text-slate-500">
            Historial de asignaciones económicas liquidadas o en proceso para {nombreCompleto || 'el socio'}.
          </p>
        </div>
        <button
          onClick={onNuevaPostulacion}
          className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
        >
          <PlusCircleIcon className="w-4 h-4" />
          Nueva Postulación
        </button>
      </div>

      {solicitudes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 text-slate-300 mx-auto">
            <FileTextIcon className="w-12 h-12" />
          </div>
          <h3 className="text-base font-bold text-slate-700">Sin beneficios registrados todavía</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No tienes solicitudes de bonos ingresadas en el sistema. Puedes consultar el catálogo y postular con tu documentación de respaldo.
          </p>
          <button
            onClick={onNuevaPostulacion}
            className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
          >
            Ver Catálogo de Bonos
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Vista Móvil: Tarjetas de Beneficios */}
          <div className="block md:hidden divide-y divide-slate-100">
            {solicitudes.map((sol) => (
              <div key={sol.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      BEN-{String(sol.id).padStart(4, '0')}
                    </span>
                    <span className="text-[11px] text-slate-400">{sol.created_at}</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                      sol.estado === 'LIQUIDADO'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : sol.estado === 'APROBADO'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
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
                          ? 'bg-blue-500'
                          : sol.estado === 'PENDIENTE'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    {sol.estado === 'LIQUIDADO' ? 'Pagado' : sol.estado}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{sol.titulo_bono}</h4>
                  <p className="text-xs text-slate-500">
                    {sol.asignacion_directa ? 'Asignación Directa' : sol.motivo || 'Postulación socio'}
                  </p>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Base ({sol.porcentaje_base}%)</span>
                    <span className="text-slate-600 font-medium">Ref: {formatCurrency(sol.sueldo_base_referencia)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Liquidado</span>
                    <span className="text-sm font-extrabold text-emerald-700">
                      {formatCurrency(sol.monto_calculado)}
                    </span>
                  </div>
                </div>

                {sol.numero_cheque && (
                  <div className="text-xs text-slate-600 bg-sky-50/50 p-2 rounded-lg border border-sky-100">
                    <span className="font-semibold">{sol.metodo_pago || 'Cheque'}:</span> {sol.numero_cheque} ({sol.banco_emisor})
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() =>
                      onVerDocumento({
                        titulo: sol.titulo_bono,
                        tipo: sol.documento_tipo,
                        num: sol.decreto_numero || undefined,
                        url: sol.documento_url || undefined,
                        detalle: sol.observaciones_admin || sol.motivo || undefined,
                      })
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0077b6] hover:underline"
                  >
                    <FileCheckIcon className="w-3.5 h-3.5" />
                    <span>{sol.decreto_numero || sol.documento_nombre || 'Ver Respaldo'}</span>
                  </button>

                  <button
                    onClick={() =>
                      onVerDocumento({
                        titulo: `${sol.titulo_bono} - Socio: ${sol.socio_nombre}`,
                        tipo: sol.documento_tipo,
                        num: sol.decreto_numero || undefined,
                        url: sol.documento_url || undefined,
                        detalle: `Monto: ${formatCurrency(sol.monto_calculado)} | Estado: ${sol.estado} | Cheque: ${sol.numero_cheque || 'Pendiente'} | Observaciones: ${sol.observaciones_admin || 'Conforme a bases.'}`,
                      })
                    }
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    Detalle
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Vista Tablet / Desktop: Tabla Tradicional */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">ID & Fecha</th>
                  <th className="py-3.5 px-4">Beneficio / Bono</th>
                  <th className="py-3.5 px-4">Base & %</th>
                  <th className="py-3.5 px-4">Monto Liquidado</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Pago / Cheque</th>
                  <th className="py-3.5 px-4">Documento Respaldo</th>
                  <th className="py-3.5 px-4 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {solicitudes.map((sol) => (
                  <tr key={sol.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      <div>BEN-{String(sol.id).padStart(4, '0')}</div>
                      <span className="text-[10px] text-slate-400">{sol.created_at}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800 block">{sol.titulo_bono}</span>
                      <span className="text-[11px] text-slate-500">
                        {sol.asignacion_directa ? 'Asignación Directa' : sol.motivo || 'Postulación socio'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700">{sol.porcentaje_base}%</span>
                      <span className="text-[10px] text-slate-400 block">
                        (Base {formatCurrency(sol.sueldo_base_referencia)})
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-sm font-extrabold text-emerald-700">
                        {formatCurrency(sol.monto_calculado)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                          sol.estado === 'LIQUIDADO'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : sol.estado === 'APROBADO'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
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
                              ? 'bg-blue-500'
                              : sol.estado === 'PENDIENTE'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        {sol.estado === 'LIQUIDADO' ? 'Pagado / Liquidado' : sol.estado}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {sol.numero_cheque ? (
                        <div>
                          <span className="font-semibold text-slate-800 block">
                            {sol.metodo_pago || 'Cheque'}: {sol.numero_cheque}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {sol.banco_emisor} • {sol.fecha_liquidacion || 'Emitido'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Pendiente emisión</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() =>
                          onVerDocumento({
                            titulo: sol.titulo_bono,
                            tipo: sol.documento_tipo,
                            num: sol.decreto_numero || undefined,
                            url: sol.documento_url || undefined,
                            detalle: sol.observaciones_admin || sol.motivo || undefined,
                          })
                        }
                        className="inline-flex items-center gap-1 text-[#0077b6] hover:text-[#0369a1] font-semibold text-xs"
                      >
                        <FileCheckIcon className="w-3.5 h-3.5" />
                        {sol.decreto_numero || sol.documento_nombre || 'Ver Documento'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() =>
                          onVerDocumento({
                            titulo: `${sol.titulo_bono} - Socio: ${sol.socio_nombre}`,
                            tipo: sol.documento_tipo,
                            num: sol.decreto_numero || undefined,
                            url: sol.documento_url || undefined,
                            detalle: `Monto: ${formatCurrency(sol.monto_calculado)} | Estado: ${sol.estado} | Cheque: ${sol.numero_cheque || 'Pendiente'} | Observaciones: ${sol.observaciones_admin || 'Conforme a bases.'}`,
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-lg transition"
                        title="Ver antecedentes completos"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
