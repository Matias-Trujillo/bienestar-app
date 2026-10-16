'use client';

import React from 'react';
import Link from 'next/link';

export default function AfiliacionPage() {
  const cargas = [
    { id: 1, nombre: 'Valentina Valenzuela Gómez', parentesco: 'Hija', rut: '24.120.334-1', edad: '7 años', estado: 'Vigente' },
    { id: 2, nombre: 'Matías Valenzuela Gómez', parentesco: 'Hijo', rut: '26.445.892-3', edad: '4 años', estado: 'Vigente' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Afiliación y Cargas Familiares</h1>
          <p className="text-xs text-slate-500">Gestión de datos del titular y beneficiarios del Comité</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition"
        >
          ← Volver al Dashboard
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800">Cargas Familiares Reconocidas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold uppercase">
                <th className="py-3 px-4">Nombre Completo</th>
                <th className="py-3 px-4">Parentesco</th>
                <th className="py-3 px-4">RUT</th>
                <th className="py-3 px-4">Edad</th>
                <th className="py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargas.map((carga) => (
                <tr key={carga.id}>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{carga.nombre}</td>
                  <td className="py-3.5 px-4 text-slate-600">{carga.parentesco}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{carga.rut}</td>
                  <td className="py-3.5 px-4 text-slate-600">{carga.edad}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {carga.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
