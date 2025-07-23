import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Filter, Check, X, AlertTriangle, Plane, ArrowRight, Globe, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminAPI } from '../../services/api.service';

const RouteManagement = () => {
  const [routes, setRoutes] = useState([]);
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
    tier: '',
    isActive: null
  });
  const [editingRoute, setEditingRoute] = useState(null);
  const [updateMessage, setUpdateMessage] = useState(null);
  const [stats, setStats] = useState({
    byDeparture: [],
    byTier: []
  });
  const [showOptimization, setShowOptimization] = useState(false);
  const [optimizationLoading, setOptimizationLoading] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState(null);

  useEffect(() => {
    fetchRoutes();
  }, [pagination.page, filters]);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query string
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm
      });
      
      if (filters.tier) {
        queryParams.append('tier', filters.tier);
      }
      
      if (filters.isActive !== null) {
        queryParams.append('isActive', filters.isActive);
      }
      
      // In a real app, this would be an actual API call
      const response = await fetch(`/api/admin/routes?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des routes');
      }
      
      const data = await response.json();
      setRoutes(data.routes);
      setPagination({
        ...pagination,
        page: data.pagination.page,
        total: data.pagination.total,
        pages: data.pagination.pages
      });
      setStats(data.stats);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching routes:', err);
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination({ ...pagination, page: 1 });
    fetchRoutes();
  };

  const handleFilterChange = (filter, value) => {
    setFilters({ ...filters, [filter]: value });
    setPagination({ ...pagination, page: 1 });
  };

  const startEditing = (route) => {
    setEditingRoute({
      ...route,
      newTier: route.tier,
      newScanFrequency: route.scanFrequency,
      newIsActive: route.isActive
    });
  };

  const cancelEditing = () => {
    setEditingRoute(null);
  };

  const saveRouteChanges = async () => {
    try {
      // In a real app, this would be an actual API call
      const response = await fetch(`/api/admin/routes/${editingRoute._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tier: editingRoute.newTier,
          scanFrequency: editingRoute.newScanFrequency,
          isActive: editingRoute.newIsActive
        })
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de la route');
      }
      
      // Update the route in the list
      setRoutes(routes.map(route => 
        route._id === editingRoute._id 
          ? { 
              ...route, 
              tier: editingRoute.newTier, 
              scanFrequency: editingRoute.newScanFrequency,
              isActive: editingRoute.newIsActive
            } 
          : route
      ));
      
      setUpdateMessage({
        type: 'success',
        text: `Route ${editingRoute.departureAirport.code} → ${editingRoute.destinationAirport.code} mise à jour avec succès`
      });
      
      // Clear editing state
      setEditingRoute(null);
      
      // Clear message after 3 seconds
      setTimeout(() => setUpdateMessage(null), 3000);
    } catch (err) {
      console.error('Error updating route:', err);
      setUpdateMessage({
        type: 'error',
        text: err.message || 'Erreur lors de la mise à jour'
      });
      
      // Clear message after 3 seconds
      setTimeout(() => setUpdateMessage(null), 3000);
    }
  };

  const runRouteOptimization = async (isFullOptimization = false) => {
    try {
      setOptimizationLoading(true);
      
      const result = await adminAPI.runRouteOptimization(isFullOptimization);
      setOptimizationResult(result.data);
      
      // Refetch routes to see changes
      fetchRoutes();
    } catch (err) {
      console.error('Error optimizing routes:', err);
      setOptimizationResult({
        message: err.message || 'Erreur lors de l\'optimisation',
        stats: {
          updated: 0,
          added: 0,
          removed: 0
        },
        summary: 'L\'optimisation a échoué. Veuillez réessayer.'
      });
    } finally {
      setOptimizationLoading(false);
    }
  };

  // Mock data for development - would be replaced with actual API data
  const mockRoutes = [
    { _id: '1', departureAirport: { code: 'CDG', name: 'Paris Charles de Gaulle' }, destinationAirport: { code: 'JFK', name: 'New York JFK' }, tier: 'ultra-priority', scanFrequency: 6, isActive: true, totalScans: 342, totalDealsFound: 28, successRate: 8.19 },
    { _id: '2', departureAirport: { code: 'CDG', name: 'Paris Charles de Gaulle' }, destinationAirport: { code: 'LHR', name: 'London Heathrow' }, tier: 'ultra-priority', scanFrequency: 6, isActive: true, totalScans: 356, totalDealsFound: 42, successRate: 11.8 },
    { _id: '3', departureAirport: { code: 'NCE', name: 'Nice Côte d\'Azur' }, destinationAirport: { code: 'LHR', name: 'London Heathrow' }, tier: 'priority', scanFrequency: 4, isActive: true, totalScans: 256, totalDealsFound: 18, successRate: 7.03 },
    { _id: '4', departureAirport: { code: 'LYS', name: 'Lyon Saint-Exupéry' }, destinationAirport: { code: 'BCN', name: 'Barcelona' }, tier: 'priority', scanFrequency: 4, isActive: false, totalScans: 214, totalDealsFound: 9, successRate: 4.21 },
    { _id: '5', departureAirport: { code: 'CDG', name: 'Paris Charles de Gaulle' }, destinationAirport: { code: 'PMI', name: 'Palma de Mallorca' }, tier: 'complementary', scanFrequency: 2, isActive: true, isSeasonal: true, seasonalPeriod: { start: '2025-05-01T00:00:00.000Z', end: '2025-09-30T00:00:00.000Z' }, totalScans: 102, totalDealsFound: 15, successRate: 14.71 }
  ];

  // Use mock data if routes are empty and not loading
  const displayRoutes = routes.length > 0 ? routes : (loading ? [] : mockRoutes);

  // Mock stats for development
  const mockStats = {
    byDeparture: [
      { _id: 'CDG', name: 'Paris Charles de Gaulle', count: 40, activeCount: 38 },
      { _id: 'NCE', name: 'Nice Côte d\'Azur', count: 25, activeCount: 22 },
      { _id: 'LYS', name: 'Lyon Saint-Exupéry', count: 20, activeCount: 18 },
      { _id: 'MRS', name: 'Marseille Provence', count: 15, activeCount: 13 },
      { _id: 'BOD', name: 'Bordeaux-Mérignac', count: 10, activeCount: 9 }
    ],
    byTier: [
      { _id: 'ultra-priority', count: 40, activeCount: 38 },
      { _id: 'priority', count: 50, activeCount: 47 },
      { _id: 'complementary', count: 40, activeCount: 30 }
    ]
  };

  // Use mock stats if stats are empty
  const displayStats = stats.byDeparture.length > 0 ? stats : mockStats;

  // Get color class for tier
  const getTierColorClass = (tier) => {
    switch (tier) {
      case 'ultra-priority':
        return 'bg-blue-100 text-blue-800';
      case 'priority':
        return 'bg-green-100 text-green-800';
      case 'complementary':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Check if a route is in season
  const isRouteInSeason = (route) => {
    if (!route.isSeasonal) return true;
    
    const now = new Date();
    const seasonStart = new Date(route.seasonalPeriod.start);
    const seasonEnd = new Date(route.seasonalPeriod.end);
    
    return now >= seasonStart && now <= seasonEnd;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {showOptimization ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Optimisation des routes</h1>
            <button 
              onClick={() => setShowOptimization(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              L'optimisation des routes vous permet d'ajuster automatiquement les fréquences de scan, les tiers et l'activation des routes en fonction de leur performance et de votre budget API.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                  <RefreshCw className="h-5 w-5 mr-2" /> Optimisation quotidienne
                </h3>
                <p className="text-sm text-blue-700 mb-4">
                  Ajustements mineurs des fréquences de scan et activation/désactivation temporaire des routes peu performantes.
                </p>
                <button
                  onClick={() => runRouteOptimization(false)}
                  disabled={optimizationLoading}
                  className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {optimizationLoading ? <RefreshCw className="h-5 w-5 animate-spin mr-2" /> : null}
                  Lancer l'optimisation quotidienne
                </button>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2" /> Optimisation complète
                </h3>
                <p className="text-sm text-purple-700 mb-4">
                  Analyse complète des performances, ajout/suppression de routes, changements de tiers et optimisation saisonnière.
                </p>
                <button
                  onClick={() => runRouteOptimization(true)}
                  disabled={optimizationLoading}
                  className="w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {optimizationLoading ? <RefreshCw className="h-5 w-5 animate-spin mr-2" /> : null}
                  Lancer l'optimisation complète
                </button>
              </div>
            </div>
            
            {optimizationResult && (
              <div className={`p-4 rounded-lg ${optimizationResult.stats ? 'bg-green-50' : 'bg-red-50'}`}>
                <h3 className={`font-semibold mb-2 ${optimizationResult.stats ? 'text-green-800' : 'text-red-800'}`}>
                  Résultat de l'optimisation
                </h3>
                <p className={`mb-2 ${optimizationResult.stats ? 'text-green-700' : 'text-red-700'}`}>
                  {optimizationResult.message}
                </p>
                {optimizationResult.stats && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="bg-white p-3 rounded text-center">
                      <p className="text-sm text-gray-500">Routes mises à jour</p>
                      <p className="text-xl font-bold text-gray-800">{optimizationResult.stats.updated}</p>
                    </div>
                    <div className="bg-white p-3 rounded text-center">
                      <p className="text-sm text-gray-500">Routes ajoutées</p>
                      <p className="text-xl font-bold text-gray-800">{optimizationResult.stats.added}</p>
                    </div>
                    <div className="bg-white p-3 rounded text-center">
                      <p className="text-sm text-gray-500">Routes supprimées</p>
                      <p className="text-xl font-bold text-gray-800">{optimizationResult.stats.removed}</p>
                    </div>
                  </div>
                )}
                <div className="mt-4 p-3 bg-white rounded">
                  <p className="text-sm text-gray-500">Résumé</p>
                  <p className="text-gray-800">{optimizationResult.summary}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="text-center">
            <button
              onClick={() => setShowOptimization(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Retour à la liste des routes
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Gestion des routes</h1>
              <p className="text-gray-600">Gérer les routes de surveillance des vols</p>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => setShowOptimization(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
              >
                <Sparkles className="h-4 w-4 mr-2" /> Optimiser les routes
              </button>
              <a 
                href="/admin/dashboard" 
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                ← Retour au tableau de bord
              </a>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Routes par aéroport de départ</h2>
              <div className="space-y-2">
                {displayStats.byDeparture.map(stat => (
                  <div key={stat._id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Plane className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="text-gray-700">{stat.name} ({stat._id})</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-green-600">{stat.activeCount}</span>
                      <span className="text-gray-500"> / {stat.count} actives</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Routes par tier</h2>
              <div className="grid grid-cols-3 gap-4">
                {displayStats.byTier.map(stat => (
                  <div key={stat._id} className={`p-3 rounded-lg text-center ${
                    stat._id === 'ultra-priority' ? 'bg-blue-50' :
                    stat._id === 'priority' ? 'bg-green-50' : 'bg-yellow-50'
                  }`}>
                    <p className={`text-sm font-medium ${
                      stat._id === 'ultra-priority' ? 'text-blue-700' :
                      stat._id === 'priority' ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      {stat._id === 'ultra-priority' ? 'Ultra-prioritaire' :
                       stat._id === 'priority' ? 'Prioritaire' : 'Complémentaire'}
                    </p>
                    <p className={`text-2xl font-bold ${
                      stat._id === 'ultra-priority' ? 'text-blue-800' :
                      stat._id === 'priority' ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      {stat.count}
                    </p>
                    <p className={`text-xs ${
                      stat._id === 'ultra-priority' ? 'text-blue-600' :
                      stat._id === 'priority' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {stat.activeCount} actives
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Rechercher par code ou nom d'aéroport..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-500" />
                <select
                  className="form-select border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.tier}
                  onChange={(e) => handleFilterChange('tier', e.target.value)}
                >
                  <option value="">Tous les tiers</option>
                  <option value="ultra-priority">Ultra-prioritaire</option>
                  <option value="priority">Prioritaire</option>
                  <option value="complementary">Complémentaire</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <select
                  className="form-select border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.isActive === null ? '' : filters.isActive.toString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleFilterChange('isActive', val === '' ? null : val === 'true');
                  }}
                >
                  <option value="">Tous les statuts</option>
                  <option value="true">Actives</option>
                  <option value="false">Inactives</option>
                </select>
                
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Rechercher
                </button>
              </div>
            </div>
          </div>

          {/* Update Message */}
          {updateMessage && (
            <div className={`mb-6 p-4 rounded-md ${updateMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {updateMessage.text}
            </div>
          )}

          {/* Routes Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            {loading ? (
              <div className="p-6 flex justify-center">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-600">
                {error}
                <button 
                  onClick={fetchRoutes}
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
                        Route
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scans / jour
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Performance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayRoutes.map((route) => (
                      <tr key={route._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="mr-2">
                              <Globe className="h-5 w-5 text-gray-500" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 flex items-center">
                                <span className="font-bold">{route.departureAirport.code}</span>
                                <ArrowRight className="h-3 w-3 mx-1" />
                                <span className="font-bold">{route.destinationAirport.code}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {route.departureAirport.name} → {route.destinationAirport.name}
                              </div>
                              {route.isSeasonal && (
                                <div className="text-xs text-indigo-600 mt-1">
                                  Saisonnière: {new Date(route.seasonalPeriod.start).toLocaleDateString('fr-FR')} - {new Date(route.seasonalPeriod.end).toLocaleDateString('fr-FR')}
                                  {!isRouteInSeason(route) && (
                                    <span className="ml-1 text-yellow-600">(hors saison)</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingRoute && editingRoute._id === route._id ? (
                            <select
                              value={editingRoute.newTier}
                              onChange={(e) => setEditingRoute({...editingRoute, newTier: e.target.value})}
                              className="border border-gray-300 rounded p-1 text-sm w-full"
                            >
                              <option value="ultra-priority">Ultra-prioritaire</option>
                              <option value="priority">Prioritaire</option>
                              <option value="complementary">Complémentaire</option>
                            </select>
                          ) : (
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTierColorClass(route.tier)}`}>
                              {route.tier === 'ultra-priority' ? 'Ultra-prioritaire' :
                              route.tier === 'priority' ? 'Prioritaire' : 'Complémentaire'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {editingRoute && editingRoute._id === route._id ? (
                            <select
                              value={editingRoute.newScanFrequency}
                              onChange={(e) => setEditingRoute({...editingRoute, newScanFrequency: parseInt(e.target.value)})}
                              className="border border-gray-300 rounded p-1 text-sm w-full"
                            >
                              <option value="1">1 scan/jour</option>
                              <option value="2">2 scans/jour</option>
                              <option value="3">3 scans/jour</option>
                              <option value="4">4 scans/jour</option>
                              <option value="6">6 scans/jour</option>
                              <option value="8">8 scans/jour</option>
                              <option value="12">12 scans/jour</option>
                            </select>
                          ) : (
                            <span>{route.scanFrequency} scans/jour</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingRoute && editingRoute._id === route._id ? (
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => setEditingRoute({...editingRoute, newIsActive: true})}
                                className={`px-2 py-1 rounded text-xs ${editingRoute.newIsActive ? 'bg-green-100 text-green-800 font-bold' : 'bg-gray-100 text-gray-800'}`}
                              >
                                Active
                              </button>
                              <button 
                                onClick={() => setEditingRoute({...editingRoute, newIsActive: false})}
                                className={`px-2 py-1 rounded text-xs ${!editingRoute.newIsActive ? 'bg-red-100 text-red-800 font-bold' : 'bg-gray-100 text-gray-800'}`}
                              >
                                Inactive
                              </button>
                            </div>
                          ) : (
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${route.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {route.isActive ? (
                                <span className="flex items-center">
                                  <Check className="h-3 w-3 mr-1" />
                                  Active
                                </span>
                              ) : (
                                <span className="flex items-center">
                                  <X className="h-3 w-3 mr-1" />
                                  Inactive
                                </span>
                              )}
                            </span>
                          )}
                          {route.isSeasonal && !isRouteInSeason(route) && route.isActive && (
                            <div className="mt-1">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Hors saison
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-900">
                              {route.successRate}% de succès
                            </span>
                            <span className="text-xs text-gray-500">
                              {route.totalDealsFound} deals sur {route.totalScans} scans
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {editingRoute && editingRoute._id === route._id ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={saveRouteChanges}
                                className="text-green-600 hover:text-green-900"
                              >
                                Enregistrer
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="text-red-600 hover:text-red-900"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditing(route)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Modifier
                            </button>
                          )}
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
              Affichage de <span className="font-medium">{displayRoutes.length}</span> routes sur <span className="font-medium">{pagination.total}</span>
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
        </>
      )}
    </div>
  );
};

export default RouteManagement;