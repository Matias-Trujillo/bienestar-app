import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SolicitudReembolso, TIPO_PRESTACION_LABELS } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getEstadoBadge } from './TablaSolicitudes';

interface DetalleSolicitudModalProps {
  solicitud: SolicitudReembolso | null;
  onClose: () => void;
  onVerComprobante: (sol: SolicitudReembolso) => void;
  onIniciarAprobar?: (sol: SolicitudReembolso) => void;
  onIniciarRechazar?: (sol: SolicitudReembolso) => void;
}

// [ESTUDIANTE INFORMÁTICA] Sección de resumen financiero y datos del beneficiario dentro de la ficha de solicitud.
const DetalleInfoGrid: React.FC<{ solicitud: SolicitudReembolso }> = ({ solicitud }) => {
  const prestacionLabel =
    solicitud.tipo_prestacion_label ||
    TIPO_PRESTACION_LABELS[solicitud.tipo_prestacion] ||
    solicitud.tipo_prestacion;

  return (
    <div className="mt-4 space-y-3 text-xs">
      {solicitud.socio_nombre && (
        <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200/70 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="block text-xs text-slate-500 font-medium">Socio Titular</span>
            <span className="block text-sm text-slate-900 font-semibold mt-0.5">{solicitud.socio_nombre}</span>
          </div>
          {solicitud.socio_rut && (
            <span className="px-2.5 py-1 rounded-lg bg-white text-slate-700 font-medium border border-slate-200/80 tabular-nums">
              RUT {solicitud.socio_rut}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
          <span className="block text-xs text-slate-500 font-medium">Beneficiario / Paciente</span>
          <span className="block text-sm text-slate-900 font-semibold mt-0.5">{solicitud.beneficiario_nombre}</span>
          <span className="block text-xs text-slate-500 mt-0.5">{solicitud.beneficiario_parentesco}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
          <span className="block text-xs text-slate-500 font-medium">Tipo de Prestación y Fechas</span>
          <span className="block text-sm text-slate-900 font-semibold mt-0.5">{prestacionLabel}</span>
          <span className="block text-xs text-slate-500 tabular-nums mt-0.5">
            Atención: {formatDate(solicitud.fecha_atencion)} • Boleta: {formatDate(solicitud.fecha_boleta)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
          <span className="block text-xs text-slate-500 font-medium">Total Boleta</span>
          <span className="block text-sm text-slate-900 font-semibold tabular-nums mt-0.5">
            {formatCurrency(solicitud.monto_boleta)}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
          <span className="block text-xs text-slate-500 font-medium">Copago Socio</span>
          <span className="block text-sm text-slate-900 font-semibold tabular-nums mt-0.5">
            {formatCurrency(solicitud.monto_copago)}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80">
          <span className="block text-xs text-[#166534] font-medium">A Reembolsar</span>
          <span className="block text-sm text-[#166534] font-bold tabular-nums mt-0.5">
            {formatCurrency(solicitud.monto_reembolso)}
          </span>
        </div>
      </div>
    </div>
  );
};

// [ESTUDIANTE INFORMÁTICA] Modal unificado de detalle de solicitud con visor de comprobante y acciones directivas de resolución.
export const DetalleSolicitudModal: React.FC<DetalleSolicitudModalProps> = ({
  solicitud,
  onClose,
  onVerComprobante,
  onIniciarAprobar,
  onIniciarRechazar,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!solicitud || !mounted) return null;
  const badge = getEstadoBadge(solicitud.estado);
  const puedeResolver =
    solicitud.estado === 'en_revision' && Boolean(onIniciarAprobar) && Boolean(onIniciarRechazar);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200/90 overflow-hidden animate-scale-in max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28] shrink-0" />

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-semibold text-[#006799] tabular-nums block">
                Expediente #{solicitud.codigo}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                Ficha Completa de Solicitud Médica
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${badge.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                {solicitud.estado_label || solicitud.estado.replace('_', ' ')}
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
          </div>

          <DetalleInfoGrid solicitud={solicitud} />

          {/* Descripción / Glosa */}
          {solicitud.descripcion && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
              <span className="text-slate-500 font-medium block">Glosa / Observaciones de la Atención</span>
              <p className="text-slate-800 mt-1 leading-relaxed">{solicitud.descripcion}</p>
            </div>
          )}

          {/* Motivo de rechazo si aplica */}
          {solicitud.estado === 'rechazado' && solicitud.motivo_rechazo && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs">
              <span className="text-rose-700 font-semibold block">Causal de Rechazo Registrada</span>
              <p className="text-rose-900 mt-1">{solicitud.motivo_rechazo}</p>
            </div>
          )}

          {/* Comprobante Adjunto */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs text-slate-500 font-medium block">Respaldo / Boleta Adjunta</span>
            {solicitud.comprobante_filename ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0 p-2 bg-sky-50 border border-sky-200/80 rounded-xl text-[#006799]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-xs text-slate-800 font-medium truncate" title={solicitud.comprobante_filename}>
                    {solicitud.comprobante_filename}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onVerComprobante(solicitud)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#006799] bg-sky-50 hover:bg-sky-100 border border-sky-200/90 rounded-xl transition-colors shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Ver Comprobante
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-1">Sin comprobante adjunto</p>
            )}
          </div>

          <div className="text-xs text-slate-400 tabular-nums">
            Solicitud ingresada el {formatDate(solicitud.created_at)}
          </div>

          {/* Barra de Acciones y Resolución */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cerrar
            </button>

            {puedeResolver && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = solicitud;
                    onClose();
                    onIniciarRechazar?.(target);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
                >
                  ✕ Rechazar Solicitud
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = solicitud;
                    onClose();
                    onIniciarAprobar?.(target);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#166534] hover:bg-emerald-800 rounded-xl shadow-xs transition-colors"
                >
                  ✓ Autorizar Reembolso
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
