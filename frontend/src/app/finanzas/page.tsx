'use client';

import React, { useEffect, useState } from 'react';
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

export default function FinanzasPage() {
  const { user, token } = useAuth();
  const [nomina, setNomina] = useState<NominaResponse | null>(null);
  const [cargandoNomina, setCargandoNomina] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Control Financiero del Comité</h1>
          <p className="text-xs text-slate-500">Transparencia, balances e ingresos por cuotas de socios (4% sueldo base)</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 text-xs font-semibold text-[#0077b6] bg-sky-50 hover:bg-sky-100 rounded-xl transition"
        >
          ← Volver al Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase">Resumen de Cuotas Sociales</h2>
          <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
            <span className="text-slate-600">Porcentaje Descuento Reglamentario:</span>
            <span className="font-bold text-slate-800">4% Sueldo Base</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
            <span className="text-slate-600">Socios en Nómina de Retención RRHH:</span>
            <span className="font-bold text-emerald-700">{nomina ? `${nomina.totalSociosEnNomina} funcionarios` : 'Consultando...'}</span>
          </div>
          <div className="flex justify-between items-center py-2 text-xs">
            <span className="text-slate-600">Período de Aplicación:</span>
            <span className="font-extrabold text-slate-800 text-sm">{nomina?.periodo || '2026-10'}</span>
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase">Auditoría y Transparencia</h2>
          <p className="text-xs text-slate-500">
            Descarga las rendiciones de cuentas trimestrales y nóminas remitidas a Remuneraciones / RRHH.
          </p>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => alert('Generando y descargando Nómina de Retenciones RRHH en formato oficial...')}
              className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-xs font-medium text-slate-700 transition"
            >
              <span>Exportar Nómina de Retención 4% a Planilla RRHH</span>
              <span className="text-emerald-700 font-bold">XLS / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Nómina de Retenciones (HU-02) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Nómina Activa de Retenciones por Planilla (4% Sueldo Base) — HU-02
            </h2>
            <p className="text-xs text-slate-500">
              Socios aprobados en sesión ordinaria con descuento programado para Recursos Humanos y cómputo de carencia
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {nomina?.totalSociosEnNomina ?? 0} socios registrados
          </span>
        </div>

        {cargandoNomina && !nomina ? (
          <p className="text-xs text-slate-400">Cargando nómina...</p>
        ) : !nomina || nomina.socios.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No hay socios aprobados en nómina de retenciones aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold uppercase">
                  <th className="py-3 px-4">Folio Solicitud</th>
                  <th className="py-3 px-4">RUN</th>
                  <th className="py-3 px-4">Funcionario</th>
                  <th className="py-3 px-4">Grado / Contrato</th>
                  <th className="py-3 px-4">% Retención</th>
                  <th className="py-3 px-4">Aprobación (Acta)</th>
                  <th className="py-3 px-4">Término Carencia (6 Meses)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {nomina.socios.map((s) => (
                  <tr key={s.folio} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{s.folio}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{s.run}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{s.nombreCompleto}</td>
                    <td className="py-3.5 px-4 text-slate-600">{s.grado} • {s.calidadContractual}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {s.porcentajeRetencion}% sueldo base
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{s.fechaSesionAprobacion}</div>
                      <div className="text-[10px] text-slate-400">{s.numeroActa || 'Acta Ordinaria'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-emerald-700">{s.finCarencia}</div>
                      <div className="text-[10px] text-slate-400">Derecho a beneficios</div>
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
