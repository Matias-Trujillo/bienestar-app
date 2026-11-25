'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';
import {
  EstadoMovimiento,
  Movimiento,
  ReembolsoHistorialResponse,
  SolicitudBeneficio,
  SolicitudReembolso,
} from '@/types';
import { formatCurrency, formatDate, getErrorMessage, getStatusBadgeStyle } from '@/lib/utils';
import { imprimirColillaReembolso } from '@/lib/colillaReembolso';

interface MovimientoReal extends Movimiento {
  origen: 'reembolso' | 'beneficio';
  reembolsoId?: number;
  reembolsoRaw?: SolicitudReembolso;
  metodoPago?: string;
  numeroDocumento?: string;
  bancoEmisor?: string;
  fechaPago?: string;
  horaProceso?: string;
  recepcionConforme?: boolean;
  recepcionConformeAt?: string | null;
}

const FILTER_TABS = ['Todos', 'Aprobado', 'Pagado', 'En Revisión', 'Rechazado'] as const;

  function mapEstadoReembolso(estado: string): EstadoMovimiento {
    if (estado === 'pagado') return 'Pagado';
    if (estado === 'aprobado') return 'Aprobado';
    if (estado === 'rechazado') return 'Rechazado';
    return 'En Revisión';
  }

function mapEstadoBeneficio(estado: string): EstadoMovimiento {
  if (estado === 'LIQUIDADO') return 'Pagado';
  if (estado === 'APROBADO') return 'Aprobado';
  if (estado === 'RECHAZADO') return 'Rechazado';
  return 'En Revisión';
}

const ReceiptPreviewModal: React.FC<{
  receipt: MovimientoReal;
  onClose: () => void;
  onConfirmarRecepcion: (m: MovimientoReal) => void;
  confirmando: boolean;
}> = ({ receipt, onClose, onConfirmarRecepcion, confirmando }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl max-w-md w-full border border-slate-200/90 shadow-2xl overflow-hidden animate-scale-in max-h-[92vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-xs font-medium text-[#006799] block">
              Cartola Real • Comité de Bienestar (HU-10)
            </span>
            <h3 className="text-base font-semibold text-slate-900 tabular-nums">
              Comprobante #{receipt.id}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Concepto:</span>
            <span className="font-semibold text-slate-900 text-right">{receipt.concepto}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Módulo:</span>
            <span className="font-medium text-slate-800">{receipt.modulo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Fecha de Emisión:</span>
            <span className="font-medium text-slate-800 tabular-nums">{formatDate(receipt.fecha)}</span>
          </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Estado:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyle(receipt.estado)}`}>
                  {receipt.estado}
                </span>
              </div>
                <div className="flex justify-between pt-2 border-t border-slate-200/80">
                  <span className="text-slate-600 font-semibold">Monto:</span>
                  <span className="font-bold text-[#166534] tabular-nums">{formatCurrency(receipt.monto)}</span>
                </div>
                {receipt.numeroDocumento && (
                  <div className="flex justify-between pt-2 border-t border-slate-200/80">
                    <span className="text-slate-500">Documento de Pago:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {receipt.metodoPago || 'Cheque'} N° {receipt.numeroDocumento}
                    </span>
                  </div>
                )}
                {receipt.fechaPago && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fecha / Hora Pago:</span>
                    <span className="font-medium text-slate-800 tabular-nums">
                      {receipt.fechaPago} {receipt.horaProceso ? `(${receipt.horaProceso})` : ''}
                    </span>
                  </div>
                )}
                {receipt.detalle && (
                  <div className="pt-2 border-t border-slate-200/80">
                    <span className="text-slate-500 block mb-0.5">Detalle:</span>
                    <p className="text-slate-700 leading-relaxed">{receipt.detalle}</p>
                  </div>
                )}
              </div>

                {/* Estado de Recepción Conforme (HU-10) */}
                {receipt.origen === 'reembolso' && (receipt.estado === 'Pagado' || receipt.estado === 'Aprobado') && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs ${receipt.recepcionConforme
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                  >
                    {receipt.recepcionConforme ? (
                      <p className="font-semibold">
                        ✓ Recepción Conforme confirmada el{' '}
                        {receipt.recepcionConformeAt
                          ? new Date(receipt.recepcionConformeAt).toLocaleString('es-CL')
                          : 'registrada'}
                      </p>
                    ) : (
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span>¿Recibiste conforme el pago de este reembolso?</span>
                        <button
                          type="button"
                          disabled={confirmando}
                          onClick={() => onConfirmarRecepcion(receipt)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#166534] hover:bg-emerald-800 transition cursor-pointer disabled:opacity-50"
                        >
                          {confirmando ? 'Confirmando...' : '✓ Confirmar Recepción Conforme'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                  {receipt.origen === 'reembolso' && receipt.reembolsoRaw && (receipt.estado === 'Pagado' || receipt.estado === 'Aprobado') ? (
                    <button
                      type="button"
                      onClick={() =>
                        imprimirColillaReembolso({
                          codigo: receipt.reembolsoRaw!.codigo,
                          socioNombre: receipt.reembolsoRaw!.socio_nombre || 'Socio',
                          socioRut: receipt.reembolsoRaw!.socio_rut || '',
                          beneficiarioNombre: receipt.reembolsoRaw!.beneficiario_nombre,
                          beneficiarioParentesco: receipt.reembolsoRaw!.beneficiario_parentesco,
                          prestacionLabel: receipt.reembolsoRaw!.tipo_prestacion_label,
                          montoReembolso: receipt.reembolsoRaw!.monto_reembolso,
                          metodoPago: receipt.reembolsoRaw!.metodo_pago,
                          numeroDocumento: receipt.reembolsoRaw!.numero_cheque_o_transferencia,
                          bancoEmisor: receipt.reembolsoRaw!.banco_emisor,
                          fechaPago: receipt.reembolsoRaw!.fecha_pago,
                          horaProceso: receipt.reembolsoRaw!.hora_proceso,
                          recepcionConforme: receipt.recepcionConforme,
                          recepcionConformeAt: receipt.recepcionConformeAt,
                        })
                      }
                      className="px-3.5 py-2 text-xs font-bold text-[#006799] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition cursor-pointer"
                    >
                      🖨️ Imprimir Colilla
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
          </div>
        </div>
        );

export const MovementsTable: React.FC = () => {
  const {token} = useAuth();
        const [movimientos, setMovimientos] = useState<MovimientoReal[]>([]);
        const [cargando, setCargando] = useState(true);
        const [filterStatus, setFilterStatus] = useState<string>('Todos');
          const [searchTerm, setSearchTerm] = useState<string>('');
            const [selectedReceipt, setSelectedReceipt] = useState<MovimientoReal | null>(null);
            const [confirmandoId, setConfirmandoId] = useState<number | null>(null);
            const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const cargarMovimientosReales = useCallback(async () => {
    if (!token) return;
                setCargando(true);
                try {
      const headers = {Authorization: `Bearer ${token}` };
                const [reembRes, benefRes] = await Promise.allSettled([
                fetchFromApi<ReembolsoHistorialResponse>('/reembolsos/mis-solicitudes', {headers}),
                  fetchFromApi<SolicitudBeneficio[]>('/beneficios/mis-solicitudes', {headers}),
                  ]);

                    const lista: MovimientoReal[] = [];

              if (reembRes.status === 'fulfilled' && Array.isArray(reembRes.value?.solicitudes)) {
        for (const r of reembRes.value.solicitudes) {
                lista.push({
                  id: r.codigo,
                  fecha: r.fecha_pago || r.fecha_atencion || r.created_at,
                  concepto: `Reembolso ${r.tipo_prestacion_label} (${r.beneficiario_nombre})`,
                  modulo: 'Reembolsos Médicos',
                  monto: r.monto_reembolso || r.monto_copago,
                  estado: mapEstadoReembolso(r.estado),
                  comprobanteUrl: r.comprobante_url || undefined,
                  detalle:
                    r.estado === 'rechazado' && r.motivo_rechazo
                      ? `Rechazado: ${r.motivo_rechazo}`
                      : r.descripcion || `Beneficiario: ${r.beneficiario_nombre} (${r.beneficiario_parentesco})`,
                  origen: 'reembolso',
                  reembolsoId: r.id,
                  reembolsoRaw: r,
                  metodoPago: r.metodo_pago,
                  numeroDocumento: r.numero_cheque_o_transferencia,
                  bancoEmisor: r.banco_emisor,
                  fechaPago: r.fecha_pago,
                  horaProceso: r.hora_proceso,
                  recepcionConforme: Boolean(r.recepcion_conforme),
                  recepcionConformeAt: r.recepcion_conforme_at,
                });
        }
      }

                  if (benefRes.status === 'fulfilled' && Array.isArray(benefRes.value)) {
        for (const b of benefRes.value) {
                    lista.push({
                      id: `BON-${String(b.id).padStart(4, '0')}`,
                      fecha: b.fecha_liquidacion || b.created_at,
                      concepto: b.titulo_bono,
                      modulo: 'Beneficios Sociales',
                      monto: b.monto_calculado,
                      estado: mapEstadoBeneficio(b.estado),
                      comprobanteUrl: b.documento_url || undefined,
                      detalle:
                        b.motivo_rechazo
                          ? `Rechazado: ${b.motivo_rechazo}`
                          : b.motivo || b.observaciones_admin || `Respaldo: ${b.documento_tipo}`,
                      origen: 'beneficio',
                      metodoPago: b.metodo_pago,
                      numeroDocumento: b.numero_cheque,
                      bancoEmisor: b.banco_emisor,
                      fechaPago: b.fecha_liquidacion ? b.fecha_liquidacion.slice(0, 10) : undefined,
                    });
        }
      }

      lista.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
                  setMovimientos(lista);
    } catch {
                    setMovimientos([]);
    } finally {
                    setCargando(false);
    }
  }, [token]);

  useEffect(() => {
                    cargarMovimientosReales();
  }, [cargarMovimientosReales]);

  const handleConfirmarRecepcion = async (mov: MovimientoReal) => {
    if (!token || !mov.reembolsoId) return;
                  setConfirmandoId(mov.reembolsoId);
                  try {
      const updated = await fetchFromApi<SolicitudReembolso>(
                    `/reembolsos/solicitud/${mov.reembolsoId}/recepcion-conforme`,
                    {
                      method: 'PATCH',
                    headers: {Authorization: `Bearer ${token}` },
        }
                    );
                    setFeedbackMsg(`✓ Recepción Conforme confirmada para ${updated.codigo}.`);
      setTimeout(() => setFeedbackMsg(null), 5000);
                    await cargarMovimientosReales();
      setSelectedReceipt((prev) =>
                    prev && prev.reembolsoId === updated.id
                    ? {
                      ...prev,
                      recepcionConforme: true,
                    recepcionConformeAt: updated.recepcion_conforme_at,
                    reembolsoRaw: updated,
            }
                    : prev
                    );
    } catch (err: unknown) {
                      alert(getErrorMessage(err));
    } finally {
                      setConfirmandoId(null);
    }
  };

  const filteredMovements = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return movimientos.filter((m) => {
      if (filterStatus !== 'Todos' && m.estado !== filterStatus) return false;
                    if (q) {
        return (
                    m.concepto.toLowerCase().includes(q) ||
                    m.id.toLowerCase().includes(q) ||
                    m.modulo.toLowerCase().includes(q)
                    );
      }
                    return true;
    });
  }, [movimientos, filterStatus, searchTerm]);

                    return (
                      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                                Cartola Consolidada de Movimientos (Hoja Socio)
                              </h2>
                              <p className="text-xs text-slate-500">
                                Historial real sincronizado de reembolsos médicos, bonos liquidados y confirmación de recepción conforme.
                              </p>
                            </div>
                            <span className="text-xs font-semibold text-[#006799] bg-sky-50 border border-sky-200/80 px-2.5 py-1 rounded-full self-start sm:self-auto tabular-nums">
                              {movimientos.length} {movimientos.length === 1 ? 'movimiento' : 'movimientos'}
                            </span>
                          </div>

                            {feedbackMsg && (
                              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#166534]">
                                {feedbackMsg}
                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {FILTER_TABS.map((tab) => (
                                  <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setFilterStatus(tab)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${filterStatus === tab
                                        ? 'bg-[#0c2b45] text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                                      }`}
                                  >
                                    {tab}
                                  </button>
                                ))}
                              </div>
                              <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar folio o concepto..."
                                className="px-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/30 sm:w-56"
                              />
                            </div>
                          </div>

                                    {cargando ? (
                                      <div className="p-8 text-center text-xs text-slate-400">
                                        Cargando cartola real de movimientos...
                                      </div>
                                    ) : filteredMovements.length === 0 ? (
                                      <div className="p-8 text-center text-xs text-slate-500">
                                        No existen movimientos registrados para los filtros seleccionados.
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                          <thead>
                                            <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-semibold">
                                              <th className="py-3 px-4">Folio / Fecha</th>
                                              <th className="py-3 px-4">Concepto y Módulo</th>
                                              <th className="py-3 px-4 text-right">Monto</th>
                                              <th className="py-3 px-4">Estado / Pago</th>
                                              <th className="py-3 px-4 text-right">Recepción Conforme</th>
                                            </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                  {filteredMovements.map((m) => (
                                                    <tr
                                                      key={`${m.origen}-${m.id}`}
                                                      onClick={() => setSelectedReceipt(m)}
                                                      className="hover:bg-sky-50/40 transition cursor-pointer"
                                                    >
                                                      <td className="py-3 px-4 whitespace-nowrap">
                                                        <span className="font-mono font-semibold text-[#006799] block">{m.id}</span>
                                                        <span className="text-[11px] text-slate-400 tabular-nums">{formatDate(m.fecha)}</span>
                                                      </td>
                                                      <td className="py-3 px-4">
                                                        <div className="font-semibold text-slate-900">{m.concepto}</div>
                                                        <div className="text-[11px] text-slate-500">{m.modulo}</div>
                                                      </td>
                                                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                                                        {formatCurrency(m.monto)}
                                                      </td>
                                                      <td className="py-3 px-4 whitespace-nowrap">
                                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBadgeStyle(m.estado)}`}>
                                                          {m.estado}
                                                        </span>
                                                        {m.numeroDocumento && (
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {m.metodoPago || 'Cheque'} N° {m.numeroDocumento}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {m.origen === 'reembolso' && (m.estado === 'Pagado' || m.estado === 'Aprobado') ? (
                      m.recepcionConforme ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#166534] border border-emerald-200">
                          ✓ Conforme
                        </span>
                                                        ): (
                                                            <button
                          type = "button"
                          disabled = {confirmandoId === m.reembolsoId}
                                                        onClick={() => handleConfirmarRecepcion(m)}
                                                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#006799] bg-sky-50 hover:bg-sky-100 border border-sky-200 transition cursor-pointer disabled:opacity-50"
                        >
                                                        {confirmandoId === m.reembolsoId ? '...' : 'Confirmar Conforme'}
                                                      </button>
                                          )
                                          ) : (
                                          <button
                                            type="button"
                                            onClick={() => setSelectedReceipt(m)}
                                            className="text-[11px] font-semibold text-slate-500 hover:text-[#006799] cursor-pointer"
                                          >
                                            Ver detalle →
                                          </button>
                    )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
          </table>
                          </div>
      )}

                          {selectedReceipt && (
                            <ReceiptPreviewModal
                              receipt={selectedReceipt}
                              onClose={() => setSelectedReceipt(null)}
                              onConfirmarRecepcion={handleConfirmarRecepcion}
                              confirmando={confirmandoId === selectedReceipt.reembolsoId}
                            />
                          )}
                        </div>
                        );
};
