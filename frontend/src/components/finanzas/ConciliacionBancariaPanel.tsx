'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import { fetchFromApi } from '@/lib/api';
import { NominaResponse } from '@/types';
import { formatClp } from './types';

interface ConciliacionResumen {
  id: number;
  codigo: string;
  periodo: string;
  archivo_rrhh_nombre: string;
  monto_declarado_rrhh: number;
  monto_cartola_banco: number;
  diferencia_clp: number;
  comprobante_banco_ref: string;
  total_socios_evaluados: number;
  socios_al_dia: number;
  socios_con_brecha: number;
  estado: string;
  observaciones: string;
  registrado_por_nombre: string | null;
  created_at: string;
}

interface PagoAporteDetalle {
  id: number;
  conciliacion_id: number;
  socio_id: number | null;
  socio_rut: string;
  socio_nombre: string;
  periodo: string;
  monto_esperado: number;
  monto_descontado_cod47: number;
  diferencia: number;
  estado: string;
  motivo_brecha: string;
  regularizado_por_nombre: string | null;
  regularizado_at: string | null;
}

interface ConciliacionDetalle extends ConciliacionResumen {
  detalles: PagoAporteDetalle[];
}

interface ChequeEnTransito {
  solicitud_id: number;
  codigo_reembolso: string;
  socio_nombre: string;
  socio_rut: string;
  numero_cheque: string;
  banco_emisor: string;
  monto_reembolso: number;
  fecha_emision: string;
  dias_en_transito: number;
  alerta_60_dias: boolean;
}

interface CartolaResultado {
  archivo_nombre: string;
  total_movimientos_leidos: number;
  total_cheques_conciliados: number;
  monto_total_conciliado: number;
  cheques_conciliados: {
    solicitud_id: number;
    codigo_reembolso: string;
    socio_nombre: string;
    numero_cheque: string;
    monto_reembolso: number;
    fecha_cobro_banco: string;
  }[];
  sin_coincidencia: number;
}

interface FilaCod47Parsed {
  rut: string;
  nombre: string;
  monto_esperado: number;
  monto_descontado: number;
  observacion: string;
}

interface MovimientoCartolaParsed {
  fecha: string;
  descripcion: string;
  numero_documento: string;
  monto_cargo: number;
}

interface Props {
  token: string | null;
  userRol?: string;
  nomina: NominaResponse | null;
}

const ROLES_OPERACION = new Set(['PRESIDENTE', 'SECRETARIO', 'TESORERO', 'ADMIN', 'SUPERUSUARIO']);

function parseMontoClp(raw: string): number {
  const limpio = (raw || '').replace(/[^0-9-]/g, '');
  const num = Number.parseInt(limpio, 10);
  return Number.isNaN(num) ? 0 : Math.max(0, num);
}

function normalizarHeader(h: string): string {
  return (h || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function buscarColumna(headersNorm: string[], keywords: string[]): number {
  return headersNorm.findIndex((h) => keywords.some((k) => h.includes(k)));
}

function splitCsvLine(line: string, sep: string): string[] {
  return line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
}

function descargarCsv(nombreArchivo: string, lineas: string[]): void {
  const contenido = '\uFEFF' + lineas.join('\r\n');
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ConciliacionBancariaPanel({ token, userRol, nomina }: Props) {
  const anioActual = new Date().getFullYear();
  const mesActual = `${anioActual}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const puedeOperar = ROLES_OPERACION.has(String(userRol || '').toUpperCase());

  const [subTab, setSubTab] = useState<'cod47' | 'bancoestado'>('cod47');
  const [conciliaciones, setConciliaciones] = useState<ConciliacionResumen[]>([]);
  const [detalleActivo, setDetalleActivo] = useState<ConciliacionDetalle | null>(null);
  const [chequesTransito, setChequesTransito] = useState<ChequeEnTransito[]>([]);
  const [cargando, setCargando] = useState(false);

  // Estado formulario Cód. 47
  const [periodo, setPeriodo] = useState(mesActual);
  const [archivoRrhhNombre, setArchivoRrhhNombre] = useState('');
  const [filasCod47, setFilasCod47] = useState<FilaCod47Parsed[]>([]);
  const [montoBanco, setMontoBanco] = useState('');
  const [refBanco, setRefBanco] = useState('');
  const [obsConciliacion, setObsConciliacion] = useState('');
  const [procesandoCod47, setProcesandoCod47] = useState(false);

  // Modal regularización
  const [aporteARegularizar, setAporteARegularizar] = useState<PagoAporteDetalle | null>(null);
  const [motivoReg, setMotivoReg] = useState('');
  const [montoReg, setMontoReg] = useState('');
  const [guardandoReg, setGuardandoReg] = useState(false);

  // Estado formulario Cartola BancoEstado
  const [archivoCartolaNombre, setArchivoCartolaNombre] = useState('');
  const [movimientosCartola, setMovimientosCartola] = useState<MovimientoCartolaParsed[]>([]);
  const [procesandoCartola, setProcesandoCartola] = useState(false);
  const [resultadoCartola, setResultadoCartola] = useState<CartolaResultado | null>(null);

  // Mensajes modernos
  const [mensajeOk, setMensajeOk] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [planillasRes, chequesRes] = await Promise.allSettled([
        fetchFromApi<ConciliacionResumen[]>('/finanzas/conciliacion/planillas', { headers }),
        fetchFromApi<ChequeEnTransito[]>('/finanzas/conciliacion/cheques-transito', { headers }),
      ]);
      if (planillasRes.status === 'fulfilled' && Array.isArray(planillasRes.value)) {
        setConciliaciones(planillasRes.value);
      }
      if (chequesRes.status === 'fulfilled' && Array.isArray(chequesRes.value)) {
        setChequesTransito(chequesRes.value);
      }
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const totalDeclaradoPreview = filasCod47.reduce((acc, f) => acc + f.monto_descontado, 0);

  const descargarPlantillaCod47 = () => {
    const socios = nomina?.socios || [];
    const header = 'RUN;Nombre;Monto_Esperado_4pct;Monto_Descontado_Cod47;Observacion';
    const rows =
      socios.length > 0
        ? socios.map((s, idx) => {
          const esperado = 32000;
          // Deja el último socio con una brecha de ejemplo para probar regularización
          const descontado = socios.length > 1 && idx === socios.length - 1 ? 20000 : esperado;
          const obs =
            descontado < esperado ? 'Licencia médica parcial (ejemplo brecha)' : 'Descuento normal Cód. 47';
          return `${s.run};"${s.nombreCompleto}";${esperado};${descontado};"${obs}"`;
        })
        : [
          '12.345.678-5;"Funcionario Ejemplo 1";32000;32000;"Descuento normal Cód. 47"',
          '15.678.901-2;"Funcionario Ejemplo 2";32000;20000;"Licencia médica parcial"',
        ];
    descargarCsv(`Plantilla_RRHH_Cod47_${periodo}.csv`, [header, ...rows]);
  };

  const descargarPlantillaCartola = () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const header = 'Fecha;Descripcion;Numero_Documento;Cargo';
    const rows =
      chequesTransito.length > 0
        ? chequesTransito.map(
          (c) =>
            `${hoy};"PAGO CHEQUE CAMARA N ${c.numero_cheque} - ${c.socio_nombre}";${c.numero_cheque};${c.monto_reembolso}`
        )
        : [`${hoy};"PAGO CHEQUE CAMARA N 0045123";0045123;32000`];
    rows.push(`${hoy};"COMISION MANTENCION CUENTA BANCOESTADO";;3500`);
    descargarCsv(`Plantilla_Cartola_BancoEstado_${hoy}.csv`, [header, ...rows]);
  };

  const handleSubirArchivoCod47 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMensajeError(null);
    const texto = await file.text();
    const lineas = texto
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lineas.length < 2) {
      setMensajeError('El archivo debe tener al menos una fila de encabezado y una fila de datos.');
      return;
    }

    const sep = lineas[0].includes(';') ? ';' : ',';
    const headersNorm = splitCsvLine(lineas[0], sep).map(normalizarHeader);

    const idxRut = buscarColumna(headersNorm, ['run', 'rut', 'cedula']);
    const idxNombre = buscarColumna(headersNorm, ['nombre', 'funcionario', 'socio']);
    const idxEsperado = buscarColumna(headersNorm, ['esperado', 'teorico']);
    const idxDescontado = buscarColumna(headersNorm, ['descontado', 'cod47', 'aporte', 'monto', 'descuento']);
    const idxObs = buscarColumna(headersNorm, ['obs', 'motivo', 'glosa']);

    // Evitar confusión si se sube la nómina de salida (4% sin montos en CLP)
    if (
      headersNorm.some((h) => h.includes('porcentajeretencion') || h.includes('fincarencia')) &&
      idxDescontado === -1
    ) {
      setMensajeError(
        'Subiste la "Nómina de Retenciones 4%" (archivo que se envía a RRHH). Aquí debes cargar la planilla devuelta por RRHH con los montos descontados del Código 47 (o usa "Descargar Plantilla de Ejemplo").'
      );
      return;
    }

    const colRut = idxRut !== -1 ? idxRut : 0;
    const colNombre = idxNombre !== -1 ? idxNombre : 1;

    const parsed: FilaCod47Parsed[] = [];
    for (let i = 1; i < lineas.length; i += 1) {
      const cols = splitCsvLine(lineas[i], sep);
      if (cols.length < 3 || !cols[colRut]) continue;
      const tieneEsperado = idxEsperado !== -1 || (idxDescontado === -1 && cols.length >= 4);
      const colDesc = idxDescontado !== -1 ? idxDescontado : tieneEsperado ? 3 : 2;
      const colEsp = idxEsperado !== -1 ? idxEsperado : tieneEsperado ? 2 : colDesc;
      const montoDescontado = parseMontoClp(cols[colDesc] || '0');
      const montoEsperado = parseMontoClp(cols[colEsp] || '0');
      parsed.push({
        rut: cols[colRut],
        nombre: cols[colNombre] || '',
        monto_esperado: montoEsperado,
        monto_descontado: montoDescontado,
        observacion: idxObs !== -1 ? cols[idxObs] || '' : cols[4] || '',
      });
    }

    if (parsed.length === 0) {
      setMensajeError('No se encontraron filas válidas en la planilla RRHH.');
      return;
    }

    setArchivoRrhhNombre(file.name);
    setFilasCod47(parsed);
    const suma = parsed.reduce((acc, f) => acc + f.monto_descontado, 0);
    setMontoBanco(String(suma));
  };

  const handleEjecutarConciliacionCod47 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || filasCod47.length === 0) {
      setMensajeError('Primero carga un archivo CSV de planilla RRHH (Cód. 47).');
      return;
    }
    if (refBanco.trim().length < 2) {
      setMensajeError('Ingresa el número de comprobante o referencia del depósito BancoEstado.');
      return;
    }

    setProcesandoCod47(true);
    setMensajeError(null);
    setMensajeOk(null);
    try {
      const res = await fetchFromApi<ConciliacionDetalle>('/finanzas/conciliacion/planillas', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodo,
          archivo_rrhh_nombre: archivoRrhhNombre || 'planilla_cod47.csv',
          monto_cartola_banco: parseMontoClp(montoBanco),
          comprobante_banco_ref: refBanco.trim(),
          observaciones: obsConciliacion.trim(),
          filas_cod47: filasCod47,
        }),
      });
      setDetalleActivo(res);
      setMensajeOk(
        `Conciliación ${res.codigo} procesada: ${res.socios_al_dia} al día, ${res.socios_con_brecha} con brecha.`
      );
      setFilasCod47([]);
      setArchivoRrhhNombre('');
      setRefBanco('');
      setObsConciliacion('');
      await cargarDatos();
    } catch (err: unknown) {
      setMensajeError(err instanceof Error ? err.message : 'Error al procesar conciliación Cód. 47.');
    } finally {
      setProcesandoCod47(false);
    }
  };

  const abrirDetalleConciliacion = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetchFromApi<ConciliacionDetalle>(`/finanzas/conciliacion/planillas/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDetalleActivo(res);
    } catch {
      setMensajeError('No fue posible cargar el detalle de la conciliación.');
    }
  };

  const handleRegularizar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !aporteARegularizar) return;
    if (motivoReg.trim().length < 4) {
      setMensajeError('Describe brevemente el motivo o respaldo de la regularización.');
      return;
    }

    setGuardandoReg(true);
    setMensajeError(null);
    try {
      await fetchFromApi<PagoAporteDetalle>(
        `/finanzas/conciliacion/aportes/${aporteARegularizar.id}/regularizar`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            motivo_regularizacion: motivoReg.trim(),
            monto_regularizado: montoReg ? parseMontoClp(montoReg) : undefined,
          }),
        }
      );
      const concId = aporteARegularizar.conciliacion_id;
      setAporteARegularizar(null);
      setMotivoReg('');
      setMontoReg('');
      setMensajeOk('Brecha regularizada correctamente y registrada en auditoría.');
      await Promise.all([cargarDatos(), abrirDetalleConciliacion(concId)]);
    } catch (err: unknown) {
      setMensajeError(err instanceof Error ? err.message : 'Error al regularizar brecha.');
    } finally {
      setGuardandoReg(false);
    }
  };

  const handleSubirCartola = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMensajeError(null);
    setResultadoCartola(null);

    const texto = await file.text();
    const lineas = texto
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lineas.length < 2) {
      setMensajeError('La cartola BancoEstado debe tener encabezado y al menos un movimiento.');
      return;
    }

    const sep = lineas[0].includes(';') ? ';' : ',';
    const headersNorm = splitCsvLine(lineas[0], sep).map(normalizarHeader);
    const idxFecha = buscarColumna(headersNorm, ['fecha']);
    const idxDesc = buscarColumna(headersNorm, ['desc', 'glosa', 'detalle', 'movimiento']);
    const idxDoc = buscarColumna(headersNorm, ['doc', 'cheque', 'numero', 'nro', 'folio']);
    const idxCargo = buscarColumna(headersNorm, ['cargo', 'debito', 'egreso', 'giro', 'monto']);

    const movs: MovimientoCartolaParsed[] = [];
    for (let i = 1; i < lineas.length; i += 1) {
      const cols = splitCsvLine(lineas[i], sep);
      if (cols.length < 3) continue;
      const colFecha = idxFecha !== -1 ? idxFecha : 0;
      const colDesc = idxDesc !== -1 ? idxDesc : 1;
      const colDoc = idxDoc !== -1 ? idxDoc : cols.length >= 4 ? 2 : -1;
      const colCargo = idxCargo !== -1 ? idxCargo : cols.length >= 4 ? 3 : 2;
      const monto = parseMontoClp(cols[colCargo] || '0');
      if (monto <= 0) continue;
      movs.push({
        fecha: cols[colFecha] || '',
        descripcion: cols[colDesc] || '',
        numero_documento: colDoc !== -1 ? cols[colDoc] || '' : '',
        monto_cargo: monto,
      });
    }

    if (movs.length === 0) {
      setMensajeError('No se detectaron movimientos de cargo válidos en la cartola.');
      return;
    }

    setArchivoCartolaNombre(file.name);
    setMovimientosCartola(movs);
  };

  const handleConciliarCartola = async () => {
    if (!token || movimientosCartola.length === 0) return;
    setProcesandoCartola(true);
    setMensajeError(null);
    setMensajeOk(null);
    try {
      const res = await fetchFromApi<CartolaResultado>('/finanzas/conciliacion/cartola-bancoestado', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          archivo_nombre: archivoCartolaNombre || 'cartola_bancoestado.csv',
          movimientos: movimientosCartola,
        }),
      });
      setResultadoCartola(res);
      setMensajeOk(
        `Cartola procesada: ${res.total_cheques_conciliados} cheque(s) cerrados automáticamente por ${formatClp(
          res.monto_total_conciliado
        )}.`
      );
      setMovimientosCartola([]);
      setArchivoCartolaNombre('');
      await cargarDatos();
    } catch (err: unknown) {
      setMensajeError(err instanceof Error ? err.message : 'No fue posible procesar la cartola BancoEstado.');
    } finally {
      setProcesandoCartola(false);
    }
  };

  const alertas60Dias = chequesTransito.filter((c) => c.alerta_60_dias).length;
  const montoTransitoTotal = chequesTransito.reduce((acc, c) => acc + c.monto_reembolso, 0);

  return (
    <div className="space-y-5">
      {/* Mensajes globales */}
      {mensajeOk && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-[#166534] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{mensajeOk}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeOk(null)}
            className="font-bold text-sm text-emerald-800/70 hover:text-emerald-900 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}
      {mensajeError && (
        <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-center justify-between gap-3">
          <span>{mensajeError}</span>
          <button
            type="button"
            onClick={() => setMensajeError(null)}
            className="font-bold text-sm text-rose-800/70 hover:text-rose-900 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Selector de sub-flujo HU-07 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setSubTab('cod47')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${subTab === 'cod47'
              ? 'bg-sky-50/70 border-[#006799] shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
        >
          <div className="h-10 w-10 rounded-xl bg-[#006799]/10 text-[#006799] flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">
              1. Conciliación Planilla RRHH (Código 47 — 4%)
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cruza los descuentos mensuales de RRHH contra el padrón activo y el depósito en BancoEstado.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('bancoestado')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${subTab === 'bancoestado'
              ? 'bg-emerald-50/70 border-[#166534] shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-[#166534] flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900">
                2. Cartola BancoEstado — Cheques Cobrados
              </span>
              {chequesTransito.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 tabular-nums">
                  {chequesTransito.length} en tránsito
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cruce automático por N° de Cheque y Monto para cerrar reembolsos en lote y alertar &gt; 60 días.
            </p>
          </div>
        </button>
      </div>

      {/* SUB-TAB 1: CONCILIACIÓN CÓD. 47 RRHH */}
      {subTab === 'cod47' && (
        <div className="space-y-5">
          {puedeOperar && (
            <form onSubmit={handleEjecutarConciliacionCod47} className="card-modern p-5 sm:p-6 space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Importar Planilla Mensual RRHH (Código 47)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sube el archivo CSV devuelto por Remuneraciones y compáralo con el abono recibido en BancoEstado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={descargarPlantillaCod47}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Descargar Plantilla de Ejemplo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Período</label>
                  <input
                    type="month"
                    required
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Monto Depósito BancoEstado (CLP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    placeholder="Ej: 640000"
                    value={montoBanco}
                    onChange={(e) => setMontoBanco(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    N° Comprobante BancoEstado
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: TRF-BE-202611"
                    value={refBanco}
                    onChange={(e) => setRefBanco(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Upload className="h-5 w-5 text-[#006799] shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-800">
                      {archivoRrhhNombre || 'Seleccionar archivo CSV de RRHH (Cód. 47)'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {filasCod47.length > 0
                        ? `${filasCod47.length} fila(s) leídas • Total declarado RRHH: ${formatClp(totalDeclaradoPreview)}`
                        : 'Columnas: RUN;Nombre;Monto_Esperado_4pct;Monto_Descontado_Cod47;Observacion'}
                    </div>
                  </div>
                </div>
                <label className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer text-center shrink-0">
                  Elegir archivo CSV
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleSubirArchivoCod47}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <input
                  type="text"
                  placeholder="Observaciones opcionales de Tesorería..."
                  value={obsConciliacion}
                  onChange={(e) => setObsConciliacion(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
                />
                <button
                  type="submit"
                  disabled={procesandoCod47 || filasCod47.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 text-white font-semibold shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {procesandoCod47 ? 'Conciliando...' : 'Ejecutar Conciliación Cód. 47'}
                </button>
              </div>
            </form>
          )}

          {/* Historial de Conciliaciones */}
          <div className="card-modern overflow-hidden">
            <div className="p-5 sm:px-6 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Historial de Conciliaciones Mensuales (RRHH vs. BancoEstado)
              </h3>
            </div>
            {cargando && conciliaciones.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Cargando conciliaciones...</div>
            ) : conciliaciones.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Aún no hay conciliaciones Cód. 47 registradas. Descarga la plantilla de ejemplo arriba para probar tu primera conciliación.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Folio y Período</th>
                      <th className="py-3 px-4 text-right">RRHH (Cód. 47)</th>
                      <th className="py-3 px-4 text-right">BancoEstado</th>
                      <th className="py-3 px-4">Cruce Socios</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {conciliaciones.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 tabular-nums">
                          <div className="font-semibold text-slate-900">{c.codigo}</div>
                          <div className="text-slate-500">{c.periodo} • {c.comprobante_banco_ref}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium tabular-nums">
                          {formatClp(c.monto_declarado_rrhh)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold tabular-nums text-[#0c2b45]">
                          {formatClp(c.monto_cartola_banco)}
                        </td>
                        <td className="py-3 px-4 tabular-nums">
                          <span className="text-[#166534] font-semibold">{c.socios_al_dia} al día</span>
                          {' • '}
                          <span className={c.socios_con_brecha > 0 ? 'text-rose-700 font-semibold' : 'text-slate-400'}>
                            {c.socios_con_brecha} brecha(s)
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${c.estado === 'CUADRADA'
                                ? 'bg-emerald-50 text-[#166534] border border-emerald-200'
                                : c.estado === 'REGULARIZADA'
                                  ? 'bg-sky-50 text-[#006799] border border-sky-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                          >
                            {c.estado}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => abrirDetalleConciliacion(c.id)}
                            className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                          >
                            Ver Socios
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detalle socio a socio de la conciliación seleccionada */}
          {detalleActivo && (
            <div className="card-modern overflow-hidden">
              <div className="p-5 sm:px-6 border-b border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Detalle Socio a Socio — {detalleActivo.codigo} ({detalleActivo.periodo})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Diferencia Banco vs RRHH: <span className="font-semibold">{formatClp(detalleActivo.diferencia_clp)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetalleActivo(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Cerrar detalle
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Socio / RUN</th>
                      <th className="py-3 px-4 text-right">Esperado</th>
                      <th className="py-3 px-4 text-right">Descontado Cód. 47</th>
                      <th className="py-3 px-4">Estado y Motivo</th>
                      {puedeOperar && <th className="py-3 px-4 text-right">Acción</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detalleActivo.detalles.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{d.socio_nombre}</div>
                          <div className="text-slate-500 tabular-nums">{d.socio_rut}</div>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">{formatClp(d.monto_esperado)}</td>
                        <td className="py-3 px-4 text-right font-semibold tabular-nums">
                          {formatClp(d.monto_descontado_cod47)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${d.estado === 'AL_DIA'
                                ? 'bg-emerald-50 text-[#166534]'
                                : d.estado === 'REGULARIZADO'
                                  ? 'bg-sky-50 text-[#006799]'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                          >
                            {d.estado === 'AL_DIA' ? 'Al día' : d.estado === 'REGULARIZADO' ? 'Regularizado' : 'Con brecha'}
                          </span>
                          {d.motivo_brecha && (
                            <div className="text-[11px] text-slate-500 mt-0.5">{d.motivo_brecha}</div>
                          )}
                        </td>
                        {puedeOperar && (
                          <td className="py-3 px-4 text-right">
                            {d.estado === 'BRECHA' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setAporteARegularizar(d);
                                  setMontoReg(String(d.monto_esperado || d.monto_descontado_cod47));
                                  setMotivoReg('');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold cursor-pointer"
                              >
                                Regularizar
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">OK</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: CARTOLA BANCOESTADO Y CHEQUES EN TRÁNSITO */}
      {subTab === 'bancoestado' && (
        <div className="space-y-5">
          {/* Resumen Cheques en Tránsito */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-modern p-4">
              <span className="text-xs text-slate-500 font-medium">Cheques en Tránsito (Por Cobrar)</span>
              <div className="text-xl font-extrabold text-[#0c2b45] tabular-nums mt-1">
                {chequesTransito.length} cheque(s)
              </div>
            </div>
            <div className="card-modern p-4">
              <span className="text-xs text-slate-500 font-medium">Monto Total en Tránsito</span>
              <div className="text-xl font-extrabold text-[#006799] tabular-nums mt-1">
                {formatClp(montoTransitoTotal)}
              </div>
            </div>
            <div className={`card-modern p-4 ${alertas60Dias > 0 ? 'border-rose-300 bg-rose-50/40' : ''}`}>
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                {alertas60Dias > 0 && <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />}
                <span>Alertas &gt; 60 días sin cobrar</span>
              </span>
              <div
                className={`text-xl font-extrabold tabular-nums mt-1 ${alertas60Dias > 0 ? 'text-rose-700' : 'text-[#166534]'
                  }`}
              >
                {alertas60Dias} cheque(s)
              </div>
            </div>
          </div>

          {/* Importador de Cartola BancoEstado */}
          {puedeOperar && (
            <div className="card-modern p-5 sm:p-6 space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Subir Cartola BancoEstado (Cruce Automático de Cheques)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    El sistema cruza automáticamente por N° de Cheque y Monto exacto para marcar los reembolsos como Cobrados en Banco.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={descargarPlantillaCartola}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Descargar Plantilla Cartola</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Upload className="h-5 w-5 text-[#166534] shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-800">
                      {archivoCartolaNombre || 'Seleccionar Cartola BancoEstado (CSV)'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {movimientosCartola.length > 0
                        ? `${movimientosCartola.length} movimiento(s) de cargo detectados listos para cruzar`
                        : 'Columnas: Fecha;Descripcion;Numero_Documento;Cargo'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer">
                    Elegir Cartola CSV
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleSubirCartola}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={procesandoCartola || movimientosCartola.length === 0}
                    onClick={handleConciliarCartola}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#166534] to-emerald-600 hover:opacity-95 text-white font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {procesandoCartola ? 'Cruzando...' : 'Cruzar Cheques en Lote'}
                  </button>
                </div>
              </div>

              {resultadoCartola && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-900">
                    Resultado del Cruce ({resultadoCartola.archivo_nombre}):{' '}
                    <span className="text-[#166534]">
                      {resultadoCartola.total_cheques_conciliados} conciliado(s) por{' '}
                      {formatClp(resultadoCartola.monto_total_conciliado)}
                    </span>
                  </div>
                  {resultadoCartola.cheques_conciliados.length > 0 && (
                    <ul className="space-y-1 text-[11px] text-slate-700">
                      {resultadoCartola.cheques_conciliados.map((c) => (
                        <li key={c.solicitud_id}>
                          ✓ <span className="font-semibold">{c.codigo_reembolso}</span> — Cheque N°{' '}
                          <span className="font-semibold">{c.numero_cheque}</span> ({c.socio_nombre}) por{' '}
                          <span className="font-bold text-[#166534]">{formatClp(c.monto_reembolso)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tabla de Cheques en Tránsito */}
          <div className="card-modern overflow-hidden">
            <div className="p-5 sm:px-6 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Cheques Emitidos Pendientes de Cobro en Banco
              </h3>
            </div>
            {chequesTransito.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No existen cheques pendientes de cobro en este momento. Todos los reembolsos pagados están cerrados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Reembolso y Cheque</th>
                      <th className="py-3 px-4">Beneficiario</th>
                      <th className="py-3 px-4">Fecha Emisión</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                      <th className="py-3 px-4 text-right">Antigüedad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chequesTransito.map((c) => (
                      <tr key={c.solicitud_id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 tabular-nums">
                          <div className="font-semibold text-slate-900">{c.codigo_reembolso}</div>
                          <div className="text-slate-500">Cheque N° {c.numero_cheque}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{c.socio_nombre}</div>
                          <div className="text-slate-500 tabular-nums">{c.socio_rut}</div>
                        </td>
                        <td className="py-3 px-4 tabular-nums text-slate-700">{c.fecha_emision}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                          {formatClp(c.monto_reembolso)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${c.alerta_60_dias
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                          >
                            {c.dias_en_transito} días {c.alerta_60_dias ? '• Alerta >60d' : ''}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Moderno de Regularización de Brecha */}
      {aporteARegularizar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-gradient-to-r from-[#0c2b45] to-[#006799] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Regularizar Brecha de Aporte (Cód. 47)</h3>
                <p className="text-[11px] text-sky-100 mt-0.5">
                  {aporteARegularizar.socio_nombre} ({aporteARegularizar.socio_rut})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAporteARegularizar(null)}
                className="text-white/80 hover:text-white text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleRegularizar} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Monto Regularizado Final (CLP)
                </label>
                <input
                  type="number"
                  min={0}
                  value={montoReg}
                  onChange={(e) => setMontoReg(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799] tabular-nums"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Motivo / Respaldo de Regularización
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ej: Licencia médica acreditada o comprobante de transferencia directa a cuenta Bienestar..."
                  value={motivoReg}
                  onChange={(e) => setMotivoReg(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAporteARegularizar(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoReg}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0c2b45] to-[#006799] text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {guardandoReg ? 'Guardando...' : 'Confirmar Regularización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
