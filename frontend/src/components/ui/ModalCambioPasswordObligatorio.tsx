'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';

export const ModalCambioPasswordObligatorio: React.FC = () => {
  const { user, token, justLoggedIn, refreshUser, logout } = useAuth();
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !user.debeCambiarPassword || justLoggedIn) {
    return null;
  }

  const cumpleLargo = nuevaPassword.length >= 8;
  const cumpleMayuscula = /[A-Z]/.test(nuevaPassword);
  const cumpleNumero = /\d/.test(nuevaPassword);
  const coinciden = nuevaPassword.length > 0 && nuevaPassword === confirmarPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cumpleLargo) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!coinciden) {
      setError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setGuardando(true);
    try {
      await fetchFromApi('/auth/cambiar-password', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify({ nueva_password: nuevaPassword }),
      });
      await refreshUser();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la contraseña.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md animate-fade-in">
      <div className="relative bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Filete institucional Peralillo */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />

        <div className="p-6 sm:p-7 space-y-5">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
            <div>
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 mb-1">
                Seguridad de Cuenta
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-800 leading-snug">
                Actualiza tu Contraseña Personal
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Has ingresado con una <strong>contraseña temporal</strong> restablecida por Administración. Por tu seguridad, define ahora tu nueva clave privada.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Nueva Contraseña Personal *</label>
                <button
                  type="button"
                  onClick={() => setMostrar(!mostrar)}
                  className="text-[11px] font-semibold text-[#006799] hover:underline"
                >
                  {mostrar ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <input
                type={mostrar ? 'text' : 'password'}
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Confirmar Nueva Contraseña *
              </label>
              <input
                type={mostrar ? 'text' : 'password'}
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder="Repite tu nueva contraseña"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
                required
              />
            </div>

            {/* Indicadores simples de fortaleza */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-[11px]">
              <p className="font-bold text-slate-600 mb-1">Requisitos de seguridad:</p>
              <div className={cumpleLargo ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                {cumpleLargo ? '✓' : '○'} Al menos 8 caracteres
              </div>
              <div className={cumpleMayuscula ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                {cumpleMayuscula ? '✓' : '○'} Al menos una letra mayúscula (recomendado)
              </div>
              <div className={cumpleNumero ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                {cumpleNumero ? '✓' : '○'} Al menos un número (recomendado)
              </div>
              <div className={coinciden ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                {coinciden ? '✓' : '○'} Ambas contraseñas coinciden
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={logout}
                className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                Salir
              </button>
              <button
                type="submit"
                disabled={guardando || !cumpleLargo || !coinciden}
                className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#006799] to-[#5b7c29] hover:opacity-95 rounded-xl shadow-md transition disabled:opacity-50"
              >
                {guardando ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

