'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchFromApi } from '@/lib/api';
import { formatRun, isValidRun } from '@/lib/utils';

/** HU-01: Solicitud de incorporación al Comité y registro de cargas familiares. */

interface PeriodoInfo {
  inicio: string;
  fin: string;
  descripcion: string;
  enPeriodo: boolean;
  validacionActiva: boolean;
  abierto: boolean;
  porcentajeDescuento: number;
  mesesCarencia: number;
  textoCarencia: string;
}

interface CargaForm {
  key: number;
  nombreCompleto: string;
  run: string;
  parentesco: string;
}

interface Comprobante {
  folio: string;
  estado: string;
  fechaIngreso: string;
  nombreCompleto: string;
  run: string;
  grado: string;
  calidadContractual: string;
  email: string | null;
  porcentajeDescuento: number;
  cargas: { nombreCompleto: string; run: string; parentesco: string | null }[];
  mesesCarencia: number;
  textoCarencia: string;
  mensaje: string;
}

const PARENTESCOS = ['Cónyuge', 'Conviviente civil', 'Hijo(a)', 'Padre / Madre', 'Otro'];
const inputCls =
  'w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition';
const labelCls = 'block text-xs font-semibold text-slate-700 mb-1';

function parseApiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const jsonStart = msg.indexOf('{');
  if (jsonStart >= 0) {
    try {
      const body = JSON.parse(msg.slice(jsonStart));
      if (typeof body.detail === 'string') return body.detail;
      if (Array.isArray(body.detail)) {
        return body.detail.map((d: { msg: string }) => d.msg.replace(/^Value error, /, '')).join(' · ');
      }
    } catch {
      /* ignorar */
    }
  }
  return 'No se pudo enviar la solicitud. Verifique su conexión e intente nuevamente.';
}

export default function SolicitudAfiliacionPage() {
  const [periodo, setPeriodo] = useState<PeriodoInfo | null>(null);
  const [nombre, setNombre] = useState('');
  const [run, setRun] = useState('');
  const [grado, setGrado] = useState('');
  const [calidad, setCalidad] = useState<'' | 'Planta' | 'Contrata'>('');
  const [email, setEmail] = useState('');
  const [cargas, setCargas] = useState<CargaForm[]>([]);
  const [autorizaDescuento, setAutorizaDescuento] = useState(false);
  const [aceptaCarencia, setAceptaCarencia] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [comprobante, setComprobante] = useState<Comprobante | null>(null);

  useEffect(() => {
    fetchFromApi<PeriodoInfo>('/afiliacion/periodo')
      .then(setPeriodo)
      .catch(() => setApiError('No se pudo obtener el período de postulación desde el servidor.'));
  }, []);

  const pct = periodo?.porcentajeDescuento ?? 4;

  const addCarga = () =>
    setCargas((c) => [...c, { key: Date.now(), nombreCompleto: '', run: '', parentesco: '' }]);
  const updateCarga = (key: number, field: keyof CargaForm, value: string) =>
    setCargas((c) => c.map((x) => (x.key === key ? { ...x, [field]: value } : x)));
  const removeCarga = (key: number) => setCargas((c) => c.filter((x) => x.key !== key));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (nombre.trim().length < 3) e.nombre = 'Ingrese su nombre completo.';
    if (!isValidRun(run)) e.run = 'RUN inválido.';
    if (!grado.trim()) e.grado = 'Ingrese su grado.';
    if (!calidad) e.calidad = 'Seleccione su calidad contractual.';
    cargas.forEach((c, i) => {
      if (c.nombreCompleto.trim().length < 3) e[`carga-${i}-nombre`] = 'Nombre requerido.';
      if (!isValidRun(c.run)) e[`carga-${i}-run`] = 'RUN inválido.';
    });
    if (!autorizaDescuento) e.autoriza = `Debe autorizar el descuento por planilla del ${pct}% para continuar.`;
    if (!aceptaCarencia) e.carencia = 'Debe declarar que leyó la cláusula de carencia.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setApiError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetchFromApi<Comprobante>('/afiliacion/solicitudes', {
        method: 'POST',
        body: JSON.stringify({
          nombreCompleto: nombre,
          run,
          grado,
          calidadContractual: calidad,
          email: email || null,
          cargas: cargas.map(({ nombreCompleto, run, parentesco }) => ({
            nombreCompleto,
            run,
            parentesco: parentesco || null,
          })),
          autorizaDescuento,
          aceptaCarencia,
        }),
      });
      setComprobante(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setApiError(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a233a] via-[#0e314f] to-[#1a3818] py-8 px-4 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center space-y-3 print:hidden">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-xl border border-white/20">
            <img
              src="/logo-peralillo.png"
              alt="Ilustre Municipalidad de Peralillo"
              className="h-14 sm:h-16 w-auto object-contain mx-auto"
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Solicitud de Incorporación al Comité de Bienestar
            </h1>
            <p className="text-sm text-sky-200">
              Ilustre Municipalidad de Peralillo • Funcionarios de Planta o Contrata
            </p>
            <p className="text-xs text-[#ea580c] font-medium italic mt-0.5">
              "La comuna que soñamos"
            </p>
          </div>
        </header>

        {comprobante ? (
          <ComprobanteView c={comprobante} />
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8"
          >
            {/* Período de postulación */}
            {periodo && (
              <div
                id="periodo-postulacion"
                className={`rounded-xl px-4 py-3 text-xs border ${
                  periodo.enPeriodo
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <p className="font-bold">
                  Período de postulación: {periodo.descripcion}
                  {periodo.enPeriodo ? ' — Abierto' : ' — Cerrado'}
                </p>
                {!periodo.enPeriodo && !periodo.validacionActiva && (
                  <p className="mt-1">Modo desarrollo: la validación del período está desactivada.</p>
                )}
              </div>
            )}

            {/* 1. Antecedentes laborales */}
            <section className="space-y-4">
              <h2 className="text-base font-bold text-slate-800">1. Antecedentes del funcionario</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="af-nombre" className={labelCls}>Nombre completo *</label>
                  <input id="af-nombre" className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombres y apellidos" />
                  <FieldError msg={errors.nombre} />
                </div>
                <div>
                  <label htmlFor="af-run" className={labelCls}>RUN *</label>
                  <input id="af-run" className={inputCls} value={run} onChange={(e) => setRun(e.target.value)} onBlur={() => isValidRun(run) && setRun(formatRun(run))} placeholder="12.345.678-9" />
                  <FieldError msg={errors.run} />
                </div>
                <div>
                  <label htmlFor="af-grado" className={labelCls}>Grado *</label>
                  <input id="af-grado" className={inputCls} value={grado} onChange={(e) => setGrado(e.target.value)} placeholder="Ej: 12" />
                  <FieldError msg={errors.grado} />
                </div>
                <div>
                  <span className={labelCls}>Calidad contractual *</span>
                  <div className="flex gap-2">
                    {(['Planta', 'Contrata'] as const).map((op) => (
                      <button
                        key={op}
                        id={`af-calidad-${op.toLowerCase()}`}
                        type="button"
                        onClick={() => setCalidad(op)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
                          calidad === op
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-600 border-slate-300 hover:border-emerald-500'
                        }`}
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                  <FieldError msg={errors.calidad} />
                </div>
                <div>
                  <label htmlFor="af-email" className={labelCls}>Correo electrónico (opcional)</label>
                  <input id="af-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@mperalillo.cl" />
                </div>
              </div>
            </section>

            {/* 2. Cargas familiares */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">2. Cargas familiares legales</h2>
                  <p className="text-xs text-slate-500">Individualice a sus cargas acreditadas (nombre y RUN).</p>
                </div>
                <button id="af-agregar-carga" type="button" onClick={addCarga} className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition">
                  + Agregar carga
                </button>
              </div>
              {cargas.length === 0 && (
                <p className="text-xs text-slate-400 italic">Sin cargas registradas.</p>
              )}
              {cargas.map((c, i) => (
                <div key={c.key} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="sm:col-span-5">
                    <label htmlFor={`carga-${i}-nombre`} className={labelCls}>Nombre completo *</label>
                    <input id={`carga-${i}-nombre`} className={inputCls} value={c.nombreCompleto} onChange={(e) => updateCarga(c.key, 'nombreCompleto', e.target.value)} />
                    <FieldError msg={errors[`carga-${i}-nombre`]} />
                  </div>
                  <div className="sm:col-span-3">
                    <label htmlFor={`carga-${i}-run`} className={labelCls}>RUN *</label>
                    <input id={`carga-${i}-run`} className={inputCls} value={c.run} onChange={(e) => updateCarga(c.key, 'run', e.target.value)} onBlur={() => isValidRun(c.run) && updateCarga(c.key, 'run', formatRun(c.run))} placeholder="12.345.678-9" />
                    <FieldError msg={errors[`carga-${i}-run`]} />
                  </div>
                  <div className="sm:col-span-3">
                    <label htmlFor={`carga-${i}-parentesco`} className={labelCls}>Parentesco</label>
                    <select id={`carga-${i}-parentesco`} className={inputCls} value={c.parentesco} onChange={(e) => updateCarga(c.key, 'parentesco', e.target.value)}>
                      <option value="">—</option>
                      {PARENTESCOS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-1 flex sm:items-end">
                    <button type="button" onClick={() => removeCarga(c.key)} aria-label="Eliminar carga" className="w-full py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </section>

            {/* 3. Cláusulas informativas */}
            <section className="space-y-4">
              <h2 className="text-base font-bold text-slate-800">3. Cláusulas informativas y autorización</h2>

              <div id="clausula-carencia" className="rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800 mb-1">
                  ⚠ Período de carencia — {periodo?.mesesCarencia ?? 6} meses
                </p>
                <p className="text-sm text-amber-900 leading-relaxed">
                  {periodo?.textoCarencia ??
                    'El derecho a impetrar y percibir beneficios rige exclusivamente tras cumplir 6 meses continuos como socio del Comité.'}
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input id="af-acepta-carencia" type="checkbox" checked={aceptaCarencia} onChange={(e) => setAceptaCarencia(e.target.checked)} className="mt-0.5 w-4 h-4 accent-emerald-600" />
                <span className="text-sm text-slate-700">He leído y comprendo la cláusula del período de carencia.</span>
              </label>
              <FieldError msg={errors.carencia} />

              <label className="flex items-start gap-3 cursor-pointer">
                <input id="af-autoriza-descuento" type="checkbox" checked={autorizaDescuento} onChange={(e) => setAutorizaDescuento(e.target.checked)} className="mt-0.5 w-4 h-4 accent-emerald-600" />
                <span className="text-sm text-slate-700">
                  <strong>Autorizo el descuento por planilla del {pct}% de mi sueldo base</strong> como cuota social
                  del Comité de Bienestar, a contar de la aprobación de mi afiliación.
                </span>
              </label>
              <FieldError msg={errors.autoriza} />
            </section>

            {apiError && (
              <div id="af-error" className="text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                {apiError}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
              <Link href="/login" className="py-3 px-5 text-center text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition">
                ← Volver
              </Link>
              <button
                id="af-enviar"
                type="submit"
                disabled={submitting || (periodo !== null && !periodo.abierto) || !autorizaDescuento}
                className="py-3 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Enviando…' : 'Confirmar y enviar solicitud'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-[11px] font-semibold text-rose-600">{msg}</p> : null;
}

function ComprobanteView({ c }: { c: Comprobante }) {
  const fecha = new Date(c.fechaIngreso).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' });
  return (
    <div id="comprobante-afiliacion" className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 print:shadow-none">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Comprobante digital de ingreso</p>
          <h2 className="text-xl font-extrabold text-slate-800">Folio {c.folio}</h2>
          <p className="text-xs text-slate-500">{fecha}</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
          {c.estado}
        </span>
      </div>

      <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
        ✔ {c.mensaje}
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Item k="Nombre" v={c.nombreCompleto} />
        <Item k="RUN" v={c.run} />
        <Item k="Grado" v={c.grado} />
        <Item k="Calidad contractual" v={c.calidadContractual} />
        {c.email && <Item k="Correo" v={c.email} />}
        <Item k="Descuento por planilla autorizado" v={`${c.porcentajeDescuento}% del sueldo base`} />
      </dl>

      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-2">Cargas familiares ({c.cargas.length})</h3>
        {c.cargas.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Sin cargas registradas.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 uppercase">
                <th className="py-2 px-3">Nombre</th><th className="py-2 px-3">RUN</th><th className="py-2 px-3">Parentesco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {c.cargas.map((x) => (
                <tr key={x.run}>
                  <td className="py-2 px-3 font-semibold text-slate-700">{x.nombreCompleto}</td>
                  <td className="py-2 px-3 font-mono text-slate-600">{x.run}</td>
                  <td className="py-2 px-3 text-slate-600">{x.parentesco ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <strong>Período de carencia:</strong> {c.textoCarencia}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end print:hidden">
        <Link href="/login" className="py-2.5 px-5 text-center text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition">
          Ir al inicio
        </Link>
        <button id="comprobante-imprimir" type="button" onClick={() => window.print()} className="py-2.5 px-5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition">
          Imprimir / Guardar PDF
        </button>
      </div>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{k}</dt>
      <dd className="font-semibold text-slate-800">{v}</dd>
    </div>
  );
}
