'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
}

// HU-01: el funcionario aún no es socio, por lo que la solicitud de incorporación es pública
const PUBLIC_ROUTES = ['/login', '/afiliacion/solicitud'];
export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Rutas públicas: no requieren sesión ni muestran Sidebar/Header
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    // Si terminó de cargar y no está autenticado, redirigir a /login
    if (!isLoading && !isAuthenticated && !isPublic) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, isPublic, router]);

  if (isPublic) {
    return <>{children}</>;
  }

  // Mientras verifica el estado de autenticación en la primera carga
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-300">Cargando Portal de Bienestar...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado y aún no completa la redirección
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
      {/* Barra Lateral / Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Contenedor Principal */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all">
        {/* Encabezado Superior / Header */}
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Área de Contenido de la Página */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="py-4 px-6 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white/50">
          Comité de Bienestar &copy; {new Date().getFullYear()} • Sistema de Gestión Operativa y Financiera
        </footer>
      </div>
    </div>
  );
};
