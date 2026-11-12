'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { WelcomeLoginExperience } from '@/components/ui/WelcomeLoginExperience';
import { ModalCambioPasswordObligatorio } from '@/components/ui/ModalCambioPasswordObligatorio';

interface MainLayoutProps {
  children: React.ReactNode;
}

// [ESTUDIANTE INFORMÁTICA] Rutas públicas del portal (login y formulario de postulación HU-01) que operan sin barra lateral.
const PUBLIC_ROUTES = ['/login', '/afiliacion/solicitud'];

// [ESTUDIANTE INFORMÁTICA] Vista de carga sobria y de alto contraste mientras se valida la sesión JWT del funcionario.
const LoadingPortalState: React.FC = () => (
  <div className="min-h-screen bg-[#0c2b45] flex items-center justify-center">
    <div className="flex items-center gap-3 px-5 py-3.5 rounded-lg bg-white/5 border border-white/15">
      <div className="w-5 h-5 border-2 border-[#006799] border-t-white rounded-full animate-spin" />
      <p className="text-xs font-semibold tracking-wide text-slate-200 uppercase">
        Verificando credenciales • Bienestar Peralillo
      </p>
    </div>
  </div>
);

// [ESTUDIANTE INFORMÁTICA] Ensamblador estructural Data-Dense: coordina navegación lateral fija, encabezado superior y área operativa.
export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublic) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, isPublic, router]);

  if (isPublic) return <>{children}</>;
  if (isLoading) return <LoadingPortalState />;
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex">
      <WelcomeLoginExperience />
      <ModalCambioPasswordObligatorio />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all pb-16 lg:pb-0">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
        <footer className="py-3 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 border-t border-slate-200 bg-white mb-14 lg:mb-0">
          <span>Comité de Bienestar • I. Municipalidad de Peralillo</span>
          <span className="font-mono text-slate-400">Marco Normativo Ley N° 19.754</span>
        </footer>
      </div>

      <BottomNav onOpenSidebar={() => setSidebarOpen(true)} />
    </div>
  );
};
