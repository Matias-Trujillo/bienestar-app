import React from 'react';
import { ResumenSaludSocio, SolicitudReembolso } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface ResumenSaludCardsProps {
  resumen: ResumenSaludSocio;
  solicitudes: SolicitudReembolso[];
}

// [ESTUDIANTE INFORMÁTICA] Determina el año calendario de imputación contable de una solicitud médica.
export function obtenerAnioSolicitud(s: SolicitudReembolso): number {
  if (s.anio_imputacion) return s.anio_imputacion;
  if (s.created_at) {
    const d = new Date(s.created_at);
    if (!Number.isNaN(d.getTime())) return d.getFullYear();
  }
  if (s.fecha_atencion) {
    const yr = parseInt(s.fecha_atencion.slice(0, 4), 10);
    if (!Number.isNaN(yr)) return yr;
  }
  return new Date().getFullYear();
}

interface SubBucketItem {
  label: string;
  amount: number;
  count: number;
  unit: string;
  accentBorder: string;
}

// [ESTUDIANTE INFORMÁTICA] Panel Data-Dense asimétrico: destaca el saldo anual disponible y desglosa los 3 rubros de salud sin esferas difusas.
export const ResumenSaludCards: React.FC<ResumenSaludCardsProps> = ({ resumen, solicitudes }) => {
  const anioActual = resumen.anio_calendario || new Date().getFullYear();
  const topeAnual = resumen.saldo_salud_total_anual || 150000;

  const solicitudesAnioVigente = solicitudes.filter(
    (s) => obtenerAnioSolicitud(s) === anioActual && s.estado !== 'rechazado'
  );

  const farmacia = solicitudesAnioVigente.filter((s) => s.tipo_prestacion === 'farmacia');
  const dental = solicitudesAnioVigente.filter((s) => s.tipo_prestacion === 'dental');
  const ambulatorio = solicitudesAnioVigente.filter((s) =>
    ['consulta', 'examenes', 'programa_medico', 'optica', 'hospitalizacion', 'otros'].includes(
      s.tipo_prestacion
    )
  );

  const buckets: SubBucketItem[] = [
    {
      label: `Prestaciones Ambulatorias (${anioActual})`,
      amount: ambulatorio.reduce((acc, s) => acc + s.monto_reembolso, 0),
      count: ambulatorio.length,
      unit: 'atenciones imputadas',
      accentBorder: 'border-l-[#006799]',
    },
    {
      label: `Recetas de Farmacia (${anioActual})`,
      amount: farmacia.reduce((acc, s) => acc + s.monto_reembolso, 0),
      count: farmacia.length,
      unit: 'recetas reembolsadas',
      accentBorder: 'border-l-[#0c2b45]',
    },
    {
      label: `Tratamientos Dentales (${anioActual})`,
      amount: dental.reduce((acc, s) => acc + s.monto_reembolso, 0),
      count: dental.length,
      unit: 'prestaciones dentales',
      accentBorder: 'border-l-[#b45309]',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Bloque Principal: Cupo Anual Disponible */}
      <div className="lg:col-span-5 p-4 bg-white rounded-lg border border-slate-200 border-l-4 border-l-[#166534] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">
              Cupo Anual de Salud Disponible
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-[#166534] border border-emerald-200 tabular-nums">
              Ejercicio {anioActual}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#166534] tabular-nums">
              {formatCurrency(resumen.saldo_salud_disponible)}
            </p>
            <span className="text-xs text-slate-500 tabular-nums">
              / {formatCurrency(topeAnual)} tope
            </span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100">
          <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1 tabular-nums">
            <span>Ejecución presupuestaria {anioActual}</span>
            <span className="font-bold text-slate-900">{resumen.porcentaje_utilizado}% utilizado</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-sm overflow-hidden border border-slate-200/70">
            <div
              className="h-full bg-[#166534] transition-all duration-300"
              style={{ width: `${Math.min(resumen.porcentaje_utilizado, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 tabular-nums">
            Renovación automática: 01/01/{anioActual + 1}
          </p>
        </div>
      </div>

      {/* Bloques Desglosados por Rubro */}
      <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {buckets.map((b) => (
          <div
            key={b.label}
            className={`p-4 bg-white rounded-lg border border-slate-200 border-l-4 ${b.accentBorder} flex flex-col justify-between`}
          >
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                {b.label}
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-1.5 tabular-nums">
                {formatCurrency(b.amount)}
              </p>
            </div>
            <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
              <span className="font-semibold text-slate-700">{b.count}</span>
              <span>{b.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
