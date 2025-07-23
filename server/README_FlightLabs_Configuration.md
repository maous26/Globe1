# Configuration de l'API FlightLabs pour GlobeGenius

## Vue d'ensemble

GlobeGenius a été configuré pour utiliser l'API FlightLabs pour obtenir des données de vol en temps réel. Cependant, la configuration nécessite une clé API valide et la bonne URL de base.

## Configuration requise

### Variables d'environnement

Créez un fichier `.env` dans le dossier `server/` avec les variables suivantes :

```env
# Base de données
MONGODB_URI=mongodb://localhost:27017/globegenius

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# SendGrid pour les emails (optionnel)
SENDGRID_API_KEY=your_sendgrid_api_key_here

# Configuration API FlightLabs
FLIGHT_API_URL=https://app.goflightlabs.com/api/v1
FLIGHT_API_KEY=your_flightlabs_api_key_here

# Configuration du serveur
PORT=3001
NODE_ENV=development

# Configuration email
DEFAULT_EMAIL_RECIPIENT=alertes@globegenius.app

# Redis (optionnel, pour le cache)
REDIS_URL=redis://localhost:6379
```

### Obtenir une clé API FlightLabs

1. Rendez-vous sur [GoFlightLabs](https://goflightlabs.com/)
2. Créez un compte et souscrivez à un plan
3. Obtenez votre clé API depuis le tableau de bord
4. Remplacez `your_flightlabs_api_key_here` par votre vraie clé API

## Endpoints disponibles

Les endpoints de test suivants sont disponibles une fois l'API configurée :

### Test de connectivité
```bash
GET /api/flights/test/all
```
Suite de tests complète de l'API FlightLabs

### Test des aéroports
```bash
GET /api/flights/test/airports
```
Test de récupération des aéroports

### Test d'un aéroport spécifique
```bash
GET /api/flights/test/airport/:code
```
Test de récupération d'un aéroport par code IATA (ex: CDG)

### Test des compagnies aériennes
```bash
GET /api/flights/test/airlines
```
Test de récupération des compagnies aériennes

### Test des aéroports français
```bash
GET /api/flights/test/airports/french
```
Test de récupération des aéroports français

### Test de recherche de vols
```bash
GET /api/flights/test/flights/:origin/:destination
```
Test de recherche de vols entre deux aéroports (ex: CDG/LHR)

## Dépannage

### Erreur 404
- Vérifiez que l'URL de base est correcte
- Vérifiez que votre clé API est valide
- Consultez la documentation officielle de FlightLabs pour les endpoints corrects

### Erreur 401 (Unauthorized)
- Vérifiez que votre clé API est valide et non expirée
- Vérifiez que vous avez les permissions nécessaires sur votre plan FlightLabs

### Erreur 429 (Rate Limit)
- Vous avez dépassé les limites de votre plan
- Attendez ou améliorez votre plan FlightLabs

## Structure de l'API

Les services sont organisés comme suit :

- `server/services/flight/flightService.js` - Service principal pour les vols
- `server/services/flight/airportService.js` - Service pour les aéroports
- `server/routes/flight.routes.js` - Routes d'API pour les tests
- `server/config.env.template` - Template de configuration

## Note importante

L'API actuelle est configurée pour des tests de base. Pour une utilisation en production, vous devrez peut-être :

1. Ajuster les endpoints selon la documentation officielle de FlightLabs
2. Implémenter une gestion d'erreur plus robuste
3. Ajouter un système de cache Redis pour optimiser les performances
4. Configurer des limites de taux appropriées

## Contact

Pour toute question technique, contactez alertes@globegenius.app 