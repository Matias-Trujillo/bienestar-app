import React, { useState } from 'react';

export interface AuditLogItem {
  id: number;
  created_at: string;
  usuario_nombre: string;
  usuario_rut?: string;
  usuario_rol: string;
  modulo: string;
  accion: string;
  recurso_tipo: string;
  recurso_id?: string;
  detalles?: string;
  ip_origen?: string;
}

interface AuditLogViewerProps {
  logs: AuditLogItem[];
  loading: boolean;
  onRefresh: () => void;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs, loading, onRefresh }) => {
  const [filtroModulo, setFiltroModulo] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');

  const modulos = ['TODOS', 'AFILIACION', 'REEMBOLSOS', 'BENEFICIOS', 'USUARIOS', 'CONFIGURACION'];

  const logsFiltrados = logs.filter((log) => {
    if (filtroModulo !== 'TODOS' && log.modulo !== filtroModulo) return false;
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      log.usuario_nombre.toLowerCase().includes(q) ||
      log.accion.toLowerCase().includes(q) ||
      (log.recurso_id && log.recurso_id.toLowerCase().includes(q)) ||
      (log.detalles && log.detalles.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Registro Inmutable • Trazabilidad Legal
          </div>
          <h2 className="text-base font-bold text-slate-800">
            Bitácora de Auditoría del Sistema (Audit Logs)
          </h2>
          <p className="text-xs text-slate-500">
            Historial cronológico de acuerdos, aprobaciones, liquidaciones y cambios de directiva (Solo Lectura - No eliminable).
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
        >
          <span>↺</span> Actualizar logs
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {modulos.map((m) => (
            <button
              key={m}
              onClick={() => setFiltroModulo(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filtroModulo === m
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Buscar por usuario, acción o folio..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-800 focus:outline-none w-full sm:w-64"
        />
      </div>

      {/* Tabla de Logs */}
      {loading ? (
        <p className="p-8 text-center text-sm text-slate-400">Cargando registros de auditoría...</p>
      ) : logsFiltrados.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-400 italic">No hay registros que coincidan con los filtros.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold uppercase">
                <th className="py-3 px-3">Fecha y Hora</th>
                <th className="py-3 px-3">Usuario Responsable</th>
                <th className="py-3 px-3">Módulo</th>
                <th className="py-3 px-3">Acción Registrada</th>
                <th className="py-3 px-3">Recurso / Folio</th>
                <th className="py-3 px-3">Detalle del Evento</th>
                <th className="py-3 px-3 text-right">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logsFiltrados.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                    {new Date(log.created_at).toLocaleString('es-CL')}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-800 block">{log.usuario_nombre}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {log.usuario_rol} {log.usuario_rut ? `• ${log.usuario_rut}` : ''}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {log.modulo}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                      {log.accion}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-700">
                    {log.recurso_id || '—'}
                  </td>
                  <td className="py-3 px-3 text-slate-600 text-xs max-w-xs break-words">
                    {log.detalles || 'Sin detalles adicionales'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-400 text-[10px]">
                    {log.ip_origen || '127.0.0.1'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
