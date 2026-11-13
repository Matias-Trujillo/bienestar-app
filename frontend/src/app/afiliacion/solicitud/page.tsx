'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchFromApi } from '@/lib/api';
import { formatRun, isValidRun, validateRunLive } from '@/lib/utils';

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

export interface NotificacionEmail {
  tipo: 'recepcion_solicitud' | 'resolucion_solicitud';
  folio: string;
  estadoResolucion?: string;
  destinatario: string;
  remitente?: string;
  asunto: string;
  resumenEstado: string;
  motivo?: string;
  credencialesAcceso?: {
    portalUrl: string;
    usuarioRut: string;
    usuarioEmail: string;
    claveTemporal: string;
    requiereCambioObligatorio: boolean;
  } | null;
  pasosSeguir: string[];
  cuerpoTexto: string;
  enviadoSmtp: boolean;
  errorSmtp?: string | null;
  modoEnvio: string;
  fechaEmision: string;
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
  notificacionEmail?: NotificacionEmail | null;
}

const PARENTESCOS = ['Cónyuge', 'Conviviente civil', 'Hijo(a)', 'Padre / Madre', 'Otro'];
const baseInputCls =
  'w-full px-3 py-2 text-xs sm:text-sm border rounded-xl focus:outline-none focus:ring-2 transition';
const labelCls = 'flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1';

function getInputClass(hasValueOrTouched: boolean, errorMsg?: string | null, isValid?: boolean): string {
  if (!hasValueOrTouched) {
    return `${baseInputCls} bg-slate-50 border-slate-300 focus:bg-white focus:ring-[#006799]/25 focus:border-[#006799]`;
  }
  if (errorMsg) {
    return `${baseInputCls} bg-white border-rose-300 text-slate-900 focus:bg-white focus:ring-rose-500/20 focus:border-rose-400`;
  }
  if (isValid) {
    return `${baseInputCls} bg-white border-slate-300 text-slate-900 focus:bg-white focus:ring-[#006799]/25 focus:border-[#006799]`;
  }
  return `${baseInputCls} bg-slate-50 border-slate-300 focus:bg-white focus:ring-[#006799]/25 focus:border-[#006799]`;
}

function validateNombreLive(value: string): { isValid: boolean; error: string | null } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Ingrese el nombre completo.' };
  }
  if (/\d/.test(trimmed)) {
    return { isValid: false, error: 'El nombre no puede contener números.' };
  }
  const words = trimmed.split(/\s+/).filter((w) => w.length >= 2);
  if (trimmed.length < 5 || words.length < 2) {
    return { isValid: false, error: 'Ingrese al menos nombre y apellido (mínimo 2 palabras).' };
  }
  return { isValid: true, error: null };
}

function validateGradoLive(value: string): { isValid: boolean; error: string | null } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Ingrese su grado.' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { isValid: false, error: 'Solo números (1 al 25).' };
  }
  const num = Number(trimmed);
  if (num < 1 || num > 25) {
    return { isValid: false, error: 'Grado municipal válido: 1° al 25°.' };
  }
  return { isValid: true, error: null };
}

function validateEmailLive(value: string): { isValid: boolean; error: string | null } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Ingrese un correo para recibir confirmación y su clave temporal.' };
  }
  if (/\s/.test(trimmed) || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    return { isValid: false, error: 'Formato de correo inválido (ej: nombre@dominio.cl).' };
  }
  return { isValid: true, error: null };
}

function parseApiError(err: unknown): string {
  if (!err) return 'No se pudo enviar la solicitud. Intente nuevamente.';
  const msg = err instanceof Error ? err.message : String(err);
  if (!msg) return 'No se pudo enviar la solicitud. Intente nuevamente.';

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
  return msg;
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [comprobante, setComprobante] = useState<Comprobante | null>(null);

  const markTouched = (field: string) =>
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));

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

  // Validaciones dinámicas en tiempo real (en cada tecla)
  const nombreCheck = validateNombreLive(nombre);
  const runCheck = validateRunLive(run);
  const gradoCheck = validateGradoLive(grado);
  const emailCheck = validateEmailLive(email);
  const calidadCheck = {
    isValid: calidad === 'Planta' || calidad === 'Contrata',
    error: calidad ? null : 'Seleccione su calidad contractual.',
  };

  const cleanTitularRun = run.replace(/[^0-9kK]/g, '').toUpperCase();

  const cargasValidation = cargas.map((c, idx) => {
    const cNombre = validateNombreLive(c.nombreCompleto);
    const cRunBase = validateRunLive(c.run);
    const cleanCargaRun = c.run.replace(/[^0-9kK]/g, '').toUpperCase();

    let runError = cRunBase.error;
    let runValid = cRunBase.isValid;

    if (runValid && cleanTitularRun && cleanCargaRun === cleanTitularRun) {
      runValid = false;
      runError = 'El RUN de la carga no puede ser igual al RUN del titular.';
    } else if (
      runValid &&
      cargas.some(
        (other, otherIdx) =>
          otherIdx !== idx &&
          other.run.replace(/[^0-9kK]/g, '').toUpperCase() === cleanCargaRun
      )
    ) {
      runValid = false;
      runError = 'Este RUN está repetido en otra carga familiar.';
    }

    const parentescoValid = Boolean(c.parentesco);
    const parentescoError = parentescoValid ? null : 'Seleccione parentesco.';

    return {
      nombre: cNombre,
      run: { isValid: runValid, error: runError },
      parentesco: { isValid: parentescoValid, error: parentescoError },
    };
  });

  const isFormCompletelyValid =
    nombreCheck.isValid &&
    runCheck.isValid &&
    gradoCheck.isValid &&
    calidadCheck.isValid &&
    emailCheck.isValid &&
    cargasValidation.every((cv) => cv.nombre.isValid && cv.run.isValid && cv.parentesco.isValid) &&
    aceptaCarencia &&
    autorizaDescuento;

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setApiError(null);
    setSubmitAttempted(true);
    if (!isFormCompletelyValid) return;
    setSubmitting(true);
    try {
      const res = await fetchFromApi<Comprobante>('/afiliacion/solicitudes', {
        method: 'POST',
        body: JSON.stringify({
          nombreCompleto: nombre.trim(),
          run: formatRun(run),
          grado: grado.trim(),
          calidadContractual: calidad,
          email: email.trim() || null,
          cargas: cargas.map(({ nombreCompleto, run: cRun, parentesco }) => ({
            nombreCompleto: nombreCompleto.trim(),
            run: formatRun(cRun),
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

  const showNombreState = submitAttempted || Boolean(touched.nombre) || nombre.length > 0;
  const showRunState = submitAttempted || Boolean(touched.run) || run.length > 0;
  const showGradoState = submitAttempted || Boolean(touched.grado) || grado.length > 0;
  const showCalidadState = submitAttempted || Boolean(touched.calidad) || Boolean(calidad);
  const showEmailState = submitAttempted || Boolean(touched.email) || email.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#061523] via-[#0a2133] to-[#112416] flex items-center justify-center py-4 px-4 print:bg-white print:py-0">
      <div className="w-full max-w-4xl mx-auto">
        {comprobante ? (
          <ComprobanteView c={comprobante} />
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl ring-1 ring-[#cfa145]/30 overflow-hidden">
            {/* Filete institucional superior igual al Login */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />

            <form
              onSubmit={handleSubmit}
              noValidate
              className="p-5 sm:px-8 sm:py-6 space-y-4"
            >
              {/* Cabecera integrada dentro de la tarjeta para evitar desborde vertical */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="relative w-36 sm:w-40 aspect-[2.85/1] overflow-hidden flex-shrink-0">
                    <img
                      src="/logo-peralillo.png"
                      alt="Ilustre Municipalidad de Peralillo"
                      className="w-[124%] max-w-none h-auto absolute left-1/2 -translate-x-[48.5%] -top-[27%] select-none pointer-events-none"
                    />
                  </div>
                  <div className="border-l border-slate-200 pl-3.5">
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#006799] bg-[#006799]/5 px-2.5 py-0.5 rounded-full border border-[#006799]/20 inline-block mb-0.5">
                      Funcionarios de Planta o Contrata
                    </span>
                    <h1 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight leading-snug">
                      Solicitud de Incorporación al Comité de Bienestar
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <Link
                    href="/login"
                    className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition whitespace-nowrap"
                  >
                    ← Volver al Login
                  </Link>
                </div>
              </div>

              {/* Período de postulación compacto */}
              {periodo && (
                <div
                  id="periodo-postulacion"
                  className={`rounded-xl px-3.5 py-2 text-[11px] border flex flex-wrap items-center justify-between gap-2 ${
                    periodo.enPeriodo
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <span className="font-bold">
                    📅 Período de postulación: {periodo.descripcion}
                    {periodo.enPeriodo ? ' — Abierto' : ' — Cerrado'}
                  </span>
                  {!periodo.enPeriodo && !periodo.validacionActiva && (
                    <span className="text-[10px] font-medium bg-white/80 px-2 py-0.5 rounded-md border border-amber-200">
                      Modo desarrollo: recepción habilitada
                    </span>
                  )}
                </div>
              )}

              {/* 1. Antecedentes del funcionario en grilla de 12 columnas (2 filas limpias) */}
              <section className="space-y-2.5">
                <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                  1. Antecedentes del funcionario
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Nombre Completo */}
                  <div className="sm:col-span-6">
                    <label htmlFor="af-nombre" className={labelCls}>
                      <span>Nombre completo *</span>
                      {showNombreState && nombreCheck.isValid && (
                        <span className="text-[10px] font-medium text-slate-400">✓</span>
                      )}
                    </label>
                    <input
                      id="af-nombre"
                      className={getInputClass(showNombreState, nombreCheck.error, nombreCheck.isValid)}
                      value={nombre}
                      onChange={(e) => {
                        setNombre(e.target.value);
                        markTouched('nombre');
                      }}
                      onBlur={() => markTouched('nombre')}
                      placeholder="Ej: Juan Pérez Soto"
                    />
                    {showNombreState && <FieldError msg={nombreCheck.error ?? undefined} />}
                  </div>

                  {/* RUN Titular (formateo y validación Módulo 11 en tiempo real al escribir) */}
                  <div className="sm:col-span-4">
                    <label htmlFor="af-run" className={labelCls}>
                      <span>RUN *</span>
                      {showRunState && runCheck.isValid && (
                        <span className="text-[10px] font-medium text-slate-400">✓ RUN válido</span>
                      )}
                    </label>
                    <input
                      id="af-run"
                      className={getInputClass(showRunState, runCheck.error, runCheck.isValid)}
                      value={run}
                      onChange={(e) => {
                        setRun(formatRun(e.target.value));
                        markTouched('run');
                      }}
                      onBlur={() => markTouched('run')}
                      placeholder="12.345.678-9"
                      maxLength={12}
                    />
                    {showRunState && <FieldError msg={runCheck.error ?? undefined} />}
                  </div>

                  {/* Grado Municipal */}
                  <div className="sm:col-span-2">
                    <label htmlFor="af-grado" className={labelCls}>
                      <span>Grado *</span>
                      {showGradoState && gradoCheck.isValid && (
                        <span className="text-[10px] font-medium text-slate-400">✓ {grado}°</span>
                      )}
                    </label>
                    <input
                      id="af-grado"
                      inputMode="numeric"
                      className={getInputClass(showGradoState, gradoCheck.error, gradoCheck.isValid)}
                      value={grado}
                      onChange={(e) => {
                        const soloDigitos = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                        setGrado(soloDigitos);
                        markTouched('grado');
                      }}
                      onBlur={() => markTouched('grado')}
                      placeholder="Ej: 12"
                    />
                    {showGradoState && <FieldError msg={gradoCheck.error ?? undefined} />}
                  </div>

                  {/* Calidad Contractual */}
                  <div className="sm:col-span-5">
                    <span className={labelCls}>
                      <span>Calidad contractual *</span>
                      {calidadCheck.isValid && (
                        <span className="text-[10px] font-medium text-slate-400">✓ {calidad}</span>
                      )}
                    </span>
                    <div className="flex gap-2">
                      {(['Planta', 'Contrata'] as const).map((op) => (
                        <button
                          key={op}
                          id={`af-calidad-${op.toLowerCase()}`}
                          type="button"
                          onClick={() => {
                            setCalidad(op);
                            markTouched('calidad');
                          }}
                          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition cursor-pointer ${
                            calidad === op
                              ? 'bg-[#0f2942] text-white border-[#0f2942] shadow-sm'
                              : showCalidadState && !calidadCheck.isValid
                              ? 'bg-white text-rose-700 border-rose-300 hover:border-slate-400'
                              : 'bg-slate-50 text-slate-600 border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {op}
                        </button>
                      ))}
                    </div>
                    {showCalidadState && <FieldError msg={calidadCheck.error ?? undefined} />}
                  </div>

                  {/* Correo Electrónico */}
                  <div className="sm:col-span-7">
                    <label htmlFor="af-email" className={labelCls}>
                      <span>Correo electrónico (recibirá confirmación y clave temporal) *</span>
                      {showEmailState && emailCheck.isValid && (
                        <span className="text-[10px] font-medium text-slate-400">✓</span>
                      )}
                    </label>
                    <input
                      id="af-email"
                      type="email"
                      className={getInputClass(showEmailState, emailCheck.error, emailCheck.isValid)}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        markTouched('email');
                      }}
                      onBlur={() => markTouched('email')}
                      placeholder="usuario@mperalillo.cl o correo@gmail.com"
                    />
                    {showEmailState && <FieldError msg={emailCheck.error ?? undefined} />}
                  </div>
                </div>
              </section>

              {/* 2. Cargas familiares */}
              <section className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                      2. Cargas familiares legales
                    </h2>
                    <span className="text-[11px] text-slate-500">
                      Individualice a sus cargas acreditadas (nombre, RUN y parentesco).
                    </span>
                  </div>
                  <button
                    id="af-agregar-carga"
                    type="button"
                    onClick={addCarga}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition cursor-pointer"
                  >
                    + Agregar carga
                  </button>
                </div>
                {cargas.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">
                    Sin cargas registradas (opcional).
                  </p>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {cargas.map((c, i) => {
                      const cv = cargasValidation[i];
                      const showCNombre =
                        submitAttempted ||
                        Boolean(touched[`c-${c.key}-nombre`]) ||
                        c.nombreCompleto.length > 0;
                      const showCRun =
                        submitAttempted ||
                        Boolean(touched[`c-${c.key}-run`]) ||
                        c.run.length > 0;
                      const showCParentesco =
                        submitAttempted ||
                        Boolean(touched[`c-${c.key}-parentesco`]) ||
                        Boolean(c.parentesco);

                      return (
                        <div
                          key={c.key}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60"
                        >
                          <div className="sm:col-span-5">
                            <label htmlFor={`carga-${i}-nombre`} className={labelCls}>
                              <span>Nombre completo *</span>
                              {showCNombre && cv.nombre.isValid && (
                                <span className="text-[10px] font-medium text-slate-400">✓</span>
                              )}
                            </label>
                            <input
                              id={`carga-${i}-nombre`}
                              className={getInputClass(showCNombre, cv.nombre.error, cv.nombre.isValid)}
                              value={c.nombreCompleto}
                              onChange={(e) => {
                                updateCarga(c.key, 'nombreCompleto', e.target.value);
                                markTouched(`c-${c.key}-nombre`);
                              }}
                              onBlur={() => markTouched(`c-${c.key}-nombre`)}
                              placeholder="Nombre y apellido"
                            />
                            {showCNombre && <FieldError msg={cv.nombre.error ?? undefined} />}
                          </div>

                          <div className="sm:col-span-3">
                            <label htmlFor={`carga-${i}-run`} className={labelCls}>
                              <span>RUN *</span>
                              {showCRun && cv.run.isValid && (
                                <span className="text-[10px] font-medium text-slate-400">✓</span>
                              )}
                            </label>
                            <input
                              id={`carga-${i}-run`}
                              className={getInputClass(showCRun, cv.run.error, cv.run.isValid)}
                              value={c.run}
                              onChange={(e) => {
                                updateCarga(c.key, 'run', formatRun(e.target.value));
                                markTouched(`c-${c.key}-run`);
                              }}
                              onBlur={() => markTouched(`c-${c.key}-run`)}
                              placeholder="12.345.678-9"
                              maxLength={12}
                            />
                            {showCRun && <FieldError msg={cv.run.error ?? undefined} />}
                          </div>

                          <div className="sm:col-span-3">
                            <label htmlFor={`carga-${i}-parentesco`} className={labelCls}>
                              <span>Parentesco *</span>
                              {showCParentesco && cv.parentesco.isValid && (
                                <span className="text-[10px] font-medium text-slate-400">✓</span>
                              )}
                            </label>
                            <select
                              id={`carga-${i}-parentesco`}
                              className={getInputClass(
                                showCParentesco,
                                cv.parentesco.error,
                                cv.parentesco.isValid
                              )}
                              value={c.parentesco}
                              onChange={(e) => {
                                updateCarga(c.key, 'parentesco', e.target.value);
                                markTouched(`c-${c.key}-parentesco`);
                              }}
                              onBlur={() => markTouched(`c-${c.key}-parentesco`)}
                            >
                              <option value="">Seleccione…</option>
                              {PARENTESCOS.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                            {showCParentesco && <FieldError msg={cv.parentesco.error ?? undefined} />}
                          </div>

                          <div className="sm:col-span-1 flex sm:items-start sm:pt-5">
                            <button
                              type="button"
                              onClick={() => removeCarga(c.key)}
                              aria-label="Eliminar carga"
                              className="w-full py-2 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* 3. Cláusulas informativas */}
              <section className="space-y-2.5 pt-1 border-t border-slate-100">
                <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                  3. Cláusulas informativas y autorización
                </h2>

                <div
                  id="clausula-carencia"
                  className="rounded-xl border-l-4 border-amber-500 bg-amber-50/90 px-3.5 py-2.5"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800 mb-0.5">
                    ⚠ Período de carencia — {periodo?.mesesCarencia ?? 6} meses
                  </p>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    {periodo?.textoCarencia ??
                      'El derecho a impetrar y percibir beneficios rige exclusivamente tras cumplir 6 meses continuos como socio del Comité.'}
                  </p>
                </div>

                <div className="space-y-1.5 pt-0.5">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      id="af-acepta-carencia"
                      type="checkbox"
                      checked={aceptaCarencia}
                      onChange={(e) => {
                        setAceptaCarencia(e.target.checked);
                        markTouched('carencia');
                      }}
                      className="mt-0.5 w-4 h-4 accent-[#0f2942]"
                    />
                    <span className="text-xs text-slate-700">
                      He leído y comprendo la cláusula del período de carencia.
                    </span>
                  </label>
                  {(submitAttempted || touched.carencia) && !aceptaCarencia && (
                    <FieldError msg="Debe declarar que leyó la cláusula del período de carencia." />
                  )}

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      id="af-autoriza-descuento"
                      type="checkbox"
                      checked={autorizaDescuento}
                      onChange={(e) => {
                        setAutorizaDescuento(e.target.checked);
                        markTouched('autoriza');
                      }}
                      className="mt-0.5 w-4 h-4 accent-[#0f2942]"
                    />
                    <span className="text-xs text-slate-700">
                      <strong>Autorizo el descuento por planilla del {pct}% de mi sueldo base</strong> como cuota social
                      del Comité de Bienestar, a contar de la aprobación de mi afiliación.
                    </span>
                  </label>
                  {(submitAttempted || touched.autoriza) && !autorizaDescuento && (
                    <FieldError msg={`Debe autorizar el descuento por planilla del ${pct}% para continuar.`} />
                  )}
                </div>
              </section>

              {apiError && (
                <div
                  id="af-error"
                  className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5"
                >
                  {apiError}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-between items-center pt-2 border-t border-slate-100">
                <Link
                  href="/login"
                  className="py-2.5 px-5 text-center text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  ← Volver al inicio de sesión
                </Link>
                <button
                  id="af-enviar"
                  type="submit"
                  disabled={submitting || (periodo !== null && !periodo.abierto)}
                  onClick={() => setSubmitAttempted(true)}
                  className={`py-2.5 px-6 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition cursor-pointer ${
                    isFormCompletelyValid
                      ? 'bg-gradient-to-r from-[#006799] via-[#1c6e7d] to-[#5b7c29] hover:from-[#00547d] hover:to-[#486320]'
                      : 'bg-slate-400 hover:bg-slate-500'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {submitting ? 'Enviando…' : 'Confirmar y enviar solicitud'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-[11px] font-medium text-rose-600/90">{msg}</p> : null;
}

function ComprobanteView({ c }: { c: Comprobante }) {
  const fecha = new Date(c.fechaIngreso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
  const correoDestino = c.email || c.notificacionEmail?.destinatario || '—';

  return (
    <div
      id="comprobante-afiliacion"
      className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl ring-1 ring-[#cfa145]/30 overflow-hidden print:shadow-none print:ring-0"
    >
      {/* Filete institucional superior */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />

      <div className="p-5 sm:px-7 sm:py-6 space-y-4">
        {/* Cabecera sobria con logo municipal y número de folio */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative w-32 sm:w-36 aspect-[2.85/1] overflow-hidden flex-shrink-0">
              <img
                src="/logo-peralillo.png"
                alt="Ilustre Municipalidad de Peralillo"
                className="w-[124%] max-w-none h-auto absolute left-1/2 -translate-x-[48.5%] -top-[27%] select-none pointer-events-none"
              />
            </div>
            <div className="border-l border-slate-200 pl-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Comprobante Digital de Ingreso
              </p>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-800 leading-tight">
                Solicitud N° {c.folio}
              </h2>
              <p className="text-[11px] text-slate-400">{fecha}</p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
            {c.estado}
          </span>
        </div>

        {/* Confirmación sobria de registro y envío de notificación */}
        <div className="rounded-xl bg-slate-50 border border-slate-200/90 px-4 py-3 flex items-start gap-3">
          <span className="mt-0.5 w-5 h-5 rounded-full bg-[#0f2942] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
            ✓
          </span>
          <div className="text-xs text-slate-700 leading-relaxed space-y-0.5">
            <p className="font-semibold text-slate-800">
              Su solicitud ha sido registrada exitosamente y se encuentra en evaluación por el Directorio.
            </p>
            <p className="text-slate-500">
              Se ha enviado una copia oficial de este comprobante a <strong className="text-slate-700">{correoDestino}</strong>.
            </p>
          </div>
        </div>

        {/* Resumen compacto en grilla de 3 columnas */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-xs">
            <Item k="Funcionario(a)" v={c.nombreCompleto} />
            <Item k="RUN" v={c.run} />
            <Item k="Calidad y Grado" v={`${c.calidadContractual} · Grado ${c.grado}°`} />
            <Item k="Correo de notificación" v={correoDestino} />
            <Item k="Cuota social autorizada" v={`${c.porcentajeDescuento}% sueldo base`} />
            <Item k="Período de carencia" v={`${c.mesesCarencia} meses continuos`} />
          </dl>
        </div>

        {/* Cargas familiares (compacto) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700">
              Cargas familiares declaradas ({c.cargas.length})
            </h3>
          </div>
          {c.cargas.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">Sin cargas familiares registradas en esta solicitud.</p>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-1.5 px-3">Nombre</th>
                    <th className="py-1.5 px-3">RUN</th>
                    <th className="py-1.5 px-3">Parentesco</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {c.cargas.map((x) => (
                    <tr key={x.run}>
                      <td className="py-1.5 px-3 font-medium text-slate-800">{x.nombreCompleto}</td>
                      <td className="py-1.5 px-3 font-mono text-slate-600">{x.run}</td>
                      <td className="py-1.5 px-3 text-slate-600">{x.parentesco ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Próximos pasos sobrios */}
        <div className="rounded-xl bg-slate-50/70 border border-slate-200/80 px-4 py-3 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Próximas etapas del proceso
          </p>
          <ol className="list-decimal pl-4 space-y-1 text-[11.5px] text-slate-600 leading-snug">
            <li>El Directorio del Comité de Bienestar evaluará sus antecedentes en sesión ordinaria.</li>
            <li>
              Recibirá en <strong className="text-slate-700">{correoDestino}</strong> la notificación de aprobación o rechazo junto con el motivo.
            </li>
            <li>
              Al aprobarse su incorporación, dicho correo incluirá su <strong className="text-slate-700">contraseña temporal</strong> y las instrucciones para acceder al portal.
            </li>
          </ol>
        </div>

        {/* Acciones inferiores */}
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-between items-center pt-2 border-t border-slate-100 print:hidden">
          <Link
            href="/login"
            className="py-2 px-4 text-center text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            ← Volver al inicio de sesión
          </Link>
          <button
            id="comprobante-imprimir"
            type="button"
            onClick={() => window.print()}
            className="py-2 px-5 rounded-xl font-semibold text-xs text-white bg-[#0f2942] hover:bg-[#163a5c] transition cursor-pointer shadow-sm"
          >
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{k}</dt>
      <dd className="font-semibold text-slate-800 truncate">{v}</dd>
    </div>
  );
}
