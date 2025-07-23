// client/src/pages/dashboard/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { alertsAPI } from '../../services/api.service';
import { useAuth } from '../../contexts/AuthContext';
import OnboardingFlow from '../../components/onboarding/OnboardingFlow';

// Import icons
import { 
  BellIcon, 
  CurrencyEuroIcon, 
  ClockIcon, 
  CalendarIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user, isPremium } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    clicked: 0,
    expired: 0,
    totalPotentialSavings: 0,
    popularDestinations: [],
    alertsByMonth: []
  });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user needs onboarding
    if (user?.needsOnboarding || (isPremium && !user?.firstName)) {
      setShowOnboarding(true);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get user alert statistics
        const statsResponse = await alertsAPI.getAlertStats();
        setStats({
          ...statsResponse.data,
          popularDestinations: Array.isArray(statsResponse.data.popularDestinations)
            ? statsResponse.data.popularDestinations
            : [],
        });
        
        // Get recent alerts
        const alertsResponse = await alertsAPI.getAlerts(1, 5);
        setRecentAlerts(alertsResponse.data.alerts);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, isPremium]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Update user state to remove needsOnboarding flag
    if (user) {
      const updatedUser = { ...user };
      delete updatedUser.needsOnboarding;
      // This would be updated via the updateProfile function in the onboarding component
    }
  };

  // Show onboarding if needed
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} existingUser={user} />;
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Sécurisation des tableaux pour le rendu
  const safeRecentAlerts = Array.isArray(recentAlerts) ? recentAlerts : [];
  const safePopularDestinations = Array.isArray(stats.popularDestinations) ? stats.popularDestinations : [];

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Bienvenue, {user?.firstName || user?.email?.split('@')[0] || 'Voyageur'} !
      </h1>
      
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 p-2 bg-gray-100 text-xs rounded">
          <p>Debug - User subscription: {user?.subscriptionType}</p>
          <p>Debug - isPremium: {isPremium ? 'true' : 'false'}</p>
        </div>
      )}
      
      {/* Upgrade banner for free users */}
      {!isPremium && (
        <div className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium">Passez à Premium pour des offres exceptionnelles !</h3>
              <div className="mt-2 text-sm text-blue-100">
                <p>Vous n'avez accès qu'à 3 alertes par jour et à des réductions entre 30% et 50%.</p>
                <p className="mt-1">Avec Premium, débloquez un nombre illimité d'alertes et des réductions jusqu'à 90% !</p>
              </div>
              <div className="mt-4">
                <Link
                  to="/upgrade"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-purple-700 bg-white hover:bg-gray-100"
                >
                  Passer à Premium pour 4,99€/mois
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Stats cards */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total alerts */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BellIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total d'alertes</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{stats.total}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link to="/dashboard/alerts" className="font-medium text-blue-700 hover:text-blue-900">
                Voir toutes les alertes
              </Link>
            </div>
          </div>
        </div>

        {/* Potential savings */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyEuroIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Économies potentielles</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{formatCurrency(stats.totalPotentialSavings)}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="font-medium text-gray-500">
                Sur toutes vos alertes
              </span>
            </div>
          </div>
        </div>

        {/* Recent alerts */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Alertes récentes</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{stats.recent || 0}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="font-medium text-gray-500">
                Cette semaine
              </span>
            </div>
          </div>
        </div>

        {/* Active alerts */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Alertes actives</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {stats.total - stats.expired}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <span className="font-medium text-gray-500">
                {stats.expired} alertes expirées
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent alerts */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Alertes récentes</h3>
          </div>
          {safeRecentAlerts.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {safeRecentAlerts.map((alert) => (
                <li key={alert._id}>
                  <Link to={`/dashboard/alerts/${alert._id}`} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex min-w-0 flex-1 items-center">
                            <div className="min-w-0 flex-1 px-4">
                              <div>
                                <p className="truncate text-sm font-medium text-blue-600">
                                  {alert.departureAirport.code} → {alert.destinationAirport.code}
                                </p>
                                <p className="mt-1 flex items-center text-sm text-gray-500">
                                  <CurrencyEuroIcon className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                                  <span className="truncate font-semibold">{formatCurrency(alert.price)}</span>
                                  <span className="ml-1 text-red-500 line-through text-xs">{formatCurrency(alert.originalPrice)}</span>
                                  <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                                    -{alert.discountPercentage}%
                                  </span>
                                </p>
                                <p className="mt-1 flex items-center text-sm text-gray-500">
                                  <CalendarIcon className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                                  {formatDate(alert.outboundDate)} - {formatDate(alert.returnDate)} ({alert.duration} jours)
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-10 text-center">
              <p className="text-gray-500">Aucune alerte pour le moment</p>
            </div>
          )}
          <div className="bg-gray-50 px-4 py-4 sm:px-6 rounded-b-lg">
            <div className="text-sm">
              <Link to="/dashboard/alerts" className="font-medium text-blue-700 hover:text-blue-900">
                Voir toutes les alertes
              </Link>
            </div>
          </div>
        </div>

        {/* Popular destinations */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Destinations populaires</h3>
          </div>
          {safePopularDestinations.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {safePopularDestinations.map((destination) => (
                <li key={destination._id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <MapPinIcon className="h-5 w-5 text-gray-400" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{destination.name}</p>
                        <p className="text-sm text-gray-500">{destination._id}</p>
                      </div>
                    </div>
                    <div>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {destination.count} alerte{destination.count > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-10 text-center">
              <p className="text-gray-500">Aucune destination pour le moment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;