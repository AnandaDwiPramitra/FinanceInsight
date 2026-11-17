import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  DEMO_USER_EMAIL,
  DEMO_USER_PASSWORD,
  ensureDemoUserExists,
  getCurrentUser,
  getStoredTheme,
  getUsers,
  hashPassword,
  saveStoredTheme,
  saveUsers,
  seedUserFinanceData,
  setCurrentUser,
} from '../services/storageService';
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
  logout: () => void;
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
          const verified = allUsers.find((u) => u.id === storedUser.id);
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
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return { ok: false, error: 'Email dan password wajib diisi.' };
    }

    const users = await ensureDemoUserExists();
    const target = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!target) {
      return { ok: false, error: 'Email belum terdaftar. Silakan register terlebih dahulu.' };
    }

    const inputHash = await hashPassword(password);
    if (inputHash !== target.passwordHash) {
      return { ok: false, error: 'Password salah.' };
    }

    seedUserFinanceData(target.id, Boolean(target.isDemo));
    setCurrentUser(target);
    setUser(target);
    return { ok: true };
  }, []);

  const loginDemo = useCallback(async () => {
    return login(DEMO_USER_EMAIL, DEMO_USER_PASSWORD);
  }, [login]);

  const register = useCallback(
    async (params: { name: string; email: string; password: string }) => {
      const name = params.name.trim();
      const email = params.email.trim().toLowerCase();
      const password = params.password;

      if (!name) return { ok: false, error: 'Nama wajib diisi.' };
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, error: 'Format email tidak valid.' };
      }
      if (password.length < 6) {
        return { ok: false, error: 'Password minimal 6 karakter.' };
      }

      const users = await ensureDemoUserExists();
      if (users.some((u) => u.email.toLowerCase() === email)) {
        return { ok: false, error: 'Email sudah terdaftar. Gunakan email lain.' };
      }

      const passwordHash = await hashPassword(password);
      const newUser: User = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        email,
        passwordHash,
        createdAt: new Date().toISOString(),
        isDemo: false,
      };

      const nextUsers = [...users, newUser];
      saveUsers(nextUsers);
      // User baru mulai dengan akun & target default bersih (0 transaksi agar user terisolasi penuh)
      seedUserFinanceData(newUser.id, false);
      setCurrentUser(newUser);
      setUser(newUser);
      return { ok: true };
    },
    []
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
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

      const users = getUsers();
      const duplicate = users.find((u) => u.email.toLowerCase() === email && u.id !== user.id);
      if (duplicate) {
        return { ok: false, error: 'Email sudah digunakan oleh akun lain.' };
      }

      let nextPasswordHash = user.passwordHash;
      if (params.newPassword && params.newPassword.length > 0) {
        if (params.newPassword.length < 6) {
          return { ok: false, error: 'Password baru minimal 6 karakter.' };
        }
        nextPasswordHash = await hashPassword(params.newPassword);
      }

      const updatedUser: User = {
        ...user,
        name,
        email,
        passwordHash: nextPasswordHash,
      };

      const nextUsers = users.map((u) => (u.id === user.id ? updatedUser : u));
      saveUsers(nextUsers);
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
