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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 max-w-full scrollbar-none">
        <button
          onClick={() => setActiveTab('catalogo')}
          className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'catalogo'
              ? 'bg-[#0077b6] text-white shadow-md shadow-sky-800/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <GiftIcon className="w-4 h-4" />
          Catálogo & Reglas
        </button>

        <button
          onClick={() => setActiveTab('hoja_socio')}
          className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'hoja_socio'
              ? 'bg-[#0077b6] text-white shadow-md shadow-sky-800/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileTextIcon className="w-4 h-4" />
          Mi Hoja de Beneficios
          {totalSolicitudes > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'hoja_socio' ? 'bg-white text-[#0077b6]' : 'bg-sky-100 text-[#0077b6]'
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
              className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'gestion_directiva'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ShieldCheckIcon className="w-4 h-4" />
              Gestión (Directiva)
            </button>

            <button
              onClick={() => setActiveTab('liquidacion_masiva')}
              className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'liquidacion_masiva'
                  ? 'bg-[#558b2f] text-white shadow-md shadow-emerald-700/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <SlidersIcon className="w-4 h-4" />
              Liquidación Masiva
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {esDirectivaOAdmin && (
          <button
            onClick={onOpenAsignacionDirecta}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm flex items-center gap-1.5 transition"
          >
            <PalmtreeIcon className="w-3.5 h-3.5" />
            Asignación Directa Vacaciones
          </button>
        )}
        <button
          onClick={onRefresh}
          className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition"
          title="Refrescar datos"
        >
          <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
