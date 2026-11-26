'use client';

import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, UserPlus, AlertTriangle } from 'lucide-react';
import { fetchFromApi } from '@/lib/api';
import { formatRun, isValidRun, getErrorMessage } from '@/lib/utils';

interface CrearSocioDirectoResponse {
  id: number;
  rut: string;
  nombreCompleto: string;
  email: string;
  departamento: string;
  calidadContractual: string;
  grado: string;
  mesesAntiguedad: number;
  claveTemporal: string;
  correoEnviado: boolean;
  mensaje: string;
}

interface ModalCrearSocioDirectoProps {
  isOpen: boolean;
  token: string | null;
  onClose: () => void;
  onSuccess: (mensaje: string) => void;
}

const DEPARTAMENTOS_COMUNES = [
  'Administración Municipal',
  'Secretaría Municipal',
  'DIDECO',
  'Dirección de Obras',
  'Finanzas Municipales',
  'SECPLA',
  'Dirección de Tránsito',
  'Salud Municipal',
  'Educación Municipal',
  'Juzgado de Policía Local',
];

export const ModalCrearSocioDirecto: React.FC<ModalCrearSocioDirectoProps> = ({
  isOpen,
  token,
  onClose,
  onSuccess,
}) => {
  const [rut, setRut] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [departamento, setDepartamento] = useState('Administración Municipal');
  const [calidadContractual, setCalidadContractual] = useState<'Planta' | 'Contrata'>('Planta');
  const [grado, setGrado] = useState('14');
  const [mesesAntiguedad, setMesesAntiguedad] = useState<number>(0);
  const [enviarCorreo, setEnviarCorreo] = useState<boolean>(true);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [creado, setCreado] = useState<CrearSocioDirectoResponse | null>(null);
  const [copiado, setCopiado] = useState(false);

  if (!isOpen) return null;

  const rutLimpio = rut.replace(/[^0-9kK]/g, '');
  const runValido = rutLimpio.length >= 8 && isValidRun(rut);
  const runInvalido = rutLimpio.length >= 8 && !isValidRun(rut);

  const resetForm = () => {
    setRut('');
    setNombreCompleto('');
    setEmail('');
    setDepartamento('Administración Municipal');
    setCalidadContractual('Planta');
    setGrado('14');
    setMesesAntiguedad(0);
    setEnviarCorreo(true);
    setErrorMsg(null);
    setCreado(null);
    setCopiado(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCopiarClave = async (clave: string) => {
    try {
      await navigator.clipboard.writeText(clave);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Ignorar si navegador restringe portapapeles
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!runValido) {
      setErrorMsg('Debe ingresar un RUN chileno válido (verificación Módulo 11).');
      return;
    }
    if (nombreCompleto.trim().length < 3) {
      setErrorMsg('Ingrese el nombre completo del funcionario.');
      return;
    }
    if (!email.trim().includes('@')) {
      setErrorMsg('Ingrese un correo electrónico válido.');
      return;
    }

    setEnviando(true);
    try {
      const res = await fetchFromApi<CrearSocioDirectoResponse>('/afiliacion/crear-socio-directo', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rut: formatRun(rut),
          nombreCompleto: nombreCompleto.trim(),
          email: email.trim().toLowerCase(),
          departamento: departamento.trim() || 'Departamento Municipal',
          calidadContractual,
          grado: grado.trim() || '14',
          mesesAntiguedad: Number(mesesAntiguedad) || 0,
          enviarCorreo,
        }),
      });
      setCreado(res);
      onSuccess(res.mensaje);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err) || 'No se pudo crear la cuenta del socio.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden animate-scale-in max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28] shrink-0" />

        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0c2b45] to-[#006799] text-white flex items-center justify-center shadow-sm shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#006799] block">
                Afiliación • Alta Individual de Funcionario
              </span>
              <h2 className="text-base font-extrabold text-slate-900 truncate">
                Crear Cuenta de Socio
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {creado ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#166534] shrink-0 mt-0.5" />
                <div className="text-xs text-[#166534] space-y-1">
                  <p className="font-extrabold text-sm">¡Cuenta de socio creada con éxito!</p>
                  <p>{creado.mensaje}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Socio:</span>
                  <span className="font-bold text-slate-900">{creado.nombreCompleto}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">RUN:</span>
                  <span className="font-mono font-bold text-slate-900">{creado.rut}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Correo acceso:</span>
                  <span className="font-semibold text-slate-800">{creado.email}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-600 font-semibold">Clave temporal generada:</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 font-mono font-extrabold text-[#0c2b45]">
                      {creado.claveTemporal}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopiarClave(creado.claveTemporal)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#006799] bg-sky-50 hover:bg-sky-100 border border-sky-200 cursor-pointer"
                    >
                      {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiado ? 'Copiada' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  {creado.correoEnviado
                    ? '✓ Se despachó un correo automático con estas credenciales al funcionario.'
                    : 'Nota: El servidor SMTP no confirmó envío directo; puede entregar esta clave temporal presencialmente al socio.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-bold text-[#006799] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl cursor-pointer"
                >
                  + Crear otro socio
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 rounded-xl cursor-pointer"
                >
                  Finalizar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    RUN del Funcionario *
                  </label>
                  <input
                    type="text"
                    required
                    value={rut}
                    onChange={(e) => setRut(e.target.value)}
                    onBlur={() => {
                      if (rut.trim()) setRut(formatRun(rut));
                    }}
                    placeholder="Ej: 18.456.789-2"
                    className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 ${
                      runInvalido
                        ? 'border-rose-400 focus:ring-rose-200'
                        : runValido
                        ? 'border-emerald-400 focus:ring-emerald-200'
                        : 'border-slate-200 focus:ring-[#006799]/25'
                    }`}
                  />
                  {runInvalido && (
                    <span className="text-[11px] text-rose-600 font-semibold mt-0.5 block">
                      RUN inválido (dígito verificador no coincide).
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="funcionario@mperalillo.cl"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="Ej: María José Contreras Rojas"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Unidad / Departamento *
                  </label>
                  <input
                    type="text"
                    required
                    list="departamentos-peralillo"
                    value={departamento}
                    onChange={(e) => setDepartamento(e.target.value)}
                    placeholder="Ej: DIDECO"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
                  />
                  <datalist id="departamentos-peralillo">
                    {DEPARTAMENTOS_COMUNES.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Calidad *</label>
                    <select
                      value={calidadContractual}
                      onChange={(e) => setCalidadContractual(e.target.value as 'Planta' | 'Contrata')}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
                    >
                      <option value="Planta">Planta</option>
                      <option value="Contrata">Contrata</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Grado *</label>
                    <input
                      type="text"
                      required
                      value={grado}
                      onChange={(e) => setGrado(e.target.value)}
                      placeholder="14"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Meses de Antigüedad Inicial
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={600}
                    value={mesesAntiguedad}
                    onChange={(e) => setMesesAntiguedad(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
                  />
                </div>

                <div
                  className={`p-3 rounded-xl border text-[11px] leading-snug ${
                    mesesAntiguedad >= 6
                      ? 'bg-emerald-50/70 border-emerald-200 text-[#166534]'
                      : 'bg-amber-50/70 border-amber-200 text-[#b45309]'
                  }`}
                >
                  {mesesAntiguedad >= 6
                    ? '✓ Socio quedará habilitado inmediatamente para reembolsos y beneficios (≥ 6 meses).'
                    : 'Regla Art. 14: Con menos de 6 meses iniciará en período de carencia estatutaria.'}
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enviarCorreo}
                  onChange={(e) => setEnviarCorreo(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#006799]"
                />
                <span className="text-slate-700 font-medium">
                  Enviar automáticamente las credenciales temporales al correo del funcionario.
                </span>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando || !runValido}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{enviando ? 'Creando cuenta...' : 'Crear Cuenta de Socio'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
