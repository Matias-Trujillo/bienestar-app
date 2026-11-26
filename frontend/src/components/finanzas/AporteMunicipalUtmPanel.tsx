'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchFromApi } from '@/lib/api';

interface Padron31Dic {
  anio_fiscal: number;
  fecha_corte: string;
  socios_congelados_31_dic: number;
  factor_utm: number;
  total_utm_anual: number;
  valor_utm_referencia_clp: number;
  monto_estimado_clp: number;
}

interface AporteMunicipalUtm {
  id: number;
  codigo: string;
  anio_fiscal: number;
  mes_transferencia: string;
  socios_congelados_31_dic: number;
  factor_utm: number;
  valor_utm_clp: number;
  monto_total_clp: number;
  numero_decreto: string;
  fecha_transferencia: string;
  observaciones: string;
  registrado_por_nombre: string | null;
  created_at: string;
}

interface EstadoFinanciero {
  periodo_fiscal: string;
  socios_activos: number;
  socios_padron_31_dic: number;
  total_aportes_utm: number;
  cantidad_aportes_utm: number;
  fondo_general: number;
  fondo_salud_disponible: number;
}

interface Props {
  token: string | null;
  userRol?: string;
}

const ROLES_REGISTRO = new Set(['PRESIDENTE', 'SECRETARIO', 'TESORERO', 'ADMIN', 'SUPERUSUARIO']);
const ROLES_ANULACION = new Set(['PRESIDENTE', 'ADMIN', 'SUPERUSUARIO']);

function formatClp(monto: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(monto || 0);
}

export default function AporteMunicipalUtmPanel({ token, userRol }: Props) {
  const anioActual = new Date().getFullYear();
  const mesActual = `${anioActual}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const hoyIso = new Date().toISOString().slice(0, 10);

  const rolUpper = String(userRol || '').toUpperCase();
  const puedeRegistrar = ROLES_REGISTRO.has(rolUpper);
  const puedeAnular = ROLES_ANULACION.has(rolUpper);

  const [padron, setPadron] = useState<Padron31Dic | null>(null);
  const [aportes, setAportes] = useState<AporteMunicipalUtm[]>([]);
  const [estadoFinanciero, setEstadoFinanciero] = useState<EstadoFinanciero | null>(null);
  const [cargando, setCargando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Formulario modal
  const [anioFiscal, setAnioFiscal] = useState<number>(anioActual);
  const [mesTransferencia, setMesTransferencia] = useState<string>(mesActual);
  const [sociosCongelados, setSociosCongelados] = useState<string>('');
  const [valorUtmClp, setValorUtmClp] = useState<string>('68034');
  const [numeroDecreto, setNumeroDecreto] = useState<string>('');
  const [fechaTransferencia, setFechaTransferencia] = useState<string>(hoyIso);
  const [observaciones, setObservaciones] = useState<string>('');
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [mensajeOk, setMensajeOk] = useState<string | null>(null);
  const [anulandoId, setAnulandoId] = useState<number | null>(null);

  const cargarDatos = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [padronRes, aportesRes, estadoRes] = await Promise.all([
        fetchFromApi<Padron31Dic>(`/finanzas/aportes-utm/padron?anio=${anioActual}`, { headers }),
        fetchFromApi<AporteMunicipalUtm[]>('/finanzas/aportes-utm', { headers }),
        fetchFromApi<EstadoFinanciero>('/finanzas/', { headers }),
      ]);
      setPadron(padronRes);
      setAportes(Array.isArray(aportesRes) ? aportesRes : []);
      setEstadoFinanciero(estadoRes);
      setSociosCongelados(String(padronRes.socios_congelados_31_dic));
      setValorUtmClp(String(padronRes.valor_utm_referencia_clp || 68034));
    } catch {
      // Mantiene estado seguro sin romper la vista financiera
    } finally {
      setCargando(false);
    }
  }, [token, anioActual]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const calculoEnVivo = useMemo(() => {
    const sociosNum = Number.parseInt(sociosCongelados, 10) || 0;
    const utmNum = Number.parseInt(valorUtmClp, 10) || 0;
    const factor = padron?.factor_utm || 4;
    return {
      sociosNum,
      utmNum,
      factor,
      totalUtm: sociosNum * factor,
      totalClp: sociosNum * factor * utmNum,
    };
  }, [sociosCongelados, valorUtmClp, padron]);

  const abrirModal = () => {
    setErrorForm(null);
    setMensajeOk(null);
    setAnioFiscal(anioActual);
    setMesTransferencia(mesActual);
    setFechaTransferencia(hoyIso);
    if (padron) {
      setSociosCongelados(String(padron.socios_congelados_31_dic));
      setValorUtmClp(String(padron.valor_utm_referencia_clp || 68034));
    }
    setNumeroDecreto('');
    setObservaciones('');
    setModalAbierto(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setErrorForm(null);

    const utmNum = Number.parseInt(valorUtmClp, 10);
    const sociosNum = Number.parseInt(sociosCongelados, 10);
    if (Number.isNaN(utmNum) || utmNum < 30000 || utmNum > 500000) {
      setErrorForm('El valor oficial de la UTM debe estar entre $30.000 y $500.000 CLP.');
      return;
    }
    if (Number.isNaN(sociosNum) || sociosNum < 1) {
      setErrorForm('La cantidad de socios congelados al 31 de diciembre debe ser al menos 1.');
      return;
    }
    if (numeroDecreto.trim().length < 2) {
      setErrorForm('Debes ingresar el número de decreto alcaldicio o respaldo.');
      return;
    }

    setGuardando(true);
    try {
      const creado = await fetchFromApi<AporteMunicipalUtm>('/finanzas/aportes-utm', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          anio_fiscal: anioFiscal,
          mes_transferencia: mesTransferencia,
          valor_utm_clp: utmNum,
          numero_decreto: numeroDecreto.trim(),
          fecha_transferencia: fechaTransferencia,
          socios_congelados_override: sociosNum,
          observaciones: observaciones.trim(),
        }),
      });
      setModalAbierto(false);
      setMensajeOk(
        `Subvención ${creado.codigo} registrada por ${formatClp(creado.monto_total_clp)} (${creado.socios_congelados_31_dic} socios × 4 UTM).`
      );
      await cargarDatos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No fue posible registrar la subvención municipal.';
      setErrorForm(msg);
    } finally {
      setGuardando(false);
    }
  };

  const handleAnular = async (aporte: AporteMunicipalUtm) => {
    if (!token || !puedeAnular) return;
    const confirmado = window.confirm(
      `¿Confirmas anular el registro ${aporte.codigo} por ${formatClp(aporte.monto_total_clp)}? Esta acción quedará auditada.`
    );
    if (!confirmado) return;

    setAnulandoId(aporte.id);
    setMensajeOk(null);
    try {
      await fetchFromApi<{ ok: boolean }>(`/finanzas/aportes-utm/${aporte.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setMensajeOk(`Registro ${aporte.codigo} anulado correctamente.`);
      await cargarDatos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No fue posible anular el registro.';
      setErrorForm(msg);
    } finally {
      setAnulandoId(null);
    }
  };

  return (
    <section className="card-modern overflow-hidden min-w-0">
      <div className="p-5 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-[#006799] block">
            HU-08 • Ley N° 19.754 • Subvención Anual Municipal
          </span>
          <h2 className="text-base font-semibold text-slate-900 mt-0.5">
            Aporte Municipal en UTM (Padrón al 31 de Diciembre × 4 UTM)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cálculo oficial basado en el padrón congelado al {padron?.fecha_corte || `${anioActual - 1}-12-31`} con impacto directo en el presupuesto del Comité.
          </p>
        </div>

        {puedeRegistrar && (
          <button
            type="button"
            onClick={abrirModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0"
          >
            + Registrar Subvención Municipal (UTM)
          </button>
        )}
      </div>

      {mensajeOk && (
        <div className="mx-5 sm:mx-6 mt-4 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-[#166534]">
          {mensajeOk}
        </div>
      )}

      {/* Tarjetas resumen HU-08 */}
      <div className="p-5 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100">
        <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200/70">
          <span className="text-xs font-medium text-[#006799] block">
            Padrón Congelado ({padron?.fecha_corte || `${anioActual - 1}-12-31`})
          </span>
          <span className="text-xl font-bold text-[#0c2b45] tabular-nums mt-1 block">
            {padron ? `${padron.socios_congelados_31_dic} socios` : '—'}
          </span>
          <span className="text-[11px] text-slate-600 mt-0.5 block tabular-nums">
            Equivale a {padron ? padron.total_utm_anual : 0} UTM anuales (4 UTM/socio)
          </span>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
          <span className="text-xs font-medium text-[#166534] block">
            Subvenciones UTM Registradas ({estadoFinanciero?.periodo_fiscal || anioActual})
          </span>
          <span className="text-xl font-bold text-[#166534] tabular-nums mt-1 block">
            {formatClp(estadoFinanciero?.total_aportes_utm || 0)}
          </span>
          <span className="text-[11px] text-slate-600 mt-0.5 block tabular-nums">
            {estadoFinanciero?.cantidad_aportes_utm || 0} decreto(s) ingresados en el período
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80">
          <span className="text-xs font-medium text-slate-600 block">
            Fondo General Disponible (Presupuesto Real)
          </span>
          <span className="text-xl font-bold text-slate-900 tabular-nums mt-1 block">
            {formatClp(estadoFinanciero?.fondo_general || 0)}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Actualizado automáticamente con decretos UTM
          </span>
        </div>
      </div>

      {/* Historial de Subvenciones */}
      <div className="w-full min-w-0">
        {cargando && aportes.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Consultando historial de subvenciones municipales en UTM...
          </div>
        ) : aportes.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Aún no se han registrado decretos de Subvención Municipal (UTM). Usa el botón{' '}
            <span className="font-semibold text-slate-700">“Registrar Subvención Municipal (UTM)”</span> para ingresar el aporte del período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Folio y Período</th>
                  <th className="py-3 px-4">Decreto / Respaldo</th>
                  <th className="py-3 px-4">Fórmula Aplicada</th>
                  <th className="py-3 px-4 text-right">Monto Total CLP</th>
                  <th className="py-3 px-4">Registrado Por</th>
                  {puedeAnular && <th className="py-3 px-4 text-right">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aportes.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 align-middle tabular-nums">
                      <div className="font-semibold text-slate-900">{a.codigo}</div>
                      <div className="text-slate-500 mt-0.5">
                        Año {a.anio_fiscal} • Mes {a.mes_transferencia}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="font-medium text-slate-900">{a.numero_decreto}</div>
                      <div className="text-slate-500 tabular-nums mt-0.5">
                        Transferencia: {a.fecha_transferencia}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle tabular-nums">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-[#006799] border border-sky-200/80">
                        {a.socios_congelados_31_dic} socios × {a.factor_utm} UTM × {formatClp(a.valor_utm_clp)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right align-middle font-bold text-[#166534] tabular-nums">
                      {formatClp(a.monto_total_clp)}
                    </td>
                    <td className="py-3 px-4 align-middle text-slate-600">
                      {a.registrado_por_nombre || 'Directiva'}
                    </td>
                    {puedeAnular && (
                      <td className="py-3 px-4 text-right align-middle">
                        <button
                          type="button"
                          disabled={anulandoId === a.id}
                          onClick={() => handleAnular(a)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {anulandoId === a.id ? 'Anulando...' : 'Anular'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Registro de Subvención UTM */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-gradient-to-r from-[#0c2b45] to-[#006799] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Registrar Subvención Municipal (UTM)</h3>
                <p className="text-[11px] text-sky-100 mt-0.5">
                  Cálculo legal: Socios congelados al 31-dic × 4 UTM × Valor UTM oficial
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="text-white/80 hover:text-white text-lg font-bold leading-none cursor-pointer"
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleGuardar} className="p-6 space-y-4 text-xs">
              {errorForm && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {errorForm}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Año Fiscal</label>
                  <input
                    type="number"
                    min={2020}
                    max={2040}
                    required
                    value={anioFiscal}
                    onChange={(e) => setAnioFiscal(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mes de Transferencia</label>
                  <input
                    type="month"
                    required
                    value={mesTransferencia}
                    onChange={(e) => setMesTransferencia(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799] tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Padrón Congelado (31-dic)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50000}
                    required
                    value={sociosCongelados}
                    onChange={(e) => setSociosCongelados(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799] tabular-nums"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Detectado en sistema: {padron?.socios_congelados_31_dic ?? 0} socios
                  </span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Valor UTM Oficial (CLP)
                  </label>
                  <input
                    type="number"
                    min={30000}
                    max={500000}
                    required
                    value={valorUtmClp}
                    onChange={(e) => setValorUtmClp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799] tabular-nums"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Valor SII del mes de transferencia
                  </span>
                </div>
              </div>

              {/* Vista previa del cálculo automático */}
              <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-semibold text-[#166534] block">
                    Cálculo Automático Oficial (HU-08)
                  </span>
                  <span className="text-xs text-slate-700 tabular-nums">
                    {calculoEnVivo.sociosNum} socios × {calculoEnVivo.factor} UTM ({calculoEnVivo.totalUtm} UTM) ×{' '}
                    {formatClp(calculoEnVivo.utmNum)}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-extrabold text-[#166534] tabular-nums">
                    {formatClp(calculoEnVivo.totalClp)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">N° Decreto Alcaldicio</label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    placeholder="Ej: DEC-ALC-450/2026"
                    value={numeroDecreto}
                    onChange={(e) => setNumeroDecreto(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha de Transferencia</label>
                  <input
                    type="date"
                    required
                    value={fechaTransferencia}
                    onChange={(e) => setFechaTransferencia(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observaciones (opcional)</label>
                <textarea
                  rows={2}
                  maxLength={1000}
                  placeholder="Ej: Transferencia recibida en cuenta BancoEstado del Servicio de Bienestar..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {guardando ? 'Registrando...' : 'Confirmar y Sumar al Presupuesto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
