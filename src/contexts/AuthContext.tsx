'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import type { User, AuthTokens } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setAuthData: (tokens: AuthTokens, userData: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Utility function to decode JWT and get expiration
const getTokenExpiration = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
  } catch {
    return null;
  }
};

// Check if token is expired or will expire soon (within 2 minutes)
const isTokenExpiringSoon = (token: string | null): boolean => {
  if (!token) return true;
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;
  const twoMinutesFromNow = Date.now() + 2 * 60 * 1000; // 2 minutes buffer
  return expiration <= twoMinutesFromNow;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Proactive token refresh function
  const refreshTokenIfNeeded = async (): Promise<boolean> => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        return false;
      }

      // Check if access token is expiring soon
      if (isTokenExpiringSoon(accessToken)) {
        const response = await api.refreshToken(refreshToken);
        
        if (response.status === 'success' && response.data?.tokens) {
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.tokens;
          localStorage.setItem('accessToken', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
          return true;
        }
      }
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // If refresh fails, clear tokens but don't redirect immediately
      // Let the interceptor handle it on the next API call
      return false;
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const accessToken = localStorage.getItem('accessToken');

        if (storedUser && accessToken) {
          // Check if token needs refresh on load
          await refreshTokenIfNeeded();
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error loading user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();

    // Set up interval to check and refresh token every 5 minutes
    const tokenRefreshInterval = setInterval(async () => {
      if (localStorage.getItem('accessToken')) {
        await refreshTokenIfNeeded();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Set up interval to refresh user data every 2 minutes to catch role changes
    const userRefreshInterval = setInterval(async () => {
      if (localStorage.getItem('accessToken')) {
        await refreshUser();
      }
    }, 2 * 60 * 1000); // Check every 2 minutes

    return () => {
      clearInterval(tokenRefreshInterval);
      clearInterval(userRefreshInterval);
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const response = await api.login(email, password);
    if (response.status === 'success' && response.data) {
      const { tokens, user: userData } = response.data;
      setAuthData(tokens, userData);
    } else {
      throw new Error(response.message || 'Login failed');
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<void> => {
    const response = await api.signup(name, email, password);
    if (response.status === 'success') {
      // User needs to verify email before logging in
      return;
    } else {
      throw new Error(response.message || 'Signup failed');
    }
  };

  const logout = (): void => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const setAuthData = (tokens: AuthTokens, userData: User): void => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        return;
      }

      // Fetch fresh user data from the API
      const response = await api.getCurrentUser();
      if (response.status === 'success' && response.data) {
        const userData = response.data;
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      } else {
        // If API call fails, fall back to stored user
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      // If API call fails, fall back to stored user
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        setAuthData,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

