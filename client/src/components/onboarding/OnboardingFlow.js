import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const OnboardingFlow = ({ onComplete, existingUser }) => {
  const { updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: existingUser?.firstName || '',
    dreamDestinations: [],
    travelType: '',
    flexibleAirports: false,
    budget: '',
    travelFrequency: ''
  });

  const dreamDestinationOptions = [
    'Japon', 'Thaïlande', 'Bali', 'Maldives', 'Nouvelle-Zélande', 'Islande',
    'Norvège', 'Canada', 'Pérou', 'Argentine', 'Australie', 'Madagascar',
    'Kenya', 'Maroc', 'Égypte', 'Jordanie', 'États-Unis', 'Mexique', 'Brésil'
  ];

  const travelTypes = [
    { id: 'adventure', label: 'Aventure & Nature' },
    { id: 'culture', label: 'Culture & Histoire' },
    { id: 'relaxation', label: 'Détente & Bien-être' },
    { id: 'city', label: 'Villes & Urbain' },
    { id: 'beach', label: 'Plage & Soleil' },
    { id: 'winter', label: 'Sports d\'hiver' }
  ];

  const budgetRanges = [
    { id: 'low', label: 'Économique (< 500€)' },
    { id: 'medium', label: 'Modéré (500€ - 1000€)' },
    { id: 'high', label: 'Confortable (1000€ - 2000€)' },
    { id: 'luxury', label: 'Luxe (> 2000€)' }
  ];

  const handleDestinationToggle = (destination) => {
    setFormData(prev => ({
      ...prev,
      dreamDestinations: prev.dreamDestinations.includes(destination)
        ? prev.dreamDestinations.filter(d => d !== destination)
        : [...prev.dreamDestinations, destination]
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      console.log('🔄 Submitting onboarding data:', formData);
      await updateProfile(formData);
      console.log('✅ Onboarding completed successfully');
      onComplete();
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      // You could add a state for error display here if needed
      alert('Erreur lors de la mise à jour du profil. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {existingUser?.firstName ? `Bonjour ${existingUser.firstName} !` : 'Faisons connaissance !'}
        </h2>
        <p className="mt-2 text-gray-600">Pour mieux personnaliser vos alertes voyage</p>
      </div>

      {!existingUser?.firstName && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Votre prénom
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="John"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Quelles sont vos destinations de rêve ? (maximum 5)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {dreamDestinationOptions.map((destination) => (
            <button
              key={destination}
              type="button"
              onClick={() => handleDestinationToggle(destination)}
              disabled={!formData.dreamDestinations.includes(destination) && formData.dreamDestinations.length >= 5}
              className={`p-2 text-sm rounded-md border ${
                formData.dreamDestinations.includes(destination)
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } ${
                !formData.dreamDestinations.includes(destination) && formData.dreamDestinations.length >= 5
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              {destination}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Votre style de voyage</h2>
        <p className="mt-2 text-gray-600">Aidez-nous à trouver les meilleures offres pour vous</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Quel type de voyage préférez-vous ?
        </label>
        <div className="space-y-2">
          {travelTypes.map((type) => (
            <label key={type.id} className="flex items-center">
              <input
                type="radio"
                name="travelType"
                value={type.id}
                checked={formData.travelType === type.id}
                onChange={(e) => setFormData({...formData, travelType: e.target.value})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Budget habituel par personne pour un voyage :
        </label>
        <div className="space-y-2">
          {budgetRanges.map((budget) => (
            <label key={budget.id} className="flex items-center">
              <input
                type="radio"
                name="budget"
                value={budget.id}
                checked={formData.budget === budget.id}
                onChange={(e) => setFormData({...formData, budget: e.target.value})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">{budget.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dernière question !</h2>
        <p className="mt-2 text-gray-600">Pour maximiser vos économies</p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Astuce pour économiser encore plus !
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Parfois, partir de Londres ou Francfort peut vous faire économiser des centaines d'euros, 
                même en comptant le trajet jusqu'à ces aéroports.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.flexibleAirports}
            onChange={(e) => setFormData({...formData, flexibleAirports: e.target.checked})}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">
            Oui, je suis prêt(e) à partir de Londres ou Francfort si le prix est exceptionnel
          </span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          À quelle fréquence voyagez-vous ?
        </label>
        <select
          value={formData.travelFrequency}
          onChange={(e) => setFormData({...formData, travelFrequency: e.target.value})}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Sélectionnez...</option>
          <option value="rare">Rarement (moins d'1 fois par an)</option>
          <option value="occasional">Occasionnellement (1-2 fois par an)</option>
          <option value="regular">Régulièrement (3-5 fois par an)</option>
          <option value="frequent">Fréquemment (plus de 5 fois par an)</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {num}
                  </div>
                  {num < 3 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      step > num ? 'bg-blue-600' : 'bg-gray-200'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Étape {step} sur 3</p>
          </div>

          {/* Step content */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {/* Navigation buttons */}
          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                step === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Précédent
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && ((!existingUser?.firstName && !formData.firstName) || formData.dreamDestinations.length === 0)) ||
                  (step === 2 && (!formData.travelType || !formData.budget))
                }
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.travelFrequency}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Enregistrement...' : 'Terminer'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow; 