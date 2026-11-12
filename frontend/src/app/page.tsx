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
    { label: 'Unidad / Dirección', value: departamento || 'Municipalidad' },
    { label: 'Calidad / Perfil', value: rolLabel || 'Socio Activo', variant: 'warning' },
    { label: 'Antigüedad', value: antiguedad || '1 Año', variant: 'success', mono: true },
  ];
}

// [ESTUDIANTE INFORMÁTICA] Dashboard "Hoja de Socio" con diseño moderno, responsivo y libre de desbordamientos.
export default function DashboardPage() {
  const { user } = useAuth();
  const metrics = buildFiliacionMetrics(
    user?.rut,
    user?.departamento,
    user?.rolLabel,
    user?.antiguedad
  );

  return (
    <div className="space-y-7 animate-fade-in min-w-0">
      {/* Cabecera Ejecutiva de Filiación Municipal */}
      <div className="hero-institutional">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
        <div className="p-6 sm:p-7 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-amber-200 border border-white/15 tabular-nums">
                <span className="w-2 h-2 rounded-full bg-[#78a200]" />
                Ficha de Filiación N° #{String(user?.id || '1').padStart(4, '0')}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/25">
                Ley N° 19.754 • Bienestar Municipal
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Hoja de Socio y Resumen Previsional
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Estado consolidado de coberturas médicas, cupos anuales y beneficios vigentes en el{' '}
              <strong className="text-amber-200 font-semibold">
                Comité de Bienestar de la I. Municipalidad de Peralillo
              </strong>.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs w-full xl:w-auto xl:min-w-[500px] min-w-0">
            {metrics.map((item) => (
              <div
                key={item.label}
                className="p-3.5 rounded-xl bg-white/[0.08] backdrop-blur-xs border border-white/15 min-w-0"
              >
                <span className="block text-slate-300 text-[10px] uppercase tracking-wider font-semibold mb-1 truncate">
                  {item.label}
                </span>
                <span
                  title={item.value}
                  className={`text-xs sm:text-sm font-extrabold truncate block ${
                    item.mono ? 'font-mono tabular-nums' : ''
                  } ${
                    item.variant === 'warning'
                      ? 'text-amber-200'
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

      {/* Sección 1: Operaciones Directas */}
      <section className="space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
            Trámites y Accesos Rápidos
          </h2>
          <span className="text-xs text-slate-400 font-medium">Gestión 100% digital con trazabilidad</span>
        </div>
        <QuickActions />
      </section>

      {/* Sección 2: Estado de Fondos y Coberturas */}
      <section className="space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
            Estado de Fondos y Cobertura Familiar
          </h2>
          <span className="text-xs text-[#166534] font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80 tabular-nums">
            Vigencia Anual {new Date().getFullYear()} (01 Ene – 31 Dic)
          </span>
        </div>
        <DashboardCards
          saldoDisponible={user?.saldoSaludDisponible ?? 150000}
          saldoTotal={user?.saldoSaludTotalAnual ?? 150000}
          estadoPrevisional={user?.estadoPrevisional ?? 'Al día'}
          cargasFamiliares={user?.cargasRegistradas ?? 2}
        />
      </section>

      {/* Sección 3: Historial de Movimientos */}
      <section className="min-w-0">
        <MovementsTable />
      </section>
    </div>
  );
}
