// client/src/components/routing/AdminRoute.js
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AdminRoute = () => {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();

  console.log('🔒 AdminRoute check:', { 
    isAuthenticated, 
    isAdmin, 
    loading, 
    userEmail: user?.email,
    userIsAdmin: user?.isAdmin 
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;