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

// [ESTUDIANTE INFORMÁTICA] Componente de control para búsqueda y filtrado por estado y tramos de días.
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
    <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/50">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setFiltroEstado('en_revision')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              filtroEstado === 'en_revision' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pendientes ({conteoPendientes})
          </button>
          <button
            onClick={() => setFiltroEstado('aprobado')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              filtroEstado === 'aprobado' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Aprobadas
          </button>
          <button
            onClick={() => setFiltroEstado('rechazado')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              filtroEstado === 'rechazado' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Rechazadas
          </button>
          <button
            onClick={() => setFiltroEstado('todos')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              filtroEstado === 'todos' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todas
          </button>
        </div>

        <select
          value={filtroDias}
          onChange={(e) => setFiltroDias(e.target.value as 'todos' | TramoDias)}
          className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
        >
          <option value="todos">Todos los plazos</option>
          <option value="verde">Menos de 5 días (Verde)</option>
          <option value="amarillo">5 a 9 días (Amarillo)</option>
          <option value="rojo">10 o más días (Rojo)</option>
        </select>
      </div>

      <input
        type="text"
        placeholder="Buscar por RUT, nombre o código RMB..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 w-full lg:w-72 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
    </div>
  );
};
