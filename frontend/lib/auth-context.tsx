'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from './api';
import { User, AuthResponse } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    businessName: string;
    adminName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    try {
      const response = await api.get('/auth/me');
      if (isMounted) {
        setUser(response.data.data.user);
      }
    } catch (error) {
      if (isMounted) {
        localStorage.removeItem('token');
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = checkAuth();
    return () => {
      cleanup?.then((cleanupFn) => cleanupFn?.());
    };
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post<{ success: boolean; data: AuthResponse }>(
        '/auth/login',
        { email, password }
      );
      const { token, user: userData } = response.data.data;

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
      }

      setUser(userData);
      router.push('/dashboard');
    } catch (error) {
      // Re-throw to let component handle the error
      throw error;
    }
  };

  const signup = async (data: {
    businessName: string;
    adminName: string;
    email: string;
    password: string;
  }) => {
    try {
      const response = await api.post<{ success: boolean; data: AuthResponse }>(
        '/auth/signup',
        data
      );
      const { token, user: userData } = response.data.data;

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
      }

      setUser(userData);
      router.push('/dashboard');
    } catch (error) {
      // Re-throw to let component handle the error
      throw error;
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
