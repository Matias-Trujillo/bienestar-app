'use client';

import React, { useState } from 'react';
import { Movimiento } from '../types';
import { formatCurrency, formatDate, getStatusBadgeStyle } from '../lib/utils';

const initialMovements: Movimiento[] = [
  {
    id: 'MOV-1029',
    fecha: '2026-03-28',
    concepto: 'Reembolso Farmacia (Receta Crónica)',
    modulo: 'Reembolsos Médicos',
    monto: 32500,
    estado: 'Aprobado',
    comprobanteUrl: '/comprobantes/MOV-1029.pdf',
    detalle: 'Boleta Salcobrand N° 459812 - Medicamentos hipertensión',
  },
  {
    id: 'MOV-1028',
    fecha: '2026-03-15',
    concepto: 'Bono Vacaciones Anual 2026',
    modulo: 'Beneficios Sociales',
    monto: 80000,
    estado: 'Pagado',
    comprobanteUrl: '/comprobantes/MOV-1028.pdf',
    detalle: 'Depósito directo en cuenta RUT BancoEstado',
  },
  {
    id: 'MOV-1027',
    fecha: '2026-02-20',
    concepto: 'Consulta Médica Especialista Oftalmología',
    modulo: 'Reembolsos Médicos',
    monto: 25000,
    estado: 'En Revisión',
    comprobanteUrl: '/comprobantes/MOV-1027.pdf',
    detalle: 'Clínica RedSalud - Pendiente de revisión por auditor médico',
  },
  {
    id: 'MOV-1026',
    fecha: '2026-01-10',
    concepto: 'Aporte Solidario Evento Extraordinario',
    modulo: 'Beneficios Sociales',
    monto: 15000,
    estado: 'Rechazado',
    comprobanteUrl: undefined,
    detalle: 'Documentación de respaldo incompleta tras plazo reglamentario',
  },
  {
    id: 'MOV-1025',
    fecha: '2025-12-18',
    concepto: 'Aguinaldo Navideño Comité',
    modulo: 'Beneficios Sociales',
    monto: 50000,
    estado: 'Pagado',
    comprobanteUrl: '/comprobantes/MOV-1025.pdf',
    detalle: 'Beneficio de fin de año entregado a socios con más de 1 año',
  },
];

export const MovementsTable: React.FC = () => {
  const [filter, setFilter] = useState<string>('Todos');
  const [search, setSearch] = useState<string>('');
  const [selectedReceipt, setSelectedReceipt] = useState<Movimiento | null>(null);

  const filteredMovements = initialMovements.filter((mov) => {
    const matchesFilter = filter === 'Todos' || mov.estado === filter;
    const matchesSearch =
      mov.concepto.toLowerCase().includes(search.toLowerCase()) ||
      mov.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Encabezado y Filtros */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800">
            Últimos Movimientos y Solicitudes
          </h2>
          <p className="text-xs text-slate-500">
            Historial de solicitudes de reembolsos y beneficios tramitados
          </p>
        </div>

        {/* Barra de herramientas: Búsqueda y Filtros de Estado */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Input de Búsqueda */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por concepto o ID..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 sm:w-56"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-2.5 top-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filtros de Pestañas */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-medium">
            {['Todos', 'Aprobado', 'Pagado', 'En Revisión'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filter === tab
                    ? 'bg-white text-slate-800 font-bold shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla Responsiva */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-6">Fecha</th>
              <th className="py-3.5 px-6">Concepto / Módulo</th>
              <th className="py-3.5 px-6 text-right">Monto</th>
              <th className="py-3.5 px-6 text-center">Estado</th>
              <th className="py-3.5 px-6 text-center">Comprobante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                  No se encontraron movimientos registrados para el filtro aplicado.
                </td>
              </tr>
            ) : (
              filteredMovements.map((mov) => {
                const badge = getStatusBadgeStyle(mov.estado);
                return (
                  <tr
                    key={mov.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Fecha */}
                    <td className="py-4 px-6 whitespace-nowrap text-xs text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{formatDate(mov.fecha)}</span>
                      </div>
                    </td>

                    {/* Concepto y Módulo */}
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800 group-hover:text-emerald-700 transition">
                        {mov.concepto}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {mov.id}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {mov.modulo}
                        </span>
                      </div>
                    </td>

                    {/* Monto */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <span className="font-bold text-slate-900">
                        {formatCurrency(mov.monto)}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {mov.estado}
                      </span>
                    </td>

                    {/* Comprobante */}
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      {mov.comprobanteUrl ? (
                        <button
                          onClick={() => setSelectedReceipt(mov)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition"
                          title="Ver Comprobante Digital"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>PDF</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          No adjunto
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pie de tabla con resumen de registros */}
      <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
        <span>Mostrando {filteredMovements.length} movimientos registrados</span>
        <span className="text-slate-400">Actualizado recientemente</span>
      </div>

      {/* Modal Visor de Comprobante Simulado */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">
                Comprobante Digital #{selectedReceipt.id}
              </h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="my-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Concepto:</span>
                <span className="font-semibold text-slate-800">{selectedReceipt.concepto}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha de Emisión:</span>
                <span className="font-semibold text-slate-800">{formatDate(selectedReceipt.fecha)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Monto Acreditado:</span>
                <span className="font-bold text-emerald-700 text-sm">{formatCurrency(selectedReceipt.monto)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Detalle / Respaldo:</span>
                <span className="text-slate-700 text-right">{selectedReceipt.detalle}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500">Firma Digital:</span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">VALIDADA (SHA-256)</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  alert(`Descargando comprobante oficial ${selectedReceipt.id}...`);
                  setSelectedReceipt(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
              >
                Descargar Archivo PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
