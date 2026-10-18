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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Nueva Solicitud de Reembolso</h3>
              <p className="text-xs text-slate-500">Complete los antecedentes del gasto de salud</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">✕</button>
        </div>

        {/* Info de saldo */}
        <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">Saldo disponible: {formatCurrency(resumen.saldo_salud_disponible)}</span>
          </div>
          <span className="text-[11px] text-emerald-600">de {formatCurrency(resumen.saldo_salud_total_anual)} anuales</span>
        </div>

        {/* Formulario */}
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          {/* Tipo de prestación */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tipo de Prestación Médica <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.tipo_prestacion}
              onChange={(e) => setFormData((p) => ({ ...p, tipo_prestacion: e.target.value as TipoPrestacion }))}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
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

          {/* Fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Fecha de Atención <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.fecha_atencion}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData((p) => ({ ...p, fecha_atencion: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                required
                id="input-fecha-atencion"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Fecha de Boleta / DTE <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.fecha_boleta}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData((p) => ({ ...p, fecha_boleta: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                required
                id="input-fecha-boleta"
              />
            </div>
          </div>

          {/* Validación de plazo en tiempo real */}
          {fechaValidacion && (
            <div className={`p-3 rounded-xl border text-xs ${
              fechaValidacion.dentro
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              <div className="flex items-center gap-2">
                <span className="font-bold">
                  {fechaValidacion.dentro ? '✓' : '✗'} Plazo 30 días:
                </span>
                <span>{fechaValidacion.mensaje}</span>
              </div>
            </div>
          )}

          {/* Montos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Monto Total Boleta ($ CLP) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                placeholder="Ej: 35000"
                min="1"
                value={formData.monto_boleta}
                onChange={(e) => setFormData((p) => ({ ...p, monto_boleta: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                required
                id="input-monto-boleta"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Copago a Reembolsar ($ CLP) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                placeholder="Ej: 25000"
                min="1"
                value={formData.monto_copago}
                onChange={(e) => setFormData((p) => ({ ...p, monto_copago: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                required
                id="input-monto-copago"
              />
              {formData.monto_copago && parseFloat(formData.monto_copago) > resumen.saldo_salud_disponible && (
                <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                  ⚠ Supera el saldo disponible ({formatCurrency(resumen.saldo_salud_disponible)})
                </p>
              )}
            </div>
          </div>

          {/* Beneficiario */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Beneficiario <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.beneficiario_parentesco}
                onChange={(e) => {
                  const sel = e.target.value;
                  const titular = usuarioNombre || 'Carlos Valenzuela M.';
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
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                id="select-beneficiario"
              >
                <option value="Titular">{usuarioNombre || 'Carlos Valenzuela M.'} (Titular)</option>
                <option value="Hija">Valentina Valenzuela (Hija)</option>
                <option value="Hijo">Matías Valenzuela (Hijo)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Descripción del gasto
              </label>
              <input
                type="text"
                placeholder="Ej: Compra de medicamentos receta crónica"
                value={formData.descripcion}
                onChange={(e) => setFormData((p) => ({ ...p, descripcion: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
                id="input-descripcion"
              />
            </div>
          </div>

          {/* Adjuntar comprobante */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Adjuntar Comprobante de Atención <span className="text-rose-500">*</span>
            </label>
            <label
              htmlFor="input-comprobante"
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all ${
                uploadedFile
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30'
              }`}
            >
              {uploadedFile ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">{uploadedFile.name}</p>
                    <p className="text-[11px] text-emerald-600">{(uploadedFile.size / 1024).toFixed(0)} KB — Clic para cambiar</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mb-2">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Arrastra tu comprobante aquí o haz clic para subir</p>
                  <span className="text-[11px] text-slate-400 mt-0.5">Boleta, factura o bono • PDF, JPG o PNG hasta 10MB</span>
                </>
              )}
              <input
                type="file"
                id="input-comprobante"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={onFileChange}
              />
            </label>
          </div>

          {/* Tipo de documento de respaldo */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tipo de Documento de Respaldo <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.tipo_documento}
              onChange={(e) => setFormData((p) => ({ ...p, tipo_documento: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition"
              required
              id="select-tipo-documento"
            >
              <option value="">Seleccione una opción...</option>
              {Object.entries(TIPOS_DOCUMENTO).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Declaración de veracidad */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.declaracion_aceptada}
              onChange={(e) => setFormData((p) => ({ ...p, declaracion_aceptada: e.target.checked }))}
              className="mt-0.5 w-4 h-4 accent-emerald-600"
              required
              id="check-declaracion"
            />
            <span className="text-xs text-slate-600">
              Declaro que la información y documentación ingresada es verídica, correcta y legal.
            </span>
          </label>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || (fechaValidacion !== null && !fechaValidacion.dentro)}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              id="btn-enviar-solicitud"
            >
              {enviando ? 'Enviando...' : 'Enviar Solicitud de Reembolso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
