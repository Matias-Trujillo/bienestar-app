'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { DashboardCards } from '@/components/DashboardCards';
import { QuickActions } from '@/components/QuickActions';
import { MovementsTable } from '@/components/MovementsTable';
import { KpiMetricItem } from '@/types';

// [ESTUDIANTE INFORMÁTICA] Construye los 4 metadatos de filiación del funcionario para la cabecera ejecutiva.
function buildFiliacionMetrics(
  rut?: string,
  departamento?: string,
  rolLabel?: string,
  antiguedad?: string
): KpiMetricItem[] {
  return [
    { label: 'RUN Afiliado', value: rut || 'Sin especificar', mono: true },
    { label: 'Unidad Municipal', value: departamento || 'I. Municipalidad' },
    { label: 'Calidad Estatutaria', value: rolLabel || 'Socio Activo', variant: 'warning' },
    { label: 'Antigüedad Registrada', value: antiguedad || '1 Año', variant: 'success', mono: true },
  ];
}

// [ESTUDIANTE INFORMÁTICA] Vista principal "Hoja de Socio": diseño Data-Dense sin elementos flotantes difusos (Anti AI-Slop).
export default function DashboardPage() {
  const { user } = useAuth();
  const metrics = buildFiliacionMetrics(
    user?.rut,
    user?.departamento,
    user?.rolLabel,
    user?.antiguedad
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera Ejecutiva de Filiación Municipal */}
      <div className="rounded-lg bg-[#0c2b45] text-white border border-slate-800 overflow-hidden">
        <div className="h-1 w-full bg-[#006799]" />
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-white/10 text-sky-200 border border-white/15 tabular-nums">
                <span className="w-1.5 h-1.5 rounded-full bg-[#78a200]" />
                Folio #{String(user?.id || '1').padStart(4, '0')}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#006799]/40 text-sky-100 border border-sky-400/30">
                Ley N° 19.754 • Bienestar Municipal
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Hoja de Socio y Estado Previsional
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Cartola consolidada de coberturas médicas, cupos anuales y beneficios del Comité de Bienestar.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10 rounded-md bg-white/[0.04] border border-white/15 lg:min-w-[540px]">
            {metrics.map((item) => (
              <div key={item.label} className="p-3">
                <span className="block text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-0.5">
                  {item.label}
                </span>
                <span
                  className={`text-xs sm:text-sm font-bold truncate block ${
                    item.mono ? 'font-mono tabular-nums' : ''
                  } ${
                    item.variant === 'warning'
                      ? 'text-amber-300'
                      : item.variant === 'success'
                      ? 'text-lime-300'
                      : 'text-white'
                  }`}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Acciones operativas directas */}
      <section className="space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0c2b45]">
            Operaciones Directas del Afiliado
          </h2>
          <span className="text-[11px] font-medium text-slate-500">Ingreso digital con trazabilidad</span>
        </div>
        <QuickActions />
      </section>

      {/* Composición Asimétrica de Fondos y Estado Previsional */}
      <section className="space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0c2b45]">
            Disponibilidad Presupuestaria y Cobertura Familiar
          </h2>
          <span className="text-[11px] font-semibold text-[#166534] tabular-nums">
            Período Anual {new Date().getFullYear()} (01 Ene – 31 Dic)
          </span>
        </div>
        <DashboardCards
          saldoDisponible={user?.saldoSaludDisponible ?? 150000}
          saldoTotal={user?.saldoSaludTotalAnual ?? 150000}
          estadoPrevisional={user?.estadoPrevisional ?? 'Al día'}
          cargasFamiliares={user?.cargasRegistradas ?? 2}
        />
      </section>

      {/* Cartola Histórica de Movimientos */}
      <section>
        <MovementsTable />
      </section>
    </div>
  );
}
