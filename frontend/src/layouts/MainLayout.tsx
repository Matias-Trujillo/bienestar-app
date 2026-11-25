'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { WelcomeLoginExperience } from '@/components/ui/WelcomeLoginExperience';
import { ModalCambioPasswordObligatorio } from '@/components/ui/ModalCambioPasswordObligatorio';
import { ModalTrabajaConNosotros } from '@/components/talento/ModalTrabajaConNosotros';

interface MainLayoutProps {
  children: React.ReactNode;
}

// [ESTUDIANTE INFORMÁTICA] Rutas públicas del portal que se renderizan a pantalla completa sin menú lateral.
const PUBLIC_ROUTES = ['/login', '/afiliacion/solicitud', '/talento/perfil'];

// [ESTUDIANTE INFORMÁTICA] Pantalla de carga moderna y centrada durante la verificación inicial del token JWT.
const LoadingPortalState: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-[#091e32] via-[#0c2b45] to-[#113628] flex items-center justify-center p-4">
    <div className="flex items-center gap-3.5 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-xl">
      <div className="w-5 h-5 border-2 border-sky-300 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-semibold tracking-wide text-white">
        Cargando Portal de Bienestar Peralillo...
      </p>
    </div>
  </div>
);

// [ESTUDIANTE INFORMÁTICA] Layout maestro con prevención estricta de desbordamiento horizontal (min-w-0 y overflow-x-hidden).
export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trabajaOpen, setTrabajaOpen] = useState(false);
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
    <div className="min-h-screen bg-[#f4f7fa] text-slate-900 flex overflow-x-hidden">
      <WelcomeLoginExperience />
      <ModalCambioPasswordObligatorio />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-[268px] transition-all pb-16 lg:pb-0">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        {/* [ESTUDIANTE INFORMÁTICA] pb-20 en móvil para evitar que la barra inferior flotante BottomNav tape el contenido */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-[1380px] w-full mx-auto min-w-0 pb-24 sm:pb-8 lg:pb-8">
          {children}
        </main>
        <footer className="py-3.5 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 border-t border-slate-200/80 bg-white/80 backdrop-blur-sm mb-16 lg:mb-0">
          <span className="font-medium text-center sm:text-left">Comité de Bienestar &copy; {new Date().getFullYear()} • I. Municipalidad de Peralillo</span>
          <div className="flex items-center gap-3 text-[11px]">
            <button
              type="button"
              onClick={() => setTrabajaOpen(true)}
              className="text-slate-500 hover:text-[#006799] hover:underline font-medium transition-colors cursor-pointer"
            >
              Trabaja con nosotros
            </button>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-slate-400 text-center sm:text-right">Portal Oficial de Socios y Funcionarios</span>
          </div>
        </footer>
      </div>

      <BottomNav onOpenSidebar={() => setSidebarOpen(true)} />
      <ModalTrabajaConNosotros isOpen={trabajaOpen} onClose={() => setTrabajaOpen(false)} />
    </div>
  );
};
