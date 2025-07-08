#!/bin/bash

# Healthcare Data Migration Docker Setup Script
# This script validates and sets up the complete Docker migration environment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

log_info "Healthcare Data Migration Docker Setup"
log_info "Script directory: $SCRIPT_DIR"
log_info "Project root: $PROJECT_ROOT"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate required tools
validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    local missing_tools=()
    
    if ! command_exists docker; then
        missing_tools+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_tools+=("docker-compose")
    fi
    
    if ! command_exists openssl; then
        missing_tools+=("openssl")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_error "Please install the missing tools and run this script again."
        exit 1
    fi
    
    log_success "All prerequisites are installed"
}

# Function to validate Docker files
validate_docker_files() {
    log_info "Validating Docker configuration files..."
    
    local required_files=(
        "Dockerfile"
        "docker-compose.yml"
        "entrypoint.sh"
        "healthcheck.sh"
        "prometheus.yml"
        "nginx.conf"
        "grafana/datasources/prometheus.yml"
        "grafana/dashboards/dashboard.yml"
        "grafana/dashboards/json/migration-system-dashboard.json"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$SCRIPT_DIR/$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        log_error "Missing required Docker files:"
        for file in "${missing_files[@]}"; do
            log_error "  - $file"
        done
        exit 1
    fi
    
    log_success "All required Docker files are present"
}

# Function to validate docker-compose.yml syntax
validate_docker_compose() {
    log_info "Validating docker-compose.yml syntax..."
    
    cd "$SCRIPT_DIR"
    
    if docker-compose config >/dev/null 2>&1; then
        log_success "docker-compose.yml syntax is valid"
    else
        log_error "docker-compose.yml syntax validation failed"
        docker-compose config
        exit 1
    fi
}

# Function to create required directories
create_directories() {
    log_info "Creating required directories..."
    
    local directories=(
        "logs"
        "backups"
        "temp"
        "ssl"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$SCRIPT_DIR/$dir" ]; then
            mkdir -p "$SCRIPT_DIR/$dir"
            log_info "Created directory: $dir"
        fi
    done
    
    log_success "All required directories are ready"
}

# Function to set proper file permissions
set_permissions() {
    log_info "Setting proper file permissions..."
    
    # Make scripts executable
    chmod +x "$SCRIPT_DIR/entrypoint.sh"
    chmod +x "$SCRIPT_DIR/healthcheck.sh"
    chmod +x "$SCRIPT_DIR/setup.sh"
    
    # Set directory permissions
    chmod 755 "$SCRIPT_DIR/logs"
    chmod 755 "$SCRIPT_DIR/backups"
    chmod 755 "$SCRIPT_DIR/temp"
    chmod 755 "$SCRIPT_DIR/ssl"
    
    log_success "File permissions set correctly"
}

# Function to generate development SSL certificates
generate_dev_ssl() {
    log_info "Checking SSL certificates..."
    
    if [ ! -f "$SCRIPT_DIR/ssl/cert.pem" ] || [ ! -f "$SCRIPT_DIR/ssl/key.pem" ]; then
        log_warning "SSL certificates not found. Generating self-signed certificates for development..."
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$SCRIPT_DIR/ssl/key.pem" \
            -out "$SCRIPT_DIR/ssl/cert.pem" \
            -subj "/C=US/ST=State/L=City/O=Healthcare Migration/CN=localhost" \
            >/dev/null 2>&1
        
        openssl dhparam -out "$SCRIPT_DIR/ssl/dhparam.pem" 2048 >/dev/null 2>&1
        
        # Set proper permissions for SSL files
        chmod 600 "$SCRIPT_DIR/ssl/key.pem"
        chmod 644 "$SCRIPT_DIR/ssl/cert.pem"
        chmod 644 "$SCRIPT_DIR/ssl/dhparam.pem"
        
        log_success "Development SSL certificates generated"
    else
        log_success "SSL certificates already exist"
    fi
}

# Function to validate environment variables
validate_environment() {
    log_info "Validating environment configuration..."
    
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_warning ".env file not found in project root"
        log_info "Creating sample .env file..."
        
        cat > "$PROJECT_ROOT/.env.sample" << 'EOF'
# Healthcare Data Migration Environment Configuration

# Application Settings
NODE_ENV=development
APP_PORT=3000
LOG_LEVEL=info

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Legacy Database Configuration
LEGACY_DB_HOST=localhost
LEGACY_DB_PORT=5432
LEGACY_DB_NAME=legacy_mdw
LEGACY_DB_USER=migration_user
LEGACY_DB_PASSWORD=secure_password
LEGACY_DB_SSL=false

# Migration Settings
MIGRATION_BATCH_SIZE=1000
MIGRATION_MAX_RETRIES=3
MIGRATION_TIMEOUT_MS=300000
MIGRATION_PARALLEL_WORKERS=1

# Security
ENCRYPTION_KEY=your_32_character_encryption_key
JWT_SECRET=your_jwt_secret_key

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
PROMETHEUS_PORT=9091
GRAFANA_PORT=3001
GRAFANA_PASSWORD=admin123

# Storage Paths
HOST_LOGS_PATH=./docker/migration/logs
HOST_BACKUPS_PATH=./docker/migration/backups
HOST_TEMP_PATH=./docker/migration/temp

# Resource Limits
MAX_MEMORY_USAGE_MB=2048
MAX_CPU_CORES=2
CONNECTION_POOL_SIZE=10
QUERY_TIMEOUT_MS=30000

# Email Notifications (Optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
NOTIFICATION_EMAIL=
EOF
        
        log_warning "Sample environment file created at $PROJECT_ROOT/.env.sample"
        log_warning "Please copy it to .env and configure your actual values"
    else
        log_success "Environment file found"
    fi
}

# Function to test Docker connectivity
test_docker() {
    log_info "Testing Docker connectivity..."
    
    if docker info >/dev/null 2>&1; then
        log_success "Docker is running and accessible"
    else
        log_error "Docker is not running or not accessible"
        log_error "Please start Docker and run this script again"
        exit 1
    fi
}

# Function to pull required Docker images
pull_images() {
    log_info "Pulling required Docker images..."
    
    local images=(
        "node:18-alpine"
        "redis:7-alpine"
        "prom/prometheus:latest"
        "grafana/grafana:latest"
        "nginx:alpine"
    )
    
    for image in "${images[@]}"; do
        log_info "Pulling $image..."
        if docker pull "$image" >/dev/null 2>&1; then
            log_success "Pulled $image"
        else
            log_warning "Failed to pull $image (will be pulled during build)"
        fi
    done
}

# Function to build the application image
build_application() {
    log_info "Building application Docker image..."
    
    cd "$SCRIPT_DIR"
    
    if docker-compose build migration-app; then
        log_success "Application image built successfully"
    else
        log_error "Failed to build application image"
        exit 1
    fi
}

# Function to run validation tests
run_validation_tests() {
    log_info "Running validation tests..."
    
    cd "$SCRIPT_DIR"
    
    # Test docker-compose configuration
    if docker-compose config --quiet; then
        log_success "Docker Compose configuration is valid"
    else
        log_error "Docker Compose configuration validation failed"
        return 1
    fi
    
    # Test that all services can be created (dry run)
    if docker-compose up --no-start >/dev/null 2>&1; then
        log_success "All services can be created successfully"
        docker-compose down >/dev/null 2>&1
    else
        log_error "Service creation test failed"
        return 1
    fi
}

# Function to display usage information
show_usage() {
    cat << EOF

Healthcare Data Migration Docker Setup Complete!

Next steps:
1. Configure your .env file with actual values
2. Start the migration system:
   cd docker/migration
   docker-compose up -d

3. Access the services:
   - Migration App: http://localhost:3000
   - Grafana Dashboard: http://localhost:3001 (admin/admin123)
   - Prometheus: http://localhost:9091

4. For development mode:
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

5. To stop the system:
   docker-compose down

6. To view logs:
   docker-compose logs -f [service-name]

For more information, see the documentation in the ssl/ directory.

EOF
}

# Main execution
main() {
    log_info "Starting Healthcare Data Migration Docker setup..."
    
    validate_prerequisites
    validate_docker_files
    create_directories
    set_permissions
    generate_dev_ssl
    validate_environment
    test_docker
    validate_docker_compose
    pull_images
    
    if [ "${1:-}" = "--build" ]; then
        build_application
        run_validation_tests
    fi
    
    log_success "Setup completed successfully!"
    show_usage
}

# Run main function with all arguments
main "$@"