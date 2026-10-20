import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TipoPrestacion, TIPO_PRESTACION_LABELS, TIPOS_PRESTACION_SOLICITABLES, ResumenSaludSocio } from '@/types';
import { formatCurrency } from '@/lib/utils';

export const TIPOS_DOCUMENTO: Record<string, string> = {
  receta_medica: 'Receta médica',
  boleta_detallada: 'Boleta detallada',
  bono_copago: 'Bono con copago',
  comprobante_isapre_fonasa: 'Comprobante Isapre/Fonasa',
  timbre_no_reembolsable: "Timbre 'no reembolsable'",
};

interface FormReembolsoState {
  tipo_prestacion: TipoPrestacion | '';
  descripcion: string;
  beneficiario_nombre: string;
  beneficiario_parentesco: string;
  monto_boleta: string;
  monto_copago: string;
  fecha_atencion: string;
  fecha_boleta: string;
  tipo_documento: string;
  declaracion_aceptada: boolean;
}

interface ModalNuevaSolicitudProps {
  show: boolean;
  resumen: ResumenSaludSocio;
  formData: FormReembolsoState;
  setFormData: React.Dispatch<React.SetStateAction<FormReembolsoState>>;
  fechaValidacion: { dentro: boolean; mensaje: string; dias: number } | null;
  uploadedFile: File | null;
  enviando: boolean;
  usuarioNombre?: string;
  onClose: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ModalNuevaSolicitud: React.FC<ModalNuevaSolicitudProps> = ({
  show,
  resumen,
  formData,
  setFormData,
  fechaValidacion,
  uploadedFile,
  enviando,
  usuarioNombre,
  onClose,
  onFileChange,
  onSubmit,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!show || !mounted) return null;

  // Cálculos reactivos de saldo y montos
  const boletaNum = parseFloat(formData.monto_boleta) || 0;
  const copagoNum = parseFloat(formData.monto_copago) || 0;
  const saldoDisponible = Number(resumen.saldo_salud_disponible) || 0;
  const saldoTotal = Number(resumen.saldo_salud_total_anual) || 150000;
  const saldoRestanteProyectado = Math.max(0, saldoDisponible - copagoNum);
  const excedeSaldo = copagoNum > saldoDisponible;
  const excedeBoleta = boletaNum > 0 && copagoNum > boletaNum;

  const pctUtilizadoActual = saldoTotal > 0
    ? Math.min(100, Math.round(((saldoTotal - saldoDisponible) / saldoTotal) * 100))
    : 0;

  const pctProyectado = saldoTotal > 0
    ? Math.min(100, Math.round(((saldoTotal - saldoRestanteProyectado) / saldoTotal) * 100))
    : 0;

  // Manejo de cambio en monto boleta: copia automática al copago y ajuste de topes
  const handleMontoBoletaChange = (val: string) => {
    const nuevaBoletaNum = parseFloat(val) || 0;
    const copagoActualNum = parseFloat(formData.monto_copago) || 0;

    // Si el copago estaba vacío, era igual a la boleta anterior,
    // o si el copago actual excede el nuevo valor de la boleta:
    // copiamos automáticamente el nuevo valor al copago a reembolsar.
    const debeCopiar =
      formData.monto_copago === '' ||
      formData.monto_copago === formData.monto_boleta ||
      (nuevaBoletaNum > 0 && copagoActualNum > nuevaBoletaNum);

    setFormData((prev) => ({
      ...prev,
      monto_boleta: val,
      monto_copago: debeCopiar ? val : prev.monto_copago,
    }));
  };

  // Manejo de cambio en copago: permite modificarlo pero nunca superar el monto de la boleta
  const handleMontoCopagoChange = (val: string) => {
    const boletaActualNum = parseFloat(formData.monto_boleta) || 0;
    const enteredNum = parseFloat(val) || 0;

    // Si intenta ingresar un monto mayor al de la boleta, se fija al tope de la boleta
    if (boletaActualNum > 0 && enteredNum > boletaActualNum) {
      setFormData((prev) => ({ ...prev, monto_copago: prev.monto_boleta }));
      return;
    }

    setFormData((prev) => ({ ...prev, monto_copago: val }));
  };

  // Renderizado en Portal directo al body para cubrir el 100% de la ventana completa
  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-3 sm:p-5 flex items-center justify-center animate-fade-in">
      {/* Contenedor del Modal Vertical y Cómodo */}
      <div className="relative bg-white rounded-2xl max-w-lg sm:max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden my-auto animate-scale-in">
        
        {/* 1. Header Fijo */}
        <div className="flex-shrink-0 px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2-0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 leading-tight">
                Nueva Solicitud de Reembolso
              </h3>
              <p className="text-[11px] text-slate-500 leading-none mt-0.5">
                Gastos médicos, medicamentos o dentales
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-sm font-bold transition"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* 2. Cuerpo con Flujo Vertical Hacia Abajo y Scroll Interno Fluido */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3.5 space-y-3 text-xs">
          
          {/* Tarjeta Reactiva de Saldo */}
          <div className="rounded-xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-slate-50 p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Saldo Actual Disponible
                </span>
                <span className="text-lg font-extrabold text-emerald-700">
                  {formatCurrency(saldoDisponible)}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-medium text-slate-400 uppercase">
                  Tope Anual
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-700">
                  {formatCurrency(saldoTotal)}
                </span>
              </div>
            </div>

            {/* Barra de progreso interactiva */}
            <div className="mt-1.5">
              <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    excedeSaldo ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${copagoNum > 0 ? pctProyectado : pctUtilizadoActual}%` }}
                />
              </div>

              {/* Indicador reactivo del copago ingresado */}
              {copagoNum > 0 ? (
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  {excedeSaldo ? (
                    <span className="font-semibold text-rose-600">
                      ⚠ Excede el saldo disponible por {formatCurrency(copagoNum - saldoDisponible)}
                    </span>
                  ) : (
                    <span className="font-medium text-emerald-800">
                      Descuento: <strong>-{formatCurrency(copagoNum)}</strong> → Restante: <strong>{formatCurrency(saldoRestanteProyectado)}</strong>
                    </span>
                  )}
                  <span className="text-slate-400 font-medium">{pctProyectado}% ocupado</span>
                </div>
              ) : (
                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                  <span>{100 - pctUtilizadoActual}% cupo disponible</span>
                  <span>Comprometido: {formatCurrency(Math.max(0, saldoTotal - saldoDisponible))}</span>
                </div>
              )}
            </div>
          </div>

          {/* Formulario Secuencial Vertical hacia Abajo */}
          <form id="form-reembolso" onSubmit={onSubmit} className="space-y-2.5">
            {/* 1. Tipo de prestación médica */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                Tipo de Prestación Médica <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.tipo_prestacion}
                onChange={(e) => setFormData((p) => ({ ...p, tipo_prestacion: e.target.value as TipoPrestacion }))}
                className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                required
                id="select-tipo-prestacion"
              >
                <option value="">Seleccione una opción...</option>
                {(Object.entries(TIPO_PRESTACION_LABELS) as [TipoPrestacion, string][])
                  .filter(([key]) => TIPOS_PRESTACION_SOLICITABLES.includes(key))
                  .map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
              </select>
            </div>

            {/* 2. Beneficiario */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                Beneficiario <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.beneficiario_parentesco}
                onChange={(e) => {
                  const sel = e.target.value;
                  const titular = usuarioNombre || 'Socio Titular';
                  const nombres: Record<string, string> = {
                    Titular: titular,
                    Hija: 'Valentina Valenzuela',
                    Hijo: 'Matías Valenzuela',
                  };
                  setFormData((p) => ({
                    ...p,
                    beneficiario_parentesco: sel,
                    beneficiario_nombre: nombres[sel] || p.beneficiario_nombre,
                  }));
                }}
                className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                id="select-beneficiario"
              >
                <option value="Titular">{usuarioNombre || 'Socio Titular'} (Titular)</option>
                <option value="Hija">Valentina Valenzuela (Hija / Carga)</option>
                <option value="Hijo">Matías Valenzuela (Hijo / Carga)</option>
              </select>
            </div>

            {/* 3. Fechas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Fecha de Atención <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fecha_atencion}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData((p) => ({ ...p, fecha_atencion: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  required
                  id="input-fecha-atencion"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Fecha de Boleta / DTE <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fecha_boleta}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData((p) => ({ ...p, fecha_boleta: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  required
                  id="input-fecha-boleta"
                />
              </div>
            </div>

            {/* Plazo 30 días */}
            {fechaValidacion && (
              <div className={`p-2 rounded-lg border text-[11px] ${
                fechaValidacion.dentro
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">{fechaValidacion.dentro ? '✓' : '✗'} Plazo 30 días:</span>
                  <span>{fechaValidacion.mensaje}</span>
                </div>
              </div>
            )}

            {/* 4. Montos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Monto Total Boleta ($ CLP) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Ej: 35000"
                  min="1"
                  value={formData.monto_boleta}
                  onChange={(e) => handleMontoBoletaChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  required
                  id="input-monto-boleta"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Copago a Reembolsar ($ CLP) <span className="text-rose-500">*</span>
                  </label>
                  {boletaNum > 0 && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Tope: {formatCurrency(boletaNum)}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  placeholder="Ej: 20000"
                  min="1"
                  max={formData.monto_boleta || undefined}
                  value={formData.monto_copago}
                  onChange={(e) => handleMontoCopagoChange(e.target.value)}
                  onBlur={() => {
                    if (boletaNum > 0 && copagoNum > boletaNum) {
                      setFormData((p) => ({ ...p, monto_copago: p.monto_boleta }));
                    }
                  }}
                  className={`w-full px-2.5 py-1.5 text-xs sm:text-sm border rounded-lg bg-white focus:ring-2 focus:outline-none transition ${
                    excedeSaldo || excedeBoleta
                      ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30'
                      : 'border-slate-300 focus:ring-emerald-500'
                  }`}
                  required
                  id="input-monto-copago"
                />
                {excedeBoleta ? (
                  <span className="text-[10px] font-semibold text-rose-600 mt-0.5 block">
                    ⚠ El copago no puede ser mayor a la boleta ({formatCurrency(boletaNum)})
                  </span>
                ) : null}
              </div>
            </div>

            {/* 5. Tipo de documento de respaldo */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                Tipo de Documento de Respaldo <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.tipo_documento}
                onChange={(e) => setFormData((p) => ({ ...p, tipo_documento: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                required
                id="select-tipo-documento"
              >
                <option value="">Seleccione una opción...</option>
                {Object.entries(TIPOS_DOCUMENTO).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* 6. Descripción del gasto */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                Descripción del gasto
              </label>
              <input
                type="text"
                placeholder="Ej: Medicamento con receta"
                value={formData.descripcion}
                onChange={(e) => setFormData((p) => ({ ...p, descripcion: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                id="input-descripcion"
              />
            </div>

            {/* 7. Adjuntar Comprobante */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                Adjuntar Comprobante de Atención <span className="text-rose-500">*</span>
              </label>
              <label
                htmlFor="input-comprobante"
                className={`flex items-center justify-between border border-dashed rounded-lg px-3 py-2 cursor-pointer transition-all ${
                  uploadedFile
                    ? 'border-emerald-400 bg-emerald-50/70'
                    : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30'
                }`}
              >
                {uploadedFile ? (
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="flex-shrink-0 w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      ✓
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-emerald-800 truncate">{uploadedFile.name}</p>
                      <p className="text-[10px] text-emerald-600">{(uploadedFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-xs text-slate-600">Subir boleta o bono (PDF, JPG, PNG)</span>
                  </div>
                )}
                <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                  {uploadedFile ? 'Cambiar' : 'Examinar'}
                </span>
                <input
                  type="file"
                  id="input-comprobante"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={onFileChange}
                />
              </label>
            </div>

            {/* 8. Declaración de veracidad */}
            <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/60 transition">
              <input
                type="checkbox"
                checked={formData.declaracion_aceptada}
                onChange={(e) => setFormData((p) => ({ ...p, declaracion_aceptada: e.target.checked }))}
                className="mt-0.5 w-3.5 h-3.5 accent-emerald-600 rounded"
                required
                id="check-declaracion"
              />
              <span className="text-[11px] text-slate-600 leading-tight">
                Declaro bajo juramento que los antecedentes y comprobantes ingresados son verídicos, fidedignos y legales.
              </span>
            </label>
          </form>
        </div>

        {/* 3. Footer Fijo (Siempre visible al pie del modal) */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 z-10">
          <div className="text-[11px] text-slate-500">
            {copagoNum > 0 && !excedeSaldo && !excedeBoleta ? (
              <span className="text-emerald-700 font-semibold">
                Monto a solicitar: {formatCurrency(copagoNum)}
              </span>
            ) : excedeBoleta ? (
              <span className="text-rose-600 font-semibold">
                ⚠ El copago no puede superar la boleta ({formatCurrency(boletaNum)})
              </span>
            ) : (
              <span className="text-slate-400">Campos obligatorios marcados con (*)</span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-reembolso"
              disabled={
                enviando ||
                excedeSaldo ||
                excedeBoleta ||
                (fechaValidacion !== null && !fechaValidacion.dentro)
              }
              className="px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              id="btn-enviar-solicitud"
            >
              {enviando ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
