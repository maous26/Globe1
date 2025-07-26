// server/services/email/emailService.js
// Force dotenv config at the very beginning
require('dotenv').config();

const sgMail = require('@sendgrid/mail');
const { enrichDealWithContent } = require('../ai/dealValidationService');
// const { getBaggagePolicy } = require('../baggage/baggageImportService');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

// DEBUG: Force SendGrid API key (diagnostic)
// process.env.SENDGRID_API_KEY = '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';

// DEBUG: Affiche le début de la clé SendGrid et son type
if (process.env.SENDGRID_API_KEY) {
  console.log('SENDGRID_API_KEY (debug):', process.env.SENDGRID_API_KEY.slice(0, 6) + '...' , '| type:', typeof process.env.SENDGRID_API_KEY);
} else {
  console.log('SENDGRID_API_KEY (debug): undefined');
}

if (!process.env.SENDGRID_API_KEY) {
  try {
    require('dotenv').config();
    console.log('[emailService] dotenv chargé en fallback');
  } catch (e) {
    console.warn('[emailService] Impossible de charger dotenv:', e.message);
  }
}

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid initialized successfully');
} else {
  console.warn('⚠️  SENDGRID_API_KEY is not set or invalid. Emails will be simulated in development mode.');
}

// Cache for email templates
const templateCache = {};

/**
 * Send welcome email to free users
 * @param {Object} user - User object with email and basic info
 * @returns {Promise<boolean>} - Success status
 */
async function sendWelcomeFreeEmail(user) {
  try {
    console.log('📧 Envoi de l\'email de bienvenue gratuit à:', user.email);

    // Load welcome-free template
    const templateName = 'welcome-free';
    const templateVars = {
      email: user.email,
      departureAirport: user.departureAirport,
      premiumUpgradeLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/upgrade`,
      privacyPolicyLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/privacy`,
      unsubscribeLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/unsubscribe?email=${encodeURIComponent(user.email)}`
    };

    // Load and compile template
    const template = await loadTemplate(templateName);
    const html = template(templateVars);

    // Prepare email
    const msg = {
      to: user.email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'alertes@globegenius.app',
        name: process.env.SENDGRID_FROM_NAME || 'GlobeGenius'
      },
      subject: 'Bienvenue chez GlobeGenius ! Votre chasse aux vols à prix réduits commence maintenant',
      html: html
    };

    // Send email
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
      await sgMail.send(msg);
      console.log('✅ Email de bienvenue gratuit envoyé avec succès à:', user.email);
    } else {
      console.log('📧 [DEV] Email de bienvenue gratuit simulé pour:', user.email);
      console.log('🎯 Subject:', msg.subject);
    }

    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de bienvenue gratuit:', error);
    return false;
  }
}

/**
 * Load email template
 * @param {string} templateName - Template name
 * @returns {Promise<Function>} - Compiled Handlebars template
 */
async function loadTemplate(templateName) {
  try {
    // Check cache first
    if (templateCache[templateName]) {
      return templateCache[templateName];
    }
    
    // Load template file
    const templatePath = path.join(__dirname, `../../templates/emails/${templateName}.hbs`);
    const templateSource = await readFileAsync(templatePath, 'utf8');
    
    // Compile template
    const template = handlebars.compile(templateSource);
    
    // Cache template
    templateCache[templateName] = template;
    
    return template;
  } catch (error) {
    console.error(`Error loading email template ${templateName}:`, error);
    throw error;
  }
}

/**
 * Send welcome email to new user
 * @param {Object} user - User object
 * @param {string} setupLink - Password setup link
 * @returns {Promise<boolean>} - Success status
 */
/**
 * Send welcome email to premium users
 * @param {Object} user - User object with email and basic info
 * @returns {Promise<boolean>} - Success status
 */
async function sendWelcomePremiumEmail(user) {
  try {
    console.log('🌟 Envoi de l\'email de bienvenue Premium à:', user.email);

    // Load welcome-premium template
    const templateName = 'welcome-premium';
    const templateVars = {
      email: user.email,
      firstName: user.firstName || '',
      privacyPolicyLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/privacy`,
      dashboardLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
      unsubscribeLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/unsubscribe?email=${encodeURIComponent(user.email)}`
    };

    // Load and compile template
    const template = await loadTemplate(templateName);
    const html = template(templateVars);

    // Prepare email
    const msg = {
      to: user.email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'alertes@globegenius.app',
        name: process.env.SENDGRID_FROM_NAME || 'GlobeGenius Premium'
      },
      subject: '🌟 Bienvenue chez GlobeGenius Premium ! Votre accès exclusif aux erreurs de prix et vols à -90% est activé',
      html: html
    };

    // Send email
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
      await sgMail.send(msg);
      console.log('✅ Email de bienvenue Premium envoyé avec succès à:', user.email);
    } else {
      console.log('🌟 [DEV] Email de bienvenue Premium simulé pour:', user.email);
      console.log('🎯 Subject:', msg.subject);
    }

    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de bienvenue Premium:', error);
    return false;
  }
}

exports.sendWelcomeFreeEmail = sendWelcomeFreeEmail;
exports.sendWelcomePremiumEmail = sendWelcomePremiumEmail;

exports.sendWelcomeEmail = async (user, setupLink = null) => {
  try {

    const template = await loadTemplate('welcome');
    
    const html = template({
      firstName: user.firstName || 'Voyageur',
      setupLink: setupLink,
      isPremium: user.subscriptionType === 'premium'
    });
    
    const msg = {
      to: user.email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: process.env.SENDGRID_FROM_NAME || 'GlobeGenius',
      },
      subject: 'Bienvenue sur GlobeGenius - Découvrez les meilleurs vols !',
      html
    };
    
    await sgMail.send(msg);
    console.log('✅ Welcome email sent successfully to:', user.email);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

/**
 * Send password reset email
 * @param {Object} user - User object
 * @param {string} resetLink - Password reset link
 * @returns {Promise<boolean>} - Success status
 */
exports.sendPasswordResetEmail = async (user, resetLink) => {
  try {
    const template = await loadTemplate('password-reset');
    
    const html = template({
      firstName: user.firstName || 'Voyageur',
      resetLink
    });
    
    const msg = {
      to: user.email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: process.env.SENDGRID_FROM_NAME || 'GlobeGenius',
      },
      subject: 'Réinitialisation de votre mot de passe GlobeGenius',
      html
    };
    
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

/**
 * Send alert email
 * @param {Object} user - User object
 * @param {Object} alert - Alert object
 * @returns {Promise<boolean>} - Success status
 */
exports.sendAlertEmail = async (user, alert) => {
  try {
    // Enrich deal with content using AI (fallback to default content if AI fails)
    let enrichedAlert;
    try {
      enrichedAlert = await enrichDealWithContent({
        departureAirport: alert.departureAirport,
        destinationAirport: alert.destinationAirport,
        airline: alert.airline,
        price: alert.price,
        discountPercentage: alert.discountPercentage,
        discountAmount: alert.discountAmount,
        departureDate: alert.outboundDate,
        returnDate: alert.returnDate,
        duration: alert.duration
      });
    } catch (error) {
      console.log('AI content generation failed, using default content:', error.message);
      enrichedAlert = {
        content: {
          headline: `Vol ${alert.departureAirport.code} → ${alert.destinationAirport.code} à -${alert.discountPercentage}% !`,
          description: `Profitez d'une réduction exceptionnelle sur ce vol aller-retour vers ${alert.destinationAirport.name}.`,
          highlights: ['Vol direct disponible', 'Prix compétitif', 'Destination populaire'],
          travelTip: `Meilleure période pour visiter ${alert.destinationAirport.name}.`,
          bestFor: ['weekend getaway', 'city break']
        }
      };
    }

    // Récupérer les informations de bagages de la compagnie
    console.log('🎒 Récupération des politiques de bagages...');
    let baggageInfo;
    try {
      // const baggagePolicy = await getBaggagePolicy(alert.airline);
    const baggagePolicy = null; // Temporarily disabled
      
      if (baggagePolicy) {
        baggageInfo = {
          airline: baggagePolicy.airlineName,
          cabinBaggage: {
            dimensions: `${baggagePolicy.cabinBaggage.dimensions.length}×${baggagePolicy.cabinBaggage.dimensions.width}×${baggagePolicy.cabinBaggage.dimensions.height} cm`,
            weight: `${baggagePolicy.cabinBaggage.weight.economy} kg`,
            pieces: baggagePolicy.cabinBaggage.pieces.economy
          },
          checkedBaggage: {
            pieces: baggagePolicy.checkedBaggage.freeAllowance.economy.pieces,
            weight: `${baggagePolicy.checkedBaggage.freeAllowance.economy.weight} kg`,
            excessFee: `${baggagePolicy.checkedBaggage.excessFees.perKg}€/kg supplémentaire`
          },
          specialItems: {
            sports: baggagePolicy.specialItems.sports.allowed ? 
              `Autorisé (${baggagePolicy.specialItems.sports.fee}€)` : 'Non autorisé',
            musical: baggagePolicy.specialItems.musical.allowed ? 
              `Autorisé (${baggagePolicy.specialItems.musical.fee}€)` : 'Non autorisé'
          },
          lastUpdated: baggagePolicy.lastUpdated.toLocaleDateString('fr-FR'),
          available: true
        };
        console.log(`✅ Politique de bagages trouvée pour ${alert.airline}`);
      } else {
        throw new Error('Politique non trouvée');
      }
    } catch (error) {
      console.log(`⚠️  Politique de bagages non disponible pour ${alert.airline}:`, error.message);
      baggageInfo = {
        airline: alert.airline,
        cabinBaggage: { 
          dimensions: 'Information non disponible', 
          weight: 'Vérifier avec la compagnie', 
          pieces: 1 
        },
        checkedBaggage: { 
          pieces: 1, 
          weight: 'Vérifier avec la compagnie', 
          excessFee: 'Vérifier avec la compagnie' 
        },
        specialItems: { 
          sports: 'Vérifier avec la compagnie', 
          musical: 'Vérifier avec la compagnie' 
        },
        lastUpdated: 'Information non disponible',
        available: false
      };
    }
    
    // Load template based on subscription type
    const templateName = user.subscriptionType === 'premium' ? 'alert-premium' : 'alert-free';
    const template = await loadTemplate(templateName);
    
    // Format dates
    const formatDate = (date) => {
      const d = new Date(date);
      return d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    };
    
    // Format price
    const formatPrice = (price) => {
      return price.toLocaleString('fr-FR', {
        style: 'currency',
        currency: 'EUR'
      });
    };
    
    const html = template({
      firstName: user.firstName || 'Voyageur',
      isPremium: user.subscriptionType === 'premium',
      departure: alert.departureAirport.name,
      departureCode: alert.departureAirport.code,
      destination: alert.destinationAirport.name,
      destinationCode: alert.destinationAirport.code,
      price: formatPrice(alert.price),
      originalPrice: formatPrice(alert.originalPrice),
      discount: alert.discountPercentage,
      discountAmount: formatPrice(alert.discountAmount),
      outboundDate: formatDate(alert.outboundDate),
      returnDate: formatDate(alert.returnDate),
      duration: alert.duration,
      airline: alert.airline,
      farePolicy: alert.farePolicy,
      stops: alert.stops,
      bookingLink: alert.bookingLink,
      expiryDate: formatDate(alert.expiryDate),
      alternativeDates: (alert.alternativeDates || []).map(date => ({
        outbound: formatDate(date.outbound),
        return: formatDate(date.return)
      })),
      headline: enrichedAlert.content?.headline || `Vol ${alert.departureAirport.code} → ${alert.destinationAirport.code} à -${alert.discountPercentage}% !`,
      description: enrichedAlert.content?.description || `Profitez d'une réduction exceptionnelle sur ce vol aller-retour vers ${alert.destinationAirport.name}.`,
      highlights: enrichedAlert.content?.highlights || [],
      travelTip: enrichedAlert.content?.travelTip || '',
      bestFor: enrichedAlert.content?.bestFor || [],
      baggage: baggageInfo
    });
    
    const msg = {
      to: user.email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: process.env.SENDGRID_FROM_NAME || 'GlobeGenius Alerts',
      },
      subject: `Vol à -${alert.discountPercentage}% : ${alert.departureAirport.code} → ${alert.destinationAirport.code} à ${formatPrice(alert.price)}`,
      html
    };
    
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending alert email:', error);
    return false;
  }
};

/**
 * Send subscription upgrade confirmation
 * @param {Object} user - User object
 * @returns {Promise<boolean>} - Success status
 */
exports.sendUpgradeConfirmation = async (user) => {
  try {
    const template = await loadTemplate('upgrade-confirmation');
    
    const html = template({
      firstName: user.firstName || 'Voyageur'
    });
    
    const msg = {
      to: user.email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: process.env.SENDGRID_FROM_NAME || 'GlobeGenius',
      },
      subject: 'Bienvenue sur GlobeGenius Premium !',
      html
    };
    
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending upgrade confirmation email:', error);
    return false;
  }
};

/**
 * Create email templates in the filesystem
 * @returns {Promise<boolean>} - Success status
 */
exports.initializeEmailTemplates = async () => {
  try {
    // Create templates directory if it doesn't exist
    const templatesDir = path.join(__dirname, '../../templates/emails');
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }
    
    // Define templates
    const templates = {
      'welcome': `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur GlobeGenius</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .logo { max-width: 150px; }
    .content { padding: 20px; background: #f9f9f9; border-radius: 5px; }
    .footer { text-align: center; font-size: 12px; color: #999; padding: 20px 0; }
    .button { display: inline-block; padding: 10px 20px; background: #4A90E2; color
    // server/services/email/emailService.js (suite)
    .button { display: inline-block; padding: 10px 20px; background: #4A90E2; color: white; text-decoration: none; border-radius: 5px; }
    .highlight { background: #f0f7ff; border-left: 4px solid #4A90E2; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://[YOUR-LOGO-URL]" alt="GlobeGenius" class="logo">
      <h1>Bienvenue sur GlobeGenius !</h1>
    </div>
    <div class="content">
      <p>Bonjour {{firstName}},</p>
      <p>Merci de vous être inscrit à GlobeGenius, votre nouvel allié pour découvrir les meilleurs vols au départ de la France !</p>
      
      <div class="highlight">
        <h3>Comment ça marche ?</h3>
        <p>Nous analysons en permanence les tarifs aériens et vous alertons dès qu'une offre exceptionnelle correspond à vos critères.</p>
      </div>
      
      {{#if setupLink}}
      <p>Pour finaliser votre inscription, veuillez configurer votre mot de passe :</p>
      <p style="text-align: center;">
        <a href="{{setupLink}}" class="button">Configurer mon compte</a>
      </p>
      {{/if}}
      
      {{#if isPremium}}
      <div class="highlight">
        <h3>Votre compte Premium est activé !</h3>
        <p>Profitez d'un nombre illimité d'alertes et accédez aux réductions allant jusqu'à 90% !</p>
      </div>
      {{else}}
      <p>Vous bénéficiez actuellement du forfait gratuit (3 alertes/jour, réductions jusqu'à 50%).</p>
      <p>Pour recevoir toutes les alertes sans limite et accéder aux réductions allant jusqu'à 90%, pensez à passer à la <a href="https://[YOUR-DOMAIN]/upgrade">version Premium</a> !</p>
      {{/if}}
      
      <p>À très bientôt pour vos premières alertes de voyage !</p>
      <p>L'équipe GlobeGenius</p>
    </div>
    <div class="footer">
      <p>© 2025 GlobeGenius. Tous droits réservés.</p>
      <p>Si vous avez des questions, contactez-nous à contact@globegenius.com</p>
    </div>
  </div>
</body>
</html>
      `,
      
      'password-reset': `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de votre mot de passe GlobeGenius</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .logo { max-width: 150px; }
    .content { padding: 20px; background: #f9f9f9; border-radius: 5px; }
    .footer { text-align: center; font-size: 12px; color: #999; padding: 20px 0; }
    .button { display: inline-block; padding: 10px 20px; background: #4A90E2; color: white; text-decoration: none; border-radius: 5px; }
    .warning { background: #fff6f6; border-left: 4px solid #e24a4a; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://[YOUR-LOGO-URL]" alt="GlobeGenius" class="logo">
      <h1>Réinitialisation de votre mot de passe</h1>
    </div>
    <div class="content">
      <p>Bonjour {{firstName}},</p>
      <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte GlobeGenius.</p>
      
      <p>Pour définir un nouveau mot de passe, veuillez cliquer sur le bouton ci-dessous :</p>
      <p style="text-align: center;">
        <a href="{{resetLink}}" class="button">Réinitialiser mon mot de passe</a>
      </p>
      
      <div class="warning">
        <p>Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
      </div>
      
      <p>À bientôt,</p>
      <p>L'équipe GlobeGenius</p>
    </div>
    <div class="footer">
      <p>© 2025 GlobeGenius. Tous droits réservés.</p>
      <p>Si vous avez des questions, contactez-nous à contact@globegenius.com</p>
    </div>
  </div>
</body>
</html>
      `,
      
      'alert-free': `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerte Vol GlobeGenius : {{departure}} → {{destination}}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .logo { max-width: 150px; }
    .content { padding: 20px; background: #f9f9f9; border-radius: 5px; }
    .footer { text-align: center; font-size: 12px; color: #999; padding: 20px 0; }
    .button { display: inline-block; padding: 10px 20px; background: #4A90E2; color: white; text-decoration: none; border-radius: 5px; }
    .deal-header { background: #4A90E2; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
    .deal-content { border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; padding: 15px; }
    .price { font-size: 24px; font-weight: bold; color: #e24a4a; }
    .discount { background: #e24a4a; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
    .details { margin: 20px 0; }
    .detail-row { display: flex; border-bottom: 1px solid #eee; padding: 8px 0; }
    .detail-label { flex: 1; font-weight: bold; }
    .detail-value { flex: 2; }
    .upgrade-banner { background: #f0f7ff; border: 1px solid #c0d7ff; padding: 15px; margin: 20px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://[YOUR-LOGO-URL]" alt="GlobeGenius" class="logo">
      <h1>Alerte Vol Exceptionnel !</h1>
    </div>
    <div class="content">
      <p>Bonjour {{firstName}},</p>
      
      <div class="deal-header">
        <h2>{{headline}}</h2>
      </div>
      <div class="deal-content">
        <p>{{description}}</p>
        
        <div style="text-align: center; margin: 20px 0;">
          <span class="price">{{price}}</span>
          <span style="text-decoration: line-through; color: #999; margin-left: 10px;">{{originalPrice}}</span>
          <span class="discount">-{{discount}}%</span>
        </div>
        
        <div class="details">
          <div class="detail-row">
            <div class="detail-label">Trajet :</div>
            <div class="detail-value">{{departure}} ({{departureCode}}) → {{destination}} ({{destinationCode}})</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Dates :</div>
            <div class="detail-value">{{outboundDate}} → {{returnDate}} ({{duration}} jours)</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Compagnie :</div>
            <div class="detail-value">{{airline}}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Tarif :</div>
            <div class="detail-value">{{farePolicy}}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Escales :</div>
            <div class="detail-value">{{#if stops}}{{stops}}{{else}}Vol direct{{/if}}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Économie :</div>
            <div class="detail-value">{{discountAmount}}</div>
          </div>
        </div>
        
        {{#if highlights.length}}
        <div style="margin: 20px 0;">
          <h3>À savoir sur {{destination}} :</h3>
          <ul>
            {{#each highlights}}
            <li>{{this}}</li>
            {{/each}}
          </ul>
        </div>
        {{/if}}
        
        {{#if travelTip}}
        <div style="background: #f9f9e0; padding: 10px; border-radius: 5px; margin: 20px 0;">
          <strong>Conseil voyage :</strong> {{travelTip}}
        </div>
        {{/if}}
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="{{bookingLink}}" class="button">Réserver ce vol</a>
        </p>
        
        <p style="font-size: 12px; color: #999;">Cette offre expire le {{expiryDate}}. Prix et disponibilités susceptibles de changer.</p>
      </div>
      
      <div class="upgrade-banner">
        <h3>Passez à Premium pour recevoir toutes les alertes !</h3>
        <p>Avec votre compte gratuit, vous ne recevez que les offres entre 30% et 50% de réduction, limitées à 3 par jour.</p>
        <p>Pour accéder à toutes les offres jusqu'à 90% de réduction sans limite quotidienne, passez à Premium pour seulement 4,99€ !</p>
        <p style="text-align: center; margin-top: 15px;">
          <a href="https://[YOUR-DOMAIN]/upgrade" class="button" style="background: #e24a4a;">Passer à Premium</a>
        </p>
      </div>
    </div>
    <div class="footer">
      <p>© 2025 GlobeGenius. Tous droits réservés.</p>
      <p>Si vous ne souhaitez plus recevoir ces alertes, <a href="https://[YOUR-DOMAIN]/unsubscribe">cliquez ici</a>.</p>
    </div>
  </div>
</body>
</html>
      `,
      
      'alert-premium': `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerte Vol GlobeGenius Premium : {{departure}} → {{destination}}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .logo { max-width: 150px; }
    .content { padding: 20px; background: #f9f9f9; border-radius: 5px; }
    .footer { text-align: center; font-size: 12px; color: #999; padding: 20px 0; }
    .button { display: inline-block; padding: 10px 20px; background: #4A90E2; color: white; text-decoration: none; border-radius: 5px; }
    .deal-header { background: #6B46C1; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
    .deal-content { border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; padding: 15px; }
    .price { font-size: 24px; font-weight: bold; color: #e24a4a; }
    .discount { background: #e24a4a; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
    .details { margin: 20px 0; }
    .detail-row { display: flex; border-bottom: 1px solid #eee; padding: 8px 0; }
    .detail-label { flex: 1; font-weight: bold; }
    .detail-value { flex: 2; }
    .premium-tag { background: #6B46C1; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold; display: inline-block; margin-bottom: 15px; }
    .alt-dates { background: #f0f7ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://[YOUR-LOGO-URL]" alt="GlobeGenius" class="logo">
      <h1>Alerte Vol Premium !</h1>
    </div>
    <div class="content">
      <p>Bonjour {{firstName}},</p>
      
      <span class="premium-tag">ACCÈS PREMIUM</span>
      
      <div class="deal-header">
        <h2>{{headline}}</h2>
      </div>
      <div class="deal-content">
        <p>{{description}}</p>
        
        <div style="text-align: center; margin: 20px 0;">
          <span class="price">{{price}}</span>
          <span style="text-decoration: line-through; color: #999; margin-left: 10px;">{{originalPrice}}</span>
          <span class="discount">-{{discount}}%</span>
        </div>
        
        <div class="details">
          <div class="detail-row">
            <div class="detail-label">Trajet :</div>
            <div class="detail-value">{{departure}} ({{departureCode}}) → {{destination}} ({{destinationCode}})</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Dates :</div>
            <div class="detail-value">{{outboundDate}} → {{returnDate}} ({{duration}} jours)</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Compagnie :</div>
            <div class="detail-value">{{airline}}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Tarif :</div>
            <div class="detail-value">{{farePolicy}}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Escales :</div>
            <div class="detail-value">{{#if stops}}{{stops}}{{else}}Vol direct{{/if}}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Économie :</div>
            <div class="detail-value">{{discountAmount}}</div>
          </div>
        </div>
        
        {{#if alternativeDates.length}}
        <div class="alt-dates">
          <h3>Dates alternatives au même prix :</h3>
          <ul>
            {{#each alternativeDates}}
            <li>{{this.outbound}} → {{this.return}}</li>
            {{/each}}
          </ul>
        </div>
        {{/if}}
        
        {{#if highlights.length}}
        <div style="margin: 20px 0;">
          <h3>À savoir sur {{destination}} :</h3>
          <ul>
            {{#each highlights}}
            <li>{{this}}</li>
            {{/each}}
          </ul>
        </div>
        {{/if}}
        
        {{#if travelTip}}
        <div style="background: #f9f9e0; padding: 10px; border-radius: 5px; margin: 20px 0;">
          <strong>Conseil voyage :</strong> {{travelTip}}
        </div>
        {{/if}}
        
        {{#if bestFor.length}}
        <div style="margin: 15px 0;">
          <strong>Idéal pour :</strong> {{bestFor}}
        </div>
        {{/if}}
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="{{bookingLink}}" class="button">Réserver ce vol</a>
        </p>
        
        <p style="font-size: 12px; color: #999;">Cette offre expire le {{expiryDate}}. Prix et disponibilités susceptibles de changer.</p>
      </div>
    </div>
    <div class="footer">
      <p>© 2025 GlobeGenius. Tous droits réservés.</p>
      <p>Si vous ne souhaitez plus recevoir ces alertes, <a href="https://[YOUR-DOMAIN]/unsubscribe">cliquez ici</a>.</p>
    </div>
  </div>
</body>
</html>
      `,
      
      'upgrade-confirmation': `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur GlobeGenius Premium !</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .logo { max-width: 150px; }
    .content { padding: 20px; background: #f9f9f9; border-radius: 5px; }
    .footer { text-align: center; font-size: 12px; color: #999; padding: 20px 0; }
    .button { display: inline-block; padding: 10px 20px; background: #4A90E2; color: white; text-decoration: none; border-radius: 5px; }
    .benefits { background: #f0f7ff; border-left: 4px solid #6B46C1; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://[YOUR-LOGO-URL]" alt="GlobeGenius" class="logo">
      <h1>Bienvenue sur GlobeGenius Premium !</h1>
    </div>
    <div class="content">
      <p>Bonjour {{firstName}},</p>
      <p>Félicitations ! Votre compte GlobeGenius a été mis à niveau vers <strong>Premium</strong>.</p>
      
      <div class="benefits">
        <h3>Vos avantages Premium :</h3>
        <ul>
          <li><strong>Alertes illimitées</strong> - Recevez toutes les opportunités de vols sans restriction</li>
          <li><strong>Réductions exclusives</strong> - Accédez aux offres avec jusqu'à 90% de réduction</li>
          <li><strong>Dates alternatives</strong> - Découvrez toutes les options aux meilleurs prix</li>
          <li><strong>Contenu personnalisé</strong> - Profitez de conseils voyage adaptés à vos destinations</li>
        </ul>
      </div>
      
      <p>Votre abonnement Premium est maintenant actif. Les prochaines alertes seront envoyées selon vos préférences, avec des offres encore plus exceptionnelles !</p>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="https://[YOUR-DOMAIN]/dashboard" class="button">Accéder à mon tableau de bord</a>
      </p>
      
      <p>Merci de votre confiance, et bon voyage !</p>
      <p>L'équipe GlobeGenius</p>
    </div>
    <div class="footer">
      <p>© 2025 GlobeGenius. Tous droits réservés.</p>
      <p>Si vous avez des questions, contactez-nous à contact@globegenius.com</p>
    </div>
  </div>
</body>
</html>
      `
    };
    
    // Write template files
    for (const [name, content] of Object.entries(templates)) {
      const filePath = path.join(templatesDir, `${name}.hbs`);
      await promisify(fs.writeFile)(filePath, content, 'utf8');
    }
    
    console.log('Email templates initialized');
    return true;
  } catch (error) {
    console.error('Error initializing email templates:', error);
    return false;
  }
};