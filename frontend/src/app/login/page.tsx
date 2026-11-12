'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, LOGOUT_USER_KEY } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';
import { formatRun } from '@/lib/utils';

interface RecuperacionResult {
  ok: boolean;
  folio: string;
  nombreCompleto: string;
  rut: string;
  emailEnmascarado: string;
  emailDestino: string;
  enviadoSmtp: boolean;
  mensaje: string;
}

// [ESTUDIANTE INFORMÁTICA] Credenciales sembradas en desarrollo (init_db.py) para evaluación rápida por rol estatutario.
const TEST_ACCOUNTS = [
  { label: 'Superusuario', user: 'superadmin@mperalillo.cl', pass: 'Super#2026', roleTag: 'SUP' },
  { label: 'Presidente', user: 'msoto@mperalillo.cl', pass: 'Presi#2026', roleTag: 'PRE' },
  { label: 'Secretario', user: 'pfuentes@mperalillo.cl', pass: 'Secre#2026', roleTag: 'SEC' },
  { label: 'Tesorero', user: 'rmorales@mperalillo.cl', pass: 'Teso#2026', roleTag: 'TES' },
  { label: 'Directiva', user: 'jcontreras@mperalillo.cl', pass: 'Admin#2026', roleTag: 'DIR' },
  { label: 'Auditor', user: 'aibarra@mperalillo.cl', pass: 'Audit#2026', roleTag: 'AUD' },
  { label: 'Socio Activo', user: 'cvalenzuela@mperalillo.cl', pass: 'Socio#2026', roleTag: 'SOC' },
] as const;

interface RecoveryModalProps {
  recoveryInput: string;
  recoverySubmitting: boolean;
  recoveryError: string | null;
  recoverySuccess: RecuperacionResult | null;
  onChangeInput: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

// [ESTUDIANTE INFORMÁTICA] Modal estructurado para recuperación de contraseña temporal con folio de auditoría.
const PasswordRecoveryModal: React.FC<RecoveryModalProps> = ({
  recoveryInput,
  recoverySubmitting,
  recoveryError,
  recoverySuccess,
  onChangeInput,
  onSubmit,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 animate-fade-in">
    <div className="bg-white rounded-lg max-w-md w-full border border-slate-300 overflow-hidden animate-scale-in">
      <div className="h-1 w-full bg-[#006799]" />
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#006799] block">
              Seguridad Institucional • Bienestar
            </span>
            <h3 className="text-base font-bold text-[#0c2b45]">Recuperación de Contraseña</h3>
          </div>
          <button
            type="button"
            disabled={recoverySubmitting}
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {!recoverySuccess ? (
          <form onSubmit={onSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                RUN o Correo Electrónico Registrado *
              </label>
              <input
                type="text"
                autoFocus
                value={recoveryInput}
                onChange={(e) => onChangeInput(e.target.value)}
                placeholder="Ej: 12.345.678-9 o usuario@mperalillo.cl"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006799]"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Se despachará una <strong>Contraseña Temporal</strong> de un solo uso a su correo institucional.
              </p>
            </div>

            {recoveryError && (
              <div className="p-2.5 rounded-md bg-rose-50 border border-rose-300 text-xs font-bold text-rose-700">
                {recoveryError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={recoverySubmitting}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={recoverySubmitting}
                className="px-4 py-1.5 rounded-md text-xs font-bold text-white bg-[#006799] hover:bg-[#0c2b45] disabled:opacity-60"
              >
                {recoverySubmitting ? 'Enviando...' : 'Enviar Clave Temporal'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3.5">
            <div className="p-3 rounded-md bg-emerald-50 border border-emerald-300 border-l-4 border-l-[#166534] text-xs space-y-1">
              <p className="font-bold text-[#166534]">✓ Clave temporal despachada</p>
              <p className="text-slate-700">
                Enviada al correo <strong className="text-[#0c2b45]">{recoverySuccess.emailDestino}</strong>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-md p-3 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Funcionario</span>
                <span className="font-bold text-slate-900">{recoverySuccess.nombreCompleto}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">RUN / Folio</span>
                <span className="font-mono font-semibold text-slate-700 tabular-nums">
                  {recoverySuccess.rut} · {recoverySuccess.folio}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-md text-xs font-bold text-white bg-[#0c2b45] hover:bg-[#006799]"
            >
              Continuar al Inicio de Sesión
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

// [ESTUDIANTE INFORMÁTICA] Columna institucional izquierda con marco normativo Ley 19.754 y acceso a postulación HU-01.
const InstitutionalLeftPanel: React.FC<{
  onSelectAccount: (user: string, pass: string) => void;
}> = ({ onSelectAccount }) => (
  <div className="lg:col-span-6 bg-[#0c2b45] text-white p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-white/10 border border-white/15 text-[11px] font-mono font-bold uppercase tracking-wider text-sky-200">
          <span className="w-1.5 h-1.5 rounded-full bg-[#78a200]" />
          Ley N° 19.754 • Bienestar Municipal
        </div>
        <span className="text-[11px] font-mono text-slate-400 tabular-nums">Región de O&apos;Higgins</span>
      </div>

      <div className="bg-white rounded-md p-3 border border-slate-300 max-w-xs">
        <img
          src="/logo-peralillo.png"
          alt="Ilustre Municipalidad de Peralillo"
          className="h-14 w-auto object-contain mx-auto"
        />
      </div>

      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
          Comité de Bienestar • I. Municipalidad de Peralillo
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Plataforma de gestión operativa, reembolsos médicos, asignaciones indexadas al Grado 15 y control financiero con auditoría inmutable.
        </p>
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/10 rounded-md bg-white/[0.04] border border-white/15 p-3 text-xs">
        <div className="pr-3">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Tope Salud</span>
          <span className="font-mono font-bold text-white tabular-nums">$150.000 / año</span>
        </div>
        <div className="px-3">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Plazo Boletas</span>
          <span className="font-mono font-bold text-amber-300 tabular-nums">30 días corridos</span>
        </div>
        <div className="pl-3">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Cotización</span>
          <span className="font-mono font-bold text-lime-300 tabular-nums">4,0% Sueldo Base</span>
        </div>
      </div>
    </div>

    {process.env.NODE_ENV !== 'production' && (
      <div className="mt-6 pt-4 border-t border-white/15">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-300">
            Perfiles de Prueba (Entorno Desarrollo)
          </span>
          <span className="text-[10px] text-slate-400">Clic para autocompletar</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {TEST_ACCOUNTS.map((acc) => (
            <button
              key={acc.user}
              id={`test-account-${acc.label.split(' ')[0].toLowerCase()}`}
              type="button"
              onClick={() => onSelectAccount(acc.user, acc.pass)}
              className="px-2.5 py-1.5 text-left rounded bg-white/[0.06] hover:bg-white/15 border border-white/15 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white truncate">{acc.label}</span>
                <span className="text-[9px] font-mono font-bold text-sky-300">{acc.roleTag}</span>
              </div>
              <span className="block text-[10px] font-mono text-slate-300 truncate">{acc.user}</span>
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
);

// [ESTUDIANTE INFORMÁTICA] Pantalla principal de autenticación Split-Screen Data-Dense, libre de splash bloqueante de 7s.
export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [farewellUser, setFarewellUser] = useState<string | null>(null);

  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [recoverySubmitting, setRecoverySubmitting] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<RecuperacionResult | null>(null);

  useEffect(() => {
    try {
      const loggedOutName = sessionStorage.getItem(LOGOUT_USER_KEY);
      if (loggedOutName) {
        sessionStorage.removeItem(LOGOUT_USER_KEY);
        setFarewellUser(loggedOutName);
      }
    } catch {
      // Ignorar si sessionStorage no disponible
    }
  }, []);

  const handleRecoveryChange = (val: string) => {
    setRecoveryError(null);
    if (val && !val.includes('@') && /^[0-9kK.\-\s]+$/.test(val)) {
      setRecoveryInput(formatRun(val));
    } else {
      setRecoveryInput(val);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    const clean = recoveryInput.trim();
    if (!clean) {
      setRecoveryError('Ingrese su RUN o Correo Electrónico registrado.');
      return;
    }
    setRecoverySubmitting(true);
    try {
      const res = await fetchFromApi<RecuperacionResult>('/auth/recuperar-password', {
        method: 'POST',
        body: JSON.stringify({ identificador: clean }),
      });
      setRecoverySuccess(res);
      setUsername(clean);
      setPassword('');
    } catch (err: unknown) {
      setRecoveryError(err instanceof Error ? err.message : 'No se pudo procesar la solicitud.');
    } finally {
      setRecoverySubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username || !password) {
      setError('Ingresa tu RUN/correo y contraseña.');
      return;
    }
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-5xl bg-white rounded-lg border border-slate-300 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        <InstitutionalLeftPanel
          onSelectAccount={(u, p) => {
            setUsername(u);
            setPassword(p);
            setError(null);
          }}
        />

        <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between bg-white">
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#006799] block">
                Autenticación de Funcionarios y Directiva
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                Ingreso al Sistema de Bienestar
              </h2>
              <p className="text-xs text-slate-500">
                Ingrese con su RUN institucional o correo electrónico municipal
              </p>
            </div>

            {farewellUser && (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-300 flex items-center justify-between text-xs">
                <span className="font-semibold text-[#166534]">
                  ✓ Sesión de <strong>{farewellUser}</strong> finalizada correctamente.
                </span>
                <button
                  type="button"
                  onClick={() => setFarewellUser(null)}
                  className="text-emerald-800 font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-username" className="block text-xs font-bold text-slate-700 mb-1">
                  RUN o Correo Electrónico Institucional
                </label>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: 12.345.678-9 o usuario@mperalillo.cl"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006799]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="login-password" className="block text-xs font-bold text-slate-700">
                    Contraseña de Acceso
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryInput(username.trim());
                      setRecoveryError(null);
                      setRecoverySuccess(null);
                      setRecoveryOpen(true);
                    }}
                    className="text-[11px] font-semibold text-[#006799] hover:underline"
                  >
                    ¿Olvidó su contraseña?
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006799]"
                />
              </div>

              {error && (
                <div
                  id="login-error"
                  className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-300 rounded-md px-3 py-2"
                >
                  {error}
                </div>
              )}

              <button
                id="login-submit"
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-md font-bold text-xs sm:text-sm text-white bg-[#006799] hover:bg-[#0c2b45] transition-colors disabled:opacity-60"
              >
                {submitting ? 'Verificando credenciales…' : 'Ingresar al Portal'}
              </button>
            </form>
          </div>

          <div className="pt-5 mt-6 border-t border-slate-200 space-y-3">
            <a
              id="login-solicitar-incorporacion"
              href="/afiliacion/solicitud"
              className="flex items-center justify-between w-full py-2.5 px-3.5 rounded-md font-bold text-xs text-[#166534] bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 transition-colors"
            >
              <span>¿Funcionario sin afiliación? Solicitar Incorporación (HU-01)</span>
              <span>→</span>
            </a>
            <p className="text-[11px] text-slate-400 text-center">
              I. Municipalidad de Peralillo • Acceso protegido con registro de auditoría
            </p>
          </div>
        </div>
      </div>

      {recoveryOpen && (
        <PasswordRecoveryModal
          recoveryInput={recoveryInput}
          recoverySubmitting={recoverySubmitting}
          recoveryError={recoveryError}
          recoverySuccess={recoverySuccess}
          onChangeInput={handleRecoveryChange}
          onSubmit={handleRecoverySubmit}
          onClose={() => setRecoveryOpen(false)}
        />
      )}
    </div>
  );
}
