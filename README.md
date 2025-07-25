# 🌍 GlobeGenius

**Votre assistant intelligent pour trouver les meilleurs deals de vols**

GlobeGenius est une application web moderne qui utilise l'IA pour analyser et recommander les meilleures offres de vols, avec un système d'alertes personnalisées et une interface d'administration complète.

## ✨ Fonctionnalités

### 🎯 Pour les utilisateurs
- **Recherche de vols intelligente** avec IA
- **Alertes personnalisées** par email
- **Comparaison de prix** en temps réel
- **Abonnements** Gratuit et Premium
- **Interface responsive** et moderne

### 🛠️ Pour les administrateurs
- **Dashboard d'administration** complet
- **Gestion des utilisateurs** et abonnements
- **Statistiques détaillées** des API
- **Gestion des routes** et optimisation
- **Historique des alertes** et conversions

### 🤖 Intelligence Artificielle
- **Gemini Flash** pour l'optimisation des routes
- **GPT-4o Mini** pour la validation des offres
- **Analyse prédictive** des tendances de prix
- **Recommandations personnalisées**

## 🚀 Démarrage rapide

### Prérequis
- **Docker** et **Docker Compose** installés
- **Git** pour cloner le repository
- **8 GB RAM** minimum recommandé

### Installation

1. **Cloner le repository**
```bash
git clone https://github.com/votre-username/globegenius.git
cd globegenius
```

2. **Démarrer l'application**
```bash
# Démarrage simple
./start-globegenius.sh

# Ou avec reconstruction complète
./start-globegenius.sh --build

# Ou avec nettoyage complet
./start-globegenius.sh --clean
```

3. **Accéder à l'application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## 🔧 Configuration

### Variables d'environnement

Le fichier `.env` sera créé automatiquement lors du premier démarrage. Vous pouvez le personnaliser :

```bash
# JWT Configuration
JWT_SECRET=your_jwt_secret_here

# Email Service (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=alertes@yourdomain.com

# API de vols
FLIGHT_API_KEY=your_flightlabs_api_key

# Services IA
GOOGLE_AI_API_KEY=your_google_ai_api_key
OPENAI_API_KEY=your_openai_api_key

# Base de données (par défaut pour Docker)
MONGO_ROOT_PASSWORD=secure_mongo_password_123
REDIS_PASSWORD=secure_redis_password_123
```

## 👥 Comptes par défaut

L'application est initialisée avec deux comptes de test :

### 👑 Administrateur
- **Email**: `admin@globegenius.com`
- **Mot de passe**: `password123`
- **Accès**: Dashboard admin complet

### 👤 Utilisateur
- **Email**: `user@example.com`
- **Mot de passe**: `password123`
- **Accès**: Interface utilisateur standard

## 📋 Commandes utiles

### Gestion de l'application
```bash
# Démarrer l'application
./start-globegenius.sh

# Voir les logs en temps réel
./start-globegenius.sh --logs

# Voir l'état des services
./start-globegenius.sh --status

# Arrêter l'application
./start-globegenius.sh --stop

# Reconstruction complète
./start-globegenius.sh --build

# Nettoyage et redémarrage
./start-globegenius.sh --clean
```

### Commandes Docker manuelles
```bash
# Construire les images
docker-compose build

# Démarrer en arrière-plan
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down

# Nettoyer les volumes
docker-compose down --volumes
```

### Développement
```bash
# Accéder au conteneur backend
docker-compose exec globegenius-backend sh

# Accéder à MongoDB
docker-compose exec globegenius-mongodb mongosh

# Accéder à Redis
docker-compose exec globegenius-redis redis-cli

# Exécuter les tests
docker-compose exec globegenius-backend npm test
```

## 🏗️ Architecture

### Stack technique
- **Frontend**: React 18, Tailwind CSS, Recharts
- **Backend**: Node.js, Express, MongoDB
- **Cache**: Redis pour les sessions et cache
- **Containerisation**: Docker avec Docker Compose
- **IA**: Google Gemini + OpenAI GPT-4
- **Email**: SendGrid pour les notifications

### Structure du projet
```
globegenius/
├── client/                 # Application React
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── pages/         # Pages de l'application
│   │   ├── services/      # Services API
│   │   └── contexts/      # Contextes React
│   └── public/            # Fichiers statiques
├── server/                # API Node.js
│   ├── controllers/       # Logique métier
│   ├── models/           # Modèles MongoDB
│   ├── routes/           # Routes API
│   ├── services/         # Services (IA, email, etc.)
│   └── scripts/          # Scripts utilitaires
├── docker/               # Configuration Docker
└── scripts/              # Scripts de déploiement
```

## 🔌 API Endpoints

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription gratuite
- `POST /api/auth/register-premium` - Inscription premium
- `GET /api/auth/me` - Profil utilisateur
- `POST /api/auth/reset-password` - Reset mot de passe

### Vols et alertes
- `GET /api/flights/search` - Recherche de vols
- `POST /api/alerts` - Créer une alerte
- `GET /api/alerts` - Lister les alertes
- `DELETE /api/alerts/:id` - Supprimer une alerte

### Administration
- `GET /api/admin/users` - Gestion des utilisateurs
- `GET /api/admin/routes` - Gestion des routes
- `GET /api/admin/api-stats` - Statistiques API
- `GET /api/admin/alerts` - Historique des alertes

## 🐛 Dépannage

### Problèmes courants

**Port déjà utilisé**
```bash
# Libérer les ports
sudo lsof -ti:3000,3001 | xargs sudo kill -9
```

**Problèmes de permissions Docker**
```bash
# Redémarrer Docker
sudo systemctl restart docker
# ou sur macOS
open -a Docker
```

**Base de données corrompue**
```bash
# Réinitialiser complètement
./start-globegenius.sh --clean
```

**Problèmes de build**
```bash
# Nettoyer le cache Docker
docker system prune -af
docker-compose build --no-cache
```

### Logs et debugging
```bash
# Logs détaillés de tous les services
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f globegenius-backend

# Logs avec horodatage
docker-compose logs -f -t
```

## 🔒 Sécurité

### Bonnes pratiques
- Changez les mots de passe par défaut en production
- Configurez des clés JWT sécurisées
- Utilisez HTTPS en production
- Limitez l'accès aux ports de base de données
- Configurez un firewall approprié

### Variables sensibles
Assurez-vous de ne jamais commiter :
- Clés API (SendGrid, OpenAI, Google)
- Mots de passe de base de données
- Secrets JWT
- Certificats SSL

## 📊 Monitoring

### Health checks
- **Application**: http://localhost:3001/api/health
- **Base de données**: Inclus dans le health check
- **Redis**: Inclus dans le health check
- **Services externes**: Status dans l'API

### Métriques disponibles
- Temps de réponse API
- Utilisation des quotas IA
- Taux de conversion des alertes
- Performances des requêtes
- Usage des endpoints

## 🤝 Contribution

### Développement local
```bash
# Cloner et installer
git clone https://github.com/votre-username/globegenius.git
cd globegenius

# Installer les dépendances
npm install
cd client && npm install
cd ../server && npm install

# Démarrer en mode développement
./start-globegenius.sh --build
```

### Standards de code
- **ESLint** pour JavaScript/React
- **Prettier** pour le formatage (.prettierrc configuré)
- **Conventional Commits** pour les messages
- **Tests** obligatoires pour les nouvelles fonctionnalités

## 📄 Licence

MIT License - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/votre-username/globegenius/issues)
- **Documentation**: [Wiki](https://github.com/votre-username/globegenius/wiki)
- **Email**: support@globegenius.com

---

**Fait avec ❤️ pour les voyageurs intelligents**
