import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      setIsLoading(true);
      // EARS[Event]: WHEN refreshing user THEN fetch profile from API
      const response = await api.get('/users/me');
      if (response.data && response.data.data) {
        setUser(response.data.data);
        setIsAuthenticated(true);
      }
    } catch (error) {
      // EARS[Unwanted]: IF fetch profile fails THEN set user to null
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // EARS[State-driven]: WHEN provider mounts THEN attempt to load user profile
    refreshUser();
  }, []);

  const login = async (credentials) => {
    try {
      // EARS[Event]: WHEN user submits login credentials THEN call login API
      const response = await api.post('/auth/login', credentials);
      if (response.data && response.data.data) {
        setUser(response.data.data);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: { message: 'Invalid response format' } };
    } catch (error) {
      // EARS[Unwanted]: IF login API fails THEN return error details
      return {
        success: false,
        error: error.response?.data?.error || { message: 'Đăng nhập thất bại, vui lòng thử lại sau.' }
      };
    }
  };

  const logout = async () => {
    try {
      // EARS[Event]: WHEN user logs out THEN call logout API and clear local state
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors on the API side, still clear local state
      console.error('Logout failed on server', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
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
