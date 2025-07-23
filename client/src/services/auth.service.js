// client/src/services/auth.service.js
import jwtDecode from 'jwt-decode';

// Token storage keys
const TOKEN_KEY = 'globegenius_token';
const USER_KEY = 'globegenius_user';

/**
 * Set authentication token and user data
 * @param {string} token - JWT token
 * @param {Object} user - User data
 */
export const setAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Get authentication token
 * @returns {string|null} - JWT token or null if not logged in
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Get current user data
 * @returns {Object|null} - User data or null if not logged in
 */
export const getUser = () => {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr || userStr === 'undefined') return null;
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 * @returns {boolean} - True if authenticated, false otherwise
 */
export const isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;
  
  try {
    // Decode token to check expiration
    const decoded = jwtDecode(token);
    
    // Check if token is expired
    if (decoded.exp * 1000 < Date.now()) {
      clearToken();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Invalid token:', error);
    clearToken();
    return false;
  }
};

/**
 * Check if user is admin
 * @returns {boolean} - True if admin, false otherwise
 */
export const isAdmin = () => {
  const user = getUser();
  return user && user.isAdmin === true;
};

/**
 * Check if user has premium subscription
 * @returns {boolean} - True if premium, false otherwise
 */
export const isPremium = () => {
  const user = getUser();
  return user && user.subscriptionType === 'premium';
};

/**
 * Clear authentication data (logout)
 */
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * Update stored user data
 * @param {Object} userData - Updated user data
 */
export const updateUserData = (userData) => {
  const currentUser = getUser();
  if (!currentUser) return;
  
  const updatedUser = {
    ...currentUser,
    ...userData
  };
  
  localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
};

export default {
  setAuth,
  getToken,
  getUser,
  isAuthenticated,
  isAdmin,
  isPremium,
  clearToken,
  updateUserData
};