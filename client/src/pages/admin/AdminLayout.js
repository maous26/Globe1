// client/src/pages/admin/AdminLayout.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, Users, Plane, Bell, Settings, LogOut, Home 
} from 'lucide-react';

const AdminLayout = ({ children }) => {
  const location = useLocation();
  
  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: <Home /> },
    { path: '/admin/users', label: 'Utilisateurs', icon: <Users /> },
    { path: '/admin/routes', label: 'Routes', icon: <Plane /> },
    { path: '/admin/alerts', label: 'Alertes', icon: <Bell /> },
    { path: '/admin/api-stats', label: 'API Stats', icon: <BarChart3 /> },
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
      </div>
      
      {/* Main content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;