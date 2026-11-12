import React, { useState } from 'react';
import { SolicitudReembolso, EstadoReembolso, TipoPrestacion, TIPO_PRESTACION_LABELS } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { obtenerAnioSolicitud } from './ResumenSaludCards';

// [ESTUDIANTE INFORMÁTICA] Mapea el estado del reembolso a su píldora de estado moderna.
export function getEstadoBadge(estado: EstadoReembolso) {
  const map: Record<EstadoReembolso, { bg: string; dot: string }> = {
    borrador: { bg: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
    en_revision: { bg: 'bg-amber-50 text-[#b45309] border-amber-200', dot: 'bg-amber-500' },
    aprobado: { bg: 'bg-emerald-50 text-[#166534] border-emerald-200', dot: 'bg-[#166534]' },
    rechazado: { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
    pagado: { bg: 'bg-sky-50 text-[#006799] border-sky-200', dot: 'bg-[#006799]' },
  };
  return map[estado] || map.borrador;
}

// [ESTUDIANTE INFORMÁTICA] Retorna la sigla técnica de prestación para badges limpios.
export function getTipoPrestacionIcon(tipo: TipoPrestacion): string {
  const codes: Record<TipoPrestacion, string> = {
    farmacia: 'FAR',
    consulta: 'CON',
    dental: 'DEN',
    examenes: 'EXA',
    optica: 'OPT',
    hospitalizacion: 'HOS',
    programa_medico: 'PRG',
    otros: 'OTR',
  };
  return codes[tipo] || 'MED';
}

interface TablaSolicitudesProps {
  solicitudes: SolicitudReembolso[];
  filtroEstado: string;
  setFiltroEstado: (estado: string) => void;
  onVerComprobante: (sol: SolicitudReembolso) => void;
  onVerDetalle: (sol: SolicitudReembolso) => void;
}

const ESTADO_FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'en_revision', label: 'En Revisión' },
  { key: 'aprobado', label: 'Aprobados' },
  { key: 'pagado', label: 'Pagados' },
  { key: 'rechazado', label: 'Rechazados' },
] as const;

interface HeaderFiltrosProps {
  anioActual: number;
  aniosDisponibles: number[];
  filtroAnio: 'todos' | number;
  setFiltroAnio: (a: 'todos' | number) => void;
  filtroEstado: string;
  setFiltroEstado: (e: string) => void;
}

// [ESTUDIANTE INFORMÁTICA] Barra de filtrado adaptable (flex-wrap) que evita desbordamientos en laptops y tablets.
const TablaSolicitudesToolbar: React.FC<HeaderFiltrosProps> = ({
  anioActual,
  aniosDisponibles,
  filtroAnio,
  setFiltroAnio,
  filtroEstado,
  setFiltroEstado,
}) => (
  <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between p-5 sm:px-6 border-b border-slate-100 gap-4">
    <div className="min-w-0">
      <div className="flex items-center gap-2.5 flex-wrap">
        <h2 className="text-base font-extrabold text-slate-900">
          Historial de Solicitudes
        </h2>
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/80 tabular-nums">
          Tope $150.000 / Año Calendario
        </span>
      </div>
      <p className="text-xs text-slate-500 mt-0.5">
        Los reembolsos de años anteriores no descuentan del cupo disponible en {anioActual}.
      </p>
    </div>

    <div className="flex items-center gap-2.5 flex-wrap">
      {aniosDisponibles.length > 1 && (
        <div className="inline-flex flex-wrap items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/60">
          <button
            type="button"
            onClick={() => setFiltroAnio('todos')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filtroAnio === 'todos' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos
          </button>
          {aniosDisponibles.map((anio) => (
            <button
              key={anio}
              type="button"
              onClick={() => setFiltroAnio(anio)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all tabular-nums ${
                filtroAnio === anio ? 'bg-white text-[#166534] font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Año {anio}
            </button>
          ))}
        </div>
      )}

      <div className="inline-flex flex-wrap p-1 bg-slate-100/90 rounded-xl border border-slate-200/60">
        {ESTADO_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltroEstado(f.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filtroEstado === f.key
                ? 'bg-[#0c2b45] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  </div>
);

// [ESTUDIANTE INFORMÁTICA] Tabla de solicitudes de reembolso con superficie moderna (card-modern) y botones estilizados.
export const TablaSolicitudes: React.FC<TablaSolicitudesProps> = ({
  solicitudes,
  filtroEstado,
  setFiltroEstado,
  onVerComprobante,
  onVerDetalle,
}) => {
  const anioActual = new Date().getFullYear();
  const [filtroAnio, setFiltroAnio] = useState<'todos' | number>('todos');

  const aniosDisponibles = Array.from(
    new Set([anioActual, ...solicitudes.map((s) => obtenerAnioSolicitud(s))])
  ).sort((a, b) => b - a);

  const solicitudesFiltradas = solicitudes.filter((s) => {
    const cumpleEstado = filtroEstado === 'todos' || s.estado === filtroEstado;
    const cumpleAnio = filtroAnio === 'todos' || obtenerAnioSolicitud(s) === filtroAnio;
    return cumpleEstado && cumpleAnio;
  });

  return (
    <section className="card-modern overflow-hidden min-w-0">
      <TablaSolicitudesToolbar
        anioActual={anioActual}
        aniosDisponibles={aniosDisponibles}
        filtroAnio={filtroAnio}
        setFiltroAnio={setFiltroAnio}
        filtroEstado={filtroEstado}
        setFiltroEstado={setFiltroEstado}
      />

      {solicitudesFiltradas.length === 0 ? (
        <div className="p-10 text-center text-xs text-slate-400">
          No existen solicitudes registradas bajo el criterio seleccionado.
        </div>
      ) : (
        <>
          {/* Vista Móvil (Pinchar expediente o fila abre la ficha completa con su comprobante) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {solicitudesFiltradas.map((sol) => {
              const badge = getEstadoBadge(sol.estado);
              const anioSol = obtenerAnioSolicitud(sol);
              return (
                <div
                  key={sol.id}
                  onClick={() => onVerDetalle(sol)}
                  className="p-4 space-y-2 hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
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
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.bg}`}>
                      {sol.estado.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-900">
                    {TIPO_PRESTACION_LABELS[sol.tipo_prestacion]} — {sol.beneficiario_nombre}
                  </p>
                  <div className="flex items-center justify-between pt-0.5 text-xs">
                    <span className="text-slate-500 tabular-nums">
                      Atención: {formatDate(sol.fecha_atencion)} ({anioSol})
                    </span>
                    <span className="font-semibold text-[#166534] tabular-nums">
                      Reembolso: {formatCurrency(sol.monto_reembolso)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vista Desktop: 5 Columnas Limpias con Estado al Final (Pinchar expediente abre ficha completa) */}
          <div className="hidden md:block w-full overflow-hidden">
            <table className="w-full table-fixed text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 font-semibold text-slate-600">
                  <th className="w-[20%] px-4 py-3">Expediente y Fecha</th>
                  <th className="w-[26%] px-4 py-3">Tipo de Prestación</th>
                  <th className="w-[20%] px-4 py-3">Beneficiario</th>
                  <th className="w-[17%] px-4 py-3 text-right">Copago / Reembolso</th>
                  <th className="w-[17%] px-4 py-3 text-right">Estado de la Solicitud</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {solicitudesFiltradas.map((sol) => {
                  const badge = getEstadoBadge(sol.estado);
                  const anioSol = obtenerAnioSolicitud(sol);
                  const esAnioAnterior = anioSol < anioActual;
                  return (
                    <tr
                      key={sol.id}
                      onClick={() => onVerDetalle(sol)}
                      className="hover:bg-sky-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 align-middle tabular-nums">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onVerDetalle(sol);
                          }}
                          className="inline-flex items-center gap-1.5 font-semibold text-[#006799] group-hover:text-[#0c2b45] group-hover:underline truncate"
                          title="Pinchar para ver toda la información de la solicitud y su comprobante"
                        >
                          <span>{sol.codigo}</span>
                          <span className="text-[11px] opacity-75 group-hover:translate-x-0.5 transition-transform">→</span>
                        </button>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-slate-500">
                          <span>{formatDate(sol.fecha_atencion)}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                              esAnioAnterior
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-emerald-50 text-[#166534] border border-emerald-200/70'
                            }`}
                          >
                            {anioSol}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded-md bg-sky-50 border border-sky-200/80 text-[10px] font-semibold text-[#006799] shrink-0 tabular-nums">
                            {getTipoPrestacionIcon(sol.tipo_prestacion)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate" title={TIPO_PRESTACION_LABELS[sol.tipo_prestacion]}>
                              {TIPO_PRESTACION_LABELS[sol.tipo_prestacion]}
                            </p>
                            <p className="text-slate-500 font-normal truncate" title={sol.descripcion}>
                              {sol.descripcion || 'Sin observaciones'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <p className="font-medium text-slate-900 truncate" title={sol.beneficiario_nombre}>
                          {sol.beneficiario_nombre}
                        </p>
                        <p className="text-slate-500 font-normal truncate mt-0.5">{sol.beneficiario_parentesco}</p>
                      </td>
                      <td className="px-4 py-3 text-right align-middle tabular-nums">
                        <div className="font-semibold text-[#166534]">
                          {formatCurrency(sol.monto_reembolso)}
                        </div>
                        <div className="text-slate-500 font-normal truncate mt-0.5">
                          Boleta: {formatCurrency(sol.monto_boleta)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {sol.estado.replace('_', ' ')}
                        </span>
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
