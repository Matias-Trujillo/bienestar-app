'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, ViewMode } from '../types';
import { fetchFromApi } from '../lib/api';

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  justLoggedIn: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  tieneDobleVista: boolean;
  isAdminView: boolean;
  dismissWelcome: () => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const TOKEN_KEY = 'bienestar_token';
const USER_KEY = 'bienestar_current_user';
export const VIEW_MODE_KEY = 'bienestar_view_mode';
export const SPLASH_SEEN_KEY = 'bienestar_splash_seen';
export const LOGOUT_USER_KEY = 'bienestar_logout_user';

// [ESTUDIANTE INFORMÁTICA] Determina si el usuario posee Cuenta con 2 Vistas (Admin/Directiva + Trabajador Socio).
function checkTieneDobleVista(u: User | null): boolean {
  if (!u) return false;
  if (typeof u.tieneDobleVista === 'boolean') return u.tieneDobleVista;
  return Boolean(u.isSuperuser || u.rol !== 'socio');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [justLoggedIn, setJustLoggedIn] = useState<boolean>(false);
  const [viewModeState, setViewModeState] = useState<ViewMode>('admin');
  const router = useRouter();

  const tieneDobleVista = checkTieneDobleVista(user);
  const viewMode: ViewMode = tieneDobleVista ? viewModeState : 'socio';
  const isAdminView = Boolean(tieneDobleVista && viewMode === 'admin');

  const setViewMode = (mode: ViewMode) => {
    if (!tieneDobleVista) {
      setViewModeState('socio');
      return;
    }
    setViewModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    }
  };

  const clearSession = () => {
    setUser(null);
    setToken(null);
    setJustLoggedIn(false);
    setViewModeState('admin');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(VIEW_MODE_KEY);
  };

  const dismissWelcome = () => {
    setJustLoggedIn(false);
  };

  const refreshUser = async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return;
    try {
      const me = await fetchFromApi<User>('/auth/me', { headers: { Authorization: `Bearer ${stored}` } });
      setUser(me);
      localStorage.setItem(USER_KEY, JSON.stringify(me));
      if (!checkTieneDobleVista(me)) {
        setViewModeState('socio');
      }
    } catch (e: unknown) {
      console.error('Error al actualizar datos del usuario:', e);
    }
  };

  useEffect(() => {
    // Al montar, validar el token guardado contra el backend (/auth/me)
    const stored = localStorage.getItem(TOKEN_KEY);
    const savedMode = localStorage.getItem(VIEW_MODE_KEY) as ViewMode | null;
    if (savedMode === 'admin' || savedMode === 'socio') {
      setViewModeState(savedMode);
    }
    if (!stored) {
      setIsLoading(false);
      return;
    }
    fetchFromApi<User>('/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then((me) => {
        setToken(stored);
        setUser(me);
        localStorage.setItem(USER_KEY, JSON.stringify(me));
        if (!checkTieneDobleVista(me)) {
          setViewModeState('socio');
        }
      })
      .catch(() => clearSession())
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetchFromApi<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
      sessionStorage.removeItem(LOGOUT_USER_KEY);
    }
    const initialMode: ViewMode = checkTieneDobleVista(res.user) ? 'admin' : 'socio';
    setToken(res.access_token);
    setUser(res.user);
    setViewModeState(initialMode);
    setJustLoggedIn(true);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    localStorage.setItem(VIEW_MODE_KEY, initialMode);
    router.push('/');
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
      if (user?.nombreCompleto) {
        sessionStorage.setItem(LOGOUT_USER_KEY, user.nombreCompleto);
      }
    }
    clearSession();
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        justLoggedIn,
        viewMode,
        setViewMode,
        tieneDobleVista,
        isAdminView,
        dismissWelcome,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
