// client/src/pages/dashboard/AlertsList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { alertsAPI } from '../../services/api.service';

// Import icons
import { 
  BellIcon, 
  CurrencyEuroIcon, 
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

const AlertsList = () => {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    minDiscount: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [pagination.page, filters.status, filters.minDiscount, filters.search]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      
      // Construct query params
      const params = new URLSearchParams();
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);
      
      if (filters.status) params.append('status', filters.status);
      if (filters.minDiscount) params.append('minDiscount', filters.minDiscount);
      if (filters.search) params.append('search', filters.search);
      
      const response = await alertsAPI.getAlerts(pagination.page, pagination.limit);
      
      // Ensure we have alerts array
      setAlerts(response.data?.alerts || []);
      
      // Ensure pagination object is properly set with defaults
      const responsePagination = response.data?.pagination;
      setPagination({
        total: responsePagination?.total || 0,
        page: responsePagination?.page || 1,
        limit: responsePagination?.limit || 10,
        pages: responsePagination?.pages || 0
      });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      // Set empty state on error
      setAlerts([]);
      setPagination({
        total: 0,
        page: 1,
        limit: 10,
        pages: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage && newPage > 0 && newPage <= (pagination?.pages || 1)) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
    setPagination({ ...pagination, page: 1 }); // Reset to first page on filter change
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchAlerts();
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      minDiscount: '',
      search: ''
    });
  };

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

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'clicked':
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            <CheckCircleIcon className="mr-1 h-3 w-3" />
            Consultée
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
            <ClockIcon className="mr-1 h-3 w-3" />
            Expirée
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            <BellIcon className="mr-1 h-3 w-3" />
            Envoyée
          </span>
        );
    }
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Mes alertes</h1>
        <button
          type="button"
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          onClick={() => setShowFilters(!showFilters)}
        >
          <AdjustmentsHorizontalIcon className="-ml-1 mr-1 h-5 w-5 text-gray-500" />
          Filtres
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mt-4 bg-white shadow rounded-lg p-4">
          <form onSubmit={handleFilterSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                  Rechercher
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="search"
                    id="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Destination, compagnie..."
                  />
                </div>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Statut
                </label>
                <div className="mt-1">
                  <select
                    name="status"
                    id="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="">Tous</option>
                    <option value="sent">Envoyée</option>
                    <option value="clicked">Consultée</option>
                    <option value="expired">Expirée</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="minDiscount" className="block text-sm font-medium text-gray-700">
                  Réduction minimum
                </label>
                <div className="mt-1">
                  <select
                    name="minDiscount"
                    id="minDiscount"
                    value={filters.minDiscount}
                    onChange={handleFilterChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="">Toutes</option>
                    <option value="30">30%</option>
                    <option value="40">40%</option>
                    <option value="50">50%</option>
                    <option value="60">60%</option>
                    <option value="70">70%</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={resetFilters}
                className="mr-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Réinitialiser
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Appliquer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts list */}
      <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
        {alerts.length > 0 ? (
          <>
            <ul className="divide-y divide-gray-200">
              {alerts.map((alert) => (
                <li key={alert._id}>
                  <Link to={`/dashboard/alerts/${alert._id}`} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex min-w-0 flex-1 items-center">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="truncate text-sm font-medium text-blue-600">
                                  {alert.departureAirport.code} → {alert.destinationAirport.code}
                                </p>
                                {getStatusBadge(alert.status)}
                              </div>
                              <div className="mt-2 sm:flex sm:justify-between">
                                <div className="sm:flex">
                                  <p className="flex items-center text-sm text-gray-500">
                                    <CurrencyEuroIcon className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                                    <span className="font-semibold">{formatCurrency(alert.price)}</span>
                                    <span className="ml-1 text-red-500 line-through text-xs">{formatCurrency(alert.originalPrice)}</span>
                                    <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                                      -{alert.discountPercentage}%
                                    </span>
                                  </p>
                                  <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                    <CalendarIcon className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                                    {formatDate(alert.outboundDate)} - {formatDate(alert.returnDate)}
                                    <span className="ml-1 text-xs text-gray-500">({alert.duration} jours)</span>
                                  </p>
                                </div>
                                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                  <p>{alert.airline}</p>
                                </div>
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

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Affichage de <span className="font-medium">{((pagination.page || 1) - 1) * (pagination.limit || 10) + 1}</span> à{' '}
                      <span className="font-medium">
                        {Math.min((pagination.page || 1) * (pagination.limit || 10), pagination.total || 0)}
                      </span>{' '}
                      sur <span className="font-medium">{pagination.total || 0}</span> résultats
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange((pagination.page || 1) - 1)}
                        disabled={(pagination.page || 1) === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                          (pagination.page || 1) === 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Précédent</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: pagination.pages || 1 }, (_, i) => i + 1)
                        .filter(page => {
                          // Show current page, first page, last page, and pages around current page
                          const currentPage = pagination.page || 1;
                          const totalPages = pagination.pages || 1;
                          return (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          );
                        })
                        .map((page, i, array) => {
                          // Add ellipsis where needed
                          const prevPage = array[i - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;
                          
                          return (
                            <React.Fragment key={page}>
                              {showEllipsis && (
                                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                  ...
                                </span>
                              )}
                              <button
                                onClick={() => handlePageChange(page)}
                                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                                  (pagination.page || 1) === page
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        })}
                      
                      <button
                        onClick={() => handlePageChange((pagination.page || 1) + 1)}
                        disabled={(pagination.page || 1) === (pagination.pages || 1)}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          (pagination.page || 1) === (pagination.pages || 1)
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Suivant</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-10 text-center">
            <ExclamationCircleIcon className="mx-auto h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune alerte trouvée</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.status || filters.minDiscount || filters.search
                ? 'Essayez de modifier vos filtres.'
                : 'Vous n\'avez pas encore reçu d\'alertes.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsList;