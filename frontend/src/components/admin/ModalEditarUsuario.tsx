import React, { useState } from 'react';
import { User, UserRole } from '@/types';

interface ModalEditarUsuarioProps {
  usuario: User | null;
  onClose: () => void;
  onSubmit: (id: string, data: any) => Promise<void>;
}

export const ModalEditarUsuario: React.FC<ModalEditarUsuarioProps> = ({
  usuario,
  onClose,
  onSubmit,
}) => {
  if (!usuario) return null;

  const [rol, setRol] = useState<UserRole>(usuario.rol);
  const [departamento, setDepartamento] = useState(usuario.departamento || '');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [saldoSalud, setSaldoSalud] = useState(usuario.saldoSaludDisponible || 250000);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await onSubmit(usuario.id, {
        rol,
        departamento,
        nueva_password: nuevaPassword.trim() || undefined,
        saldo_salud_disponible: Number(saldoSalud),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar usuario.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-6">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Gestión de Permisos
            </span>
            <h3 className="text-lg font-bold text-slate-800 mt-1">
              Editar Funcionario: {usuario.nombreCompleto}
            </h3>
            <p className="text-xs text-slate-500">RUT: {usuario.rut} • {usuario.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Rol / Cargo en el Comité *</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as UserRole)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="socio">Socio (Funcionario regular)</option>
              <option value="presidente">Presidente/a del Directorio</option>
              <option value="secretario">Secretario/a del Directorio</option>
              <option value="tesorero">Tesorero/a del Directorio</option>
              <option value="admin">Administrador/a General</option>
              <option value="auditor">Auditor / Revisor de Cuentas</option>
              <option value="superusuario">Super Administrador (Acceso Maestro)</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Los cambios de rol quedan registrados con firma digital en la bitácora de auditoría inmutable.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Departamento / Unidad Municipal</label>
            <input
              type="text"
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Saldo Disponible Fondo Salud ($ CLP)</label>
            <input
              type="number"
              value={saldoSalud}
              onChange={(e) => setSaldoSalud(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Restablecer Contraseña (opcional)
            </label>
            <input
              type="password"
              placeholder="Dejar en blanco para no modificar"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 text-white bg-purple-700 hover:bg-purple-800 rounded-xl font-bold transition shadow-md shadow-purple-700/20 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Confirmar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
