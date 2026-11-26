'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Gift,
  Lock,
  Search,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';
import { formatCurrency, getErrorMessage } from '@/lib/utils';
import { BonoCatalogoItem, CatalogoBeneficios, SolicitudBeneficio } from '@/types';

interface SocioAsistenciaBeneficio {
  id: number;
  rut: string;
  nombre_completo: string;
  email: string;
  departamento: string;
  antiguedad: string;
  meses_antiguedad: number;
  cumple_antiguedad: boolean;
  motivo_antiguedad: string;
}

interface BeneficioAsistidoPanelProps {
  catalogo: CatalogoBeneficios | null;
  onPostulacionCreada: (sol: SolicitudBeneficio) => void;
  onIrAGestionDirectiva: () => void;
}

// [ESTUDIANTE INFORMÁTICA] Módulo exclusivo de Vista Admin para asistir presencialmente a un trabajador en la postulación a un beneficio social (SRP).
export const BeneficioAsistidoPanel: React.FC<BeneficioAsistidoPanelProps> = ({
  catalogo,
  onPostulacionCreada,
  onIrAGestionDirectiva,
}) => {
  const { user, token } = useAuth();

  const [socios, setSocios] = useState<SocioAsistenciaBeneficio[]>([]);
  const [cargandoSocios, setCargandoSocios] = useState(true);
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const [socioSeleccionado, setSocioSeleccionado] = useState<SocioAsistenciaBeneficio | null>(null);
  const [bonoSeleccionado, setBonoSeleccionado] = useState<BonoCatalogoItem | null>(null);

  // Campos del formulario asistido
  const [motivo, setMotivo] = useState('');
  const [documentoTipo, setDocumentoTipo] = useState('');
  const [documentoNombre, setDocumentoNombre] = useState('');
  const [decretoNumero, setDecretoNumero] = useState('');
  const [decretoFecha, setDecretoFecha] = useState('');
  const [diasHabiles, setDiasHabiles] = useState<number>(15);
  const [nombreBeneficiario, setNombreBeneficiario] = useState('');
  const [rutBeneficiario, setRutBeneficiario] = useState('');
  const [institucionEducacional, setInstitucionEducacional] = useState('');
  const [nivelEducacional, setNivelEducacional] = useState('Básica');
  const [edadEstudiante, setEdadEstudiante] = useState<number>(10);

  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [creada, setCreada] = useState<SolicitudBeneficio | null>(null);

  const cargarSocios = useCallback(async () => {
    if (!token) return;
    setCargandoSocios(true);
    setErrorAcceso(null);
    try {
      const data = await fetchFromApi<SocioAsistenciaBeneficio[]>('/beneficios/socios-asistencia', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSocios(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setErrorAcceso(getErrorMessage(err) || 'No fue posible cargar la nómina de trabajadores.');
      setSocios([]);
    } finally {
      setCargandoSocios(false);
    }
  }, [token]);

  useEffect(() => {
    cargarSocios();
  }, [cargarSocios]);

  const bonosDisponibles = useMemo(
    () => (catalogo?.bonos_contingencia || []).filter((b) => b.permite_postulacion_socio !== false),
    [catalogo]
  );

  const sociosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const qRut = q.replace(/[^0-9k]/gi, '');
    if (!q) return socios;
    return socios.filter((s) => {
      const rutLimpio = (s.rut || '').replace(/[^0-9k]/gi, '').toLowerCase();
      return (
        s.nombre_completo.toLowerCase().includes(q) ||
        s.departamento.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (qRut.length > 0 && rutLimpio.includes(qRut))
      );
    });
  }, [socios, busqueda]);

  const seleccionarBono = (bono: BonoCatalogoItem) => {
    setBonoSeleccionado(bono);
    setDocumentoTipo(bono.documentacion_requerida || 'Certificado oficial de respaldo');
    setMotivo(`Postulación asistida en oficina a ${bono.nombre}`);
    setErrorForm(null);
  };

  const limpiarFormulario = () => {
    setBonoSeleccionado(null);
    setMotivo('');
    setDocumentoTipo('');
    setDocumentoNombre('');
    setDecretoNumero('');
    setDecretoFecha('');
    setDiasHabiles(15);
    setNombreBeneficiario('');
    setRutBeneficiario('');
    setInstitucionEducacional('');
    setNivelEducacional('Básica');
    setEdadEstudiante(10);
    setErrorForm(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !socioSeleccionado || !bonoSeleccionado) return;
    setErrorForm(null);

    if (!socioSeleccionado.cumple_antiguedad) {
      setErrorForm('El trabajador seleccionado no cumple con los 6 meses mínimos de permanencia.');
      return;
    }
    if (bonoSeleccionado.id === 'vacaciones' && diasHabiles < 10) {
      setErrorForm('El Bono de Vacaciones exige un feriado legal mínimo de 10 días hábiles continuos.');
      return;
    }
    if (bonoSeleccionado.id === 'escolaridad' && edadEstudiante > 24) {
      setErrorForm('El Bono de Escolaridad aplica para estudiantes de hasta 24 años de edad.');
      return;
    }

    setEnviando(true);
    try {
      const res = await fetchFromApi<SolicitudBeneficio>('/beneficios/postular', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo_bono: bonoSeleccionado.id,
          socio_id: socioSeleccionado.id,
          modo_asistido: true,
          motivo: motivo.trim() || `Postulación asistida a ${bonoSeleccionado.nombre}`,
          documento_tipo: documentoTipo.trim() || bonoSeleccionado.documentacion_requerida,
          documento_nombre: documentoNombre.trim() || undefined,
          decreto_numero: bonoSeleccionado.id === 'vacaciones' ? decretoNumero.trim() || undefined : undefined,
          decreto_fecha: bonoSeleccionado.id === 'vacaciones' ? decretoFecha || undefined : undefined,
          dias_habiles_feriado: bonoSeleccionado.id === 'vacaciones' ? Number(diasHabiles) : undefined,
          nombre_beneficiario: nombreBeneficiario.trim() || undefined,
          rut_beneficiario: rutBeneficiario.trim() || undefined,
          institucion_educacional:
            bonoSeleccionado.id === 'escolaridad' ? institucionEducacional.trim() || undefined : undefined,
          nivel_educacional:
            bonoSeleccionado.id === 'escolaridad' ? nivelEducacional : undefined,
          edad_estudiante:
            bonoSeleccionado.id === 'escolaridad' ? Number(edadEstudiante) : undefined,
        }),
      });

      setCreada(res);
      limpiarFormulario();
      onPostulacionCreada(res);
    } catch (err: unknown) {
      setErrorForm(getErrorMessage(err) || 'No se pudo registrar la postulación asistida.');
    } finally {
      setEnviando(false);
    }
  };

  if (errorAcceso) {
    return (
      <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <Lock className="w-5 h-5 text-[#b45309] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm">Acceso restringido a postulación asistida</p>
          <p>{errorAcceso}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-w-0 items-start">
      {/* Paso 1: Selector de Trabajador Socio (Excluye siempre al propio admin) */}
      <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden min-w-0">
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#0c2b45] text-white text-xs font-extrabold flex items-center justify-center">
                1
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                Seleccionar Trabajador Socio
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full tabular-nums">
              {sociosFiltrados.length} cuentas
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por RUN, nombre o departamento..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
            />
          </div>

          <p className="text-[11px] text-slate-500 leading-snug">
            Por probidad, tu propia cuenta ({user?.nombreCompleto}) no aparece aquí. Para solicitar beneficios personales cambia a Vista Usuario.
          </p>
        </div>

        <div className="max-h-[540px] overflow-y-auto divide-y divide-slate-100">
          {cargandoSocios ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Cargando nómina de trabajadores...
            </div>
          ) : sociosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No se encontraron trabajadores con ese criterio.
            </div>
          ) : (
            sociosFiltrados.map((s) => {
              const activo = socioSeleccionado?.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSocioSeleccionado(s);
                    setCreada(null);
                    setErrorForm(null);
                  }}
                  className={`w-full text-left p-3.5 transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                    activo
                      ? 'bg-sky-50/90 border-l-4 border-l-[#006799]'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {s.nombre_completo}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500">
                      {s.rut} • {s.departamento}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                      s.cumple_antiguedad
                        ? 'bg-emerald-50 text-[#166534] border-emerald-200'
                        : 'bg-amber-50 text-[#b45309] border-amber-200'
                    }`}
                  >
                    {s.cumple_antiguedad
                      ? `Habilitado (${s.meses_antiguedad}m)`
                      : `Carencia (${s.meses_antiguedad}/6m)`}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Paso 2 y 3: Elegibilidad del Trabajador + Selección de Beneficio + Formulario */}
      <div className="xl:col-span-7 space-y-5 min-w-0">
        {creada && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#166534] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-sm">
                  ¡Beneficio BEN-{String(creada.id).padStart(4, '0')} solicitado con éxito!
                </p>
                <p className="mt-0.5">
                  Registrado <strong>{creada.titulo_bono}</strong> para{' '}
                  <strong>{creada.socio_nombre}</strong> por{' '}
                  <strong>{formatCurrency(creada.monto_calculado)}</strong>. Quedó en estado{' '}
                  <strong>{creada.estado}</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onIrAGestionDirectiva}
              className="px-3.5 py-2 rounded-xl bg-[#166534] text-white font-bold hover:opacity-95 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Ver en Gestión Directiva →
            </button>
          </div>
        )}

        {!socioSeleccionado ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-[#006799] flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Seleccione un trabajador para solicitar su beneficio
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Elija al socio trabajador en el panel izquierdo para verificar su antigüedad estatutaria (6 meses), seleccionar el beneficio social correspondiente y llenar la solicitud en su nombre.
            </p>
          </div>
        ) : (
          <>
            {/* Ficha del Trabajador Seleccionado */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#006799] block">
                    Trabajador Atendido en Oficina
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 truncate">
                    {socioSeleccionado.nombre_completo}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    RUN {socioSeleccionado.rut} • {socioSeleccionado.departamento} • Antigüedad: {socioSeleccionado.meses_antiguedad} mes(es)
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-auto shrink-0 ${
                    socioSeleccionado.cumple_antiguedad
                      ? 'bg-emerald-50 text-[#166534] border-emerald-200'
                      : 'bg-amber-50 text-[#b45309] border-amber-300'
                  }`}
                >
                  {socioSeleccionado.cumple_antiguedad
                    ? '✓ Cumple Carencia (≥ 6 meses)'
                    : `✕ Carencia Activa (${socioSeleccionado.meses_antiguedad}/6 meses)`}
                </span>
              </div>

              {!socioSeleccionado.cumple_antiguedad && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-[#b45309] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Postulación bloqueada por Período de Carencia (Art. 14)</p>
                    <p>{socioSeleccionado.motivo_antiguedad}. Debe cumplir al menos 6 meses continuos como socio.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Selección de Beneficio + Formulario Completo */}
            {socioSeleccionado.cumple_antiguedad && (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-5 text-xs">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="w-6 h-6 rounded-lg bg-[#006799] text-white text-xs font-extrabold flex items-center justify-center">
                      2
                    </span>
                    <h2 className="text-sm font-bold text-slate-900">
                      Seleccionar Beneficio Social
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {bonosDisponibles.map((bono) => {
                      const elegido = bonoSeleccionado?.id === bono.id;
                      return (
                        <button
                          key={bono.id}
                          type="button"
                          onClick={() => seleccionarBono(bono)}
                          className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                            elegido
                              ? 'bg-sky-50 border-[#006799] ring-2 ring-[#006799]/20'
                              : 'bg-slate-50/70 border-slate-200/90 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-900 leading-snug">
                              {bono.nombre}
                            </span>
                            <span className="font-extrabold text-[#166534] tabular-nums shrink-0">
                              {formatCurrency(bono.monto_calculado)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {bono.porcentaje}% Grado 15 • {bono.categoria}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {bonoSeleccionado && (
                  <form onSubmit={handleSubmit} className="space-y-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#166534] text-white text-xs font-extrabold flex items-center justify-center">
                        3
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        Datos de Postulación: {bonoSeleccionado.nombre}
                      </h3>
                    </div>

                    <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200/80 text-[11px] text-slate-700 space-y-1">
                      <p>
                        <strong>Monto a solicitar:</strong>{' '}
                        <span className="font-extrabold text-[#166534]">
                          {formatCurrency(bonoSeleccionado.monto_calculado)}
                        </span>{' '}
                        ({bonoSeleccionado.porcentaje}% de Sueldo Grado 15)
                      </p>
                      <p>
                        <strong>Documentación exigida:</strong> {bonoSeleccionado.documentacion_requerida}
                      </p>
                    </div>

                    {errorForm && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{errorForm}</span>
                      </div>
                    )}

                    {/* Campos condicionales: Vacaciones */}
                    {bonoSeleccionado.id === 'vacaciones' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">N° Decreto Alcaldicio *</label>
                          <input
                            type="text"
                            required
                            value={decretoNumero}
                            onChange={(e) => setDecretoNumero(e.target.value)}
                            placeholder="DEC-ALC-1042/2026"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Fecha Decreto *</label>
                          <input
                            type="date"
                            required
                            value={decretoFecha}
                            onChange={(e) => setDecretoFecha(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Días Hábiles (mín. 10) *</label>
                          <input
                            type="number"
                            required
                            min={10}
                            value={diasHabiles}
                            onChange={(e) => setDiasHabiles(Number(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
                          />
                        </div>
                      </div>
                    )}

                    {/* Campos condicionales: Escolaridad */}
                    {bonoSeleccionado.id === 'escolaridad' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Nombre del Estudiante *</label>
                          <input
                            type="text"
                            required
                            value={nombreBeneficiario}
                            onChange={(e) => setNombreBeneficiario(e.target.value)}
                            placeholder="Nombre completo hijo/a estudiante"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">RUN Estudiante</label>
                          <input
                            type="text"
                            value={rutBeneficiario}
                            onChange={(e) => setRutBeneficiario(e.target.value)}
                            placeholder="22.345.678-9"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Institución Educacional *</label>
                          <input
                            type="text"
                            required
                            value={institucionEducacional}
                            onChange={(e) => setInstitucionEducacional(e.target.value)}
                            placeholder="Colegio / Liceo / Universidad"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Nivel *</label>
                            <select
                              value={nivelEducacional}
                              onChange={(e) => setNivelEducacional(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                            >
                              <option value="Prebásica">Prebásica</option>
                              <option value="Básica">Básica</option>
                              <option value="Media">Media</option>
                              <option value="Superior">Superior</option>
                            </select>
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Edad (≤24) *</label>
                            <input
                              type="number"
                              required
                              min={1}
                              max={24}
                              value={edadEstudiante}
                              onChange={(e) => setEdadEstudiante(Number(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Campos condicionales: Nacimiento / Fallecimiento */}
                    {['nacimiento', 'fallecimiento_familiar', 'fallecimiento_afiliado'].includes(
                      bonoSeleccionado.id
                    ) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Nombre del Beneficiario / Carga *</label>
                          <input
                            type="text"
                            required
                            value={nombreBeneficiario}
                            onChange={(e) => setNombreBeneficiario(e.target.value)}
                            placeholder="Nombre completo"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">RUN Beneficiario / Carga</label>
                          <input
                            type="text"
                            value={rutBeneficiario}
                            onChange={(e) => setRutBeneficiario(e.target.value)}
                            placeholder="XX.XXX.XXX-X"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Tipo de Documento Presentado *
                        </label>
                        <input
                          type="text"
                          required
                          value={documentoTipo}
                          onChange={(e) => setDocumentoTipo(e.target.value)}
                          placeholder="Ej: Certificado de Alumno Regular"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Nombre / Folio del Archivo de Respaldo
                        </label>
                        <input
                          type="text"
                          value={documentoNombre}
                          onChange={(e) => setDocumentoNombre(e.target.value)}
                          placeholder="Ej: Certificado_2026.pdf"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Motivo / Observaciones de Atención en Oficina *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Detalle de la solicitud ingresada en apoyo al trabajador..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25 resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={limpiarFormulario}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                      >
                        Limpiar
                      </button>
                      <button
                        type="submit"
                        disabled={enviando}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#166534] to-[#558b2f] hover:opacity-95 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Gift className="w-3.5 h-3.5" />
                        <span>
                          {enviando
                            ? 'Enviando solicitud...'
                            : `Solicitar Beneficio para ${socioSeleccionado.nombre_completo.split(' ')[0]}`}
                        </span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
