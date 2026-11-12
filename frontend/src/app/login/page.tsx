'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuth, LOGOUT_USER_KEY } from '@/context/AuthContext';
import { PreLoginSplashIntro } from '@/components/ui/PreLoginSplashIntro';
import { NetworkMeshBackground } from '@/components/ui/NetworkMeshBackground';
import { fetchFromApi } from '@/lib/api';
import {
  formatRun,
  validateLoginIdentifier,
  detectIdentifierMode,
  MAX_RUN_CLEAN_CHARS,
  MAX_RUN_FORMATTED_CHARS,
  MAX_EMAIL_CHARS,
} from '@/lib/utils';

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

// [ESTUDIANTE INFORMÁTICA] Credenciales de desarrollo con etiquetas cromáticas y roles institucionales.
const TEST_ACCOUNTS = [
  { label: 'Superusuario', user: 'superadmin@mperalillo.cl', pass: 'Super#2026', roleTag: 'SUP' },
  { label: 'Presidente', user: 'msoto@mperalillo.cl', pass: 'Presi#2026', roleTag: 'PRE' },
  { label: 'Secretario', user: 'pfuentes@mperalillo.cl', pass: 'Secre#2026', roleTag: 'SEC' },
  { label: 'Tesorero', user: 'rmorales@mperalillo.cl', pass: 'Teso#2026', roleTag: 'TES' },
  { label: 'Directiva', user: 'jcontreras@mperalillo.cl', pass: 'Admin#2026', roleTag: 'DIR' },
  { label: 'Auditor', user: 'aibarra@mperalillo.cl', pass: 'Audit#2026', roleTag: 'AUD' },
  { label: 'Socio Activo', user: 'cvalenzuela@mperalillo.cl', pass: 'Socio#2026', roleTag: 'SOC' },
] as const;

// [ESTUDIANTE INFORMÁTICA] Sanitiza y restringe la entrada de usuario aplicando topes estrictos:
// - Modo RUT: máximo 9 dígitos limpios (XX.XXX.XXX-X, máx 12 caracteres)
// - Modo Correo: máximo 80 caracteres
function sanitizeIdentifierInput(raw: string): string {
  const trimmed = raw.trimStart();
  const mode = detectIdentifierMode(trimmed);
  if (mode === 'rut') {
    const cleanDigitsAndDv = trimmed.replace(/[^0-9kK]/g, '').slice(0, MAX_RUN_CLEAN_CHARS);
    return formatRun(cleanDigitsAndDv);
  }
  return trimmed.slice(0, MAX_EMAIL_CHARS);
}

// [ESTUDIANTE INFORMÁTICA] Campo inteligente de RUN / Correo con iconos táctiles, topes dinámicos y sin alertas prematuras
interface LoginIdentifierFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

const LoginIdentifierField: React.FC<LoginIdentifierFieldProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
  disabled,
}) => {
  const mode = detectIdentifierMode(value);
  const cleanRutLength = value.replace(/[^0-9kK]/g, '').length;
  const currentCount = mode === 'rut' ? cleanRutLength : value.length;
  const maxLimit = mode === 'rut' ? MAX_RUN_CLEAN_CHARS : MAX_EMAIL_CHARS;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(sanitizeIdentifierInput(e.target.value));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <label htmlFor={id} className="font-bold text-slate-700">
          {label}
        </label>
        {mode !== 'empty' && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
            <span className="font-semibold text-slate-500">
              {mode === 'rut' ? 'RUT' : 'Correo'}
            </span>
            <span className="tabular-nums">
              ({currentCount}/{maxLimit})
            </span>
          </div>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-slate-400">
          {mode === 'email' ? (
            <Mail className="w-4 h-4 text-slate-400" />
          ) : (
            <User className="w-4 h-4 text-slate-400" />
          )}
        </div>
        <input
          id={id}
          type="text"
          autoFocus={autoFocus}
          disabled={disabled}
          value={value}
          maxLength={mode === 'rut' ? MAX_RUN_FORMATTED_CHARS : MAX_EMAIL_CHARS}
          onChange={handleChange}
          placeholder={placeholder || 'Ej: 12.345.678-9 o usuario@mperalillo.cl'}
          className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200/90 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799] focus:border-[#006799] transition-all"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Limpiar campo"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 text-xs transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

interface RecoveryModalProps {
  recoveryInput: string;
  recoverySubmitting: boolean;
  recoveryError: string | null;
  recoverySuccess: RecuperacionResult | null;
  onChangeInput: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

// [ESTUDIANTE INFORMÁTICA] Modal moderno de recuperación de contraseña con esquinas suaves y seguridad SSL.
const PasswordRecoveryModal: React.FC<RecoveryModalProps> = ({
  recoveryInput,
  recoverySubmitting,
  recoveryError,
  recoverySuccess,
  onChangeInput,
  onSubmit,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
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
              <LoginIdentifierField
                id="recovery-identifier"
                label="RUN o Correo Electrónico Registrado *"
                value={recoveryInput}
                onChange={onChangeInput}
                disabled={recoverySubmitting}
                autoFocus
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

// [ESTUDIANTE INFORMÁTICA] Pantalla de Login Vertical moderna, ejecutiva y cinemática.
export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDevAccounts, setShowDevAccounts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [farewellUser, setFarewellUser] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);

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

  const handleFinishSplash = () => {
    setShowSplash(false);
  };

  const handleRecoveryChange = (val: string) => {
    setRecoveryError(null);
    setRecoveryInput(val);
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    const clean = recoveryInput.trim();
    if (!clean) {
      setRecoveryError('Ingrese su RUN o Correo Electrónico registrado.');
      return;
    }
    const valCheck = validateLoginIdentifier(clean);
    if (!valCheck.isValid) {
      setRecoveryError(valCheck.error || 'Identificador no válido.');
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
    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setError('Ingresa tu RUN o correo institucional y contraseña.');
      return;
    }
    const valCheck = validateLoginIdentifier(cleanUser);
    if (!valCheck.isValid) {
      setError(valCheck.error || 'Identificador no válido.');
      return;
    }
    setSubmitting(true);
    try {
      await login(cleanUser, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#061523] flex flex-col justify-center items-center p-4 sm:p-6 relative select-none overflow-x-hidden">
      {/* Fondo cinemático moderno con red dinámica interactiva y auras ambientales */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Red interactiva tipo constelación/malla en movimiento continuo con figuras ampliadas */}
        <NetworkMeshBackground />

        {/* Retícula sutil en desplazamiento suave */}
        <div
          className="absolute inset-0 opacity-[0.12] animate-grid-drift"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Orbe luminoso flotante superior */}
        <div className="absolute top-[8%] left-[10%] w-[420px] h-[420px] rounded-full bg-[#004e75]/30 blur-[130px] animate-orb-slow" />

        {/* Orbe luminoso flotante inferior */}
        <div
          className="absolute bottom-[8%] right-[10%] w-[460px] h-[460px] rounded-full bg-[#113628]/30 blur-[140px] animate-orb-slow"
          style={{ animationDelay: '-7s' }}
        />
      </div>

      {showSplash && <PreLoginSplashIntro onFinish={handleFinishSplash} />}

      <div className="relative z-10 w-full max-w-[430px] space-y-4 animate-reveal-card">
        {/* Cabecera institucional vertical centrada con Escudo Oficial */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center transition-transform hover:scale-105">
            <img
              src="/escudo-peralillo.png"
              alt="Escudo Oficial de la I. Municipalidad de Peralillo"
              className="h-28 sm:h-36 md:h-40 w-auto object-contain mx-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.55)]"
            />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-sky-200 border border-white/20 backdrop-blur-md mb-1.5 shadow-sm">
              <Sparkles className="w-3 h-3 text-amber-300" /> Comité de Bienestar • Peralillo
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
              Comité de Bienestar
            </h1>
            <p className="text-xs text-slate-300 font-medium">
              Portal Oficial de Socios y Funcionarios • Peralillo
            </p>
          </div>
        </div>

        {/* Tarjeta principal de Login Vertical Glassmorphic */}
        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.15)] overflow-hidden">
          {/* Filete multicolor corporativo de Peralillo */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />

          <div className="p-6 sm:p-7 space-y-4">
            {/* Subcabecera interior de la tarjeta */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h2 className="text-sm font-extrabold text-[#0c2b45]">Acceso al Portal</h2>
                <p className="text-[11px] text-slate-500">Credenciales institucionales</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sistema Seguro
              </div>
            </div>

            {farewellUser && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-[#166534]">
                  ✓ Sesión de <strong>{farewellUser}</strong> cerrada correctamente.
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

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <LoginIdentifierField
                id="login-username"
                label="RUN o Correo Institucional"
                value={username}
                onChange={(val) => {
                  setUsername(val);
                  setError(null);
                }}
                disabled={submitting}
              />

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

                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-slate-400">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200/90 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799] focus:border-[#006799] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                className="group w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#0c2b45] via-[#006799] to-[#166534] hover:opacity-95 shadow-md shadow-[#006799]/25 hover:shadow-lg hover:shadow-[#006799]/35 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Verificando credenciales…</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar al Portal</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100">
              <a
                id="login-solicitar-incorporacion"
                href="/afiliacion/solicitud"
                className="group flex items-center justify-between w-full py-2.5 px-3.5 rounded-xl font-bold text-xs text-[#166534] bg-emerald-50/80 border border-emerald-200/80 hover:bg-emerald-100/90 hover:border-emerald-300 transition-all"
              >
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  ¿Aún no eres socio? Solicitar Incorporación
                </span>
                <span className="group-hover:translate-x-0.5 transition-transform font-bold">→</span>
              </a>
            </div>
          </div>
        </div>

        {/* Cuentas de desarrollo colapsables para mantener la presentación ejecutiva limpia */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setShowDevAccounts((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="text-amber-400">⚡</span>
                <span>Cuentas de Prueba para Desarrollo (7 roles)</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <span>{showDevAccounts ? 'Ocultar' : 'Ver'}</span>
                {showDevAccounts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </button>
            {showDevAccounts && (
              <div className="p-3 pt-1 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-1.5 animate-fade-in">
                {TEST_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.user}
                    id={`test-account-${acc.label.split(' ')[0].toLowerCase()}`}
                    type="button"
                    onClick={() => {
                      setUsername(acc.user);
                      setPassword(acc.pass);
                      setError(null);
                    }}
                    className="px-2.5 py-1.5 text-left rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all text-xs"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-white truncate">{acc.label}</span>
                      <span className="text-[9px] font-mono font-bold text-sky-400 shrink-0">{acc.roleTag}</span>
                    </div>
                    <span className="block text-[10px] font-mono text-slate-400 truncate">{acc.user}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Distintivo de Seguridad y Encriptación */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Conexión Cifrada SSL 256-bit • Portal Oficial</span>
        </div>

        {/* Footer institucional */}
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-[11px] text-slate-400">
            Comité de Bienestar • Ilustre Municipalidad de Peralillo &copy; {new Date().getFullYear()}
          </p>
          <button
            type="button"
            onClick={() => setShowSplash(true)}
            className="text-[11px] text-slate-400 hover:text-sky-300 transition inline-flex items-center gap-1"
          >
            <span>↺</span> Ver presentación institucional
          </button>
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
