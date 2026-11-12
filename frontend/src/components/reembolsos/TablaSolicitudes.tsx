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
          {/* Vista Móvil */}
          <div className="block md:hidden divide-y divide-slate-100">
            {solicitudesFiltradas.map((sol) => {
              const badge = getEstadoBadge(sol.estado);
              const anioSol = obtenerAnioSolicitud(sol);
              return (
                <div key={sol.id} className="p-4 space-y-2.5 hover:bg-slate-50/70">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                      {sol.codigo} • {anioSol}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                      {sol.estado.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {TIPO_PRESTACION_LABELS[sol.tipo_prestacion]} — {sol.beneficiario_nombre}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-mono font-extrabold text-[#166534] tabular-nums">
                      Reembolso: {formatCurrency(sol.monto_reembolso)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {sol.comprobante_filename && (
                        <button
                          type="button"
                          onClick={() => onVerComprobante(sol)}
                          className="px-2.5 py-1 text-xs font-bold text-[#006799] bg-sky-50 border border-sky-200 rounded-lg"
                        >
                          Doc
                        </button>
                      )}
                      <button
                        onClick={() => onVerDetalle(sol)}
                        className="px-3 py-1 text-xs font-bold text-white bg-[#006799] rounded-lg"
                      >
                        Ver Ficha
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vista Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Folio</th>
                  <th className="px-5 py-3.5">Prestación / Glosa</th>
                  <th className="px-5 py-3.5">Beneficiario</th>
                  <th className="px-5 py-3.5">Atención / Ejercicio</th>
                  <th className="px-5 py-3.5 text-right">Boleta CLP</th>
                  <th className="px-5 py-3.5 text-right">Reembolso CLP</th>
                  <th className="px-5 py-3.5 text-center">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {solicitudesFiltradas.map((sol) => {
                  const badge = getEstadoBadge(sol.estado);
                  const anioSol = obtenerAnioSolicitud(sol);
                  const esAnioAnterior = anioSol < anioActual;
                  return (
                    <tr key={sol.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-800 tabular-nums whitespace-nowrap">
                        {sol.codigo}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-1 rounded-lg bg-sky-50 border border-sky-200/80 text-[10px] font-mono font-bold text-[#006799] shrink-0">
                            {getTipoPrestacionIcon(sol.tipo_prestacion)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900">
                              {TIPO_PRESTACION_LABELS[sol.tipo_prestacion]}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate max-w-[200px]" title={sol.descripcion}>
                              {sol.descripcion || 'Sin observaciones'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800">{sol.beneficiario_nombre}</p>
                        <p className="text-[11px] text-slate-400">{sol.beneficiario_parentesco}</p>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="font-mono text-slate-800 font-semibold tabular-nums">
                          {formatDate(sol.fecha_atencion)}
                        </p>
                        <span
                          className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${
                            esAnioAnterior
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-emerald-50 text-[#166534] border border-emerald-200/70'
                          }`}
                        >
                          Cupo {anioSol}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                        {formatCurrency(sol.monto_boleta)}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <span className="font-mono font-extrabold text-[#166534] tabular-nums">
                          {formatCurrency(sol.monto_reembolso)}
                        </span>
                        <span className="block text-[10px] text-slate-400 tabular-nums">
                          {esAnioAnterior
                            ? `Cerrado ${anioSol}`
                            : sol.monto_copago > 0
                            ? `${Math.round((sol.monto_reembolso / sol.monto_copago) * 100)}% copago`
                            : 'Directo'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {sol.estado.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {sol.comprobante_filename && (
                            <button
                              type="button"
                              onClick={() => onVerComprobante(sol)}
                              className="px-2.5 py-1.5 text-xs font-bold text-[#006799] bg-sky-50 hover:bg-sky-100 border border-sky-200/80 rounded-xl transition-colors"
                              title={`Ver ${sol.comprobante_filename}`}
                            >
                              Doc
                            </button>
                          )}
                          <button
                            onClick={() => onVerDetalle(sol)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                          >
                            Ficha
                          </button>
                        </div>
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
