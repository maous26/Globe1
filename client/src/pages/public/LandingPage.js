import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logoGlobeGenius from '../../assets/logo512.png';

const LandingPage = () => {
  const navigate = useNavigate();
  const { registerBasic, registerPremium } = useAuth();
  const [email, setEmail] = useState('');
  const [showPremiumForm, setShowPremiumForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [premiumData, setPremiumData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    departureAirport: 'NCE'
  });

  const airports = [
    { code: 'NCE', name: 'Nice Côte d\'Azur', region: 'PACA' },
    { code: 'LYS', name: 'Lyon-Saint Exupéry', region: 'Auvergne-Rhône-Alpes' },
    { code: 'MRS', name: 'Marseille Provence', region: 'PACA' },
    { code: 'TLS', name: 'Toulouse-Blagnac', region: 'Occitanie' },
    { code: 'NTE', name: 'Nantes Atlantique', region: 'Pays de la Loire' },
    { code: 'BOD', name: 'Bordeaux-Mérignac', region: 'Nouvelle-Aquitaine' },
    { code: 'LIL', name: 'Lille-Lesquin', region: 'Hauts-de-France' },
    { code: 'SXB', name: 'Strasbourg', region: 'Grand Est' },
    { code: 'RNS', name: 'Rennes', region: 'Bretagne' },
    { code: 'MLH', name: 'Mulhouse', region: 'Grand Est' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await registerBasic({
        email,
        departureAirport: 'CDG',
        includeCDG: true
      });
      setMessage('Inscription réussie ! Consultez votre email pour activer votre compte.');
      setEmail('');
    } catch (error) {
      setMessage('Erreur lors de l\'inscription. Veuillez réessayer.');
    }
    setLoading(false);
  };

  const handlePremiumSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSend = { ...premiumData };
      if (!dataToSend.departureAirport) {
        delete dataToSend.departureAirport;
      }
      await registerPremium(dataToSend);
      setMessage('Inscription Premium réussie ! Redirection vers votre tableau de bord...');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      setMessage('Erreur lors de l\'inscription Premium. Veuillez réessayer.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50">
      {/* Header */}
      <header className="relative z-50 bg-transparent h-20 flex items-center">
        <nav className="container mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <img
                src={logoGlobeGenius}
                alt="GlobeGenius Logo"
                className="h-12 w-auto object-contain"
              />
              <span className="relative top-2 text-2xl font-extrabold text-[#1A7AC7] hidden sm:inline ml-0">
                GlobeGenius
              </span>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2.5 text-gray-700 hover:text-[#1A7AC7] transition-colors font-medium"
              >
                Se connecter
              </button>
              <button
                onClick={() => setShowPremiumForm(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-[#6BCB77] to-[#1A7AC7] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                S'inscrire Premium
              </button>
            </div>
            {/* Hamburger menu for mobile */}
            <div className="md:hidden flex items-center">
              <button className="p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#1A7AC7]">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 bg-[#E6F4F1] backdrop-blur-sm rounded-full text-[#1A7AC7] text-sm font-medium mb-8 border border-[#6BCB77]">
              <span className="w-2 h-2 bg-[#6BCB77] rounded-full mr-2 animate-pulse"></span>
              Surveillance des prix en temps réel
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-8 leading-tight">
              Ne cherchez plus les vols
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                les moins chers,
              </span>
              <span className="block text-4xl md:text-6xl font-bold">
                ce sont eux qui vous trouvent
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-700 mb-12 max-w-3xl mx-auto leading-relaxed">
              Notre IA surveille <strong>24h/24</strong> les meilleurs prix depuis Paris (CDG/Orly). 
              Les membres Premium bénéficient également d'alertes depuis leur aéroport régional.
            </p>

            {/* Premium Section en avant */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
              {/* Free Plan */}
              <div className="bg-white backdrop-blur-md rounded-2xl p-8 border border-blue-200 hover:border-blue-300 transition-all duration-300 shadow-lg">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Gratuit</h3>
                  <div className="text-4xl font-black text-blue-600 mb-1">0€</div>
                  <p className="text-gray-600 text-sm">Toujours gratuit</p>
                </div>
                
                <ul className="space-y-3 text-gray-700 mb-8">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    3 alertes par jour depuis Paris
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    Réductions jusqu'à 50%
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    CDG & Orly inclus
                  </li>
                </ul>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Votre adresse email"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Inscription...' : 'Recevoir les alertes gratuitement'}
                  </button>
                </form>
              </div>

              {/* Premium Plan */}
              <div className="bg-gradient-to-br from-[#E6F4F1] to-[#C7F9E5] backdrop-blur-md rounded-2xl p-8 border border-[#1A7AC7]/30 relative overflow-hidden group hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-[#1A7AC7]/10 to-[#6BCB77]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative">
                  <div className="flex items-center justify-center mb-2">
                    <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 text-xs font-bold rounded-full">
                      RECOMMANDÉ
                    </span>
                  </div>
                  
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium</h3>
                    <div className="text-4xl font-black text-gray-900 mb-1">
                      4,99€
                      <span className="text-lg font-normal text-gray-600">/mois</span>
                    </div>
                    <p className="text-gray-600 text-sm">Annulation à tout moment</p>
                  </div>

                  <ul className="space-y-3 text-gray-900 mb-8">
                    <li className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      <strong>Alertes illimitées</strong>
                    </li>
                    <li className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      Réductions jusqu'à <strong>90%</strong>
                    </li>
                    <li className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      <strong>Aéroport régional</strong> en option
                    </li>
                    <li className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      Dates alternatives
                    </li>
                    <li className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      Alertes en temps réel
                    </li>
                  </ul>

                  <button
                    onClick={() => setShowPremiumForm(true)}
                    className="w-full py-3 bg-gradient-to-r from-[#1A7AC7] to-[#6BCB77] text-white rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all duration-200"
                  >
                    Essayer Premium
                  </button>
                </div>
              </div>
            </div>

            {message && (
              <div className="max-w-md mx-auto mb-8 p-4 bg-blue-50 border border-blue-200 rounded-xl text-gray-900 shadow-lg">
                {message}
              </div>
            )}
          </div>
        </div>

        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Comment ça fonctionne
            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Notre technologie de pointe surveille les prix en permanence pour vous
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-[#1A7AC7] to-[#6BCB77] rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Surveillance 24/7</h3>
              <p className="text-gray-700">
                Notre IA analyse en continu des millions de combinaisons de vols pour détecter les meilleures opportunités
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-[#1A7AC7] to-[#6BCB77] rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19l5-5 6 6M4 19h5v5l-5-5z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Alertes instantanées</h3>
              <p className="text-gray-700">
                Recevez une notification dès qu'un vol correspond à vos critères, avec tous les détails pour réserver
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-[#1A7AC7] to-[#6BCB77] rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Économies garanties</h3>
              <p className="text-gray-700">
                Économisez jusqu'à 90% sur vos billets d'avion grâce à notre algorithme de détection des erreurs tarifaires
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Ils nous font confiance
            </h2>
            <p className="text-xl text-gray-700">
              Plus de 10 000 voyageurs économisent avec GlobeGenius
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-[#1A7AC7] to-[#6BCB77] rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-semibold">M</span>
                </div>
                <div>
                  <h4 className="text-gray-900 font-semibold">Marie D.</h4>
                  <p className="text-gray-700 text-sm">Paris</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                "J'ai économisé 800€ sur mon voyage à Tokyo grâce à GlobeGenius. L'alerte est arrivée en 2 minutes !"
              </p>
              <div className="flex text-yellow-400">
                ★★★★★
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-[#1A7AC7] to-[#6BCB77] rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-semibold">J</span>
                </div>
                <div>
                  <h4 className="text-gray-900 font-semibold">Julien R.</h4>
                  <p className="text-gray-700 text-sm">Lyon</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                "Premium vaut largement son prix. Les alertes depuis Lyon m'ont fait économiser plus de 2000€ cette année."
              </p>
              <div className="flex text-yellow-400">
                ★★★★★
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-[#1A7AC7] to-[#6BCB77] rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-semibold">S</span>
                </div>
                <div>
                  <h4 className="text-gray-900 font-semibold">Sophie L.</h4>
                  <p className="text-gray-700 text-sm">Marseille</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                "Interface claire, alertes précises, économies réelles. Exactement ce que je cherchais !"
              </p>
              <div className="flex text-yellow-400">
                ★★★★★
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">10K+</div>
                <div className="text-gray-700">Utilisateurs actifs</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">89%</div>
                <div className="text-gray-700">Économies moyennes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">24/7</div>
                <div className="text-gray-700">Surveillance</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">2M€</div>
                <div className="text-gray-700">Économisés total</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-md border-t border-white/10 py-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <img 
                src={logoGlobeGenius} 
                alt="GlobeGenius Logo" 
                className="h-16 w-auto object-contain" 
              />
            </div>
            <p className="text-gray-700 mb-6">
              Votre compagnon intelligent pour voyager moins cher
            </p>
            <div className="flex justify-center space-x-6 text-gray-700">
              <a href="#" className="hover:text-white transition-colors">Conditions</a>
              <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
              <a href="mailto:contact@globegenius.app" className="hover:text-white transition-colors">Contact</a>
            </div>
            <div className="mt-6 text-sm text-gray-500">
              © 2025 GlobeGenius. Tous droits réservés.
            </div>
          </div>
        </div>
      </footer>

      {/* Premium Modal */}
      {showPremiumForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Inscription Premium</h3>
              <button
                onClick={() => setShowPremiumForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handlePremiumSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Prénom"
                  value={premiumData.firstName}
                  onChange={(e) => setPremiumData({...premiumData, firstName: e.target.value})}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Nom"
                  value={premiumData.lastName}
                  onChange={(e) => setPremiumData({...premiumData, lastName: e.target.value})}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <input
                type="email"
                placeholder="Email"
                value={premiumData.email}
                onChange={(e) => setPremiumData({...premiumData, email: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              
              <input
                type="password"
                placeholder="Mot de passe"
                value={premiumData.password}
                onChange={(e) => setPremiumData({...premiumData, password: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aéroport régional (optionnel)
                </label>
                <select
                  value={premiumData.departureAirport || ''}
                  onChange={(e) => setPremiumData({...premiumData, departureAirport: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Aucun (Paris CDG/Orly uniquement)</option>
                  {airports.map(airport => (
                    <option key={airport.code} value={airport.code}>
                      {airport.name} ({airport.code}) - {airport.region}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  En plus des alertes depuis Paris (CDG/Orly) incluses par défaut
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#1A7AC7] to-[#6BCB77] text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Inscription...' : 'S\'inscrire Premium - 4,99€/mois'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>En vous inscrivant, vous acceptez nos conditions d'utilisation</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;