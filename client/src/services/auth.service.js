// client/src/services/auth.service.js
import jwtDecode from 'jwt-decode';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

/**
 * Set authentication data in localStorage
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
  try {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if expired, false otherwise
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const decoded = jwtDecode(token);
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    return true;
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
  localStorage.setItem(USER_KEY, JSON.stringify(userData));
};

/**
 * Check if current user is admin
 * @returns {boolean} - True if user is admin, false otherwise
 */
export const isAdmin = () => {
  const user = getUser();
  return user && user.isAdmin === true;
};

/**
 * Check if current user is premium
 * @returns {boolean} - True if user is premium, false otherwise
 */
export const isPremium = () => {
  const user = getUser();
  return user && user.subscriptionType === 'premium';
};