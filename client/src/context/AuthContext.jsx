import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('token');

      // Optimistic cache restore for instant UI rendering and offline/mobile resilience
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (_) {}
      }

      // If no session indicators exist, complete initialization immediately
      if (!savedToken && !savedUser) {
        setLoading(false);
        return;
      }

      try {
        const data = await authService.getMe();
        setUser(data.user);
        setProfile(data.profile);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      } catch (err) {
        // ONLY clear session if server explicitly returned 401 Unauthorized
        // Do NOT log the student out on cold starts (502/503/timeout) or network drops
        if (err.response?.status === 401) {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          setUser(null);
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    setUser(data.user);
    setProfile(data.profile);
    return data;
  };

  const register = async (userData) => {
    const data = await authService.register(userData);
    setUser(data.user);
    setProfile(data.profile);
    return data;
  };

  const logout = async () => {
    try {
      // Clear client state immediately so ProtectedRoute redirects without waiting for network
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setProfile(null);
      await authService.logout().catch(() => {});
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const data = await authService.getProfile();
      setProfile(data.profile);
    } catch {}
  };

  const refreshUser = async () => {
    try {
      const data = await authService.getMe();
      setUser(data.user);
      setProfile(data.profile);
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        register,
        logout,
        refreshProfile,
        refreshUser,
        isAuthenticated: !!user,
        isEmailVerified: !!user?.emailVerified
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
