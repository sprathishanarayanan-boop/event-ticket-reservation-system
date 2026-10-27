import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export type UserRole = 'ADMIN' | 'ORGANIZER' | 'ATTENDEE';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string | null;
  tenant_id?: string | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  switchRoleQuickly: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const profile = await api.getMe();
          setUser(profile);
        } catch {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem('token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    localStorage.setItem('token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('active_reservation');
    setToken(null);
    setUser(null);
  };

  // 1-Click Role Switcher for instant evaluator demo
  const switchRoleQuickly = async (role: UserRole) => {
    const credentials: Record<UserRole, { email: string; pass: string }> = {
      ADMIN: { email: 'admin@eventpass.com', pass: 'admin123' },
      ORGANIZER: { email: 'organizer@apextech.com', pass: 'organizer123' },
      ATTENDEE: { email: 'attendee@example.com', pass: 'attendee123' },
    };

    const cred = credentials[role];
    await login(cred.email, cred.pass);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        switchRoleQuickly,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
