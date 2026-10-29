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

export const AdminDashboardHeader: React.FC<AdminDashboardHeaderProps> = ({ stats, onRefresh }) => {
  return (
    <div className="space-y-4">
      {/* Banner Principal Superusuario */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0b2742] via-[#0f3b5e] to-[#1a3818] text-white p-6 sm:p-8 shadow-xl border border-sky-800/30">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-[#0077b6]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[#558b2f]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-sky-200 border border-white/15 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-[#558b2f] animate-pulse" />
              Ilustre Municipalidad de Peralillo • Consola de Control Maestro
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Administración Central del Comité
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Supervisión en tiempo real de todos los módulos, gestión de cuentas y roles de la directiva, control de parámetros reglamentarios y trazabilidad inmutable mediante bitácora de auditoría.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition flex items-center gap-2"
            >
              <span>↺</span> Sincronizar métricas
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas en Vivo */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-[11px] uppercase font-semibold text-slate-400">Total Usuarios</span>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.usuarios.total}</p>
            <p className="text-xs text-slate-500 mt-1">
              {stats.usuarios.socios_total} socios ({stats.usuarios.socios_habilitados} habilitados / {stats.usuarios.socios_carencia} en carencia)
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-[11px] uppercase font-semibold text-amber-600">Pendientes por Resolver</span>
            <p className="text-2xl font-black text-amber-700 mt-1">{stats.pendientes.total}</p>
            <p className="text-xs text-slate-500 mt-1">
              {stats.pendientes.afiliaciones} afiliaciones • {stats.pendientes.reembolsos} salud • {stats.pendientes.beneficios} bonos
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-[11px] uppercase font-semibold text-emerald-600">Cómputo Carencias</span>
            <p className="text-2xl font-black text-emerald-700 mt-1">Regla 6 Meses</p>
            <p className="text-xs text-slate-500 mt-1">Validación automática activa en salud y bonos</p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-[11px] uppercase font-semibold text-purple-600">Eventos Auditados</span>
            <p className="text-2xl font-black text-purple-700 mt-1">{stats.auditoria.total_eventos}</p>
            <p className="text-xs text-slate-500 mt-1">Registros inmutables en base de datos</p>
          </div>
        </div>
      )}
    </div>
  );
};
