'use client';

import React from 'react';
import { BonoCatalogoItem, CatalogoBeneficios, SolicitudBeneficio, User } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  FileTextIcon,
  CheckCircleIcon,
  PalmtreeIcon,
  SettingsIcon,
  FileCheckIcon,
  UserCheckIcon,
} from './Icons';

interface ModalesBeneficiosProps {
  user: User | null;
  catalogo: CatalogoBeneficios | null;
  modalPostularBono: BonoCatalogoItem | null;
  setModalPostularBono: (b: BonoCatalogoItem | null) => void;
  formPostulacion: any;
  setFormPostulacion: (f: any) => void;
  onPostularSubmit: (e: React.FormEvent) => void;

  modalAsignacionDirecta: boolean;
  setModalAsignacionDirecta: (open: boolean) => void;
  formAsigDirecta: any;
  setFormAsigDirecta: (f: any) => void;
  onAsignacionDirectaSubmit: (e: React.FormEvent) => void;

  modalValidarSolicitud: SolicitudBeneficio | null;
  setModalValidarSolicitud: (s: SolicitudBeneficio | null) => void;
  formValidacion: any;
  setFormValidacion: (f: any) => void;
  onValidarSubmit: (e: React.FormEvent) => void;

  modalVisorDoc: { titulo: string; tipo: string; num?: string; url?: string; detalle?: string } | null;
  setModalVisorDoc: (doc: any | null) => void;

  modalConfigBaseG15: boolean;
  setModalConfigBaseG15: (open: boolean) => void;
  baseG15Nueva: number;
  setBaseG15Nueva: (val: number) => void;
  onGuardarBaseG15Submit: (e: React.FormEvent) => void;

  modalExportarTesoreria: any | null;
  setModalExportarTesoreria: (doc: any | null) => void;
}

export const ModalesBeneficios: React.FC<ModalesBeneficiosProps> = ({
  user,
  catalogo,
  modalPostularBono,
  setModalPostularBono,
  formPostulacion,
  setFormPostulacion,
  onPostularSubmit,

  modalAsignacionDirecta,
  setModalAsignacionDirecta,
  formAsigDirecta,
  setFormAsigDirecta,
  onAsignacionDirectaSubmit,

  modalValidarSolicitud,
  setModalValidarSolicitud,
  formValidacion,
  setFormValidacion,
  onValidarSubmit,

  modalVisorDoc,
  setModalVisorDoc,

  modalConfigBaseG15,
  setModalConfigBaseG15,
  baseG15Nueva,
  setBaseG15Nueva,
  onGuardarBaseG15Submit,

  modalExportarTesoreria,
  setModalExportarTesoreria,
}) => {
  return (
    <>
      {/* MODAL 1: POSTULAR A UN BONO (HU-05) */}
      {modalPostularBono && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <FileTextIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">{modalPostularBono.nombre}</h3>
                  <span className="text-xs font-semibold text-emerald-700">
                    Asignación: {modalPostularBono.porcentaje}% Grado 15 ({formatCurrency(modalPostularBono.monto_calculado)})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setModalPostularBono(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onPostularSubmit} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-2">
                <UserCheckIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>
                  Socio solicitante: <strong>{user?.nombreCompleto}</strong> (RUT {user?.rut}) • Antigüedad:{' '}
                  <strong>{user?.antiguedad || '1 Año'}</strong> (Cumple regla de permanencia ≥6 meses).
                </span>
              </div>

              {modalPostularBono.id === 'escolaridad' && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-800 block text-xs">
                    Datos del Hijo o Hija Estudiante (Hasta 24 años)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Nombre Completo del Estudiante</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Valentina Peralillo"
                        value={formPostulacion.nombre_beneficiario}
                        onChange={(e) => setFormPostulacion({ ...formPostulacion, nombre_beneficiario: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">RUN del Estudiante</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: 24.123.456-7"
                        value={formPostulacion.rut_beneficiario}
                        onChange={(e) => setFormPostulacion({ ...formPostulacion, rut_beneficiario: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="font-semibold text-slate-700 block mb-1">Establecimiento Educacional</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Colegio Básico Peralillo / Universidad"
                        value={formPostulacion.institucion_educacional}
                        onChange={(e) => setFormPostulacion({ ...formPostulacion, institucion_educacional: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Edad Estudiante</label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        required
                        value={formPostulacion.edad_estudiante}
                        onChange={(e) => setFormPostulacion({ ...formPostulacion, edad_estudiante: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {modalPostularBono.id === 'nacimiento' && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-800 block text-xs">Datos del Recién Nacido</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Nombre Hijo/Hija</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Matías Valenzuela"
                        value={formPostulacion.nombre_beneficiario}
                        onChange={(e) => setFormPostulacion({ ...formPostulacion, nombre_beneficiario: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">RUN Registro Civil</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: 26.789.012-3"
                        value={formPostulacion.rut_beneficiario}
                        onChange={(e) => setFormPostulacion({ ...formPostulacion, rut_beneficiario: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {['fallecimiento_familiar', 'fallecimiento_afiliado'].includes(modalPostularBono.id) && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-800 block text-xs">
                    Datos de la Carga Legal / Beneficiario
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Nombre Familiar / Beneficiario</label>
                      <input
                        type="text"
                        required
                        placeholder="Nombre completo"
                        value={formPostulacion.nombre_beneficiario}
                        onChange={(e) => setFormPostulacion({ ...formPostulacion, nombre_beneficiario: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">RUN Familiar</label>
                      <input
                        type="text"
                        required
                        placeholder="RUN con guion"
                        value={formPostulacion.rut_beneficiario}
                        onChange={(e) => setFormPostulacion({ ...formPostulacion, rut_beneficiario: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Motivo o Justificación de la Solicitud</label>
                <textarea
                  rows={2}
                  required
                  value={formPostulacion.motivo}
                  onChange={(e) => setFormPostulacion({ ...formPostulacion, motivo: e.target.value })}
                  placeholder="Detalla brevemente la situación y fechas correspondientes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-500 transition text-center space-y-1">
                <FileCheckIcon className="w-8 h-8 text-blue-500 mx-auto" />
                <span className="font-bold text-slate-800 block text-xs">
                  {modalPostularBono.documentacion_requerida}
                </span>
                <p className="text-[11px] text-slate-400">Adjuntar documento digitalizado (PDF, JPG hasta 10MB)</p>
                <input
                  type="text"
                  placeholder="Nombre de archivo adjunto (ej: Certificado_RegistroCivil.pdf)"
                  value={formPostulacion.documento_nombre}
                  onChange={(e) => setFormPostulacion({ ...formPostulacion, documento_nombre: e.target.value })}
                  className="w-full mt-2 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalPostularBono(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition"
                >
                  Enviar Postulación a Evaluación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASIGNACIÓN DIRECTA BONO DE VACACIONES (ESCENARIO 3) */}
      {modalAsignacionDirecta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  <PalmtreeIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    Asignación Directa Bono de Vacaciones (15%)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Escenario 3: Aplicación directa sin solicitud del socio según Decreto Alcaldicio.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalAsignacionDirecta(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onAsignacionDirectaSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Seleccionar Socio Habilitado</label>
                <select
                  value={formAsigDirecta.socio_id}
                  onChange={(e) => setFormAsigDirecta({ ...formAsigDirecta, socio_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                >
                  <option value={7}>Carlos Valenzuela M. (15.489.123-K) - DIDECO (5 Años 4 Meses)</option>
                  <option value={9}>Javiera Herrera T. (18.765.432-1) - Secretaría Municipal (1 Año 2 Meses)</option>
                  <option value={2}>María Elena Soto (12.345.678-9) - Directiva (9 Años)</option>
                  <option value={5}>Jorge Contreras L. (16.234.567-8) - Administración (4 Años)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">N° Decreto Alcaldicio</label>
                  <input
                    type="text"
                    required
                    value={formAsigDirecta.decreto_numero}
                    onChange={(e) => setFormAsigDirecta({ ...formAsigDirecta, decreto_numero: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Días Hábiles Feriado (Mínimo 10)
                  </label>
                  <input
                    type="number"
                    min={10}
                    required
                    value={formAsigDirecta.dias_habiles_feriado}
                    onChange={(e) => setFormAsigDirecta({ ...formAsigDirecta, dias_habiles_feriado: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-teal-900">
                <span className="font-bold block">Cálculo Automático sobre Grado 15:</span>
                <span className="text-sm font-extrabold text-teal-800">
                  15% de {catalogo ? formatCurrency(catalogo.sueldo_base_grado_15) : '$750.000'} ={' '}
                  {catalogo ? formatCurrency(Math.round(catalogo.sueldo_base_grado_15 * 0.15)) : '$112.500 CLP'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">N° Cheque Tesorería</label>
                  <input
                    type="text"
                    required
                    value={formAsigDirecta.numero_cheque}
                    onChange={(e) => setFormAsigDirecta({ ...formAsigDirecta, numero_cheque: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Banco Emisor</label>
                  <input
                    type="text"
                    required
                    value={formAsigDirecta.banco}
                    onChange={(e) => setFormAsigDirecta({ ...formAsigDirecta, banco: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAsignacionDirecta(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition"
                >
                  Asignar y Liquidar Bono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RESOLUCIÓN Y VALIDACIÓN INDIVIDUAL (DIRECTIVA) */}
      {modalValidarSolicitud && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">
                  Resolución Solicitud #{modalValidarSolicitud.id}
                </h3>
                <span className="text-slate-500">
                  {modalValidarSolicitud.titulo_bono} • Socio: {modalValidarSolicitud.socio_nombre}
                </span>
              </div>
              <button
                onClick={() => setModalValidarSolicitud(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onValidarSubmit} className="space-y-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Decisión del Comité</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormValidacion({ ...formValidacion, accion: 'APROBAR' })}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      formValidacion.accion === 'APROBAR'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormValidacion({ ...formValidacion, accion: 'LIQUIDAR' })}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      formValidacion.accion === 'LIQUIDAR'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Liquidar (Cheque)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormValidacion({ ...formValidacion, accion: 'RECHAZAR' })}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      formValidacion.accion === 'RECHAZAR'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Rechazar
                  </button>
                </div>
              </div>

              {formValidacion.accion === 'RECHAZAR' && (
                <div>
                  <label className="font-semibold text-rose-700 block mb-1">Motivo Fundado del Rechazo</label>
                  <textarea
                    rows={2}
                    required
                    value={formValidacion.motivo_rechazo}
                    onChange={(e) => setFormValidacion({ ...formValidacion, motivo_rechazo: e.target.value })}
                    placeholder="Indica el motivo legal o reglamentario por el cual no procede..."
                    className="w-full px-3 py-2 border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              )}

              {formValidacion.accion === 'LIQUIDAR' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">N° Cheque Emitido</label>
                    <input
                      type="text"
                      required
                      value={formValidacion.numero_cheque}
                      onChange={(e) => setFormValidacion({ ...formValidacion, numero_cheque: e.target.value })}
                      placeholder="Ej: CHQ-885103"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Banco Emisor</label>
                    <input
                      type="text"
                      required
                      value={formValidacion.banco}
                      onChange={(e) => setFormValidacion({ ...formValidacion, banco: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Observaciones / Acta de Resolución</label>
                <textarea
                  rows={2}
                  value={formValidacion.observaciones}
                  onChange={(e) => setFormValidacion({ ...formValidacion, observaciones: e.target.value })}
                  placeholder="Observaciones de la directiva o secretario..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalValidarSolicitud(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-black rounded-xl shadow-sm transition"
                >
                  Guardar Resolución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: VISOR DE DOCUMENTO DIGITAL / DECRETO ALCALDICIO */}
      {modalVisorDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <FileTextIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">{modalVisorDoc.titulo}</h3>
                  <span className="text-[11px] text-slate-500">{modalVisorDoc.tipo}</span>
                </div>
              </div>
              <button
                onClick={() => setModalVisorDoc(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/90 text-slate-800 font-serif space-y-4 shadow-inner">
              <div className="border-b border-slate-300 pb-3 flex justify-between items-start text-xs font-sans">
                <div>
                  <span className="font-extrabold text-slate-900 uppercase block tracking-wider text-[11px]">
                    Ilustre Municipalidad de Peralillo
                  </span>
                  <span className="text-slate-500 text-[10px]">Comité de Bienestar del Personal</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-700 text-[11px]">
                    {modalVisorDoc.num || 'REG-DOC-2026'}
                  </span>
                  <span className="text-emerald-700 font-sans block text-[10px] font-bold">✓ Firma Digital Avanzada</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <p className="font-bold uppercase tracking-wide text-center text-slate-900">
                  {modalVisorDoc.tipo || 'Certificado / Decreto de Respaldo'}
                </p>
                <p className="text-justify text-slate-700 leading-relaxed font-sans text-xs">
                  Por medio del presente instrumento se acredita la validez legal del antecedente presentado ante el Comité de Bienestar, dando estricto cumplimiento a las bases del estatuto municipal y a los requisitos documentales de la asignación económica.
                </p>
                {modalVisorDoc.detalle && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 font-sans text-xs text-slate-700">
                    <strong>Antecedentes:</strong> {modalVisorDoc.detalle}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[11px] font-sans text-slate-500">
                <span>Timbre Oficial Registrado</span>
                <span className="font-mono">Hash: 8f4b...39e1</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalVisorDoc(null)}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CONFIGURACIÓN BASE SUELDO GRADO 15 */}
      {modalConfigBaseG15 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <SettingsIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-800">Parámetro Base Sueldo Grado 15</h3>
              </div>
              <button
                onClick={() => setModalConfigBaseG15(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onGuardarBaseG15Submit} className="space-y-4">
              <p className="text-slate-500 text-xs">
                Modifica el sueldo imponible base de Grado 15 para la Municipalidad de Peralillo. Todos los porcentajes de beneficios (8%, 15%, 20%, 25%, 50%, 100%) se recalcularán de forma automática e inmediata.
              </p>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Monto Imponible Base (CLP)</label>
                <input
                  type="number"
                  step={5000}
                  required
                  value={baseG15Nueva}
                  onChange={(e) => setBaseG15Nueva(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-700 block">Previsualización de Impacto:</span>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Vacaciones / Invierno (15%):</span>
                  <strong>{formatCurrency(Math.round(baseG15Nueva * 0.15))}</strong>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Escolaridad (8%):</span>
                  <strong>{formatCurrency(Math.round(baseG15Nueva * 0.08))}</strong>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Nacimiento (20%):</span>
                  <strong>{formatCurrency(Math.round(baseG15Nueva * 0.2))}</strong>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalConfigBaseG15(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition"
                >
                  Guardar & Recalcular Todo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: EXPORTACIÓN PARA TESORERÍA MUNICIPAL */}
      {modalExportarTesoreria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    Nómina Oficial Enviada a Tesorería Municipal
                  </h3>
                  <span className="text-slate-500">{modalExportarTesoreria.titulo}</span>
                </div>
              </div>
              <button
                onClick={() => setModalExportarTesoreria(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900">
              <span className="font-bold block">✓ Formalización de Pago Exitosa:</span>
              <p className="mt-1 text-[11px] leading-relaxed">
                Se formalizó el acuerdo de pago mediante {modalExportarTesoreria.decreto}. Se asignaron los números de cheque individuales y se registró automáticamente el abono en la Hoja de Beneficios de cada socio.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-60 overflow-y-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-1 px-2">Cheque</th>
                    <th className="py-1 px-2">Beneficiario</th>
                    <th className="py-1 px-2">RUN</th>
                    <th className="py-1 px-2 text-right">Monto CLP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {modalExportarTesoreria.items.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="py-1 px-2 font-bold text-slate-800">{item.numero_cheque_sugerido}</td>
                      <td className="py-1 px-2 font-sans font-medium text-slate-700">{item.nombre_completo}</td>
                      <td className="py-1 px-2 text-slate-500">{item.rut}</td>
                      <td className="py-1 px-2 text-right font-extrabold text-emerald-700">
                        {formatCurrency(item.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="font-extrabold text-sm text-slate-800">
                Total Tesorería: {formatCurrency(modalExportarTesoreria.totalMonto)}
              </span>
              <button
                onClick={() => setModalExportarTesoreria(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl transition"
              >
                Entendido y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
