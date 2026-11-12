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

// [ESTUDIANTE INFORMÁTICA] Barra de filtrado directivo con pestañas tipo píldora y buscador redondeado.
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
    <div className="p-4 sm:px-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/60">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-xl border border-slate-200/70">
          <button
            onClick={() => setFiltroEstado('en_revision')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all tabular-nums ${
              filtroEstado === 'en_revision'
                ? 'bg-amber-500 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pendientes ({conteoPendientes})
          </button>
          <button
            onClick={() => setFiltroEstado('aprobado')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filtroEstado === 'aprobado'
                ? 'bg-[#166534] text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aprobadas
          </button>
          <button
            onClick={() => setFiltroEstado('rechazado')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filtroEstado === 'rechazado'
                ? 'bg-rose-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rechazadas
          </button>
          <button
            onClick={() => setFiltroEstado('todos')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filtroEstado === 'todos'
                ? 'bg-[#0c2b45] text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas
          </button>
        </div>

        <select
          value={filtroDias}
          onChange={(e) => setFiltroDias(e.target.value as 'todos' | TramoDias)}
          className="text-xs font-semibold border border-slate-200/90 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#006799]"
        >
          <option value="todos">Plazo de revisión: Todos</option>
          <option value="verde">Al día (&lt; 5 días)</option>
          <option value="amarillo">Atención (5 a 9 días)</option>
          <option value="rojo">Prioritario (≥ 10 días)</option>
        </select>
      </div>

      <input
        type="text"
        placeholder="Buscar por RUN, nombre o folio RMB..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="text-xs px-3.5 py-2 rounded-xl border border-slate-200/90 w-full lg:w-72 bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
      />
    </div>
  );
};
