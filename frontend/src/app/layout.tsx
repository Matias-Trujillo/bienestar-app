import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { MainLayout } from '@/layouts/MainLayout';

// [ESTUDIANTE INFORMÁTICA] Fuente tipográfica única (Inter) para unificar el formato de textos, títulos y cifras en todo el sistema
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Comité de Bienestar • Portal Socio',
  description: 'Sistema de Gestión Operativa y Financiera para el Comité de Bienestar',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className={`${inter.className} h-full flex flex-col font-sans tabular-nums`}>
        <AuthProvider>
          <MainLayout>{children}</MainLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
