'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';
import {
  EvaluacionDirectorioTable,
  SolicitudResumen,
} from '@/components/afiliacion/EvaluacionDirectorioTable';
import { ModalResolucionAfiliacion } from '@/components/afiliacion/ModalResolucionAfiliacion';

const ROLES_DIRECTIVA = ['presidente', 'secretario', 'tesorero', 'admin', 'auditor', 'superusuario'];
const ROLES_RESOLUTIVOS = ['presidente', 'secretario', 'superusuario'];

export default function AfiliacionPage() {
  const { user, token } = useAuth();
  const esDirectiva = !!user && (user.isSuperuser || ROLES_DIRECTIVA.includes(user.rol));
  const puedeResolver = !!user && (user.isSuperuser || ROLES_RESOLUTIVOS.includes(user.rol));

  const [solicitudes, setSolicitudes] = useState<SolicitudResumen[] | null>(null);
  const [cargando, setCargando] = useState(false);

  // Modal de resolución (HU-02)
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudResumen | null>(null);
  const [modoResolucion, setModoResolucion] = useState<'aprobar' | 'rechazar' | null>(null);
  const [fechaSesion, setFechaSesion] = useState(new Date().toISOString().split('T')[0]);
  const [numeroActa, setNumeroActa] = useState('Acta Ordinaria N° 04-2026');
  const [observaciones, setObservaciones] = useState('');
  const [resolviendo, setResolviendo] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const cargarSolicitudes = () => {
    if (!esDirectiva || !token) return;
    setCargando(true);
    fetchFromApi<SolicitudResumen[]>('/afiliacion/solicitudes', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(setSolicitudes)
      .catch(() => setSolicitudes([]))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarSolicitudes();
  }, [esDirectiva, token]);

  const abrirModal = (sol: SolicitudResumen, modo: 'aprobar' | 'rechazar') => {
    setSolicitudSeleccionada(sol);
    setModoResolucion(modo);
    setErrorModal(null);
    setMensajeExito(null);
    setFechaSesion(new Date().toISOString().split('T')[0]);
    if (modo === 'rechazar') {
      setObservaciones(
        'Inconsistencia en calidad contractual / antecedentes de cargas familiares incompletos para acreditar asignación.'
      );
    } else {
      setObservaciones('');
    }
  };

  const cerrarModal = () => {
    setSolicitudSeleccionada(null);
    setModoResolucion(null);
    setErrorModal(null);
  };

  const handleResolver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solicitudSeleccionada || !modoResolucion || !token) return;
    setErrorModal(null);
    setResolviendo(true);

    try {
      await fetchFromApi(`/afiliacion/solicitudes/${solicitudSeleccionada.folio}/resolucion`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accion: modoResolucion,
          fechaSesion,
          numeroActa,
          observaciones,
        }),
      });

      setMensajeExito(
        modoResolucion === 'aprobar'
          ? `Solicitud ${solicitudSeleccionada.folio} aprobada con éxito. El funcionario es ahora Socio Activo con cómputo de 6 meses de carencia y nómina de retenciones asignada.`
          : `Solicitud ${solicitudSeleccionada.folio} rechazada. Se registró la causal para notificación formal.`
      );
      cerrarModal();
      cargarSolicitudes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar resolución.';
      setErrorModal(msg);
    } finally {
      setResolviendo(false);
    }
  };

  const cargas = [
    { id: 1, nombre: 'Valentina Valenzuela Gómez', parentesco: 'Hija', rut: '24.120.334-1', edad: '7 años', estado: 'Vigente' },
    { id: 2, nombre: 'Matías Valenzuela Gómez', parentesco: 'Hijo', rut: '26.445.892-3', edad: '4 años', estado: 'Vigente' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Afiliación y Cargas Familiares</h1>
          <p className="text-xs text-slate-500">
            Gestión de incorporación según acuerdos de sesión ordinaria y registro de cargas
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/finanzas"
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-sm"
          >
            📋 Ver Nómina Retenciones (Finanzas)
          </Link>
          <Link
            href="/"
            className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition"
          >
            ← Volver al Dashboard
          </Link>
        </div>
      </div>

      {mensajeExito && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✔</span>
            <span>{mensajeExito}</span>
          </div>
          <button onClick={() => setMensajeExito(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Evaluación de Incorporaciones (HU-02) */}
      {esDirectiva && (
        <EvaluacionDirectorioTable
          solicitudes={solicitudes}
          cargando={cargando}
          puedeResolver={puedeResolver}
          onAbrirModal={abrirModal}
        />
      )}

      {/* Cargas Familiares Reconocidas */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800">Cargas Familiares Reconocidas del Socio Titular</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold uppercase">
                <th className="py-3 px-4">Nombre Completo</th>
                <th className="py-3 px-4">Parentesco</th>
                <th className="py-3 px-4">RUT</th>
                <th className="py-3 px-4">Edad</th>
                <th className="py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargas.map((carga) => (
                <tr key={carga.id}>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{carga.nombre}</td>
                  <td className="py-3.5 px-4 text-slate-600">{carga.parentesco}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{carga.rut}</td>
                  <td className="py-3.5 px-4 text-slate-600">{carga.edad}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {carga.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Resolución Modular (HU-02) */}
      <ModalResolucionAfiliacion
        solicitud={solicitudSeleccionada}
        modoResolucion={modoResolucion}
        fechaSesion={fechaSesion}
        setFechaSesion={setFechaSesion}
        numeroActa={numeroActa}
        setNumeroActa={setNumeroActa}
        observaciones={observaciones}
        setObservaciones={setObservaciones}
        resolviendo={resolviendo}
        errorModal={errorModal}
        onClose={cerrarModal}
        onSubmit={handleResolver}
      />
    </div>
  );
}
