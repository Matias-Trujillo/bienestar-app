'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Download,
  HeartHandshake,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { API_BASE_URL, fetchFromApi } from '@/lib/api';
import { formatCurrency, getErrorMessage } from '@/lib/utils';
import { OfertaLaboralItem } from '@/components/talento/ModalTrabajaConNosotros';

interface PostulacionAdminItem {
  id: number;
  folio: string;
  estado: string;
  fechaIngreso: string;
  nombreCompleto: string;
  run: string;
  email: string;
  telefono: string;
  comuna: string;
  rentaEsperadaClp: number;
  jornadaDeseada: string;
  modalidadDeseada: string;
  poseeDiscapacidadLey21015: boolean;
  cvFilename?: string | null;
  tieneCv: boolean;
  ofertaId?: number | null;
  ofertaTitulo?: string | null;
  competencias: { id: number; nombre: string; categoria: string }[];
}

interface OfertasLaboralesAdminProps {
  token: string | null;
  onSuccessMsg: (msg: string) => void;
}

export const OfertasLaboralesAdmin: React.FC<OfertasLaboralesAdminProps> = ({
  token,
  onSuccessMsg,
}) => {
  const [subTab, setSubTab] = useState<'ofertas' | 'postulaciones'>('ofertas');
  const [ofertas, setOfertas] = useState<OfertaLaboralItem[]>([]);
  const [postulaciones, setPostulaciones] = useState<PostulacionAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  // Formulario nueva oferta
  const [titulo, setTitulo] = useState('');
  const [unidad, setUnidad] = useState('Dirección de Administración y Finanzas');
  const [descripcion, setDescripcion] = useState('');
  const [requisitos, setRequisitos] = useState('');
  const [rentaStr, setRentaStr] = useState('850.000');
  const [jornada, setJornada] = useState<'completa' | 'parcial' | 'turnos'>('completa');
  const [modalidad, setModalidad] = useState<'presencial' | 'hibrida' | 'teletrabajo'>('presencial');
  const [vacantes, setVacantes] = useState('1');
  const [fechaCierre, setFechaCierre] = useState('');
  const [inclusiva, setInclusiva] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [ofs, posts] = await Promise.all([
        fetchFromApi<OfertaLaboralItem[]>('/talento/ofertas?incluir_cerradas=true', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetchFromApi<PostulacionAdminItem[]>('/talento/postulaciones', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setOfertas(Array.isArray(ofs) ? ofs : []);
      setPostulaciones(Array.isArray(posts) ? posts : []);
    } catch {
      // mantener estado
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleCrearOferta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setErrorForm(null);
    if (titulo.trim().length < 3) return setErrorForm('Ingrese el título del cargo.');
    if (descripcion.trim().length < 15) return setErrorForm('Ingrese una descripción de al menos 15 caracteres.');

    setGuardando(true);
    try {
      const rentaNum = Number(rentaStr.replace(/[^0-9]/g, ''));
      await fetchFromApi<OfertaLaboralItem>('/talento/ofertas', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          titulo: titulo.trim(),
          unidad: unidad.trim(),
          descripcion: descripcion.trim(),
          requisitos: requisitos.trim(),
          rentaReferencialClp: rentaNum >= 100000 ? rentaNum : null,
          jornada,
          modalidad,
          vacantes: Math.max(1, Number(vacantes) || 1),
          fechaCierre: fechaCierre || null,
          inclusivaLey21015: inclusiva,
        }),
      });
      setTitulo('');
      setDescripcion('');
      setRequisitos('');
      setFechaCierre('');
      setMostrarForm(false);
      onSuccessMsg('Oferta laboral publicada. Ya es visible en el perfil de los socios.');
      await cargarDatos();
    } catch (err: unknown) {
      setErrorForm(getErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (of: OfertaLaboralItem) => {
    if (!token) return;
    try {
      await fetchFromApi(`/talento/ofertas/${of.id}/estado`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ activa: !of.activa }),
      });
      onSuccessMsg(`Oferta ${of.codigo} marcada como ${!of.activa ? 'Activa' : 'Cerrada'}.`);
      await cargarDatos();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    }
  };

  const handleEliminar = async (of: OfertaLaboralItem) => {
    if (!token) return;
    if (!window.confirm(`¿Eliminar definitivamente la oferta ${of.codigo} — ${of.titulo}?`)) return;
    try {
      await fetchFromApi(`/talento/ofertas/${of.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      onSuccessMsg(`Oferta ${of.codigo} eliminada.`);
      await cargarDatos();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    }
  };

  const handleDescargarCv = async (folio: string, filename: string) => {
    if (!token) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/talento/postulaciones/${encodeURIComponent(folio)}/cv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('No se pudo descargar el archivo CV.');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      {/* Cabecera de gestión RRHH */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#0c2b45] flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#006799]" />
            <span>Gestión de Ofertas Laborales y Postulaciones (RRHH)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Las ofertas activas que publiques aquí aparecen automáticamente en el perfil de los socios para postular con su CV.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/70">
            <button
              type="button"
              onClick={() => setSubTab('ofertas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'ofertas' ? 'bg-white text-[#006799] shadow-2xs' : 'text-slate-600'
              }`}
            >
              Ofertas ({ofertas.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('postulaciones')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                subTab === 'postulaciones' ? 'bg-white text-[#006799] shadow-2xs' : 'text-slate-600'
              }`}
            >
              Postulaciones ({postulaciones.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setSubTab('ofertas');
              setMostrarForm((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 shadow-xs transition cursor-pointer"
          >
            {mostrarForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{mostrarForm ? 'Cerrar Formulario' : 'Publicar Oferta Laboral'}</span>
          </button>
        </div>
      </div>

      {/* Formulario de Nueva Oferta */}
      {mostrarForm && (
        <form
          onSubmit={handleCrearOferta}
          className="bg-white p-5 sm:p-6 rounded-2xl border border-sky-200 shadow-sm space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-[#0c2b45]">
              Nueva Oferta de Empleo Disponible
            </h3>
            <span className="text-[11px] font-semibold text-[#006799] bg-sky-50 px-2.5 py-0.5 rounded-full">
              Visible inmediatamente para socios
            </span>
          </div>

          {errorForm && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
              ⚠ {errorForm}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Título del Cargo *</label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Administrativo/a de Atención Ciudadana"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Unidad / Departamento *</label>
              <input
                type="text"
                required
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                placeholder="Ej: DIDECO, Secretaría Municipal, Obras..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Renta Referencial (CLP)</label>
              <input
                type="text"
                value={rentaStr}
                onChange={(e) => {
                  const d = e.target.value.replace(/[^0-9]/g, '');
                  setRentaStr(d ? Number(d).toLocaleString('es-CL') : '');
                }}
                placeholder="850.000"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jornada</label>
              <select
                value={jornada}
                onChange={(e) => setJornada(e.target.value as 'completa' | 'parcial' | 'turnos')}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="completa">Jornada Completa</option>
                <option value="parcial">Jornada Parcial</option>
                <option value="turnos">Sistema de Turnos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Modalidad</label>
              <select
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as 'presencial' | 'hibrida' | 'teletrabajo')}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="presencial">Presencial</option>
                <option value="hibrida">Híbrida</option>
                <option value="teletrabajo">Teletrabajo</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cupos</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={vacantes}
                  onChange={(e) => setVacantes(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cierre</label>
                <input
                  type="date"
                  value={fechaCierre}
                  onChange={(e) => setFechaCierre(e.target.value)}
                  className="w-full px-2 py-2 text-[11px] bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descripción del Cargo y Funciones *
              </label>
              <textarea
                rows={3}
                required
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalle las principales funciones y objetivos del puesto..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Requisitos y Perfil Deseado
              </label>
              <textarea
                rows={3}
                value={requisitos}
                onChange={(e) => setRequisitos(e.target.value)}
                placeholder="Ej: Título técnico o profesional, manejo de Excel, experiencia en atención de público..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/30"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={inclusiva}
                onChange={(e) => setInclusiva(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#006799]"
              />
              <span>Oferta inclusiva sujeta a Ley N° 21.015</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition disabled:opacity-60 cursor-pointer"
              >
                {guardando ? 'Publicando...' : '✓ Publicar Oferta'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Listado de Ofertas */}
      {subTab === 'ofertas' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Cargando ofertas laborales...</div>
          ) : ofertas.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">No hay ofertas laborales publicadas aún</p>
              <p className="text-xs text-slate-500">
                Haz clic en <strong>Publicar Oferta Laboral</strong> para crear una vacante visible en el perfil de los socios.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {ofertas.map((of) => (
                <div
                  key={of.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-[#006799] bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                        {of.codigo}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          of.activa
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {of.activa ? '● Activa' : '○ Cerrada'}
                      </span>
                      {of.inclusivaLey21015 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-[#006799]">
                          <HeartHandshake className="w-3 h-3" /> Ley 21.015
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {of.postulacionesCount}{' '}
                        {of.postulacionesCount === 1 ? 'postulante' : 'postulantes'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{of.titulo}</h4>
                    <p className="text-xs text-slate-500">
                      {of.unidad} • {of.vacantes} {of.vacantes === 1 ? 'vacante' : 'vacantes'}
                      {of.rentaReferencialClp ? ` • ${formatCurrency(of.rentaReferencialClp)}` : ''}
                      {of.fechaCierre ? ` • Cierre: ${of.fechaCierre}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleEstado(of)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        of.activa
                          ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200'
                          : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                      }`}
                    >
                      {of.activa ? 'Cerrar Oferta' : 'Reabrir'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEliminar(of)}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                      title="Eliminar oferta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Listado de Postulaciones Recibidas */}
      {subTab === 'postulaciones' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Cargando postulaciones...</div>
          ) : postulaciones.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Aún no se han recibido postulaciones en el portal de Talento.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {postulaciones.map((p) => (
                <div
                  key={p.folio}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-[#006799] bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                        {p.folio}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> {p.estado}
                      </span>
                      {p.poseeDiscapacidadLey21015 && (
                        <span className="text-[10px] font-bold bg-sky-50 text-[#006799] border border-sky-200 px-2 py-0.5 rounded-full">
                          Ley 21.015
                        </span>
                      )}
                      {p.ofertaTitulo && (
                        <span className="text-[11px] font-bold text-slate-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          Oferta: {p.ofertaTitulo}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {p.nombreCompleto} <span className="font-mono text-xs text-slate-500">({p.run})</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      {p.email} • {p.telefono} • {p.comuna} • Renta esperada: {formatCurrency(p.rentaEsperadaClp)}
                    </p>
                  </div>

                  {p.tieneCv && p.cvFilename && (
                    <button
                      type="button"
                      onClick={() => handleDescargarCv(p.folio, p.cvFilename || `${p.folio}.pdf`)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#006799] bg-sky-50 hover:bg-sky-100 border border-sky-200 transition cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar CV</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
