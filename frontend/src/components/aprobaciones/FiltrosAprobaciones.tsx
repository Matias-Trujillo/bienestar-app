'use client';

import React from 'react';
import { TramoDias } from './IndicadorTramoBadge';

interface FiltrosAprobacionesProps {
  filtroEstado: string;
  setFiltroEstado: (val: string) => void;
  filtroDias: 'todos' | TramoDias;
  setFiltroDias: (val: 'todos' | TramoDias) => void;
  busqueda: string;
  setBusqueda: (val: string) => void;
  conteoPendientes: number;
}

// [ESTUDIANTE INFORMÁTICA] Barra de filtrado directivo con selector segmentado y control de SLA de revisión.
export const FiltrosAprobaciones: React.FC<FiltrosAprobacionesProps> = ({
  filtroEstado,
  setFiltroEstado,
  filtroDias,
  setFiltroDias,
  busqueda,
  setBusqueda,
  conteoPendientes,
}) => {
  return (
    <div className="p-3.5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/70">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center p-0.5 bg-slate-200/70 rounded-md border border-slate-300/80">
          <button
            onClick={() => setFiltroEstado('en_revision')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors tabular-nums ${
              filtroEstado === 'en_revision'
                ? 'bg-[#b45309] text-white font-bold'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Pendientes ({conteoPendientes})
          </button>
          <button
            onClick={() => setFiltroEstado('aprobado')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              filtroEstado === 'aprobado'
                ? 'bg-[#166534] text-white font-bold'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Aprobadas
          </button>
          <button
            onClick={() => setFiltroEstado('rechazado')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              filtroEstado === 'rechazado'
                ? 'bg-rose-700 text-white font-bold'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Rechazadas
          </button>
          <button
            onClick={() => setFiltroEstado('todos')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              filtroEstado === 'todos'
                ? 'bg-[#0c2b45] text-white font-bold'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Todas
          </button>
        </div>

        <select
          value={filtroDias}
          onChange={(e) => setFiltroDias(e.target.value as 'todos' | TramoDias)}
          className="text-xs font-semibold border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#006799]"
        >
          <option value="todos">Plazo de revisión: Todos</option>
          <option value="verde">Al día (&lt; 5 días)</option>
          <option value="amarillo">Atención (5 a 9 días)</option>
          <option value="rojo">Prioritario (≥ 10 días)</option>
        </select>
      </div>

      <input
        type="text"
        placeholder="Filtrar por RUN, nombre o folio RMB..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="text-xs px-3 py-1.5 rounded-md border border-slate-300 w-full lg:w-72 bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
      />
    </div>
  );
};
