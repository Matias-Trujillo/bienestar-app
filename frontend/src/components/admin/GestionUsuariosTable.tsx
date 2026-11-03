import React, { useState } from 'react';
import { User } from '@/types';

interface GestionUsuariosTableProps {
  usuarios: User[];
  loading: boolean;
  onEditarUsuario: (u: User, modoInicial?: 'general' | 'reset_password') => void;
  onAccionRapidaSeguridad?: (
    id: string,
    payload: Record<string, unknown>,
    mensajeConfirmacion: string
  ) => Promise<void>;
  onEliminarUsuario?: (u: User) => Promise<void>;
  onNuevoUsuario: () => void;
}

export const GestionUsuariosTable: React.FC<GestionUsuariosTableProps> = ({
  usuarios,
  loading,
  onEditarUsuario,
  onAccionRapidaSeguridad,
  onEliminarUsuario,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('todos');
  const [filtroEstadoSeguridad, setFiltroEstadoSeguridad] = useState<
    'todos' | 'activos' | 'inactivos' | 'bloqueados' | 'cambio_pendiente' | 'eliminables'
  >('todos');
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [usuarioPorEliminar, setUsuarioPorEliminar] = useState<User | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const totalActivos = usuarios.filter((u) => u.isActive !== false).length;
  const totalInactivos = usuarios.filter((u) => u.isActive === false).length;
  const totalBloqueados = usuarios.filter((u) => u.passwordBloqueada).length;
  const totalCambioPendiente = usuarios.filter(
    (u) => !u.passwordBloqueada && u.debeCambiarPassword
  ).length;
  const totalEliminables = usuarios.filter((u) => u.puedeEliminar).length;

  const filtrados = usuarios.filter((u) => {
    if (filtroRol !== 'todos' && u.rol !== filtroRol) return false;
    if (filtroEstadoSeguridad === 'activos' && u.isActive === false) return false;
    if (filtroEstadoSeguridad === 'inactivos' && u.isActive !== false) return false;
    if (filtroEstadoSeguridad === 'bloqueados' && !u.passwordBloqueada) return false;
    if (
      filtroEstadoSeguridad === 'cambio_pendiente' &&
      (u.passwordBloqueada || !u.debeCambiarPassword)
    ) {
      return false;
    }
    if (filtroEstadoSeguridad === 'eliminables' && !u.puedeEliminar) return false;

    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return [u.nombreCompleto, u.rut, u.email, u.departamento].some((v) =>
      (v || '').toLowerCase().includes(q)
    );
  });

  const ejecutarAccionRapida = async (
    u: User,
    payload: Record<string, unknown>,
    mensaje: string
  ) => {
    if (!onAccionRapidaSeguridad) return;
    setProcesandoId(u.id);
    try {
      await onAccionRapidaSeguridad(u.id, payload, mensaje);
    } finally {
      setProcesandoId(null);
    }
  };

  const confirmarEliminacion = async () => {
    if (!usuarioPorEliminar || !onEliminarUsuario) return;
    setEliminando(true);
    try {
      await onEliminarUsuario(usuarioPorEliminar);
      setUsuarioPorEliminar(null);
    } finally {
      setEliminando(false);
    }
  };

  const renderBadgePassword = (u: User) => {
    const intentos = u.intentosFallidos || 0;

    if (u.passwordBloqueada) {
      return (
        <div className="inline-flex flex-col items-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            Bloqueada
          </span>
          <span className="text-[10px] text-rose-500 font-medium mt-0.5">
            {intentos >= 5 ? `${intentos}/5 intentos fallidos` : 'Bloqueo de seguridad'}
          </span>
        </div>
      );
    }

    if (u.debeCambiarPassword) {
      return (
        <div className="inline-flex flex-col items-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Clave Temporal
          </span>
          <span className="text-[10px] text-amber-600 font-medium mt-0.5">
            Debe cambiar al iniciar
          </span>
        </div>
      );
    }

    return (
      <div className="inline-flex flex-col items-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Vigente
        </span>
        {intentos > 0 ? (
          <span className="text-[10px] text-amber-600 font-semibold mt-0.5">
            {intentos}/5 intentos fallidos
          </span>
        ) : u.ultimoCambioPassword ? (
          <span className="text-[10px] text-slate-400 mt-0.5">
            Act: {u.ultimoCambioPassword.slice(0, 10)}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Estado de Socios, Roles y Seguridad de Contraseñas
          </h2>
          <p className="text-xs text-slate-500">
            Supervisión del estado de cada socio (Activo / Inactivo), rol, control de contraseñas y eliminación de cuentas nuevas sin historial.
          </p>
        </div>

        {/* Resumen rápido de estados */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() =>
              setFiltroEstadoSeguridad(filtroEstadoSeguridad === 'activos' ? 'todos' : 'activos')
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
              filtroEstadoSeguridad === 'activos'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Activos: <strong>{totalActivos}</strong>
          </button>

          <button
            type="button"
            onClick={() =>
              setFiltroEstadoSeguridad(
                filtroEstadoSeguridad === 'inactivos' ? 'todos' : 'inactivos'
              )
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
              filtroEstadoSeguridad === 'inactivos'
                ? 'bg-slate-700 text-white border-slate-700'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Inactivos: <strong>{totalInactivos}</strong>
          </button>

          <button
            type="button"
            onClick={() =>
              setFiltroEstadoSeguridad(
                filtroEstadoSeguridad === 'cambio_pendiente' ? 'todos' : 'cambio_pendiente'
              )
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
              filtroEstadoSeguridad === 'cambio_pendiente'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/70'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Clave Temporal: <strong>{totalCambioPendiente}</strong>
          </button>

          <button
            type="button"
            onClick={() =>
              setFiltroEstadoSeguridad(
                filtroEstadoSeguridad === 'bloqueados' ? 'todos' : 'bloqueados'
              )
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
              filtroEstadoSeguridad === 'bloqueados'
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/70'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Bloqueadas: <strong>{totalBloqueados}</strong>
          </button>

          <button
            type="button"
            onClick={() =>
              setFiltroEstadoSeguridad(
                filtroEstadoSeguridad === 'eliminables' ? 'todos' : 'eliminables'
              )
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
              filtroEstadoSeguridad === 'eliminables'
                ? 'bg-sky-700 text-white border-sky-700'
                : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100/70'
            }`}
            title="Usuarios recién creados sin descuentos por planilla ni solicitudes gestionadas"
          >
            Sin Historial (Eliminables): <strong>{totalEliminables}</strong>
          </button>
        </div>
      </div>

      {/* Barra de filtros por rol y buscador */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {['todos', 'socio', 'presidente', 'secretario', 'tesorero', 'admin', 'auditor'].map(
            (rol) => (
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
            )
          )}
        </div>

        <input
          type="search"
          placeholder="Buscar por nombre, RUT o correo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none w-full sm:w-72"
        />
      </div>

      {loading ? (
        <p className="p-8 text-center text-sm text-slate-400">Cargando estado de socios...</p>
      ) : filtrados.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-400 italic">
          No se encontraron usuarios para el filtro seleccionado.
        </p>
      ) : (
        <>
          {/* Vista Móvil */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filtrados.map((u) => {
              const activo = u.isActive !== false;
              return (
                <div key={u.id} className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-800 text-sm block">
                        {u.nombreCompleto}
                      </span>
                      <span className="text-[11px] text-slate-400 block font-mono">
                        {u.rut} • {u.email}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                        u.rol === 'superusuario'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : u.rol === 'socio'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {u.rolLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Estado Socio
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          activo
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            activo ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Contraseña
                      </span>
                      {renderBadgePassword(u)}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    {u.passwordBloqueada && (
                      <button
                        type="button"
                        disabled={procesandoId === u.id}
                        onClick={() =>
                          ejecutarAccionRapida(
                            u,
                            { password_bloqueada: false },
                            `Contraseña de ${u.nombreCompleto} desbloqueada exitosamente.`
                          )
                        }
                        className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                      >
                        🔓 Desbloquear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEditarUsuario(u, 'reset_password')}
                      className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition"
                    >
                      🔑 Restablecer Clave
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditarUsuario(u, 'general')}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                    >
                      Editar / Rol
                    </button>
                    {u.puedeEliminar ? (
                      <button
                        type="button"
                        onClick={() => setUsuarioPorEliminar(u)}
                        className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                      >
                        🗑 Eliminar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          alert(
                            u.motivoNoEliminable ||
                              'Este usuario ya registra historial de descuentos o gestiones y no puede eliminarse.'
                          )
                        }
                        className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        🔒 Con Historial
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vista Desktop: Tabla Limpia y Enfocada */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold uppercase">
                  <th className="py-3 px-4">Socio / Funcionario</th>
                  <th className="py-3 px-4">RUT</th>
                  <th className="py-3 px-4">Rol Asignado</th>
                  <th className="py-3 px-4 text-center">Estado del Socio</th>
                  <th className="py-3 px-4 text-center">Estado de Contraseña</th>
                  <th className="py-3 px-4 text-right">Gestión de Clave, Rol y Cuenta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((u) => {
                  const activo = u.isActive !== false;
                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/60 transition ${
                        !activo ? 'opacity-75 bg-slate-50/40' : ''
                      }`}
                    >
                      {/* Socio / Funcionario */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">
                            {u.nombreCompleto}
                          </span>
                          {u.puedeEliminar && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200"
                              title="Sin descuentos por planilla ni gestiones realizadas"
                            >
                              Sin historial
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block">
                          {u.email} • {u.departamento}
                        </span>
                      </td>

                      {/* RUT */}
                      <td className="py-3.5 px-4 font-mono text-slate-600">{u.rut}</td>

                      {/* Rol Asignado */}
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

                      {/* Estado del Socio (Activo / Inactivo) */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          disabled={procesandoId === u.id}
                          onClick={() =>
                            ejecutarAccionRapida(
                              u,
                              { is_active: !activo },
                              `Estado de ${u.nombreCompleto} cambiado a ${!activo ? 'ACTIVO' : 'INACTIVO'}.`
                            )
                          }
                          title="Clic para cambiar entre Activo e Inactivo"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                            activo
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              activo ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>

                      {/* Estado de la Contraseña */}
                      <td className="py-3.5 px-4 text-center">{renderBadgePassword(u)}</td>

                      {/* Acciones de Seguridad, Rol y Eliminación */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {u.passwordBloqueada && (
                            <button
                              type="button"
                              disabled={procesandoId === u.id}
                              onClick={() =>
                                ejecutarAccionRapida(
                                  u,
                                  { password_bloqueada: false },
                                  `Contraseña de ${u.nombreCompleto} desbloqueada y contador de intentos reiniciado.`
                                )
                              }
                              className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                              title="Desbloquear contraseña sin cambiarla"
                            >
                              🔓 Desbloquear
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onEditarUsuario(u, 'reset_password')}
                            className="px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition"
                            title="Asignar una contraseña temporal para que el socio la cambie al iniciar sesión"
                          >
                            🔑 Restablecer Clave
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditarUsuario(u, 'general')}
                            className="px-3 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                          >
                            Editar / Rol
                          </button>

                          {u.puedeEliminar ? (
                            <button
                              type="button"
                              onClick={() => setUsuarioPorEliminar(u)}
                              className="px-2.5 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                              title="Eliminar usuario (permitido porque no registra descuentos ni gestiones)"
                            >
                              🗑 Eliminar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                alert(
                                  u.motivoNoEliminable ||
                                    'Este socio ya cuenta con historial de descuentos o gestiones y no puede ser eliminado.'
                                )
                              }
                              title={
                                u.motivoNoEliminable ||
                                'No eliminable por contar con historial contable o de gestiones'
                              }
                              className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg transition cursor-help"
                            >
                              🔒 Con Historial
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal de Confirmación de Eliminación Segura (Solo Usuarios Sin Historial) */}
      {usuarioPorEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-lg font-bold">
                  🗑
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                    Eliminación de Cuenta Sin Historial
                  </span>
                  <h3 className="text-base font-extrabold text-slate-800">
                    ¿Eliminar a {usuarioPorEliminar.nombreCompleto}?
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUsuarioPorEliminar(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">RUT:</span>
                <span className="font-mono font-bold text-slate-800">{usuarioPorEliminar.rut}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Correo:</span>
                <span className="font-semibold text-slate-700">{usuarioPorEliminar.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rol:</span>
                <span className="font-semibold text-slate-700">{usuarioPorEliminar.rolLabel}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <p className="font-bold">✔ Verificación de Historial Contable Superada:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li><strong>0 meses</strong> de descuentos por planilla ejecutados.</li>
                <li><strong>0 solicitudes</strong> de reembolsos médicos o bonos gestionadas.</li>
                <li>Su eliminación quedará registrada en la Bitácora de Auditoría y liberará su RUT.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUsuarioPorEliminar(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={eliminando}
                onClick={confirmarEliminacion}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition disabled:opacity-50"
              >
                {eliminando ? 'Eliminando...' : 'Sí, Eliminar Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
