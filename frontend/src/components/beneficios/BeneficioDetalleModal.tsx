'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BonoCatalogoItem } from '@/types';
import { formatCurrency } from '@/lib/utils';

export interface BeneficioEditorialMeta {
  imageUrl: string;
  imageAlt: string;
  resumenCorto: string;
  historiaExtendida: string;
}

// [ESTUDIANTE INFORMÁTICA] Diccionario editorial con fotografías representativas y textos cercanos para cada beneficio del Comité.
export const BENEFICIO_MEDIA_MAP: Record<string, BeneficioEditorialMeta> = {
  nacimiento: {
    imageUrl: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=900&q=80',
    imageAlt: 'Mano de un bebé junto a la mano de sus padres',
    resumenCorto:
      'Acompañamos la llegada de un nuevo integrante a tu familia con un apoyo pensado para sus primeros cuidados.',
    historiaExtendida:
      'La llegada de un hijo o hija es uno de los momentos más importantes en la vida familiar. El Comité de Bienestar entrega este beneficio para apoyar a la madre o al padre funcionario en los gastos iniciales de bienvenida y cuidado del recién nacido.',
  },
  escolaridad: {
    imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80',
    imageAlt: 'Libros, cuadernos y aprendizaje escolar',
    resumenCorto:
      'Impulsamos el inicio del año académico de tus hijos e hijas en educación prebásica, básica, media o superior.',
    historiaExtendida:
      'Reconocemos el esfuerzo de las familias municipales en la formación educacional de sus cargas legales. Este beneficio está orientado a aliviar los gastos de matrícula, útiles escolares y materiales de estudio al comienzo del período académico.',
  },
  vacaciones: {
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    imageAlt: 'Descanso y recreación familiar frente al mar',
    resumenCorto:
      'Un respaldo para disfrutar tu período de feriado legal anual junto a tu familia con mayor tranquilidad.',
    historiaExtendida:
      'El descanso y la desconexión laboral son fundamentales para la salud física y mental de cada funcionario municipal. Al hacer uso de tu feriado legal continuo, el Comité te acompaña para que puedas compartir tiempo de calidad y recreación.',
  },
  invierno: {
    imageUrl: 'https://images.unsplash.com/photo-1517299321609-52687d1bc55a?auto=format&fit=crop&w=900&q=80',
    imageAlt: 'Hogar cálido durante la temporada de invierno',
    resumenCorto:
      'Apoyo estacional de invierno para contribuir al bienestar y calefacción de los hogares de nuestros socios.',
    historiaExtendida:
      'Durante los meses más fríos del año aumentan los gastos de calefacción, energía y salud invernal. Este beneficio de calendario se liquida de manera masiva para todos los socios habilitados como respaldo directo a la economía familiar.',
  },
  navidad: {
    imageUrl: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=900&q=80',
    imageAlt: 'Celebración familiar de Navidad y fin de año',
    resumenCorto:
      'Celebramos el cierre del año acompañando las fiestas navideñas de cada socio y su grupo familiar.',
    historiaExtendida:
      'En diciembre el Comité de Bienestar comparte los frutos de una gestión solidaria mediante el Bono de Navidad, permitiendo que cada funcionario celebre las fiestas de fin de año en unión familiar.',
  },
  enfermedad_catastrofica: {
    imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80',
    imageAlt: 'Acompañamiento médico y cuidado de la salud',
    resumenCorto:
      'Protección solidaria de máxima cobertura ante diagnósticos médicos complejos o tratamientos de alto costo.',
    historiaExtendida:
      'Cuando un socio o una de sus cargas familiares enfrenta una enfermedad catastrófica o de alta complejidad, el Comité activa su mayor porcentaje de cobertura estatutaria para aliviar la carga financiera del tratamiento médico.',
  },
  catastrofe_siniestro: {
    imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=80',
    imageAlt: 'Protección del hogar y reconstrucción familiar',
    resumenCorto:
      'Auxilio rápido frente a emergencias habitacionales, incendios, temporales u otros siniestros imprevistos.',
    historiaExtendida:
      'Ante eventos fortuitos de la naturaleza o siniestros que afecten gravemente la vivienda del funcionario, el Comité de Bienestar dispone de esta ayuda extraordinaria para apoyar la pronta recuperación del hogar.',
  },
  fallecimiento_familiar: {
    imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80',
    imageAlt: 'Flores blancas en señal de respeto y acompañamiento en duelo',
    resumenCorto:
      'Acompañamiento respetuoso y apoyo solidario ante la partida de un familiar directo inscrito como carga.',
    historiaExtendida:
      'En los momentos más sensibles de pérdida de una carga familiar reconocida, el Comité entrega un respaldo solidario para acompañar a la familia del funcionario en los gastos asociados al duelo.',
  },
  fallecimiento_afiliado: {
    imageUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=900&q=80',
    imageAlt: 'Luz cálida en homenaje y resguardo a la familia del afiliado',
    resumenCorto:
      'Resguardo póstumo destinado directamente a la familia o beneficiarios legales del funcionario afiliado.',
    historiaExtendida:
      'Como expresión de gratitud y protección hacia el núcleo familiar del socio fallecido, el Comité liquida este auxilio póstumo directamente a favor de sus beneficiarios o herederos acreditados.',
  },
};

export function getBeneficioEditorial(id: string): BeneficioEditorialMeta {
  return (
    BENEFICIO_MEDIA_MAP[id] || {
      imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=900&q=80',
      imageAlt: 'Beneficio Social Comité de Bienestar',
      resumenCorto: 'Beneficio estatutario del Comité de Bienestar para apoyar al socio y su grupo familiar.',
      historiaExtendida:
        'Asignación económica contemplada en el reglamento oficial del Comité de Bienestar de la Ilustre Municipalidad de Peralillo.',
    }
  );
}

interface BeneficioDetalleModalProps {
  bono: BonoCatalogoItem | null;
  seccionTitulo?: string;
  cumpleRequisito6Meses: boolean;
  esDirectivaOAdmin: boolean;
  onClose: () => void;
  onSolicitar: (bono: BonoCatalogoItem) => void;
  onAsignacionDirecta: () => void;
  onError: (msg: string) => void;
}

// [ESTUDIANTE INFORMÁTICA] Modal que se abre al pulsar "Ver más", mostrando fotografía, explicación completa, monto, requisitos y botón de solicitud.
export const BeneficioDetalleModal: React.FC<BeneficioDetalleModalProps> = ({
  bono,
  seccionTitulo,
  cumpleRequisito6Meses,
  esDirectivaOAdmin,
  onClose,
  onSolicitar,
  onAsignacionDirecta,
  onError,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!bono || !mounted) return null;

  const editorial = getBeneficioEditorial(bono.id);
  const esCalendario = ['invierno', 'navidad'].includes(bono.id);
  const esVacaciones = bono.id === 'vacaciones';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200/90 overflow-hidden animate-scale-in max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Fotográfica del Beneficio */}
        <div className="relative h-52 sm:h-64 w-full bg-slate-900 shrink-0 overflow-hidden">
          <img
            src={editorial.imageUrl}
            alt={editorial.imageAlt}
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#091e32] via-[#091e32]/45 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center border border-white/20 transition-colors"
            aria-label="Cerrar ficha"
          >
            ✕
          </button>

          <div className="absolute bottom-4 left-5 right-5 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/15 backdrop-blur-xs text-sky-200 border border-white/20">
                {seccionTitulo || bono.categoria}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/25 backdrop-blur-xs text-lime-200 border border-emerald-400/30 tabular-nums">
                {bono.porcentaje}% Sueldo Base Grado 15
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{bono.nombre}</h3>
          </div>
        </div>

        {/* Contenido Detallado */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          <p className="text-sm text-slate-700 leading-relaxed font-normal">{editorial.historiaExtendida}</p>

          {/* Tarjeta Destacada de Monto y Vigencia */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-sky-50/60 to-slate-50 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-medium text-[#166534] block">
                Monto Oficial del Beneficio
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-[#166534] tabular-nums block mt-0.5">
                {formatCurrency(bono.monto_calculado)}
              </span>
              <span className="text-xs text-slate-500 font-normal tabular-nums">
                Cálculo automático: {bono.porcentaje}% sobre el sueldo imponible Grado 15
              </span>
            </div>

            <div className="sm:text-right">
              <span className="text-xs font-medium text-slate-500 block">Período de Devengo</span>
              <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                {bono.periodo_devengo || 'Todo el año según evento'}
              </span>
            </div>
          </div>

          {/* Grilla de Requisitos y Documentación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <span className="text-xs font-semibold text-slate-900 block">
                ✓ Requisitos para Acceder
              </span>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">{bono.requisitos}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <span className="text-xs font-semibold text-slate-900 block">
                📄 Documentación Requerida
              </span>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                {bono.documentacion_requerida}
              </p>
            </div>
          </div>

          {bono.regla_asignacion && (
            <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200/70 flex items-start gap-2.5">
              <span className="text-[#006799] font-bold">ℹ</span>
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Modalidad de Otorgamiento</span>
                <p className="text-xs text-slate-600 font-normal mt-0.5">{bono.regla_asignacion}</p>
              </div>
            </div>
          )}

          {/* Barra de Acciones del Modal */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Volver al Catálogo
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {esCalendario ? (
                <span className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-[#b45309] border border-amber-200/80">
                  Beneficio de liquidación masiva automática por calendario
                </span>
              ) : (
                <>
                  {esVacaciones && esDirectivaOAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onAsignacionDirecta();
                      }}
                      className="px-4 py-2.5 text-xs font-semibold text-[#166534] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
                    >
                      Asignación Directa (Directiva)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!cumpleRequisito6Meses) {
                        onClose();
                        onError(
                          'No cumples con el requisito mínimo de 6 meses de permanencia en el Comité de Bienestar para postular a beneficios.'
                        );
                        return;
                      }
                      const target = bono;
                      onClose();
                      onSolicitar(target);
                    }}
                    className={`px-5 py-2.5 text-xs font-semibold rounded-xl transition-all shadow-sm ${
                      cumpleRequisito6Meses
                        ? 'text-white bg-gradient-to-r from-[#0c2b45] to-[#006799] hover:opacity-95'
                        : 'text-slate-400 bg-slate-200 cursor-not-allowed'
                    }`}
                  >
                    Solicitar este Beneficio →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
