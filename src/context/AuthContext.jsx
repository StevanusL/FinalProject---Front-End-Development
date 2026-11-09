import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { makeId } from '../utils/ids';

const AuthContext = createContext(null);
const STORAGE_KEY = 'paketku_user';

function stripPassword(user) {
  if (!user) return null;
  const { password: _password, ...rest } = user;
  return rest;
}

function readStored() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStored);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* penyimpanan browser tidak tersedia */
    }
  }, [user]);

  const refreshSettings = useCallback(async () => {
    try {
      setSettings(await api.getSettings());
    } catch {
      setSettings(null);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const login = useCallback(async (identifier, password) => {
    const users = await api.list('users');
    const id = identifier.trim().toLowerCase();
    const found = users.find(
      (u) => (u.email.toLowerCase() === id || String(u.idNumber).toLowerCase() === id) && u.password === password,
    );
    if (!found) throw new Error('Email/NIM/NIP atau kata sandi salah.');
    setUser(stripPassword(found));
    return found;
  }, []);

  const register = useCallback(async (data) => {
    const users = await api.list('users');
    if (users.some((u) => u.email.toLowerCase() === data.email.trim().toLowerCase())) {
      throw new Error('Email ini sudah terdaftar. Silakan masuk.');
    }
    if (users.some((u) => String(u.idNumber) === data.idNumber.trim())) {
      throw new Error('NIM/NIP ini sudah terdaftar.');
    }
    const created = await api.create('users', {
      id: makeId('u'),
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      role: 'user',
      category: data.category,
      idNumber: data.idNumber.trim(),
      phone: data.phone.trim(),
      unit: data.unit.trim(),
      createdAt: new Date().toISOString(),
    });
    setUser(stripPassword(created));
    return created;
  }, []);

  const updateProfile = useCallback(
    async (patch) => {
      const updated = await api.update('users', user.id, patch);
      setUser(stripPassword(updated));
      return updated;
    },
    [user],
  );

  const logout = useCallback(() => setUser(null), []);

  const value = useMemo(
    () => ({ user, settings, refreshSettings, login, register, updateProfile, logout }),
    [user, settings, refreshSettings, login, register, updateProfile, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
