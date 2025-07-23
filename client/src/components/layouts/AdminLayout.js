// client/src/components/layouts/AdminLayout.js
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  BarChart3, Users, Plane, Bell, Settings, LogOut, Home, LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const AdminLayout = () => {
  const location = useLocation();
  const { logout } = useAuth();
  
  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: '/admin/users', label: 'Utilisateurs', icon: <Users className="h-5 w-5" /> },
    { path: '/admin/routes', label: 'Routes', icon: <Plane className="h-5 w-5" /> },
    { path: '/admin/alerts', label: 'Alertes', icon: <Bell className="h-5 w-5" /> },
    { path: '/admin/api-stats', label: 'API Stats', icon: <BarChart3 className="h-5 w-5" /> },
  ];
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-blue-800">GlobeGenius Admin</h1>
        </div>
        
        <nav className="mt-4">
          <ul>
            {navItems.map(item => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 ${
                    location.pathname === item.path
                      ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="absolute bottom-0 w-64 border-t">
          <Link 
            to="/" 
            className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50"
          >
            <Home className="h-5 w-5 mr-3" />
            Retour au site
          </Link>
          
          <button 
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-gray-600 hover:bg-gray-50"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Déconnexion
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;