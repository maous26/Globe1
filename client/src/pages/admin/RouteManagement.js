import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Filter, Check, X, AlertTriangle, Plane, ArrowRight, Globe, Sparkles, ChevronLeft, ChevronRight, PlayCircle, BarChart3, Calendar, TrendingUp, Award, AlertCircle } from 'lucide-react';
import { adminAPI } from '../../services/api.service';

const RouteManagement = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRoutes, setTotalRoutes] = useState(0);
  const [routesPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    tier: '',
    isActive: null
  });

  // Quarterly Reports State
  const [quarterlyReport, setQuarterlyReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showQuarterlyReport, setShowQuarterlyReport] = useState(false);

  const fetchRoutes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching routes - Page:', currentPage, 'Limit:', routesPerPage);
      
      const response = await adminAPI.getRoutes(
        currentPage,
        routesPerPage,
        searchTerm,
        filters.tier,
        filters.isActive !== null ? filters.isActive.toString() : '',
        ''
      );
      
      const data = response.data;
      
      console.log('📊 API Response:', {
        routesCount: data.routes.length,
        pagination: data.pagination
      });
      
      setRoutes(data.routes || []);
      setCurrentPage(data.pagination?.page || 1);
      setTotalPages(data.pagination?.pages || 1);
      setTotalRoutes(data.pagination?.total || 0);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching routes:', err);
      setError('Erreur lors du chargement des routes');
      setLoading(false);
    }
  }, [currentPage, routesPerPage, searchTerm, filters.tier, filters.isActive]);

  const fetchQuarterlyReport = useCallback(async () => {
    try {
      setReportLoading(true);
      console.log('🔄 Fetching quarterly AI report...');
      
      const response = await adminAPI.getQuarterlyReport();
      setQuarterlyReport(response.data);
      console.log('📊 Quarterly report loaded:', response.data);
      
    } catch (err) {
      console.error('Error fetching quarterly report:', err);
      setError('Erreur lors du chargement du rapport trimestriel');
    } finally {
      setReportLoading(false);
    }
  }, []);

  const triggerManualQuarterlyAnalysis = async () => {
    try {
      setReportLoading(true);
      console.log('🤖 Triggering manual quarterly analysis...');
      
      await adminAPI.triggerQuarterlyAnalysis();
      console.log('✅ Manual quarterly analysis triggered');
      
      // Refresh the report after triggering
      setTimeout(() => {
        fetchQuarterlyReport();
      }, 2000);
      
    } catch (err) {
      console.error('Error triggering quarterly analysis:', err);
      setError('Erreur lors du déclenchement de l\'analyse trimestrielle');
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
    fetchQuarterlyReport();
  }, [fetchRoutes, fetchQuarterlyReport]);

  const handlePageChange = (newPage) => {
    console.log('🔄 Changing page from', currentPage, 'to:', newPage);
    setCurrentPage(newPage);
  };

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleFilterChange = (filter, value) => {
    setFilters({ ...filters, [filter]: value });
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Chargement des routes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchRoutes}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Plane className="h-6 w-6 mr-2 text-blue-600" />
                Gestion des Routes
              </h1>
              <p className="text-gray-600">Gérer les routes de surveillance des vols</p>
              {process.env.NODE_ENV === 'development' && (
                <p className="text-xs text-blue-600 mt-1">
                  API: {process.env.REACT_APP_API_URL || 'http://localhost:3001/api'} | 
                  Page: {currentPage} | Total: {totalRoutes}
                </p>
              )}
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => setShowQuarterlyReport(!showQuarterlyReport)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Rapport IA Trimestriel
              </button>
              <button 
                onClick={fetchRoutes}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </button>
            </div>
          </div>
        </div>

        {/* Quarterly AI Report Section */}
        {showQuarterlyReport && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                Rapport IA - Analyse Trimestrielle des Routes
              </h2>
              <div className="flex space-x-3">
                <button
                  onClick={triggerManualQuarterlyAnalysis}
                  disabled={reportLoading}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {reportLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4 mr-2" />
                  )}
                  Déclencher Analyse
                </button>
                <button
                  onClick={fetchQuarterlyReport}
                  disabled={reportLoading}
                  className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Actualiser
                </button>
              </div>
            </div>

            {reportLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
                <p className="text-gray-600">Chargement du rapport trimestriel...</p>
              </div>
            ) : quarterlyReport ? (
              <div className="space-y-6">
                {/* Report Header */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-sm text-blue-800 font-medium">Période d'analyse</span>
                    </div>
                    <p className="text-lg font-semibold text-blue-900 mt-1">
                      {quarterlyReport.analysisStartDate ? new Date(quarterlyReport.analysisStartDate).toLocaleDateString('fr-FR') : 'N/A'} - 
                      {quarterlyReport.analysisEndDate ? new Date(quarterlyReport.analysisEndDate).toLocaleDateString('fr-FR') : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-sm text-green-800 font-medium">Score Performance Moyen</span>
                    </div>
                    <p className="text-lg font-semibold text-green-900 mt-1">
                      {quarterlyReport.averagePerformanceScore ? `${quarterlyReport.averagePerformanceScore.toFixed(1)}/100` : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Award className="h-5 w-5 text-purple-600 mr-2" />
                      <span className="text-sm text-purple-800 font-medium">Routes Analysées</span>
                    </div>
                    <p className="text-lg font-semibold text-purple-900 mt-1">
                      {quarterlyReport.totalRoutesAnalyzed || 0}
                    </p>
                  </div>
                </div>

                {/* Recommendations */}
                {quarterlyReport.recommendations && quarterlyReport.recommendations.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-800 flex items-center mb-3">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Recommandations IA
                    </h3>
                    <ul className="space-y-2">
                      {quarterlyReport.recommendations.map((recommendation, index) => (
                        <li key={index} className="text-yellow-700 flex items-start">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Report Summary */}
                {quarterlyReport.summary && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">Résumé de l'Analyse</h3>
                    <p className="text-gray-700 leading-relaxed">{quarterlyReport.summary}</p>
                  </div>
                )}

                {/* Next Analysis Date */}
                {quarterlyReport.nextAnalysisDate && (
                  <div className="text-sm text-gray-600 text-center">
                    Prochaine analyse automatique prévue le {new Date(quarterlyReport.nextAnalysisDate).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Aucun rapport trimestriel disponible</p>
                <p className="text-sm text-gray-500 mt-2">
                  Déclenchez une analyse manuelle pour générer le premier rapport
                </p>
              </div>
            )}
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par aéroport..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Rechercher
            </button>
          </div>
        </div>

        {/* Routes Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {routes.map((route) => (
                  <tr key={route._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Plane className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {route.departureAirport?.code || 'N/A'} → {route.destinationAirport?.code || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {route.departureAirport?.name || 'N/A'} → {route.destinationAirport?.name || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        route.tier === 'ultra-priority' ? 'bg-red-100 text-red-800' :
                        route.tier === 'high-priority' ? 'bg-orange-100 text-orange-800' :
                        route.tier === 'standard' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {route.tier || 'standard'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        route.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {route.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {route.totalScans > 0 
                        ? Math.round((route.totalDealsFound || 0) / route.totalScans * 100)
                        : 0}% de succès
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Précédent
              </button>
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Affichage de <span className="font-medium">{routes.length}</span> routes sur{' '}
                  <span className="font-medium">{totalRoutes}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  
                  {/* Debug buttons */}
                  <button
                    onClick={() => handlePageChange(2)}
                    disabled={totalPages < 2}
                    className="ml-3 px-3 py-1 text-xs bg-blue-500 text-white rounded disabled:opacity-50"
                  >
                    Test Page 2
                  </button>
                  <button
                    onClick={() => handlePageChange(3)}
                    disabled={totalPages < 3}
                    className="ml-1 px-3 py-1 text-xs bg-green-500 text-white rounded disabled:opacity-50"
                  >
                    Test Page 3
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteManagement;