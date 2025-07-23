# 🐳 GlobeGenius Docker Deployment

Ce guide vous explique comment déployer GlobeGenius en utilisant Docker et Docker Compose.

## 📋 Prérequis

- **Docker** (version 20.10+)
- **Docker Compose** (version 2.0+)
- Au moins **4GB de RAM** disponible
- **Ports libres** : 3000, 3001, 8081, 27017, 6379

## 🚀 Déploiement rapide

### 1. Configurer les variables d'environnement

```bash
# Copier le fichier d'exemple
cp docker.env.example .env

# Éditer le fichier .env avec vos vraies clés API
nano .env
```

**Variables obligatoires à renseigner :**
- `JWT_SECRET` : Clé secrète pour JWT (min 32 caractères)
- `SENDGRID_API_KEY` : Votre clé SendGrid pour l'envoi d'emails
- `FLIGHT_API_KEY` : Votre clé FlightLabs pour les données de vols
- `GOOGLE_AI_API_KEY` : Votre clé Google AI pour Gemini
- `OPENAI_API_KEY` : Votre clé OpenAI pour GPT

### 2. Lancer l'application

```bash
# Construire et démarrer tous les services
docker-compose up -d

# Voir les logs en temps réel
docker-compose logs -f
```

### 3. Vérifier le déploiement

- **Frontend** : http://localhost:3000
- **API Backend** : http://localhost:3001/api/health
- **Mongo Express** : http://localhost:8081 (optionnel, avec --profile tools)

## 🏗️ Architecture des services

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │
│   (React/Nginx) │◄──►│   (Node.js)     │
│   Port: 3000    │    │   Port: 3001    │
└─────────────────┘    └─────────────────┘
         │                       │
         └─────────┬─────────────┘
                   │
    ┌─────────────────┐    ┌─────────────────┐
    │   MongoDB       │    │   Redis         │
    │   Port: 27017   │    │   Port: 6379    │
    └─────────────────┘    └─────────────────┘
```

## 📦 Services inclus

### `globegenius-frontend`
- **Image** : Custom (React + Nginx)
- **Port** : 3000
- **Fonction** : Interface utilisateur et proxy API

### `globegenius-backend` 
- **Image** : Custom (Node.js)
- **Port** : 3001 (interne)
- **Fonction** : API REST, logique métier, monitoring des routes

### `globegenius-mongodb`
- **Image** : mongo:7.0
- **Port** : 27017 (interne)
- **Fonction** : Base de données principale

### `globegenius-redis`
- **Image** : redis:7.2-alpine  
- **Port** : 6379 (interne)
- **Fonction** : Cache et sessions

### `mongo-express` (optionnel)
- **Image** : mongo-express:1.0.0
- **Port** : 8081
- **Fonction** : Interface d'administration MongoDB

## 🛠️ Commandes utiles

### Gestion des services

```bash
# Démarrer tous les services
docker-compose up -d

# Démarrer avec Mongo Express
docker-compose --profile tools up -d

# Arrêter tous les services
docker-compose down

# Redémarrer un service spécifique
docker-compose restart globegenius-backend

# Voir les logs d'un service
docker-compose logs -f globegenius-backend
```

### Debugging et maintenance

```bash
# Accéder au conteneur backend
docker-compose exec globegenius-backend sh

# Vérifier l'état des services
docker-compose ps

# Voir l'utilisation des ressources
docker stats

# Nettoyer les données (⚠️ supprime tout)
docker-compose down -v
docker system prune -a
```

### Base de données

```bash
# Backup MongoDB
docker-compose exec globegenius-mongodb mongodump --out /backup

# Restore MongoDB  
docker-compose exec globegenius-mongodb mongorestore /backup

# Se connecter à MongoDB
docker-compose exec globegenius-mongodb mongosh globegenius
```

## 🔧 Configuration avancée

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `NODE_ENV` | Environnement Node.js | `production` |
| `MONGODB_URI` | URI de connexion MongoDB | Auto-configuré |
| `REDIS_URL` | URL de connexion Redis | Auto-configuré |
| `JWT_SECRET` | Secret pour JWT | **Obligatoire** |
| `SENDGRID_API_KEY` | Clé API SendGrid | **Obligatoire** |

### Customisation des ports

```yaml
# Dans docker-compose.yml
services:
  globegenius-frontend:
    ports:
      - "8080:3000"  # Frontend sur port 8080
```

### Volumes persistants

Les données sont stockées dans des volumes Docker :
- `mongodb_data` : Données MongoDB
- `redis_data` : Données Redis

## 🚨 Résolution de problèmes

### Service qui ne démarre pas

```bash
# Vérifier les logs
docker-compose logs service_name

# Vérifier la configuration
docker-compose config
```

### Erreurs de connexion base de données

```bash
# Vérifier que MongoDB est démarré
docker-compose ps globegenius-mongodb

# Tester la connexion
docker-compose exec globegenius-mongodb mongosh --eval "db.runCommand('ping')"
```

### Problèmes de mémoire

```bash
# Augmenter la limite mémoire Docker
# Dans Docker Desktop : Settings > Resources > Memory > 6GB+
```

## 🔒 Sécurité

### En production

1. **Changez tous les mots de passe par défaut**
2. **Utilisez HTTPS** (certificats SSL/TLS)
3. **Configurez un reverse proxy** (Nginx, Traefik)
4. **Activez la sauvegarde automatique**
5. **Limitez l'accès réseau** (firewall)

### Variables sensibles

```bash
# Générer un JWT secret sécurisé
openssl rand -base64 32

# Ne jamais committer le fichier .env
echo ".env" >> .gitignore
```

## 📈 Monitoring

### Health checks

Tous les services ont des health checks configurés :

```bash
# Vérifier la santé des services
docker-compose ps
```

### Métriques

- **Frontend** : Logs Nginx dans les conteneurs
- **Backend** : Logs applicatifs + monitoring route
- **MongoDB** : Métriques intégrées
- **Redis** : Statistiques Redis

## 🚀 Déploiement en production

### Avec Docker Swarm

```bash
# Initialiser un swarm
docker swarm init

# Déployer la stack
docker stack deploy -c docker-compose.yml globegenius
```

### Avec Kubernetes

Convertir avec **Kompose** :

```bash
kompose convert -f docker-compose.yml
kubectl apply -f .
```

---

## 📞 Support

Pour toute question ou problème :
1. Vérifiez les logs : `docker-compose logs`
2. Consultez la documentation
3. Ouvrez une issue sur GitHub

**🎉 Votre application GlobeGenius est maintenant containerisée et prête pour la production !** 