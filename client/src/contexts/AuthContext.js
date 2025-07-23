// client/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, userAPI } from '../services/api.service';
import { 
  setAuth, 
  getUser, 
  getToken,
  isAuthenticated, 
  isAdmin, 
  isPremium, 
  clearToken, 
  updateUserData 
} from '../services/auth.service';

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      if (isAuthenticated()) {
        try {
          // Get fresh user data from API
          const response = await authAPI.getCurrentUser();
          setUser(response.data.user);
          updateUserData(response.data.user);
        } catch (err) {
          console.error('Error fetching current user:', err);
          // If there's an error, clear token
          clearToken();
          setUser(null);
        }
      } else {
        // Not authenticated
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Register new user (basic/free tier)
  const registerBasic = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.registerBasic(userData);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'inscription');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register premium user
  const registerPremium = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.registerPremium(userData);
      const { token, user } = response.data;
      
      // Set auth data
      setAuth(token, user);
      setUser({...user, needsOnboarding: true}); // Mark user as needing onboarding
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'inscription premium');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.login(credentials);
      const { token, user } = response.data;
      
      // Set auth data
      setAuth(token, user);
      setUser(user);
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants incorrects');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    clearToken();
    setUser(null);
  };

  // Request password reset
  const requestPasswordReset = async (email) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.requestPasswordReset(email);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la demande de réinitialisation');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (token, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.resetPassword(token, newPassword);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la réinitialisation');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update profile
  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await userAPI.updateProfile(profileData);
      const updatedUser = response.data.user;
      if (updatedUser) {
        // Update user in localStorage and state only if valid
        setAuth(getToken(), updatedUser);
        setUser(updatedUser);
      }
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour du profil');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Check if user is admin
  const checkIsAdmin = () => {
    return isAdmin();
  };

  // Check if user has premium subscription
  const checkIsPremium = () => {
    return user && user.subscriptionType === 'premium';
  };

  // Context value
  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: checkIsAdmin(),
    isPremium: checkIsPremium(),
    registerBasic,
    registerPremium,
    login,
    logout,
    requestPasswordReset,
    resetPassword,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;