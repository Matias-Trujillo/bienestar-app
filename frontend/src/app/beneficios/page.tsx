'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  BonoCatalogoItem,
  CatalogoBeneficios,
  SolicitudBeneficio,
  SimularNominaResponse,
  SimularNominaItem,
} from '@/types';
import {
  GiftIcon,
  SnowflakeIcon,
  PalmtreeIcon,
  FileTextIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SettingsIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  SlidersIcon,
} from '@/components/beneficios/Icons';
import { CatalogoBonos } from '@/components/beneficios/CatalogoBonos';
import { HojaBeneficiosTable } from '@/components/beneficios/HojaBeneficiosTable';
import { GestionDirectivaTable } from '@/components/beneficios/GestionDirectivaTable';
import { LiquidacionMasivaPanel } from '@/components/beneficios/LiquidacionMasivaPanel';
import { ModalesBeneficios } from '@/components/beneficios/ModalesBeneficios';

export default function BeneficiosPage() {
  const { user, token } = useAuth();

  const authHeaders = useMemo((): Record<string, string> => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  // Estados principales
  const [activeTab, setActiveTab] = useState<'catalogo' | 'hoja_socio' | 'gestion_directiva' | 'liquidacion_masiva'>('catalogo');
  const [catalogo, setCatalogo] = useState<CatalogoBeneficios | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudBeneficio[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modales
  const [modalPostularBono, setModalPostularBono] = useState<BonoCatalogoItem | null>(null);
  const [modalAsignacionDirecta, setModalAsignacionDirecta] = useState<boolean>(false);
  const [modalConfigBaseG15, setModalConfigBaseG15] = useState<boolean>(false);
  const [modalValidarSolicitud, setModalValidarSolicitud] = useState<SolicitudBeneficio | null>(null);
  const [modalVisorDoc, setModalVisorDoc] = useState<{ titulo: string; tipo: string; num?: string; url?: string; detalle?: string } | null>(null);
  const [modalExportarTesoreria, setModalExportarTesoreria] = useState<any | null>(null);

  // Formularios
  const [formPostulacion, setFormPostulacion] = useState({
    motivo: '',
    documento_tipo: '',
    documento_nombre: '',
    decreto_numero: '',
    decreto_fecha: '',
    dias_habiles_feriado: 15,
    nombre_beneficiario: '',
    rut_beneficiario: '',
    institucion_educacional: '',
    nivel_educacional: 'Básica',
    edad_estudiante: 10,
  });

  const [formAsigDirecta, setFormAsigDirecta] = useState({
    socio_id: 7,
    decreto_numero: 'DEC-ALC-1042/2026',
    decreto_fecha: '2026-02-01',
    dias_habiles_feriado: 15,
    documento_nombre: 'Decreto_Alcaldicio_FeriadoLegal_2026.pdf',
    observaciones: 'Cumple con feriado legal continuo superior a 10 días hábiles. Asignación directa.',
    metodo_pago: 'Cheque',
    numero_cheque: 'CHQ-885102',
    banco: 'BancoEstado',
  });

  const [formValidacion, setFormValidacion] = useState({
    accion: 'APROBAR' as 'APROBAR' | 'RECHAZAR' | 'LIQUIDAR',
    motivo_rechazo: '',
    observaciones: '',
    metodo_pago: 'Cheque',
    numero_cheque: '',
    banco: 'BancoEstado',
  });

  // Estados nómina masiva
  const [tipoBonoMasivo, setTipoBonoMasivo] = useState<'invierno' | 'navidad'>('invierno');
  const [porcentajeNavidad, setPorcentajeNavidad] = useState<number>(12.5);
  const [decretoMarco, setDecretoMarco] = useState<string>('DEC-ALC-774/2026 (Decreto Marco Bono Invierno)');
  const [actaDirectorio, setActaDirectorio] = useState<string>('Acta Directorio N° 05/2026');
  const [simulacionResult, setSimulacionResult] = useState<SimularNominaResponse | null>(null);
  const [isSimulando, setIsSimulando] = useState<boolean>(false);
  const [isEjecutando, setIsEjecutando] = useState<boolean>(false);
  const [baseG15Nueva, setBaseG15Nueva] = useState<number>(750000);

  const esDirectivaOAdmin = useMemo(() => {
    if (!user) return false;
    return (
      user.isSuperuser ||
      ['admin', 'presidente', 'secretario', 'tesorero', 'superusuario', 'auditor'].includes(user.rol)
    );
  }, [user]);

  const cargarDatos = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [catRes, solRes] = await Promise.all([
        fetchFromApi<CatalogoBeneficios>('/beneficios/catalogo'),
        fetchFromApi<SolicitudBeneficio[]>('/beneficios/solicitudes', { headers: authHeaders }),
      ]);
      setCatalogo(catRes);
      setSolicitudes(solRes);
      setBaseG15Nueva(catRes.sueldo_base_grado_15);

      if (esDirectivaOAdmin && token) {
        try {
          const paramsRes = await fetchFromApi<{ sueldo_base_grado_15: number; bono_navidad_porcentaje: number }>('/beneficios/parametros', { headers: authHeaders });
          if (paramsRes.bono_navidad_porcentaje) {
            setPorcentajeNavidad(paramsRes.bono_navidad_porcentaje);
          }
        } catch (_) {}
      }
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      setErrorMsg(err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [token, esDirectivaOAdmin]);

  // Handlers de formularios
  const handlePostular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPostularBono) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        tipo_bono: modalPostularBono.id,
        motivo: formPostulacion.motivo || `Postulación a ${modalPostularBono.nombre}`,
        documento_tipo: formPostulacion.documento_tipo || modalPostularBono.documentacion_requerida,
        documento_nombre: formPostulacion.documento_nombre || `${modalPostularBono.id}_respaldo.pdf`,
        documento_url: `/docs/postulaciones/${modalPostularBono.id}_${Date.now()}.pdf`,
        decreto_numero: formPostulacion.decreto_numero || undefined,
        decreto_fecha: formPostulacion.decreto_fecha || undefined,
        dias_habiles_feriado: modalPostularBono.id === 'vacaciones' ? formPostulacion.dias_habiles_feriado : undefined,
        nombre_beneficiario: formPostulacion.nombre_beneficiario || undefined,
        rut_beneficiario: formPostulacion.rut_beneficiario || undefined,
        institucion_educacional: formPostulacion.institucion_educacional || undefined,
        nivel_educacional: formPostulacion.nivel_educacional || undefined,
        edad_estudiante: modalPostularBono.id === 'escolaridad' ? formPostulacion.edad_estudiante : undefined,
      };

      const resp = await fetchFromApi<SolicitudBeneficio>('/beneficios/postular', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      setSuccessMsg(`¡Postulación a "${resp.titulo_bono}" ingresada con éxito! Monto calculado: ${formatCurrency(resp.monto_calculado)}.`);
      setModalPostularBono(null);
      await cargarDatos();
      setActiveTab('hoja_socio');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la postulación.');
    }
  };

  const handleAsignacionDirecta = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const resp = await fetchFromApi<SolicitudBeneficio>('/beneficios/asignacion-directa-vacaciones', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(formAsigDirecta),
      });

      setSuccessMsg(
        `¡Bono de Vacaciones asignado directamente a ${resp.socio_nombre}! Decreto N° ${resp.decreto_numero} (${resp.dias_habiles_feriado} días hábiles) - Monto: ${formatCurrency(resp.monto_calculado)}.`
      );
      setModalAsignacionDirecta(false);
      await cargarDatos();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la asignación directa.');
    }
  };

  const handleValidarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalValidarSolicitud) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const resp = await fetchFromApi<SolicitudBeneficio>(`/beneficios/solicitudes/${modalValidarSolicitud.id}/validar`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(formValidacion),
      });

      setSuccessMsg(`Solicitud #${resp.id} actualizada a estado "${resp.estado}" correctamente.`);
      setModalValidarSolicitud(null);
      await cargarDatos();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar la solicitud.');
    }
  };

  const handleSimularNomina = async (tipo: 'invierno' | 'navidad') => {
    setIsSimulando(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const periodo = tipo === 'invierno' ? 'Julio 2026' : 'Diciembre 2026';
      const dec = tipo === 'invierno' ? 'DEC-ALC-774/2026 (Bono Invierno Municipal)' : 'DEC-ALC-1290/2026 (Acuerdo Presupuestario Navidad)';
      setDecretoMarco(dec);

      const payload = {
        tipo_bono: tipo,
        periodo,
        porcentaje: tipo === 'navidad' ? porcentajeNavidad : 15.0,
        decreto_marco: dec,
      };

      const resp = await fetchFromApi<SimularNominaResponse>('/beneficios/nominas/simular', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      setSimulacionResult(resp);
      setSuccessMsg(
        `Simulación exitosa: ${resp.total_socios_beneficiados} socios cumplen requisito de permanencia (>= 6 meses). Monto total: ${formatCurrency(resp.monto_total_requerido)}.`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al simular la nómina masiva.');
    } finally {
      setIsSimulando(false);
    }
  };

  const handleEjecutarNomina = async () => {
    if (!simulacionResult) return;
    setIsEjecutando(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        tipo_bono: simulacionResult.tipo_bono,
        titulo: simulacionResult.titulo,
        periodo: simulacionResult.periodo,
        porcentaje: simulacionResult.porcentaje_aplicado,
        decreto_marco: decretoMarco,
        acuerdo_directorio_acta: actaDirectorio,
        banco_emisor: 'BancoEstado',
        detalles: simulacionResult.items,
      };

      const resp = await fetchFromApi<any>('/beneficios/nominas/ejecutar', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      setSuccessMsg(resp.mensaje || '¡Nómina formalizada y cheques asignados con éxito!');
      setModalExportarTesoreria({
        titulo: simulacionResult.titulo,
        periodo: simulacionResult.periodo,
        items: simulacionResult.items.filter((i) => i.cumple_antiguedad),
        totalMonto: simulacionResult.monto_total_requerido,
        decreto: decretoMarco,
      });
      setSimulacionResult(null);
      await cargarDatos();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al formalizar la nómina masiva.');
    } finally {
      setIsEjecutando(false);
    }
  };

  const handleSubirPlanillaCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${API_URL}/beneficios/cargar-planilla-csv`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Error al procesar la planilla.');
      }

      const items: SimularNominaItem[] = await res.json();
      const beneficiados = items.filter((i) => i.cumple_antiguedad);
      const baseG15 = catalogo?.sueldo_base_grado_15 || 750000;
      const montoTot = beneficiados.reduce((acc, i) => acc + i.monto, 0);

      setSimulacionResult({
        tipo_bono: tipoBonoMasivo,
        titulo: `Nómina Cargada desde Planilla (${file.name})`,
        periodo: 'Período Activo 2026',
        porcentaje_aplicado: 15.0,
        sueldo_base_utilizado: baseG15,
        monto_unitario: Math.round(baseG15 * 0.15),
        total_socios_evaluados: items.length,
        total_socios_beneficiados: beneficiados.length,
        total_socios_excluidos: items.length - beneficiados.length,
        monto_total_requerido: montoTot,
        decreto_marco: 'DEC-ALC-PLANILLA/2026',
        items,
      });

      setSuccessMsg(`Planilla procesada con éxito: ${items.length} filas analizadas, ${beneficiados.length} habilitadas para liquidación.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el archivo CSV.');
    }
  };

  const handleGuardarBaseG15 = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchFromApi('/beneficios/parametros', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          clave: 'SUELDO_BASE_GRADO_15',
          valor: String(baseG15Nueva),
          descripcion: 'Sueldo imponible de referencia Grado 15 (CLP)',
        }),
      });
      setSuccessMsg(`Base Grado 15 actualizada a ${formatCurrency(baseG15Nueva)}. Los montos de todos los bonos se recalcularon automáticamente.`);
      setModalConfigBaseG15(false);
      await cargarDatos();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar parámetro.');
    }
  };

  const handleDescargarPlantillaCSV = () => {
    const csvContent =
      'RUN,Nombres,Apellidos,Decreto,FechaDecreto\n' +
      '15.489.123-K,Carlos,Valenzuela Morales,DEC-ALC-774/2026,2026-07-20\n' +
      '18.765.432-1,Javiera,Herrera Tapia,DEC-ALC-774/2026,2026-07-20\n' +
      '12.345.678-9,María Elena,Soto Pérez,DEC-ALC-774/2026,2026-07-20\n' +
      '13.456.789-0,Patricia,Fuentes Rojas,DEC-ALC-774/2026,2026-07-20\n' +
      '19.876.543-2,Felipe,Morales Sandoval,DEC-ALC-774/2026,2026-07-20\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Plantilla_Nomina_Bonos_Peralillo.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const antiguedadMesesActual = user?.mesesAntiguedad ?? 12;
  const cumpleRequisito6Meses = antiguedadMesesActual >= 6;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Header Institucional & Parámetros */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-700/50">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Municipalidad de Peralillo • Comité de Bienestar
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Módulo de Beneficios Sociales y Bonos
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Gestión centralizada de asignaciones económicas calculadas sobre el{' '}
              <strong className="text-white">Sueldo Imponible de Grado 15</strong>, validación legal de documentos de respaldo y liquidación automatizada de bonos de contingencia y calendario.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col justify-between">
              <span className="text-slate-400 text-[11px] font-medium flex items-center justify-between">
                Base Grado 15
                {esDirectivaOAdmin && (
                  <button
                    onClick={() => setModalConfigBaseG15(true)}
                    className="text-blue-300 hover:text-white transition"
                    title="Configurar sueldo Grado 15"
                  >
                    <SettingsIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
              <span className="text-lg font-black text-white mt-1">
                {catalogo ? formatCurrency(catalogo.sueldo_base_grado_15) : '$750.000'}
              </span>
              <span className="text-[10px] text-emerald-300 mt-0.5">Base de cálculo activa</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col justify-between">
              <span className="text-slate-400 text-[11px] font-medium">Requisito Permanencia</span>
              <span className="text-base font-bold text-white mt-1">Mínimo 6 Meses</span>
              <span className={`text-[10px] font-semibold mt-0.5 ${cumpleRequisito6Meses ? 'text-emerald-300' : 'text-amber-300'}`}>
                {user?.nombreCompleto ? (cumpleRequisito6Meses ? '✓ Socio Habilitado' : '⚠ Antigüedad < 6 meses') : 'Regla activa'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 col-span-2 sm:col-span-1 flex flex-col justify-between">
              <span className="text-slate-400 text-[11px] font-medium">Próximo Bono Calendario</span>
              <span className="text-sm font-bold text-blue-200 mt-1">Invierno (Julio, 15%)</span>
              <span className="text-[10px] text-slate-300 mt-0.5">Navidad (Diciembre, 10-15%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-semibold">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-bold p-1">
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangleIcon className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <p className="text-sm font-semibold">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-900 font-bold p-1">
            ✕
          </button>
        </div>
      )}

      {/* 2. Barra de Navegación por Pestañas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('catalogo')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'catalogo'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <GiftIcon className="w-4 h-4" />
            Catálogo & Reglas de Bonos
          </button>

          <button
            onClick={() => setActiveTab('hoja_socio')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'hoja_socio'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileTextIcon className="w-4 h-4" />
            Mi Hoja de Beneficios
            {solicitudes.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'hoja_socio' ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-700'}`}>
                {solicitudes.length}
              </span>
            )}
          </button>

          {esDirectivaOAdmin && (
            <>
              <button
                onClick={() => setActiveTab('gestion_directiva')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'gestion_directiva'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <ShieldCheckIcon className="w-4 h-4" />
                Gestión & Aprobaciones (Directiva)
              </button>

              <button
                onClick={() => setActiveTab('liquidacion_masiva')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'liquidacion_masiva'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <SlidersIcon className="w-4 h-4" />
                Liquidación Masiva (HU-06)
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {esDirectivaOAdmin && (
            <button
              onClick={() => setModalAsignacionDirecta(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm flex items-center gap-1.5 transition"
            >
              <PalmtreeIcon className="w-3.5 h-3.5" />
              Asignación Directa Vacaciones
            </button>
          )}
          <button
            onClick={cargarDatos}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition"
            title="Refrescar datos"
          >
            <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. Componentes Modulares por Pestaña */}
      {activeTab === 'catalogo' && (
        <CatalogoBonos
          catalogo={catalogo}
          cumpleRequisito6Meses={cumpleRequisito6Meses}
          esDirectivaOAdmin={esDirectivaOAdmin}
          onPostular={(bono) => {
            setModalPostularBono(bono);
            setFormPostulacion((p) => ({
              ...p,
              documento_tipo: bono.documentacion_requerida,
              motivo: `Postulación a ${bono.nombre}`,
            }));
          }}
          onAsignacionDirecta={() => setModalAsignacionDirecta(true)}
          onError={(msg) => setErrorMsg(msg)}
        />
      )}

      {activeTab === 'hoja_socio' && (
        <HojaBeneficiosTable
          solicitudes={solicitudes}
          nombreCompleto={user?.nombreCompleto}
          onNuevaPostulacion={() => setActiveTab('catalogo')}
          onVerDocumento={(doc) => setModalVisorDoc(doc)}
        />
      )}

      {activeTab === 'gestion_directiva' && esDirectivaOAdmin && (
        <GestionDirectivaTable
          solicitudes={solicitudes}
          onAsignacionDirecta={() => setModalAsignacionDirecta(true)}
          onResolverSolicitud={(sol) => {
            setModalValidarSolicitud(sol);
            setFormValidacion({
              accion: sol.estado === 'PENDIENTE' ? 'APROBAR' : 'LIQUIDAR',
              motivo_rechazo: '',
              observaciones: sol.observaciones_admin || '',
              metodo_pago: 'Cheque',
              numero_cheque: `CHQ-${880000 + sol.id}`,
              banco: 'BancoEstado',
            });
          }}
          onVerDocumento={(doc) => setModalVisorDoc(doc)}
        />
      )}

      {activeTab === 'liquidacion_masiva' && esDirectivaOAdmin && (
        <LiquidacionMasivaPanel
          tipoBonoMasivo={tipoBonoMasivo}
          setTipoBonoMasivo={setTipoBonoMasivo}
          porcentajeNavidad={porcentajeNavidad}
          setPorcentajeNavidad={setPorcentajeNavidad}
          decretoMarco={decretoMarco}
          setDecretoMarco={setDecretoMarco}
          actaDirectorio={actaDirectorio}
          setActaDirectorio={setActaDirectorio}
          simulacionResult={simulacionResult}
          setSimulacionResult={setSimulacionResult}
          isSimulando={isSimulando}
          isEjecutando={isEjecutando}
          onSimularNomina={handleSimularNomina}
          onEjecutarNomina={handleEjecutarNomina}
          onSubirPlanillaCSV={handleSubirPlanillaCSV}
          onDescargarPlantillaCSV={handleDescargarPlantillaCSV}
        />
      )}

      {/* 4. Modales Interactivos */}
      <ModalesBeneficios
        user={user}
        catalogo={catalogo}
        modalPostularBono={modalPostularBono}
        setModalPostularBono={setModalPostularBono}
        formPostulacion={formPostulacion}
        setFormPostulacion={setFormPostulacion}
        onPostularSubmit={handlePostular}

        modalAsignacionDirecta={modalAsignacionDirecta}
        setModalAsignacionDirecta={setModalAsignacionDirecta}
        formAsigDirecta={formAsigDirecta}
        setFormAsigDirecta={setFormAsigDirecta}
        onAsignacionDirectaSubmit={handleAsignacionDirecta}

        modalValidarSolicitud={modalValidarSolicitud}
        setModalValidarSolicitud={setModalValidarSolicitud}
        formValidacion={formValidacion}
        setFormValidacion={setFormValidacion}
        onValidarSubmit={handleValidarSolicitud}

        modalVisorDoc={modalVisorDoc}
        setModalVisorDoc={setModalVisorDoc}

        modalConfigBaseG15={modalConfigBaseG15}
        setModalConfigBaseG15={setModalConfigBaseG15}
        baseG15Nueva={baseG15Nueva}
        setBaseG15Nueva={setBaseG15Nueva}
        onGuardarBaseG15Submit={handleGuardarBaseG15}

        modalExportarTesoreria={modalExportarTesoreria}
        setModalExportarTesoreria={setModalExportarTesoreria}
      />
    </div>
  );
}
