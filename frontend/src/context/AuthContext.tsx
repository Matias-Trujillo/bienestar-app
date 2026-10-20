'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '../types';
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
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const TOKEN_KEY = 'bienestar_token';
const USER_KEY = 'bienestar_current_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const clearSession = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const refreshUser = async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return;
    try {
      const me = await fetchFromApi<User>('/auth/me', { headers: { Authorization: `Bearer ${stored}` } });
      setUser(me);
      localStorage.setItem(USER_KEY, JSON.stringify(me));
    } catch (e) {
      console.error('Error al actualizar datos del usuario:', e);
    }
  };

  useEffect(() => {
    // Al montar, validar el token guardado contra el backend (/auth/me)
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    fetchFromApi<User>('/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then((me) => {
        setToken(stored);
        setUser(me);
        localStorage.setItem(USER_KEY, JSON.stringify(me));
      })
      .catch(() => clearSession())
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetchFromApi<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    router.push('/');
  };

  const logout = () => {
    clearSession();
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!user, isLoading, login, logout, refreshUser }}
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
