#!/bin/bash

# Healthcare Data Migration System - Health Check Script
# Provides comprehensive health monitoring for the migration container

set -euo pipefail

# Configuration
readonly SCRIPT_NAME="$(basename "$0")"
readonly HEALTH_CHECK_FILE="/app/temp/health.status"
readonly PID_FILE="/app/temp/migration.pid"
readonly LOG_FILE="/app/logs/healthcheck.log"
readonly METRICS_PORT="${METRICS_PORT:-9090}"
readonly APP_PORT="${APP_PORT:-3000}"
readonly HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-10}"

# Health check result codes
readonly HC_SUCCESS=0
readonly HC_WARNING=1
readonly HC_CRITICAL=2
readonly HC_UNKNOWN=3

# Logging function
log_health() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    echo "[$timestamp] [HEALTH] [$level] $message" >> "$LOG_FILE" 2>/dev/null || true
}

# Check if a service is responding on a given port
check_port() {
    local host="${1:-localhost}"
    local port="$2"
    local timeout="${3:-5}"
    
    if timeout "$timeout" bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Check HTTP endpoint health
check_http_endpoint() {
    local url="$1"
    local expected_status="${2:-200}"
    local timeout="${3:-10}"
    
    local response
    if response=$(curl -s -w "%{http_code}" -o /dev/null --max-time "$timeout" "$url" 2>/dev/null); then
        if [[ "$response" == "$expected_status" ]]; then
            return 0
        else
            log_health "WARN" "HTTP endpoint $url returned status $response, expected $expected_status"
            return 1
        fi
    else
        log_health "ERROR" "Failed to connect to HTTP endpoint $url"
        return 1
    fi
}

# Check database connectivity
check_database_connectivity() {
    log_health "DEBUG" "Checking database connectivity..."
    
    # Check legacy database
    if [[ -n "${LEGACY_DB_HOST:-}" && -n "${LEGACY_DB_PORT:-}" ]]; then
        if pg_isready -h "$LEGACY_DB_HOST" -p "$LEGACY_DB_PORT" -U "${LEGACY_DB_USER:-postgres}" -t 5 >/dev/null 2>&1; then
            log_health "DEBUG" "Legacy database connection: OK"
        else
            log_health "ERROR" "Legacy database connection: FAILED"
            return $HC_CRITICAL
        fi
    fi
    
    # Check Supabase connectivity
    if [[ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" && -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
        if check_http_endpoint "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/" 200 5; then
            log_health "DEBUG" "Supabase connection: OK"
        else
            log_health "ERROR" "Supabase connection: FAILED"
            return $HC_CRITICAL
        fi
    fi
    
    return $HC_SUCCESS
}

# Check application process health
check_process_health() {
    log_health "DEBUG" "Checking process health..."
    
    # Check if migration process is running (if PID file exists)
    if [[ -f "$PID_FILE" ]]; then
        local pid
        pid=$(cat "$PID_FILE" 2>/dev/null || echo "")
        
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            log_health "DEBUG" "Migration process (PID: $pid): RUNNING"
            
            # Check if process is responsive (not hung)
            local proc_stat
            if proc_stat=$(ps -o pid,pcpu,pmem,etime,stat --no-headers -p "$pid" 2>/dev/null); then
                log_health "DEBUG" "Process stats: $proc_stat"
                
                # Check if process is in uninterruptible sleep (D state) for too long
                if echo "$proc_stat" | grep -q " D "; then
                    log_health "WARN" "Migration process appears to be in uninterruptible sleep"
                    return $HC_WARNING
                fi
            fi
        else
            log_health "WARN" "Migration process PID file exists but process not running"
            return $HC_WARNING
        fi
    fi
    
    return $HC_SUCCESS
}

# Check system resources
check_system_resources() {
    log_health "DEBUG" "Checking system resources..."
    
    # Check memory usage
    local memory_info
    if memory_info=$(free -m 2>/dev/null); then
        local total_mem available_mem used_percent
        total_mem=$(echo "$memory_info" | awk 'NR==2{print $2}')
        available_mem=$(echo "$memory_info" | awk 'NR==2{print $7}')
        
        if [[ -n "$total_mem" && -n "$available_mem" && "$total_mem" -gt 0 ]]; then
            used_percent=$(( (total_mem - available_mem) * 100 / total_mem ))
            log_health "DEBUG" "Memory usage: ${used_percent}%"
            
            if [[ "$used_percent" -gt 90 ]]; then
                log_health "ERROR" "Critical memory usage: ${used_percent}%"
                return $HC_CRITICAL
            elif [[ "$used_percent" -gt 80 ]]; then
                log_health "WARN" "High memory usage: ${used_percent}%"
                return $HC_WARNING
            fi
        fi
    fi
    
    # Check disk space
    local disk_info
    if disk_info=$(df /app 2>/dev/null); then
        local disk_usage
        disk_usage=$(echo "$disk_info" | awk 'NR==2{print $5}' | sed 's/%//')
        
        if [[ -n "$disk_usage" ]]; then
            log_health "DEBUG" "Disk usage: ${disk_usage}%"
            
            if [[ "$disk_usage" -gt 95 ]]; then
                log_health "ERROR" "Critical disk usage: ${disk_usage}%"
                return $HC_CRITICAL
            elif [[ "$disk_usage" -gt 85 ]]; then
                log_health "WARN" "High disk usage: ${disk_usage}%"
                return $HC_WARNING
            fi
        fi
    fi
    
    return $HC_SUCCESS
}

# Check application endpoints
check_application_endpoints() {
    log_health "DEBUG" "Checking application endpoints..."
    
    local health_status=$HC_SUCCESS
    
    # Check main application port
    if check_port "localhost" "$APP_PORT" 3; then
        log_health "DEBUG" "Application port $APP_PORT: LISTENING"
        
        # Try to check health endpoint if available
        if check_http_endpoint "http://localhost:$APP_PORT/health" 200 5; then
            log_health "DEBUG" "Application health endpoint: OK"
        else
            log_health "DEBUG" "Application health endpoint: NOT AVAILABLE (non-critical)"
        fi
    else
        log_health "DEBUG" "Application port $APP_PORT: NOT LISTENING (may be normal for migration-only mode)"
    fi
    
    # Check metrics port if enabled
    if [[ "${ENABLE_METRICS:-true}" == "true" ]]; then
        if check_port "localhost" "$METRICS_PORT" 3; then
            log_health "DEBUG" "Metrics port $METRICS_PORT: LISTENING"
            
            # Check metrics endpoint
            if check_http_endpoint "http://localhost:$METRICS_PORT/metrics" 200 5; then
                log_health "DEBUG" "Metrics endpoint: OK"
            else
                log_health "WARN" "Metrics endpoint not responding"
                health_status=$HC_WARNING
            fi
        else
            log_health "DEBUG" "Metrics port $METRICS_PORT: NOT LISTENING"
        fi
    fi
    
    return $health_status
}

# Check migration status
check_migration_status() {
    log_health "DEBUG" "Checking migration status..."
    
    if [[ -f "$HEALTH_CHECK_FILE" ]]; then
        local status
        status=$(cat "$HEALTH_CHECK_FILE" 2>/dev/null || echo "UNKNOWN")
        log_health "DEBUG" "Migration status: $status"
        
        case "$status" in
            "HEALTHY"|"COMPLETED"|"SERVICE")
                return $HC_SUCCESS
                ;;
            "RUNNING"|"INITIALIZING"|"DEVELOPMENT")
                return $HC_SUCCESS
                ;;
            "FAILED"|"STOPPED")
                log_health "ERROR" "Migration in failed/stopped state: $status"
                return $HC_CRITICAL
                ;;
            *)
                log_health "WARN" "Unknown migration status: $status"
                return $HC_WARNING
                ;;
        esac
    else
        log_health "WARN" "Health status file not found"
        return $HC_WARNING
    fi
}

# Check log file health
check_log_health() {
    log_health "DEBUG" "Checking log file health..."
    
    # Check if log directory is writable
    if [[ ! -w "/app/logs" ]]; then
        log_health "ERROR" "Log directory not writable"
        return $HC_CRITICAL
    fi
    
    # Check for recent log activity (if main log exists)
    local main_log="/app/logs/entrypoint.log"
    if [[ -f "$main_log" ]]; then
        # Check if log was modified in the last 5 minutes (300 seconds)
        local last_modified
        last_modified=$(stat -c %Y "$main_log" 2>/dev/null || echo "0")
        local current_time
        current_time=$(date +%s)
        local time_diff=$((current_time - last_modified))
        
        if [[ "$time_diff" -gt 300 ]]; then
            log_health "WARN" "Main log file not updated in ${time_diff} seconds"
            return $HC_WARNING
        fi
    fi
    
    return $HC_SUCCESS
}

# Comprehensive health check
perform_health_check() {
    local overall_status=$HC_SUCCESS
    local check_results=()
    
    log_health "INFO" "Starting comprehensive health check..."
    
    # Run all health checks
    local checks=(
        "check_migration_status:Migration Status"
        "check_process_health:Process Health"
        "check_database_connectivity:Database Connectivity"
        "check_system_resources:System Resources"
        "check_application_endpoints:Application Endpoints"
        "check_log_health:Log Health"
    )
    
    for check_def in "${checks[@]}"; do
        local check_func="${check_def%:*}"
        local check_name="${check_def#*:}"
        
        log_health "DEBUG" "Running check: $check_name"
        
        local check_result
        if $check_func; then
            check_result=$?
        else
            check_result=$?
        fi
        
        check_results+=("$check_name:$check_result")
        
        # Update overall status (worst case wins)
        if [[ "$check_result" -gt "$overall_status" ]]; then
            overall_status=$check_result
        fi
    done
    
    # Log summary
    log_health "INFO" "Health check completed with status: $overall_status"
    for result in "${check_results[@]}"; do
        local name="${result%:*}"
        local status="${result#*:}"
        local status_text
        case "$status" in
            0) status_text="OK" ;;
            1) status_text="WARNING" ;;
            2) status_text="CRITICAL" ;;
            *) status_text="UNKNOWN" ;;
        esac
        log_health "INFO" "  $name: $status_text"
    done
    
    return $overall_status
}

# Output health status in different formats
output_health_status() {
    local status="$1"
    local format="${2:-text}"
    
    case "$format" in
        "json")
            local status_text
            case "$status" in
                0) status_text="healthy" ;;
                1) status_text="warning" ;;
                2) status_text="critical" ;;
                *) status_text="unknown" ;;
            esac
            
            echo "{\"status\":\"$status_text\",\"timestamp\":\"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\",\"container\":\"migration-app\"}"
            ;;
        *)
            case "$status" in
                0) echo "HEALTHY" ;;
                1) echo "WARNING" ;;
                2) echo "CRITICAL" ;;
                *) echo "UNKNOWN" ;;
            esac
            ;;
    esac
}

# Main execution
main() {
    local format="${1:-text}"
    local verbose="${2:-false}"
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
    
    # Set log level based on verbosity
    if [[ "$verbose" == "true" || "${LOG_LEVEL:-info}" == "debug" ]]; then
        export LOG_LEVEL="debug"
    fi
    
    log_health "INFO" "Health check started (format: $format, verbose: $verbose)"
    
    # Perform health check with timeout
    local health_status
    if timeout "$HEALTH_TIMEOUT" bash -c 'perform_health_check'; then
        health_status=$?
    else
        log_health "ERROR" "Health check timed out after ${HEALTH_TIMEOUT} seconds"
        health_status=$HC_CRITICAL
    fi
    
    # Output result
    output_health_status "$health_status" "$format"
    
    log_health "INFO" "Health check completed with exit code: $health_status"
    
    exit "$health_status"
}

# Handle command line arguments
case "${1:-}" in
    "--json")
        main "json" "${2:-false}"
        ;;
    "--verbose")
        main "text" "true"
        ;;
    "--help"|"-h")
        echo "Usage: $SCRIPT_NAME [--json] [--verbose] [--help]"
        echo "  --json     Output in JSON format"
        echo "  --verbose  Enable verbose logging"
        echo "  --help     Show this help message"
        echo ""
        echo "Exit codes:"
        echo "  0  Healthy"
        echo "  1  Warning"
        echo "  2  Critical"
        echo "  3  Unknown"
        exit 0
        ;;
    *)
        main "text" "false"
        ;;
esac