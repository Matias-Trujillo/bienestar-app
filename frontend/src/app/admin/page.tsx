'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';
import { User } from '@/types';
import { AdminDashboardHeader } from '@/components/admin/AdminDashboardHeader';
import { GestionUsuariosTable } from '@/components/admin/GestionUsuariosTable';
import { AuditLogViewer, AuditLogItem } from '@/components/admin/AuditLogViewer';
import { ModalEditarUsuario } from '@/components/admin/ModalEditarUsuario';
import { CatalogoBonosAdmin, BonoAdminItem } from '@/components/admin/CatalogoBonosAdmin';
import { ModalCrearEditarBono } from '@/components/admin/ModalCrearEditarBono';

type TabAdmin = 'usuarios' | 'bonos' | 'auditoria' | 'parametros';

export default function AdminPage() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState<TabAdmin>('bonos');

  // Estados de datos
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [bonos, setBonos] = useState<BonoAdminItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [parametros, setParametros] = useState<{ clave: string; valor: string; descripcion?: string }[]>([]);

  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingBonos, setLoadingBonos] = useState(true);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Modales
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<User | null>(null);
  const [bonoSeleccionado, setBonoSeleccionado] = useState<BonoAdminItem | null>(null);
  const [modalBonoOpen, setModalBonoOpen] = useState(false);

  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const sueldoBaseG15 = Number(
    parametros.find((p) => p.clave === 'SUELDO_BASE_GRADO_15')?.valor || 750000
  );

  const cargarUsuarios = useCallback(async () => {
    if (!token) return;
    setLoadingUsuarios(true);
    try {
      const data = await fetchFromApi<User[]>('/auth/usuarios', { headers: authHeaders });
      setUsuarios(data);
    } catch {
    } finally {
      setLoadingUsuarios(false);
    }
  }, [token]);

  const cargarBonos = useCallback(async () => {
    if (!token) return;
    setLoadingBonos(true);
    try {
      const data = await fetchFromApi<BonoAdminItem[]>('/admin/bonos', { headers: authHeaders });
      setBonos(data);
    } catch {
      setBonos([]);
    } finally {
      setLoadingBonos(false);
    }
  }, [token]);

  const cargarStats = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchFromApi<any>('/admin/stats', { headers: authHeaders });
      setStats(data);
    } catch {}
  }, [token]);

  const cargarAuditLogs = useCallback(async () => {
    if (!token) return;
    setLoadingLogs(true);
    try {
      const data = await fetchFromApi<AuditLogItem[]>('/admin/audit-logs?limit=150', { headers: authHeaders });
      setAuditLogs(data);
    } catch {
      setAuditLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, [token]);

  const cargarParametros = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchFromApi<any[]>('/admin/parametros', { headers: authHeaders });
      setParametros(data);
    } catch {}
  }, [token]);

  useEffect(() => {
    cargarUsuarios();
    cargarBonos();
    cargarStats();
    cargarParametros();
  }, [cargarUsuarios, cargarBonos, cargarStats, cargarParametros]);

  useEffect(() => {
    if (tab === 'auditoria') {
      cargarAuditLogs();
    }
  }, [tab, cargarAuditLogs]);

  const handleGuardarUsuario = async (id: string, payload: any) => {
    await fetchFromApi(`/admin/usuarios/${id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    setMensajeExito('Usuario actualizado y evento registrado en la bitácora de auditoría.');
    setTimeout(() => setMensajeExito(null), 5000);
    await cargarUsuarios();
    await cargarStats();
  };

  const handleActualizarParametro = async (clave: string, valor: string) => {
    try {
      await fetchFromApi('/admin/parametros', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ clave, valor }),
      });
      setMensajeExito(`Parámetro "${clave}" actualizado con trazabilidad de auditoría.`);
      setTimeout(() => setMensajeExito(null), 5000);
      await cargarParametros();
      await cargarBonos();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar');
    }
  };

  const handleCrearEditarBono = async (data: any, isEditing: boolean, bonoId?: number) => {
    if (isEditing && bonoId) {
      await fetchFromApi(`/admin/bonos/${bonoId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(data),
      });
      setMensajeExito(`Beneficio "${data.nombre}" actualizado con éxito en el Catálogo de Beneficios.`);
    } else {
      await fetchFromApi('/admin/bonos', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(data),
      });
      setMensajeExito(`¡Nuevo Beneficio "${data.nombre}" creado y activado en Beneficios Sociales!`);
    }
    setTimeout(() => setMensajeExito(null), 6000);
    await cargarBonos();
  };

  const handleToggleActivoBono = async (b: BonoAdminItem) => {
    try {
      await fetchFromApi(`/admin/bonos/${b.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ activo: !b.activo }),
      });
      setMensajeExito(`Bono "${b.nombre}" ahora está ${!b.activo ? 'VISIBLE' : 'OCULTO'} en el portal de socios.`);
      setTimeout(() => setMensajeExito(null), 5000);
      await cargarBonos();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    }
  };

  const handleEliminarBono = async (b: BonoAdminItem) => {
    const confirmar = window.confirm(
      `¿Está seguro de que desea eliminar el beneficio "${b.nombre}" (código: ${b.codigo})?\n\n` +
      `Si este beneficio no tiene solicitudes de socios asociadas, será borrado del catálogo. ` +
      `Si ya cuenta con solicitudes históricas, el sistema le sugerirá desactivarlo para mantener la integridad contable.`
    );
    if (!confirmar) return;

    try {
      await fetchFromApi(`/admin/bonos/${b.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      setMensajeExito(`Beneficio "${b.nombre}" eliminado exitosamente del catálogo.`);
      setTimeout(() => setMensajeExito(null), 5000);
      await cargarBonos();
      await cargarAuditLogs();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar beneficio');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Encabezado y Métricas */}
      <AdminDashboardHeader
        stats={stats}
        onRefresh={() => {
          cargarUsuarios();
          cargarBonos();
          cargarStats();
          cargarAuditLogs();
          cargarParametros();
        }}
      />

      {mensajeExito && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span>✔</span>
            <span>{mensajeExito}</span>
          </div>
          <button onClick={() => setMensajeExito(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Navegación por Pestañas */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setTab('bonos')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              tab === 'bonos'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            🎁 Catálogo de Beneficios & %
            {bonos.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${tab === 'bonos' ? 'bg-white text-blue-900' : 'bg-blue-100 text-blue-800'}`}>
                {bonos.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('usuarios')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              tab === 'usuarios'
                ? 'bg-purple-700 text-white shadow-md shadow-purple-700/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            👥 Usuarios & Roles
          </button>

          <button
            onClick={() => setTab('auditoria')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              tab === 'auditoria'
                ? 'bg-purple-700 text-white shadow-md shadow-purple-700/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            📜 Bitácora de Auditoría (Logs)
            {stats && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${tab === 'auditoria' ? 'bg-white text-purple-900' : 'bg-purple-100 text-purple-800'}`}>
                {stats.auditoria.total_eventos}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('parametros')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              tab === 'parametros'
                ? 'bg-purple-700 text-white shadow-md shadow-purple-700/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            ⚙ Parámetros Base
          </button>
        </div>

        <Link
          href="/"
          className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition"
        >
          ← Volver al Dashboard
        </Link>
      </div>

      {/* Pestaña 1: Catálogo de Bonos Dinámico */}
      {tab === 'bonos' && (
        <CatalogoBonosAdmin
          bonos={bonos}
          sueldoBaseG15={sueldoBaseG15}
          loading={loadingBonos}
          onCrearBono={() => {
            setBonoSeleccionado(null);
            setModalBonoOpen(true);
          }}
          onEditarBono={(b) => {
            setBonoSeleccionado(b);
            setModalBonoOpen(true);
          }}
          onToggleActivo={handleToggleActivoBono}
          onEliminarBono={handleEliminarBono}
        />
      )}

      {/* Pestaña 2: Usuarios y Roles */}
      {tab === 'usuarios' && (
        <GestionUsuariosTable
          usuarios={usuarios}
          loading={loadingUsuarios}
          onEditarUsuario={(u) => setUsuarioSeleccionado(u)}
          onNuevoUsuario={() => alert('Función: puede invitar o crear usuario directamente en base de datos o formulario.')}
        />
      )}

      {/* Pestaña 3: Bitácora de Auditoría Inmutable */}
      {tab === 'auditoria' && (
        <AuditLogViewer
          logs={auditLogs}
          loading={loadingLogs}
          onRefresh={cargarAuditLogs}
        />
      )}

      {/* Pestaña 4: Parámetros del Sistema */}
      {tab === 'parametros' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Parámetros Globales del Sistema</h2>
            <p className="text-xs text-slate-500">
              Modificación de bases imponibles y reglas operativas sin reiniciar contenedores ni modificar código.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parametros.map((p) => (
              <div key={p.clave} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-slate-800">{p.clave}</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">Activo</span>
                </div>
                <p className="text-xs text-slate-500">{p.descripcion || 'Sin descripción'}</p>
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    defaultValue={p.valor}
                    id={`param-${p.clave}`}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById(`param-${p.clave}`) as HTMLInputElement;
                      if (input) handleActualizarParametro(p.clave, input.value);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Editar Usuario y Asignar Rol */}
      <ModalEditarUsuario
        usuario={usuarioSeleccionado}
        onClose={() => setUsuarioSeleccionado(null)}
        onSubmit={handleGuardarUsuario}
      />

      {/* Modal Crear / Editar Bono Dinámico */}
      <ModalCrearEditarBono
        bono={bonoSeleccionado}
        isOpen={modalBonoOpen}
        onClose={() => {
          setModalBonoOpen(false);
          setBonoSeleccionado(null);
        }}
        onSubmit={handleCrearEditarBono}
      />
    </div>
  );
}
