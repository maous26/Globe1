// server/scripts/createAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
require('dotenv').config();

const createAdmin = async () => {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/globegenius');
    console.log('✅ Connecté à MongoDB');

    // Vérifier si un admin existe déjà
    const existingAdmin = await User.findOne({ email: 'admin@globegenius.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Un admin existe déjà avec cet email');
      
      // Mettre à jour pour s'assurer qu'il est admin
      existingAdmin.isAdmin = true;
      await existingAdmin.save();
      console.log('✅ Droits admin confirmés');
    } else {
      // Créer un nouvel admin
      const hashedPassword = await bcrypt.hash('admin123456', 10);
      
      const admin = new User({
        email: 'admin@globegenius.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'GlobeGenius',
        isAdmin: true,
        subscriptionType: 'premium',
        departureAirports: ['CDG', 'ORY'],
        includeCDG: true,
        preferences: {
          notificationEmail: true,
          notificationFrequency: 'immediate',
          preferredDepartureTime: 'any',
          preferredTravelClass: 'economy',
          maxStops: 2
        }
      });
      
      await admin.save();
      console.log('✅ Administrateur créé avec succès!');
      console.log('📧 Email: admin@globegenius.com');
      console.log('🔑 Mot de passe: admin123456');
    }
    
    // Afficher les stats
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ isAdmin: true });
    
    console.log(`\n📊 Statistiques:`);
    console.log(`   - Total utilisateurs: ${totalUsers}`);
    console.log(`   - Total admins: ${totalAdmins}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Déconnexion de MongoDB');
  }
};

// Exécuter le script
createAdmin();

// Instructions d'utilisation
console.log(`
🚀 Script de création d'administrateur GlobeGenius
================================================

Ce script va créer un compte administrateur avec les informations suivantes:
- Email: admin@globegenius.com  
- Mot de passe: admin123456
- Droits: Admin complet
- Abonnement: Premium

Appuyez sur Ctrl+C pour annuler ou attendez...
`);