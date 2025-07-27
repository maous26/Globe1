#!/bin/bash

# GlobeGenius Deployment Script
# Usage: ./deploy.sh [dev|prod] [setup|deploy|update]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-"dev"}
ACTION=${2:-"deploy"}
VPS_USER="root"
VPS_HOST=""
VPS_PATH="/opt/globegenius"

# Load configuration
if [[ -f "deploy.config" ]]; then
    source deploy.config
fi

# Functions
print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE} GlobeGenius Deployment - $1${NC}"
    echo -e "${BLUE}================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if VPS configuration is set
check_vps_config() {
    if [[ -z "$VPS_HOST" ]]; then
        print_error "VPS_HOST not configured. Please create deploy.config file."
        echo "Example deploy.config:"
        echo "VPS_HOST=your-vps-ip"
        echo "VPS_USER=root"
        echo "VPS_PATH=/opt/globegenius"
        exit 1
    fi
}

# Setup VPS environment
setup_vps() {
    print_header "Setting up VPS for $ENVIRONMENT"
    
    echo "Installing Docker and dependencies..."
    ssh $VPS_USER@$VPS_HOST << 'EOF'
        # Update system
        apt update && apt upgrade -y
        
        # Install Docker
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        systemctl enable docker
        systemctl start docker
        
        # Install Docker Compose
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        
        # Install Nginx
        apt install nginx -y
        systemctl enable nginx
        
        # Install Certbot for SSL
        apt install certbot python3-certbot-nginx -y
        
        # Install Git
        apt install git -y
        
        # Create project directory
        mkdir -p /opt/globegenius/{dev,prod,nginx,ssl,backups}
EOF
    
    print_success "VPS setup completed"
}

# Deploy application
deploy_app() {
    print_header "Deploying $ENVIRONMENT environment"
    
    # Create deployment package
    echo "Creating deployment package..."
    tar -czf globegenius-$ENVIRONMENT.tar.gz \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=*.log \
        --exclude=uploads \
        .
    
    # Upload to VPS
    echo "Uploading to VPS..."
    scp globegenius-$ENVIRONMENT.tar.gz $VPS_USER@$VPS_HOST:$VPS_PATH/
    
    # Deploy on VPS
    echo "Deploying on VPS..."
    ssh $VPS_USER@$VPS_HOST << EOF
        cd $VPS_PATH
        
        # Backup current deployment
        if [[ -d "$ENVIRONMENT" ]]; then
            cp -r $ENVIRONMENT backups/$ENVIRONMENT-\$(date +%Y%m%d-%H%M%S)
        fi
        
        # Extract new deployment
        rm -rf $ENVIRONMENT
        mkdir -p $ENVIRONMENT
        tar -xzf globegenius-$ENVIRONMENT.tar.gz -C $ENVIRONMENT
        rm globegenius-$ENVIRONMENT.tar.gz
        
        cd $ENVIRONMENT
        
        # Set up environment file
        if [[ ! -f ".env.$ENVIRONMENT" ]]; then
            echo "Creating .env.$ENVIRONMENT template..."
            cat > .env.$ENVIRONMENT << 'EOE'
# $ENVIRONMENT Environment Variables
JWT_SECRET_$(echo $ENVIRONMENT | tr '[:lower:]' '[:upper:]')=your-jwt-secret-here
MONGO_ROOT_USERNAME=globegenius
MONGO_ROOT_PASSWORD=your-secure-password
SENDGRID_API_KEY=your-sendgrid-api-key
FLIGHT_API_BASE_URL=https://app.goflightlabs.com
FLIGHT_API_KEY=your-flight-api-key
OPENAI_API_KEY=your-openai-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key
EMAIL_FROM=noreply@globegenius.com
EOE
            echo "⚠️  Please edit .env.$ENVIRONMENT with your actual values"
        fi
        
        # Build and start containers
        docker-compose -f docker-compose.$ENVIRONMENT.yml --env-file .env.$ENVIRONMENT build
        docker-compose -f docker-compose.$ENVIRONMENT.yml --env-file .env.$ENVIRONMENT up -d
        
        # Setup Nginx configuration
        cp nginx/sites-available/globegenius-$ENVIRONMENT.conf /etc/nginx/sites-available/
        ln -sf /etc/nginx/sites-available/globegenius-$ENVIRONMENT.conf /etc/nginx/sites-enabled/
        
        # Test Nginx configuration
        nginx -t && systemctl reload nginx
EOF
    
    # Cleanup
    rm globegenius-$ENVIRONMENT.tar.gz
    
    print_success "$ENVIRONMENT deployment completed"
}

# Update application
update_app() {
    print_header "Updating $ENVIRONMENT environment"
    
    ssh $VPS_USER@$VPS_HOST << EOF
        cd $VPS_PATH/$ENVIRONMENT
        
        # Pull latest changes (if using git)
        git pull origin $(if [ "$ENVIRONMENT" = "prod" ]; then echo "main"; else echo "dev"; fi)
        
        # Rebuild and restart
        docker-compose -f docker-compose.$ENVIRONMENT.yml --env-file .env.$ENVIRONMENT build
        docker-compose -f docker-compose.$ENVIRONMENT.yml --env-file .env.$ENVIRONMENT up -d
EOF
    
    print_success "$ENVIRONMENT update completed"
}

# Main execution
main() {
    print_header "GlobeGenius Deployment Tool"
    
    if [[ ! "$ENVIRONMENT" =~ ^(dev|prod)$ ]]; then
        print_error "Invalid environment. Use 'dev' or 'prod'"
        exit 1
    fi
    
    check_vps_config
    
    case $ACTION in
        "setup")
            setup_vps
            ;;
        "deploy")
            deploy_app
            ;;
        "update")
            update_app
            ;;
        *)
            print_error "Invalid action. Use 'setup', 'deploy', or 'update'"
            exit 1
            ;;
    esac
    
    print_success "All operations completed successfully!"
    
    echo ""
    echo "Next steps:"
    echo "1. Configure your domains in DNS to point to your VPS"
    echo "2. Run SSL setup: certbot --nginx -d your-domain.com"
    echo "3. Edit environment variables in .env.$ENVIRONMENT"
    echo "4. Access your application:"
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        echo "   - Frontend: https://app.globegenius.com"
        echo "   - API: https://api.globegenius.com"
    else
        echo "   - Frontend: https://dev.globegenius.com"
        echo "   - API: https://dev-api.globegenius.com"
    fi
}

# Run main function
main "$@" 