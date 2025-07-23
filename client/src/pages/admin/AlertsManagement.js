import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Calendar, ChevronLeft, ChevronRight, Bell, User, Plane, ArrowRight, ExternalLink, Filter, Check, X } from 'lucide-react';

const AlertsManagement = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: ''
  });
  const [stats, setStats] = useState({
    byStatus: [],
    byAirline: []
  });

  useEffect(() => {
    fetchAlerts();
  }, [pagination.page, filters]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query string
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm
      });
      
      if (filters.status) {
        queryParams.append('status', filters.status);
      }
      
      if (filters.startDate) {
        queryParams.append('startDate', filters.startDate);
      }
      
      if (filters.endDate) {
        queryParams.append('endDate', filters.endDate);
      }
      
      // In a real app, this would be an actual API call
      const response = await fetch(`/api/admin/alerts?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des alertes');
      }
      
      const data = await response.json();
      setAlerts(data.alerts);
      setPagination({
        ...pagination,
        page: data.pagination.page,
        total: data.pagination.total,
        pages: data.pagination.pages
      });
      setStats(data.stats);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination({ ...pagination, page: 1 });
    fetchAlerts();
  };

  const handleFilterChange = (filter, value) => {
    setFilters({ ...filters, [filter]: value });
    setPagination({ ...pagination, page: 1 });
  };

  // Mock data for development - would be replaced with actual API data
  const mockAlerts = [
    { _id: '1', user: { email: 'john.doe@example.com', firstName: 'John', subscriptionType: 'premium' }, departureAirport: { code: 'CDG', name: 'Paris Charles de Gaulle' }, destinationAirport: { code: 'JFK', name: 'New York JFK' }, price: 420, originalPrice: 650, discountPercentage: 35, discountAmount: 230, airline: 'Air France', farePolicy: 'Standard', stops: 0, outboundDate: '2025-09-15T00:00:00.000Z', returnDate: '2025-09-22T00:00:00.000Z', duration: 7, bookingLink: 'https://www.skyscanner.fr/transport/vols/cdg/jfk/250915/250922/', status: 'sent', createdAt: '2025-07-15T10:30:00.000Z' },
    { _id: '2', user: { email: 'jane.smith@example.com', firstName: 'Jane', subscriptionType: 'free' }, departureAirport: { code: 'CDG', name: 'Paris Charles de Gaulle' }, destinationAirport: { code: 'LHR', name: 'London Heathrow' }, price: 120, originalPrice: 180, discountPercentage: 33, discountAmount: 60, airline: 'British Airways', farePolicy: 'Standard', stops: 0, outboundDate: '2025-08-20T00:00:00.000Z', returnDate: '2025-08-25T00:00:00.000Z', duration: 5, bookingLink: 'https://www.skyscanner.fr/transport/vols/cdg/lhr/250820/250825/', status: 'clicked', createdAt: '2025-07-16T14:15:00.000Z' },
    { _id: '3', user: { email: 'robert.johnson@example.com', firstName: 'Robert', subscriptionType: 'premium' }, departureAirport: { code: 'LYS', name: 'Lyon Saint-Exupéry' }, destinationAirport: { code: 'BCN', name: 'Barcelona' }, price: 95, originalPrice: 150, discountPercentage: 37, discountAmount: 55, airline: 'Vueling', farePolicy: 'Standard', stops: 0, outboundDate: '2025-09-05T00:00:00.000Z', returnDate: '2025-09-09T00:00:00.000Z', duration: 4, bookingLink: 'https://www.skyscanner.fr/transport/vols/lys/bcn/250905/250909/', status: 'sent', createdAt: '2025-07-17T09:00:00.000Z' },
    { _id: '4', user: { email: 'susan.williams@example.com', firstName: null, subscriptionType: 'free' }, departureAirport: { code: 'NCE', name: 'Nice Côte d\'Azur' }, destinationAirport: { code: 'LHR', name: 'London Heathrow' }, price: 150, originalPrice: 220, discountPercentage: 32, discountAmount: 70, airline: 'EasyJet', farePolicy: 'Standard', stops: 0, outboundDate: '2025-08-25T00:00:00.000Z', returnDate: '2025-08-30T00:00:00.000Z', duration: 5, bookingLink: 'https://www.skyscanner.fr/transport/vols/nce/lhr/250825/250830/', status: 'expired', createdAt: '2025-07-18T16:45:00.000Z' },
    { _id: '5', user: { email: 'michael.brown@example.com', firstName: 'Michael', subscriptionType: 'premium' }, departureAirport: { code: 'CDG', name: 'Paris Charles de Gaulle' }, destinationAirport: { code: 'DXB', name: 'Dubai International' }, price: 520, originalPrice: 850, discountPercentage: 39, discountAmount: 330, airline: 'Emirates', farePolicy: 'Standard', stops: 0, outboundDate: '2025-10-10T00:00:00.000Z', returnDate: '2025-10-20T00:00:00.000Z', duration: 10, bookingLink: 'https://www.skyscanner.fr/transport/vols/cdg/dxb/251010/251020/', status: 'clicked', createdAt: '2025-07-19T11:20:00.000Z' }
  ];

  // Mock stats for development
  const mockStats = {
    byStatus: [
      { _id: 'sent', count: 320 },
      { _id: 'clicked', count: 145 },
      { _id: 'expired', count: 89 }
    ],
    byAirline: [
      { _id: 'Air France', count: 156, avgDiscount: 32.5 },
      { _id: 'EasyJet', count: 98, avgDiscount: 35.2 },
      { _id: 'Ryanair', count: 87, avgDiscount: 40.1 },
      { _id: 'British Airways', count: 65, avgDiscount: 28.7 },
      { _id: 'Lufthansa', count: 52, avgDiscount: 30.2 }
    ]
  };

  // Use mock data if alerts are empty and not loading
  const displayAlerts = alerts.length > 0 ? alerts : (loading ? [] : mockAlerts);

  // Use mock stats if stats are empty
  const displayStats = stats.byStatus.length > 0 ? stats : mockStats;

  // Format date to readable format
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Format flight date (without time)
  const formatFlightDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  // Get status color class
  const getStatusColorClass = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'clicked':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Historique des alertes</h1>
          <p className="text-gray-600">Suivi des alertes envoyées aux utilisateurs</p>
        </div>
        <a 
          href="/admin/dashboard" 
          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
        >
          ← Retour au tableau de bord
        </a>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Alertes par statut</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <p className="text-sm font-medium text-blue-700">Envoyées</p>
              <p className="text-2xl font-bold text-blue-800">
                {displayStats.byStatus.find(s => s._id === 'sent')?.count || 0}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <p className="text-sm font-medium text-green-700">Cliquées</p>
              <p className="text-2xl font-bold text-green-800">
                {displayStats.byStatus.find(s => s._id === 'clicked')?.count || 0}
              </p>
              <p className="text-xs text-green-600">
                {displayStats.byStatus.find(s => s._id === 'clicked')?.count && displayStats.byStatus.find(s => s._id === 'sent')?.count 
                  ? `${Math.round((displayStats.byStatus.find(s => s._id === 'clicked')?.count / displayStats.byStatus.find(s => s._id === 'sent')?.count) * 100)}% de conversion` 
                  : '0% de conversion'}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <p className="text-sm font-medium text-gray-700">Expirées</p>
              <p className="text-2xl font-bold text-gray-800">
                {displayStats.byStatus.find(s => s._id === 'expired')?.count || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Top compagnies aériennes</h2>
          <div className="space-y-3">
            {displayStats.byAirline.slice(0, 5).map(airline => (
              <div key={airline._id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <Plane className="h-4 w-4 text-blue-500 mr-2" />
                  <span className="text-gray-700">{airline._id}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-blue-600">{airline.count}</span>
                  <span className="text-gray-500 ml-2">alertes</span>
                  <span className="text-green-600 ml-2">-{Math.round(airline.avgDiscount)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Rechercher par aéroport ou compagnie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              className="form-select border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Tous les statuts</option>
              <option value="sent">Envoyées</option>
              <option value="clicked">Cliquées</option>
              <option value="expired">Expirées</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <input
              type="date"
              className="border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              placeholder="Date début"
            />
            <span className="text-gray-500">à</span>
            <input
              type="date"
              className="border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              placeholder="Date fin"
            />
          </div>
          
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Rechercher
          </button>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        {loading ? (
          <div className="p-6 flex justify-center">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">
            {error}
            <button 
              onClick={fetchAlerts}
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date d'envoi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayAlerts.map((alert) => (
                  <tr key={alert._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
                          {alert.user.firstName ? (
                            <span className="text-gray-700 font-medium">{alert.user.firstName.charAt(0)}</span>
                          ) : (
                            <User className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {alert.user.firstName || 'Anonyme'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {alert.user.email}
                          </div>
                          <div className="text-xs">
                            <span className={`px-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              alert.user.subscriptionType === 'premium' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {alert.user.subscriptionType === 'premium' ? 'Premium' : 'Gratuit'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium flex items-center">
                        <span>{alert.departureAirport.code}</span>
                        <ArrowRight className="h-3 w-3 mx-1" />
                        <span>{alert.destinationAirport.code}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {alert.airline}
                      </div>
                      <div className="text-xs text-gray-500">
                        {alert.stops === 0 ? 'Direct' : `${alert.stops} escale${alert.stops > 1 ? 's' : ''}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        {formatPrice(alert.price)}
                      </div>
                      <div className="text-xs text-gray-500 line-through">
                        {formatPrice(alert.originalPrice)}
                      </div>
                      <div className="text-xs font-medium text-green-600">
                        -{alert.discountPercentage}% ({formatPrice(alert.discountAmount)})
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatFlightDate(alert.outboundDate)}
                      </div>
                      <div className="text-sm text-gray-900">
                        {formatFlightDate(alert.returnDate)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {alert.duration} jour{alert.duration > 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColorClass(alert.status)}`}>
                        {alert.status === 'sent' ? (
                          <span className="flex items-center">
                            <Bell className="h-3 w-3 mr-1" />
                            Envoyée
                          </span>
                        ) : alert.status === 'clicked' ? (
                          <span className="flex items-center">
                            <Check className="h-3 w-3 mr-1" />
                            Cliquée
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <X className="h-3 w-3 mr-1" />
                            Expirée
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(alert.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <a 
                        href={alert.bookingLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Lien
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Affichage de <span className="font-medium">{displayAlerts.length}</span> alertes sur <span className="font-medium">{pagination.total}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
            disabled={pagination.page <= 1}
            className="px-3 py-2 rounded-md bg-white shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="px-4 py-2 rounded-md bg-white shadow text-sm">
            Page {pagination.page} sur {pagination.pages}
          </span>
          <button
            onClick={() => setPagination({ ...pagination, page: Math.min(pagination.pages, pagination.page + 1) })}
            disabled={pagination.page >= pagination.pages}
            className="px-3 py-2 rounded-md bg-white shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertsManagement;