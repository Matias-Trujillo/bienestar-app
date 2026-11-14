'use client';

import React, { useState } from 'react';
import { fetchFromApi } from '@/lib/api';
import { formatRun, isValidRun, getErrorMessage } from '@/lib/utils';

export const CUENTAS_AUTORIZADAS_MUNI_PERALILLO = [
  'superadmin@mperalillo.cl',
  'msoto@mperalillo.cl',
  'pfuentes@mperalillo.cl',
  'rmorales@mperalillo.cl',
  'jcontreras@mperalillo.cl',
  'aibarra@mperalillo.cl',
];

export const RUTS_AUTORIZADOS_MUNI_PERALILLO = [
  '11.111.111-1',
  '12.345.678-5',
  '13.456.789-9',
  '14.982.112-0',
  '16.234.567-2',
  '17.345.678-6',
];

export function esCuentaAutorizadaCargaMasiva(email?: string | null, rut?: string | null): boolean {
  const emailClean = (email || '').trim().toLowerCase();
  const rutClean = formatRun(rut || '').toUpperCase();
  return (
    CUENTAS_AUTORIZADAS_MUNI_PERALILLO.includes(emailClean) ||
    RUTS_AUTORIZADOS_MUNI_PERALILLO.includes(rutClean)
  );
}

interface CargaDependientePreview {
  nombreCompleto: string;
  run: string;
  parentesco: string;
  runValido: boolean;
  duplicado?: boolean;
}

interface SocioMasivoPreview {
  rut: string;
  rutValido: boolean;
  duplicado?: boolean;
  motivoError?: string;
  nombreCompleto: string;
  email: string;
  calidadContractual: string;
  grado: string;
  departamento: string;
  mesesAntiguedad: number;
  rol: string;
  saldoSaludDisponible: number;
  cargas: CargaDependientePreview[];
}

interface ModalCargaMasivaSociosProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onSuccess: () => Promise<void> | void;
}

export const ModalCargaMasivaSocios: React.FC<ModalCargaMasivaSociosProps> = ({
  isOpen,
  onClose,
  token,
  onSuccess,
}) => {
  const [registros, setRegistros] = useState<SocioMasivoPreview[]>([]);
  const [archivoNombre, setArchivoNombre] = useState<string>('');
  const [numeroActa, setNumeroActa] = useState<string>('Nómina Masiva Muni Peralillo 2026');
  const [enviarCorreos, setEnviarCorreos] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultadoFinal, setResultadoFinal] = useState<{
    sociosCreados: number;
    sociosActualizados: number;
    cargasRegistradas: number;
    errores: string[];
  } | null>(null);

  if (!isOpen) return null;

  const descargarPlantillaExcelCsv = () => {
    const encabezados = [
      'RUT_SOCIO',
      'NOMBRE_COMPLETO',
      'EMAIL',
      'CALIDAD_CONTRACTUAL',
      'GRADO',
      'DEPARTAMENTO',
      'MESES_ANTIGUEDAD',
      'ROL',
      'SALDO_SALUD',
      'CARGAS_FAMILIARES',
    ].join(';');

    // Plantilla limpia y vacía con encabezados oficiales para rellenar (sin datos de terceros)
    const contenido = '\uFEFF' + encabezados + '\r\n';
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Plantilla_Carga_Masiva_Socios_y_Cargas_Muni_Peralillo.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parsearTextoCsv = (texto: string) => {
    setErrorMsg(null);
    setResultadoFinal(null);

    const lineas = texto
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lineas.length < 2) {
      setErrorMsg('El archivo está vacío o no contiene filas de datos debajo del encabezado.');
      setRegistros([]);
      return;
    }

    // Detectar separador (; o , o tabulador)
    const primeraLinea = lineas[0];
    const sep = primeraLinea.includes(';')
      ? ';'
      : primeraLinea.includes('\t')
      ? '\t'
      : ',';

    const headers = primeraLinea
      .split(sep)
      .map((h) => h.replace(/^["']|["']$/g, '').trim().toUpperCase());

    const idxRut = headers.findIndex((h) => h.includes('RUT') || h.includes('RUN'));
    const idxNombre = headers.findIndex((h) => h.includes('NOMBRE'));
    const idxEmail = headers.findIndex((h) => h.includes('EMAIL') || h.includes('CORREO'));
    const idxCalidad = headers.findIndex((h) => h.includes('CALIDAD') || h.includes('CONTRATO'));
    const idxGrado = headers.findIndex((h) => h.includes('GRADO'));
    const idxDepto = headers.findIndex((h) => h.includes('DEPARTAMENTO') || h.includes('UNIDAD'));
    const idxMeses = headers.findIndex((h) => h.includes('MESES') || h.includes('ANTIGUEDAD'));
    const idxRol = headers.findIndex((h) => h === 'ROL');
    const idxSaldo = headers.findIndex((h) => h.includes('SALDO'));
    const idxCargasCompactas = headers.findIndex((h) => h.includes('CARGAS'));
    const idxCargaNombre = headers.findIndex((h) => h === 'CARGA_NOMBRE' || h === 'NOMBRE_CARGA');
    const idxCargaRun = headers.findIndex((h) => h === 'CARGA_RUN' || h === 'CARGA_RUT' || h === 'RUN_CARGA');
    const idxCargaParentesco = headers.findIndex((h) => h === 'CARGA_PARENTESCO' || h === 'PARENTESCO');

    const lista: SocioMasivoPreview[] = [];
    const rutsSociosVistos = new Set<string>();
    const rutsCargasVistos = new Set<string>();

    for (let i = 1; i < lineas.length; i++) {
      const cols = lineas[i].split(sep).map((c) => c.replace(/^["']|["']$/g, '').trim());
      const rutRaw = cols[idxRut >= 0 ? idxRut : 0] || '';
      const nombreRaw = cols[idxNombre >= 0 ? idxNombre : 1] || '';
      if (!rutRaw && !nombreRaw) continue;

      const rutFmt = formatRun(rutRaw);
      const rutKey = rutFmt.replace(/[^0-9kK]/gi, '').toUpperCase() || `ROW-${i}`;
      const esFormatoRutOk = isValidRun(rutFmt);

      const esRutSocioRepetido =
        rutsSociosVistos.has(rutKey) || rutsCargasVistos.has(rutKey);
      if (esFormatoRutOk) {
        rutsSociosVistos.add(rutKey);
      }

      const emailRaw = (idxEmail >= 0 ? cols[idxEmail] : '') || '';
      const calidadRaw = (idxCalidad >= 0 ? cols[idxCalidad] : 'Planta') || 'Planta';
      const gradoRaw = (idxGrado >= 0 ? cols[idxGrado] : '10') || '10';
      const deptoRaw = (idxDepto >= 0 ? cols[idxDepto] : 'Departamento Municipal') || 'Departamento Municipal';
      const mesesRaw = idxMeses >= 0 ? parseInt(cols[idxMeses], 10) : 12;
      const rolRaw = (idxRol >= 0 ? cols[idxRol] : 'socio') || 'socio';
      const saldoRaw = idxSaldo >= 0 ? parseFloat(cols[idxSaldo]) : 150000;

      const socio: SocioMasivoPreview = {
        rut: rutFmt,
        rutValido: esFormatoRutOk && !esRutSocioRepetido,
        duplicado: esRutSocioRepetido,
        motivoError: !esFormatoRutOk
          ? 'RUT inválido'
          : esRutSocioRepetido
          ? 'RUT duplicado en planilla'
          : undefined,
        nombreCompleto: nombreRaw,
        email: emailRaw || `${rutKey.toLowerCase()}@mperalillo.cl`,
        calidadContractual: calidadRaw.toLowerCase().includes('contrata') ? 'Contrata' : 'Planta',
        grado: gradoRaw,
        departamento: deptoRaw,
        mesesAntiguedad: Number.isNaN(mesesRaw) ? 12 : mesesRaw,
        rol: rolRaw.toLowerCase(),
        saldoSaludDisponible: Number.isNaN(saldoRaw) ? 150000 : saldoRaw,
        cargas: [],
      };

      const agregarCargaConValidacionUnica = (cNombre: string, cRunRaw: string, cPar: string) => {
        const cRunFmt = formatRun(cRunRaw);
        const cKey = cRunFmt.replace(/[^0-9kK]/gi, '').toUpperCase();
        const formatoOk = isValidRun(cRunFmt);
        const esDuplicada =
          !cKey ||
          cKey === rutKey ||
          rutsSociosVistos.has(cKey) ||
          rutsCargasVistos.has(cKey);
        if (formatoOk && cKey) {
          rutsCargasVistos.add(cKey);
        }
        socio.cargas.push({
          nombreCompleto: cNombre,
          run: cRunFmt,
          parentesco: cPar || 'Hijo/a',
          runValido: formatoOk && !esDuplicada,
          duplicado: esDuplicada,
        });
      };

      // 1) Cargas en columna compacta CARGAS_FAMILIARES (ej: "Nombre:RUT:Parentesco | Nombre2:RUT2:Parentesco2")
      if (idxCargasCompactas >= 0 && cols[idxCargasCompactas]) {
        const bloques = cols[idxCargasCompactas]
          .split('|')
          .map((b) => b.trim())
          .filter(Boolean);
        for (const b of bloques) {
          const partes = b.split(':').map((p) => p.trim());
          if (partes.length >= 2 && partes[0]) {
            agregarCargaConValidacionUnica(partes[0], partes[1], partes[2] || 'Hijo/a');
          }
        }
      }

      // 2) Cargas por columnas individuales CARGA_NOMBRE, CARGA_RUN, CARGA_PARENTESCO
      if (idxCargaNombre >= 0 && cols[idxCargaNombre]) {
        const cNombre = cols[idxCargaNombre];
        const cRunVal = idxCargaRun >= 0 ? cols[idxCargaRun] || '' : '';
        const cPar = (idxCargaParentesco >= 0 ? cols[idxCargaParentesco] : '') || 'Hijo/a';
        if (cNombre) {
          agregarCargaConValidacionUnica(cNombre, cRunVal, cPar);
        }
      }

      lista.push(socio);
    }

    if (lista.length === 0) {
      setErrorMsg('No se encontraron registros válidos en el archivo seleccionado.');
    }
    setRegistros(lista);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivoNombre(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        parsearTextoCsv(reader.result);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleConfirmarCargaMasiva = async () => {
    const validos = registros.filter((r) => r.rutValido && r.nombreCompleto.trim().length >= 3);
    if (validos.length === 0) {
      setErrorMsg('No hay socios con RUT y nombre válidos para procesar.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        numeroActa: numeroActa.trim() || 'Nómina Masiva Muni Peralillo',
        enviarCorreos,
        registros: validos.map((r) => ({
          rut: r.rut,
          nombreCompleto: r.nombreCompleto,
          email: r.email,
          calidadContractual: r.calidadContractual,
          grado: r.grado,
          departamento: r.departamento,
          mesesAntiguedad: r.mesesAntiguedad,
          rol: r.rol,
          saldoSaludDisponible: r.saldoSaludDisponible,
          cargas: r.cargas
            .filter((c) => c.runValido && c.nombreCompleto.trim().length >= 2)
            .map((c) => ({
              nombreCompleto: c.nombreCompleto,
              run: c.run,
              parentesco: c.parentesco,
            })),
        })),
      };

      const res = await fetchFromApi<{
        ok: boolean;
        sociosCreados: number;
        sociosActualizados: number;
        cargasRegistradas: number;
        errores: string[];
      }>('/afiliacion/carga-masiva', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(payload),
      });

      setResultadoFinal(res);
      await onSuccess();
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err) || 'Error al procesar la carga masiva.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalCargasPreview = registros.reduce((acc, r) => acc + r.cargas.length, 0);
  const sociosConErrorRut = registros.filter((r) => !r.rutValido).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 relative overflow-hidden max-h-[92vh] overflow-y-auto"
      >
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: 'linear-gradient(90deg, #0f2942 0%, #006799 50%, #059669 100%)' }}
        />

        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-50 text-[#006799] border border-sky-200">
                Exclusivo Cuentas Institucionales • I. Municipalidad de Peralillo
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mt-1.5">
              Carga Masiva de Socios, Cuentas y Cargas Familiares
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Importe desde Excel (CSV) la nómina de funcionarios junto con sus cargas familiares, antigüedad y calidad contractual en un solo paso.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Paso 1: Descargar plantilla y subir archivo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#006799] block">
                Paso 1 • Formato Oficial Excel
              </span>
              <h4 className="text-sm font-bold text-slate-800 mt-0.5">
                Plantilla de Socios + Cargas Familiares
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Descargue la plantilla compatible con Excel. En la columna{' '}
                <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">
                  CARGAS_FAMILIARES
                </code>{' '}
                puede incluir una o varias cargas con formato{' '}
                <code className="font-mono text-[#0f2942]">Nombre:RUT:Parentesco</code> separadas por{' '}
                <code className="font-mono font-bold">|</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={descargarPlantillaExcelCsv}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-sky-50 text-[#006799] border border-sky-200 font-bold text-xs transition shadow-sm cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar Plantilla Excel (.CSV)
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-200/80 flex flex-col justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#006799] block">
                Paso 2 • Seleccionar Archivo
              </span>
              <h4 className="text-sm font-bold text-slate-800 mt-0.5">
                Subir Planilla Completada (.CSV)
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">
                El sistema validará automáticamente cada RUT chileno, agrupará las cargas por socio y mostrará una vista previa antes de guardar.
              </p>
            </div>
            <label className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white border border-dashed border-sky-300 hover:border-[#006799] cursor-pointer transition">
              <span className="text-xs font-semibold text-slate-700 truncate">
                {archivoNombre ? `✔ ${archivoNombre}` : 'Seleccionar archivo .CSV desde su equipo...'}
              </span>
              <span className="px-3 py-1 rounded-lg bg-[#0f2942] text-white text-[11px] font-bold flex-shrink-0">
                Examinar
              </span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Opciones de acta y notificación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Referencia / N° de Acta para Nómina y Auditoría
            </label>
            <input
              type="text"
              value={numeroActa}
              onChange={(e) => setNumeroActa(e.target.value)}
              placeholder="Ej: Nómina Inicial Muni Peralillo 2026"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>
          <div className="flex items-center pt-2 sm:pt-5">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enviarCorreos}
                onChange={(e) => setEnviarCorreos(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#006799] focus:ring-sky-600"
              />
              <span className="text-xs text-slate-700 leading-snug">
                <strong className="font-bold text-slate-900 block">
                  Enviar correo de bienvenida con clave temporal a cada nuevo socio
                </strong>
                <span className="text-[11px] text-slate-500">
                  Desmárquelo si prefiere realizar una carga masiva silenciosa rápida.
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* Vista previa de registros */}
        {registros.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold text-slate-800">
                  Vista Previa de Importación:
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-[#006799] border border-sky-200">
                  {registros.length} socio(s) detectados
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {totalCargasPreview} carga(s) familiar(es)
                </span>
                {sociosConErrorRut > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    {sociosConErrorRut} RUT con formato inválido
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setRegistros([]);
                  setArchivoNombre('');
                  setResultadoFinal(null);
                }}
                className="text-[11px] font-semibold text-slate-500 hover:text-rose-600"
              >
                Limpiar lista
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-3">RUT Socio</th>
                    <th className="py-2.5 px-3">Nombre Completo / Correo</th>
                    <th className="py-2.5 px-3">Contrato / Antigüedad</th>
                    <th className="py-2.5 px-3">Cargas Familiares a Incorporar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registros.map((r, i) => (
                    <tr key={`${r.rut}-${i}`} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                        <span className={r.rutValido ? 'text-slate-800' : 'text-rose-600'}>
                          {r.rut || 'Sin RUT'}
                        </span>
                        {!r.rutValido && (
                          <span className="block text-[10px] text-rose-600 font-sans">
                            {r.motivoError || 'RUT inválido'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-800 block">{r.nombreCompleto}</span>
                        <span className="text-[11px] text-slate-500">{r.email}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-700 block">
                          {r.calidadContractual} • {r.grado}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {r.departamento} ({r.mesesAntiguedad} meses)
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {r.cargas.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">Sin cargas</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {r.cargas.map((c, ci) => (
                              <span
                                key={ci}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                  c.runValido
                                    ? 'bg-sky-50/80 text-[#006799] border-sky-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {c.nombreCompleto} ({c.run} • {c.parentesco})
                                {c.duplicado && <span className="font-bold"> [RUT Duplicado]</span>}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {resultadoFinal && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1.5">
            <div className="font-extrabold text-xs text-emerald-900 flex items-center gap-2">
              <span>✔ Carga Masiva Completada Exitosamente</span>
            </div>
            <p className="text-xs text-emerald-800">
              Se crearon <strong>{resultadoFinal.sociosCreados}</strong> nuevos socios únicos, se omitieron{' '}
              <strong>{resultadoFinal.sociosActualizados}</strong> registros duplicados y se incorporaron{' '}
              <strong>{resultadoFinal.cargasRegistradas}</strong> cargas familiares únicas en el sistema.
            </p>
            {resultadoFinal.errores.length > 0 && (
              <div className="mt-2 pt-2 border-t border-emerald-200/70 text-[11px] text-amber-800 space-y-0.5">
                <strong className="block">Observaciones en filas omitidas:</strong>
                {resultadoFinal.errores.map((err, idx) => (
                  <div key={idx}>• {err}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pie del Modal */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            {resultadoFinal ? 'Cerrar Ventana' : 'Cancelar'}
          </button>
          {!resultadoFinal && (
            <button
              type="button"
              disabled={submitting || registros.length === 0}
              onClick={handleConfirmarCargaMasiva}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#0f2942] hover:bg-[#006799] rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting
                ? 'Procesando nómina y cargas...'
                : `Confirmar e Importar (${registros.filter((r) => r.rutValido).length} Socios)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
