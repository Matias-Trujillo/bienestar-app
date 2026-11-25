'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Calendar,
  Clock,
  HeartHandshake,
  MapPin,
  Search,
  Send,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchFromApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  ModalTrabajaConNosotros,
  OfertaLaboralItem,
} from '@/components/talento/ModalTrabajaConNosotros';
import { OfertasLaboralesAdmin } from '@/components/admin/OfertasLaboralesAdmin';

const ROLES_GESTION_RRHH = ['presidente', 'secretario', 'tesorero', 'admin', 'auditor', 'superusuario'];

const JORNADA_TEXT: Record<string, string> = {
  completa: 'Jornada Completa',
  parcial: 'Jornada Parcial',
  turnos: 'Sistema de Turnos',
};

const MODALIDAD_TEXT: Record<string, string> = {
  presencial: 'Presencial',
  hibrida: 'Híbrida',
  teletrabajo: 'Teletrabajo',
};

export default function OfertasLaboralesPage() {
  const { user, token, isAdminView } = useAuth();
  const esGestorRRHH = Boolean(
    isAdminView && user && (user.isSuperuser || ROLES_GESTION_RRHH.includes(user.rol))
  );
  const esSocioNormal = Boolean(user && !user.isSuperuser && user.rol === 'socio');

  const [ofertas, setOfertas] = useState<OfertaLaboralItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroJornada, setFiltroJornada] = useState<string>('todas');
  const [filtroModalidad, setFiltroModalidad] = useState<string>('todas');

  const [modalOpen, setModalOpen] = useState(false);
  const [ofertaModal, setOfertaModal] = useState<OfertaLaboralItem | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const cargarOfertas = useCallback(async () => {
    setCargando(true);
    try {
      const data = await fetchFromApi<OfertaLaboralItem[]>('/talento/ofertas');
      setOfertas(Array.isArray(data) ? data : []);
    } catch {
      setOfertas([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarOfertas();
  }, [cargarOfertas]);

  const ofertasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return ofertas.filter((of) => {
      if (filtroJornada !== 'todas' && of.jornada !== filtroJornada) return false;
      if (filtroModalidad !== 'todas' && of.modalidad !== filtroModalidad) return false;
      if (q) {
        return (
          of.titulo.toLowerCase().includes(q) ||
          of.unidad.toLowerCase().includes(q) ||
          of.codigo.toLowerCase().includes(q) ||
          of.descripcion.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [ofertas, busqueda, filtroJornada, filtroModalidad]);

  return (
    <div className="space-y-6 animate-fade-in min-w-0">
      {/* Cabecera Institucional */}
      <div className="hero-institutional">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#006799] via-[#78a200] via-[#cfa145] to-[#d94e28]" />
        <div className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-amber-200 border border-white/15">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Vecino y Nuevo Talento • Ley N° 21.015</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Ofertas Laborales Disponibles
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              {esGestorRRHH
                ? 'Publica convocatorias vigentes, administra el estado de las vacantes y revisa los currículums recibidos.'
                : 'Explora las vacantes disponibles publicadas por la Ilustre Municipalidad de Peralillo y postula directamente con tu CV.'}
            </p>
          </div>

          {esSocioNormal && (
            <button
              type="button"
              onClick={() => {
                setOfertaModal(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl shadow-xs transition shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar CV (Postulación Espontánea)</span>
            </button>
          )}
        </div>
      </div>

      {mensajeExito && (
        <div className="p-4 text-xs bg-emerald-50 text-[#166534] border border-emerald-200 rounded-2xl font-bold shadow-2xs">
          ✓ {mensajeExito}
        </div>
      )}

      {/* Vista RRHH / Directiva / Admin */}
      {esGestorRRHH ? (
        <OfertasLaboralesAdmin
          token={token}
          onSuccessMsg={(msg) => {
            setMensajeExito(msg);
            setTimeout(() => setMensajeExito(null), 5000);
            cargarOfertas();
          }}
        />
      ) : (
        /* Vista Socios / Postulantes */
        <div className="space-y-5">
          {/* Barra de búsqueda y filtros */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por cargo, unidad, código o palabra clave..."
                className="w-full pl-10 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006799]/30 focus:border-[#006799]"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filtroJornada}
                onChange={(e) => setFiltroJornada(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
              >
                <option value="todas">Todas las jornadas</option>
                <option value="completa">Jornada Completa</option>
                <option value="parcial">Jornada Parcial</option>
                <option value="turnos">Sistema de Turnos</option>
              </select>
              <select
                value={filtroModalidad}
                onChange={(e) => setFiltroModalidad(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
              >
                <option value="todas">Todas las modalidades</option>
                <option value="presencial">Presencial</option>
                <option value="hibrida">Híbrida</option>
                <option value="teletrabajo">Teletrabajo</option>
              </select>
            </div>
          </div>

          {/* Grilla de ofertas */}
          {cargando ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-200/80 text-center text-xs text-slate-400">
              Cargando ofertas laborales disponibles...
            </div>
          ) : ofertasFiltradas.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-200/80 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200/80 text-[#006799] flex items-center justify-center mx-auto">
                <Briefcase className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">
                  {ofertas.length === 0
                    ? 'No hay ofertas laborales publicadas en este momento'
                    : 'No se encontraron ofertas con los filtros aplicados'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {esSocioNormal
                    ? 'De todas formas puedes dejar tu currículum en nuestra Base de Talentos para ser considerado(a) en próximas convocatorias.'
                    : 'Cuando RRHH publique nuevas vacantes, aparecerán listadas aquí.'}
                </p>
              </div>
              {esSocioNormal && (
                <button
                  type="button"
                  onClick={() => {
                    setOfertaModal(null);
                    setModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 shadow-xs transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar CV a Base de Talentos</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ofertasFiltradas.map((of) => (
                <div
                  key={of.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-sky-300/80 transition-all p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {of.codigo}
                        </span>
                        {of.inclusivaLey21015 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-[#006799] border border-sky-200/80">
                            <HeartHandshake className="w-3 h-3" />
                            Ley 21.015
                          </span>
                        )}
                      </div>
                      {of.rentaReferencialClp ? (
                        <span className="text-xs font-extrabold text-[#166534] bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full tabular-nums">
                          {formatCurrency(of.rentaReferencialClp)}
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-[#0c2b45] leading-snug">
                        {of.titulo}
                      </h3>
                      <p className="text-xs font-semibold text-[#006799] mt-0.5">{of.unidad}</p>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {of.descripcion}
                    </p>

                    {of.requisitos && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                        <span className="font-bold text-slate-700 block mb-0.5">Requisitos:</span>
                        <span>{of.requisitos}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500 pt-1">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {JORNADA_TEXT[of.jornada] || of.jornada}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {MODALIDAD_TEXT[of.modalidad] || of.modalidad}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {of.vacantes} {of.vacantes === 1 ? 'cupo' : 'cupos'}
                      </span>
                      {of.fechaCierre && (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-amber-600" />
                          Cierre: {of.fechaCierre}
                        </span>
                      )}
                    </div>
                  </div>

                  {esSocioNormal && (
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setOfertaModal(of);
                          setModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 shadow-xs transition cursor-pointer"
                      >
                        <span>Postular a esta oferta</span>
                        <span>→</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {esSocioNormal && (
        <ModalTrabajaConNosotros
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setOfertaModal(null);
          }}
          ofertaInicial={ofertaModal}
        />
      )}
    </div>
  );
}
