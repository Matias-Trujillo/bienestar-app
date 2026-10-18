import React, { useState } from 'react';
import { User, UserRole } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface GestionUsuariosTableProps {
  usuarios: User[];
  loading: boolean;
  onEditarUsuario: (u: User) => void;
  onNuevoUsuario: () => void;
}

export const GestionUsuariosTable: React.FC<GestionUsuariosTableProps> = ({
  usuarios,
  loading,
  onEditarUsuario,
  onNuevoUsuario,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('todos');

  const filtrados = usuarios.filter((u) => {
    if (filtroRol !== 'todos' && u.rol !== filtroRol) return false;
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return [u.nombreCompleto, u.rut, u.email, u.departamento].some((v) =>
      v.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">Directorio General de Usuarios y Roles</h2>
          <p className="text-xs text-slate-500">
            Control de cuentas, asignación de cargos de Directiva y permisos de acceso municipal.
          </p>
        </div>
        <button
          onClick={onNuevoUsuario}
          className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md transition"
        >
          ✚ Crear Nuevo Usuario
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {['todos', 'socio', 'presidente', 'secretario', 'tesorero', 'admin', 'auditor'].map((rol) => (
            <button
              key={rol}
              onClick={() => setFiltroRol(rol)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                filtroRol === rol
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {rol}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Buscar por nombre, RUT o departamento..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none w-full sm:w-72"
        />
      </div>

      {loading ? (
        <p className="p-8 text-center text-sm text-slate-400">Cargando usuarios...</p>
      ) : filtrados.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-400 italic">No se encontraron usuarios.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold uppercase">
                <th className="py-3 px-4">Funcionario</th>
                <th className="py-3 px-4">RUT</th>
                <th className="py-3 px-4">Rol Asignado</th>
                <th className="py-3 px-4">Departamento</th>
                <th className="py-3 px-4">Antigüedad</th>
                <th className="py-3 px-4 text-right">Saldo Salud</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-800 block">{u.nombreCompleto}</span>
                    <span className="text-[11px] text-slate-400 block">{u.email}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{u.rut}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        u.rol === 'superusuario'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : u.rol === 'socio'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {u.rolLabel}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{u.departamento}</td>
                  <td className="py-3.5 px-4 text-slate-600">{u.antiguedad}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700">
                    {formatCurrency(u.saldoSaludDisponible)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Activo
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => onEditarUsuario(u)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                    >
                      Editar / Rol
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
