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

// [ESTUDIANTE INFORMÁTICA] Asocia cada código de bono estatutario con su ícono vectorial.
function renderBonoIcon(id: string, className = 'w-5 h-5'): React.ReactNode {
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

// [ESTUDIANTE INFORMÁTICA] Tarjeta moderna de bono municipal con badge de ícono estilizado, porcentaje G15 y elevación al pasar el cursor.
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
  const iconStyle = esCalendario
    ? 'bg-amber-50 text-[#b45309] border-amber-200/80'
    : esVacaciones
    ? 'bg-emerald-50 text-[#166534] border-emerald-200/80'
    : 'bg-sky-50 text-[#006799] border-sky-200/80';

  return (
    <div className="card-modern-interactive flex flex-col justify-between overflow-hidden group min-w-0">
      <div className="p-5 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${iconStyle}`}>
              {renderBonoIcon(bono.id, 'w-5 h-5')}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 text-base leading-tight group-hover:text-[#006799] transition-colors truncate">
                {bono.nombre}
              </h3>
              <span className="text-xs text-slate-500 font-normal block truncate">{bono.categoria}</span>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-[#006799] border border-sky-200/80 tabular-nums">
              {bono.porcentaje}% G15
            </span>
            {bono.periodo_devengo && (
              <span className="text-xs text-slate-400 font-normal mt-0.5">{bono.periodo_devengo}</span>
            )}
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/70">
            <span className="font-semibold text-slate-700 text-xs block">Requisitos Legales:</span>
            <p className="text-slate-600 text-xs leading-relaxed mt-0.5 font-normal">{bono.requisitos}</p>
          </div>
          <div>
            <span className="text-slate-500 text-xs font-medium block">
              Documentación Requerida:
            </span>
            <p className="text-slate-700 text-xs font-normal mt-0.5">{bono.documentacion_requerida}</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs text-slate-500 font-medium block">
            Monto a Liquidar
          </span>
          <span className="text-xl font-bold text-[#166534] tabular-nums">
            {formatCurrency(bono.monto_calculado)}
          </span>
        </div>

        <div className="shrink-0">
          {esCalendario ? (
            <span className="text-[11px] font-bold text-[#b45309] bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl">
              Nómina (HU-06)
            </span>
          ) : esVacaciones && esDirectivaOAdmin ? (
            <div className="flex gap-1.5">
              <button
                onClick={() => onPostular(bono)}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Postular
              </button>
              <button
                onClick={onAsignacionDirecta}
                className="px-3 py-1.5 text-xs font-bold text-white bg-[#166534] hover:bg-emerald-800 rounded-xl shadow-2xs transition-colors"
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
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all shadow-2xs ${
                cumpleRequisito6Meses
                  ? 'text-white bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95'
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
};

// [ESTUDIANTE INFORMÁTICA] Catálogo interactivo de bonos con barra de búsqueda moderna y grilla adaptable.
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
    <div className="space-y-5 min-w-0">
      <div className="card-modern p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <div className="absolute left-3 top-2.5 text-slate-400">
            <SearchIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Buscar bono o requisito legal..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200/90 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#006799] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
            <FilterIcon className="w-3.5 h-3.5" /> Tipo:
          </span>
          <div className="inline-flex flex-wrap p-1 bg-slate-100 rounded-xl border border-slate-200/60">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'contingencia', label: 'Contingencia (HU-05)' },
              { id: 'calendario', label: 'Calendario (HU-06)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFiltroCategoria(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroCategoria === tab.id
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 min-w-0">
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
