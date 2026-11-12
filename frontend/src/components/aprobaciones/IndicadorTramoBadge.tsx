'use client';

import React from 'react';

export type TramoDias = 'verde' | 'amarillo' | 'rojo';

export interface IndicadorDias {
  dias: number;
  texto: string;
  tramo: TramoDias;
  pill: string;
  dot: string;
  rowBorder: string;
  tooltip: string;
}

// [ESTUDIANTE INFORMÁTICA] Calcula los días de antigüedad de la solicitud en bandeja: Verde (<5d), Amarillo (5-9d), Rojo (>=10d).
export function obtenerIndicadorDias(fechaIngresoStr?: string, fechaFallbackStr?: string): IndicadorDias {
  const raw = fechaIngresoStr || fechaFallbackStr || '';
  let dias = 0;

  if (raw) {
    const fecha = new Date(raw);
    if (!isNaN(fecha.getTime())) {
      const diffMs = Date.now() - fecha.getTime();
      dias = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
  }

  const texto = dias === 0 ? 'Hoy' : dias === 1 ? '1 día' : `${dias} días`;

  if (dias >= 10) {
    return {
      dias,
      texto,
      tramo: 'rojo',
      pill: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
      rowBorder: 'border-l-4 border-l-rose-500',
      tooltip: `${dias} días en bandeja (Mayor a 10 días)`,
    };
  }

  if (dias >= 5) {
    return {
      dias,
      texto,
      tramo: 'amarillo',
      pill: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
      rowBorder: 'border-l-4 border-l-amber-400',
      tooltip: `${dias} días en bandeja (Entre 5 y 9 días)`,
    };
  }

  return {
    dias,
    texto,
    tramo: 'verde',
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    rowBorder: 'border-l-4 border-l-emerald-500',
    tooltip: `${dias} días en bandeja (Menos de 5 días)`,
  };
}

interface IndicadorTramoBadgeProps {
  fechaIngreso?: string;
  fechaFallback?: string;
}

// [ESTUDIANTE INFORMÁTICA] Renderiza el distintivo visual con semáforo de antigüedad.
export const IndicadorTramoBadge: React.FC<IndicadorTramoBadgeProps> = ({ fechaIngreso, fechaFallback }) => {
  const info = obtenerIndicadorDias(fechaIngreso, fechaFallback);
  return (
    <span
      title={info.tooltip}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${info.pill}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
      {info.texto}
    </span>
  );
};
