import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SolicitudReembolso } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getEstadoBadge } from './TablaSolicitudes';

interface DetalleSolicitudModalProps {
  solicitud: SolicitudReembolso | null;
  onClose: () => void;
  onVerComprobante: (sol: SolicitudReembolso) => void;
}

export const DetalleSolicitudModal: React.FC<DetalleSolicitudModalProps> = ({
  solicitud,
  onClose,
  onVerComprobante,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!solicitud || !mounted) return null;
  const badge = getEstadoBadge(solicitud.estado);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-mono font-bold text-slate-400">{solicitud.codigo}</span>
            <h3 className="text-base font-bold text-slate-800 mt-0.5">Detalle de la Solicitud</h3>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {solicitud.estado.replace('_', ' ')}
          </span>
        </div>

        {/* Info grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50">
            <span className="block text-[11px] text-slate-400 uppercase font-semibold">Beneficiario</span>
            <span className="block text-sm text-slate-800 font-bold mt-0.5">{solicitud.beneficiario_nombre}</span>
            <span className="block text-[11px] text-slate-400">{solicitud.beneficiario_parentesco}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50">
            <span className="block text-[11px] text-slate-400 uppercase font-semibold">Fecha Atención</span>
            <span className="block text-sm text-slate-800 font-bold mt-0.5">{formatDate(solicitud.fecha_atencion)}</span>
            <span className="block text-[11px] text-slate-400">Boleta: {formatDate(solicitud.fecha_boleta)}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50">
            <span className="block text-[11px] text-slate-400 uppercase font-semibold">Monto Boleta</span>
            <span className="block text-sm text-slate-800 font-bold mt-0.5">{formatCurrency(solicitud.monto_boleta)}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50">
            <span className="block text-[11px] text-emerald-500 uppercase font-semibold">Monto Reembolso</span>
            <span className="block text-sm text-emerald-700 font-bold mt-0.5">{formatCurrency(solicitud.monto_reembolso)}</span>
          </div>
        </div>

        {/* Descripción */}
        {solicitud.descripcion && (
          <div className="mt-3">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Descripción</span>
            <p className="text-xs text-slate-600 mt-0.5">{solicitud.descripcion}</p>
          </div>
        )}

        {/* Comprobante */}
        <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Comprobante Adjunto</span>
          {solicitud.comprobante_filename ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="flex-shrink-0 p-2 bg-emerald-100 rounded-lg text-emerald-700">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-xs text-slate-700 font-semibold truncate" title={solicitud.comprobante_filename}>
                  {solicitud.comprobante_filename}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onVerComprobante(solicitud)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg shadow-sm transition active:scale-[0.98]"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Ver archivo
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-1">Sin comprobante adjunto</p>
          )}
        </div>

        {/* Fecha ingreso */}
        <div className="mt-3 text-[11px] text-slate-400">
          Ingresada el {formatDate(solicitud.created_at)}
        </div>

        {/* Botón cerrar */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
