'use client';

import React, { useState } from 'react';
import { Movimiento } from '../types';
import { formatCurrency, formatDate, getStatusBadgeStyle } from '../lib/utils';

const INITIAL_MOVEMENTS: Movimiento[] = [
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

const FILTER_TABS = ['Todos', 'Aprobado', 'Pagado', 'En Revisión'] as const;

// [ESTUDIANTE INFORMÁTICA] Modal moderno de comprobante digital con firma SHA-256 y esquinas suaves.
const ReceiptPreviewModal: React.FC<{ receipt: Movimiento; onClose: () => void }> = ({
  receipt,
  onClose,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl max-w-md w-full border border-slate-200/90 shadow-2xl overflow-hidden animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#006799] block">
              Respaldo Digital • Comité de Bienestar
            </span>
            <h3 className="text-base font-extrabold text-slate-900 tabular-nums">
              Comprobante #{receipt.id}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Concepto:</span>
            <span className="font-bold text-slate-900 text-right">{receipt.concepto}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Fecha de Emisión:</span>
            <span className="font-mono font-semibold text-slate-800 tabular-nums">
              {formatDate(receipt.fecha)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Monto Acreditado:</span>
            <span className="font-extrabold text-[#166534] text-sm tabular-nums">
              {formatCurrency(receipt.monto)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500 shrink-0">Detalle / Glosa:</span>
            <span className="text-slate-700 text-right">{receipt.detalle}</span>
          </div>
          <div className="flex justify-between items-center pt-2.5 border-t border-slate-200/80">
            <span className="text-slate-500">Firma Electrónica:</span>
            <span className="text-[10px] font-mono font-bold text-[#166534] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              ✓ VALIDADA SHA-256
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={() => {
              alert(`Descargando comprobante oficial ${receipt.id}...`);
              onClose();
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 rounded-xl shadow-sm transition-all"
          >
            Descargar Archivo PDF
          </button>
        </div>
      </div>
    </div>
  </div>
);

interface ToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  filter: string;
  onFilterChange: (v: string) => void;
}

// [ESTUDIANTE INFORMÁTICA] Barra de herramientas moderna con buscador redondeado y pestañas tipo píldora con contadores.
const MovementsToolbar: React.FC<ToolbarProps> = ({
  search,
  onSearchChange,
  filter,
  onFilterChange,
}) => (
  <div className="p-5 sm:px-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
    <div>
      <h2 className="text-base font-extrabold text-slate-900">
        Últimos Movimientos y Solicitudes
      </h2>
      <p className="text-xs text-slate-500 mt-0.5">
        Historial de solicitudes de reembolsos médicos y beneficios sociales tramitados
      </p>
    </div>

    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative w-full sm:w-56">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por concepto o folio..."
          className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200/90 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
        />
        <svg
          className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div className="inline-flex flex-wrap p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 text-xs">
        {FILTER_TABS.map((tab) => {
          const count =
            tab === 'Todos'
              ? INITIAL_MOVEMENTS.length
              : INITIAL_MOVEMENTS.filter((m) => m.estado === tab).length;
          return (
            <button
              key={tab}
              onClick={() => onFilterChange(tab)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filter === tab
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <span>{tab}</span>
              <span className="text-[10px] font-mono text-slate-400 tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

// [ESTUDIANTE INFORMÁTICA] Tabla de movimientos con curvatura moderna (card-modern) y celdas bien espaciadas sin desborde.
export const MovementsTable: React.FC = () => {
  const [filter, setFilter] = useState<string>('Todos');
  const [search, setSearch] = useState<string>('');
  const [selectedReceipt, setSelectedReceipt] = useState<Movimiento | null>(null);

  const filteredMovements = INITIAL_MOVEMENTS.filter((mov) => {
    const matchesFilter = filter === 'Todos' || mov.estado === filter;
    const matchesSearch =
      mov.concepto.toLowerCase().includes(search.toLowerCase()) ||
      mov.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalMontoFiltrado = filteredMovements.reduce((acc, m) => acc + m.monto, 0);

  return (
    <div className="card-modern overflow-hidden min-w-0">
      <MovementsToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
      />

      {/* Vista Móvil */}
      <div className="block sm:hidden divide-y divide-slate-100">
        {filteredMovements.map((mov) => {
          const badge = getStatusBadgeStyle(mov.estado);
          return (
            <div key={mov.id} className="p-4 hover:bg-slate-50/70 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-500 tabular-nums">
                  {mov.id} • {formatDate(mov.fecha)}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                  {mov.estado}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900">{mov.concepto}</div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                  {mov.modulo}
                </span>
                <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                  {formatCurrency(mov.monto)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vista Desktop */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-6">Fecha</th>
              <th className="py-3.5 px-6">Concepto y Módulo</th>
              <th className="py-3.5 px-6 text-right">Monto CLP</th>
              <th className="py-3.5 px-6 text-center">Estado</th>
              <th className="py-3.5 px-6 text-right">Comprobante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                  No se encontraron movimientos para el filtro aplicado.
                </td>
              </tr>
            ) : (
              filteredMovements.map((mov) => {
                const badge = getStatusBadgeStyle(mov.estado);
                return (
                  <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 px-6 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {formatDate(mov.fecha)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 group-hover:text-[#006799] transition-colors">
                        {mov.concepto}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono text-slate-400 tabular-nums">{mov.id}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                          {mov.modulo}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-extrabold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatCurrency(mov.monto)}
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {mov.estado}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      {mov.comprobanteUrl ? (
                        <button
                          onClick={() => setSelectedReceipt(mov)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#006799] bg-sky-50 hover:bg-sky-100 border border-sky-200/80 rounded-xl transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>PDF</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No adjunto</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="py-3.5 px-6 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 tabular-nums">
        <span>
          Mostrando <strong className="text-slate-700">{filteredMovements.length}</strong> de {INITIAL_MOVEMENTS.length} movimientos
        </span>
        <span>
          Subtotal listado: <strong className="font-mono text-slate-900">{formatCurrency(totalMontoFiltrado)}</strong>
        </span>
      </div>

      {selectedReceipt && (
        <ReceiptPreviewModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};
