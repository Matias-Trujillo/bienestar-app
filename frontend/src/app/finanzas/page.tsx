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

// [ESTUDIANTE INFORMÁTICA] Tarjetas de resumen financiero modernas para la recaudación del 4%.
const FinanzasSummarySection: React.FC<{ nomina: NominaResponse | null }> = ({ nomina }) => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-w-0">
    <div className="lg:col-span-7 card-modern-interactive p-6 flex flex-col justify-between min-w-0">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#006799] block">
          Recaudación Mensual • Ley N° 19.754
        </span>
        <h2 className="text-base font-extrabold text-slate-900 mt-0.5">
          Resumen de Cuotas Sociales por Descuento de Planilla
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
        <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/70">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Tasa Estatutaria</span>
          <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums mt-0.5 block">
            4,0% Sueldo Base
          </span>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
          <span className="text-[10px] text-[#166534] uppercase font-bold block">Padrón en Nómina</span>
          <span className="text-base font-extrabold text-[#166534] font-mono tabular-nums mt-0.5 block">
            {nomina ? `${nomina.totalSociosEnNomina} socios` : '—'}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200/70">
          <span className="text-[10px] text-[#006799] uppercase font-bold block">Período Activo</span>
          <span className="text-base font-extrabold text-[#0c2b45] font-mono tabular-nums mt-0.5 block">
            {nomina?.periodo || '2026-11'}
          </span>
        </div>
      </div>
    </div>

    <div className="lg:col-span-5 card-modern-interactive p-6 flex flex-col justify-between min-w-0">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#166534] block">
          Auditoría y Rendición RRHH
        </span>
        <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
          Exportación Oficial a Remuneraciones
        </h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Descarga la planilla oficial de descuento del 4% sobre sueldo base para cruce bancario y RRHH.
        </p>
      </div>
      <div className="pt-4 mt-4 border-t border-slate-100">
        <button
          onClick={() => alert('Generando y descargando Nómina de Retenciones RRHH en formato oficial...')}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 text-white flex items-center justify-between text-xs font-bold shadow-sm transition-all"
        >
          <span>Exportar Planilla de Retención 4%</span>
          <span className="font-mono text-[11px] bg-white/20 px-2.5 py-0.5 rounded-lg">XLS / PDF</span>
        </button>
      </div>
    </div>
  </div>
);

// [ESTUDIANTE INFORMÁTICA] Módulo 4 de Control Financiero con estética moderna y tabla libre de desbordes.
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
    <div className="space-y-6 animate-fade-in min-w-0">
      <div className="hero-institutional">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
        <div className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-sky-200 border border-white/15 mb-1.5">
              Módulo 4 • HU-07 & HU-08 • Tesorería y Presupuesto
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Control Financiero y Nómina de Retenciones (4%)
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Padrón auditable de descuentos por planilla, actas de aprobación y fechas de término de carencia.
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 text-xs font-bold text-slate-100 bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 shrink-0 transition-colors"
          >
            ← Hoja Socio
          </Link>
        </div>
      </div>

      <FinanzasSummarySection nomina={nomina} />

      <div className="card-modern overflow-hidden min-w-0">
        <div className="p-5 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Nómina Activa de Retenciones por Planilla (4% Sueldo Base) — HU-02
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Funcionarios admitidos en sesión ordinaria con retención mensual vigente
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="text"
              value={filtroSocio}
              onChange={(e) => setFiltroSocio(e.target.value)}
              placeholder="Buscar por RUN, folio o nombre..."
              className="px-3.5 py-2 text-xs bg-slate-50 border border-slate-200/90 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799] w-full sm:w-60"
            />
            <span className="px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-[#166534] border border-emerald-200/80 tabular-nums">
              {sociosFiltrados.length} socios
            </span>
          </div>
        </div>

        {cargandoNomina && !nomina ? (
          <div className="p-10 text-center text-xs text-slate-400">Consultando nómina de retenciones...</div>
        ) : sociosFiltrados.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            No existen funcionarios en nómina para el filtro indicado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-5">Folio</th>
                  <th className="py-3.5 px-5">RUN</th>
                  <th className="py-3.5 px-5">Funcionario Municipal</th>
                  <th className="py-3.5 px-5">Escala / Contrato</th>
                  <th className="py-3.5 px-5 text-center">Retención</th>
                  <th className="py-3.5 px-5">Sesión / Acta</th>
                  <th className="py-3.5 px-5">Fin Carencia (6m)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sociosFiltrados.map((s) => (
                  <tr key={s.folio} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-bold text-slate-800 tabular-nums">{s.folio}</td>
                    <td className="py-3.5 px-5 font-mono text-slate-600 tabular-nums whitespace-nowrap">{s.run}</td>
                    <td className="py-3.5 px-5 font-bold text-slate-900">{s.nombreCompleto}</td>
                    <td className="py-3.5 px-5 text-slate-600">
                      Grado {s.grado} • <span className="capitalize">{s.calidadContractual}</span>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-sky-50 text-[#006799] border border-sky-200/80 tabular-nums">
                        {s.porcentajeRetencion}% Base
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 tabular-nums">
                      <div className="font-mono font-semibold">{s.fechaSesionAprobacion}</div>
                      <div className="text-[11px] text-slate-400">{s.numeroActa || 'Acta Ordinaria'}</div>
                    </td>
                    <td className="py-3.5 px-5 tabular-nums">
                      <div className="font-mono font-bold text-[#166534]">{s.finCarencia}</div>
                      <div className="text-[11px] text-slate-400">Habilitación salud</div>
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
