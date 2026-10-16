'use client';

import React from 'react';
import Link from 'next/link';

export default function BeneficiosPage() {
  const catalogo = [
    { id: 1, titulo: 'Bono de Vacaciones', monto: '$80.000', req: 'Socio con > 6 meses de antigüedad', cat: 'Anual' },
    { id: 2, titulo: 'Bono Escolaridad', monto: '$45.000', req: 'Por cada carga legal estudiando', cat: 'Educación' },
    { id: 3, titulo: 'Asignación Natalidad', monto: '$100.000', req: 'Certificado de nacimiento de la carga', cat: 'Familia' },
    { id: 4, titulo: 'Fondo Catástrofe / Salud Crítica', monto: 'Hasta $200.000', req: 'Informe social y evaluación de directiva', cat: 'Solidario' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Catálogo de Beneficios Sociales</h1>
          <p className="text-xs text-slate-500">Beneficios y ayudas otorgadas por el Comité de Bienestar</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition"
        >
          ← Volver al Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {catalogo.map((b) => (
          <div key={b.id} className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-800">{b.titulo}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">{b.cat}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Requisitos: {b.req}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-base font-extrabold text-emerald-700">{b.monto}</span>
              <button
                onClick={() => alert(`Iniciando postulación a: ${b.titulo}`)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
              >
                Postular
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
