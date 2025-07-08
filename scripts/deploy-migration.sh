#!/bin/bash

# Migration Deployment Script
# Production deployment automation for healthcare data migration system

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/logs/deployment-$(date +%Y%m%d-%H%M%S).log"
CONFIG_DIR="${SCRIPT_DIR}/config"
VALIDATION_DIR="${SCRIPT_DIR}/validation"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "${LOG_FILE}"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "${LOG_FILE}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "${LOG_FILE}"
}

# Error handling
handle_error() {
    local exit_code=$?
    log_error "Deployment failed with exit code ${exit_code}"
    log_error "Check log file: ${LOG_FILE}"
    exit ${exit_code}
}

trap handle_error ERR

# Usage function
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy the healthcare data migration system to production environment.

OPTIONS:
    -e, --environment ENV    Target environment (development|staging|production)
    -c, --config FILE        Configuration file path
    -d, --dry-run           Perform dry run without actual deployment
    -v, --validate-only     Only run validation checks
    -h, --help              Show this help message
    --skip-validation       Skip pre-deployment validation
    --skip-backup          Skip backup creation
    --force                Force deployment even with warnings

EXAMPLES:
    $0 --environment production
    $0 --environment staging --dry-run
    $0 --validate-only --environment production

EOF
}

# Default values
ENVIRONMENT=""
CONFIG_FILE=""
DRY_RUN=false
VALIDATE_ONLY=false
SKIP_VALIDATION=false
SKIP_BACKUP=false
FORCE_DEPLOYMENT=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -c|--config)
            CONFIG_FILE="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -v|--validate-only)
            VALIDATE_ONLY=true
            shift
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --force)
            FORCE_DEPLOYMENT=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "${ENVIRONMENT}" ]]; then
    log_error "Environment is required. Use -e or --environment option."
    usage
    exit 1
fi

# Validate environment
case "${ENVIRONMENT}" in
    development|staging|production)
        ;;
    *)
        log_error "Invalid environment: ${ENVIRONMENT}. Must be one of: development, staging, production"
        exit 1
        ;;
esac

# Set configuration file if not provided
if [[ -z "${CONFIG_FILE}" ]]; then
    CONFIG_FILE="${CONFIG_DIR}/environment-config.ts"
fi

# Create logs directory
mkdir -p "${PROJECT_ROOT}/logs"

log "Starting migration system deployment"
log "Environment: ${ENVIRONMENT}"
log "Configuration: ${CONFIG_FILE}"
log "Dry run: ${DRY_RUN}"
log "Log file: ${LOG_FILE}"

# Function to check prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        return 1
    fi
    
    # Check if Yarn is installed
    if ! command -v yarn &> /dev/null; then
        log_error "Yarn is not installed"
        return 1
    fi
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        return 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        return 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available"
        return 1
    fi
    
    # Check if configuration file exists
    if [[ ! -f "${CONFIG_FILE}" ]]; then
        log_error "Configuration file not found: ${CONFIG_FILE}"
        return 1
    fi
    
    log_success "Prerequisites check passed"
    return 0
}

# Function to validate environment configuration
validate_environment() {
    log "Validating environment configuration..."
    
    # Run TypeScript validation
    if ! yarn run ts-node "${VALIDATION_DIR}/pre-migration-validation.ts" --environment "${ENVIRONMENT}"; then
        log_error "Environment validation failed"
        return 1
    fi
    
    log_success "Environment validation passed"
    return 0
}

# Function to setup database schema
setup_database_schema() {
    log "Setting up database schema..."
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "DRY RUN: Would setup database schema"
        return 0
    fi
    
    # Run database migrations
    if ! yarn run supabase db push; then
        log_error "Database schema setup failed"
        return 1
    fi
    
    log_success "Database schema setup completed"
    return 0
}

# Function to build application
build_application() {
    log "Building application..."
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "DRY RUN: Would build application"
        return 0
    fi
    
    # Install dependencies
    if ! yarn install --frozen-lockfile; then
        log_error "Failed to install dependencies"
        return 1
    fi
    
    # Build application
    if ! yarn run build; then
        log_error "Application build failed"
        return 1
    fi
    
    log_success "Application build completed"
    return 0
}

# Function to deploy Docker containers
deploy_containers() {
    log "Deploying Docker containers..."
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "DRY RUN: Would deploy Docker containers"
        return 0
    fi
    
    # Build and deploy containers
    if ! docker-compose -f docker/migration/docker-compose.yml --env-file .env.${ENVIRONMENT} up -d --build; then
        log_error "Container deployment failed"
        return 1
    fi
    
    log_success "Container deployment completed"
    return 0
}

# Function to run health checks
run_health_checks() {
    log "Running health checks..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ ${attempt} -le ${max_attempts} ]]; do
        log "Health check attempt ${attempt}/${max_attempts}"
        
        # Check if migration service is healthy
        if docker-compose -f docker/migration/docker-compose.yml ps | grep -q "healthy"; then
            log_success "Health checks passed"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done
    
    log_error "Health checks failed after ${max_attempts} attempts"
    return 1
}

# Function to create backup
create_backup() {
    if [[ "${SKIP_BACKUP}" == "true" ]]; then
        log "Skipping backup creation"
        return 0
    fi
    
    log "Creating pre-deployment backup..."
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "DRY RUN: Would create backup"
        return 0
    fi
    
    # Run backup script
    if ! yarn run ts-node "${SCRIPT_DIR}/backup/backup-recovery.ts" --create-backup --environment "${ENVIRONMENT}"; then
        log_error "Backup creation failed"
        return 1
    fi
    
    log_success "Backup created successfully"
    return 0
}

# Function to setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "DRY RUN: Would setup monitoring"
        return 0
    fi
    
    # Setup monitoring configuration
    if ! yarn run ts-node "${SCRIPT_DIR}/monitoring/migration-monitoring.ts" --setup --environment "${ENVIRONMENT}"; then
        log_error "Monitoring setup failed"
        return 1
    fi
    
    log_success "Monitoring setup completed"
    return 0
}

# Function to generate documentation
generate_documentation() {
    log "Generating deployment documentation..."
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "DRY RUN: Would generate documentation"
        return 0
    fi
    
    # Generate documentation
    if ! yarn run ts-node "${SCRIPT_DIR}/docs/generate-migration-docs.ts" --environment "${ENVIRONMENT}"; then
        log_error "Documentation generation failed"
        return 1
    fi
    
    log_success "Documentation generated successfully"
    return 0
}

# Main deployment function
main() {
    log "=== Migration System Deployment Started ==="
    
    # Check prerequisites
    if ! check_prerequisites; then
        log_error "Prerequisites check failed"
        exit 1
    fi
    
    # Run validation if not skipped
    if [[ "${SKIP_VALIDATION}" == "false" ]]; then
        if ! validate_environment; then
            if [[ "${FORCE_DEPLOYMENT}" == "false" ]]; then
                log_error "Environment validation failed. Use --force to override."
                exit 1
            else
                log_warning "Environment validation failed but continuing due to --force flag"
            fi
        fi
    fi
    
    # If validate-only flag is set, exit after validation
    if [[ "${VALIDATE_ONLY}" == "true" ]]; then
        log_success "Validation completed successfully"
        exit 0
    fi
    
    # Create backup
    if ! create_backup; then
        log_error "Backup creation failed"
        exit 1
    fi
    
    # Build application
    if ! build_application; then
        log_error "Application build failed"
        exit 1
    fi
    
    # Setup database schema
    if ! setup_database_schema; then
        log_error "Database schema setup failed"
        exit 1
    fi
    
    # Deploy containers
    if ! deploy_containers; then
        log_error "Container deployment failed"
        exit 1
    fi
    
    # Run health checks
    if ! run_health_checks; then
        log_error "Health checks failed"
        exit 1
    fi
    
    # Setup monitoring
    if ! setup_monitoring; then
        log_warning "Monitoring setup failed but continuing deployment"
    fi
    
    # Generate documentation
    if ! generate_documentation; then
        log_warning "Documentation generation failed but continuing deployment"
    fi
    
    log_success "=== Migration System Deployment Completed Successfully ==="
    log "Deployment log: ${LOG_FILE}"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "This was a dry run. No actual changes were made."
    fi
}

# Run main function
main "$@"