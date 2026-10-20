import React from 'react';
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
  if (!show) return null;

  // Cálculos reactivos de saldo
  const copagoNum = parseFloat(formData.monto_copago) || 0;
  const saldoDisponible = Number(resumen.saldo_salud_disponible) || 0;
  const saldoTotal = Number(resumen.saldo_salud_total_anual) || 150000;
  const saldoRestanteProyectado = Math.max(0, saldoDisponible - copagoNum);
  const excedeSaldo = copagoNum > saldoDisponible;

  const pctUtilizadoActual = saldoTotal > 0
    ? Math.min(100, Math.round(((saldoTotal - saldoDisponible) / saldoTotal) * 100))
    : 0;

  const pctProyectado = saldoTotal > 0
    ? Math.min(100, Math.round(((saldoTotal - saldoRestanteProyectado) / saldoTotal) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 flex items-center justify-center animate-fade-in">
      {/* Contenedor del Modal con altura máxima estricta y min-h-0 para scroll interno */}
      <div className="relative bg-white rounded-2xl max-w-lg sm:max-w-xl w-full max-h-[84vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden my-auto animate-scale-in">
        
        {/* 1. Header Fijo (Nunca se corta ni se desplaza) */}
        <div className="flex-shrink-0 px-4 py-2.5 sm:px-5 sm:py-3 border-b border-slate-100 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 leading-tight">
                Nueva Solicitud de Reembolso
              </h3>
              <p className="text-[11px] text-slate-500">
                Gastos médicos, medicamentos o dentales
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-base font-bold transition"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* 2. Cuerpo del Modal con Scroll Interno Compacto (min-h-0 obligatorio) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 sm:px-5 sm:py-3.5 space-y-3 text-xs">
          
          {/* Pequeña tarjeta compacta de Saldo Actual */}
          <div className="rounded-xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-slate-50 p-2.5 sm:p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Saldo Actual Disponible
                </span>
                <span className="text-base sm:text-lg font-extrabold text-emerald-700">
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
                <div className="mt-1 flex items-center justify-between text-[10px] sm:text-[11px]">
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

          {/* Formulario con campos compactos */}
          <form id="form-reembolso" onSubmit={onSubmit} className="space-y-2.5">
            {/* Tipo de prestación médica */}
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

            {/* Fechas en 2 columnas */}
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

            {/* Montos en 2 columnas */}
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
                  onChange={(e) => setFormData((p) => ({ ...p, monto_boleta: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  required
                  id="input-monto-boleta"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Copago a Reembolsar ($ CLP) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Ej: 20000"
                  min="1"
                  value={formData.monto_copago}
                  onChange={(e) => setFormData((p) => ({ ...p, monto_copago: e.target.value }))}
                  className={`w-full px-2.5 py-1.5 text-xs sm:text-sm border rounded-lg bg-white focus:ring-2 focus:outline-none transition ${
                    excedeSaldo
                      ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30'
                      : 'border-slate-300 focus:ring-emerald-500'
                  }`}
                  required
                  id="input-monto-copago"
                />
              </div>
            </div>

            {/* Beneficiario y Descripción en 2 columnas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
            </div>

            {/* Tipo de documento de respaldo */}
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

            {/* Adjuntar Comprobante Compacto */}
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

            {/* Declaración de veracidad */}
            <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/60 transition">
              <input
                type="checkbox"
                checked={formData.declaracion_aceptada}
                onChange={(e) => setFormData((p) => ({ ...p, declaracion_aceptada: e.target.checked }))}
                className="mt-0.5 w-3.5 h-3.5 accent-emerald-600 rounded"
                required
                id="check-declaracion"
              />
              <span className="text-[10px] sm:text-[11px] text-slate-600 leading-tight">
                Declaro bajo juramento que los antecedentes y comprobantes ingresados son verídicos, fidedignos y legales.
              </span>
            </label>
          </form>
        </div>

        {/* 3. Footer Fijo (Siempre visible al pie) */}
        <div className="flex-shrink-0 px-4 py-2.5 sm:px-5 sm:py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 z-10">
          <div className="text-[11px] text-slate-500">
            {copagoNum > 0 && !excedeSaldo && (
              <span className="text-emerald-700 font-semibold">
                Monto a solicitar: {formatCurrency(copagoNum)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-reembolso"
              disabled={
                enviando ||
                excedeSaldo ||
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
    </div>
  );
};
