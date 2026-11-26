'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Lock,
  Search,
  ShieldCheck,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi, subirArchivoApi } from '@/lib/api';
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/utils';
import {
  BeneficiarioReembolso,
  ResumenSaludSocio,
  SolicitudReembolso,
  TIPO_PRESTACION_LABELS,
  TIPOS_DOCUMENTO,
  TIPOS_PRESTACION_SOLICITABLES,
  TipoPrestacion,
  ValidacionFechaResponse,
} from '@/types';

interface SocioAsistenciaItem {
  id: number;
  rut: string;
  nombre_completo: string;
  email: string;
  departamento: string;
  antiguedad: string;
  meses_antiguedad: number;
  puede_solicitar: boolean;
  mensaje_carencia?: string | null;
  saldo_salud_disponible: number;
  saldo_salud_total_anual: number;
}

const MAX_DESC_CHARS = 500;

// [ESTUDIANTE INFORMÁTICA] Módulo exclusivo de Vista Admin para asistir presencialmente a un socio en el ingreso de su reembolso médico (SRP).
export const ReembolsoAsistidoPanel: React.FC = () => {
  const { user, token, setViewMode, tieneDobleVista } = useAuth();

  const [socios, setSocios] = useState<SocioAsistenciaItem[]>([]);
  const [cargandoSocios, setCargandoSocios] = useState(true);
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const [socioSeleccionado, setSocioSeleccionado] = useState<SocioAsistenciaItem | null>(null);
  const [resumenSocio, setResumenSocio] = useState<ResumenSaludSocio | null>(null);
  const [beneficiarios, setBeneficiarios] = useState<BeneficiarioReembolso[]>([]);
  const [cargandoFicha, setCargandoFicha] = useState(false);

  // Campos del formulario para el trabajador seleccionado
  const [tipoPrestacion, setTipoPrestacion] = useState<TipoPrestacion | ''>('');
  const [beneficiarioIdx, setBeneficiarioIdx] = useState<number>(0);
  const [tipoDocumento, setTipoDocumento] = useState<string>('');
  const [fechaAtencion, setFechaAtencion] = useState<string>('');
  const [fechaBoleta, setFechaBoleta] = useState<string>('');
  const [montoBoleta, setMontoBoleta] = useState<string>('');
  const [montoCopago, setMontoCopago] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [declaracionAceptada, setDeclaracionAceptada] = useState<boolean>(false);

  const [fechaValidacion, setFechaValidacion] = useState<{
    dentro: boolean;
    mensaje: string;
    dias: number;
  } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [solicitudCreada, setSolicitudCreada] = useState<SolicitudReembolso | null>(null);

  const cargarSocios = useCallback(async () => {
    if (!token) return;
    setCargandoSocios(true);
    setErrorAcceso(null);
    try {
      const data = await fetchFromApi<SocioAsistenciaItem[]>('/reembolsos/socios-asistencia', {
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

  const cargarFichaTrabajador = useCallback(
    async (socio: SocioAsistenciaItem) => {
      if (!token) return;
      setSocioSeleccionado(socio);
      setCargandoFicha(true);
      setErrorForm(null);
      setSolicitudCreada(null);
      setBeneficiarioIdx(0);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [res, bens] = await Promise.all([
          fetchFromApi<ResumenSaludSocio>(`/reembolsos/resumen-socio?socio_id=${socio.id}`, {
            headers,
          }),
          fetchFromApi<BeneficiarioReembolso[]>(`/reembolsos/beneficiarios?socio_id=${socio.id}`, {
            headers,
          }).catch(() => [] as BeneficiarioReembolso[]),
        ]);
        setResumenSocio(res);
        setBeneficiarios(
          bens.length > 0
            ? bens
            : [
                {
                  nombre: res.socio_nombre,
                  rut: res.rut,
                  parentesco: 'Titular',
                  es_titular: true,
                },
              ]
        );
      } catch (err: unknown) {
        setErrorForm(getErrorMessage(err) || 'No se pudo cargar el saldo del trabajador.');
        setResumenSocio(null);
        setBeneficiarios([]);
      } finally {
        setCargandoFicha(false);
      }
    },
    [token]
  );

  // Validación en tiempo real del plazo de 30 días corridos
  useEffect(() => {
    const fechas = [
      { etiqueta: 'la atención', valor: fechaAtencion },
      { etiqueta: 'la boleta/compra', valor: fechaBoleta },
    ].filter((f) => f.valor);

    if (fechas.length === 0 || !token) {
      setFechaValidacion(null);
      return;
    }

    let cancelado = false;
    Promise.all(
      fechas.map((f) =>
        fetchFromApi<ValidacionFechaResponse>('/reembolsos/validar-fecha', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ fecha_atencion: f.valor }),
        }).then((res) => ({ etiqueta: f.etiqueta, res }))
      )
    )
      .then((resultados) => {
        if (cancelado) return;
        const peor = resultados.reduce((a, b) =>
          b.res.dias_transcurridos > a.res.dias_transcurridos ? b : a
        );
        setFechaValidacion({
          dentro: resultados.every((r) => r.res.dentro_de_plazo),
          mensaje: peor.res.dentro_de_plazo
            ? peor.res.mensaje
            : `${peor.res.mensaje} (fecha de ${peor.etiqueta})`,
          dias: peor.res.dias_transcurridos,
        });
      })
      .catch(() => {
        if (!cancelado) setFechaValidacion(null);
      });

    return () => {
      cancelado = true;
    };
  }, [fechaAtencion, fechaBoleta, token]);

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

  const boletaNum = Number(montoBoleta) || 0;
  const copagoNum = Number(montoCopago) || 0;
  const saldoDisponible = resumenSocio?.saldo_salud_disponible ?? 0;
  const saldoTotal = resumenSocio?.saldo_salud_total_anual ?? 150000;
  const saldoRestanteProyectado = Math.max(0, saldoDisponible - copagoNum);
  const excedeSaldo = copagoNum > saldoDisponible;
  const excedeBoleta = boletaNum > 0 && copagoNum > boletaNum;
  const trabajadorHabilitado = Boolean(
    resumenSocio && resumenSocio.puede_solicitar && resumenSocio.saldo_salud_disponible > 0
  );

  const handleMontoBoletaChange = (val: string) => {
    const nuevaBoleta = Number(val) || 0;
    const copagoActual = Number(montoCopago) || 0;
    const debeCopiar =
      montoCopago === '' ||
      montoCopago === montoBoleta ||
      (nuevaBoleta > 0 && copagoActual > nuevaBoleta);
    setMontoBoleta(val);
    if (debeCopiar) {
      setMontoCopago(val);
    }
  };

  const handleMontoCopagoChange = (val: string) => {
    const boletaActual = Number(montoBoleta) || 0;
    const ingresado = Number(val) || 0;
    if (boletaActual > 0 && ingresado > boletaActual) {
      setMontoCopago(montoBoleta);
      return;
    }
    setMontoCopago(val);
  };

  const limpiarFormulario = () => {
    setTipoPrestacion('');
    setBeneficiarioIdx(0);
    setTipoDocumento('');
    setFechaAtencion('');
    setFechaBoleta('');
    setMontoBoleta('');
    setMontoCopago('');
    setDescripcion('');
    setArchivo(null);
    setDeclaracionAceptada(false);
    setFechaValidacion(null);
    setErrorForm(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !socioSeleccionado || !resumenSocio) return;
    setErrorForm(null);

    if (!resumenSocio.puede_solicitar) {
      setErrorForm('El trabajador seleccionado no cumple los 6 meses de carencia estatutaria.');
      return;
    }
    if (!tipoPrestacion) {
      setErrorForm('Seleccione el tipo de prestación médica.');
      return;
    }
    if (!tipoDocumento) {
      setErrorForm('Seleccione el tipo de documento de respaldo.');
      return;
    }
    if (fechaValidacion && !fechaValidacion.dentro) {
      setErrorForm(fechaValidacion.mensaje);
      return;
    }
    if (boletaNum <= 0 || copagoNum <= 0) {
      setErrorForm('Ingrese montos válidos mayores a $0.');
      return;
    }
    if (excedeBoleta) {
      setErrorForm('El monto a reembolsar no puede superar el total de la boleta.');
      return;
    }
    if (excedeSaldo) {
      setErrorForm(
        `El monto solicitado (${formatCurrency(copagoNum)}) excede el saldo disponible del trabajador (${formatCurrency(saldoDisponible)}).`
      );
      return;
    }
    if (!declaracionAceptada) {
      setErrorForm('Debe confirmar la declaración jurada de veracidad del trabajador atendido.');
      return;
    }

    const beneficiario = beneficiarios[beneficiarioIdx] || {
      nombre: resumenSocio.socio_nombre,
      rut: resumenSocio.rut,
      parentesco: 'Titular',
    };

    setEnviando(true);
    try {
      const creada = await fetchFromApi<SolicitudReembolso>('/reembolsos/solicitud', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          socio_id: socioSeleccionado.id,
          socio_rut: socioSeleccionado.rut,
          modo_asistido: true,
          tipo_prestacion: tipoPrestacion,
          descripcion: descripcion.trim(),
          beneficiario_nombre: beneficiario.nombre,
          beneficiario_parentesco: beneficiario.parentesco,
          beneficiario_run: beneficiario.rut || undefined,
          monto_boleta: Math.round(boletaNum),
          monto_copago: Math.round(copagoNum),
          fecha_atencion: fechaAtencion,
          fecha_boleta: fechaBoleta,
          tipo_documento: tipoDocumento,
          comprobante_filename: archivo?.name || '',
          declaracion_aceptada: declaracionAceptada,
        }),
      });

      if (archivo) {
        try {
          const fd = new FormData();
          fd.append('archivo', archivo);
          await subirArchivoApi<SolicitudReembolso>(
            `/reembolsos/solicitud/${creada.id}/comprobante`,
            fd
          );
        } catch (uploadErr) {
          console.error('Error subiendo comprobante asistido:', uploadErr);
        }
      }

      setSolicitudCreada(creada);
      limpiarFormulario();
      await Promise.all([cargarFichaTrabajador(socioSeleccionado), cargarSocios()]);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('solicitudes-updated'));
        try {
          if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('bienestar_alertas_channel');
            bc.postMessage({ type: 'SOLICITUD_CREADA', modulo: 'reembolsos', folio: creada.codigo });
            bc.close();
          }
        } catch {}
      }
    } catch (err: unknown) {
      setErrorForm(getErrorMessage(err) || 'No se pudo registrar la solicitud asistida.');
    } finally {
      setEnviando(false);
    }
  };

  const hoyIso = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-fade-in min-w-0">
      {/* Cabecera Exclusiva de Atención Presencial al Socio (Cero datos personales del admin) */}
      <div className="hero-institutional">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
        <div className="p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-emerald-200 border border-white/15">
              <ShieldCheck className="w-3.5 h-3.5 text-lime-300" />
              Vista Admin • Ayuda Presencial al Socio (HU-03)
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Reembolsos Médicos — Ingreso Asistido para Trabajadores
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Selecciona al funcionario que solicita ayuda en oficina, consulta su saldo anual y antigüedad reglamentaria (6 meses), e ingresa su reembolso en su nombre.
            </p>
          </div>
          {tieneDobleVista && (
            <button
              type="button"
              onClick={() => setViewMode('socio')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-100 bg-emerald-600/30 hover:bg-emerald-600/45 border border-emerald-400/35 transition-colors cursor-pointer shrink-0 self-start lg:self-auto"
              title="Para solicitar un reembolso propio, cambia a Vista Usuario"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>¿Trámite propio? Ir a Vista Usuario</span>
            </button>
          )}
        </div>
      </div>

      {errorAcceso ? (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <Lock className="w-5 h-5 text-[#b45309] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm">Acceso restringido al ingreso asistido</p>
            <p>{errorAcceso}</p>
          </div>
        </div>
      ) : (
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
                Por probidad, tu propia cuenta ({user?.nombreCompleto}) no aparece en este listado.
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
                      onClick={() => cargarFichaTrabajador(s)}
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
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              s.puede_solicitar
                                ? 'bg-emerald-50 text-[#166534] border-emerald-200'
                                : 'bg-amber-50 text-[#b45309] border-amber-200'
                            }`}
                          >
                            {s.puede_solicitar
                              ? `Habilitado (${s.meses_antiguedad}m)`
                              : `Carencia (${s.meses_antiguedad}/6m)`}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block">Saldo</span>
                        <span
                          className={`text-xs font-extrabold tabular-nums ${
                            s.saldo_salud_disponible > 0 ? 'text-[#166534]' : 'text-rose-600'
                          }`}
                        >
                          {formatCurrency(s.saldo_salud_disponible)}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Paso 2: Saldo del Trabajador + Formulario de Solicitud Asistida */}
          <div className="xl:col-span-7 space-y-5 min-w-0">
            {solicitudCreada && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#166534] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-sm">
                      ¡Solicitud asistida {solicitudCreada.codigo} ingresada con éxito!
                    </p>
                    <p className="mt-0.5">
                      Registrada para <strong>{solicitudCreada.socio_nombre || socioSeleccionado?.nombre_completo}</strong> por{' '}
                      <strong>{formatCurrency(solicitudCreada.monto_reembolso)}</strong>. Estado: <strong>{solicitudCreada.estado_label}</strong>.
                    </p>
                  </div>
                </div>
                <Link
                  href="/aprobaciones"
                  className="px-3.5 py-2 rounded-xl bg-[#166534] text-white font-bold hover:opacity-95 whitespace-nowrap shrink-0 text-center"
                >
                  Ir a Aprobaciones →
                </Link>
              </div>
            )}

            {!socioSeleccionado ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-[#006799] flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  Seleccione un trabajador para comenzar
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Busque al funcionario en el panel izquierdo por RUN o nombre para consultar su saldo disponible anual, verificar sus 6 meses de antigüedad y llenar su solicitud de reembolso médico.
                </p>
              </div>
            ) : cargandoFicha || !resumenSocio ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-400">
                Consultando saldo anual, carencia y cargas vigentes de {socioSeleccionado.nombre_completo}...
              </div>
            ) : (
              <>
                {/* Tarjeta de Saldo y Elegibilidad del Trabajador Seleccionado */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#006799] block">
                        Trabajador Seleccionado
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 truncate">
                        {resumenSocio.socio_nombre}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">
                        RUN {resumenSocio.rut} • {socioSeleccionado.departamento} • Antigüedad: {resumenSocio.meses_antiguedad} mes(es)
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-auto shrink-0 ${
                        resumenSocio.puede_solicitar
                          ? 'bg-emerald-50 text-[#166534] border-emerald-200'
                          : 'bg-amber-50 text-[#b45309] border-amber-300'
                      }`}
                    >
                      {resumenSocio.puede_solicitar
                        ? '✓ Cumple Carencia (≥ 6 meses)'
                        : `✕ Carencia Activa (${resumenSocio.meses_antiguedad}/6 meses)`}
                    </span>
                  </div>

                  {/* Saldo del Trabajador */}
                  <div className="rounded-xl bg-gradient-to-r from-emerald-50/80 to-sky-50/60 border border-emerald-200/80 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                          Saldo Salud Disponible del Trabajador ({resumenSocio.anio_calendario || new Date().getFullYear()})
                        </span>
                        <span className="text-2xl font-extrabold text-[#166534] tabular-nums">
                          {formatCurrency(saldoDisponible)}
                        </span>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-slate-500 block">Tope Anual</span>
                        <span className="font-bold text-slate-800 tabular-nums">
                          {formatCurrency(saldoTotal)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-white/80 rounded-full overflow-hidden border border-emerald-200/60">
                      <div
                        className={`h-full rounded-full transition-all ${
                          excedeSaldo ? 'bg-rose-500' : 'bg-gradient-to-r from-[#006799] to-[#166534]'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(((saldoTotal - saldoRestanteProyectado) / Math.max(1, saldoTotal)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                    {copagoNum > 0 && (
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className={excedeSaldo ? 'text-rose-700' : 'text-slate-600'}>
                          {excedeSaldo
                            ? 'El monto supera el saldo disponible del trabajador.'
                            : `Saldo proyectado tras esta solicitud: ${formatCurrency(saldoRestanteProyectado)}`}
                        </span>
                        <span className="text-slate-500 tabular-nums">
                          {resumenSocio.solicitudes_en_revision} en revisión
                        </span>
                      </div>
                    )}
                  </div>

                  {!resumenSocio.puede_solicitar && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-[#b45309] shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold">Solicitud bloqueada por Período de Carencia (Art. 14)</p>
                        <p>
                          {resumenSocio.mensaje_carencia ||
                            `El trabajador tiene ${resumenSocio.meses_antiguedad} mes(es) de antigüedad. Debe cumplir al menos 6 meses continuos como socio para solicitar reembolsos médicos.`}
                        </p>
                        {resumenSocio.fecha_habilitacion && (
                          <p className="font-mono font-semibold text-[#b45309]">
                            Fecha estimada de habilitación: {formatDate(resumenSocio.fecha_habilitacion)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {resumenSocio.puede_solicitar && resumenSocio.saldo_salud_disponible <= 0 && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        El trabajador ya agotó su cupo anual de {formatCurrency(saldoTotal)} para el año calendario vigente.
                      </span>
                    </div>
                  )}
                </div>

                {/* Paso 2: Formulario Completo (solo si trabajador está habilitado) */}
                {trabajadorHabilitado && (
                  <form
                    onSubmit={handleSubmit}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4 text-xs"
                  >
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <span className="w-6 h-6 rounded-lg bg-[#166534] text-white text-xs font-extrabold flex items-center justify-center">
                        2
                      </span>
                      <h2 className="text-sm font-bold text-slate-900">
                        Completar Solicitud de Reembolso para {resumenSocio.socio_nombre}
                      </h2>
                    </div>

                    {errorForm && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{errorForm}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Tipo de Prestación *
                        </label>
                        <select
                          required
                          value={tipoPrestacion}
                          onChange={(e) => setTipoPrestacion(e.target.value as TipoPrestacion | '')}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
                        >
                          <option value="">Seleccione prestación...</option>
                          {TIPOS_PRESTACION_SOLICITABLES.map((tp) => (
                            <option key={tp} value={tp}>
                              {TIPO_PRESTACION_LABELS[tp]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Beneficiario (Titular o Carga Vigente) *
                        </label>
                        <select
                          value={beneficiarioIdx}
                          onChange={(e) => setBeneficiarioIdx(Number(e.target.value))}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
                        >
                          {beneficiarios.map((b, idx) => (
                            <option key={`${b.rut}-${idx}`} value={idx}>
                              {b.nombre} ({b.parentesco})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Documento de Respaldo *
                        </label>
                        <select
                          required
                          value={tipoDocumento}
                          onChange={(e) => setTipoDocumento(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
                        >
                          <option value="">Seleccione...</option>
                          {Object.entries(TIPOS_DOCUMENTO).map(([k, lbl]) => (
                            <option key={k} value={k}>
                              {lbl}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Fecha Atención *
                        </label>
                        <input
                          type="date"
                          required
                          max={hoyIso}
                          value={fechaAtencion}
                          onChange={(e) => setFechaAtencion(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Fecha Boleta / Compra *
                        </label>
                        <input
                          type="date"
                          required
                          max={hoyIso}
                          value={fechaBoleta}
                          onChange={(e) => setFechaBoleta(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
                        />
                      </div>
                    </div>

                    {fechaValidacion && (
                      <div
                        className={`px-3.5 py-2 rounded-xl border text-[11px] font-semibold ${
                          fechaValidacion.dentro
                            ? 'bg-emerald-50 border-emerald-200 text-[#166534]'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}
                      >
                        {fechaValidacion.dentro ? '✓ ' : '✕ '}
                        {fechaValidacion.mensaje}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Monto Total Boleta (CLP) *
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={montoBoleta}
                          onChange={(e) => handleMontoBoletaChange(e.target.value)}
                          placeholder="Ej: 45000"
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Copago a Reembolsar (CLP) *
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={montoCopago}
                          onChange={(e) => handleMontoCopagoChange(e.target.value)}
                          placeholder="Ej: 25000"
                          className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 ${
                            excedeSaldo || excedeBoleta
                              ? 'border-rose-400 focus:ring-rose-200'
                              : 'border-slate-200 focus:ring-[#006799]/25'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Detalle / Descripción de la Prestación
                      </label>
                      <div className="relative">
                        <textarea
                          rows={3}
                          maxLength={MAX_DESC_CHARS}
                          value={descripcion}
                          onChange={(e) => setDescripcion(e.target.value)}
                          placeholder="Ej: Compra de medicamentos con receta médica en farmacia..."
                          className="w-full px-3.5 py-2 pb-6 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/25 resize-none"
                        />
                        <span
                          className={`absolute bottom-2 right-3 text-[10px] font-mono tabular-nums pointer-events-none ${
                            MAX_DESC_CHARS - descripcion.length <= 50
                              ? 'text-amber-600 font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {MAX_DESC_CHARS - descripcion.length}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Adjuntar Comprobante Digitalizado (PDF, JPG, PNG, WebP • máx. 10 MB)
                      </label>
                      <label className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-sky-50/40 cursor-pointer transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileUp className="w-4 h-4 text-[#006799] shrink-0" />
                          <span className="truncate text-slate-600 font-medium">
                            {archivo ? archivo.name : 'Seleccionar archivo de respaldo del trabajador...'}
                          </span>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            if (f && f.size > 10 * 1024 * 1024) {
                              setErrorForm('El archivo supera el límite de 10 MB.');
                              return;
                            }
                            setArchivo(f);
                          }}
                          className="hidden"
                        />
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-[#006799] shrink-0">
                          Examinar
                        </span>
                      </label>
                    </div>

                    <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={declaracionAceptada}
                        onChange={(e) => setDeclaracionAceptada(e.target.checked)}
                        className="w-4 h-4 rounded accent-[#166534] mt-0.5 shrink-0"
                      />
                      <span className="text-[11px] text-slate-700 leading-snug">
                        Declaro que esta solicitud es ingresada de manera asistida en oficina a petición de{' '}
                        <strong>{resumenSocio.socio_nombre}</strong>, y que la documentación médica y tributaria presentada es verídica y legal.
                      </span>
                    </label>

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
                        disabled={
                          enviando ||
                          excedeSaldo ||
                          excedeBoleta ||
                          Boolean(fechaValidacion && !fechaValidacion.dentro)
                        }
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#166534] to-[#558b2f] hover:opacity-95 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        {enviando
                          ? 'Registrando solicitud...'
                          : `Enviar Reembolso de ${resumenSocio.socio_nombre.split(' ')[0]}`}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
