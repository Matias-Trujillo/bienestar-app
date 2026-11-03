'use client';

import React, { useEffect, useState } from 'react';
import { fetchFromApi } from '@/lib/api';

export interface CorreoBuzonItem {
  id: string;
  tipo: 'recepcion_solicitud' | 'resolucion_solicitud';
  folio: string;
  destinatario: string;
  remitente?: string;
  nombreDestinatario?: string;
  runDestinatario?: string;
  asunto: string;
  fechaEmision: string;
  estadoSolicitud?: string;
  estadoResolucion?: string;
  resumenEstado: string;
  motivo?: string;
  credencialesAcceso?: {
    portalUrl: string;
    usuarioRut: string;
    usuarioEmail: string;
    claveTemporal: string;
    requiereCambioObligatorio: boolean;
  } | null;
  pasosSeguir: string[];
  cuerpoTexto: string;
  enviadoSmtp: boolean;
}

interface BuzonCorreosModalProps {
  isOpen: boolean;
  onClose: () => void;
  filtroInicial?: string;
  onUsarCredenciales?: (rutOrEmail: string, claveTemporal: string) => void;
}

export const BuzonCorreosModal: React.FC<BuzonCorreosModalProps> = ({
  isOpen,
  onClose,
  filtroInicial = '',
  onUsarCredenciales,
}) => {
  const [busqueda, setBusqueda] = useState(filtroInicial);
  const [correos, setCorreos] = useState<CorreoBuzonItem[]>([]);
  const [seleccionado, setSeleccionado] = useState<CorreoBuzonItem | null>(null);
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const cargarBuzon = async (q?: string) => {
    setCargando(true);
    try {
      const query = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
      const res = await fetchFromApi<{ total: number; correos: CorreoBuzonItem[] }>(
        `/afiliacion/buzon${query}`
      );
      setCorreos(res.correos || []);
      if (res.correos && res.correos.length > 0) {
        setSeleccionado(res.correos[0]);
      } else {
        setSeleccionado(null);
      }
    } catch {
      setCorreos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setBusqueda(filtroInicial);
      cargarBuzon(filtroInicial);
    }
  }, [isOpen, filtroInicial]);

  if (!isOpen) return null;

  const copiarTexto = (txt: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(txt);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-[86vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Cabecera estilo cliente de correo profesional */}
        <div className="bg-[#091e2e] text-white px-5 py-4 flex items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-lg">
              📬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-300">
                  Servidor de Correo Transaccional • Comité de Bienestar
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  En línea
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                Bandeja de Correos Emitidos (Recepción, Aprobación con Clave y Rechazo)
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Barra de búsqueda por correo, RUT o Folio */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 flex gap-2">
            <input
              type="search"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                cargarBuzon(e.target.value);
              }}
              placeholder="Filtrar por correo (ej: fabian_07915@hotmail.com), RUT o N° de Solicitud (AF-2026-...)..."
              className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="button"
              onClick={() => cargarBuzon(busqueda)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition cursor-pointer"
            >
              ↻ Actualizar
            </button>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Mostrando <strong>{correos.length}</strong> correo(s) emitidos
          </span>
        </div>

        {/* Cuerpo dividido: Lista de correos a la izquierda + Vista de lectura a la derecha */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Columna izquierda: Bandeja de entrada */}
          <div className="md:col-span-5 border-r border-slate-200 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
            {cargando ? (
              <p className="p-6 text-center text-xs text-slate-400">Cargando bandeja de correos...</p>
            ) : correos.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400 italic">
                No se encontraron correos para el filtro ingresado.
              </p>
            ) : (
              correos.map((c) => {
                const activo = seleccionado?.id === c.id;
                const badgeCls =
                  c.estadoResolucion === 'ACEPTADA'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : c.estadoResolucion === 'RECHAZADA'
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : 'bg-sky-100 text-sky-800 border-sky-200';
                const badgeTxt =
                  c.estadoResolucion === 'ACEPTADA'
                    ? '✔ Aprobación + Clave'
                    : c.estadoResolucion === 'RECHAZADA'
                    ? '✕ Rechazo + Motivo'
                    : '📩 Confirmación Ingreso';

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSeleccionado(c)}
                    className={`w-full text-left p-4 transition block cursor-pointer ${
                      activo
                        ? 'bg-white border-l-4 border-l-sky-600 shadow-sm'
                        : 'hover:bg-white/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeCls}`}>
                        {badgeTxt}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{c.folio}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 line-clamp-1">{c.asunto}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                      Para: <strong className="text-slate-800">{c.destinatario}</strong>
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>{c.nombreDestinatario} ({c.runDestinatario})</span>
                      <span>{c.fechaEmision}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Columna derecha: Lectura completa del correo seleccionado */}
          <div className="md:col-span-7 overflow-y-auto p-5 sm:p-6 bg-white space-y-5">
            {!seleccionado ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Seleccione un correo de la bandeja izquierda para leer su contenido.
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 pb-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      Solicitud N° {seleccionado.folio}
                    </span>
                    <span className="text-xs text-slate-400">{seleccionado.fechaEmision}</span>
                  </div>
                  <h4 className="text-base sm:text-lg font-extrabold text-slate-900">
                    {seleccionado.asunto}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400">De: </span>
                      <strong className="text-slate-700">
                        {seleccionado.remitente || 'Comité de Bienestar <bienestar@mperalillo.cl>'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Para: </span>
                      <strong className="text-sky-700">{seleccionado.destinatario}</strong>
                    </div>
                  </div>
                </div>

                {/* Banner principal: Solicitud N° tanto fue ACEPTADA / RECHAZADA / RECEPCIONADA + Motivo */}
                <div
                  className={`rounded-2xl p-4 border ${
                    seleccionado.estadoResolucion === 'ACEPTADA'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : seleccionado.estadoResolucion === 'RECHAZADA'
                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                      : 'bg-sky-50 border-sky-200 text-sky-950'
                  }`}
                >
                  <p className="text-xs font-extrabold uppercase tracking-wider mb-1">
                    {seleccionado.estadoResolucion === 'ACEPTADA'
                      ? `✔ Su Solicitud N° ${seleccionado.folio} fue ACEPTADA`
                      : seleccionado.estadoResolucion === 'RECHAZADA'
                      ? `✕ Su Solicitud N° ${seleccionado.folio} fue RECHAZADA`
                      : `📩 Su Solicitud N° ${seleccionado.folio} fue RECEPCIONADA Y ESTÁ EN GESTIÓN`}
                  </p>
                  <p className="text-xs leading-relaxed">
                    <strong>Motivo / Detalle:</strong> {seleccionado.motivo || seleccionado.resumenEstado}
                  </p>
                </div>

                {/* Credenciales Iniciales si es el correo de aprobación */}
                {seleccionado.credencialesAcceso && (
                  <div className="rounded-2xl bg-slate-900 text-white p-4 sm:p-5 space-y-3 shadow-md">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                          🔑 Credenciales de Acceso Inicial al Portal
                        </span>
                        <h5 className="text-sm font-bold text-white">
                          Utilice estos datos para iniciar sesión por primera vez
                        </h5>
                      </div>
                      {onUsarCredenciales && (
                        <button
                          type="button"
                          onClick={() => {
                            onUsarCredenciales(
                              seleccionado.credencialesAcceso!.usuarioEmail ||
                                seleccionado.credencialesAcceso!.usuarioRut,
                              seleccionado.credencialesAcceso!.claveTemporal
                            );
                            onClose();
                          }}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow cursor-pointer"
                        >
                          → Rellenar en Login e Ingresar Ahora
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="bg-slate-800/90 p-3 rounded-xl border border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Usuario (RUT)
                        </span>
                        <span className="font-mono font-bold text-white text-sm">
                          {seleccionado.credencialesAcceso.usuarioRut}
                        </span>
                      </div>
                      <div className="bg-slate-800/90 p-3 rounded-xl border border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          O Correo
                        </span>
                        <span className="font-semibold text-sky-300 truncate block">
                          {seleccionado.credencialesAcceso.usuarioEmail}
                        </span>
                      </div>
                      <div className="bg-emerald-950/90 p-3 rounded-xl border border-emerald-500/40 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-emerald-300 uppercase font-bold block">
                            Contraseña Temporal
                          </span>
                          <span className="font-mono font-extrabold text-emerald-400 text-sm">
                            {seleccionado.credencialesAcceso.claveTemporal}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            copiarTexto(seleccionado.credencialesAcceso!.claveTemporal)
                          }
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition cursor-pointer"
                        >
                          {copiado ? '✓' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pasos a seguir */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                  <p className="text-xs font-bold text-slate-800">
                    📋 Pasos a seguir indicados en este correo:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-700 leading-relaxed">
                    {seleccionado.pasosSeguir.map((paso, idx) => (
                      <li key={idx}>{paso}</li>
                    ))}
                  </ol>
                </div>

                {/* Cuerpo completo del mensaje */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Contenido Íntegro del Correo Electrónico
                  </p>
                  <pre className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                    {seleccionado.cuerpoTexto}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

