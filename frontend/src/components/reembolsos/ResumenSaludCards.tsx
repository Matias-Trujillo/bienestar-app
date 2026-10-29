import React from 'react';
import { ResumenSaludSocio, SolicitudReembolso } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface ResumenSaludCardsProps {
  resumen: ResumenSaludSocio;
  solicitudes: SolicitudReembolso[];
}

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

export const ResumenSaludCards: React.FC<ResumenSaludCardsProps> = ({ resumen, solicitudes }) => {
  const anioActual = resumen.anio_calendario || new Date().getFullYear();
  const topeAnual = resumen.saldo_salud_total_anual || 150000;

  // Filtrar solicitudes que pertenecen exclusivamente al año calendario vigente (1 Ene – 31 Dic)
  const solicitudesAnioVigente = solicitudes.filter(
    (s) => obtenerAnioSolicitud(s) === anioActual && s.estado !== 'rechazado'
  );

  const farmaciaSolicitudes = solicitudesAnioVigente.filter(
    (s) => s.tipo_prestacion === 'farmacia'
  );
  const totalFarmacia = farmaciaSolicitudes.reduce((acc, s) => acc + s.monto_reembolso, 0);

  const dentalSolicitudes = solicitudesAnioVigente.filter(
    (s) => s.tipo_prestacion === 'dental'
  );
  const totalDental = dentalSolicitudes.reduce((acc, s) => acc + s.monto_reembolso, 0);

  const ambulatorioSolicitudes = solicitudesAnioVigente.filter((s) =>
    ['consulta', 'examenes', 'programa_medico', 'optica', 'hospitalizacion', 'otros'].includes(
      s.tipo_prestacion
    )
  );
  const totalAmbulatorio = ambulatorioSolicitudes.reduce((acc, s) => acc + s.monto_reembolso, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Saldo Disponible Año Calendario */}
      <div className="relative overflow-hidden p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm group hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
              Saldo Disponible
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              Año {anioActual}
            </span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">
            {formatCurrency(resumen.saldo_salud_disponible)}
          </p>
          <div className="mt-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>Utilizado en {anioActual}</span>
              <span className="font-semibold">{resumen.porcentaje_utilizado}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(resumen.porcentaje_utilizado, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Tope {formatCurrency(topeAnual)} año calendario • Renueva 1 Ene {anioActual + 1}
            </p>
          </div>
        </div>
      </div>

      {/* Card 2: Gasto Ambulatorio (Año Calendario) */}
      <div className="relative overflow-hidden p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl" />
        <div className="relative">
          <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
            Gasto Ambulatorio ({anioActual})
          </span>
          <p className="text-2xl font-extrabold text-slate-800 mt-1">
            {formatCurrency(totalAmbulatorio)}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="flex w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-blue-600 font-medium">
              {ambulatorioSolicitudes.length} atención(es) en {anioActual}
            </span>
          </div>
        </div>
      </div>

      {/* Card 3: Gasto Farmacia (Año Calendario) */}
      <div className="relative overflow-hidden p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl" />
        <div className="relative">
          <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
            Gasto Farmacia ({anioActual})
          </span>
          <p className="text-2xl font-extrabold text-slate-800 mt-1">
            {formatCurrency(totalFarmacia)}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="flex w-2 h-2 rounded-full bg-violet-500" />
            <span className="text-xs text-violet-600 font-medium">
              💊 {farmaciaSolicitudes.length} receta(s) en {anioActual}
            </span>
          </div>
        </div>
      </div>

      {/* Card 4: Fondo Dental (Año Calendario) */}
      <div className="relative overflow-hidden p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl" />
        <div className="relative">
          <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
            Fondo Dental ({anioActual})
          </span>
          <p className="text-2xl font-extrabold text-slate-800 mt-1">
            {formatCurrency(totalDental)}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="flex w-2 h-2 rounded-full bg-teal-500" />
            <span className="text-xs text-teal-600 font-medium">
              🦷 {dentalSolicitudes.length} atención(es) en {anioActual}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
