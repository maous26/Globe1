import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Crown, User, RefreshCw } from 'lucide-react';
import { adminAPI } from '../../services/api.service';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState(null);

  useEffect(() => {
    fetchUsers(pagination.page);
  }, [pagination.page]);

  const fetchUsers = async (page = 1, search = '') => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await adminAPI.getUsers({
        page,
        limit: pagination.limit,
        search
      });
      
      const data = response.data;
      setUsers(data.users);
      setPagination({
        ...pagination,
        page: data.pagination.page,
        total: data.pagination.total,
        pages: data.pagination.pages
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchUsers(1, searchTerm);
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      setPagination({ ...pagination, page: pagination.page - 1 });
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.pages) {
      setPagination({ ...pagination, page: pagination.page + 1 });
    }
  };

  const updateSubscription = async (userId, newType) => {
    try {
      setIsUpdating(true);
      
      // In a real app, this would be an actual API call
      const response = await fetch('/api/admin/users/subscription', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          subscriptionType: newType
        })
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de l\'abonnement');
      }
      
      // Update the user in the list
      setUsers(users.map(user => 
        user._id === userId ? { ...user, subscriptionType: newType } : user
      ));
      
      setUpdateMessage({
        type: 'success',
        text: `Abonnement mis à jour avec succès vers ${newType === 'premium' ? 'Premium' : 'Gratuit'}`
      });
      
      // Clear message after 3 seconds
      setTimeout(() => setUpdateMessage(null), 3000);
    } catch (err) {
      console.error('Error updating subscription:', err);
      setUpdateMessage({
        type: 'error',
        text: err.message || 'Erreur lors de la mise à jour'
      });
      
      // Clear message after 3 seconds
      setTimeout(() => setUpdateMessage(null), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  // Mock data for development - would be replaced with actual API data
  const mockUsers = [
    { _id: '1', email: 'john.doe@example.com', firstName: 'John', subscriptionType: 'premium', departureAirports: ['CDG'], includeCDG: true, createdAt: '2025-06-15T10:30:00.000Z', lastLogin: '2025-07-21T08:45:00.000Z' },
    { _id: '2', email: 'jane.smith@example.com', firstName: 'Jane', subscriptionType: 'free', departureAirports: ['NCE'], includeCDG: true, createdAt: '2025-06-20T14:15:00.000Z', lastLogin: '2025-07-19T16:22:00.000Z' },
    { _id: '3', email: 'robert.johnson@example.com', firstName: 'Robert', subscriptionType: 'premium', departureAirports: ['LYS'], includeCDG: false, createdAt: '2025-05-10T09:00:00.000Z', lastLogin: '2025-07-20T11:05:00.000Z' },
    { _id: '4', email: 'susan.williams@example.com', firstName: null, subscriptionType: 'free', departureAirports: ['MRS'], includeCDG: true, createdAt: '2025-07-01T16:45:00.000Z', lastLogin: '2025-07-18T19:30:00.000Z' },
    { _id: '5', email: 'michael.brown@example.com', firstName: 'Michael', subscriptionType: 'free', departureAirports: ['CDG'], includeCDG: true, createdAt: '2025-06-25T11:20:00.000Z', lastLogin: '2025-07-15T10:15:00.000Z' }
  ];

  // Use mock data if users are empty and not loading
  const displayUsers = users.length > 0 ? users : (loading ? [] : mockUsers);

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des utilisateurs</h1>
          <p className="text-gray-600">Gérer les abonnements et les informations utilisateur</p>
        </div>
        <a 
          href="/admin/dashboard" 
          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
        >
          ← Retour au tableau de bord
        </a>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Rechercher par email ou nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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

      {/* Update Message */}
      {updateMessage && (
        <div className={`mb-6 p-4 rounded-md ${updateMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {updateMessage.text}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        {loading ? (
          <div className="p-6 flex justify-center">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">
            {error}
            <button 
              onClick={() => fetchUsers(pagination.page, searchTerm)}
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Abonnement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aéroports
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dernière connexion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
                        {user.firstName ? (
                          <span className="text-gray-700 font-medium">{user.firstName.charAt(0)}</span>
                        ) : (
                          <User className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName || 'Anonyme'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.subscriptionType === 'premium' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.subscriptionType === 'premium' ? (
                        <span className="flex items-center">
                          <Crown className="h-3 w-3 mr-1" />
                          Premium
                        </span>
                      ) : 'Gratuit'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      {user.departureAirports.join(', ')}
                    </div>
                    {user.includeCDG && (
                      <div className="text-xs text-gray-400 mt-1">
                        +CDG pour long-courrier
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.lastLogin)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {user.subscriptionType === 'free' ? (
                      <button
                        onClick={() => updateSubscription(user._id, 'premium')}
                        disabled={isUpdating}
                        className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Passer Premium
                      </button>
                    ) : (
                      <button
                        onClick={() => updateSubscription(user._id, 'free')}
                        disabled={isUpdating}
                        className="text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Rétrograder Gratuit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Affichage de <span className="font-medium">{displayUsers.length}</span> utilisateurs sur <span className="font-medium">{pagination.total}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevPage}
            disabled={pagination.page <= 1}
            className="px-3 py-2 rounded-md bg-white shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="px-4 py-2 rounded-md bg-white shadow text-sm">
            Page {pagination.page} sur {pagination.pages}
          </span>
          <button
            onClick={handleNextPage}
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

export default UserManagement;