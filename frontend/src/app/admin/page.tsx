'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { User } from '@/types';

const MESES_CARENCIA = 6;

/** Convierte '5 Años, 4 Meses' a meses (misma lógica que el backend). */
function antiguedadAMeses(texto: string): number {
  const t = (texto || '').toLowerCase();
  const anios = t.match(/(\d+)\s*a[ñn]o/);
  const meses = t.match(/(\d+)\s*mes/);
  return (anios ? parseInt(anios[1], 10) * 12 : 0) + (meses ? parseInt(meses[1], 10) : 0);
}

type Filtro = 'socios' | 'todos' | 'carencia' | 'habilitados';

function SociosTable() {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('socios');

  useEffect(() => {
    if (!token) return;
    fetchFromApi<User[]>('/auth/usuarios', { headers: { Authorization: `Bearer ${token}` } })
      .then(setUsuarios)
      .catch(() => setError('No tiene permisos para ver el listado o el servidor no responde.'))
      .finally(() => setLoading(false));
  }, [token]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return usuarios.filter((u) => {
      const meses = antiguedadAMeses(u.antiguedad);
      if (filtro === 'socios' && u.rol !== 'socio') return false;
      if (filtro === 'carencia' && !(u.rol === 'socio' && meses < MESES_CARENCIA)) return false;
      if (filtro === 'habilitados' && !(u.rol === 'socio' && meses >= MESES_CARENCIA)) return false;
      if (!q) return true;
      return [u.nombreCompleto, u.rut, u.email, u.departamento].some((v) => v.toLowerCase().includes(q));
    });
  }, [usuarios, busqueda, filtro]);

  const filtros: { key: Filtro; label: string }[] = [
    { key: 'socios', label: 'Socios' },
    { key: 'habilitados', label: 'Habilitados (≥ 6 meses)' },
    { key: 'carencia', label: 'En carencia (< 6 meses)' },
    { key: 'todos', label: 'Todos los usuarios' },
  ];
  const th = 'text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3';

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden" id="admin-socios">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-800">Listado de Socios</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">{filtrados.length} registro(s) mostrados de {usuarios.length}</p>
        </div>
        <input
          id="input-buscar-socio"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, RUT, correo o departamento…"
          className="w-full lg:w-80 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-1.5 px-5 py-3 border-b border-slate-100">
        {filtros.map((f) => (
          <button
            key={f.key}
            id={`filtro-${f.key}`}
            onClick={() => setFiltro(f.key)}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
              filtro === f.key ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="p-8 text-center text-sm text-slate-400">Cargando…</p>
      ) : error ? (
        <p className="p-8 text-center text-sm text-rose-600">{error}</p>
      ) : filtrados.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-400">No hay registros que coincidan.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/60">
                <th className={th}>Nombre</th>
                <th className={th}>RUT</th>
                <th className={th}>Rol</th>
                <th className={th}>Departamento</th>
                <th className={th}>Antigüedad</th>
                <th className={th}>Reembolsos</th>
                <th className={th}>Estado previsional</th>
                <th className={`${th} text-right`}>Saldo salud</th>
                <th className={`${th} text-center`}>Cargas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((u) => {
                const meses = antiguedadAMeses(u.antiguedad);
                const habilitado = meses >= MESES_CARENCIA;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="block text-xs font-semibold text-slate-800">{u.nombreCompleto}</span>
                      <span className="block text-[11px] text-slate-400">{u.email}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">{u.rut}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">{u.rolLabel}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">{u.departamento}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">{u.antiguedad}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
                          habilitado
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {habilitado ? 'Habilitado' : 'En carencia'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">{u.estadoPrevisional}</td>
                    <td className="px-5 py-3.5 text-right text-xs font-semibold text-slate-700">
                      {formatCurrency(u.saldoSaludDisponible)} / {formatCurrency(u.saldoSaludTotalAnual)}
                    </td>
                    <td className="px-5 py-3.5 text-center text-xs text-slate-600">{u.cargasRegistradas}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Panel de Administración</h1>
          <p className="text-xs text-slate-500">Configuración global, gestión de directiva y aprobaciones</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition"
        >
          ← Volver al Dashboard
        </Link>
      </div>

      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800">Parámetros del Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1">Tope Anual Fondo de Salud</span>
            <span className="text-lg font-bold text-slate-800">$250.000 CLP</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1">Porcentaje Cobertura Farmacia</span>
            <span className="text-lg font-bold text-slate-800">60%</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1">Socios Activos Registrados</span>
            <span className="text-lg font-bold text-emerald-700">142 Socios</span>
          </div>
        </div>
      </div>

      <SociosTable />
    </div>
  );
}
