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

// [ESTUDIANTE INFORMÁTICA] Pestañas modernas con flex-wrap para evitar desbordes horizontales en pantallas medianas.
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
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200/80 pb-3 min-w-0">
      <div className="inline-flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
        <button
          onClick={() => setActiveTab('catalogo')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'catalogo'
              ? 'bg-gradient-to-r from-[#0c2b45] to-[#006799] text-white shadow-xs'
              : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
          }`}
        >
          <GiftIcon className="w-4 h-4" />
          <span>Catálogo & Reglas</span>
        </button>

        <button
          onClick={() => setActiveTab('hoja_socio')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'hoja_socio'
              ? 'bg-gradient-to-r from-[#0c2b45] to-[#006799] text-white shadow-xs'
              : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
          }`}
        >
          <FileTextIcon className="w-4 h-4" />
          <span>Mi Hoja de Beneficios</span>
          {totalSolicitudes > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums ${
                activeTab === 'hoja_socio' ? 'bg-white/20 text-white' : 'bg-white text-[#006799] border border-slate-200'
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
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'gestion_directiva'
                  ? 'bg-[#006799] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
              }`}
            >
              <ShieldCheckIcon className="w-4 h-4" />
              <span>Gestión Directiva</span>
            </button>

            <button
              onClick={() => setActiveTab('liquidacion_masiva')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'liquidacion_masiva'
                  ? 'bg-[#166534] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
              }`}
            >
              <SlidersIcon className="w-4 h-4" />
              <span>Liquidación Masiva</span>
            </button>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {esDirectivaOAdmin && (
          <button
            onClick={onOpenAsignacionDirecta}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#166534] to-[#558b2f] hover:opacity-95 shadow-xs flex items-center gap-1.5 transition-all"
          >
            <PalmtreeIcon className="w-4 h-4" />
            <span>Asignación Directa Vacaciones</span>
          </button>
        )}
        <button
          onClick={onRefresh}
          className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200/90 rounded-xl shadow-2xs transition-colors"
          title="Refrescar datos"
        >
          <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
