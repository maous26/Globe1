// client/src/pages/admin/Dashboard.js
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api.service';
import { 
  Users, 
  Plane, 
  Bell, 
  Activity,
  TrendingUp,
  DollarSign
} from 'lucide-react';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch data on mount and set up auto-refresh
  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🔄 Fetching dashboard data...');
      const response = await adminAPI.getDashboardStats();
      setDashboardData(response.data);
      setLastUpdated(new Date());
      console.log('✅ Dashboard data updated:', response.data);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error('❌ Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 text-center">
          <p className="text-xl font-semibold mb-2">Erreur</p>
          <p>{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Utilisateurs Totaux',
      value: dashboardData?.users?.total || 0,
      icon: Users,
      color: 'bg-blue-500',
      change: dashboardData?.users?.change ? `${dashboardData.users.change > 0 ? '+' : ''}${dashboardData.users.change}%` : '0%'
    },
    {
      label: 'Utilisateurs Premium',
      value: dashboardData?.users?.premium || 0,
      icon: DollarSign,
      color: 'bg-green-500',
      change: dashboardData?.premium?.change ? `${dashboardData.premium.change > 0 ? '+' : ''}${dashboardData.premium.change}%` : '0%'
    },
    {
      label: 'Routes Actives',
      value: dashboardData?.routes?.active || 0,
      icon: Plane,
      color: 'bg-purple-500',
      change: dashboardData?.routes?.change ? `${dashboardData.routes.change > 0 ? '+' : ''}${dashboardData.routes.change}%` : '0%'
    },
    {
      label: 'Alertes Aujourd\'hui',
      value: dashboardData?.alerts?.today || 0,
      icon: Bell,
      color: 'bg-orange-500',
      change: dashboardData?.alerts?.change ? `${dashboardData.alerts.change > 0 ? '+' : ''}${dashboardData.alerts.change}%` : '0%'
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrateur</h1>
          <p className="text-gray-600 mt-2">Vue d'ensemble des statistiques de GlobeGenius</p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">
              Dernière mise à jour: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Activity className="h-4 w-4 mr-2" />
          )}
          Actualiser
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className={`text-sm mt-1 ${
                  stat.change.startsWith('+') ? 'text-green-600' : 
                  stat.change.startsWith('-') ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  <TrendingUp className={`inline h-4 w-4 mr-1 ${
                    stat.change.startsWith('-') ? 'rotate-180' : ''
                  }`} />
                  {stat.change} ce mois
                </p>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Conversion Rate */}
      {dashboardData?.users && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Taux de Conversion</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Premium</span>
                  <span className="text-sm font-medium">{dashboardData.users.conversionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${dashboardData.users.conversionRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Routes par Tier</h3>
            <div className="space-y-3">
              {dashboardData?.routes?.byTier && Object.entries(dashboardData.routes.byTier).map(([tier, count]) => (
                <div key={tier} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 capitalize">{tier.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Gérer les Utilisateurs</p>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <Plane className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Gérer les Routes</p>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Voir les Stats API</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
