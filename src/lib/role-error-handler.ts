/**
 * Enhanced Error Handler for Role Resolution and JWT Processing
 * 
 * Provides comprehensive error handling with:
 * - Error categorization and logging
 * - Retry logic with exponential backoff
 * - Circuit breaker for repeated failures
 * - Graceful degradation strategies
 * - Error monitoring and reporting
 */

import type { SystemRoleName } from '@/types/role-types';
import { DEFAULT_PERMISSIONS, DEFAULT_ROLE } from '@/types/role-types';

// ============================================================================
// Error Types and Categories
// ============================================================================

export enum RoleErrorType {
  DATABASE_CONNECTION = 'DATABASE_CONNECTION',
  QUERY_FAILED = 'QUERY_FAILED',
  INVALID_ROLE_DATA = 'INVALID_ROLE_DATA',
  PERMISSION_RESOLUTION = 'PERMISSION_RESOLUTION',
  JWT_VALIDATION = 'JWT_VALIDATION',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  CACHE_ERROR = 'CACHE_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface RoleError {
  type: RoleErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError?: Error;
  userId?: string;
  timestamp: Date;
  retryable: boolean;
  context?: Record<string, unknown>;
}

// ============================================================================
// Circuit Breaker
// ============================================================================

class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  private readonly threshold: number = 5; // Failures before opening
  private readonly timeout: number = 60000; // 1 minute cooldown
  private readonly halfOpenAttempts: number = 3;

  isOpen(): boolean {
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.timeout) {
        this.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.warn(`Circuit breaker OPENED after ${this.failures} failures`);
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }
}

// Global circuit breaker instance
const roleResolutionCircuitBreaker = new CircuitBreaker();

// ============================================================================
// Error Handler Class
// ============================================================================

export class RoleErrorHandler {
  private errorLog: RoleError[] = [];
  private readonly maxLogSize = 100;

  /**
   * Handle role resolution error with categorization and graceful degradation
   */
  handleRoleResolutionError(
    error: unknown,
    userId: string,
    operation: string
  ): {
    roles: SystemRoleName[];
    primaryRole: SystemRoleName;
    permissions: typeof DEFAULT_PERMISSIONS[SystemRoleName];
    degraded: boolean;
    error: RoleError;
  } {
    const roleError = this.categorizeError(error, userId, operation);
    this.logError(roleError);
    roleResolutionCircuitBreaker.recordFailure();

    // Determine if retry is appropriate
    if (roleError.retryable && !roleResolutionCircuitBreaker.isOpen()) {
      // Could implement retry logic here if needed
      console.log('Error is retryable but circuit breaker is managing retries');
    }

    // Return graceful degradation
    return {
      roles: [DEFAULT_ROLE],
      primaryRole: DEFAULT_ROLE,
      permissions: DEFAULT_PERMISSIONS[DEFAULT_ROLE],
      degraded: true,
      error: roleError,
    };
  }

  /**
   * Handle successful role resolution
   */
  handleRoleResolutionSuccess(): void {
    roleResolutionCircuitBreaker.recordSuccess();
  }

  /**
   * Check if circuit breaker is preventing operations
   */
  isCircuitBreakerOpen(): boolean {
    return roleResolutionCircuitBreaker.isOpen();
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): {
    state: string;
    failures: number;
  } {
    return {
      state: roleResolutionCircuitBreaker.getState(),
      failures: roleResolutionCircuitBreaker.getFailureCount(),
    };
  }

  /**
   * Categorize error for proper handling
   */
  private categorizeError(
    error: unknown,
    userId: string,
    operation: string
  ): RoleError {
    const err = error as Error;
    const message = err?.message || 'Unknown error';
    const timestamp = new Date();

    // Database connection errors
    if (message.includes('connection') || message.includes('ECONNREFUSED')) {
      return {
        type: RoleErrorType.DATABASE_CONNECTION,
        severity: ErrorSeverity.HIGH,
        message: `Database connection failed during ${operation}`,
        originalError: err,
        userId,
        timestamp,
        retryable: true,
        context: { operation },
      };
    }

    // Query failures
    if (message.includes('query') || message.includes('SQL')) {
      return {
        type: RoleErrorType.QUERY_FAILED,
        severity: ErrorSeverity.MEDIUM,
        message: `Database query failed during ${operation}`,
        originalError: err,
        userId,
        timestamp,
        retryable: true,
        context: { operation },
      };
    }

    // Invalid role data
    if (message.includes('role') || message.includes('permission')) {
      return {
        type: RoleErrorType.INVALID_ROLE_DATA,
        severity: ErrorSeverity.MEDIUM,
        message: `Invalid role data encountered during ${operation}`,
        originalError: err,
        userId,
        timestamp,
        retryable: false,
        context: { operation },
      };
    }

    // Session/JWT errors
    if (message.includes('session') || message.includes('token') || message.includes('expired')) {
      return {
        type: RoleErrorType.SESSION_EXPIRED,
        severity: ErrorSeverity.LOW,
        message: `Session issue during ${operation}`,
        originalError: err,
        userId,
        timestamp,
        retryable: false,
        context: { operation },
      };
    }

    // Cache errors
    if (message.includes('cache') || message.includes('localStorage')) {
      return {
        type: RoleErrorType.CACHE_ERROR,
        severity: ErrorSeverity.LOW,
        message: `Cache error during ${operation}`,
        originalError: err,
        userId,
        timestamp,
        retryable: true,
        context: { operation },
      };
    }

    // Unknown errors
    return {
      type: RoleErrorType.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      message: `Unknown error during ${operation}: ${message}`,
      originalError: err,
      userId,
      timestamp,
      retryable: true,
      context: { operation },
    };
  }

  /**
   * Log error with proper formatting
   */
  private logError(error: RoleError): void {
    // Add to in-memory log
    this.errorLog.push(error);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift(); // Remove oldest
    }

    // Console logging with appropriate level
    const logMessage = `[${error.severity.toUpperCase()}] ${error.type}: ${error.message}`;
    const logContext = {
      userId: error.userId,
      timestamp: error.timestamp.toISOString(),
      retryable: error.retryable,
      context: error.context,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error(logMessage, logContext, error.originalError);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(logMessage, logContext);
        break;
      case ErrorSeverity.LOW:
        console.log(logMessage, logContext);
        break;
    }
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(count: number = 10): RoleError[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    retryableCount: number;
  } {
    const stats = {
      total: this.errorLog.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      retryableCount: 0,
    };

    for (const error of this.errorLog) {
      // Count by type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      
      // Count by severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // Count retryable
      if (error.retryable) {
        stats.retryableCount++;
      }
    }

    return stats;
  }

  /**
   * Clear error log
   */
  clearErrors(): void {
    this.errorLog = [];
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const roleErrorHandler = new RoleErrorHandler();

// ============================================================================
// Retry Logic with Exponential Backoff
// ============================================================================

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let attempt = 0;
  let delay = initialDelay;

  while (attempt < maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      
      if (attempt >= maxAttempts) {
        throw error;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelay);
      
      console.log(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms delay`);
    }
  }

  throw new Error('Max retry attempts reached');
}

// ============================================================================
// Degradation Mode Detection
// ============================================================================

/**
 * Check if system is in degraded mode
 */
export function isDegradedMode(): boolean {
  const status = roleErrorHandler.getCircuitBreakerStatus();
  return status.state === 'OPEN' || status.failures > 2;
}

/**
 * Get degradation status for UI display
 */
export function getDegradationStatus(): {
  isDegraded: boolean;
  reason?: string;
  severity: ErrorSeverity;
  canRetry: boolean;
} {
  const status = roleErrorHandler.getCircuitBreakerStatus();
  const stats = roleErrorHandler.getErrorStats();

  if (status.state === 'OPEN') {
    return {
      isDegraded: true,
      reason: 'Multiple role resolution failures detected. Using default permissions.',
      severity: ErrorSeverity.HIGH,
      canRetry: false,
    };
  }

  if (status.state === 'HALF_OPEN') {
    return {
      isDegraded: true,
      reason: 'Recovering from failures. Testing role resolution.',
      severity: ErrorSeverity.MEDIUM,
      canRetry: true,
    };
  }

  if (stats.total > 0 && status.failures > 0) {
    return {
      isDegraded: true,
      reason: 'Recent role resolution issues. Operating with enhanced monitoring.',
      severity: ErrorSeverity.LOW,
      canRetry: true,
    };
  }

  return {
    isDegraded: false,
    severity: ErrorSeverity.LOW,
    canRetry: true,
  };
}