'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  Landmark,
  PieChart,
  Sliders,
  TrendingDown,
  Users,
  Wallet,
} from 'lucide-react';
import {
  AporteMunicipalUtm,
  EstadoFinanciero,
  Padron31Dic,
  SimulacionUtmDraft,
  formatClp,
  formatCompactClp,
} from './types';

interface Props {
  padron: Padron31Dic | null;
  aportes: AporteMunicipalUtm[];
  estadoFinanciero: EstadoFinanciero | null;
  totalNomina4Pct: number;
  puedeRegistrar: boolean;
  onIrARegistroUtm: (draft?: SimulacionUtmDraft) => void;
}

const MESES_CORTOS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

interface SegmentoDonut {
  id: string;
  label: string;
  valor: number;
  color: string;
  badgeClass: string;
}

export default function TesoreriaDashboard({
  padron,
  aportes,
  estadoFinanciero,
  totalNomina4Pct,
  puedeRegistrar,
  onIrARegistroUtm,
}: Props) {
  const anioActual = new Date().getFullYear();

  // Filtro de año para el gráfico de barras
  const aniosDisponibles = useMemo(() => {
    const set = new Set<number>([anioActual]);
    aportes.forEach((a) => set.add(a.anio_fiscal));
    return Array.from(set).sort((a, b) => b - a);
  }, [aportes, anioActual]);

  const [anioGrafico, setAnioGrafico] = useState<number>(anioActual);
  const [segmentoActivo, setSegmentoActivo] = useState<string | null>(null);
  const [mesHover, setMesHover] = useState<number | null>(null);

  // Estado del simulador interactivo UTM
  const [simSocios, setSimSocios] = useState<number>(padron?.socios_congelados_31_dic || 25);
  const [simUtm, setSimUtm] = useState<number>(padron?.valor_utm_referencia_clp || 68034);

  useEffect(() => {
    if (padron) {
      setSimSocios(Math.max(1, padron.socios_congelados_31_dic));
      setSimUtm(padron.valor_utm_referencia_clp || 68034);
    }
  }, [padron]);

  // Métricas ejecutivas
  const fondoGeneral = estadoFinanciero?.fondo_general || 0;
  const fondoSalud = estadoFinanciero?.fondo_salud_disponible || 0;
  const presupuestoDisponibleTotal = fondoGeneral + fondoSalud;

  const egresosSalud = estadoFinanciero?.total_egresos_salud || 0;
  const egresosBeneficios = estadoFinanciero?.total_egresos_beneficios || 0;
  const egresosTotales = egresosSalud + egresosBeneficios;

  const totalBasePresupuestaria = Math.max(1, presupuestoDisponibleTotal + egresosTotales);
  const pctEjecucion = Math.min(100, Math.round((egresosTotales / totalBasePresupuestaria) * 100));

  const aportesUtmAnio = estadoFinanciero?.total_aportes_utm || 0;
  const metaUtmAnio = padron?.monto_estimado_clp || 0;
  const pctMetaUtm =
    metaUtmAnio > 0 ? Math.min(100, Math.round((aportesUtmAnio / metaUtmAnio) * 100)) : 0;

  // Datos del Donut interactivo
  const segmentosDonut: SegmentoDonut[] = useMemo(
    () => [
      {
        id: 'general',
        label: 'Fondo General Disponible',
        valor: fondoGeneral,
        color: '#006799',
        badgeClass: 'bg-sky-100 text-[#006799]',
      },
      {
        id: 'salud',
        label: 'Fondo Salud Disponible',
        valor: fondoSalud,
        color: '#16a34a',
        badgeClass: 'bg-emerald-100 text-[#166534]',
      },
      {
        id: 'egreso_salud',
        label: 'Egresos Reembolsos Salud',
        valor: egresosSalud,
        color: '#d97706',
        badgeClass: 'bg-amber-100 text-amber-800',
      },
      {
        id: 'egreso_bonos',
        label: 'Egresos Bonos / Beneficios',
        valor: egresosBeneficios,
        color: '#dc2626',
        badgeClass: 'bg-rose-100 text-rose-700',
      },
    ],
    [fondoGeneral, fondoSalud, egresosSalud, egresosBeneficios]
  );

  const totalDonut = useMemo(
    () => segmentosDonut.reduce((acc, s) => acc + s.valor, 0),
    [segmentosDonut]
  );

  const radio = 64;
  const circunferencia = 2 * Math.PI * radio;

  const arcosDonut = useMemo(() => {
    let acumulado = 0;
    return segmentosDonut.map((seg) => {
      const fraccion = totalDonut > 0 ? seg.valor / totalDonut : 0;
      const longitud = fraccion * circunferencia;
      const offset = -acumulado;
      acumulado += longitud;
      return {
        ...seg,
        fraccion,
        porcentaje: Math.round(fraccion * 100),
        longitud,
        offset,
      };
    });
  }, [segmentosDonut, totalDonut, circunferencia]);

  const segmentoSeleccionado =
    arcosDonut.find((a) => a.id === segmentoActivo) || null;

  // Datos del gráfico de barras mensual (Ene - Dic)
  const datosMensuales = useMemo(() => {
    const meses = MESES_CORTOS.map((nombre, idx) => ({
      mesIndex: idx,
      nombre,
      monto: 0,
      cantidad: 0,
      folios: [] as string[],
    }));
    aportes
      .filter((a) => a.anio_fiscal === anioGrafico)
      .forEach((a) => {
        const partes = (a.mes_transferencia || '').split('-');
        const mesNum = Number.parseInt(partes[1] || '', 10);
        if (!Number.isNaN(mesNum) && mesNum >= 1 && mesNum <= 12) {
          const item = meses[mesNum - 1];
          item.monto += a.monto_total_clp;
          item.cantidad += 1;
          item.folios.push(a.codigo);
        }
      });
    return meses;
  }, [aportes, anioGrafico]);

  const maxMontoMensual = useMemo(() => {
    const maxVal = Math.max(...datosMensuales.map((m) => m.monto), 0);
    return maxVal > 0 ? maxVal : Math.max(metaUtmAnio, 1_000_000);
  }, [datosMensuales, metaUtmAnio]);

  const totalAnioGrafico = useMemo(
    () => datosMensuales.reduce((acc, m) => acc + m.monto, 0),
    [datosMensuales]
  );

  // Cálculo del simulador interactivo
  const factorUtm = padron?.factor_utm || 4;
  const simTotalUtm = simSocios * factorUtm;
  const simMontoClp = simTotalUtm * simUtm;
  const maxSociosSlider = Math.max(150, (padron?.socios_congelados_31_dic || 30) * 3);

  return (
    <div className="space-y-6">
      {/* 4 KPI Ejecutivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card-modern-interactive p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-slate-500">Presupuesto Disponible Total</span>
              <div className="text-xl font-extrabold text-[#0c2b45] tabular-nums mt-1">
                {formatClp(presupuestoDisponibleTotal)}
              </div>
            </div>
            <div className="h-9 w-9 rounded-xl bg-sky-50 border border-sky-200/70 flex items-center justify-center text-[#006799] shrink-0">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
            <span>General: {formatCompactClp(fondoGeneral)}</span>
            <span>Salud: {formatCompactClp(fondoSalud)}</span>
          </div>
        </div>

        <div className="card-modern-interactive p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-slate-500">Subvención Municipal UTM</span>
              <div className="text-xl font-extrabold text-[#166534] tabular-nums mt-1">
                {formatClp(aportesUtmAnio)}
              </div>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-[#166534] shrink-0">
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] tabular-nums">
              <span className="text-slate-500">Meta anual ({padron?.total_utm_anual || 0} UTM)</span>
              <span className="font-bold text-[#166534]">{pctMetaUtm}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[#166534] transition-all duration-500"
                style={{ width: `${pctMetaUtm}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card-modern-interactive p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-slate-500">Ejecución de Egresos</span>
              <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">
                {formatClp(egresosTotales)}
              </div>
            </div>
            <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-700 shrink-0">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] tabular-nums">
              <span className="text-slate-500">Tasa de consumo presupuestario</span>
              <span className="font-bold text-amber-700">{pctEjecucion}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-500"
                style={{ width: `${pctEjecucion}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card-modern-interactive p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-slate-500">Padrón Congelado (31-dic)</span>
              <div className="text-xl font-extrabold text-[#0c2b45] tabular-nums mt-1">
                {padron ? `${padron.socios_congelados_31_dic} socios` : '—'}
              </div>
            </div>
            <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
            <span>Activos hoy: {estadoFinanciero?.socios_activos ?? 0}</span>
            <span>Nómina 4%: {totalNomina4Pct}</span>
          </div>
        </div>
      </div>

      {/* Gráficos Interactivos: Donut + Barras Mensuales */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Gráfico 1: Donut Interactivo */}
        <div className="lg:col-span-5 card-modern p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#006799]">
                Distribución en Vivo
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                Composición y Ejecución del Presupuesto
              </h3>
            </div>
            <PieChart className="h-4 w-4 text-slate-400 shrink-0" />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5 my-auto">
            <div className="relative h-44 w-44 shrink-0">
              <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r={radio}
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="20"
                />
                {arcosDonut.map((arco) =>
                  arco.valor > 0 ? (
                    <circle
                      key={arco.id}
                      cx="80"
                      cy="80"
                      r={radio}
                      fill="none"
                      stroke={arco.color}
                      strokeWidth={segmentoActivo === arco.id ? 24 : 20}
                      strokeDasharray={`${arco.longitud} ${circunferencia}`}
                      strokeDashoffset={arco.offset}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        opacity:
                          segmentoActivo && segmentoActivo !== arco.id ? 0.35 : 1,
                      }}
                      onMouseEnter={() => setSegmentoActivo(arco.id)}
                      onMouseLeave={() => setSegmentoActivo(null)}
                    />
                  ) : null
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 pointer-events-none">
                <span className="text-[10px] font-medium text-slate-500 leading-tight">
                  {segmentoSeleccionado ? segmentoSeleccionado.label : 'Total Gestión'}
                </span>
                <span className="text-sm font-extrabold text-slate-900 tabular-nums mt-0.5">
                  {formatCompactClp(
                    segmentoSeleccionado ? segmentoSeleccionado.valor : totalDonut
                  )}
                </span>
                {segmentoSeleccionado && (
                  <span className="text-[11px] font-bold text-[#006799] tabular-nums">
                    {segmentoSeleccionado.porcentaje}%
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 w-full space-y-2">
              {arcosDonut.map((arco) => (
                <div
                  key={arco.id}
                  onMouseEnter={() => setSegmentoActivo(arco.id)}
                  onMouseLeave={() => setSegmentoActivo(null)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs ${
                    segmentoActivo === arco.id
                      ? 'bg-slate-50 border-slate-300 shadow-xs'
                      : 'border-transparent hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: arco.color }}
                    />
                    <span className="text-slate-700 font-medium truncate">{arco.label}</span>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <span className="font-bold text-slate-900 block">
                      {formatCompactClp(arco.valor)}
                    </span>
                    <span className="text-[10px] text-slate-500">{arco.porcentaje}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gráfico 2: Barras Mensuales Interactivas de Subvenciones UTM */}
        <div className="lg:col-span-7 card-modern p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#166534]">
                Flujo de Ingresos Municipales (HU-08)
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                Transferencias UTM por Mes — Año {anioGrafico}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-400 hidden sm:block" />
              <select
                value={anioGrafico}
                onChange={(e) => setAnioGrafico(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#006799] cursor-pointer"
                aria-label="Seleccionar año fiscal"
              >
                {aniosDisponibles.map((anio) => (
                  <option key={anio} value={anio}>
                    Año {anio}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tooltip dinámico superior */}
          <div className="mb-3 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-xs">
            {mesHover !== null ? (
              <>
                <span className="font-semibold text-slate-800">
                  {datosMensuales[mesHover].nombre} {anioGrafico}:{' '}
                  <span className="text-[#166534] tabular-nums">
                    {formatClp(datosMensuales[mesHover].monto)}
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 tabular-nums">
                  {datosMensuales[mesHover].cantidad > 0
                    ? `${datosMensuales[mesHover].cantidad} decreto(s): ${datosMensuales[mesHover].folios.join(', ')}`
                    : 'Sin transferencias registradas'}
                </span>
              </>
            ) : (
              <>
                <span className="text-slate-600">
                  Total registrado en {anioGrafico}:{' '}
                  <span className="font-bold text-[#0c2b45] tabular-nums">
                    {formatClp(totalAnioGrafico)}
                  </span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Pasa el cursor sobre un mes para ver el detalle
                </span>
              </>
            )}
          </div>

          {/* Barras SVG/CSS interactivas */}
          <div className="h-44 flex items-end justify-between gap-1.5 sm:gap-2.5 pt-4 pb-1 px-1">
            {datosMensuales.map((m) => {
              const alturaPct =
                m.monto > 0 ? Math.max(12, Math.round((m.monto / maxMontoMensual) * 100)) : 4;
              const isHover = mesHover === m.mesIndex;
              return (
                <div
                  key={m.nombre}
                  onMouseEnter={() => setMesHover(m.mesIndex)}
                  onMouseLeave={() => setMesHover(null)}
                  className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 cursor-pointer group"
                >
                  <div className="w-full h-full flex items-end justify-center">
                    <div
                      className={`w-full max-w-[34px] rounded-t-lg transition-all duration-300 ${
                        m.monto > 0
                          ? isHover
                            ? 'bg-gradient-to-t from-[#0c2b45] to-[#006799] shadow-md scale-y-105 origin-bottom'
                            : 'bg-gradient-to-t from-[#006799] to-sky-400'
                          : isHover
                          ? 'bg-slate-300'
                          : 'bg-slate-100'
                      }`}
                      style={{ height: `${alturaPct}%` }}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-semibold tabular-nums transition-colors ${
                      isHover ? 'text-[#0c2b45]' : 'text-slate-500'
                    }`}
                  >
                    {m.nombre}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Simulador Interactivo de Presupuesto UTM */}
      <div className="card-modern overflow-hidden">
        <div className="p-5 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-sky-50 border border-sky-200/70 flex items-center justify-center text-[#006799] shrink-0 mt-0.5">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Simulador Interactivo de Subvención Municipal (Proyección UTM)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ajusta el padrón proyectado o el valor de la UTM para estimar el presupuesto anual del Comité (Ley 19.754).
              </p>
            </div>
          </div>

          {puedeRegistrar && (
            <button
              type="button"
              onClick={() => onIrARegistroUtm({ socios: simSocios, valorUtmClp: simUtm })}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0"
            >
              <span>Usar en Decreto Oficial</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="p-5 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="sim-socios" className="font-semibold text-slate-700">
                  Padrón de Socios al 31 de Diciembre
                </label>
                <span className="font-bold text-[#0c2b45] tabular-nums bg-slate-100 px-2.5 py-0.5 rounded-lg">
                  {simSocios} socios ({simTotalUtm} UTM)
                </span>
              </div>
              <input
                id="sim-socios"
                type="range"
                min={1}
                max={maxSociosSlider}
                value={simSocios}
                onChange={(e) => setSimSocios(Number(e.target.value))}
                className="w-full accent-[#006799] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="sim-utm" className="font-semibold text-slate-700">
                  Valor Oficial de la UTM (CLP)
                </label>
                <span className="font-bold text-[#166534] tabular-nums bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/70">
                  {formatClp(simUtm)}
                </span>
              </div>
              <input
                id="sim-utm"
                type="range"
                min={60000}
                max={95000}
                step={100}
                value={simUtm}
                onChange={(e) => setSimUtm(Number(e.target.value))}
                className="w-full accent-[#166534] cursor-pointer"
              />
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setSimUtm(padron?.valor_utm_referencia_clp || 68034)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  UTM Referencia
                </button>
                <button
                  type="button"
                  onClick={() => setSimUtm(Math.round((padron?.valor_utm_referencia_clp || 68034) * 1.04))}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  +4% IPC estimado
                </button>
                <button
                  type="button"
                  onClick={() => setSimUtm(Math.round((padron?.valor_utm_referencia_clp || 68034) * 1.08))}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  +8% proyección
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 p-5 rounded-2xl bg-gradient-to-br from-[#0c2b45] to-[#006799] text-white space-y-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-200 block">
              Proyección de Aporte Municipal Anual
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold tabular-nums">
              {formatClp(simMontoClp)}
            </div>
            <p className="text-xs text-sky-100 tabular-nums">
              Fórmula: {simSocios} socios × {factorUtm} UTM × {formatClp(simUtm)}
            </p>
            <div className="pt-2.5 mt-2 border-t border-white/15 flex items-center justify-between text-[11px] text-sky-100 tabular-nums">
              <span>Registrado este año:</span>
              <span className="font-bold text-white">{formatClp(aportesUtmAnio)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
