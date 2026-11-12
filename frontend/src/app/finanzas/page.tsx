'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';

interface SocioNomina {
  folio: string;
  run: string;
  nombreCompleto: string;
  grado: string;
  calidadContractual: string;
  porcentajeRetencion: number;
  fechaSesionAprobacion: string;
  numeroActa?: string | null;
  inicioDescuento: string;
  finCarencia: string;
  cargasLegales: number;
}

interface NominaResponse {
  periodo: string;
  totalSociosEnNomina: number;
  porcentajeAplicado: string;
  socios: SocioNomina[];
}

// [ESTUDIANTE INFORMÁTICA] Cabecera y resumen ejecutivo del Módulo 4 (Control Financiero y Retención 4% — HU-07 / HU-08).
const FinanzasSummarySection: React.FC<{ nomina: NominaResponse | null }> = ({ nomina }) => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
    <div className="lg:col-span-7 p-4 bg-white rounded-lg border border-slate-200 border-l-4 border-l-[#006799] flex flex-col justify-between">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#006799] block">
          Parámetros de Recaudación Mensual • Ley N° 19.754
        </span>
        <h2 className="text-sm font-bold text-slate-900 mt-0.5">
          Resumen de Cuotas Sociales por Descuento de Planilla
        </h2>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-200 mt-3 pt-3 border-t border-slate-100 text-xs">
        <div className="pr-3">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Tasa Estatutaria</span>
          <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">4,0% Base</span>
        </div>
        <div className="px-3">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Padrón Activo RRHH</span>
          <span className="text-base font-extrabold text-[#166534] font-mono tabular-nums">
            {nomina ? `${nomina.totalSociosEnNomina} socios` : '—'}
          </span>
        </div>
        <div className="pl-3">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Período Vigente</span>
          <span className="text-base font-extrabold text-[#0c2b45] font-mono tabular-nums">
            {nomina?.periodo || '2026-11'}
          </span>
        </div>
      </div>
    </div>

    <div className="lg:col-span-5 p-4 bg-white rounded-lg border border-slate-200 border-l-4 border-l-[#166534] flex flex-col justify-between">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#166534] block">
          Conciliación y Rendición a Remuneraciones
        </span>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
          Emisión de nómina oficial de descuento del 4% sobre sueldo base para cruce bancario y RRHH.
        </p>
      </div>
      <div className="pt-3 mt-3 border-t border-slate-100">
        <button
          onClick={() => alert('Generando y descargando Nómina de Retenciones RRHH en formato oficial...')}
          className="w-full py-2 px-3 rounded-md bg-[#0c2b45] hover:bg-[#006799] text-white flex items-center justify-between text-xs font-bold transition-colors"
        >
          <span>Exportar Planilla Oficial de Retención 4% (RRHH)</span>
          <span className="font-mono text-[11px] bg-white/15 px-2 py-0.5 rounded">XLS / PDF</span>
        </button>
      </div>
    </div>
  </div>
);

// [ESTUDIANTE INFORMÁTICA] Módulo 4 de Control Financiero: libro mayor Data-Dense con filtro interactivo de socios en nómina.
export default function FinanzasPage() {
  const { token } = useAuth();
  const [nomina, setNomina] = useState<NominaResponse | null>(null);
  const [cargandoNomina, setCargandoNomina] = useState(false);
  const [filtroSocio, setFiltroSocio] = useState('');

  useEffect(() => {
    if (!token) return;
    setCargandoNomina(true);
    fetchFromApi<NominaResponse>('/afiliacion/nomina-retenciones', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(setNomina)
      .catch(() => setNomina(null))
      .finally(() => setCargandoNomina(false));
  }, [token]);

  const sociosFiltrados = useMemo(() => {
    if (!nomina?.socios) return [];
    if (!filtroSocio.trim()) return nomina.socios;
    const q = filtroSocio.toLowerCase().trim();
    return nomina.socios.filter(
      (s) =>
        s.nombreCompleto.toLowerCase().includes(q) ||
        s.run.toLowerCase().includes(q) ||
        s.folio.toLowerCase().includes(q)
    );
  }, [nomina, filtroSocio]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-lg bg-[#0c2b45] text-white border border-slate-800 overflow-hidden">
        <div className="h-1 w-full bg-[#006799]" />
        <div className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-300 block">
              Módulo 4 • HU-07 & HU-08 • Tesorería y Presupuesto
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Control Financiero y Nómina de Retenciones (4%)
            </h1>
            <p className="text-xs text-slate-300">
              Padrón auditable de descuentos por planilla, actas de aprobación y fechas de término de carencia.
            </p>
          </div>
          <Link
            href="/"
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/15 rounded-md border border-white/15 shrink-0"
          >
            ← Hoja Socio
          </Link>
        </div>
      </div>

      <FinanzasSummarySection nomina={nomina} />

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold text-[#0c2b45] uppercase tracking-wider">
              Nómina Activa de Retenciones por Planilla (4% Sueldo Base) — HU-02
            </h2>
            <p className="text-[11px] text-slate-500">
              Funcionarios admitidos en sesión ordinaria con retención mensual vigente
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={filtroSocio}
              onChange={(e) => setFiltroSocio(e.target.value)}
              placeholder="Filtrar por RUN, folio o nombre..."
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006799] w-56"
            />
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-50 text-[#166534] border border-emerald-200 tabular-nums">
              {sociosFiltrados.length} registros
            </span>
          </div>
        </div>

        {cargandoNomina && !nomina ? (
          <div className="p-8 text-center text-xs text-slate-400">Consultando nómina de retenciones...</div>
        ) : sociosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No existen funcionarios en nómina para el filtro indicado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Folio</th>
                  <th className="py-2.5 px-4">RUN</th>
                  <th className="py-2.5 px-4">Funcionario Municipal</th>
                  <th className="py-2.5 px-4">Escala / Contrato</th>
                  <th className="py-2.5 px-4 text-center">Retención</th>
                  <th className="py-2.5 px-4">Sesión / Acta</th>
                  <th className="py-2.5 px-4">Fin Carencia (6m)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sociosFiltrados.map((s) => (
                  <tr key={s.folio} className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 tabular-nums">{s.folio}</td>
                    <td className="py-3 px-4 font-mono text-slate-700 tabular-nums whitespace-nowrap">{s.run}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{s.nombreCompleto}</td>
                    <td className="py-3 px-4 text-slate-600">
                      Grado {s.grado} • <span className="capitalize">{s.calidadContractual}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-50 text-[#006799] border border-sky-200 tabular-nums">
                        {s.porcentajeRetencion}% Base
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 tabular-nums">
                      <div className="font-mono font-semibold">{s.fechaSesionAprobacion}</div>
                      <div className="text-[10px] text-slate-500">{s.numeroActa || 'Acta Ordinaria'}</div>
                    </td>
                    <td className="py-3 px-4 tabular-nums">
                      <div className="font-mono font-bold text-[#166534]">{s.finCarencia}</div>
                      <div className="text-[10px] text-slate-500">Habilitación salud</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
