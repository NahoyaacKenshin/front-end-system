'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        return;
      }

      // Get current user data to compare
      const storedUser = localStorage.getItem('user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      const currentRole = currentUser?.role;

      // Fetch fresh user data from the API
      const response = await api.getCurrentUser();
      if (response.status === 'success' && response.data) {
        const userData = response.data;
        const newRole = userData.role;

        // Only update if role has changed
        if (currentRole && newRole && currentRole !== newRole) {
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
          console.log(`User role changed from ${currentRole} to ${newRole}`);
        } else if (!currentUser) {
          // If no current user, always set it
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
        }
        // If role hasn't changed, don't update (no unnecessary re-renders)
      } else {
        // If API call fails, fall back to stored user
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
  }, []);

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

    // Check role when page becomes visible (user switches back to tab)
    // This helps catch role changes that happened while user was away
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && localStorage.getItem('accessToken')) {
        // Throttle: only check if last check was more than 30 seconds ago
        const lastCheck = localStorage.getItem('lastRoleCheck');
        const now = Date.now();
        if (!lastCheck || now - parseInt(lastCheck) > 30000) {
          refreshUser();
          localStorage.setItem('lastRoleCheck', now.toString());
        }
      }
    };

    // Listen for role check events from API interceptor
    // This triggers when user makes API calls, helping catch role changes after admin approval
    const handleRoleCheck = () => {
      if (localStorage.getItem('accessToken')) {
        refreshUser();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('checkUserRole', handleRoleCheck);

    return () => {
      clearInterval(tokenRefreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('checkUserRole', handleRoleCheck);
    };
  }, [refreshUser]);

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

