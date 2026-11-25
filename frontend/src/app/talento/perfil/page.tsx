'use client';

import React from 'react';
import Link from 'next/link';
import { TrabajaConNosotrosContent } from '@/components/talento/ModalTrabajaConNosotros';

export default function TalentoPerfilPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fa] py-8 px-4 sm:px-6 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/login"
            className="text-xs font-semibold text-[#006799] hover:text-[#0c2b45] hover:underline"
          >
            ← Volver al Portal de Bienestar
          </Link>
          <span className="text-[11px] font-medium text-slate-500">
            I. Municipalidad de Peralillo • Trabaja con Nosotros
          </span>
        </div>

        <TrabajaConNosotrosContent embedded />
      </div>
    </div>
  );
}
