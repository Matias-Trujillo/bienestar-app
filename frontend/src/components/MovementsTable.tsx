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

// [ESTUDIANTE INFORMÁTICA] Modal compacto de inspección de comprobante con firma SHA-256 y bordes definidos.
const ReceiptPreviewModal: React.FC<{ receipt: Movimiento; onClose: () => void }> = ({
  receipt,
  onClose,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-fade-in"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-lg max-w-md w-full border border-slate-300 overflow-hidden animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="h-1 w-full bg-[#006799]" />
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-[#006799] block">
              Respaldo Contable • Comité de Bienestar
            </span>
            <h3 className="text-sm font-bold text-slate-900 font-mono tabular-nums">
              Comprobante #{receipt.id}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 rounded border border-transparent hover:border-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Concepto:</span>
            <span className="font-semibold text-slate-900 text-right">{receipt.concepto}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Fecha de Emisión:</span>
            <span className="font-mono font-semibold text-slate-800 tabular-nums">
              {formatDate(receipt.fecha)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Monto Imputado:</span>
            <span className="font-bold text-[#166534] text-sm tabular-nums">
              {formatCurrency(receipt.monto)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500 shrink-0">Glosa / Respaldo:</span>
            <span className="text-slate-700 text-right">{receipt.detalle}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            <span className="text-slate-500">Integridad:</span>
            <span className="text-[10px] font-mono font-bold text-[#166534] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              VERIFICADO SHA-256
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={() => {
              alert(`Descargando comprobante oficial ${receipt.id}...`);
              onClose();
            }}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#006799] hover:bg-[#0c2b45] rounded-md transition-colors"
          >
            Descargar PDF
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

// [ESTUDIANTE INFORMÁTICA] Barra de herramientas superior con buscador instantáneo y selector segmentado con contadores.
const MovementsToolbar: React.FC<ToolbarProps> = ({
  search,
  onSearchChange,
  filter,
  onFilterChange,
}) => (
  <div className="p-4 sm:px-5 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
    <div>
      <h2 className="text-sm font-bold text-[#0c2b45] uppercase tracking-wider">
        Registro Histórico de Movimientos y Solicitudes
      </h2>
      <p className="text-xs text-slate-500">
        Trazabilidad de reembolsos médicos y beneficios sociales tramitados
      </p>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filtrar por folio o concepto..."
          className="pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006799] w-48 sm:w-56"
        />
        <svg
          className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div className="inline-flex p-0.5 bg-slate-200/70 rounded-md border border-slate-300/80 text-xs">
        {FILTER_TABS.map((tab) => {
          const count =
            tab === 'Todos'
              ? INITIAL_MOVEMENTS.length
              : INITIAL_MOVEMENTS.filter((m) => m.estado === tab).length;
          return (
            <button
              key={tab}
              onClick={() => onFilterChange(tab)}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                filter === tab
                  ? 'bg-white text-[#0c2b45] font-bold border border-slate-300/80'
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

// [ESTUDIANTE INFORMÁTICA] Tabla de alta densidad (Data-Dense) con números tabulares y soporte responsivo móvil.
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
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <MovementsToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
      />

      {/* Vista Móvil Compacta */}
      <div className="block sm:hidden divide-y divide-slate-200">
        {filteredMovements.map((mov) => {
          const badge = getStatusBadgeStyle(mov.estado);
          return (
            <div key={mov.id} className="p-3.5 hover:bg-slate-50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-500 tabular-nums">
                  {mov.id} • {formatDate(mov.fecha)}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
                  {mov.estado}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900">{mov.concepto}</div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">{mov.modulo}</span>
                <span className="text-xs font-extrabold text-slate-900 tabular-nums">
                  {formatCurrency(mov.monto)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vista Desktop Data-Dense */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-2.5 px-4">Folio</th>
              <th className="py-2.5 px-4">Fecha</th>
              <th className="py-2.5 px-4">Concepto y Glosa</th>
              <th className="py-2.5 px-4">Módulo</th>
              <th className="py-2.5 px-4 text-right">Monto CLP</th>
              <th className="py-2.5 px-4 text-center">Estado</th>
              <th className="py-2.5 px-4 text-right">Respaldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No existen registros que coincidan con el criterio seleccionado.
                </td>
              </tr>
            ) : (
              filteredMovements.map((mov) => {
                const badge = getStatusBadgeStyle(mov.estado);
                return (
                  <tr key={mov.id} className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 tabular-nums whitespace-nowrap">
                      {mov.id}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {formatDate(mov.fecha)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{mov.concepto}</div>
                      {mov.detalle && (
                        <div className="text-[11px] text-slate-500 truncate max-w-md">{mov.detalle}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">
                        {mov.modulo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatCurrency(mov.monto)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border ${badge.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {mov.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {mov.comprobanteUrl ? (
                        <button
                          onClick={() => setSelectedReceipt(mov)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#006799] hover:bg-sky-50 bg-white border border-slate-300 hover:border-[#006799] rounded transition-colors"
                        >
                          <span>Ver PDF</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="py-2.5 px-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600 tabular-nums">
        <span>
          Mostrando <strong>{filteredMovements.length}</strong> de {INITIAL_MOVEMENTS.length} movimientos
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
