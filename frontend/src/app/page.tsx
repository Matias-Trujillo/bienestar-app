'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { DashboardCards } from '@/components/DashboardCards';
import { QuickActions } from '@/components/QuickActions';
import { MovementsTable } from '@/components/MovementsTable';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner de Bienvenida / Ficha Resumen del Socio ("Hoja Socio") */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 sm:p-8 shadow-xl border border-slate-700/40">
        {/* Patrón sutil de fondo */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {user?.rolLabel || 'Socio Activo'} • N° Registro #{user?.id || '1042'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bienvenido, {user?.nombreCompleto || 'Socio'}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Bienvenido a tu portal de Bienestar. Aquí puedes consultar tu saldo anual médico, revisar el estado de tus cotizaciones previsionales, tramitar solicitudes de reembolso y postular a los beneficios del comité.
            </p>
          </div>

          {/* Micro-datos del socio en pastillas dinámicas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="block text-slate-400 text-[11px]">RUT Afiliado</span>
              <span className="font-bold text-white tracking-wide">{user?.rut || 'Sin especificar'}</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="block text-slate-400 text-[11px]">Dependencia</span>
              <span className="font-bold text-white">{user?.departamento || 'Municipalidad'}</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 col-span-2 sm:col-span-1">
              <span className="block text-slate-400 text-[11px]">Antigüedad</span>
              <span className="font-bold text-emerald-300">{user?.antiguedad || '1 Año'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sección 1: Botones de Acción Rápida (Solicitar Reembolso & Postular a Beneficio) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Acciones Frecuentes
          </h2>
          <span className="text-xs text-slate-400">Trámites 100% digitales</span>
        </div>
        <QuickActions />
      </section>

      {/* Sección 2: Tarjetas de Resumen Dinámicas (Saldo Anual de Salud y Estado Previsional) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Estado de Fondos y Coberturas
          </h2>
          <span className="text-xs text-emerald-600 font-semibold">
            Vigencia: Período Anual 2026
          </span>
        </div>
        <DashboardCards
          saldoDisponible={user?.saldoSaludDisponible ?? 150000}
          saldoTotal={user?.saldoSaludTotalAnual ?? 250000}
          estadoPrevisional={user?.estadoPrevisional ?? 'Al día'}
          cargasFamiliares={user?.cargasRegistradas ?? 2}
        />
      </section>

      {/* Sección 3: Tabla de Últimos Movimientos */}
      <section className="space-y-3">
        <MovementsTable />
      </section>
    </div>
  );
}
