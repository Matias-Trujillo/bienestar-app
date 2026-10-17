'use client';

import React, { useState, useMemo } from 'react';
import { BonoCatalogoItem, CatalogoBeneficios } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  GiftIcon,
  SnowflakeIcon,
  PalmtreeIcon,
  GraduationCapIcon,
  BabyIcon,
  HeartCrackIcon,
  RibbonIcon,
  StethoscopeIcon,
  FlameIcon,
  FileTextIcon,
  SearchIcon,
  FilterIcon,
} from './Icons';

interface CatalogoBonosProps {
  catalogo: CatalogoBeneficios | null;
  cumpleRequisito6Meses: boolean;
  esDirectivaOAdmin: boolean;
  onPostular: (bono: BonoCatalogoItem) => void;
  onAsignacionDirecta: () => void;
  onError: (msg: string) => void;
}

export const CatalogoBonos: React.FC<CatalogoBonosProps> = ({
  catalogo,
  cumpleRequisito6Meses,
  esDirectivaOAdmin,
  onPostular,
  onAsignacionDirecta,
  onError,
}) => {
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');

  const renderIcono = (id: string, className = 'w-6 h-6') => {
    switch (id) {
      case 'vacaciones':
        return <PalmtreeIcon className={className} />;
      case 'escolaridad':
        return <GraduationCapIcon className={className} />;
      case 'nacimiento':
        return <BabyIcon className={className} />;
      case 'fallecimiento_familiar':
        return <HeartCrackIcon className={className} />;
      case 'fallecimiento_afiliado':
        return <RibbonIcon className={className} />;
      case 'enfermedad_catastrofica':
        return <StethoscopeIcon className={className} />;
      case 'catastrofe_siniestro':
        return <FlameIcon className={className} />;
      case 'invierno':
        return <SnowflakeIcon className={className} />;
      case 'navidad':
        return <GiftIcon className={className} />;
      default:
        return <FileTextIcon className={className} />;
    }
  };

  const bonosFiltrados = useMemo(() => {
    if (!catalogo) return [];
    let list = [...catalogo.bonos_contingencia, ...catalogo.bonos_calendario];

    if (filtroCategoria !== 'todos') {
      if (filtroCategoria === 'contingencia') {
        list = catalogo.bonos_contingencia;
      } else if (filtroCategoria === 'calendario') {
        list = catalogo.bonos_calendario;
      }
    }

    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      list = list.filter((b) => b.nombre.toLowerCase().includes(q) || b.requisitos.toLowerCase().includes(q));
    }

    return list;
  }, [catalogo, filtroCategoria, busqueda]);

  return (
    <div className="space-y-6">
      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <div className="absolute left-3 top-3 text-slate-400">
            <SearchIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Buscar bono o requisito legal..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
            <FilterIcon className="w-3.5 h-3.5" /> Tipo:
          </span>
          <button
            onClick={() => setFiltroCategoria('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filtroCategoria === 'todos' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroCategoria('contingencia')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filtroCategoria === 'contingencia' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Contingencia (HU-05)
          </button>
          <button
            onClick={() => setFiltroCategoria('calendario')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filtroCategoria === 'calendario' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Calendario (HU-06)
          </button>
        </div>
      </div>

      {/* Grilla de Bonos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {bonosFiltrados.map((bono) => {
          const esCalendario = ['invierno', 'navidad'].includes(bono.id);
          const esVacaciones = bono.id === 'vacaciones';

          return (
            <div
              key={bono.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
                        esCalendario
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                          : esVacaciones
                          ? 'bg-gradient-to-br from-teal-500 to-emerald-600'
                          : 'bg-gradient-to-br from-blue-600 to-indigo-600'
                      }`}
                    >
                      {renderIcono(bono.id, 'w-6 h-6')}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-blue-600 transition">
                        {bono.nombre}
                      </h3>
                      <span className="text-[11px] text-slate-500">{bono.categoria}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200/60">
                      {bono.porcentaje}% G15
                    </span>
                    {bono.periodo_devengo && (
                      <span className="text-[10px] text-slate-400 mt-1">{bono.periodo_devengo}</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-bold text-slate-700 block mb-0.5">Requisitos Legales:</span>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{bono.requisitos}</p>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[11px] font-semibold">Documentación Requerida:</span>
                    <p className="text-slate-700 text-[11px] mt-0.5 font-medium">{bono.documentacion_requerida}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Monto a Liquidar</span>
                  <span className="text-lg font-black text-emerald-700">
                    {formatCurrency(bono.monto_calculado)}
                  </span>
                </div>

                <div>
                  {esCalendario ? (
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl">
                      Nómina Masiva (HU-06)
                    </span>
                  ) : esVacaciones && esDirectivaOAdmin ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onPostular(bono)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition"
                      >
                        Registrar
                      </button>
                      <button
                        onClick={onAsignacionDirecta}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition"
                      >
                        Asignar Directo
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (!cumpleRequisito6Meses) {
                          onError(
                            'No cumples con el requisito mínimo de 6 meses de permanencia en el Comité de Bienestar para postular a beneficios.'
                          );
                          return;
                        }
                        onPostular(bono);
                      }}
                      className={`px-4 py-1.5 text-xs font-bold rounded-xl transition shadow-sm ${
                        cumpleRequisito6Meses
                          ? 'text-white bg-blue-600 hover:bg-blue-700'
                          : 'text-slate-400 bg-slate-200 cursor-not-allowed'
                      }`}
                    >
                      Postular
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
