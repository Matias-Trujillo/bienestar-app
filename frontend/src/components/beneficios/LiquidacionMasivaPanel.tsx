'use client';

import React from 'react';
import { SimularNominaResponse } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  SnowflakeIcon,
  GiftIcon,
  UploadIcon,
  DownloadIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  XCircleIcon,
  SendIcon,
} from './Icons';

interface LiquidacionMasivaPanelProps {
  tipoBonoMasivo: 'invierno' | 'navidad';
  setTipoBonoMasivo: (tipo: 'invierno' | 'navidad') => void;
  porcentajeNavidad: number;
  setPorcentajeNavidad: (val: number) => void;
  decretoMarco: string;
  setDecretoMarco: (val: string) => void;
  actaDirectorio: string;
  setActaDirectorio: (val: string) => void;
  simulacionResult: SimularNominaResponse | null;
  setSimulacionResult: (res: SimularNominaResponse | null) => void;
  isSimulando: boolean;
  isEjecutando: boolean;
  onSimularNomina: (tipo: 'invierno' | 'navidad') => void;
  onEjecutarNomina: () => void;
  onSubirPlanillaCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDescargarPlantillaCSV: () => void;
}

export const LiquidacionMasivaPanel: React.FC<LiquidacionMasivaPanelProps> = ({
  tipoBonoMasivo,
  setTipoBonoMasivo,
  porcentajeNavidad,
  setPorcentajeNavidad,
  decretoMarco,
  setDecretoMarco,
  actaDirectorio,
  setActaDirectorio,
  simulacionResult,
  setSimulacionResult,
  isSimulando,
  isEjecutando,
  onSimularNomina,
  onEjecutarNomina,
  onSubirPlanillaCSV,
  onDescargarPlantillaCSV,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
            HU-06 • Directorio del Comité de Bienestar
          </span>
          <h2 className="text-xl font-extrabold text-slate-800 mt-0.5">
            Liquidación Masiva de Bonos Periódicos de Calendario
          </h2>
          <p className="text-xs text-slate-500 max-w-3xl mt-1 leading-relaxed">
            Genera la nómina automatizada de beneficiarios para bonos de calendario (Invierno y Navidad) o mediante la carga de una planilla Excel con RUN y decretos asociados. El sistema filtra automáticamente a socios que cumplan con los 6 meses de permanencia y genera el listado para Tesorería Municipal con asignación de cheques.
          </p>
        </div>

        {/* Selector de Escenario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Escenario 1: Bono de Invierno */}
          <div
            onClick={() => setTipoBonoMasivo('invierno')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              tipoBonoMasivo === 'invierno'
                ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <SnowflakeIcon className="w-3.5 h-3.5" /> Escenario 1: Bono de Invierno
                </span>
                <span className="text-xs font-black text-slate-800">15% Sueldo G15</span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm mt-3">Última semana de julio</h3>
              <p className="text-xs text-slate-500 mt-1">
                Selecciona automáticamente a socios activos con al menos 6 meses de permanencia, calcula el 15% del sueldo base y genera el listado para Tesorería para confección de cheques.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSimularNomina('invierno')}
              disabled={isSimulando}
              className="mt-4 w-full py-2 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <RefreshCwIcon className={`w-3.5 h-3.5 ${isSimulando && tipoBonoMasivo === 'invierno' ? 'animate-spin' : ''}`} />
              Ejecutar Cálculo Automatizado (Julio)
            </button>
          </div>

          {/* Escenario 2: Bono de Navidad */}
          <div
            onClick={() => setTipoBonoMasivo('navidad')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              tipoBonoMasivo === 'navidad'
                ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <GiftIcon className="w-3.5 h-3.5" /> Escenario 2: Bono de Navidad
                </span>
                <span className="text-xs font-black text-indigo-700">{porcentajeNavidad}% G15</span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm mt-3">Definido por Directorio (10% - 15%)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Ajusta el porcentaje según los excedentes presupuestarios disponibles. Valida socios con 6 meses, formaliza acuerdo de pago, asigna cheques y registra en la Hoja individual.
              </p>

              {/* Slider de porcentaje según excedentes */}
              <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-semibold text-slate-700">Porcentaje fijado por Directorio:</span>
                  <span className="font-black text-indigo-700">{porcentajeNavidad}%</span>
                </div>
                <input
                  type="range"
                  min={10.0}
                  max={15.0}
                  step={0.5}
                  value={porcentajeNavidad}
                  onChange={(e) => setPorcentajeNavidad(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>10.0% (Mínimo)</span>
                  <span>12.5%</span>
                  <span>15.0% (Máximo)</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSimularNomina('navidad')}
              disabled={isSimulando}
              className="mt-4 w-full py-2 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <RefreshCwIcon className={`w-3.5 h-3.5 ${isSimulando && tipoBonoMasivo === 'navidad' ? 'animate-spin' : ''}`} />
              Calcular con Excedentes ({porcentajeNavidad}%)
            </button>
          </div>
        </div>

        {/* Submódulo de Carga Masiva Planilla Excel / CSV */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <UploadIcon className="w-4 h-4 text-emerald-600" />
                Carga de Planilla Excel / CSV con Decretos Asociados
              </h3>
              <p className="text-xs text-slate-500">
                Sube una planilla con los nombres, apellidos, RUN y decreto digitalizado asociado de cada socio.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onDescargarPlantillaCSV}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition flex items-center gap-1 shadow-sm"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                Descargar Plantilla CSV
              </button>
              <label className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1">
                <UploadIcon className="w-3.5 h-3.5" />
                Subir Planilla
                <input type="file" accept=".csv,.xlsx,.xls" onChange={onSubirPlanillaCSV} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {/* RESULTADOS DE LA SIMULACIÓN MASIVA */}
        {simulacionResult && (
          <div className="mt-6 space-y-4 border-t border-slate-200 pt-6 animate-fade-in">
            {/* Resumen del Proceso */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Pre-Visualización de Nómina Oficial
                </span>
                <h3 className="text-lg font-black">{simulacionResult.titulo}</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Porcentaje: {simulacionResult.porcentaje_aplicado}% • Monto por Socio:{' '}
                  <strong className="text-white">{formatCurrency(simulacionResult.monto_unitario)}</strong>
                </p>
              </div>

              <div className="flex items-center gap-4 text-center">
                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <span className="text-[10px] text-slate-300 block">Evaluados</span>
                  <span className="text-base font-bold text-white">{simulacionResult.total_socios_evaluados}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-300 block">Beneficiados (≥6m)</span>
                  <span className="text-base font-extrabold text-emerald-300">
                    {simulacionResult.total_socios_beneficiados}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30">
                  <span className="text-[10px] text-rose-300 block">Excluidos (&lt;6m)</span>
                  <span className="text-base font-extrabold text-rose-300">
                    {simulacionResult.total_socios_excluidos}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/10 border border-white/10">
                  <span className="text-[10px] text-slate-300 block">Total Tesorería</span>
                  <span className="text-base font-black text-emerald-400">
                    {formatCurrency(simulacionResult.monto_total_requerido)}
                  </span>
                </div>
              </div>
            </div>

            {/* Parámetros de Formalización */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Decreto Marco Alcaldicio Asociado:
                </label>
                <input
                  type="text"
                  value={decretoMarco}
                  onChange={(e) => setDecretoMarco(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Acta de Acuerdo Directorio:
                </label>
                <input
                  type="text"
                  value={actaDirectorio}
                  onChange={(e) => setActaDirectorio(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Tabla de Socios en la Nómina */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Nómina Desglosada con Asignación de Cheques</span>
                <span className="text-slate-500 font-normal">
                  Cumplimiento de 6 meses validado automáticamente por el sistema
                </span>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0 font-semibold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Socio & RUN</th>
                      <th className="py-2.5 px-3">Antigüedad</th>
                      <th className="py-2.5 px-3">Criterio 6 Meses</th>
                      <th className="py-2.5 px-3">Monto Calculado</th>
                      <th className="py-2.5 px-3">N° Cheque Sugerido</th>
                      <th className="py-2.5 px-3">Decreto Asociado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {simulacionResult.items.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`transition ${
                          item.cumple_antiguedad ? 'hover:bg-slate-50' : 'bg-rose-50/40 text-slate-400'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <span className={`font-bold block ${item.cumple_antiguedad ? 'text-slate-900' : 'text-slate-600'}`}>
                            {item.nombre_completo}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.rut} • {item.departamento}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium">{item.antiguedad_texto}</td>
                        <td className="py-2.5 px-3">
                          {item.cumple_antiguedad ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                              <CheckCircleIcon className="w-3 h-3" /> Habilitado (≥6 meses)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full text-[10px]">
                              <XCircleIcon className="w-3 h-3" /> Excluido: {item.motivo_exclusion || '< 6 meses'}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-sm">
                          {item.cumple_antiguedad ? (
                            <span className="text-emerald-700">{formatCurrency(item.monto)}</span>
                          ) : (
                            <span className="text-slate-400">$0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {item.numero_cheque_sugerido || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          {item.decreto_asociado || decretoMarco}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Botón de Formalización y Pago */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setSimulacionResult(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Descartar Simulación
              </button>
              <button
                onClick={onEjecutarNomina}
                disabled={isEjecutando}
                className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition flex items-center gap-2"
              >
                <SendIcon className={`w-4 h-4 ${isEjecutando ? 'animate-spin' : ''}`} />
                Formalizar Acuerdo de Pago & Enviar a Tesorería
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
