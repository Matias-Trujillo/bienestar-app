import React, { useState, useEffect } from 'react';
import { ShieldCheck, User as UserIcon, KeyRound } from 'lucide-react';
import { User, UserRole } from '@/types';

interface ModalEditarUsuarioProps {
  usuario: User | null;
  modoInicial?: 'general' | 'reset_password';
  onClose: () => void;
  onSubmit: (id: string, data: Record<string, unknown>) => Promise<void>;
}

export const ModalEditarUsuario: React.FC<ModalEditarUsuarioProps> = ({
  usuario,
  modoInicial = 'general',
  onClose,
  onSubmit,
}) => {
  const [rol, setRol] = useState<UserRole>('socio');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [departamento, setDepartamento] = useState('');
  const [passwordBloqueada, setPasswordBloqueada] = useState<boolean>(false);
  const [debeCambiarPassword, setDebeCambiarPassword] = useState<boolean>(false);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    setRol(usuario.rol);
    setIsActive(usuario.isActive !== false);
    setDepartamento(usuario.departamento || '');
    setPasswordBloqueada(Boolean(usuario.passwordBloqueada));
    setDebeCambiarPassword(
      modoInicial === 'reset_password' ? true : Boolean(usuario.debeCambiarPassword)
    );
    if (modoInicial === 'reset_password') {
      const rutDigits = usuario.rut.replace(/\D/g, '').slice(0, 4) || '2026';
      setNuevaPassword(`Peralillo#${rutDigits}`);
      setPasswordBloqueada(false);
    } else {
      setNuevaPassword('');
    }
    setError(null);
  }, [usuario, modoInicial]);

  if (!usuario) return null;

  const generarClaveTemporal = () => {
    const rutDigits = usuario.rut.replace(/\D/g, '').slice(0, 4) || '2026';
    setNuevaPassword(`Peralillo#${rutDigits}`);
    setPasswordBloqueada(false);
    setDebeCambiarPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nuevaPassword.trim() && nuevaPassword.trim().length < 6) {
      setError('La contraseña temporal debe tener al menos 6 caracteres.');
      return;
    }

    setGuardando(true);
    try {
      await onSubmit(usuario.id, {
        rol,
        is_active: isActive,
        departamento,
        password_bloqueada: nuevaPassword.trim() ? false : passwordBloqueada,
        debe_cambiar_password: nuevaPassword.trim() ? debeCambiarPassword : debeCambiarPassword,
        nueva_password: nuevaPassword.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar usuario.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-4 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 sm:space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              {modoInicial === 'reset_password'
                ? 'Seguridad • Restablecer y Desbloquear Clave'
                : 'Gestión de Socio, Rol y Seguridad'}
            </span>
            <h3 className="text-lg font-bold text-slate-800 mt-1.5">
              {usuario.nombreCompleto}
            </h3>
            <p className="text-xs text-slate-500">
              RUT: {usuario.rut} • {usuario.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Selector explícito de Modalidad de Vistas (1 Vista vs 2 Vistas) para el Superadmin */}
          <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 block">
              Modalidad de Cuenta y Vistas Asignadas por Superadmin
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRol('socio')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  rol === 'socio'
                    ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white/70 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-700" />
                    <span>1 Vista (Trabajador)</span>
                  </span>
                  {rol === 'socio' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Activo
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Solo pide sus vacaciones, bonos y reembolsos. Cero acceso a aprobaciones ni historiales.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (rol === 'socio') setRol('admin');
                }}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  rol !== 'socio'
                    ? 'bg-white border-purple-600 ring-2 ring-purple-600/20 shadow-xs'
                    : 'bg-white/70 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-bold text-purple-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                    <span>2 Vistas (Admin + Socio)</span>
                  </span>
                  {rol !== 'socio' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                      Activo
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Pestaña en perfil para alternar Vista Admin y Vista Usuario (prohibido auto-aprobarse).
                </p>
              </button>
            </div>
          </div>

          {/* 1. Estado del Socio y Rol */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Estado del Socio
              </label>
              <select
                value={isActive ? 'activo' : 'inactivo'}
                onChange={(e) => setIsActive(e.target.value === 'activo')}
                className={`w-full px-3 py-2 border rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  isActive
                    ? 'bg-emerald-50/60 border-emerald-300 text-emerald-800'
                    : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}
              >
                <option value="activo">● Socio Activo (Habilitado)</option>
                <option value="inactivo">○ Socio Inactivo (Sin acceso)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cargo / Rol Específico
              </label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="socio">Trabajador Normal (1 Vista: Socio)</option>
                <option value="admin">Administrador (2 Vistas: Admin + Socio)</option>
                <option value="presidente">Presidente(a) (2 Vistas: Directiva + Socio)</option>
                <option value="secretario">Secretario(a) (2 Vistas: Directiva + Socio)</option>
                <option value="tesorero">Tesorero(a) (2 Vistas: Directiva + Socio)</option>
                <option value="auditor">Auditor(a) (2 Vistas: Lectura + Socio)</option>
                <option value="superusuario">Superadministrador (Control Total)</option>
              </select>
            </div>
          </div>

          {/* 2. Unidad Municipal */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Departamento / Unidad Municipal
            </label>
            <input
              type="text"
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 3. Panel de Seguridad de la Contraseña */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                <span>Estado Actual de la Contraseña</span>
              </span>
              <button
                type="button"
                onClick={() => setPasswordBloqueada(!passwordBloqueada)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                  passwordBloqueada
                    ? 'bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${passwordBloqueada ? 'bg-rose-600' : 'bg-emerald-600'}`} />
                <span>{passwordBloqueada ? 'Bloqueada (Clic para desbloquear)' : 'Desbloqueada'}</span>
              </button>
            </div>

            {/* Restablecer clave temporal */}
            <div className="pt-1 border-t border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-slate-700">
                  Restablecer Contraseña Temporal
                </label>
                <button
                  type="button"
                  onClick={generarClaveTemporal}
                  className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline"
                >
                  Generar clave sugerida
                </button>
              </div>

              <div className="relative flex items-center">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  placeholder="Dejar en blanco para mantener la clave actual"
                  value={nuevaPassword}
                  onChange={(e) => {
                    setNuevaPassword(e.target.value);
                    if (e.target.value.trim()) {
                      setPasswordBloqueada(false);
                      setDebeCambiarPassword(true);
                    }
                  }}
                  className="w-full px-3 py-2 pr-16 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute right-2.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                >
                  {mostrarPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>

              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={debeCambiarPassword}
                  onChange={(e) => setDebeCambiarPassword(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 accent-purple-700 rounded"
                />
                <span className="text-[11px] text-slate-600 leading-snug">
                  <strong>Exigir cambio de contraseña al iniciar sesión:</strong> cuando el socio ingrese con esta clave temporal, el sistema le pedirá crear su propia clave nueva.
                </span>
              </label>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition font-semibold text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="w-full sm:w-auto px-5 py-2 text-white bg-purple-700 hover:bg-purple-800 rounded-xl font-bold transition shadow-md shadow-purple-700/20 disabled:opacity-50 text-center"
            >
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
