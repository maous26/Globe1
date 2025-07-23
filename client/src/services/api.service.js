// client/src/services/api.service.js
import axios from 'axios';
import { getToken, clearToken } from './auth.service';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Unauthorized, clear token and redirect to login
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  registerBasic: (data) => api.post('/auth/register-basic', data),
  registerPremium: (data) => api.post('/auth/register-premium', data),
  login: (data) => api.post('/auth/login', data),
  requestPasswordReset: (email) => api.post('/auth/reset-password-request', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
  getCurrentUser: () => api.get('/auth/me'),
};

// User API
export const userAPI = {
  updateProfile: (data) => api.put('/user/profile', data),
  updatePreferences: (data) => api.put('/user/preferences', data),
  updatePassword: (data) => api.put('/user/password', data),
  deleteAccount: () => api.delete('/user/account'),
};

// Alerts API
export const alertsAPI = {
  getAlerts: (page = 1, limit = 10) => api.get(`/alerts?page=${page}&limit=${limit}`),
  getAlertById: (id) => api.get(`/alerts/${id}`),
  markAlertClicked: (id) => api.put(`/alerts/${id}/clicked`),
  getAlternativeDates: (id) => api.get(`/alerts/${id}/alternative-dates`),
  getAlertStats: () => api.get('/alerts/stats'),
};

// Payment API (for premium subscription)
export const paymentAPI = {
  createSubscription: () => api.post('/payment/subscription'),
  cancelSubscription: () => api.delete('/payment/subscription'),
  getSubscriptionStatus: () => api.get('/payment/subscription'),
  getPaymentMethods: () => api.get('/payment/methods'),
  addPaymentMethod: (data) => api.post('/payment/methods', data),
  removePaymentMethod: (id) => api.delete(`/payment/methods/${id}`),
};

// Admin API
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  getUsers: (page = 1, limit = 10, search = '', subscriptionType = '') => 
    api.get(`/admin/users?page=${page}&limit=${limit}&search=${search}&subscriptionType=${subscriptionType}`),
  getUserDetails: (id) => api.get(`/admin/users/${id}`),
  updateUserSubscription: (id, subscriptionType) => 
    api.put(`/admin/users/${id}/subscription`, { subscriptionType }),
  
  getRoutes: (page = 1, limit = 20, search = '', tier = '', isActive = '', isSeasonal = '') => 
    api.get(`/admin/routes?page=${page}&limit=${limit}&search=${search}&tier=${tier}&isActive=${isActive}&isSeasonal=${isSeasonal}`),
  createRoute: (data) => api.post('/admin/routes', data),
  updateRoute: (id, data) => api.put(`/admin/routes/${id}`, data),
  deleteRoute: (id) => api.delete(`/admin/routes/${id}`),
  runRouteOptimization: (isFullOptimization = false) => 
    api.post('/admin/routes/optimize', { isFullOptimization }),
  
  getApiStats: (startDate = '', endDate = '') => 
    api.get(`/admin/api-stats?startDate=${startDate}&endDate=${endDate}`),
  
  getAlerts: (page = 1, limit = 20, search = '', status = '', minDiscount = '') => 
    api.get(`/admin/alerts?page=${page}&limit=${limit}&search=${search}&status=${status}&minDiscount=${minDiscount}`),
};

export default api;