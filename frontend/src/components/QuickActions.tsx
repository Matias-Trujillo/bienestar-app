'use client';

import React, { useState } from 'react';

export const QuickActions: React.FC = () => {
  const [activeModal, setActiveModal] = useState<'reembolso' | 'beneficio' | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmitReembolso = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveModal(null);
    setSuccessMessage('¡Solicitud de Reembolso Médico ingresada con éxito! Está en estado "En Revisión".');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleSubmitBeneficio = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveModal(null);
    setSuccessMessage('¡Postulación a Beneficio Social enviada a evaluación correctamente!');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  return (
    <>
      {/* Notificación de éxito flotante */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Contenedor de Botones de Acción Rápida */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Botón Acción 1: Solicitar Reembolso */}
        <button
          onClick={() => setActiveModal('reembolso')}
          className="group relative overflow-hidden flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/20 hover:shadow-lg hover:shadow-emerald-700/30 hover:scale-[1.01] active:scale-[0.99] transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md text-white group-hover:bg-white group-hover:text-emerald-700 transition">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight">
                Solicitar Reembolso
              </span>
              <span className="block text-xs text-emerald-100">
                Gastos médicos, medicamentos o dentales
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-white/10 group-hover:translate-x-1 transition-transform">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Botón Acción 2: Postular a Beneficio */}
        <button
          onClick={() => setActiveModal('beneficio')}
          className="group relative overflow-hidden flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-700/20 hover:shadow-lg hover:shadow-blue-700/30 hover:scale-[1.01] active:scale-[0.99] transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md text-white group-hover:bg-white group-hover:text-blue-700 transition">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight">
                Postular a Beneficio
              </span>
              <span className="block text-xs text-blue-100">
                Bonos por vacaciones, escolaridad o asignaciones
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-white/10 group-hover:translate-x-1 transition-transform">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      {/* Modal Interactivo: Solicitar Reembolso */}
      {activeModal === 'reembolso' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  ✚
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Nueva Solicitud de Reembolso</h3>
                  <p className="text-xs text-slate-500">Completa los antecedentes del gasto de salud</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReembolso} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Prestación Médica
                </label>
                <select className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none" required>
                  <option value="">Selecciona una opción...</option>
                  <option value="farmacia">Farmacia / Medicamentos con receta</option>
                  <option value="consulta">Consulta Médica / Especialista</option>
                  <option value="dental">Tratamiento Dental</option>
                  <option value="examenes">Exámenes de Laboratorio o Radiología</option>
                  <option value="optica">Lentes Ópticos</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monto Boleta ($ CLP)
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 35000"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Beneficiario
                  </label>
                  <select className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    <option value="titular">Carlos Valenzuela (Titular)</option>
                    <option value="carga1">Valentina (Hija)</option>
                    <option value="carga2">Matías (Hijo)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adjuntar Boleta o Factura Digital (PDF / Imagen)
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer transition">
                  <p className="text-xs text-slate-500">Arrastra tu comprobante aquí o haz clic para subir</p>
                  <span className="text-[11px] text-slate-400">PDF, JPG o PNG hasta 10MB</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
                >
                  Enviar Solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Interactivo: Postular a Beneficio */}
      {activeModal === 'beneficio' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  ★
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Postulación a Beneficio Social</h3>
                  <p className="text-xs text-slate-500">Fondo de ayuda social y bonos institucionales</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitBeneficio} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Beneficio Solicitado
                </label>
                <select className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" required>
                  <option value="">Selecciona el beneficio...</option>
                  <option value="vacaciones">Bono de Vacaciones Anual ($80.000)</option>
                  <option value="escolar">Bono Escolaridad y Matrícula ($45.000)</option>
                  <option value="natalidad">Asignación por Natalidad ($100.000)</option>
                  <option value="catastrofe">Fondo de Emergencia Social</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo o Justificación
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalla brevemente la situación o período correspondiente..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition"
                >
                  Enviar Postulación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
