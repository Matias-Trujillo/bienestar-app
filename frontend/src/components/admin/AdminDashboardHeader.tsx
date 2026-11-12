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

// [ESTUDIANTE INFORMÁTICA] Cabecera moderna del Módulo 5 con tarjetas KPI estilizadas y cero desborde.
export const AdminDashboardHeader: React.FC<AdminDashboardHeaderProps> = ({ stats, onRefresh }) => {
  return (
    <div className="space-y-5 min-w-0">
      <div className="hero-institutional">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
        <div className="p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-sky-200 border border-white/15">
              <span className="w-2 h-2 rounded-full bg-[#78a200]" />
              Módulo 5 • HU-09 & HU-10 • Gobernanza y Seguridad
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Administración Central del Comité
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Supervisión de módulos, gestión de cuentas de la directiva, control de parámetros reglamentarios y bitácora inmutable de auditoría.
            </p>
          </div>

          <button
            onClick={onRefresh}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors flex items-center gap-2 shrink-0"
          >
            <span>↺</span> Sincronizar métricas
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <div className="card-modern-interactive p-5 min-w-0">
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#006799] block truncate">
              Padrón de Usuarios
            </span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {stats.usuarios.total}
            </p>
            <p className="text-xs text-slate-500 mt-1 tabular-nums truncate">
              {stats.usuarios.socios_total} socios ({stats.usuarios.socios_habilitados} hab. / {stats.usuarios.socios_carencia} carencia)
            </p>
          </div>

          <div className="card-modern-interactive p-5 min-w-0">
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#b45309] block truncate">
              Pendientes por Resolver
            </span>
            <p className="text-2xl font-extrabold text-[#b45309] mt-1 tabular-nums">
              {stats.pendientes.total}
            </p>
            <p className="text-xs text-slate-500 mt-1 tabular-nums truncate">
              {stats.pendientes.afiliaciones} afil. • {stats.pendientes.reembolsos} salud • {stats.pendientes.beneficios} bonos
            </p>
          </div>

          <div className="card-modern-interactive p-5 min-w-0">
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#166534] block truncate">
              Cómputo Carencias
            </span>
            <p className="text-2xl font-extrabold text-[#166534] mt-1 tabular-nums">
              Regla 6 Meses
            </p>
            <p className="text-xs text-slate-500 mt-1 truncate">
              Validación activa en salud y bonos
            </p>
          </div>

          <div className="card-modern-interactive p-5 min-w-0">
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#0c2b45] block truncate">
              Eventos Auditados
            </span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {stats.auditoria.total_eventos}
            </p>
            <p className="text-xs text-slate-500 mt-1 truncate">
              Registros inmutables en base de datos
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
