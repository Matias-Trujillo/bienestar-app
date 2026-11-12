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
  iconBg: string;
  iconPath: string;
}

// [ESTUDIANTE INFORMÁTICA] Tarjetas modernas de salud con iconos vectoriales suaves, barra de progreso y cero desborde.
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
      label: `Ambulatorio (${anioActual})`,
      amount: ambulatorio.reduce((acc, s) => acc + s.monto_reembolso, 0),
      count: ambulatorio.length,
      unit: 'atenciones médicas',
      iconBg: 'bg-sky-50 text-[#006799] border-sky-200/80',
      iconPath: 'M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    },
    {
      label: `Farmacia (${anioActual})`,
      amount: farmacia.reduce((acc, s) => acc + s.monto_reembolso, 0),
      count: farmacia.length,
      unit: 'recetas reembolsadas',
      iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
      iconPath: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    },
    {
      label: `Fondo Dental (${anioActual})`,
      amount: dental.reduce((acc, s) => acc + s.monto_reembolso, 0),
      count: dental.length,
      unit: 'prestaciones dentales',
      iconBg: 'bg-amber-50 text-[#b45309] border-amber-200/80',
      iconPath: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0">
      {/* Tarjeta Principal: Cupo Anual Disponible */}
      <div className="lg:col-span-5 card-modern-interactive p-5 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 font-medium truncate">
              Saldo Disponible
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-[#166534] border border-emerald-200/80 tabular-nums shrink-0">
              Año {anioActual}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2 flex-wrap">
            <p className="text-2xl font-bold text-[#166534] tabular-nums">
              {formatCurrency(resumen.saldo_salud_disponible)}
            </p>
            <span className="text-xs text-slate-500 font-normal tabular-nums">
              / {formatCurrency(topeAnual)} tope
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 tabular-nums font-normal">
            <span>Utilizado en {anioActual}</span>
            <span className="font-semibold text-slate-800">{resumen.porcentaje_utilizado}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#166534] to-[#006799] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(resumen.porcentaje_utilizado, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5 tabular-nums font-normal">
            Renueva automáticamente el 01 Ene {anioActual + 1}
          </p>
        </div>
      </div>

      {/* Rubros Desglosados */}
      <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-0">
        {buckets.map((b) => (
          <div
            key={b.label}
            className="card-modern-interactive p-5 flex flex-col justify-between min-w-0"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs text-slate-500 font-medium truncate">
                  {b.label}
                </span>
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${b.iconBg}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={b.iconPath} />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {formatCurrency(b.amount)}
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 tabular-nums font-normal">
              <span className="font-semibold text-slate-800">{b.count}</span>
              <span className="truncate ml-1">{b.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
