'use client';

import React, { useEffect, useState } from 'react';
import { Briefcase, Calendar, Clock, HeartHandshake, MapPin, Users } from 'lucide-react';
import { fetchFromApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  ModalTrabajaConNosotros,
  OfertaLaboralItem,
} from '@/components/talento/ModalTrabajaConNosotros';

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

export const OfertasLaboralesSection: React.FC = () => {
  const [ofertas, setOfertas] = useState<OfertaLaboralItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ofertaModal, setOfertaModal] = useState<OfertaLaboralItem | null>(null);

  useEffect(() => {
    fetchFromApi<OfertaLaboralItem[]>('/talento/ofertas')
      .then((data) => setOfertas(Array.isArray(data) ? data : []))
      .catch(() => setOfertas([]))
      .finally(() => setCargando(false));
  }, []);

  if (cargando || ofertas.length === 0) return null;

  return (
    <section className="space-y-3 min-w-0 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#006799]" />
            <span>Ofertas Laborales Disponibles</span>
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-[#006799] border border-sky-200/80 tabular-nums">
            {ofertas.length} {ofertas.length === 1 ? 'vacante abierta' : 'vacantes abiertas'}
          </span>
        </div>
        <span className="text-xs text-slate-500">
          Convocatorias publicadas por RRHH • Ley N° 21.015
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ofertas.map((of) => (
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

              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                {of.descripcion}
              </p>

              {of.requisitos && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700">Requisitos: </span>
                  <span className="line-clamp-2">{of.requisitos}</span>
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

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setOfertaModal(of)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95 shadow-xs transition cursor-pointer"
              >
                <span>Postular a esta oferta</span>
                <span>→</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <ModalTrabajaConNosotros
        isOpen={Boolean(ofertaModal)}
        onClose={() => setOfertaModal(null)}
        ofertaInicial={ofertaModal}
      />
    </section>
  );
};
