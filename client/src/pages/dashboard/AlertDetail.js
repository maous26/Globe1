// client/src/pages/dashboard/AlertDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { alertsAPI } from '../../services/api.service';
import { useAuth } from '../../contexts/AuthContext';

// Import icons
import { 
  ArrowLeftIcon, 
  CalendarIcon, 
  CurrencyEuroIcon, 
  GlobeAltIcon, 
  PaperAirplaneIcon, 
  ClockIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const AlertDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isPremium } = useAuth();
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [alternativeDates, setAlternativeDates] = useState([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAlertDetails();
  }, [id]);

  // Fetch alert details
  const fetchAlertDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await alertsAPI.getAlertById(id);
      setAlert(response.data.alert);
      
      // If alert has alternative dates, set them
      if (response.data.alert.alternativeDates && response.data.alert.alternativeDates.length > 0) {
        setAlternativeDates(response.data.alert.alternativeDates);
      }
      
      // Mark alert as clicked if not already
      if (response.data.alert.status === 'sent') {
        await alertsAPI.markAlertClicked(id);
      }
    } catch (error) {
      console.error('Error fetching alert details:', error);
      setError('Impossible de charger les détails de cette alerte.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch alternative dates (premium feature)
  const fetchAlternativeDates = async () => {
    if (!isPremium) return;
    
    try {
      setLoadingAlternatives(true);
      const response = await alertsAPI.getAlternativeDates(id);
      setAlternativeDates(response.data.alternativeDates);
    } catch (error) {
      console.error('Error fetching alternative dates:', error);
    } finally {
      setLoadingAlternatives(false);
    }
  };

  // Handle booking click
  const handleBookClick = () => {
    // Open booking link in new tab
    window.open(alert.bookingLink, '_blank');
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
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Erreur</h3>
        <p className="mt-1 text-gray-500">{error || "Cette alerte n'existe pas ou a été supprimée."}</p>
        <div className="mt-6">
          <Link
            to="/dashboard/alerts"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="-ml-1 mr-2 h-5 w-5" />
            Retour aux alertes
          </Link>
        </div>
      </div>
    );
  }

  // Check if alert is expired
  const isExpired = new Date(alert.expiryDate) < new Date();

  return (
    <div>
      {/* Back button */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          Retour aux alertes
        </button>
      </div>

      {/* Main content */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-4 py-5 sm:px-6 text-white">
          <div className="flex flex-wrap items-center justify-between">
            <h2 className="text-xl font-bold">
              {alert.departureAirport.name} ({alert.departureAirport.code}) → {alert.destinationAirport.name} ({alert.destinationAirport.code})
            </h2>
            <div className="mt-2 sm:mt-0">
              <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-0.5 text-sm font-medium text-red-800">
                -{alert.discountPercentage}% • Économisez {formatCurrency(alert.discountAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-5 sm:p-6">
          {/* Price section */}
          <div className="text-center mb-6">
            <span className="text-4xl font-bold text-gray-900">{formatCurrency(alert.price)}</span>
            <span className="ml-2 text-lg text-gray-500 line-through">{formatCurrency(alert.originalPrice)}</span>
          </div>

          {/* Expired warning */}
          {isExpired && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Cette offre a expiré le {formatDate(alert.expiryDate)}. Les prix et disponibilités peuvent avoir changé.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Flight details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <CalendarIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                  Dates
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  Du {formatDate(alert.outboundDate)} au {formatDate(alert.returnDate)}
                  <span className="ml-1 text-gray-500">({alert.duration} jours)</span>
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <PaperAirplaneIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                  Compagnie aérienne
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{alert.airline}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <GlobeAltIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                  Escales
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {alert.stops === 0 ? 'Vol direct' : `${alert.stops} escale${alert.stops > 1 ? 's' : ''}`}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <ShieldCheckIcon className="mr-1.5 h-4 w-4 text-gray-400" />
                  Politique tarifaire
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{alert.farePolicy}</dd>
              </div>
            </dl>
          </div>

          {/* Alternative dates (premium feature) */}
          {isPremium && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Dates alternatives</h3>
              
              {alternativeDates.length > 0 ? (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <ul className="divide-y divide-purple-200">
                    {alternativeDates.map((date, index) => (
                      <li key={index} className="py-3 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(date.outbound)} → {formatDate(date.return)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(date.return).getTime() - new Date(date.outbound).getTime() > 0
                              ? `${Math.round((new Date(date.return).getTime() - new Date(date.outbound).getTime()) / (1000 * 60 * 60 * 24))} jours`
                              : ''}
                          </p>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {date.price ? formatCurrency(date.price) : formatCurrency(alert.price)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 text-sm">Aucune date alternative disponible pour ce prix.</p>
                  {!loadingAlternatives && (
                    <button
                      onClick={fetchAlternativeDates}
                      className="mt-2 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Rechercher des dates alternatives
                    </button>
                  )}
                  {loadingAlternatives && (
                    <div className="mt-2 flex justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Premium upgrade banner */}
          {!isPremium && (
            <div className="mb-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-md p-4 text-white">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <ShieldCheckIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium">Fonctionnalité Premium</h3>
                  <div className="mt-1 text-sm text-blue-100">
                    <p>Passez à Premium pour voir les dates alternatives à ce prix !</p>
                  </div>
                  <div className="mt-2">
                    <Link
                      to="/upgrade"
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-purple-700 bg-white hover:bg-gray-100"
                    >
                      Passer à Premium
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Booking button */}
          <div className="flex justify-center">
            <button
              onClick={handleBookClick}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                isExpired ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={isExpired}
            >
              {isExpired ? 'Offre expirée' : 'Réserver ce vol'}
            </button>
          </div>

          {/* Expiry notice */}
          {!isExpired && (
            <p className="mt-4 text-center text-xs text-gray-500">
              Cette offre expire le {formatDate(alert.expiryDate)}. Les prix et disponibilités sont susceptibles de changer.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertDetail;