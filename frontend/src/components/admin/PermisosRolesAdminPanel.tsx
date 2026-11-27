'use client';

import React, { useState } from 'react';
import { Lock, ShieldCheck, ShieldOff } from 'lucide-react';
import { PermisoRolAdminItem } from '@/types';
import { getErrorMessage } from '@/lib/utils';

interface PermisosRolesAdminPanelProps {
  permisos: PermisoRolAdminItem[];
  loading: boolean;
  onTogglePermiso: (rol: string, nuevoEstado: boolean) => Promise<void>;
}

const DESCRIPCION_ROLES: Record<string, string> = {
  superusuario: 'Acceso total y permanente al módulo Administración y control de permisos por rol.',
  admin: 'Apoyo operativo general del Comité de Bienestar (requiere autorización del Superusuario).',
  presidente: 'Presidencia colegiada del Directorio de Bienestar.',
  secretario: 'Secretaría y gestión de actas/afiliaciones.',
  tesorero: 'Tesorería, pagos y control presupuestario.',
  auditor: 'Comisión Revisora de Cuentas / fiscalización.',
  socio: 'Funcionario afiliado sin funciones administrativas.',
};

function formatFecha(iso?: string | null): string {
  if (!iso) return 'Configuración inicial';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dt);
}

// [ESTUDIANTE INFORMÁTICA] Panel SRP exclusivo del Superusuario para habilitar o revocar el acceso a Administración por rol.
export const PermisosRolesAdminPanel: React.FC<PermisosRolesAdminPanelProps> = ({
  permisos,
  loading,
  onTogglePermiso,
}) => {
  const [actualizandoRol, setActualizandoRol] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleToggle = async (item: PermisoRolAdminItem) => {
    if (item.inmutable) return;
    setErrorMsg(null);
    setActualizandoRol(item.rol);
    try {
      await onTogglePermiso(item.rol, !item.puedeAccederAdmin);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err) || 'No se pudo actualizar el permiso del rol.');
    } finally {
      setActualizandoRol(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Exclusivo Superusuario • Control de Acceso en Base de Datos
          </span>
          <h2 className="text-base font-extrabold text-slate-900">
            Permisos de Acceso al Módulo Administración por Rol
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
            Solo el <strong>Superusuario</strong> tiene acceso por defecto. Si otro rol necesita ingresar a Administración, habilítalo aquí; los roles sin permiso no verán esta sección en el menú ni podrán acceder por API.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          ✕ {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">
          Cargando matriz de permisos por rol...
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {permisos.map((item) => {
            const cargandoEste = actualizandoRol === item.rol;
            return (
              <div
                key={item.rol}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{item.rolLabel}</span>
                    <span className="px-2 py-0.5 rounded-md font-mono text-[11px] bg-slate-100 text-slate-600 border border-slate-200">
                      {item.rol}
                    </span>
                    {item.puedeAccederAdmin ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-[#166534] border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        {item.inmutable ? 'Siempre Activo (Por defecto)' : 'Acceso Habilitado'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        <ShieldOff className="w-3 h-3" />
                        Sin Acceso (Oculto)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    {DESCRIPCION_ROLES[item.rol] || 'Rol del sistema.'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {item.otorgadoPorNombre
                      ? `Último cambio por ${item.otorgadoPorNombre} • ${formatFecha(item.updatedAt)}`
                      : `Estado inicial del sistema • ${formatFecha(item.updatedAt)}`}
                  </p>
                </div>

                <div className="shrink-0">
                  {item.inmutable ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200">
                      <Lock className="w-3.5 h-3.5" />
                      Protegido
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={cargandoEste}
                      onClick={() => handleToggle(item)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                        item.puedeAccederAdmin
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          : 'bg-gradient-to-r from-[#0c2b45] to-[#006799] text-white hover:opacity-95 shadow-2xs'
                      }`}
                    >
                      {cargandoEste
                        ? 'Guardando...'
                        : item.puedeAccederAdmin
                        ? 'Revocar Acceso'
                        : 'Permitir Acceso'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
