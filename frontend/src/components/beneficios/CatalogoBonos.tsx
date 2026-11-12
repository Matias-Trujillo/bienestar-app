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

// [ESTUDIANTE INFORMÁTICA] Asocia cada código de bono estatutario con su ícono SVG limpio (Lucide/SVG).
function renderBonoIcon(id: string, className = 'w-4 h-4'): React.ReactNode {
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
}

interface BonoCardItemProps {
  bono: BonoCatalogoItem;
  cumpleRequisito6Meses: boolean;
  esDirectivaOAdmin: boolean;
  onPostular: (bono: BonoCatalogoItem) => void;
  onAsignacionDirecta: () => void;
  onError: (msg: string) => void;
}

// [ESTUDIANTE INFORMÁTICA] Ficha técnica de bono municipal con bordes firmes, porcentaje Grado 15 y monto en formato tabular.
const BonoCatalogoCard: React.FC<BonoCardItemProps> = ({
  bono,
  cumpleRequisito6Meses,
  esDirectivaOAdmin,
  onPostular,
  onAsignacionDirecta,
  onError,
}) => {
  const esCalendario = ['invierno', 'navidad'].includes(bono.id);
  const esVacaciones = bono.id === 'vacaciones';
  const borderAccent = esCalendario
    ? 'border-l-[#b45309]'
    : esVacaciones
    ? 'border-l-[#166534]'
    : 'border-l-[#006799]';

  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 border-l-4 ${borderAccent} hover:border-slate-300 transition-colors flex flex-col justify-between overflow-hidden`}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[#0c2b45] shrink-0">
              {renderBonoIcon(bono.id, 'w-4 h-4')}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">
                {bono.nombre}
              </h3>
              <span className="text-[11px] text-slate-500">{bono.categoria}</span>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-50 text-[#006799] border border-sky-200 tabular-nums">
              {bono.porcentaje}% G15
            </span>
            {bono.periodo_devengo && (
              <span className="text-[10px] text-slate-400 mt-0.5">{bono.periodo_devengo}</span>
            )}
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200/80">
            <span className="font-bold text-slate-700 text-[11px] block">Requisito Estatutario:</span>
            <p className="text-slate-600 text-[11px] leading-snug mt-0.5">{bono.requisitos}</p>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">
              Respaldo Obligatorio:
            </span>
            <p className="text-slate-800 text-[11px] font-medium mt-0.5">{bono.documentacion_requerida}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
            Monto Calculado
          </span>
          <span className="text-base font-extrabold text-[#166534] font-mono tabular-nums">
            {formatCurrency(bono.monto_calculado)}
          </span>
        </div>

        <div>
          {esCalendario ? (
            <span className="text-[11px] font-mono font-bold text-[#b45309] bg-amber-50 border border-amber-300 px-2.5 py-1 rounded">
              Nómina HU-06
            </span>
          ) : esVacaciones && esDirectivaOAdmin ? (
            <div className="flex gap-1.5">
              <button
                onClick={() => onPostular(bono)}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded transition-colors"
              >
                Postular
              </button>
              <button
                onClick={onAsignacionDirecta}
                className="px-2.5 py-1 text-xs font-bold text-white bg-[#166534] hover:bg-emerald-800 rounded transition-colors"
              >
                Asignar
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
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors ${
                cumpleRequisito6Meses
                  ? 'text-white bg-[#006799] hover:bg-[#0c2b45]'
                  : 'text-slate-400 bg-slate-200 cursor-not-allowed'
              }`}
            >
              Solicitar Bono
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// [ESTUDIANTE INFORMÁTICA] Catálogo interactivo de bonos (HU-05 / HU-06) con buscador y filtro de modalidad.
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

  const bonosFiltrados = useMemo(() => {
    if (!catalogo) return [];
    let list = [...catalogo.bonos_contingencia, ...catalogo.bonos_calendario];
    if (filtroCategoria === 'contingencia') list = catalogo.bonos_contingencia;
    if (filtroCategoria === 'calendario') list = catalogo.bonos_calendario;
    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      list = list.filter(
        (b) => b.nombre.toLowerCase().includes(q) || b.requisitos.toLowerCase().includes(q)
      );
    }
    return list;
  }, [catalogo, filtroCategoria, busqueda]);

  return (
    <div className="space-y-4">
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <div className="absolute left-2.5 top-2 text-slate-400">
            <SearchIcon className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            placeholder="Filtrar bono o requisito estatutario..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#006799] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
            <FilterIcon className="w-3.5 h-3.5" /> Modalidad:
          </span>
          <div className="inline-flex p-0.5 bg-slate-200/70 rounded-md border border-slate-300/80">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'contingencia', label: 'Contingencia (HU-05)' },
              { id: 'calendario', label: 'Calendario (HU-06)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFiltroCategoria(tab.id)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  filtroCategoria === tab.id
                    ? 'bg-[#0c2b45] text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bonosFiltrados.map((bono) => (
          <BonoCatalogoCard
            key={bono.id}
            bono={bono}
            cumpleRequisito6Meses={cumpleRequisito6Meses}
            esDirectivaOAdmin={esDirectivaOAdmin}
            onPostular={onPostular}
            onAsignacionDirecta={onAsignacionDirecta}
            onError={onError}
          />
        ))}
      </div>
    </div>
  );
};
