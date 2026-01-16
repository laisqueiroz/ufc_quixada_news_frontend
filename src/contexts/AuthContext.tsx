import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, User, AuthResponse, ApiError } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (login: string, senha: string) => Promise<void>;
  register: (data: {
    nome: string;
    login: string;
    email: string;
    senha: string;
    perfil: 'estudante' | 'docente' | 'servidor' | 'bolsista';
  }) => Promise<void>;
  logout: () => Promise<void>;
  canPublish: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await api.getProfile();
      setUser(userData);
    } catch (error) {
      localStorage.removeItem('auth_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (loginStr: string, senha: string) => {
    const response: AuthResponse = await api.login(loginStr, senha);
    localStorage.setItem('auth_token', response.token);
    setUser(response.user);
  };

  const register = async (data: {
    nome: string;
    login: string;
    email: string;
    senha: string;
    perfil: 'estudante' | 'docente' | 'servidor' | 'bolsista';
  }) => {
    const response: AuthResponse = await api.register(data);
    localStorage.setItem('auth_token', response.token);
    setUser(response.user);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      // Even if logout fails, clear local state
    }
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  const canPublish = user
    ? ['DOCENTE', 'SERVIDOR', 'BOLSISTA', 'ADMINISTRADOR'].includes(user.papel)
    : false;

  const isAdmin = user?.papel === 'ADMINISTRADOR';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        canPublish,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
