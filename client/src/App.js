// client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Layout components
import DashboardLayout from './components/layouts/DashboardLayout';
import AdminLayout from './components/layouts/AdminLayout'; // Nouveau layout pour l'admin

// Route protection components
import ProtectedRoute from './components/routing/ProtectedRoute';
import AdminRoute from './components/routing/AdminRoute'; // Nouvelle protection pour les routes admin

// Public pages
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import ResetPasswordPage from './pages/public/ResetPasswordPage';

// Dashboard pages
import Dashboard from './pages/dashboard/Dashboard';
import AlertsList from './pages/dashboard/AlertsList';
import AlertDetail from './pages/dashboard/AlertDetail';
import UserProfile from './pages/dashboard/UserProfile';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import RouteManagement from './pages/admin/RouteManagement';
import ApiStats from './pages/admin/ApiStats';
import AlertsManagement from './pages/admin/AlertsManagement';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* Protected dashboard routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              {/* Main dashboard */}
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Alerts */}
              <Route path="/dashboard/alerts" element={<AlertsList />} />
              <Route path="/dashboard/alerts/:id" element={<AlertDetail />} />
              
              {/* User profile */}
              <Route path="/dashboard/profile" element={<UserProfile />} />
            </Route>
          </Route>
          
          {/* Admin routes */}
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/routes" element={<RouteManagement />} />
              <Route path="/admin/api-stats" element={<ApiStats />} />
              <Route path="/admin/alerts" element={<AlertsManagement />} />
            </Route>
          </Route>
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;