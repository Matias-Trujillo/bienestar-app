'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { User, AdminStats, ParametroSistemaItem, BonoFormData } from '@/types';
import { AdminDashboardHeader } from '@/components/admin/AdminDashboardHeader';
import { GestionUsuariosTable } from '@/components/admin/GestionUsuariosTable';
import { AuditLogViewer, AuditLogItem } from '@/components/admin/AuditLogViewer';
import { ModalEditarUsuario } from '@/components/admin/ModalEditarUsuario';
import { CatalogoBonosAdmin, BonoAdminItem } from '@/components/admin/CatalogoBonosAdmin';
import { ModalCrearEditarBono } from '@/components/admin/ModalCrearEditarBono';
import {
  ModalCargaMasivaSocios,
  esCuentaAutorizadaCargaMasiva,
} from '@/components/admin/ModalCargaMasivaSocios';

type TabAdmin = 'usuarios' | 'bonos' | 'auditoria' | 'parametros';

export default function AdminPage() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState<TabAdmin>('usuarios');

  // Estados de datos
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [bonos, setBonos] = useState<BonoAdminItem[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [parametros, setParametros] = useState<ParametroSistemaItem[]>([]);

  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingBonos, setLoadingBonos] = useState(true);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Modales
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<User | null>(null);
  const [modoModalUsuario, setModoModalUsuario] = useState<'general' | 'reset_password'>('general');
  const [bonoSeleccionado, setBonoSeleccionado] = useState<BonoAdminItem | null>(null);
  const [modalBonoOpen, setModalBonoOpen] = useState(false);
  const [modalCargaMasivaOpen, setModalCargaMasivaOpen] = useState(false);
  const puedeCargaMasiva = esCuentaAutorizadaCargaMasiva(user?.email, user?.rut);

  // Estado formulario rápido SMTP
  const [smtpUser, setSmtpUser] = useState('bperalillo@gmail.com');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpDestinatarioPrueba, setSmtpDestinatarioPrueba] = useState('fabian_07915@hotmail.com');
  const [probandoSmtp, setProbandoSmtp] = useState(false);
  const [resultadoSmtp, setResultadoSmtp] = useState<{ ok: boolean; msg: string } | null>(null);

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
      const data = await fetchFromApi<AdminStats>('/admin/stats', { headers: authHeaders });
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
      const data = await fetchFromApi<ParametroSistemaItem[]>('/admin/parametros', { headers: authHeaders });
      setParametros(data);
      const u = data.find((p) => p.clave === 'SMTP_USER')?.valor || '';
      const pwd = data.find((p) => p.clave === 'SMTP_PASSWORD')?.valor || '';
      const h = data.find((p) => p.clave === 'SMTP_HOST')?.valor || 'smtp.gmail.com';
      const prt = data.find((p) => p.clave === 'SMTP_PORT')?.valor || '587';
      if (u && !u.toLowerCase().includes('@hotmail.')) {
        setSmtpUser(u);
        if (h) setSmtpHost(h);
      } else {
        setSmtpUser('bperalillo@gmail.com');
        setSmtpHost('smtp.gmail.com');
      }
      if (pwd) setSmtpPassword(pwd);
      if (prt) setSmtpPort(prt);
    } catch {}
  }, [token]);

  const handleGuardarYProbarSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResultadoSmtp(null);
    setProbandoSmtp(true);
    try {
      const res = await fetchFromApi<{ enviado: boolean; mensaje: string; smtp_host: string }>(
        '/admin/smtp-config',
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            smtp_host: smtpHost,
            smtp_port: Number(smtpPort) || 587,
            smtp_user: smtpUser,
            smtp_password: smtpPassword,
            destinatario_prueba: smtpDestinatarioPrueba,
          }),
        }
      );
      setSmtpHost(res.smtp_host);
      setResultadoSmtp({ ok: res.enviado, msg: res.mensaje });
      await cargarParametros();
    } catch (err: unknown) {
      setResultadoSmtp({ ok: false, msg: getErrorMessage(err) || 'Error al probar conexión SMTP.' });
    } finally {
      setProbandoSmtp(false);
    }
  };

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

  const handleGuardarUsuario = async (id: string, payload: Record<string, unknown>) => {
    await fetchFromApi(`/admin/usuarios/${id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    setMensajeExito(
      payload.nueva_password
        ? 'Contraseña restablecida y desbloqueada. El socio deberá crear su propia clave al iniciar sesión.'
        : 'Estado del socio, rol y seguridad actualizados en la bitácora de auditoría.'
    );
    setTimeout(() => setMensajeExito(null), 6000);
    await cargarUsuarios();
    await cargarStats();
  };

  const handleAccionRapidaSeguridad = async (
    id: string,
    payload: Record<string, unknown>,
    mensajeConfirmacion: string
  ) => {
    await fetchFromApi(`/admin/usuarios/${id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    setMensajeExito(mensajeConfirmacion);
    setTimeout(() => setMensajeExito(null), 5000);
    await cargarUsuarios();
    await cargarStats();
  };

  const handleEliminarUsuario = async (u: User) => {
    try {
      const res = await fetchFromApi<{ mensaje: string }>(`/admin/usuarios/${u.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      setMensajeExito(res.mensaje || `Usuario ${u.nombreCompleto} eliminado exitosamente.`);
      setTimeout(() => setMensajeExito(null), 6000);
      await cargarUsuarios();
      await cargarStats();
      await cargarAuditLogs();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'No se pudo eliminar el usuario.');
    }
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
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Error al actualizar');
    }
  };

  const handleCrearEditarBono = async (data: BonoFormData, isEditing: boolean, bonoId?: number) => {
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
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Error al cambiar estado');
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
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'Error al eliminar beneficio');
    }
  };

  const esAdminOSuper =
    user?.rol === 'admin' || user?.rol === 'superusuario' || Boolean(user?.isSuperuser);

  if (!esAdminOSuper) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Acceso Restringido</h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          El módulo de Administración está reservado exclusivamente para Administradores y Superusuarios del Comité de Bienestar.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition shadow-sm"
        >
          Volver al Inicio
        </Link>
      </div>
    );
  }

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
            👥 Usuarios, Roles y Claves
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

        <div className="flex items-center gap-2">
          {puedeCargaMasiva && (
            <button
              type="button"
              onClick={() => setModalCargaMasivaOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0f2942] hover:bg-[#006799] rounded-xl transition shadow-sm cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-sky-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Carga Masiva (Socios y Cargas)</span>
            </button>
          )}
          <Link
            href="/"
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition"
          >
            ← Volver al Dashboard
          </Link>
        </div>
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

      {/* Pestaña 2: Usuarios, Roles y Estado de Contraseñas */}
      {tab === 'usuarios' && (
        <GestionUsuariosTable
          usuarios={usuarios}
          loading={loadingUsuarios}
          onEditarUsuario={(u, modo = 'general') => {
            setModoModalUsuario(modo);
            setUsuarioSeleccionado(u);
          }}
          onAccionRapidaSeguridad={handleAccionRapidaSeguridad}
          onEliminarUsuario={handleEliminarUsuario}
          onNuevoUsuario={() => setModalCargaMasivaOpen(true)}
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
        <div className="space-y-6">
          {/* Panel Unificado de Configuración de Correo Real (SMTP) */}
          <form
            onSubmit={handleGuardarYProbarSmtp}
            className="bg-gradient-to-br from-slate-900 via-[#091e2e] to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
                  Despacho de Correos Reales a Internet (Gmail / Hotmail / Outlook)
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                  ✉️ Configuración de Casilla Emisora del Sistema (SMTP)
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Para que los correos lleguen al buzón real (ej: <code>fabian_07915@hotmail.com</code>), ingrese aquí la cuenta emisora y su Contraseña de Aplicación.
                </p>
              </div>
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-sky-300 transition"
              >
                🔑 Crear Contraseña de Aplicación Google (16 letras) ↗
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  1. Correo Emisor del Sistema (Gmail o Corporativo) *
                </label>
                <input
                  type="email"
                  required
                  value={smtpUser}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSmtpUser(val);
                    if (val.toLowerCase().endsWith('@gmail.com')) setSmtpHost('smtp.gmail.com');
                    if (val.toLowerCase().includes('@hotmail.') || val.toLowerCase().includes('@outlook.')) {
                      setSmtpHost('smtp-mail.outlook.com');
                    }
                  }}
                  placeholder="tucorreo@gmail.com o notificaciones@tudominio.cl"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  2. Contraseña SMTP / Contraseña de Aplicación Google (16 letras) *
                </label>
                <input
                  type="password"
                  required
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  3. Servidor y Puerto SMTP
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="min-w-0 flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs"
                  />
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                    className="w-20 flex-shrink-0 px-2 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-center text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                  4. Enviar correo de prueba a (tu bandeja de entrada):
                </label>
                <input
                  type="email"
                  required
                  value={smtpDestinatarioPrueba}
                  onChange={(e) => setSmtpDestinatarioPrueba(e.target.value)}
                  placeholder="fabian_07915@hotmail.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-emerald-500/40 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {resultadoSmtp && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold border ${
                  resultadoSmtp.ok
                    ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                }`}
              >
                {resultadoSmtp.ok ? '✔ ' : '⚠ '}
                {resultadoSmtp.msg}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
              <p className="text-[11px] text-slate-400">
                Nota: Si usa Gmail, genere la clave de 16 letras en el botón superior derecho y péguela en el campo 2.
              </p>
              <button
                type="submit"
                disabled={probandoSmtp}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {probandoSmtp
                  ? 'Probando conexión y enviando correo...'
                  : '📨 Guardar Todo y Enviar Correo de Prueba Ahora'}
              </button>
            </div>
          </form>

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
                      type={p.clave === 'SMTP_PASSWORD' ? 'password' : 'text'}
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
        </div>
      )}

      {/* Modal Editar Usuario, Estado y Seguridad de Contraseña */}
      <ModalEditarUsuario
        usuario={usuarioSeleccionado}
        modoInicial={modoModalUsuario}
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

      {/* Modal Carga Masiva de Socios y Cargas Familiares (Exclusivo 7 cuentas Muni Peralillo) */}
      <ModalCargaMasivaSocios
        isOpen={modalCargaMasivaOpen}
        onClose={() => setModalCargaMasivaOpen(false)}
        token={token}
        onSuccess={async () => {
          await cargarUsuarios();
          await cargarStats();
          await cargarAuditLogs();
        }}
      />
    </div>
  );
}
