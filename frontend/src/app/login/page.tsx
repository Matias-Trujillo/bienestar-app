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

// [ESTUDIANTE INFORMÁTICA] Credenciales de desarrollo con etiquetas cromáticas modernas.
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

// [ESTUDIANTE INFORMÁTICA] Modal moderno de recuperación de contraseña con esquinas suaves (rounded-2xl).
const PasswordRecoveryModal: React.FC<RecoveryModalProps> = ({
  recoveryInput,
  recoverySubmitting,
  recoveryError,
  recoverySuccess,
  onChangeInput,
  onSubmit,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-fade-in">
    <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200/90 shadow-2xl overflow-hidden animate-scale-in">
      <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#006799] block">
              Seguridad Institucional • Bienestar
            </span>
            <h3 className="text-base font-extrabold text-[#0c2b45]">Recuperación de Contraseña</h3>
          </div>
          <button
            type="button"
            disabled={recoverySubmitting}
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            ✕
          </button>
        </div>

        {!recoverySuccess ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                RUN o Correo Electrónico Registrado *
              </label>
              <input
                type="text"
                autoFocus
                value={recoveryInput}
                onChange={(e) => onChangeInput(e.target.value)}
                placeholder="Ej: 12.345.678-9 o usuario@mperalillo.cl"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200/90 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
              />
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                Enviaremos una <strong>Contraseña Temporal</strong> de un solo uso a su correo institucional registrado.
              </p>
            </div>

            {recoveryError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                {recoveryError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={recoverySubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={recoverySubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 shadow-sm disabled:opacity-60"
              >
                {recoverySubmitting ? 'Enviando...' : 'Enviar Clave Temporal'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
              <p className="font-bold text-[#166534]">✓ Clave temporal despachada</p>
              <p className="text-slate-700">
                Enviada al correo <strong className="text-[#0c2b45]">{recoverySuccess.emailDestino}</strong>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-xs">
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
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 shadow-sm"
            >
              Continuar al Inicio de Sesión
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

// [ESTUDIANTE INFORMÁTICA] Panel institucional izquierdo con degradado elegante, escudo oficial y selector de cuentas de prueba.
const InstitutionalLeftPanel: React.FC<{
  onSelectAccount: (user: string, pass: string) => void;
}> = ({ onSelectAccount }) => (
  <div className="lg:col-span-6 bg-gradient-to-br from-[#091e32] via-[#0c2b45] to-[#113628] text-white p-7 sm:p-9 flex flex-col justify-between">
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-wider text-amber-200">
          <span className="w-2 h-2 rounded-full bg-[#78a200]" />
          Ley N° 19.754 • Bienestar Municipal
        </div>
        <span className="text-[11px] font-medium text-sky-200/80">Peralillo • Sexta Región</span>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-white/20 shadow-lg max-w-xs">
        <img
          src="/logo-peralillo.png"
          alt="Ilustre Municipalidad de Peralillo"
          className="h-14 w-auto object-contain mx-auto"
        />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
          Servicio de Bienestar Municipal
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Plataforma digital de atención al funcionario: reembolsos médicos, beneficios indexados al Grado 15 y gestión previsional transparente.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5 text-xs">
        <div className="p-3 rounded-xl bg-white/[0.08] border border-white/15">
          <span className="text-[10px] text-slate-300 uppercase font-bold block">Tope Salud</span>
          <span className="font-mono font-extrabold text-white tabular-nums mt-0.5 block">$150.000</span>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.08] border border-white/15">
          <span className="text-[10px] text-slate-300 uppercase font-bold block">Plazo Boletas</span>
          <span className="font-mono font-extrabold text-amber-200 tabular-nums mt-0.5 block">30 días</span>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.08] border border-white/15">
          <span className="text-[10px] text-slate-300 uppercase font-bold block">Cuota Social</span>
          <span className="font-mono font-extrabold text-lime-300 tabular-nums mt-0.5 block">4% Base</span>
        </div>
      </div>
    </div>

    {process.env.NODE_ENV !== 'production' && (
      <div className="mt-7 pt-5 border-t border-white/15">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-200">
            Cuentas de Prueba (Clic para rellenar)
          </span>
          <span className="text-[10px] text-slate-400">Desarrollo</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TEST_ACCOUNTS.map((acc) => (
            <button
              key={acc.user}
              id={`test-account-${acc.label.split(' ')[0].toLowerCase()}`}
              type="button"
              onClick={() => onSelectAccount(acc.user, acc.pass)}
              className="px-3 py-2 text-left rounded-xl bg-white/[0.07] hover:bg-white/15 border border-white/15 transition-all"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-white truncate">{acc.label}</span>
                <span className="text-[9px] font-mono font-bold text-amber-200 shrink-0">{acc.roleTag}</span>
              </div>
              <span className="block text-[10px] font-mono text-slate-300 truncate">{acc.user}</span>
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
);

// [ESTUDIANTE INFORMÁTICA] Pantalla de Login Split-Screen moderna con tarjeta rounded-3xl suave y sombra equilibrada.
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
      // Ignorar
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
    <div className="min-h-screen bg-[#f4f7fa] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-5xl bg-white rounded-3xl border border-slate-200/90 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12)] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        <InstitutionalLeftPanel
          onSelectAccount={(u, p) => {
            setUsername(u);
            setPassword(p);
            setError(null);
          }}
        />

        <div className="lg:col-span-6 p-7 sm:p-10 flex flex-col justify-between bg-white">
          <div className="space-y-6">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-[#006799] border border-sky-200/80 mb-2">
                Acceso de Funcionarios y Socios
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Iniciar Sesión en el Portal
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Ingresa con tu RUN institucional o correo electrónico municipal
              </p>
            </div>

            {farewellUser && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-[#166534]">
                  ✓ Sesión de <strong>{farewellUser}</strong> cerrada de forma segura.
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
                <label htmlFor="login-username" className="block text-xs font-bold text-slate-700 mb-1.5">
                  RUN o Correo Electrónico Institucional
                </label>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: 12.345.678-9 o usuario@mperalillo.cl"
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200/90 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799] transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-xs font-bold text-slate-700">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryInput(username.trim());
                      setRecoveryError(null);
                      setRecoverySuccess(null);
                      setRecoveryOpen(true);
                    }}
                    className="text-xs font-bold text-[#006799] hover:underline"
                  >
                    ¿Olvidaste tu clave?
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200/90 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799] transition-all"
                />
              </div>

              {error && (
                <div
                  id="login-error"
                  className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5"
                >
                  {error}
                </div>
              )}

              <button
                id="login-submit"
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#0c2b45] via-[#006799] to-[#166534] hover:opacity-95 shadow-md shadow-[#006799]/20 transition-all disabled:opacity-60"
              >
                {submitting ? 'Verificando credenciales…' : 'Ingresar al Portal'}
              </button>
            </form>
          </div>

          <div className="pt-5 mt-6 border-t border-slate-100 space-y-3">
            <a
              id="login-solicitar-incorporacion"
              href="/afiliacion/solicitud"
              className="flex items-center justify-between w-full py-3 px-4 rounded-xl font-bold text-xs text-[#166534] bg-emerald-50/80 border border-emerald-200 hover:bg-emerald-100/80 transition-colors"
            >
              <span>¿Aún no eres socio? Solicitar Incorporación al Comité</span>
              <span>→</span>
            </a>
            <p className="text-[11px] text-slate-400 text-center">
              Comité de Bienestar • Ilustre Municipalidad de Peralillo &copy; {new Date().getFullYear()}
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
