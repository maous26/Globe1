// client/src/components/routing/AdminRoute.js
import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AdminRoute = () => {
  const { user, loading, isAuthenticated, isAdmin } = useAuth();
  
  // Si authentification en cours, afficher un indicateur de chargement
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Vérifier si l'utilisateur est connecté et est admin
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
};

export default AdminRoute;