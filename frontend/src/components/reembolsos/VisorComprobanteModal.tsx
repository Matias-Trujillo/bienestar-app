import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface VisorComprobanteModalProps {
  previewComprobante: {
    id: number;
    url: string;
    filename: string;
    codigo: string;
    isPdf: boolean;
    isImage: boolean;
  } | null;
  previewError: string | null;
  subiendoArchivoDirecto: boolean;
  onClose: () => void;
  onSubirArchivo: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onErrorLoading: () => void;
}

export const VisorComprobanteModal: React.FC<VisorComprobanteModalProps> = ({
  previewComprobante,
  previewError,
  subiendoArchivoDirecto,
  onClose,
  onSubirArchivo,
  onErrorLoading,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!previewComprobante || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-scale-in">
        {/* Header del visor */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="truncate">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>Comprobante: {previewComprobante.codigo}</span>
              </h3>
              <p className="text-xs text-slate-500 truncate" title={previewComprobante.filename}>
                {previewComprobante.filename}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={previewComprobante.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              title="Abrir en pestaña nueva"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="hidden sm:inline">Pestaña nueva</span>
            </a>
            <a
              href={previewComprobante.url}
              download={previewComprobante.filename}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
              title="Descargar archivo"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Descargar</span>
            </a>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 text-lg font-bold rounded-lg hover:bg-slate-100 transition ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenedor del documento */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-100/60 min-h-[450px]">
          {previewError ? (
            <div className="p-6 text-center max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-slate-800">Archivo no cargado físicamente aún</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Esta solicitud fue registrada con el nombre <strong>&quot;{previewComprobante.filename}&quot;</strong>, pero el archivo aún no ha sido cargado en el servidor físico.
              </p>

              <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <label
                  htmlFor="input-subir-comprobante-visor"
                  className={`w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-sm transition cursor-pointer flex items-center justify-center gap-2 ${
                    subiendoArchivoDirecto ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {subiendoArchivoDirecto ? 'Subiendo archivo...' : 'Adjuntar archivo ahora'}
                  <input
                    type="file"
                    id="input-subir-comprobante-visor"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    disabled={subiendoArchivoDirecto}
                    onChange={onSubirArchivo}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : previewComprobante.isImage ? (
            <div className="relative max-w-full max-h-full flex items-center justify-center p-2 bg-white rounded-xl shadow-sm border border-slate-200">
              <img
                src={previewComprobante.url}
                alt={previewComprobante.filename}
                onError={onErrorLoading}
                className="max-h-[70vh] max-w-full object-contain rounded-lg"
              />
            </div>
          ) : previewComprobante.isPdf ? (
            <div className="w-full h-[70vh] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <iframe
                src={previewComprobante.url}
                title={previewComprobante.filename}
                onError={onErrorLoading}
                className="w-full h-full border-0"
              />
            </div>
          ) : (
            <div className="p-8 text-center max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-slate-800">Vista previa no disponible</h4>
              <p className="text-xs text-slate-500 mt-1">Este formato de archivo no se puede previsualizar directamente.</p>
              <a
                href={previewComprobante.url}
                download={previewComprobante.filename}
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
              >
                Descargar para ver
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
