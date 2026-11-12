'use client';

import React, { useState, useMemo } from 'react';
import { BonoCatalogoItem, CatalogoBeneficios } from '@/types';
import {
  GiftIcon,
  SnowflakeIcon,
  PalmtreeIcon,
  GraduationCapIcon,
  BabyIcon,
  HeartCrackIcon,
  RibbonIcon,
  StethoscopeIcon,
  FlameIcon,
  FileTextIcon,
  SearchIcon,
} from './Icons';
import { BeneficioDetalleModal, getBeneficioEditorial } from './BeneficioDetalleModal';

interface CatalogoBonosProps {
  catalogo: CatalogoBeneficios | null;
  cumpleRequisito6Meses: boolean;
  esDirectivaOAdmin: boolean;
  onPostular: (bono: BonoCatalogoItem) => void;
  onAsignacionDirecta: () => void;
  onError: (msg: string) => void;
}

type SeccionId = 'recreacion' | 'familia' | 'salud' | 'solidaridad' | 'todos';

interface SeccionMeta {
  id: Exclude<SeccionId, 'todos'>;
  titulo: string;
  tituloCorto: string;
  subtitulo: string;
  badgeText: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  coverImage: string;
  bonoIds: string[];
}

// [ESTUDIANTE INFORMÁTICA] Apartados temáticos con portada visual para que el socio explore cada categoría.
const SECCIONES_BENEFICIOS: SeccionMeta[] = [
  {
    id: 'familia',
    titulo: 'Educación y Vida Familiar',
    tituloCorto: 'Educación y Familia',
    subtitulo: 'Bienvenida al recién nacido y apoyo educacional para tus cargas familiares.',
    badgeText: 'Familia y Estudios',
    accentBg: 'bg-emerald-50',
    accentText: 'text-[#166534]',
    accentBorder: 'border-emerald-200/80',
    coverImage: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=600&q=80',
    bonoIds: ['nacimiento', 'escolaridad'],
  },
  {
    id: 'recreacion',
    titulo: 'Descanso, Recreación y Celebraciones',
    tituloCorto: 'Descanso y Recreación',
    subtitulo: 'Beneficios para feriado legal, temporada de invierno y fiestas de fin de año.',
    badgeText: 'Tiempo Libre y Fiestas',
    accentBg: 'bg-sky-50',
    accentText: 'text-[#006799]',
    accentBorder: 'border-sky-200/80',
    coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    bonoIds: ['vacaciones', 'invierno', 'navidad'],
  },
  {
    id: 'salud',
    titulo: 'Salud y Protección Médica',
    tituloCorto: 'Salud y Bienestar',
    subtitulo: 'Respaldo de alta cobertura frente a diagnósticos médicos complejos.',
    badgeText: 'Cobertura de Salud',
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-700',
    accentBorder: 'border-indigo-200/80',
    coverImage: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80',
    bonoIds: ['enfermedad_catastrofica'],
  },
  {
    id: 'solidaridad',
    titulo: 'Emergencia y Apoyo Solidario',
    tituloCorto: 'Apoyo Solidario',
    subtitulo: 'Auxilio oportuno ante siniestros habitacionales o duelo familiar.',
    badgeText: 'Protección Solidaria',
    accentBg: 'bg-amber-50',
    accentText: 'text-[#b45309]',
    accentBorder: 'border-amber-200/80',
    coverImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80',
    bonoIds: ['catastrofe_siniestro', 'fallecimiento_familiar', 'fallecimiento_afiliado'],
  },
];

// [ESTUDIANTE INFORMÁTICA] Asocia cada código de bono con su ícono vectorial.
function renderBonoIcon(id: string, className = 'w-5 h-5'): React.ReactNode {
  switch (id) {
    case 'vacaciones':
      return <PalmtreeIcon className={className} />;
    case 'escolaridad':
      return <GraduationCapIcon className={className} />;
    case 'nacimiento':
      return <BabyIcon className={className} />;
    case 'fallecimiento_familiar':
      return <HeartCrackIcon className={className} />;
    case 'fallecimiento_afiliado':
      return <RibbonIcon className={className} />;
    case 'enfermedad_catastrofica':
      return <StethoscopeIcon className={className} />;
    case 'catastrofe_siniestro':
      return <FlameIcon className={className} />;
    case 'invierno':
      return <SnowflakeIcon className={className} />;
    case 'navidad':
      return <GiftIcon className={className} />;
    default:
      return <FileTextIcon className={className} />;
  }
}

interface BonoVisualCardProps {
  bono: BonoCatalogoItem;
  seccion: SeccionMeta;
  onVerMas: (bono: BonoCatalogoItem, seccionTitulo: string) => void;
}

// [ESTUDIANTE INFORMÁTICA] Tarjeta visual de beneficio con fotografía temática, texto humano y botón "Ver más".
const BonoVisualCard: React.FC<BonoVisualCardProps> = ({ bono, seccion, onVerMas }) => {
  const editorial = getBeneficioEditorial(bono.id);

  return (
    <div
      onClick={() => onVerMas(bono, seccion.titulo)}
      className="card-modern-interactive flex flex-col justify-between overflow-hidden group cursor-pointer min-w-0"
    >
      <div>
        {/* Imagen Representativa del Beneficio */}
        <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
          <img
            src={editorial.imageUrl}
            alt={editorial.imageAlt}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/20 to-transparent" />

          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-xs bg-white/90 ${seccion.accentText} ${seccion.accentBorder}`}
            >
              {seccion.badgeText}
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur-xs text-slate-800 flex items-center justify-center shadow-xs">
              {renderBonoIcon(bono.id, 'w-4 h-4')}
            </div>
          </div>

          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="text-base font-bold text-white leading-snug drop-shadow-xs">
              {bono.nombre}
            </h3>
          </div>
        </div>

        {/* Texto Cálido Correspondiente al Beneficio */}
        <div className="p-5">
          <p className="text-xs text-slate-600 leading-relaxed font-normal">
            {editorial.resumenCorto}
          </p>
        </div>
      </div>

      {/* Pie de Tarjeta con Botón "Ver más" */}
      <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500 font-normal truncate">
          Conoce monto, requisitos y respaldos
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onVerMas(bono, seccion.titulo);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#006799] bg-sky-50 group-hover:bg-[#006799] group-hover:text-white border border-sky-200/80 transition-all shrink-0"
        >
          <span>Ver más</span>
          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
        </button>
      </div>
    </div>
  );
};

// [ESTUDIANTE INFORMÁTICA] Catálogo interactivo: el usuario pincha una sección para ver sus beneficios y pulsa "Ver más" para abrir la ficha completa.
export const CatalogoBonos: React.FC<CatalogoBonosProps> = ({
  catalogo,
  cumpleRequisito6Meses,
  esDirectivaOAdmin,
  onPostular,
  onAsignacionDirecta,
  onError,
}) => {
  const [seccionActiva, setSeccionActiva] = useState<SeccionId>('familia');
  const [busqueda, setBusqueda] = useState<string>('');
  const [bonoSeleccionado, setBonoSeleccionado] = useState<{
    bono: BonoCatalogoItem;
    seccionTitulo: string;
  } | null>(null);

  const todosLosBonos = useMemo(() => {
    if (!catalogo) return [];
    return [...catalogo.bonos_contingencia, ...catalogo.bonos_calendario];
  }, [catalogo]);

  const seccionesConBonos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return SECCIONES_BENEFICIOS.map((sec) => {
      const items = todosLosBonos.filter((b) => {
        if (!sec.bonoIds.includes(b.id)) return false;
        if (!q) return true;
        return (
          b.nombre.toLowerCase().includes(q) ||
          b.requisitos.toLowerCase().includes(q) ||
          b.categoria.toLowerCase().includes(q)
        );
      });
      return { ...sec, items };
    }).filter((sec) => (seccionActiva === 'todos' ? sec.items.length > 0 : sec.id === seccionActiva));
  }, [todosLosBonos, seccionActiva, busqueda]);

  return (
    <div className="space-y-6 min-w-0">
      {/* 1. Selector Visual de Secciones (Pincha una sección para ver sus beneficios) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              1. Selecciona un Apartado de Beneficios
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              Pincha cualquiera de las secciones para explorar los beneficios disponibles en esa categoría
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSeccionActiva('todos')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
                seccionActiva === 'todos'
                  ? 'bg-[#0c2b45] text-white border-[#0c2b45] shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Ver Todas las Secciones ({todosLosBonos.length})
            </button>

            <div className="relative w-full sm:w-60">
              <div className="absolute left-3 top-2.5 text-slate-400">
                <SearchIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Buscar beneficio..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  if (e.target.value.trim() !== '') setSeccionActiva('todos');
                }}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:ring-2 focus:ring-[#006799] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Grilla de las 4 Secciones Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 min-w-0">
          {SECCIONES_BENEFICIOS.map((sec) => {
            const count = todosLosBonos.filter((b) => sec.bonoIds.includes(b.id)).length;
            const activa = seccionActiva === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSeccionActiva(sec.id)}
                className={`text-left rounded-2xl p-4 border transition-all duration-200 flex items-center gap-3.5 min-w-0 ${
                  activa
                    ? 'bg-gradient-to-br from-[#0c2b45] to-[#006799] text-white border-[#0c2b45] shadow-md -translate-y-0.5'
                    : 'bg-white hover:bg-slate-50/80 text-slate-800 border-slate-200/90 shadow-2xs'
                }`}
              >
                <img
                  src={sec.coverImage}
                  alt={sec.tituloCorto}
                  className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/20"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-semibold truncate ${
                        activa ? 'text-sky-200' : sec.accentText
                      }`}
                    >
                      {sec.badgeText}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums shrink-0 ${
                        activa ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                  <p className={`text-sm font-bold truncate mt-0.5 ${activa ? 'text-white' : 'text-slate-900'}`}>
                    {sec.tituloCorto}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Listado de Beneficios de la Sección Seleccionada */}
      {seccionesConBonos.length === 0 ? (
        <div className="card-modern p-10 text-center text-xs text-slate-400">
          No se encontraron beneficios en esta sección para la búsqueda realizada.
        </div>
      ) : (
        <div className="space-y-8 min-w-0">
          {seccionesConBonos.map((seccion) => (
            <section key={seccion.id} className="space-y-4 min-w-0 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${seccion.accentBg} ${seccion.accentText} ${seccion.accentBorder}`}
                    >
                      {seccion.badgeText}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{seccion.titulo}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-normal">{seccion.subtitulo}</p>
                </div>
                <span className="text-xs text-slate-500 font-medium tabular-nums">
                  Pincha &ldquo;Ver más&rdquo; en cualquier tarjeta para revisar montos y postular
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 min-w-0">
                {seccion.items.map((bono) => (
                  <BonoVisualCard
                    key={bono.id}
                    bono={bono}
                    seccion={seccion}
                    onVerMas={(item, secTitle) =>
                      setBonoSeleccionado({ bono: item, seccionTitulo: secTitle })
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* 3. Modal "Ver más" con toda la información del beneficio y botón para solicitar */}
      <BeneficioDetalleModal
        bono={bonoSeleccionado?.bono || null}
        seccionTitulo={bonoSeleccionado?.seccionTitulo}
        cumpleRequisito6Meses={cumpleRequisito6Meses}
        esDirectivaOAdmin={esDirectivaOAdmin}
        onClose={() => setBonoSeleccionado(null)}
        onSolicitar={(bono) => onPostular(bono)}
        onAsignacionDirecta={onAsignacionDirecta}
        onError={onError}
      />
    </div>
  );
};
