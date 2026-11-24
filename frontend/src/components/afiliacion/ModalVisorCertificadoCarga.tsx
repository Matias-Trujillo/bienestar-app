'use client';

import React from 'react';
import { CertificadoVisorData } from './types';

interface ModalVisorCertificadoCargaProps {
  certificadoVisor: CertificadoVisorData | null;
  onClose: () => void;
}

export const ModalVisorCertificadoCarga: React.FC<ModalVisorCertificadoCargaProps> = ({
  certificadoVisor,
  onClose,
}) => {
  if (!certificadoVisor) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#0d9488] to-emerald-600 shrink-0" />
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#006799] block">
              RESPALDO DOCUMENTAL DE CARGA FAMILIAR
            </span>
            <h3 className="text-sm font-extrabold text-[#0f2942]">
              {certificadoVisor.titulo} • {certificadoVisor.cargaNombre}
            </h3>
            {certificadoVisor.socioNombre && (
              <p className="text-[11px] text-slate-500">
                Socio Titular: {certificadoVisor.socioNombre} • Archivo: {certificadoVisor.nombreArchivo}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="p-4 bg-slate-50 flex-1 overflow-auto flex items-center justify-center min-h-[320px]">
          {certificadoVisor.dataUrl.startsWith('data:application/pdf') ? (
            <iframe
              src={certificadoVisor.dataUrl}
              title={certificadoVisor.nombreArchivo}
              className="w-full h-[60vh] rounded-xl border border-slate-200 bg-white"
            />
          ) : (
            <img
              src={certificadoVisor.dataUrl}
              alt={certificadoVisor.titulo}
              className="max-h-[60vh] w-auto object-contain rounded-xl border border-slate-200 shadow-sm bg-white"
            />
          )}
        </div>
        <div className="p-3.5 sm:p-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white">
          <a
            href={certificadoVisor.dataUrl}
            download={certificadoVisor.nombreArchivo}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#006799] bg-sky-50 hover:bg-sky-100 border border-sky-200 transition text-center"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Descargar Certificado ({certificadoVisor.nombreArchivo})</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer text-center"
          >
            Cerrar Visor
          </button>
        </div>
      </div>
    </div>
  );
};
