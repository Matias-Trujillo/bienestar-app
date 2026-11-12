import React from 'react';

interface StatsData {
  usuarios: {
    total: number;
    socios_total: number;
    socios_habilitados: number;
    socios_carencia: number;
  };
  pendientes: {
    afiliaciones: number;
    reembolsos: number;
    beneficios: number;
    total: number;
  };
  auditoria: {
    total_eventos: number;
  };
}

interface AdminDashboardHeaderProps {
  stats: StatsData | null;
  onRefresh: () => void;
}

// [ESTUDIANTE INFORMÁTICA] Cabecera del Módulo 5 (Administración y Auditoría Inmutable — HU-09 y HU-10) bajo diseño Data-Dense.
export const AdminDashboardHeader: React.FC<AdminDashboardHeaderProps> = ({ stats, onRefresh }) => {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-[#0c2b45] text-white border border-slate-800 overflow-hidden">
        <div className="h-1 w-full bg-[#006799]" />
        <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-white/10 text-sky-200 border border-white/15">
              <span className="w-1.5 h-1.5 rounded-full bg-[#78a200]" />
              Módulo 5 • HU-09 & HU-10 • Gobernanza y Seguridad
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Administración Central y Bitácora de Auditoría
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Gestión de cuentas directivas (máx. 7), catálogo de bonos Grado 15, parámetros globales y registro append-only en <code className="text-sky-200">audit_logs</code>.
            </p>
          </div>

          <button
            onClick={onRefresh}
            className="px-3.5 py-2 rounded-md text-xs font-bold text-white bg-white/10 hover:bg-white/15 border border-white/20 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <span>↺</span> Sincronizar Indicadores
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 bg-white rounded-lg border border-slate-200 border-l-4 border-l-[#006799]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Padrón de Usuarios
            </span>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5 tabular-nums">
              {stats.usuarios.total}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
              {stats.usuarios.socios_total} socios ({stats.usuarios.socios_habilitados} hab. / {stats.usuarios.socios_carencia} carencia)
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-slate-200 border-l-4 border-l-[#b45309]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#b45309]">
              Trámites por Resolver
            </span>
            <p className="text-2xl font-extrabold text-[#b45309] mt-0.5 tabular-nums">
              {stats.pendientes.total}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
              {stats.pendientes.afiliaciones} afil. • {stats.pendientes.reembolsos} salud • {stats.pendientes.beneficios} bonos
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-slate-200 border-l-4 border-l-[#166534]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#166534]">
              Regla de Carencia
            </span>
            <p className="text-2xl font-extrabold text-[#166534] mt-0.5 tabular-nums">
              6 Meses
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Control estatutario activo en salud y bonos
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-slate-200 border-l-4 border-l-[#0c2b45]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#0c2b45]">
              Eventos Auditados
            </span>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5 tabular-nums">
              {stats.auditoria.total_eventos}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Bitácora inmutable (append-only)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
