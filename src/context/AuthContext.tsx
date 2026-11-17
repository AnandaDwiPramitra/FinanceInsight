import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  ensureDemoUserExists,
  getCurrentUser,
  getStoredTheme,
  getUsers,
  saveStoredTheme,
  seedUserFinanceData,
  setCurrentUser,
} from '../services/storageService';
import { supabaseLogout, supabaseLogin, supabaseRegister } from '../services/supabaseService';
import { User } from '../types/finance';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginDemo: () => Promise<{ ok: boolean; error?: string }>;
  register: (params: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (params: {
    name: string;
    email: string;
    newPassword?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getStoredTheme());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveStoredTheme(theme);
  }, [theme]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await ensureDemoUserExists();
      const storedUser = getCurrentUser();
      if (mounted) {
        if (storedUser) {
          const allUsers = getUsers();
          const verified = allUsers.find((u) => u.id === storedUser.id) || storedUser;
          if (verified) {
            setUser(verified);
            seedUserFinanceData(verified.id, Boolean(verified.isDemo));
          } else {
            setCurrentUser(null);
          }
        }
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await supabaseLogin(email, password);
    if (!res.ok || !res.user) {
      return { ok: false, error: res.error || 'Gagal login.' };
    }

    seedUserFinanceData(res.user.id, Boolean(res.user.isDemo));
    setUser(res.user);
    return { ok: true };
  }, []);

  const loginDemo = useCallback(async () => {
    const users = await ensureDemoUserExists();
    const demo = users.find((u) => u.isDemo) || users[0];
    if (!demo) return { ok: false, error: 'Akun demo tidak ditemukan.' };
    setCurrentUser(demo);
    seedUserFinanceData(demo.id, true);
    setUser(demo);
    return { ok: true };
  }, []);

  const register = useCallback(
    async (params: { name: string; email: string; password: string }) => {
      const res = await supabaseRegister(params);
      if (!res.ok || !res.user) {
        return { ok: false, error: res.error || 'Gagal mendaftar.' };
      }

      seedUserFinanceData(res.user.id, false);
      setUser(res.user);
      return { ok: true };
    },
    []
  );

  const logout = useCallback(async () => {
    await supabaseLogout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (params: { name: string; email: string; newPassword?: string }) => {
      if (!user) return { ok: false, error: 'Tidak ada sesi aktif.' };
      const name = params.name.trim();
      const email = params.email.trim().toLowerCase();
      if (!name) return { ok: false, error: 'Nama tidak boleh kosong.' };
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, error: 'Format email tidak valid.' };
      }

      const updatedUser: User = {
        ...user,
        name,
        email,
      };

      setCurrentUser(updatedUser);
      setUser(updatedUser);
      return { ok: true };
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        theme,
        toggleTheme,
        login,
        loginDemo,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
