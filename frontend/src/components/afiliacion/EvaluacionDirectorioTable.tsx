import React from 'react';
import Link from 'next/link';

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
}

interface EvaluacionDirectorioTableProps {
  solicitudes: SolicitudResumen[] | null;
  cargando: boolean;
  puedeResolver: boolean;
  onAbrirModal: (sol: SolicitudResumen, modo: 'aprobar' | 'rechazar') => void;
}

export const EvaluacionDirectorioTable: React.FC<EvaluacionDirectorioTableProps> = ({
  solicitudes,
  cargando,
  puedeResolver,
  onAbrirModal,
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Sesión de Directorio: Evaluación de Incorporaciones (HU-02)
          </h2>
          <p className="text-xs text-slate-500">
            Rol autorizado: Presidente/a o Secretario/a según acta ordinaria de sesión.
          </p>
        </div>
        <Link href="/afiliacion/solicitud" className="text-xs font-semibold text-emerald-700 hover:underline">
          + Abrir formulario público (HU-01) →
        </Link>
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

                {s.estado === 'Pendiente de aprobación' && (
                  <div className="pt-1">
                    {puedeResolver ? (
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
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Vista Tablet / Desktop: Tabla Tradicional */}
          <div className="hidden md:block overflow-x-auto">
            <table id="tabla-solicitudes" className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold uppercase">
                  <th className="py-3 px-4">Folio</th>
                  <th className="py-3 px-4">Fecha Ingreso</th>
                  <th className="py-3 px-4">Funcionario</th>
                  <th className="py-3 px-4">RUN</th>
                  <th className="py-3 px-4">Grado / Calidad</th>
                  <th className="py-3 px-4">Cargas Legales</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Detalle / Carencia</th>
                  <th className="py-3 px-4 text-center">Acciones Sesión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {solicitudes.map((s) => (
                  <tr key={s.folio} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{s.folio}</td>
                    <td className="py-3.5 px-4 text-slate-600">{new Date(s.fechaIngreso).toLocaleDateString('es-CL')}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{s.nombreCompleto}</div>
                      {s.email && <div className="text-[10px] text-slate-400">{s.email}</div>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{s.run}</td>
                    <td className="py-3.5 px-4 text-slate-600">{s.grado} • {s.calidadContractual}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700">{s.cargas.length} cargas</span>
                      {s.cargas.length > 0 && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[130px]" title={s.cargas.map(c => c.nombreCompleto).join(', ')}>
                          {s.cargas.map(c => c.nombreCompleto.split(' ')[0]).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${
                          s.estado === 'Aprobada'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : s.estado === 'Rechazada'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {s.estado}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      {s.estado === 'Aprobada' && s.fechaFinCarencia ? (
                        <div>
                          <div className="text-emerald-700 font-semibold">Carencia hasta: {s.fechaFinCarencia}</div>
                          <div className="text-slate-400 text-[10px]">Acta: {s.numeroActa || 'S/N'} ({s.fechaSesion})</div>
                        </div>
                      ) : s.estado === 'Rechazada' ? (
                        <div className="text-rose-600 truncate max-w-[150px]" title={s.observacionesResolucion || ''}>
                          Obs: {s.observacionesResolucion}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Pendiente de sesión</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {s.estado === 'Pendiente de aprobación' ? (
                        puedeResolver ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onAbrirModal(s, 'aprobar')}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm"
                              title="Aprobar en sesión de directorio"
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={() => onAbrirModal(s, 'rechazar')}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                              title="Rechazar con observaciones"
                            >
                              Rechazar
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Solo Presidente/Secretario</span>
                        )
                      ) : (
                        <span className="text-[10px] text-slate-400">Resuelto por {s.resueltoPor?.split(' ')[0] || 'Directorio'}</span>
                      )}
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
