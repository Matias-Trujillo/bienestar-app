import React from 'react';
import Link from 'next/link';
import { NotificacionEmail } from '@/app/afiliacion/solicitud/page';

export interface CargaInfo {
  nombreCompleto: string;
  run: string;
  parentesco?: string | null;
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
  puedeResolver: boolean;
  onAbrirModal: (sol: SolicitudResumen, modo: 'aprobar' | 'rechazar') => void;
  onVerCorreo?: (sol: SolicitudResumen) => void;
  onAbrirBuzonGeneral?: () => void;
}

export const EvaluacionDirectorioTable: React.FC<EvaluacionDirectorioTableProps> = ({
  solicitudes,
  cargando,
  puedeResolver,
  onAbrirModal,
  onVerCorreo,
}) => {
  const pendientesTotal =
    solicitudes?.filter((s) => s.estado === 'Pendiente de aprobación').length || 0;

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
        <>
          {/* Vista Móvil: Tarjetas de Incorporación para Smartphones */}
          <div className="block md:hidden divide-y divide-slate-100">
            {solicitudes.map((s) => (
              <div key={s.folio} className="py-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded">
                    {s.folio}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${
                      s.estado === 'Aprobada'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : s.estado === 'Rechazada'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {s.estado}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{s.nombreCompleto}</h3>
                  <p className="text-xs text-slate-500 font-mono">RUN: {s.run} • Grado {s.grado} ({s.calidadContractual})</p>
                  {s.email && <p className="text-[11px] text-slate-400">{s.email}</p>}
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Fecha Ingreso:</span>
                    <span className="font-medium text-slate-800">{new Date(s.fechaIngreso).toLocaleDateString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Cargas Familiares:</span>
                    <span className="font-semibold text-slate-800">{s.cargas.length} cargas registradas</span>
                  </div>
                  {s.cargas.length > 0 && (
                    <div className="text-[10px] text-slate-400">
                      {s.cargas.map(c => c.nombreCompleto).join(', ')}
                    </div>
                  )}

                  {s.estado === 'Aprobada' && s.fechaFinCarencia && (
                    <div className="pt-1 text-[11px] text-emerald-700 font-semibold border-t border-slate-200/60">
                      ✓ Carencia hasta: {s.fechaFinCarencia} (Acta: {s.numeroActa || 'S/N'})
                    </div>
                  )}
                  {s.estado === 'Rechazada' && s.observacionesResolucion && (
                    <div className="pt-1 text-[11px] text-rose-700 font-medium border-t border-slate-200/60">
                      Motivo: {s.observacionesResolucion}
                    </div>
                  )}
                </div>

                <div className="pt-1 space-y-2">
                  {s.estado === 'Pendiente de aprobación' ? (
                    puedeResolver ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => onAbrirModal(s, 'aprobar')}
                          className="w-full py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm text-center"
                        >
                          ✓ Aprobar
                        </button>
                        <button
                          onClick={() => onAbrirModal(s, 'rechazar')}
                          className="w-full py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition text-center"
                        >
                          ✕ Rechazar
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic text-center">
                        Requiere resolución de Presidente o Secretario
                      </p>
                    )
                  ) : null}
                  {onVerCorreo && (
                    <button
                      type="button"
                      onClick={() => onVerCorreo(s)}
                      className={`w-full py-1.5 rounded-xl text-[11px] font-semibold border transition text-center ${
                        s.estado === 'Pendiente de aprobación'
                          ? 'text-[#006799] bg-sky-50 hover:bg-sky-100 border-sky-200'
                          : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200'
                      }`}
                    >
                      {s.estado === 'Pendiente de aprobación' ? 'Ver Solicitud' : 'Ver Detalle'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Vista Tablet / Desktop: Tabla optimizada sin scroll horizontal */}
          <div className="hidden md:block">
            <table id="tabla-solicitudes" className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-3">Folio / Ingreso</th>
                  <th className="py-3 px-3">Funcionario / Contacto</th>
                  <th className="py-3 px-3">Calidad / Cargas</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3">Detalle / Carencia</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {solicitudes.map((s) => (
                  <tr key={s.folio} className="hover:bg-slate-50/70 transition align-middle">
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="font-mono font-bold text-[#0f2942]">{s.folio}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(s.fechaIngreso).toLocaleDateString('es-CL')}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-800">{s.nombreCompleto}</div>
                      <div className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        RUN {s.run}
                      </div>
                      {s.email && (
                        <div className="text-[11px] text-[#006799] truncate max-w-[190px]" title={s.email}>
                          {s.email}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-700">
                        {s.calidadContractual} · Grado {s.grado}
                      </div>
                      <div
                        className="text-[11px] text-slate-500 truncate max-w-[140px]"
                        title={
                          s.cargas.length > 0
                            ? s.cargas.map((c) => `${c.nombreCompleto} (${c.parentesco || 'Carga'})`).join(', ')
                            : 'Sin cargas registradas'
                        }
                      >
                        <span className="font-medium text-slate-600">{s.cargas.length} {s.cargas.length === 1 ? 'carga' : 'cargas'}</span>
                        {s.cargas.length > 0 && (
                          <span className="text-slate-400">
                            {' '}({s.cargas.map((c) => c.nombreCompleto.split(' ')[0]).join(', ')})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${
                          s.estado === 'Aprobada'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : s.estado === 'Rechazada'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {s.estado}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 text-[11px] max-w-[200px]">
                      {s.estado === 'Aprobada' && s.fechaFinCarencia ? (
                        <div>
                          <div className="text-emerald-700 font-semibold whitespace-nowrap">
                            Carencia hasta: {s.fechaFinCarencia}
                          </div>
                          <div className="text-slate-400 text-[10px] truncate" title={`${s.numeroActa || 'S/N'} (${s.fechaSesion})`}>
                            {s.numeroActa || 'Sesión Ordinaria'} ({s.fechaSesion})
                          </div>
                        </div>
                      ) : s.estado === 'Rechazada' ? (
                        <div className="text-rose-600 line-clamp-2" title={s.observacionesResolucion || ''}>
                          Motivo: {s.observacionesResolucion}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Pendiente de sesión</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {s.estado === 'Pendiente de aprobación' ? (
                          puedeResolver ? (
                            <>
                              <button
                                onClick={() => onAbrirModal(s, 'aprobar')}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition shadow-sm cursor-pointer"
                                title="Aprobar solicitud de incorporación"
                              >
                                Aprobar
                              </button>
                              <button
                                onClick={() => onAbrirModal(s, 'rechazar')}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                                title="Rechazar solicitud con motivo"
                              >
                                Rechazar
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Solo Presidente/Secretario</span>
                          )
                        ) : null}

                        {onVerCorreo && (
                          <button
                            type="button"
                            onClick={() => onVerCorreo(s)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                              s.estado === 'Pendiente de aprobación'
                                ? 'text-[#006799] bg-sky-50 hover:bg-sky-100 border-sky-200'
                                : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200'
                            }`}
                            title="Ver ficha completa de la solicitud y cargas familiares"
                          >
                            {s.estado === 'Pendiente de aprobación' ? 'Ver Solicitud' : 'Ver Detalle'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
