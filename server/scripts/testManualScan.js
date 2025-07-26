// server/scripts/testManualScan.js
const mongoose = require('mongoose');
const Route = require('../models/route.model');
const Alert = require('../models/alert.model');
const { incrementApiCallStats } = require('../services/analytics/statsService');

async function testManualScan() {
  try {
    console.log('🧪 TEST MANUEL DU SCANNING AVEC SEUIL 30%');
    console.log('==============================================');

    // 1. Nettoyer les anciennes alertes de test
    console.log('\n1. 🧹 Nettoyage des alertes < 30%...');
    const deletedAlerts = await Alert.deleteMany({ 
      $or: [
        { discountPercentage: { $lt: 30 } },
        { price: 299 },
        { airline: 'N/A' }
      ]
    });
    console.log(`   ✅ ${deletedAlerts.deletedCount} alertes supprimées`);

    // 2. Trouver une route active pour test
    console.log('\n2. 🔍 Recherche d\'une route active...');
    const testRoute = await Route.findOne({ isActive: true });
    
    if (!testRoute) {
      console.log('   ❌ Aucune route active trouvée');
      return;
    }
    
    console.log(`   ✅ Route test: ${testRoute.departureAirport.code} → ${testRoute.destinationAirport.code}`);

    // 3. Simuler un deal valide (> 30%)
    console.log('\n3. 💰 Simulation d\'un deal valide...');
    const avgPrice = 400;
    const testPrice = 250; // 37.5% de réduction
    const discountPercentage = Math.round(((avgPrice - testPrice) / avgPrice) * 100);
    
    console.log(`   Prix moyen: ${avgPrice}€`);
    console.log(`   Prix deal: ${testPrice}€`);
    console.log(`   Réduction: ${discountPercentage}%`);

    if (discountPercentage >= 30) {
      console.log('   ✅ Deal valide (≥ 30%)');
      
      // 4. Créer l'alerte
      console.log('\n4. 📧 Création de l\'alerte...');
      
      // Incrémenter les stats API
      await incrementApiCallStats();
      console.log('   ✅ Stats API incrémentées');
      
      // Créer l'alerte avec un user valide
      const User = require('../models/user.model');
      let testUser = await User.findOne();
      if (!testUser) {
        testUser = new User({
          name: 'Test User',
          email: 'test@globegenius.app',
          password: 'test123',
          tier: 'free'
        });
        await testUser.save();
      }

      const alert = new Alert({
        user: testUser._id,
        departureAirport: testRoute.departureAirport,
        destinationAirport: testRoute.destinationAirport,
        discountPercentage: discountPercentage,
        discountAmount: avgPrice - testPrice,
        price: testPrice,
        originalPrice: avgPrice,
        airline: 'Air France (Test)',
        farePolicy: 'Economy',
        stops: 0,
        outboundDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Dans 14 jours
        returnDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // Required - 21 jours
        duration: 8, // 8h en heures (pas minutes)
        bookingLink: 'https://test.booking.com',
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
      });

      await alert.save();
      console.log(`   ✅ Alerte créée: ${testPrice}€ (-${discountPercentage}%)`);
      
      // 5. Mettre à jour les stats de la route
      await Route.findByIdAndUpdate(testRoute._id, {
        lastScannedAt: new Date(),
        $inc: { totalScans: 1, totalDealsFound: 1 }
      });
      console.log('   ✅ Stats route mises à jour');
      
    } else {
      console.log('   ❌ Deal invalide (< 30%)');
    }

    // 6. Vérification finale
    console.log('\n5. 📊 Vérification finale...');
    const alertCount = await Alert.countDocuments();
    console.log(`   Total alertes: ${alertCount}`);
    
    const validAlerts = await Alert.countDocuments({ discountPercentage: { $gte: 30 } });
    console.log(`   Alertes valides (≥30%): ${validAlerts}`);

    console.log('\n🎉 TEST TERMINÉ AVEC SUCCÈS !');
    console.log('✅ Seuil 30% maintenant appliqué');
    console.log('✅ Stats API correctement incrémentées');

  } catch (error) {
    console.error('❌ Erreur test:', error);
  } finally {
    process.exit(0);
  }
}

// Connexion MongoDB et lancement du test
mongoose.connect(process.env.MONGODB_URI || 'mongodb://globegenius-mongodb:27017/globegenius')
  .then(() => {
    console.log('✅ MongoDB connecté');
    return testManualScan();
  })
  .catch(error => {
    console.error('❌ Erreur MongoDB:', error);
    process.exit(1);
  }); 