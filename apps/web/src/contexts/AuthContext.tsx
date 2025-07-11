'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { User, Organization } from '@repo/shared';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithFacebook: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configure axios defaults
axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
axios.defaults.withCredentials = true;

// Add token to all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 responses
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get('/api/auth/me');
      if (response.data.success) {
        setUser(response.data.data.user);
        setOrganization(response.data.data.organization);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Handle Facebook callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      localStorage.setItem('token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
      refreshUser();
      router.push('/dashboard');
    }
  }, [refreshUser, router]);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      if (response.data.success) {
        const { token, user, organization } = response.data.data;
        localStorage.setItem('token', token);
        setUser(user);
        setOrganization(organization);
        router.push('/dashboard');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Login failed');
    }
  };

  const loginWithFacebook = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/facebook`;
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setOrganization(null);
      router.push('/');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        loading,
        login,
        loginWithFacebook,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};