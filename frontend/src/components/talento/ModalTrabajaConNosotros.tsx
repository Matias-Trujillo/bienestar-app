'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Briefcase,
  CheckCircle2,
  FileText,
  GraduationCap,
  HeartHandshake,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import { fetchFromApi } from '@/lib/api';
import { formatRun, getErrorMessage, isValidRun } from '@/lib/utils';

export interface CompetenciaItem {
  id: number;
  nombre: string;
  categoria: string;
}

interface EducacionForm {
  institucion: string;
  titulo: string;
  nivelEducacional: string;
  estadoEstudios: string;
  anioInicio: string;
  anioTermino: string;
}

interface ExperienciaForm {
  empresa: string;
  cargo: string;
  anioInicio: string;
  anioTermino: string;
  actualmenteTrabajando: boolean;
  funciones: string;
}

interface CursoForm {
  nombreCurso: string;
  institucion: string;
  horas: string;
  anio: string;
}

interface PostulacionResult {
  folio: string;
  nombreCompleto: string;
  run: string;
  email: string;
  cvFilename?: string | null;
  mensaje: string;
  notificaciones?: {
    postulante?: { destinatario: string; enviadoSmtp: boolean; errorSmtp?: string | null };
    institucion?: { destinatario: string; enviadoSmtp: boolean; errorSmtp?: string | null; cvAdjunto?: boolean };
  };
}

export interface ModalTrabajaConNosotrosProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
}

const NIVELES_EDUCACIONALES = [
  'Enseñanza Media Completa',
  'Técnico Nivel Medio',
  'Técnico Nivel Superior',
  'Universitaria / Profesional',
  'Diplomado / Postítulo',
  'Postgrado / Magíster',
];

const ESTADOS_ESTUDIOS = ['Titulado/a', 'Egresado/a', 'En curso', 'Incompleto'];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const MAX_CV_BYTES = 10 * 1024 * 1024;
const ALLOWED_CV_EXT = ['.pdf', '.doc', '.docx'];

function formatClpInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('es-CL');
}

export const TrabajaConNosotrosContent: React.FC<{ onClose?: () => void; embedded?: boolean }> = ({
  onClose,
  embedded = false,
}) => {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [competenciasCatalogo, setCompetenciasCatalogo] = useState<CompetenciaItem[]>([]);
  const [cargandoComp, setCargandoComp] = useState(false);
  const [busquedaComp, setBusquedaComp] = useState('');

  // Paso 1: Contacto, Resumen y CV
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [run, setRun] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [comuna, setComuna] = useState('Peralillo');
  const [direccion, setDireccion] = useState('');
  const [resumenProfesional, setResumenProfesional] = useState('');
  const [cvFilename, setCvFilename] = useState<string | null>(null);
  const [cvContentType, setCvContentType] = useState<string | null>(null);
  const [cvDataBase64, setCvDataBase64] = useState<string | null>(null);
  const [cvSizeBytes, setCvSizeBytes] = useState<number>(0);
  const [cvError, setCvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Paso 2: Educación, Experiencia y Cursos (3FN)
  const [educaciones, setEducaciones] = useState<EducacionForm[]>([]);
  const [experiencias, setExperiencias] = useState<ExperienciaForm[]>([]);
  const [cursos, setCursos] = useState<CursoForm[]>([]);

  // Paso 3: Competencias, Condiciones Laborales y Ley 21.015
  const [competenciaIds, setCompetenciaIds] = useState<number[]>([]);
  const [rentaStr, setRentaStr] = useState('750.000');
  const [jornadaDeseada, setJornadaDeseada] = useState<'completa' | 'parcial' | 'turnos'>('completa');
  const [modalidadDeseada, setModalidadDeseada] = useState<'presencial' | 'hibrida' | 'teletrabajo'>('presencial');
  const [poseeDiscapacidad, setPoseeDiscapacidad] = useState(false);
  const [credencialRnd, setCredencialRnd] = useState('');
  const [aceptaDatos, setAceptaDatos] = useState(false);

  // Estados de envío y validación
  const [errorPaso, setErrorPaso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<PostulacionResult | null>(null);

  useEffect(() => {
    setCargandoComp(true);
    fetchFromApi<CompetenciaItem[]>('/talento/competencias')
      .then((data) => setCompetenciasCatalogo(Array.isArray(data) ? data : []))
      .catch(() => setCompetenciasCatalogo([]))
      .finally(() => setCargandoComp(false));
  }, []);

  const competenciasAgrupadas = useMemo(() => {
    const q = busquedaComp.trim().toLowerCase();
    const filtradas = q
      ? competenciasCatalogo.filter(
        (c) => c.nombre.toLowerCase().includes(q) || c.categoria.toLowerCase().includes(q)
      )
      : competenciasCatalogo;

    const map: Record<string, CompetenciaItem[]> = {};
    for (const c of filtradas) {
      if (!map[c.categoria]) map[c.categoria] = [];
      map[c.categoria].push(c);
    }
    return map;
  }, [competenciasCatalogo, busquedaComp]);

  const toggleCompetencia = (id: number) => {
    setCompetenciaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCvFile = (file: File | null) => {
    setCvError(null);
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!ALLOWED_CV_EXT.some((ext) => lower.endsWith(ext))) {
      setCvError('Formato no permitido. Adjunte su currículum en PDF, DOC o DOCX.');
      return;
    }
    if (file.size > MAX_CV_BYTES) {
      setCvError('El archivo supera el límite máximo de 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCvFilename(file.name);
      setCvContentType(file.type || 'application/pdf');
      setCvDataBase64(typeof reader.result === 'string' ? reader.result : null);
      setCvSizeBytes(file.size);
    };
    reader.onerror = () => setCvError('No se pudo leer el archivo seleccionado.');
    reader.readAsDataURL(file);
  };

  const validarPaso1 = (): string | null => {
    if (nombreCompleto.trim().length < 3) return 'Ingrese su nombre completo (mínimo 3 caracteres).';
    if (!isValidRun(run)) return 'Ingrese un RUN chileno válido (verifique el dígito verificador).';
    if (!EMAIL_RE.test(email.trim())) return 'Ingrese un correo electrónico válido.';
    const digitsTel = telefono.replace(/[^0-9]/g, '');
    if (digitsTel.length < 8 || digitsTel.length > 15) {
      return 'Ingrese un teléfono de contacto válido (ej: +56 9 8765 4321).';
    }
    if (comuna.trim().length < 2) return 'Ingrese su comuna de residencia.';
    if (direccion.trim().length < 4) return 'Ingrese su dirección de contacto.';
    if (resumenProfesional.trim().length < 20) {
      return 'Escriba un breve resumen profesional (al menos 20 caracteres).';
    }
    if (!cvFilename || !cvDataBase64) {
      return 'Adjunte su Currículum Vitae (CV) en formato PDF, DOC o DOCX para continuar.';
    }
    return null;
  };

  const validarPaso2 = (): string | null => {
    const validarAnio = (val: string, etiqueta: string): string | null => {
      if (!val.trim()) return null;
      const n = Number(val);
      if (!Number.isInteger(n) || n < 1950 || n > 2035) {
        return `${etiqueta} debe ser un año válido de 4 dígitos (entre 1950 y 2035).`;
      }
      return null;
    };

    for (let i = 0; i < educaciones.length; i++) {
      const e = educaciones[i];
      if (!e.institucion.trim() || !e.titulo.trim()) {
        return `Complete la institución y título/carrera en el registro educacional #${i + 1} (o elimínelo).`;
      }
      const errIni = validarAnio(e.anioInicio, `El año de inicio en educación #${i + 1}`);
      if (errIni) return errIni;
      const errTer = validarAnio(e.anioTermino, `El año de término en educación #${i + 1}`);
      if (errTer) return errTer;
      if (e.anioInicio && e.anioTermino && Number(e.anioTermino) < Number(e.anioInicio)) {
        return `En educación #${i + 1}, el año de término no puede ser menor al año de inicio.`;
      }
    }
    for (let i = 0; i < experiencias.length; i++) {
      const ex = experiencias[i];
      if (!ex.empresa.trim() || !ex.cargo.trim()) {
        return `Complete la empresa y cargo en la experiencia laboral #${i + 1} (o elimínela).`;
      }
      const errIni = validarAnio(ex.anioInicio, `El año de inicio en experiencia #${i + 1}`);
      if (errIni) return errIni;
      if (!ex.actualmenteTrabajando) {
        const errTer = validarAnio(ex.anioTermino, `El año de término en experiencia #${i + 1}`);
        if (errTer) return errTer;
      }
      if (!ex.actualmenteTrabajando && ex.anioInicio && ex.anioTermino && Number(ex.anioTermino) < Number(ex.anioInicio)) {
        return `En experiencia #${i + 1}, el año de término no puede ser menor al año de inicio.`;
      }
    }
    for (let i = 0; i < cursos.length; i++) {
      const c = cursos[i];
      if (!c.nombreCurso.trim() || !c.institucion.trim()) {
        return `Complete el nombre del curso e institución en el registro #${i + 1} (o elimínelo).`;
      }
      if (c.horas.trim()) {
        const h = Number(c.horas);
        if (!Number.isInteger(h) || h < 1 || h > 5000) {
          return `Las horas del curso #${i + 1} deben estar entre 1 y 5000.`;
        }
      }
      const errAnio = validarAnio(c.anio, `El año del curso #${i + 1}`);
      if (errAnio) return errAnio;
    }
    return null;
  };

  const validarPaso3 = (): string | null => {
    const rentaNum = Number(rentaStr.replace(/[^0-9]/g, ''));
    if (!rentaNum || rentaNum < 100000) {
      return 'Ingrese una pretensión de renta válida (desde $100.000 CLP).';
    }
    if (competenciaIds.length === 0) {
      return 'Seleccione al menos una competencia técnica o transversal del catálogo.';
    }
    if (!aceptaDatos) {
      return 'Debe aceptar el tratamiento confidencial de sus datos curriculares para enviar la postulación.';
    }
    return null;
  };

  const irPasoSiguiente = () => {
    setErrorPaso(null);
    if (paso === 1) {
      const err = validarPaso1();
      if (err) return setErrorPaso(err);
      setPaso(2);
    } else if (paso === 2) {
      const err = validarPaso2();
      if (err) return setErrorPaso(err);
      setPaso(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorPaso(null);
    const err1 = validarPaso1();
    if (err1) {
      setPaso(1);
      return setErrorPaso(err1);
    }
    const err2 = validarPaso2();
    if (err2) {
      setPaso(2);
      return setErrorPaso(err2);
    }
    const err3 = validarPaso3();
    if (err3) return setErrorPaso(err3);

    setEnviando(true);
    try {
      const rentaNum = Number(rentaStr.replace(/[^0-9]/g, ''));
      const payload = {
        nombreCompleto: nombreCompleto.trim(),
        run: run.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        comuna: comuna.trim(),
        resumenProfesional: resumenProfesional.trim(),
        educaciones: educaciones.map((ed) => ({
          institucion: ed.institucion.trim(),
          titulo: ed.titulo.trim(),
          nivelEducacional: ed.nivelEducacional,
          estadoEstudios: ed.estadoEstudios,
          anioInicio: ed.anioInicio ? Number(ed.anioInicio) : null,
          anioTermino: ed.anioTermino ? Number(ed.anioTermino) : null,
        })),
        experiencias: experiencias.map((ex) => ({
          empresa: ex.empresa.trim(),
          cargo: ex.cargo.trim(),
          anioInicio: ex.anioInicio ? Number(ex.anioInicio) : null,
          anioTermino: ex.actualmenteTrabajando ? null : ex.anioTermino ? Number(ex.anioTermino) : null,
          actualmenteTrabajando: ex.actualmenteTrabajando,
          funciones: ex.funciones.trim(),
        })),
        cursos: cursos.map((cu) => ({
          nombreCurso: cu.nombreCurso.trim(),
          institucion: cu.institucion.trim(),
          horas: cu.horas ? Number(cu.horas) : null,
          anio: cu.anio ? Number(cu.anio) : null,
        })),
        competenciaIds,
        rentaEsperadaClp: rentaNum,
        jornadaDeseada,
        modalidadDeseada,
        poseeDiscapacidadLey21015: poseeDiscapacidad,
        credencialRndSenadis: poseeDiscapacidad ? credencialRnd.trim() || null : null,
        aceptaTratamientoDatos: aceptaDatos,
        cvFilename,
        cvContentType,
        cvDataBase64,
      };

      const res = await fetchFromApi<PostulacionResult>('/talento/postulaciones', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setResultado(res);
    } catch (err: unknown) {
      setErrorPaso(getErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  };

  const resetForm = () => {
    setResultado(null);
    setPaso(1);
    setNombreCompleto('');
    setRun('');
    setEmail('');
    setTelefono('');
    setComuna('Peralillo');
    setDireccion('');
    setResumenProfesional('');
    setCvFilename(null);
    setCvContentType(null);
    setCvDataBase64(null);
    setCvSizeBytes(0);
    setEducaciones([]);
    setExperiencias([]);
    setCursos([]);
    setCompetenciaIds([]);
    setRentaStr('750.000');
    setPoseeDiscapacidad(false);
    setCredencialRnd('');
    setAceptaDatos(false);
    setErrorPaso(null);
  };

  const runCleanLen = run.replace(/[^0-9kK]/g, '').length;
  const runValido = runCleanLen >= 8 && isValidRun(run);
  const runInvalido = runCleanLen >= 8 && !isValidRun(run);

  return (
    <div
      className={`bg-white w-full overflow-hidden flex flex-col ${embedded
          ? 'rounded-2xl border border-slate-200/90 shadow-xl'
          : 'rounded-2xl max-w-3xl max-h-[92vh] shadow-2xl border border-slate-200/90 animate-scale-in'
        }`}
    >
      {/* Filete cromático institucional de Peralillo */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28] shrink-0" />

      {/* Encabezado */}
      <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-[#0c2b45] via-[#0e3a5c] to-[#006799] text-white flex items-start justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/15 text-sky-100 border border-white/20 mb-1.5">
            <Briefcase className="w-3 h-3" />
            <span>Trabaja con Nosotros • Ley N° 21.015</span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold tracking-tight leading-snug">
            Portal Vecino y Nuevo Talento — I. Municipalidad de Peralillo
          </h2>
          <p className="text-xs text-sky-100/85 mt-0.5">
            Registra tu perfil curricular y adjunta tu CV. Enviaremos confirmación automática a tu correo y a Gestión de Personas.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Indicador de pasos */}
      {!resultado && (
        <div className="px-5 sm:px-6 py-3 bg-slate-50/90 border-b border-slate-200/70 shrink-0">
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1 as const, label: 'Contacto y CV', icon: User },
              { num: 2 as const, label: 'Formación y Exp.', icon: GraduationCap },
              { num: 3 as const, label: 'Perfil y Ley 21.015', icon: Sparkles },
            ].map((item) => {
              const Icon = item.icon;
              const activo = paso === item.num;
              const completado = paso > item.num;
              return (
                <button
                  key={item.num}
                  type="button"
                  onClick={() => {
                    if (item.num < paso) {
                      setErrorPaso(null);
                      setPaso(item.num);
                    }
                  }}
                  className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all ${activo
                      ? 'bg-white text-[#006799] border-[#006799]/40 shadow-xs'
                      : completado
                        ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200 cursor-pointer'
                        : 'bg-transparent text-slate-400 border-transparent cursor-default'
                    }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${activo
                        ? 'bg-[#006799] text-white'
                        : completado
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                  >
                    {completado ? '✓' : item.num}
                  </span>
                  <Icon className="w-3.5 h-3.5 hidden sm:block shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Cuerpo scrollable */}
      <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
        {resultado ? (
          <div className="space-y-5 py-2 animate-fade-in">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="inline-block px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-white text-emerald-800 border border-emerald-200">
                Folio {resultado.folio}
              </span>
              <h3 className="text-lg font-extrabold text-emerald-950">
                ¡Postulación Enviada Correctamente!
              </h3>
              <p className="text-xs text-emerald-900/85 max-w-lg mx-auto leading-relaxed">
                {resultado.mensaje}
              </p>
            </div>

            {/* Confirmación de correos enviados a AMBAS PARTES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0c2b45]">
                  <Mail className="w-4 h-4 text-[#006799]" />
                  <span>Correo al Postulante</span>
                </div>
                <p className="text-xs font-semibold text-[#006799] break-all">
                  {resultado.notificaciones?.postulante?.destinatario || resultado.email}
                </p>
                <p className="text-[11px] text-slate-500">
                  {resultado.notificaciones?.postulante?.enviadoSmtp
                    ? '✓ Comprobante despachado por correo electrónico.'
                    : '✓ Comprobante registrado en buzón institucional.'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0c2b45]">
                  <Briefcase className="w-4 h-4 text-emerald-700" />
                  <span>Correo a Gestión de Personas</span>
                </div>
                <p className="text-xs font-semibold text-emerald-800 break-all">
                  {resultado.notificaciones?.institucion?.destinatario || 'bienestar@mperalillo.cl'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {resultado.notificaciones?.institucion?.cvAdjunto
                    ? `✓ Perfil enviado con CV adjunto (${resultado.cvFilename}).`
                    : '✓ Antecedentes curriculares derivados al equipo.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Ingresar otra postulación
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 rounded-xl shadow-xs transition cursor-pointer"
                >
                  Finalizar y Cerrar
                </button>
              )}
            </div>
          </div>
        ) : (
          <form id="trabaja-con-nosotros-form" onSubmit={handleSubmit} className="space-y-5">
            {errorPaso && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                ⚠ {errorPaso}
              </div>
            )}

            {/* ================= PASO 1 ================= */}
            {paso === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={nombreCompleto}
                      onChange={(e) => setNombreCompleto(e.target.value)}
                      placeholder="Ej: Camila Andrea Rojas Soto"
                      maxLength={140}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/30 focus:border-[#006799]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      RUN Chileno *
                    </label>
                    <input
                      type="text"
                      value={run}
                      onChange={(e) => setRun(formatRun(e.target.value))}
                      placeholder="Ej: 18.456.789-K"
                      maxLength={12}
                      className={`w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 ${runInvalido
                          ? 'border-rose-300 focus:ring-rose-400/30'
                          : runValido
                            ? 'border-emerald-300 focus:ring-emerald-400/30'
                            : 'border-slate-200 focus:ring-[#006799]/30 focus:border-[#006799]'
                        }`}
                    />
                    {runInvalido && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">Dígito verificador incorrecto.</p>
                    )}
                    {runValido && (
                      <p className="text-[11px] text-emerald-700 mt-1 font-medium">✓ RUN válido</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ej: camila.rojas@gmail.com"
                      maxLength={140}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/30 focus:border-[#006799]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Teléfono de Contacto *
                    </label>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Ej: +56 9 8765 4321"
                      maxLength={30}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/30 focus:border-[#006799]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Comuna *
                    </label>
                    <input
                      type="text"
                      value={comuna}
                      onChange={(e) => setComuna(e.target.value)}
                      placeholder="Ej: Peralillo"
                      maxLength={80}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/30 focus:border-[#006799]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Dirección *
                    </label>
                    <input
                      type="text"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Ej: Av. Errázuriz #420"
                      maxLength={200}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/30 focus:border-[#006799]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Resumen Profesional *
                    </label>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {resumenProfesional.trim().length}/2000 (mín. 20)
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={resumenProfesional}
                    onChange={(e) => setResumenProfesional(e.target.value)}
                    maxLength={2000}
                    placeholder="Cuéntanos brevemente tu trayectoria, áreas de interés laboral y cómo puedes aportar a la comuna..."
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/30 focus:border-[#006799]"
                  />
                </div>

                {/* Carga de Currículum Vitae (CV) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Adjuntar Currículum Vitae (CV) *
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => handleCvFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  {!cvFilename ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleCvFile(e.dataTransfer.files?.[0] || null);
                      }}
                      className="border-2 border-dashed border-sky-200 hover:border-[#006799] bg-sky-50/40 hover:bg-sky-50/80 rounded-2xl p-5 text-center cursor-pointer transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white border border-sky-200 text-[#006799] flex items-center justify-center mx-auto mb-2 shadow-2xs group-hover:scale-105 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-[#0c2b45]">
                        Pinche aquí o arrastre su Currículum Vitae (CV)
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Formatos permitidos: PDF, DOC o DOCX • Peso máximo 10 MB
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-950 truncate">{cvFilename}</p>
                          <p className="text-[11px] text-emerald-700">
                            {(cvSizeBytes / 1024).toFixed(0)} KB • Listo para enviar adjunto
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCvFilename(null);
                          setCvDataBase64(null);
                          setCvContentType(null);
                          setCvSizeBytes(0);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg transition cursor-pointer shrink-0"
                      >
                        Cambiar
                      </button>
                    </div>
                  )}
                  {cvError && <p className="text-[11px] font-semibold text-rose-600">{cvError}</p>}
                </div>
              </div>
            )}

            {/* ================= PASO 2 ================= */}
            {paso === 2 && (
              <div className="space-y-5 animate-fade-in">
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5">
                  Agrega tus antecedentes académicos, experiencia laboral y cursos de perfeccionamiento. Esta información fortalece tu postulación y se almacena de forma estructurada.
                </p>

                {/* Educación */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#006799] flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" />
                      <span>Antecedentes Educacionales ({educaciones.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setEducaciones((prev) => [
                          ...prev,
                          {
                            institucion: '',
                            titulo: '',
                            nivelEducacional: 'Técnico Nivel Superior',
                            estadoEstudios: 'Titulado/a',
                            anioInicio: '',
                            anioTermino: '',
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#006799] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Educación
                    </button>
                  </div>
                  {educaciones.length === 0 ? (
                    <p className="text-xs text-slate-400 italic px-1">
                      Sin registros educacionales añadidos (opcional si ya viene detallado en tu CV).
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {educaciones.map((ed, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500">Estudio #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => setEducaciones((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-rose-600 hover:text-rose-800 text-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Quitar
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <input
                              type="text"
                              placeholder="Institución / Universidad / Liceo *"
                              value={ed.institucion}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEducaciones((prev) => prev.map((it, i) => (i === idx ? { ...it, institucion: val } : it)));
                              }}
                              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                            />
                            <input
                              type="text"
                              placeholder="Título o Carrera *"
                              value={ed.titulo}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEducaciones((prev) => prev.map((it, i) => (i === idx ? { ...it, titulo: val } : it)));
                              }}
                              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                            />
                            <select
                              value={ed.nivelEducacional}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEducaciones((prev) => prev.map((it, i) => (i === idx ? { ...it, nivelEducacional: val } : it)));
                              }}
                              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                            >
                              {NIVELES_EDUCACIONALES.map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                            <div className="grid grid-cols-3 gap-2">
                              <select
                                value={ed.estadoEstudios}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEducaciones((prev) => prev.map((it, i) => (i === idx ? { ...it, estadoEstudios: val } : it)));
                                }}
                                className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                              >
                                {ESTADOS_ESTUDIOS.map((es) => (
                                  <option key={es} value={es}>{es}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                placeholder="Inicio"
                                min={1950}
                                max={2035}
                                value={ed.anioInicio}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEducaciones((prev) => prev.map((it, i) => (i === idx ? { ...it, anioInicio: val } : it)));
                                }}
                                className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                              />
                              <input
                                type="number"
                                placeholder="Término"
                                min={1950}
                                max={2035}
                                value={ed.anioTermino}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEducaciones((prev) => prev.map((it, i) => (i === idx ? { ...it, anioTermino: val } : it)));
                                }}
                                className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Experiencia Laboral */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#006799] flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4" />
                      <span>Experiencia Laboral ({experiencias.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setExperiencias((prev) => [
                          ...prev,
                          {
                            empresa: '',
                            cargo: '',
                            anioInicio: '',
                            anioTermino: '',
                            actualmenteTrabajando: false,
                            funciones: '',
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#006799] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Experiencia
                    </button>
                  </div>
                  {experiencias.length === 0 ? (
                    <p className="text-xs text-slate-400 italic px-1">
                      Sin experiencias añadidas (opcional si buscas tu primer empleo o ya está en tu CV).
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {experiencias.map((ex, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500">Experiencia #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => setExperiencias((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-rose-600 hover:text-rose-800 text-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Quitar
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <input
                              type="text"
                              placeholder="Empresa u Organismo *"
                              value={ex.empresa}
                              onChange={(e) => {
                                const val = e.target.value;
                                setExperiencias((prev) => prev.map((it, i) => (i === idx ? { ...it, empresa: val } : it)));
                              }}
                              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                            />
                            <input
                              type="text"
                              placeholder="Cargo desempeñado *"
                              value={ex.cargo}
                              onChange={(e) => {
                                const val = e.target.value;
                                setExperiencias((prev) => prev.map((it, i) => (i === idx ? { ...it, cargo: val } : it)));
                              }}
                              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                placeholder="Año inicio"
                                min={1950}
                                max={2035}
                                value={ex.anioInicio}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setExperiencias((prev) => prev.map((it, i) => (i === idx ? { ...it, anioInicio: val } : it)));
                                }}
                                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                              />
                              <input
                                type="number"
                                placeholder="Año término"
                                min={1950}
                                max={2035}
                                disabled={ex.actualmenteTrabajando}
                                value={ex.actualmenteTrabajando ? '' : ex.anioTermino}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setExperiencias((prev) => prev.map((it, i) => (i === idx ? { ...it, anioTermino: val } : it)));
                                }}
                                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg disabled:bg-slate-100"
                              />
                            </div>
                            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={ex.actualmenteTrabajando}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setExperiencias((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, actualmenteTrabajando: checked } : it))
                                  );
                                }}
                                className="rounded border-slate-300 text-[#006799]"
                              />
                              Trabajo actual
                            </label>
                          </div>
                          <textarea
                            rows={2}
                            placeholder="Principales funciones y logros..."
                            value={ex.funciones}
                            onChange={(e) => {
                              const val = e.target.value;
                              setExperiencias((prev) => prev.map((it, i) => (i === idx ? { ...it, funciones: val } : it)));
                            }}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cursos y Perfeccionamiento */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#006799] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>Cursos y Perfeccionamiento ({cursos.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setCursos((prev) => [
                          ...prev,
                          { nombreCurso: '', institucion: '', horas: '', anio: '' },
                        ])
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#006799] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Curso
                    </button>
                  </div>
                  {cursos.length > 0 && (
                    <div className="space-y-2.5">
                      {cursos.map((cu, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Nombre del curso / certificación *"
                            value={cu.nombreCurso}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCursos((prev) => prev.map((it, i) => (i === idx ? { ...it, nombreCurso: val } : it)));
                            }}
                            className="sm:col-span-4 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                          />
                          <input
                            type="text"
                            placeholder="Institución *"
                            value={cu.institucion}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCursos((prev) => prev.map((it, i) => (i === idx ? { ...it, institucion: val } : it)));
                            }}
                            className="sm:col-span-3 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                          />
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="Horas"
                            value={cu.horas}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                              setCursos((prev) => prev.map((it, i) => (i === idx ? { ...it, horas: val } : it)));
                            }}
                            className="sm:col-span-2 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg tabular-nums"
                          />
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="Año (ej: 2024)"
                            value={cu.anio}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                              setCursos((prev) => prev.map((it, i) => (i === idx ? { ...it, anio: val } : it)));
                            }}
                            className="sm:col-span-2 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg tabular-nums"
                          />
                          <button
                            type="button"
                            onClick={() => setCursos((prev) => prev.filter((_, i) => i !== idx))}
                            className="sm:col-span-1 flex justify-center text-rose-600 hover:text-rose-800 cursor-pointer"
                            aria-label="Eliminar curso"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================= PASO 3 ================= */}
            {paso === 3 && (
              <div className="space-y-5 animate-fade-in">
                {/* Competencias Técnicas Precargadas */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[#006799]">
                      Competencias Técnicas Precargadas * ({competenciaIds.length} seleccionadas)
                    </label>
                    <div className="relative w-full sm:w-56">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={busquedaComp}
                        onChange={(e) => setBusquedaComp(e.target.value)}
                        placeholder="Filtrar competencias..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/30"
                      />
                    </div>
                  </div>

                  {cargandoComp ? (
                    <p className="text-xs text-slate-400">Cargando catálogo de competencias...</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                      {Object.entries(competenciasAgrupadas).map(([cat, items]) => (
                        <div key={cat} className="space-y-1.5">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {cat}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {items.map((comp) => {
                              const selected = competenciaIds.includes(comp.id);
                              return (
                                <button
                                  key={comp.id}
                                  type="button"
                                  onClick={() => toggleCompetencia(comp.id)}
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer ${selected
                                      ? 'bg-[#006799] text-white border-[#006799] shadow-2xs'
                                      : 'bg-white text-slate-700 border-slate-200 hover:border-[#006799]/50 hover:text-[#006799]'
                                    }`}
                                >
                                  {selected ? '✓ ' : '+ '}
                                  {comp.nombre}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Condiciones Laborales Deseadas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Renta Esperada (CLP) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                      <input
                        type="text"
                        value={rentaStr}
                        onChange={(e) => setRentaStr(formatClpInput(e.target.value))}
                        placeholder="750.000"
                        className="w-full pl-7 pr-3 py-2 text-xs font-semibold tabular-nums bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Jornada Deseada *
                    </label>
                    <select
                      value={jornadaDeseada}
                      onChange={(e) => setJornadaDeseada(e.target.value as 'completa' | 'parcial' | 'turnos')}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/30"
                    >
                      <option value="completa">Jornada Completa</option>
                      <option value="parcial">Jornada Parcial</option>
                      <option value="turnos">Sistema de Turnos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Modalidad *
                    </label>
                    <select
                      value={modalidadDeseada}
                      onChange={(e) => setModalidadDeseada(e.target.value as 'presencial' | 'hibrida' | 'teletrabajo')}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/30"
                    >
                      <option value="presencial">Presencial</option>
                      <option value="hibrida">Híbrida</option>
                      <option value="teletrabajo">Teletrabajo</option>
                    </select>
                  </div>
                </div>

                {/* Inclusión Laboral — Ley N° 21.015 */}
                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <HeartHandshake className="w-5 h-5 text-[#006799] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-[#0c2b45]">
                          Inclusión Laboral — Ley N° 21.015 (Opcional)
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                          ¿Posee discapacidad acreditada o asignación de pensión de invalidez? Esta información es confidencial y se utiliza para garantizar ajustes razonables e inclusión laboral.
                        </p>
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-[#0c2b45] cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={poseeDiscapacidad}
                        onChange={(e) => setPoseeDiscapacidad(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#006799]"
                      />
                      Sí
                    </label>
                  </div>

                  {poseeDiscapacidad && (
                    <div className="pt-2 border-t border-sky-200/60">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        N° Credencial Registro Nacional de Discapacidad (RND / SENADIS) — Opcional
                      </label>
                      <input
                        type="text"
                        value={credencialRnd}
                        onChange={(e) => setCredencialRnd(e.target.value)}
                        placeholder="Ej: RND-2026-XXXXXX"
                        maxLength={80}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006799]/30"
                      />
                    </div>
                  )}
                </div>

                {/* Cláusula de confidencialidad */}
                <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aceptaDatos}
                    onChange={(e) => setAceptaDatos(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#006799] shrink-0"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    Autorizo el tratamiento confidencial de mis antecedentes curriculares, CV y datos de inclusión laboral (Ley N° 19.628 y Ley N° 21.015) exclusivamente para procesos de selección de la <strong>Ilustre Municipalidad de Peralillo</strong>, y confirmo el envío de comprobante a mi correo electrónico.
                  </span>
                </label>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Pie de navegación */}
      {!resultado && (
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">Envío cifrado con copia automática a ambas partes</span>
          </div>
          <div className="flex items-center gap-2">
            {paso > 1 ? (
              <button
                type="button"
                disabled={enviando}
                onClick={() => {
                  setErrorPaso(null);
                  setPaso((p) => (p === 3 ? 2 : 1));
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
              >
                ← Anterior
              </button>
            ) : (
              onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
              )
            )}

            {paso < 3 ? (
              <button
                type="button"
                onClick={irPasoSiguiente}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 rounded-xl shadow-xs transition cursor-pointer"
              >
                Continuar →
              </button>
            ) : (
              <button
                type="submit"
                form="trabaja-con-nosotros-form"
                disabled={enviando}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0c2b45] via-[#006799] to-[#166534] hover:opacity-95 rounded-xl shadow-sm transition disabled:opacity-60 cursor-pointer"
              >
                {enviando ? 'Enviando postulación y correos...' : '✓ Enviar Postulación y CV'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ModalTrabajaConNosotros: React.FC<ModalTrabajaConNosotrosProps> = ({
  isOpen,
  onClose,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div className="w-full max-w-3xl flex justify-center" onClick={(e) => e.stopPropagation()}>
        <TrabajaConNosotrosContent onClose={onClose} />
      </div>
    </div>,
    document.body
  );
};
