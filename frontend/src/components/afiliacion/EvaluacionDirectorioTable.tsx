import React from 'react';
import Link from 'next/link';
import { NotificacionEmail } from '@/app/afiliacion/solicitud/page';

export interface CargaInfo {
  nombreCompleto: string;
  run: string;
  parentesco?: string | null;
  certificadoNombre?: string | null;
  certificadoTipo?: string | null;
  certificadoData?: string | null;
}

export interface SolicitudResumen {
  folio: string;
  estado: string;
  fechaIngreso: string;
  nombreCompleto: string;
  run: string;
  grado: string;
  calidadContractual: string;
  email?: string | null;
  porcentajeDescuento: number;
  cargas: CargaInfo[];
  fechaSesion?: string | null;
  numeroActa?: string | null;
  fechaFinCarencia?: string | null;
  observacionesResolucion?: string | null;
  resueltoPor?: string | null;
  resueltoAt?: string | null;
  notificacionEmail?: NotificacionEmail | null;
}

interface EvaluacionDirectorioTableProps {
  solicitudes: SolicitudResumen[] | null;
  cargando: boolean;
  puedeResolver?: boolean;
  onAbrirModal?: (sol: SolicitudResumen, modo: 'aprobar' | 'rechazar') => void;
  onVerCorreo?: (sol: SolicitudResumen) => void;
  onVerDetalle?: (sol: SolicitudResumen) => void;
  onAbrirBuzonGeneral?: () => void;
}

export const EvaluacionDirectorioTable: React.FC<EvaluacionDirectorioTableProps> = ({
  solicitudes,
  cargando,
  puedeResolver,
  onAbrirModal,
  onVerCorreo,
  onVerDetalle,
}) => {
  const pendientesTotal =
    solicitudes?.filter((s) => s.estado === 'Pendiente de aprobación').length || 0;

  const handlerVer = (s: SolicitudResumen) => {
    if (onVerDetalle) {
      onVerDetalle(s);
    } else if (onVerCorreo) {
      onVerCorreo(s);
    } else if (onAbrirModal) {
      onAbrirModal(s, 'aprobar');
    }
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base font-bold text-[#0f2942]">
              Sesión de Directorio: Evaluación de Incorporaciones (HU-02)
            </h2>
            {solicitudes && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  pendientesTotal > 0
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {pendientesTotal}{' '}
                {pendientesTotal === 1 ? 'pendiente de revisión' : 'pendientes de revisión'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Rol autorizado: Presidente/a o Secretario/a según acta ordinaria de sesión.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/afiliacion/solicitud" className="text-xs font-semibold text-[#006799] hover:underline">
            + Abrir formulario público (HU-01) →
          </Link>
        </div>
      </div>

      {cargando && !solicitudes ? (
        <p className="text-xs text-slate-400">Cargando solicitudes...</p>
      ) : !solicitudes || solicitudes.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No hay solicitudes recepcionadas en el sistema.</p>
      ) : (
        <div className="w-full min-w-0">
          {/* Vista Móvil: Tarjetas compactas donde al pinchar se abre la ficha para gestionar autorización */}
          <div className="block md:hidden divide-y divide-slate-100">
            {solicitudes.map((s) => (
              <div
                key={s.folio}
                onClick={() => handlerVer(s)}
                className="py-3.5 space-y-2 hover:bg-slate-50/80 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlerVer(s);
                    }}
                    className="text-xs font-semibold text-[#006799] hover:underline tabular-nums inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>{s.folio}</span>
                    <span>→</span>
                  </button>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      s.estado === 'Aprobada'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : s.estado === 'Rechazada'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        s.estado === 'Aprobada'
                          ? 'bg-emerald-600'
                          : s.estado === 'Rechazada'
                          ? 'bg-rose-600'
                          : 'bg-amber-500'
                      }`}
                    />
                    {s.estado}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{s.nombreCompleto}</p>
                    <p className="text-slate-500 tabular-nums truncate">
                      RUN {s.run} • {s.calidadContractual} (Grado {s.grado})
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-slate-600 font-medium">
                      {s.cargas.length} {s.cargas.length === 1 ? 'carga' : 'cargas'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(s.fechaIngreso).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Vista Tablet / Desktop: 5 Columnas Limpias Data-Dense con Estado al Final (Estilo TablaAprobaciones) */}
          <div className="hidden md:block w-full overflow-hidden">
            <table className="w-full table-fixed text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-semibold">
                  <th className="w-[20%] py-3 px-4">Folio / Ingreso</th>
                  <th className="w-[26%] py-3 px-4">Funcionario / Contacto</th>
                  <th className="w-[22%] py-3 px-4">Calidad / Cargas</th>
                  <th className="w-[18%] py-3 px-4">Detalle / Carencia</th>
                  <th className="w-[14%] py-3 px-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {solicitudes.map((s) => (
                  <tr
                    key={s.folio}
                    onClick={() => handlerVer(s)}
                    className="hover:bg-sky-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4 align-middle">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlerVer(s);
                        }}
                        className="inline-flex items-center gap-1.5 font-semibold text-[#006799] group-hover:text-[#0c2b45] group-hover:underline tabular-nums truncate cursor-pointer"
                        title="Pinchar para abrir ficha completa y resolver solicitud"
                      >
                        <span>{s.folio}</span>
                        <span className="text-[11px] opacity-75 group-hover:translate-x-0.5 transition-transform">→</span>
                      </button>
                      <div className="text-[11px] text-slate-400 font-normal mt-0.5 tabular-nums">
                        {new Date(s.fechaIngreso).toLocaleDateString('es-CL')}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle min-w-0">
                      <div className="font-semibold text-slate-900 truncate" title={s.nombreCompleto}>
                        {s.nombreCompleto}
                      </div>
                      <div className="text-slate-500 font-normal tabular-nums truncate mt-0.5" title={s.email || ''}>
                        RUN {s.run}
                      </div>
                      {s.email && (
                        <div className="text-slate-400 text-[11px] truncate mt-0.5 font-normal" title={s.email}>
                          {s.email}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 align-middle min-w-0">
                      <div className="font-medium text-slate-800 truncate">
                        {s.calidadContractual} · Grado {s.grado}
                      </div>
                      <div className="text-slate-500 font-normal truncate mt-0.5">
                        {s.cargas.length} {s.cargas.length === 1 ? 'carga' : 'cargas'}
                        {s.cargas.length > 0 && ` (${s.cargas.map((c) => c.nombreCompleto.split(' ')[0]).join(', ')})`}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle text-slate-600 text-xs min-w-0">
                      {s.estado === 'Aprobada' && s.fechaFinCarencia ? (
                        <div>
                          <div className="text-emerald-700 font-semibold whitespace-nowrap text-[11px]">
                            Carencia hasta: {s.fechaFinCarencia}
                          </div>
                          <div className="text-slate-400 text-[10px] truncate mt-0.5" title={`${s.numeroActa || 'S/N'} (${s.fechaSesion || ''})`}>
                            {s.numeroActa || 'Acta Ordinaria'} {s.fechaSesion ? `(${s.fechaSesion})` : ''}
                          </div>
                        </div>
                      ) : s.estado === 'Rechazada' ? (
                        <div className="text-rose-600 text-[11px] line-clamp-2" title={s.observacionesResolucion || ''}>
                          Motivo: {s.observacionesResolucion || 'Inconsistencia en antecedentes'}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Pendiente de sesión</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right align-middle whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          s.estado === 'Aprobada'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : s.estado === 'Rechazada'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            s.estado === 'Aprobada'
                              ? 'bg-emerald-600'
                              : s.estado === 'Rechazada'
                              ? 'bg-rose-600'
                              : 'bg-amber-500'
                          }`}
                        />
                        {s.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
