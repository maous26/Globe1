// client/src/pages/admin/ApiStats.js
import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api.service';
import { CalendarIcon, ChartBarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Line } from 'recharts';
import { 
  LineChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const ApiStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchApiStats();
  }, [dateRange]);

  // Auto-refresh every 30 seconds - VRAIES DONNÉES EN TEMPS RÉEL - DÉSACTIVÉ TEMPORAIREMENT
  useEffect(() => {
    // DÉSACTIVÉ : causait des appels API en boucle
    // const interval = setInterval(() => {
    //   if (!loading) {
    //     console.log('🔄 Auto-refresh API stats (REAL DATA)...');
    //     fetchApiStats();
    //   }
    // }, 30000);
    
    // return () => clearInterval(interval);
    
    console.log('ℹ️ Auto-refresh désactivé pour éviter les appels répétés');
  }, [loading]);

  const fetchApiStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching API stats...');
      
      // S'assurer que les dates sont des strings
      const response = await adminAPI.getApiStats(
        dateRange.startDate,
        dateRange.endDate
      );
      
      setStats(response.data);
      console.log('✅ API stats updated:', response.data);
    } catch (err) {
      console.error('Error fetching API stats:', err);
      setError('Impossible de charger les statistiques API');
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate]);

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fonction helper pour formater les nombres en toute sécurité
  const safeToLocaleString = (value) => {
    return (value !== undefined && value !== null) ? value.toLocaleString() : '0';
  };

  // Calculer le pourcentage d'utilisation
  const calculateUsagePercentage = () => {
    if (!stats?.currentMonth) return 0;
    return Math.round((stats.currentMonth.totalCalls / 30000) * 100);
  };

  const usagePercentage = calculateUsagePercentage();
  const remainingCalls = 30000 - (stats?.currentMonth?.totalCalls || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Erreur</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Statistiques API - DONNÉES RÉELLES</h1>
            <div className="flex items-center space-x-2 mt-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-green-600 font-medium">
                Mise à jour automatique toutes les 30 secondes
              </p>
            </div>
          </div>
        </div>

        {/* Filtres de date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de début
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de fin
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Métriques principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-900">Appels aujourd'hui</p>
                <p className="text-2xl font-bold text-blue-800">
                  {safeToLocaleString(stats?.today?.totalCalls)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-green-900">Appels ce mois</p>
                <p className="text-2xl font-bold text-green-800">
                  {safeToLocaleString(stats?.currentMonth?.totalCalls)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-yellow-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">%</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-900">Quota utilisé</p>
                <p className="text-2xl font-bold text-yellow-800">{usagePercentage}%</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">✓</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-900">Taux de succès</p>
                <p className="text-2xl font-bold text-purple-800">
                  {stats?.currentMonth?.totalCalls > 0 
                    ? Math.round((stats.currentMonth.successfulCalls / stats.currentMonth.totalCalls) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Répartition par type d'API */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Appels Flight API</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Recherches de vols</span>
                <span className="font-semibold">{stats?.flightApiCalls?.searches || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dates alternatives</span>
                <span className="font-semibold">{stats?.flightApiCalls?.alternatives || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Détails aéroports</span>
                <span className="font-semibold">{stats?.flightApiCalls?.airports || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Appels IA</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Gemini Flash</span>
                <span className="font-semibold">{stats?.aiCalls?.['gemini-flash'] || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GPT-4o Mini</span>
                <span className="font-semibold">{stats?.aiCalls?.['gpt4o-mini'] || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Graphiques */}
        {stats?.dailyStats && stats.dailyStats.length > 0 && (
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Évolution quotidienne</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy')}
                  formatter={(value) => [safeToLocaleString(value), 'Appels']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="totalCalls" 
                  stroke="#2563eb" 
                  name="Total"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="successfulCalls" 
                  stroke="#16a34a" 
                  name="Succès"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="failedCalls" 
                  stroke="#dc2626" 
                  name="Échecs"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Quotas et utilisation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quota mensuel</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Quota total</span>
                <span className="font-semibold text-lg">30,000</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Utilisé</span>
                <span className="font-semibold text-lg text-blue-600">
                  {safeToLocaleString(stats?.currentMonth?.totalCalls)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Restant</span>
                <span className="font-semibold text-lg text-green-600">
                  {safeToLocaleString(remainingCalls)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 text-center">
                {usagePercentage}% du quota mensuel utilisé
              </p>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performances</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Appels réussis</span>
                <span className="font-semibold text-lg text-green-600">
                  {safeToLocaleString(stats?.currentMonth?.successfulCalls)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Appels échoués</span>
                <span className="font-semibold text-lg text-red-600">
                  {safeToLocaleString(stats?.currentMonth?.failedCalls)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Taux de succès</span>
                <span className="font-semibold text-lg text-blue-600">
                  {stats?.currentMonth?.totalCalls > 0 
                    ? Math.round((stats.currentMonth.successfulCalls / stats.currentMonth.totalCalls) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiStats;