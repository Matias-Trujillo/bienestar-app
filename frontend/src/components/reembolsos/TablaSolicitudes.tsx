import React, { useState } from 'react';
import { SolicitudReembolso, EstadoReembolso, TipoPrestacion, TIPO_PRESTACION_LABELS } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { obtenerAnioSolicitud } from './ResumenSaludCards';

// [ESTUDIANTE INFORMÁTICA] Mapea el estado del reembolso a su variante cromática institucional con alto contraste.
export function getEstadoBadge(estado: EstadoReembolso) {
  const map: Record<EstadoReembolso, { bg: string; dot: string }> = {
    borrador: { bg: 'bg-slate-50 text-slate-600 border-slate-300', dot: 'bg-slate-400' },
    en_revision: { bg: 'bg-amber-50 text-[#b45309] border-amber-300', dot: 'bg-[#b45309]' },
    aprobado: { bg: 'bg-emerald-50 text-[#166534] border-emerald-300', dot: 'bg-[#166534]' },
    rechazado: { bg: 'bg-rose-50 text-rose-700 border-rose-300', dot: 'bg-rose-600' },
    pagado: { bg: 'bg-sky-50 text-[#006799] border-sky-300', dot: 'bg-[#006799]' },
  };
  return map[estado] || map.borrador;
}

// [ESTUDIANTE INFORMÁTICA] Retorna la sigla técnica de prestación en lugar de emojis informales.
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

// [ESTUDIANTE INFORMÁTICA] Barra de filtrado por ejercicio contable y estado de resolución.
const TablaSolicitudesToolbar: React.FC<HeaderFiltrosProps> = ({
  anioActual,
  aniosDisponibles,
  filtroAnio,
  setFiltroAnio,
  filtroEstado,
  setFiltroEstado,
}) => (
  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-slate-50/70 gap-3">
    <div>
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#0c2b45]">
          Cartola de Solicitudes de Reembolso
        </h2>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white text-slate-600 border border-slate-200 tabular-nums">
          Tope $150.000 / Año
        </span>
      </div>
      <p className="text-[11px] text-slate-500 mt-0.5">
        Imputación independiente por año calendario (01 Ene – 31 Dic).
      </p>
    </div>

    <div className="flex items-center gap-2 flex-wrap">
      {aniosDisponibles.length > 1 && (
        <div className="inline-flex items-center p-0.5 rounded-md bg-slate-200/70 border border-slate-300/80">
          <button
            type="button"
            onClick={() => setFiltroAnio('todos')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
              filtroAnio === 'todos' ? 'bg-white text-[#0c2b45] font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos
          </button>
          {aniosDisponibles.map((anio) => (
            <button
              key={anio}
              type="button"
              onClick={() => setFiltroAnio(anio)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors tabular-nums ${
                filtroAnio === anio ? 'bg-white text-[#166534] font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {anio} {anio === anioActual ? '(Vigente)' : ''}
            </button>
          ))}
        </div>
      )}

      <div className="inline-flex p-0.5 bg-slate-200/70 rounded-md border border-slate-300/80">
        {ESTADO_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltroEstado(f.key)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
              filtroEstado === f.key
                ? 'bg-[#0c2b45] text-white'
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

// [ESTUDIANTE INFORMÁTICA] Tabla de reembolsos del socio con densidad financiera, códigos técnicos y montos tabulares.
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
    <section className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <TablaSolicitudesToolbar
        anioActual={anioActual}
        aniosDisponibles={aniosDisponibles}
        filtroAnio={filtroAnio}
        setFiltroAnio={setFiltroAnio}
        filtroEstado={filtroEstado}
        setFiltroEstado={setFiltroEstado}
      />

      {solicitudesFiltradas.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400">
          No existen solicitudes registradas bajo el criterio seleccionado.
        </div>
      ) : (
        <>
          {/* Vista Móvil Compacta */}
          <div className="block md:hidden divide-y divide-slate-200">
            {solicitudesFiltradas.map((sol) => {
              const badge = getEstadoBadge(sol.estado);
              const anioSol = obtenerAnioSolicitud(sol);
              return (
                <div key={sol.id} className="p-3.5 space-y-2 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                      {sol.codigo} • {anioSol}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
                      {sol.estado.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {TIPO_PRESTACION_LABELS[sol.tipo_prestacion]} — {sol.beneficiario_nombre}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-mono font-bold text-[#166534] tabular-nums">
                      Reembolso: {formatCurrency(sol.monto_reembolso)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {sol.comprobante_filename && (
                        <button
                          type="button"
                          onClick={() => onVerComprobante(sol)}
                          className="px-2 py-1 text-[11px] font-bold text-[#006799] bg-white border border-slate-300 rounded"
                        >
                          Doc
                        </button>
                      )}
                      <button
                        onClick={() => onVerDetalle(sol)}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#006799] rounded"
                      >
                        Ficha
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vista Desktop Data-Dense */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5">Folio</th>
                  <th className="px-4 py-2.5">Prestación / Glosa</th>
                  <th className="px-4 py-2.5">Beneficiario</th>
                  <th className="px-4 py-2.5">Atención / Ejercicio</th>
                  <th className="px-4 py-2.5 text-right">Boleta CLP</th>
                  <th className="px-4 py-2.5 text-right">Reembolso CLP</th>
                  <th className="px-4 py-2.5 text-center">Estado</th>
                  <th className="px-4 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {solicitudesFiltradas.map((sol) => {
                  const badge = getEstadoBadge(sol.estado);
                  const anioSol = obtenerAnioSolicitud(sol);
                  const esAnioAnterior = anioSol < anioActual;
                  return (
                    <tr key={sol.id} className="hover:bg-slate-50/90 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 tabular-nums whitespace-nowrap">
                        {sol.codigo}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] font-mono font-bold text-[#0c2b45]">
                            {getTipoPrestacionIcon(sol.tipo_prestacion)}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900">
                              {TIPO_PRESTACION_LABELS[sol.tipo_prestacion]}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate max-w-[200px]" title={sol.descripcion}>
                              {sol.descripcion || 'Sin observaciones'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{sol.beneficiario_nombre}</p>
                        <p className="text-[10px] text-slate-500">{sol.beneficiario_parentesco}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-mono text-slate-800 font-semibold tabular-nums">
                          {formatDate(sol.fecha_atencion)}
                        </p>
                        <span
                          className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tabular-nums ${
                            esAnioAnterior
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-emerald-50 text-[#166534] border border-emerald-200'
                          }`}
                        >
                          Cupo {anioSol}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                        {formatCurrency(sol.monto_boleta)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="font-mono font-bold text-[#166534] tabular-nums">
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
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {sol.estado.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {sol.comprobante_filename && (
                            <button
                              type="button"
                              onClick={() => onVerComprobante(sol)}
                              className="px-2 py-1 text-[11px] font-bold text-[#006799] bg-white hover:bg-sky-50 border border-slate-300 rounded transition-colors"
                              title={`Ver ${sol.comprobante_filename}`}
                            >
                              Doc
                            </button>
                          )}
                          <button
                            onClick={() => onVerDetalle(sol)}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors"
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
