import React from 'react';
import { ResumenSaludSocio, SolicitudReembolso } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface ResumenSaludCardsProps {
  resumen: ResumenSaludSocio;
  solicitudes: SolicitudReembolso[];
}

export const ResumenSaludCards: React.FC<ResumenSaludCardsProps> = ({ resumen, solicitudes }) => {
  // Solicitudes vigentes no rechazadas
  const farmaciaSolicitudes = solicitudes.filter(
    (s) => s.tipo_prestacion === 'farmacia' && s.estado !== 'rechazado'
  );
  const totalFarmacia = farmaciaSolicitudes.reduce((acc, s) => acc + s.monto_reembolso, 0);

  const dentalSolicitudes = solicitudes.filter(
    (s) => s.tipo_prestacion === 'dental' && s.estado !== 'rechazado'
  );
  const totalDental = dentalSolicitudes.reduce((acc, s) => acc + s.monto_reembolso, 0);

  const ambulatorioSolicitudes = solicitudes.filter(
    (s) =>
      ['consulta', 'examenes', 'programa_medico', 'optica', 'hospitalizacion', 'otros'].includes(
        s.tipo_prestacion
      ) && s.estado !== 'rechazado'
  );
  const totalAmbulatorio = ambulatorioSolicitudes.reduce((acc, s) => acc + s.monto_reembolso, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Saldo Disponible */}
      <div className="relative overflow-hidden p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm group hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
        <div className="relative">
          <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Saldo Disponible</span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">{formatCurrency(resumen.saldo_salud_disponible)}</p>
          <div className="mt-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>Comprometido / Utilizado</span>
              <span className="font-semibold">{resumen.porcentaje_utilizado}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(resumen.porcentaje_utilizado, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">de {formatCurrency(resumen.saldo_salud_total_anual)} anuales</p>
          </div>
        </div>
      </div>

      {/* Card 2: Gasto Ambulatorio */}
      <div className="relative overflow-hidden p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl" />
        <div className="relative">
          <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Gasto Ambulatorio</span>
          <p className="text-2xl font-extrabold text-slate-800 mt-1">
            {formatCurrency(totalAmbulatorio)}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="flex w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-blue-600 font-medium">
              {ambulatorioSolicitudes.length} atención(es) registrada(s)
            </span>
          </div>
        </div>
      </div>

      {/* Card 3: Gasto Farmacia */}
      <div className="relative overflow-hidden p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl" />
        <div className="relative">
          <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Gasto Farmacia</span>
          <p className="text-2xl font-extrabold text-slate-800 mt-1">{formatCurrency(totalFarmacia)}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="flex w-2 h-2 rounded-full bg-violet-500" />
            <span className="text-xs text-violet-600 font-medium">
              💊 {farmaciaSolicitudes.length} receta(s) y medicamentos
            </span>
          </div>
        </div>
      </div>

      {/* Card 4: Fondo Dental */}
      <div className="relative overflow-hidden p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl" />
        <div className="relative">
          <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Fondo Dental</span>
          <p className="text-2xl font-extrabold text-slate-800 mt-1">{formatCurrency(totalDental)}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="flex w-2 h-2 rounded-full bg-teal-500" />
            <span className="text-xs text-teal-600 font-medium">
              🦷 {dentalSolicitudes.length} atención(es) dental(es)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
