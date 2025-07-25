#!/bin/bash

# GlobeGenius - Script de démarrage rapide
# Usage: ./start-globegenius.sh [option]
# Options:
#   --build    : Reconstruction complète des images
#   --clean    : Nettoyage et redémarrage complet
#   --logs     : Affichage des logs en temps réel
#   --stop     : Arrêt de l'application

set -e

echo "🌍 GlobeGenius - Gestionnaire d'application"
echo "=========================================="

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérification que Docker est en cours d'exécution
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker n'est pas en cours d'exécution. Veuillez démarrer Docker."
        exit 1
    fi
}

# Fonction de nettoyage complet
clean_start() {
    log_info "Nettoyage complet de l'application..."
    docker-compose down --volumes --remove-orphans
    docker system prune -f
    log_success "Nettoyage terminé"
}

# Fonction de construction
build_app() {
    log_info "Construction des images Docker..."
    docker-compose build --no-cache
    log_success "Construction terminée"
}

# Fonction de démarrage
start_app() {
    log_info "Démarrage de l'application GlobeGenius..."
    
    # Vérification du fichier .env
    if [ ! -f ".env" ]; then
        log_warning "Fichier .env manquant. Création à partir du template..."
        cp docker.env.example .env
        log_success "Fichier .env créé. Veuillez le configurer selon vos besoins."
    fi
    
    # Démarrage des services
    docker-compose up -d
    
    # Attente du démarrage
    log_info "Attente du démarrage des services..."
    sleep 15
    
    # Vérification de l'état des services
    log_info "Vérification de l'état des services..."
    docker-compose ps
    
    # Initialisation de la base de données
    log_info "Initialisation de la base de données..."
    docker-compose exec -T globegenius-backend node scripts/seedDatabase.js
    
    # Tests de connectivité
    log_info "Test de connectivité..."
    
    # Test API Backend
    if curl -s http://localhost:3001/api/health >/dev/null; then
        log_success "Backend API accessible sur http://localhost:3001"
    else
        log_error "Backend API non accessible"
    fi
    
    # Test Frontend
    if curl -s http://localhost:3000/ >/dev/null; then
        log_success "Frontend accessible sur http://localhost:3000"
    else
        log_error "Frontend non accessible"
    fi
}

# Fonction d'arrêt
stop_app() {
    log_info "Arrêt de l'application..."
    docker-compose down
    log_success "Application arrêtée"
}

# Fonction pour afficher les logs
show_logs() {
    log_info "Affichage des logs en temps réel (Ctrl+C pour quitter)..."
    docker-compose logs -f
}

# Fonction d'état
show_status() {
    echo ""
    log_info "État des services:"
    docker-compose ps
    
    echo ""
    log_info "Utilisateurs par défaut:"
    echo "  👤 Admin: admin@globegenius.com / password123"
    echo "  👤 User:  user@example.com / password123"
    
    echo ""
    log_info "URLs d'accès:"
    echo "  🌐 Frontend: http://localhost:3000"
    echo "  🔧 Backend:  http://localhost:3001"
    echo "  📊 API Docs: http://localhost:3001/api/health"
}

# Traitement des arguments
case "${1:-start}" in
    --build)
        check_docker
        build_app
        start_app
        show_status
        ;;
    --clean)
        check_docker
        clean_start
        build_app
        start_app
        show_status
        ;;
    --logs)
        check_docker
        show_logs
        ;;
    --stop)
        check_docker
        stop_app
        ;;
    --status)
        check_docker
        show_status
        ;;
    start|*)
        check_docker
        start_app
        show_status
        ;;
esac

echo ""
log_success "🚀 GlobeGenius est prêt !"
echo ""