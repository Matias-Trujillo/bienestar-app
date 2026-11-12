'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { SolicitudReembolso } from '@/types';

interface ModalResolucionReembolsoProps {
  solicitudAprobar: SolicitudReembolso | null;
  setSolicitudAprobar: (s: SolicitudReembolso | null) => void;
  onConfirmarAprobar: () => void;

  solicitudRechazar: SolicitudReembolso | null;
  setSolicitudRechazar: (s: SolicitudReembolso | null) => void;
  motivoRechazo: string;
  setMotivoRechazo: (m: string) => void;
  onConfirmarRechazar: () => void;

  procesando: boolean;
}

// [ESTUDIANTE INFORMÁTICA] Modales de resolución: confirmación de aprobación y rechazo con justificación obligatoria.
export const ModalResolucionReembolso: React.FC<ModalResolucionReembolsoProps> = ({
  solicitudAprobar,
  setSolicitudAprobar,
  onConfirmarAprobar,
  solicitudRechazar,
  setSolicitudRechazar,
  motivoRechazo,
  setMotivoRechazo,
  onConfirmarRechazar,
  procesando,
}) => {
  return (
    <>
      {solicitudAprobar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-800">Confirmar Aprobación de Reembolso</h3>
            <p className="text-xs text-slate-600">
              ¿Está seguro de aprobar la solicitud <strong>{solicitudAprobar.codigo}</strong> del socio{' '}
              <strong>{solicitudAprobar.socio_nombre}</strong> por un monto de{' '}
              <strong className="text-emerald-700">{formatCurrency(solicitudAprobar.monto_copago)}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={procesando}
                onClick={() => setSolicitudAprobar(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesando}
                onClick={onConfirmarAprobar}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
              >
                {procesando ? 'Aprobando...' : 'Sí, Aprobar Reembolso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {solicitudRechazar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-rose-700">Rechazar Solicitud de Reembolso</h3>
            <p className="text-xs text-slate-600">
              Solicitud <strong>{solicitudRechazar.codigo}</strong> de {solicitudRechazar.socio_nombre}. El cupo retenido de{' '}
              {formatCurrency(solicitudRechazar.monto_copago)} será restituido automáticamente al socio.
            </p>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Motivo del Rechazo (Obligatorio) *
              </label>
              <textarea
                rows={3}
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Indique claramente la razón (ej. Boleta ilegible, caducidad > 30 días, prestación no cubierta)..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={procesando}
                onClick={() => setSolicitudRechazar(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesando || !motivoRechazo.trim()}
                onClick={onConfirmarRechazar}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition disabled:opacity-50"
              >
                {procesando ? 'Rechazando...' : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
