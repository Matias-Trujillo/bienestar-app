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
      {/* Ficha Ejecutiva de Filiación Municipal ("Hoja de Socio") - Sin repetir saludo de bienvenida */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#071929] via-[#0c2b45] to-[#142b16] text-white shadow-xl border border-[#cfa145]/30">
        {/* Filete superior con la paleta oficial del logo de Peralillo */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />

        {/* Luces ambientales discretas */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-[#006799]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-[#5b7c29]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-[#cfa145]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Identificación de la Ficha Institucional */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-[#f3e3be] border border-[#cfa145]/35 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-[#78a200]" />
                Ficha de Filiación N° #{String(user?.id || '1').padStart(4, '0')}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#006799]/30 text-sky-200 border border-sky-400/25">
                Ley N° 19.754 • Bienestar Municipal
              </span>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                Hoja de Socio y Resumen Previsional
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                Estado consolidado de coberturas médicas, cupos anuales y beneficios vigentes en el{' '}
                <strong className="text-[#f3e3be] font-semibold">Comité de Bienestar de la I. Municipalidad de Peralillo</strong>.
              </p>
            </div>
          </div>

          {/* Cuadrícula ejecutiva de 4 indicadores del funcionario */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs lg:min-w-[520px]">
            <div className="p-3.5 rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/10">
              <span className="block text-slate-300 text-[10px] uppercase tracking-wider font-semibold mb-0.5">
                RUT Afiliado
              </span>
              <span className="font-extrabold text-white text-xs sm:text-sm tracking-wide">
                {user?.rut || 'Sin especificar'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/10">
              <span className="block text-slate-300 text-[10px] uppercase tracking-wider font-semibold mb-0.5">
                Unidad / Dirección
              </span>
              <span className="font-extrabold text-white text-xs sm:text-sm truncate block">
                {user?.departamento || 'Municipalidad'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/10">
              <span className="block text-slate-300 text-[10px] uppercase tracking-wider font-semibold mb-0.5">
                Calidad / Perfil
              </span>
              <span className="font-extrabold text-[#f3e3be] text-xs sm:text-sm truncate block">
                {user?.rolLabel || 'Socio Activo'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/10">
              <span className="block text-slate-300 text-[10px] uppercase tracking-wider font-semibold mb-0.5">
                Antigüedad
              </span>
              <span className="font-extrabold text-[#a3e635] text-xs sm:text-sm truncate block">
                {user?.antiguedad || '1 Año'}
              </span>
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
