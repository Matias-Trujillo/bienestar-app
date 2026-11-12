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
        <span className="text-xs font-medium text-[#006799] block">
          Recaudación Mensual • Cuotas Sociales
        </span>
        <h2 className="text-base font-semibold text-slate-900 mt-0.5">
          Resumen de Cuotas Sociales por Descuento de Planilla
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
        <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/70">
          <span className="text-xs text-slate-500 font-medium block">Tasa Estatutaria</span>
          <span className="text-base font-bold text-slate-900 tabular-nums mt-0.5 block">
            4,0% Sueldo Base
          </span>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
          <span className="text-xs text-[#166534] font-medium block">Padrón en Nómina</span>
          <span className="text-base font-bold text-[#166534] tabular-nums mt-0.5 block">
            {nomina ? `${nomina.totalSociosEnNomina} socios` : '—'}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200/70">
          <span className="text-xs text-[#006799] font-medium block">Período Activo</span>
          <span className="text-base font-bold text-[#0c2b45] tabular-nums mt-0.5 block">
            {nomina?.periodo || '2026-11'}
          </span>
        </div>
      </div>
    </div>

    <div className="lg:col-span-5 card-modern-interactive p-6 flex flex-col justify-between min-w-0">
      <div>
        <span className="text-xs font-medium text-[#166534] block">
          Auditoría y Rendición RRHH
        </span>
        <h3 className="text-base font-semibold text-slate-900 mt-0.5">
          Exportación Oficial a Remuneraciones
        </h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed font-normal">
          Descarga la planilla oficial de descuento del 4% sobre sueldo base para cruce bancario y RRHH.
        </p>
      </div>
      <div className="pt-4 mt-4 border-t border-slate-100">
        <button
          onClick={() => alert('Generando y descargando Nómina de Retenciones RRHH en formato oficial...')}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 text-white flex items-center justify-between text-xs font-semibold shadow-sm transition-all"
        >
          <span>Exportar Planilla de Retención 4%</span>
          <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-lg tabular-nums">XLS / PDF</span>
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
            <h2 className="text-base font-semibold text-slate-900">
              Nómina Activa de Retenciones por Planilla (4% Sueldo Base) — HU-02
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-normal">
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
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-[#166534] border border-emerald-200/80 tabular-nums">
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
          <div className="w-full min-w-0">
            {/* Vista Móvil Apilada */}
            <div className="block md:hidden divide-y divide-slate-100">
              {sociosFiltrados.map((s) => (
                <div key={s.folio} className="p-4 space-y-2 hover:bg-slate-50/70 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 tabular-nums">{s.folio} • {s.run}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-[#006799] border border-sky-200/80 tabular-nums">
                      {s.porcentajeRetencion}% Base
                    </span>
                  </div>
                  <p className="font-medium text-slate-900">{s.nombreCompleto}</p>
                  <div className="flex items-center justify-between text-slate-500 pt-1">
                    <span>Grado {s.grado} • <span className="capitalize">{s.calidadContractual}</span></span>
                    <span className="font-semibold text-[#166534] tabular-nums">Carencia: {s.finCarencia}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Vista Desktop: 5 Columnas Agrupadas con table-fixed (100% libre de desborde lateral) */}
            <div className="hidden md:block w-full overflow-hidden">
              <table className="w-full table-fixed text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-600 font-semibold">
                    <th className="w-[17%] py-3 px-4">Folio y RUN</th>
                    <th className="w-[27%] py-3 px-4">Funcionario Municipal</th>
                    <th className="w-[22%] py-3 px-4">Escala y Retención</th>
                    <th className="w-[17%] py-3 px-4">Sesión y Acta</th>
                    <th className="w-[17%] py-3 px-4 text-right">Fin Carencia (6m)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {sociosFiltrados.map((s) => (
                    <tr key={s.folio} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 align-middle">
                        <div className="font-semibold text-slate-900 tabular-nums truncate">{s.folio}</div>
                        <div className="text-slate-500 font-normal tabular-nums truncate mt-0.5">{s.run}</div>
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <div className="font-medium text-slate-900 truncate" title={s.nombreCompleto}>
                          {s.nombreCompleto}
                        </div>
                        <div className="text-slate-500 font-normal truncate mt-0.5">
                          Cargas acreditadas: <span className="tabular-nums font-medium">{s.cargasLegales}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <div className="text-slate-800 font-medium tabular-nums truncate">
                          Grado {s.grado} • <span className="capitalize">{s.calidadContractual}</span>
                        </div>
                        <div className="mt-1">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-[#006799] border border-sky-200/80 tabular-nums">
                            Descuento {s.porcentajeRetencion}% Base
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 align-middle tabular-nums">
                        <div className="font-medium text-slate-800 truncate">{s.fechaSesionAprobacion}</div>
                        <div className="text-slate-500 font-normal truncate mt-0.5">{s.numeroActa || 'Acta Ordinaria'}</div>
                      </td>
                      <td className="py-3 px-4 text-right align-middle tabular-nums">
                        <div className="font-semibold text-[#166534] truncate">{s.finCarencia}</div>
                        <div className="text-slate-400 font-normal truncate mt-0.5">Habilitación salud</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
