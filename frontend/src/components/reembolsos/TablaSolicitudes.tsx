import React from 'react';
import { SolicitudReembolso, EstadoReembolso, TipoPrestacion, TIPO_PRESTACION_LABELS } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export function getEstadoBadge(estado: EstadoReembolso) {
  const map: Record<EstadoReembolso, { bg: string; dot: string }> = {
    borrador: { bg: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
    en_revision: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    aprobado: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    rechazado: { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
    pagado: { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  };
  return map[estado] || map.borrador;
}

export function getTipoPrestacionIcon(tipo: TipoPrestacion) {
  const icons: Record<TipoPrestacion, string> = {
    farmacia: '💊',
    consulta: '🩺',
    dental: '🦷',
    examenes: '🔬',
    optica: '👓',
    hospitalizacion: '🏥',
    programa_medico: '📑',
    otros: '📋',
  };
  return icons[tipo] || '📋';
}

interface TablaSolicitudesProps {
  solicitudes: SolicitudReembolso[];
  filtroEstado: string;
  setFiltroEstado: (estado: string) => void;
  onVerComprobante: (sol: SolicitudReembolso) => void;
  onVerDetalle: (sol: SolicitudReembolso) => void;
}

export const TablaSolicitudes: React.FC<TablaSolicitudesProps> = ({
  solicitudes,
  filtroEstado,
  setFiltroEstado,
  onVerComprobante,
  onVerDetalle,
}) => {
  const solicitudesFiltradas = solicitudes.filter((s) => {
    if (filtroEstado === 'todos') return true;
    return s.estado === filtroEstado;
  });

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header de la tabla */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-4 border-b border-slate-100 gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Historial de Solicitudes</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {solicitudes.length} solicitud(es) en el período vigente
          </p>
        </div>

        {/* Filtro por estado */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'en_revision', label: 'En Revisión' },
            { key: 'aprobado', label: 'Aprobados' },
            { key: 'pagado', label: 'Pagados' },
            { key: 'rechazado', label: 'Rechazados' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                filtroEstado === f.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de la tabla */}
      {solicitudesFiltradas.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-slate-400">No hay solicitudes que mostrar con el filtro seleccionado.</p>
        </div>
      ) : (
        <>
          {/* Vista Móvil: Tarjetas para Smartphones */}
          <div className="block md:hidden divide-y divide-slate-100">
            {solicitudesFiltradas.map((sol) => {
              const badge = getEstadoBadge(sol.estado);
              return (
                <div key={sol.id} className="p-4 hover:bg-slate-50/60 transition space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getTipoPrestacionIcon(sol.tipo_prestacion)}</span>
                      <div>
                        <span className="text-xs font-mono font-bold text-slate-800">{sol.codigo}</span>
                        <p className="text-[11px] font-semibold text-slate-700">
                          {TIPO_PRESTACION_LABELS[sol.tipo_prestacion]}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {sol.estado.replace('_', ' ')}
                    </span>
                  </div>

                  {sol.descripcion && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                      {sol.descripcion}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Beneficiario</span>
                      <span className="font-medium text-slate-700">{sol.beneficiario_nombre}</span>
                      <span className="text-[10px] text-slate-400 block">({sol.beneficiario_parentesco})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Fecha Atención</span>
                      <span className="text-slate-700 font-medium">{formatDate(sol.fecha_atencion)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-50/50 border border-sky-100/60">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Monto Boleta: {formatCurrency(sol.monto_boleta)}</span>
                      <span className="text-xs font-bold text-emerald-700">
                        Reembolso: {formatCurrency(sol.monto_reembolso)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {sol.comprobante_filename && (
                        <button
                          type="button"
                          onClick={() => onVerComprobante(sol)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#0077b6] bg-white border border-sky-200 rounded-lg shadow-2xs hover:bg-sky-50 transition"
                          title="Ver Comprobante"
                        >
                          Doc
                        </button>
                      )}
                      <button
                        onClick={() => onVerDetalle(sol)}
                        className="px-3 py-1 text-xs font-semibold text-white bg-[#0077b6] hover:bg-[#0369a1] rounded-lg shadow-2xs transition"
                      >
                        Ver Ficha
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vista Tablet / Desktop: Tabla Completa */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/60">
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Código</th>
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Tipo</th>
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Beneficiario</th>
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Fecha Atención</th>
                  <th className="text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Monto Boleta</th>
                  <th className="text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Reembolso</th>
                  <th className="text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Estado</th>
                  <th className="text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Comprobante</th>
                  <th className="text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {solicitudesFiltradas.map((sol) => {
                  const badge = getEstadoBadge(sol.estado);
                  return (
                    <tr key={sol.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Código */}
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-mono font-bold text-slate-800">{sol.codigo}</span>
                      </td>

                      {/* Tipo */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{getTipoPrestacionIcon(sol.tipo_prestacion)}</span>
                          <div>
                            <p className="text-xs font-semibold text-slate-700">
                              {TIPO_PRESTACION_LABELS[sol.tipo_prestacion]}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                              {sol.descripcion || 'Sin descripción'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Beneficiario */}
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-medium text-slate-700">{sol.beneficiario_nombre}</p>
                        <p className="text-[10px] text-slate-400">{sol.beneficiario_parentesco}</p>
                      </td>

                      {/* Fecha atención */}
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        {formatDate(sol.fecha_atencion)}
                      </td>

                      {/* Monto boleta */}
                      <td className="px-5 py-3.5 text-right text-xs font-semibold text-slate-700">
                        {formatCurrency(sol.monto_boleta)}
                      </td>

                      {/* Reembolso calculado */}
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-xs font-bold text-emerald-700">
                          {formatCurrency(sol.monto_reembolso)}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {sol.monto_copago > 0
                            ? `${Math.round((sol.monto_reembolso / sol.monto_copago) * 100)}% copago`
                            : 'Reembolso directo'}
                        </span>
                      </td>

                      {/* Estado badge */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {sol.estado.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Comprobante archivo */}
                      <td className="px-5 py-3.5 text-center">
                        {sol.comprobante_filename ? (
                          <button
                            type="button"
                            onClick={() => onVerComprobante(sol)}
                            className="inline-flex items-center justify-center p-1.5 text-[#0077b6] hover:text-[#0369a1] hover:bg-sky-50 rounded-lg transition"
                            title={`Ver ${sol.comprobante_filename}`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </td>

                      {/* Detalle */}
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => onVerDetalle(sol)}
                          className="text-xs font-semibold text-[#0077b6] hover:text-[#0369a1] transition"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};
