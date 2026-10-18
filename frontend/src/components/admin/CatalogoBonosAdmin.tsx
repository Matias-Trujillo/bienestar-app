import React, { useState } from 'react';
import { formatCurrency } from '@/lib/utils';

export interface BonoAdminItem {
  id: number;
  codigo: string;
  nombre: string;
  porcentaje: number;
  categoria: string;
  requisitos: string;
  documentacion_requerida: string;
  regla_asignacion: string;
  periodo_devengo?: string | null;
  permite_postulacion_socio: boolean;
  es_calendario: boolean;
  activo: boolean;
  icono: string;
}

interface CatalogoBonosAdminProps {
  bonos: BonoAdminItem[];
  sueldoBaseG15: number;
  loading: boolean;
  onCrearBono: () => void;
  onEditarBono: (bono: BonoAdminItem) => void;
  onToggleActivo: (bono: BonoAdminItem) => void;
  onEliminarBono: (bono: BonoAdminItem) => void;
}

export const CatalogoBonosAdmin: React.FC<CatalogoBonosAdminProps> = ({
  bonos,
  sueldoBaseG15,
  loading,
  onCrearBono,
  onEditarBono,
  onToggleActivo,
  onEliminarBono,
}) => {
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState<string>('');

  const categorias = ['todas', ...Array.from(new Set(bonos.map((b) => b.categoria)))];

  const bonosFiltrados = bonos.filter((b) => {
    if (filtroCategoria !== 'todas' && b.categoria !== filtroCategoria) return false;
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return b.nombre.toLowerCase().includes(q) || b.codigo.toLowerCase().includes(q) || b.requisitos.toLowerCase().includes(q);
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Catálogo Dinámico • Base Grado 15: {formatCurrency(sueldoBaseG15)}
          </div>
          <h2 className="text-base font-bold text-slate-800">
            Administración del Catálogo de Beneficios y Bonos
          </h2>
          <p className="text-xs text-slate-500">
            Crea nuevos beneficios, ajusta sus porcentajes reglamentarios y activa o desactiva su visibilidad en el portal de socios.
          </p>
        </div>

        <button
          onClick={onCrearBono}
          className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md transition flex items-center gap-1.5"
        >
          <span>✚</span> Crear Nuevo Beneficio
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setFiltroCategoria(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                filtroCategoria === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Buscar bono por nombre o código..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none w-full sm:w-64"
        />
      </div>

      {/* Grid de Bonos */}
      {loading ? (
        <p className="p-8 text-center text-sm text-slate-400">Cargando catálogo de bonos...</p>
      ) : bonosFiltrados.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-400 italic">No hay beneficios registrados con ese filtro.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bonosFiltrados.map((b) => {
            const montoEstimado = Math.round(sueldoBaseG15 * (b.porcentaje / 100.0));
            return (
              <div
                key={b.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  b.activo
                    ? 'bg-white border-slate-200/80 shadow-sm hover:shadow-md'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {b.categoria}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        b.activo
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {b.activo ? 'Visible en Portal' : 'Oculto / Inactivo'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{b.nombre}</h3>
                    <span className="text-[10px] font-mono text-slate-400">código: {b.codigo}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">% Grado 15</span>
                      <span className="text-base font-extrabold text-blue-700">{b.porcentaje}%</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-400 uppercase font-semibold">Monto Estimado</span>
                      <span className="text-sm font-bold text-slate-700">{formatCurrency(montoEstimado)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2" title={b.requisitos}>
                    {b.requisitos || 'Sin requisitos especiales especificados'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-4 mt-3 border-t border-slate-100">
                  <button
                    onClick={() => onEditarBono(b)}
                    className="flex-1 py-1.5 px-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-center"
                    title="Editar porcentajes, requisitos o parámetros"
                  >
                    Editar %
                  </button>
                  <button
                    onClick={() => onToggleActivo(b)}
                    className={`py-1.5 px-2.5 text-xs font-semibold rounded-xl transition ${
                      b.activo
                        ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                    title={b.activo ? 'Ocultar temporalmente del catálogo' : 'Hacer visible para socios'}
                  >
                    {b.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => onEliminarBono(b)}
                    className="py-1.5 px-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center justify-center"
                    title="Eliminar este beneficio permanentemente del catálogo"
                  >
                    🗑 Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
