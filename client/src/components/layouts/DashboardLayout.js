// client/src/components/layouts/DashboardLayout.js
import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logoGlobeGenius from '../../assets/logo-globegenius.png';

// Import icons
import { 
  HomeIcon, 
  BellAlertIcon, 
  UserIcon, 
  CurrencyEuroIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  GlobeAltIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const DashboardLayout = () => {
  const { user, logout, isAdmin, isPremium } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Navigation items
  const navigation = [
    { name: 'Tableau de bord', href: '/dashboard', icon: HomeIcon },
    { name: 'Mes alertes', href: '/dashboard/alerts', icon: BellAlertIcon },
    { name: 'Mon profil', href: '/dashboard/profile', icon: UserIcon },
  ];

  // Admin navigation items
  const adminNavigation = [
    { name: 'Admin Dashboard', href: '/admin', icon: ChartBarIcon },
    { name: 'Utilisateurs', href: '/admin/users', icon: UserIcon },
    { name: 'Routes', href: '/admin/routes', icon: GlobeAltIcon },
    { name: 'Statistiques API', href: '/admin/api-stats', icon: ChartBarIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 flex md:hidden ${sidebarOpen ? 'visible' : 'invisible'}`}>
        {/* Overlay */}
        <div 
          className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity duration-300 ease-linear ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar */}
        <div className={`relative flex w-full max-w-xs flex-1 flex-col bg-white transition duration-300 ease-in-out transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Close button */}
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Fermer la sidebar</span>
              <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Sidebar content */}
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <Link to="/" className="flex items-center">
                <img src={logoGlobeGenius} alt="GlobeGenius Logo" className="h-8 w-auto" />
                <span className="ml-2 text-xl font-bold text-blue-600">GlobeGenius</span>
              </Link>
            </div>
            <div className="mt-5 flex flex-1 flex-col">
              <nav className="flex-1 space-y-1 px-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      location.pathname === item.href
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center rounded-md px-2 py-2 text-base font-medium`}
                  >
                    <item.icon
                      className={`${
                        location.pathname === item.href ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                      } mr-4 h-6 w-6`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                ))}

                {/* Admin navigation */}
                {isAdmin && (
                  <div className="mt-8">
                    <h3 className="px-3 text-sm font-medium text-gray-500">Administration</h3>
                    <div className="mt-1">
                      {adminNavigation.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`${
                            location.pathname === item.href
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          } group flex items-center rounded-md px-2 py-2 text-base font-medium`}
                        >
                          <item.icon
                            className={`${
                              location.pathname === item.href ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                            } mr-4 h-6 w-6`}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </nav>
            </div>
          </div>

          {/* User info */}
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div>
                <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {user?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-base font-medium text-gray-700 group-hover:text-gray-900">
                  {user?.firstName || 'Utilisateur'}
                </p>
                <div className="flex items-center">
                  {isPremium ? (
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                      Premium
                    </span>
                  ) : (
                    <Link to="/upgrade" className="text-xs font-medium text-blue-600 hover:text-blue-500">
                      Passer à Premium
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <Link to="/" className="flex items-center">
                <img src={logoGlobeGenius} alt="GlobeGenius Logo" className="h-8 w-auto" />
                <span className="ml-2 text-xl font-bold text-blue-600">GlobeGenius</span>
              </Link>
            </div>
            <div className="mt-5 flex flex-1 flex-col">
              <nav className="flex-1 space-y-1 px-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      location.pathname === item.href
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center rounded-md px-2 py-2 text-sm font-medium`}
                  >
                    <item.icon
                      className={`${
                        location.pathname === item.href ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                      } mr-3 h-5 w-5`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                ))}

                {/* Admin navigation */}
                {isAdmin && (
                  <div className="mt-8">
                    <h3 className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Administration</h3>
                    <div className="mt-1">
                      {adminNavigation.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`${
                            location.pathname === item.href
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          } group flex items-center rounded-md px-2 py-2 text-sm font-medium`}
                        >
                          <item.icon
                            className={`${
                              location.pathname === item.href ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                            } mr-3 h-5 w-5`}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </nav>
            </div>
          </div>

          {/* User info */}
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div>
                <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {user?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {user?.firstName || 'Utilisateur'}
                </p>
                <div className="flex items-center">
                  {isPremium ? (
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                      Premium
                    </span>
                  ) : (
                    <Link to="/upgrade" className="text-xs font-medium text-blue-600 hover:text-blue-500">
                      Passer à Premium
                    </Link>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="ml-auto flex-shrink-0 rounded-full p-1 text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Se déconnecter</span>
                <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="md:pl-64">
        <div className="mx-auto flex flex-col">
          {/* Mobile header */}
          <div className="sticky top-0 z-10 bg-white pl-1 pt-1 sm:pl-3 sm:pt-3 md:hidden">
            <button
              type="button"
              className="-ml-0.5 -mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Ouvrir la sidebar</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <main className="flex-1">
            <div className="py-6">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
                {/* Premium badge */}
                {isPremium && (
                  <div className="mb-4 inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800">
                    <ShieldCheckIcon className="mr-1.5 h-4 w-4 text-purple-600" />
                    Compte Premium
                  </div>
                )}
                
                {/* Page content */}
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;