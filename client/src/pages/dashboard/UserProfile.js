// client/src/pages/dashboard/UserProfile.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { userAPI } from '../../services/api.service';
import { useAuth } from '../../contexts/AuthContext';

// Import icons
import { 
  UserIcon, 
  EnvelopeIcon, 
  KeyIcon, 
  MapPinIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';

const UserProfile = () => {
  const { user, isPremium, updateProfile } = useAuth();
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    email: user?.email || '',
    departureAirports: user?.departureAirports || [],
    includeCDG: user?.includeCDG || false
  });
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // UI states
  const [activeTab, setActiveTab] = useState('profile');
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Airports list (sans CDG/ORY)
  const airports = [
    { code: 'NCE', name: 'Nice Côte d\'Azur' },
    { code: 'MRS', name: 'Marseille Provence' },
    { code: 'LYS', name: 'Lyon Saint-Exupéry' },
    { code: 'TLS', name: 'Toulouse-Blagnac' },
    { code: 'BOD', name: 'Bordeaux-Mérignac' },
    { code: 'NTE', name: 'Nantes Atlantique' },
    { code: 'LIL', name: 'Lille' }
  ];
  
  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setProfileForm({ ...profileForm, [name]: checked });
    } else if (name === 'departureAirports') {
      // Handle multi-select
      setProfileForm({
        ...profileForm,
        departureAirports: Array.from(e.target.selectedOptions, option => option.value)
      });
    } else {
      setProfileForm({ ...profileForm, [name]: value });
    }
  };
  
  // Handle password form changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm({ ...passwordForm, [name]: value });
  };
  
  // Submit profile form
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess(false);
    
    try {
      // Call API to update profile
      await userAPI.updateProfile({
        firstName: profileForm.firstName,
        departureAirports: profileForm.departureAirports,
        includeCDG: profileForm.includeCDG
      });
      
      // Update local user data
      await updateProfile();
      
      // Show success message
      setProfileSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setProfileSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileError(error.response?.data?.message || 'Une erreur est survenue lors de la mise à jour du profil');
    } finally {
      setProfileLoading(false);
    }
  };
  
  // Submit password form
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess(false);
    
    // Validate passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      setPasswordLoading(false);
      return;
    }
    
    try {
      // Call API to update password
      await userAPI.updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      // Reset form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Show success message
      setPasswordSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setPasswordSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error updating password:', error);
      setPasswordError(error.response?.data?.message || 'Une erreur est survenue lors de la mise à jour du mot de passe');
    } finally {
      setPasswordLoading(false);
    }
  };
  
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Mon profil</h1>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            <UserIcon className="inline-block h-5 w-5 mr-2 -mt-1" />
            Informations personnelles
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`${
              activeTab === 'password'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            <KeyIcon className="inline-block h-5 w-5 mr-2 -mt-1" />
            Mot de passe
          </button>
          {isPremium && (
            <button
              onClick={() => setActiveTab('subscription')}
              className={`${
                activeTab === 'subscription'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <CreditCardIcon className="inline-block h-5 w-5 mr-2 -mt-1" />
              Abonnement
            </button>
          )}
        </nav>
      </div>
      
      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="bg-white shadow rounded-lg p-6">
          {/* Success message */}
          {profileSuccess && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    Votre profil a été mis à jour avec succès !
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Error message */}
          {profileError && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    {profileError}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleProfileSubmit}>
            <div className="space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  <EnvelopeIcon className="inline-block h-5 w-5 mr-1 -mt-1" />
                  Adresse email
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={profileForm.email}
                    disabled
                    className="bg-gray-100 cursor-not-allowed shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    L'adresse email ne peut pas être modifiée.
                  </p>
                </div>
              </div>
              
              {/* First name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  <UserIcon className="inline-block h-5 w-5 mr-1 -mt-1" />
                  Prénom
                </label>
                <div className="mt-1">
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={profileForm.firstName}
                    onChange={handleProfileChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              {/* Departure airports */}
              <div>
                <label htmlFor="departureAirports" className="block text-sm font-medium text-gray-700">
                  <MapPinIcon className="inline-block h-5 w-5 mr-1 -mt-1" />
                  Aéroport régional additionnel
                </label>
                <div className="mt-1">
                  <select
                    id="departureAirports"
                    name="departureAirports"
                    multiple
                    value={profileForm.departureAirports}
                    onChange={handleProfileChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    size="5"
                  >
                    {airports.map(airport => (
                      <option key={airport.code} value={airport.code}>
                        {airport.name} ({airport.code})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Maintenez Ctrl (ou Cmd sur Mac) pour sélectionner plusieurs aéroports.
                  </p>
                </div>
              </div>
              
            </div>
            
            <div className="mt-6">
              <button
                type="submit"
                disabled={profileLoading}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  profileLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {profileLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer les modifications'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Password tab */}
      {activeTab === 'password' && (
        <div className="bg-white shadow rounded-lg p-6">
          {/* Success message */}
          {passwordSuccess && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    Votre mot de passe a été mis à jour avec succès !
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Error message */}
          {passwordError && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    {passwordError}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handlePasswordSubmit}>
            <div className="space-y-6">
              {/* Current password */}
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Mot de passe actuel
                </label>
                <div className="mt-1">
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    required
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              {/* New password */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  Nouveau mot de passe
                </label>
                <div className="mt-1">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    required
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Au moins 6 caractères.
                  </p>
                </div>
              </div>
              
              {/* Confirm password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmer le nouveau mot de passe
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                type="submit"
                disabled={passwordLoading}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  passwordLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {passwordLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Modification...
                  </>
                ) : (
                  'Modifier le mot de passe'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Subscription tab */}
      {activeTab === 'subscription' && isPremium && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-purple-100 mb-4">
              <CreditCardIcon className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Abonnement Premium</h3>
            <p className="mt-1 text-sm text-gray-500">
              Votre abonnement est actif. Vous bénéficiez de toutes les fonctionnalités premium.
            </p>
            
            <div className="mt-6 bg-purple-50 rounded-lg p-4 inline-block">
              <p className="font-medium text-purple-800">4,99€ / mois</p>
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Vos avantages premium</h4>
              <ul className="space-y-2 text-sm text-gray-600 mt-2">
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                  Alertes illimitées chaque jour
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                  Réductions jusqu'à 90%
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                  Dates alternatives à prix similaire
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                  Contenu personnalisé sur les destinations
                </li>
              </ul>
            </div>
            
            <div className="mt-8 border-t border-gray-200 pt-6">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Gérer l'abonnement
              </button>
              
              <p className="mt-4 text-xs text-gray-500">
                Vous pouvez annuler votre abonnement à tout moment. L'abonnement restera actif jusqu'à la fin de la période de facturation en cours.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Upgrade banner for free users */}
      {!isPremium && (
        <div className="mt-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-md p-6 text-white">
          <div className="sm:flex sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-medium">Passez à Premium pour plus de fonctionnalités !</h3>
              <div className="mt-2 text-sm text-blue-100">
                <p>Débloquez toutes les fonctionnalités et recevez les meilleures offres en priorité.</p>
                <ul className="mt-3 space-y-1">
                  <li className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-blue-200 mr-2" />
                    Alertes illimitées chaque jour
                  </li>
                  <li className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-blue-200 mr-2" />
                    Réductions jusqu'à 90%
                  </li>
                  <li className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-blue-200 mr-2" />
                    Dates alternatives à prix similaire
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-5 sm:mt-0 sm:ml-6 sm:flex-shrink-0 sm:flex sm:items-center">
              <Link
                to="/upgrade"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-purple-700 bg-white hover:bg-gray-100"
              >
                Passer à Premium pour 4,99€/mois
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;