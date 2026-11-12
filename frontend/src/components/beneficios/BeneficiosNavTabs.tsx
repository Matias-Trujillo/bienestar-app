import React from 'react';
import {
  GiftIcon,
  FileTextIcon,
  ShieldCheckIcon,
  SlidersIcon,
  PalmtreeIcon,
  RefreshCwIcon,
} from './Icons';

export type BeneficiosTab = 'catalogo' | 'hoja_socio' | 'gestion_directiva' | 'liquidacion_masiva';

interface BeneficiosNavTabsProps {
  activeTab: BeneficiosTab;
  setActiveTab: (tab: BeneficiosTab) => void;
  esDirectivaOAdmin: boolean;
  totalSolicitudes: number;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenAsignacionDirecta: () => void;
}

// [ESTUDIANTE INFORMÁTICA] Selector de vistas del Módulo 3 con pestañas estructuradas de bordes nítidos.
export const BeneficiosNavTabs: React.FC<BeneficiosNavTabsProps> = ({
  activeTab,
  setActiveTab,
  esDirectivaOAdmin,
  totalSolicitudes,
  isLoading,
  onRefresh,
  onOpenAsignacionDirecta,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
      <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-md border border-slate-300/80 overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('catalogo')}
          className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'catalogo'
              ? 'bg-[#0c2b45] text-white'
              : 'text-slate-700 hover:bg-white/60 hover:text-slate-900'
          }`}
        >
          <GiftIcon className="w-3.5 h-3.5" />
          Catálogo Grado 15
        </button>

        <button
          onClick={() => setActiveTab('hoja_socio')}
          className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'hoja_socio'
              ? 'bg-[#0c2b45] text-white'
              : 'text-slate-700 hover:bg-white/60 hover:text-slate-900'
          }`}
        >
          <FileTextIcon className="w-3.5 h-3.5" />
          Mis Postulaciones
          {totalSolicitudes > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
                activeTab === 'hoja_socio' ? 'bg-white/20 text-white' : 'bg-white text-[#006799] border border-slate-300'
              }`}
            >
              {totalSolicitudes}
            </span>
          )}
        </button>

        {esDirectivaOAdmin && (
          <>
            <button
              onClick={() => setActiveTab('gestion_directiva')}
              className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'gestion_directiva'
                  ? 'bg-[#006799] text-white'
                  : 'text-slate-700 hover:bg-white/60 hover:text-slate-900'
              }`}
            >
              <ShieldCheckIcon className="w-3.5 h-3.5" />
              Resolución Directiva
            </button>

            <button
              onClick={() => setActiveTab('liquidacion_masiva')}
              className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'liquidacion_masiva'
                  ? 'bg-[#166534] text-white'
                  : 'text-slate-700 hover:bg-white/60 hover:text-slate-900'
              }`}
            >
              <SlidersIcon className="w-3.5 h-3.5" />
              Nómina Masiva (HU-06)
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {esDirectivaOAdmin && (
          <button
            onClick={onOpenAsignacionDirecta}
            className="px-3 py-1.5 rounded-md text-xs font-bold text-white bg-[#166534] hover:bg-emerald-800 flex items-center gap-1.5 transition-colors"
          >
            <PalmtreeIcon className="w-3.5 h-3.5" />
            Asignación Directa Vacaciones
          </button>
        )}
        <button
          onClick={onRefresh}
          className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-md transition-colors"
          title="Actualizar datos"
        >
          <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
