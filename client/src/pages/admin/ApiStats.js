import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Calendar, RefreshCw, Database, Globe, ArrowRight, Activity, Cpu, BadgeCheck, AlertTriangle, Server } from 'lucide-react';

const ApiStatsPage = () => {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });

  useEffect(() => {
    fetchApiStats();
  }, [dateRange]);

  const fetchApiStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real app, this would be an actual API call
      const response = await fetch(`/api/admin/api-stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des statistiques API');
      }
      
      const data = await response.json();
      setStatsData(data);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching API stats:', err);
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  // Mock data for development - would be replaced with actual API data
  const mockStatsData = {
    quota: {
      total: 30000,
      used: 14362,
      remaining: 15638,
      resetDate: '2025-08-01'
    },
    daily: Array(30).fill().map((_, idx) => {
      const date = new Date();
      date.setDate(date.getDate() - 29 + idx);
      return {
        date: date.toISOString().split('T')[0],
        totalCalls: Math.floor(Math.random() * 1000) + 1000,
        successfulCalls: Math.floor(Math.random() * 900) + 900,
        failedCalls: Math.floor(Math.random() * 50),
        aiCalls: {
          geminiFlash: Math.floor(Math.random() * 50) + 50,
          gpt4oMini: Math.floor(Math.random() * 100) + 100,
          total: Math.floor(Math.random() * 150) + 150
        }
      };
    }),
    routes: Array(20).fill().map((_, idx) => ({
      route: `CDG-${['JFK', 'LHR', 'DXB', 'SIN', 'LAX', 'MAD', 'FCO', 'AMS', 'BCN', 'LIS'][idx % 10]}`,
      calls: Math.floor(Math.random() * 500) + 100
    })),
    airports: Array(10).fill().map((_, idx) => ({
      airport: ['CDG', 'ORY', 'LHR', 'JFK', 'MAD', 'FCO', 'AMS', 'BCN', 'DXB', 'SIN'][idx],
      calls: Math.floor(Math.random() * 1000) + 500
    })),
    totals: {
      totalCalls: 26483,
      successfulCalls: 25967,
      failedCalls: 516,
      aiCalls: {
        geminiFlash: 1587,
        gpt4oMini: 2896,
        total: 4483
      }
    }
  };

  // Use mock data if statsData is null and not loading
  const data = statsData || (loading ? null : mockStatsData);

  // Calculate daily average
  const calculateDailyAverage = () => {
    if (!data || !data.daily || data.daily.length === 0) return 0;
    
    const total = data.daily.reduce((sum, day) => sum + day.totalCalls, 0);
    return Math.round(total / data.daily.length);
  };

  // Colors for charts
  const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#ec4899'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Statistiques API</h1>
          <p className="text-gray-600">Analyse détaillée de l'utilisation de l'API</p>
        </div>
        <a 
          href="/admin/dashboard" 
          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
        >
          ← Retour au tableau de bord
        </a>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-500 mr-2" />
            <span className="text-gray-700">Période :</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-500">à</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            onClick={fetchApiStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 flex justify-center">
          <RefreshCw className="h-12 w-12 text-blue-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-red-600">
          {error}
          <button 
            onClick={fetchApiStats}
            className="ml-2 text-blue-600 hover:text-blue-800"
          >
            Réessayer
          </button>
        </div>
      ) : data ? (
        <>
          {/* Quota Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Quota total</p>
                  <p className="text-2xl font-bold text-gray-800">{data.quota.total.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Réinitialisation le {new Date(data.quota.resetDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-blue-50 text-blue-700">
                  <Database className="h-8 w-8" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Appels utilisés</p>
                  <p className="text-2xl font-bold text-gray-800">{data.quota.used.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {Math.round((data.quota.used / data.quota.total) * 100)}% du quota mensuel
                  </p>
                </div>
                <div className="p-2 rounded-full bg-purple-50 text-purple-700">
                  <Activity className="h-8 w-8" />
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-purple-600 h-2.5 rounded-full" 
                    style={{ width: `${(data.quota.used / data.quota.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Appels quotidiens</p>
                  <p className="text-2xl font-bold text-gray-800">{calculateDailyAverage().toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Moyenne sur la période
                  </p>
                </div>
                <div className="p-2 rounded-full bg-green-50 text-green-700">
                  <Server className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>

          {/* Daily API Calls Chart */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Évolution des appels API</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                    }}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [value.toLocaleString(), '']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('fr-FR')}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="totalCalls" 
                    stroke="#3b82f6" 
                    name="Total"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="aiCalls.total" 
                    stroke="#8b5cf6" 
                    name="AI" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="failedCalls" 
                    stroke="#ef4444" 
                    name="Échecs" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Routes and AI Usage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Top 10 routes</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.routes.slice(0, 10)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="route" 
                      type="category" 
                      tick={{ fontSize: 12 }}
                      width={60}
                    />
                    <Tooltip formatter={(value) => [value.toLocaleString(), 'Appels']} />
                    <Bar dataKey="calls" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Répartition des appels API</h2>
              <div className="h-80 flex flex-col justify-center">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Recherche de vols', value: data.totals.totalCalls - data.totals.aiCalls.total },
                        { name: 'Gemini Flash', value: data.totals.aiCalls.geminiFlash },
                        { name: 'GPT-4o Mini', value: data.totals.aiCalls.gpt4oMini }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: 'Recherche de vols', value: data.totals.totalCalls - data.totals.aiCalls.total },
                        { name: 'Gemini Flash', value: data.totals.aiCalls.geminiFlash },
                        { name: 'GPT-4o Mini', value: data.totals.aiCalls.gpt4oMini }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value.toLocaleString(), 'Appels']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center space-x-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                    <span className="text-xs text-gray-600">Recherche de vols</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                    <span className="text-xs text-gray-600">Gemini Flash</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                    <span className="text-xs text-gray-600">GPT-4o Mini</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Usage and Top Airports */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Utilisation de l'IA</h2>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-1">
                    <div className="flex items-center">
                      <Cpu className="h-4 w-4 text-purple-600 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Gemini Flash</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">
                      {data.totals.aiCalls.geminiFlash.toLocaleString()} appels
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-purple-600 h-2.5 rounded-full" 
                      style={{ width: `${(data.totals.aiCalls.geminiFlash / 1000) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Quota mensuel : 1000</span>
                    <span>{Math.round((data.totals.aiCalls.geminiFlash / 1000) * 100)}% utilisé</span>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <div className="flex items-center">
                      <Cpu className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-gray-700">GPT-4o Mini</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">
                      {data.totals.aiCalls.gpt4oMini.toLocaleString()} appels
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${(data.totals.aiCalls.gpt4oMini / 2000) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Quota mensuel : 2000</span>
                    <span>{Math.round((data.totals.aiCalls.gpt4oMini / 2000) * 100)}% utilisé</span>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Utilisation de l'IA</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <BadgeCheck className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-600">Optimisation des routes</span>
                    </div>
                    <div className="flex items-center">
                      <BadgeCheck className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-600">Validation des offres</span>
                    </div>
                    <div className="flex items-center">
                      <BadgeCheck className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-600">Génération de contenu</span>
                    </div>
                    <div className="flex items-center">
                      <BadgeCheck className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-600">Analyse des tendances</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Top aéroports</h2>
              <div className="space-y-4">
                {data.airports.slice(0, 8).map((airport, index) => (
                  <div key={airport.airport} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index < 3 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {index < 3 ? (
                          <span className="font-bold">{index + 1}</span>
                        ) : (
                          <Globe className="h-4 w-4" />
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-800">{airport.airport}</p>
                        <p className="text-xs text-gray-500">
                          {airport.airport === 'CDG' ? 'Paris Charles de Gaulle' :
                           airport.airport === 'ORY' ? 'Paris Orly' :
                           airport.airport === 'LHR' ? 'London Heathrow' :
                           airport.airport === 'JFK' ? 'New York JFK' :
                           airport.airport === 'MAD' ? 'Madrid Barajas' :
                           airport.airport === 'FCO' ? 'Rome Fiumicino' :
                           airport.airport === 'AMS' ? 'Amsterdam Schiphol' :
                           airport.airport === 'BCN' ? 'Barcelona' :
                           airport.airport === 'DXB' ? 'Dubai International' :
                           airport.airport === 'SIN' ? 'Singapore Changi' : 'Aéroport'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-800">{airport.calls.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">appels</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Usage Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Résumé d'utilisation</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-blue-700">Total des appels</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                    {data.totals.totalCalls.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <BadgeCheck className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-blue-700">Succès</span>
                  </div>
                  <span className="text-sm text-blue-800 font-medium">{data.totals.successfulCalls.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                    <span className="text-sm text-blue-700">Échecs</span>
                  </div>
                  <span className="text-sm text-blue-800 font-medium">{data.totals.failedCalls.toLocaleString()}</span>
                </div>
                <div className="mt-4">
                  <div className="text-xs text-blue-700 mb-1">Taux de succès</div>
                  <div className="w-full bg-blue-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${(data.totals.successfulCalls / data.totals.totalCalls) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-blue-700 text-right mt-1">
                    {((data.totals.successfulCalls / data.totals.totalCalls) * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-green-700">Utilisation du quota</h3>
                  <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                    {Math.round((data.quota.used / data.quota.total) * 100)}% utilisé
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Utilisé</span>
                      <span className="text-green-800 font-medium">{data.quota.used.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-green-700">Restant</span>
                      <span className="text-green-800 font-medium">{data.quota.remaining.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ width: `${(data.quota.used / data.quota.total) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-green-700">
                    {Math.floor((data.quota.remaining / calculateDailyAverage()))} jours restants au rythme actuel
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-purple-700">Appels IA</h3>
                  <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded">
                    {data.totals.aiCalls.total.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Cpu className="h-4 w-4 text-purple-600 mr-2" />
                    <span className="text-sm text-purple-700">Gemini Flash</span>
                  </div>
                  <span className="text-sm text-purple-800 font-medium">{data.totals.aiCalls.geminiFlash.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center">
                    <Cpu className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm text-purple-700">GPT-4o Mini</span>
                  </div>
                  <span className="text-sm text-purple-800 font-medium">{data.totals.aiCalls.gpt4oMini.toLocaleString()}</span>
                </div>
                <div className="mt-4">
                  <div className="text-xs text-purple-700 mb-1">Proportion des appels totaux</div>
                  <div className="w-full bg-purple-200 rounded-full h-2.5">
                    <div 
                      className="bg-purple-600 h-2.5 rounded-full" 
                      style={{ width: `${(data.totals.aiCalls.total / data.totals.totalCalls) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-purple-700 text-right mt-1">
                    {((data.totals.aiCalls.total / data.totals.totalCalls) * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default ApiStatsPage;