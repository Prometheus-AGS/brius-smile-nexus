#!/bin/bash

# Healthcare Data Migration System - Container Entrypoint Script
# Handles container startup, environment setup, and migration execution

set -euo pipefail

# Configuration
readonly SCRIPT_NAME="$(basename "$0")"
readonly LOG_FILE="/app/logs/entrypoint.log"
readonly PID_FILE="/app/temp/migration.pid"
readonly HEALTH_CHECK_FILE="/app/temp/health.status"

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "$@"
}

log_warn() {
    log "WARN" "$@"
}

log_error() {
    log "ERROR" "$@"
}

log_debug() {
    if [[ "${LOG_LEVEL:-info}" == "debug" ]]; then
        log "DEBUG" "$@"
    fi
}

# Error handling
handle_error() {
    local exit_code=$?
    local line_number=$1
    log_error "Script failed at line $line_number with exit code $exit_code"
    cleanup_on_exit
    exit $exit_code
}

trap 'handle_error $LINENO' ERR

# Signal handlers for graceful shutdown
cleanup_on_exit() {
    log_info "Performing cleanup..."
    
    # Stop any running migration processes
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Stopping migration process (PID: $pid)"
            kill -TERM "$pid" 2>/dev/null || true
            
            # Wait for graceful shutdown
            local timeout=30
            while kill -0 "$pid" 2>/dev/null && [[ $timeout -gt 0 ]]; do
                sleep 1
                ((timeout--))
            done
            
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                log_warn "Force killing migration process"
                kill -KILL "$pid" 2>/dev/null || true
            fi
        fi
        rm -f "$PID_FILE"
    fi
    
    # Update health status
    echo "STOPPED" > "$HEALTH_CHECK_FILE"
    
    log_info "Cleanup completed"
}

trap cleanup_on_exit EXIT
trap 'log_info "Received SIGTERM, initiating graceful shutdown..."; cleanup_on_exit; exit 0' TERM
trap 'log_info "Received SIGINT, initiating graceful shutdown..."; cleanup_on_exit; exit 0' INT

# Environment validation
validate_environment() {
    log_info "Validating environment configuration..."
    
    local required_vars=(
        "NODE_ENV"
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "LEGACY_DB_HOST"
        "LEGACY_DB_PORT"
        "LEGACY_DB_NAME"
        "LEGACY_DB_USER"
        "LEGACY_DB_PASSWORD"
        "ENCRYPTION_KEY"
        "JWT_SECRET"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        return 1
    fi
    
    # Validate database connectivity
    log_info "Testing legacy database connectivity..."
    if ! pg_isready -h "$LEGACY_DB_HOST" -p "$LEGACY_DB_PORT" -U "$LEGACY_DB_USER" -t 10; then
        log_error "Cannot connect to legacy database at $LEGACY_DB_HOST:$LEGACY_DB_PORT"
        return 1
    fi
    
    # Validate Supabase connectivity
    log_info "Testing Supabase connectivity..."
    if ! curl -f -s -o /dev/null --max-time 10 \
        -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
        "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/"; then
        log_error "Cannot connect to Supabase at $NEXT_PUBLIC_SUPABASE_URL"
        return 1
    fi
    
    log_info "Environment validation completed successfully"
}

# System initialization
initialize_system() {
    log_info "Initializing migration system..."
    
    # Create necessary directories
    mkdir -p /app/logs /app/backups /app/temp
    
    # Set proper permissions
    chmod 755 /app/logs /app/backups /app/temp
    
    # Initialize health status
    echo "INITIALIZING" > "$HEALTH_CHECK_FILE"
    
    # Set default environment variables
    export NODE_ENV="${NODE_ENV:-production}"
    export LOG_LEVEL="${LOG_LEVEL:-info}"
    export MIGRATION_BATCH_SIZE="${MIGRATION_BATCH_SIZE:-1000}"
    export MIGRATION_MAX_RETRIES="${MIGRATION_MAX_RETRIES:-3}"
    export MIGRATION_TIMEOUT_MS="${MIGRATION_TIMEOUT_MS:-300000}"
    export MIGRATION_PARALLEL_WORKERS="${MIGRATION_PARALLEL_WORKERS:-1}"
    export MAX_MEMORY_USAGE_MB="${MAX_MEMORY_USAGE_MB:-2048}"
    export CONNECTION_POOL_SIZE="${CONNECTION_POOL_SIZE:-10}"
    export QUERY_TIMEOUT_MS="${QUERY_TIMEOUT_MS:-30000}"
    export ENABLE_METRICS="${ENABLE_METRICS:-true}"
    export METRICS_PORT="${METRICS_PORT:-9090}"
    
    # Configure Node.js memory limits
    export NODE_OPTIONS="--max-old-space-size=${MAX_MEMORY_USAGE_MB}"
    
    log_info "System initialization completed"
}

# Health monitoring setup
setup_health_monitoring() {
    log_info "Setting up health monitoring..."
    
    # Start metrics server if enabled
    if [[ "${ENABLE_METRICS:-true}" == "true" ]]; then
        log_info "Starting metrics server on port ${METRICS_PORT:-9090}"
        # Metrics server will be started by the main application
    fi
    
    echo "HEALTHY" > "$HEALTH_CHECK_FILE"
    log_info "Health monitoring setup completed"
}

# Migration execution modes
execute_migration() {
    log_info "Starting migration execution..."
    
    # Update health status
    echo "RUNNING" > "$HEALTH_CHECK_FILE"
    
    # Build command based on environment and parameters
    local cmd="node"
    local args=()
    
    if [[ "$NODE_ENV" == "development" ]]; then
        cmd="node"
        args+=("--inspect=0.0.0.0:9229")
    fi
    
    # Add the main script
    args+=("scripts/execute-migration.js")
    
    # Add migration-specific arguments
    args+=(
        "--environment" "$NODE_ENV"
        "--batch-size" "${MIGRATION_BATCH_SIZE}"
        "--max-retries" "${MIGRATION_MAX_RETRIES}"
        "--timeout" "${MIGRATION_TIMEOUT_MS}"
        "--parallel-workers" "${MIGRATION_PARALLEL_WORKERS}"
        "--log-level" "${LOG_LEVEL}"
        "--output-format" "console"
        "--report-file" "/app/logs/migration-report-$(date +%Y%m%d-%H%M%S).json"
    )
    
    # Add conditional flags
    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        args+=("--dry-run")
    fi
    
    if [[ "${SKIP_VALIDATION:-false}" == "true" ]]; then
        args+=("--skip-validation")
    fi
    
    if [[ "${CONTINUE_ON_ERROR:-false}" == "true" ]]; then
        args+=("--continue-on-error")
    fi
    
    if [[ "${ROLLBACK_ON_FAILURE:-true}" == "true" ]]; then
        args+=("--rollback-on-failure")
    fi
    
    # Execute migration
    log_info "Executing command: $cmd ${args[*]}"
    
    # Start the migration process in background and capture PID
    "$cmd" "${args[@]}" &
    local migration_pid=$!
    echo "$migration_pid" > "$PID_FILE"
    
    log_info "Migration process started with PID: $migration_pid"
    
    # Wait for the migration to complete
    if wait "$migration_pid"; then
        log_info "Migration completed successfully"
        echo "COMPLETED" > "$HEALTH_CHECK_FILE"
        rm -f "$PID_FILE"
        return 0
    else
        local exit_code=$?
        log_error "Migration failed with exit code: $exit_code"
        echo "FAILED" > "$HEALTH_CHECK_FILE"
        rm -f "$PID_FILE"
        return $exit_code
    fi
}

# Development mode
run_development() {
    log_info "Starting development mode..."
    
    echo "DEVELOPMENT" > "$HEALTH_CHECK_FILE"
    
    # Watch for file changes and restart
    exec node --inspect=0.0.0.0:9229 scripts/execute-migration.js \
        --environment development \
        --log-level debug \
        --interactive \
        --dry-run
}

# Service mode (long-running)
run_service() {
    log_info "Starting service mode..."
    
    echo "SERVICE" > "$HEALTH_CHECK_FILE"
    
    # Start the main application server
    exec node dist/main.js
}

# Main execution logic
main() {
    log_info "Starting $SCRIPT_NAME..."
    log_info "Container started with command: $*"
    log_info "Environment: $NODE_ENV"
    log_info "User: $(whoami)"
    log_info "Working directory: $(pwd)"
    
    # Initialize system
    initialize_system
    
    # Validate environment
    validate_environment
    
    # Setup health monitoring
    setup_health_monitoring
    
    # Determine execution mode
    local mode="${1:-migration}"
    
    case "$mode" in
        "migration")
            execute_migration
            ;;
        "development")
            run_development
            ;;
        "service")
            run_service
            ;;
        "health")
            # Health check mode
            if [[ -f "$HEALTH_CHECK_FILE" ]]; then
                cat "$HEALTH_CHECK_FILE"
            else
                echo "UNKNOWN"
            fi
            ;;
        "bash"|"sh")
            # Interactive shell mode
            log_info "Starting interactive shell..."
            exec /bin/bash
            ;;
        *)
            log_error "Unknown mode: $mode"
            log_info "Available modes: migration, development, service, health, bash"
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"