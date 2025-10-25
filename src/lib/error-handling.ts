/**
 * Error Handling and Circuit Breaker Patterns
 * 
 * Implements circuit breaker pattern for external service calls with
 * graceful degradation, retry logic, and comprehensive error tracking.
 * 
 * Reference: docs/mastra-integration-patterns.md (Section 7: Error Handling Pattern)
 */

// ============================================================================
// Circuit Breaker Types
// ============================================================================

/**
 * Circuit breaker state
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation - requests pass through
  OPEN = 'OPEN',         // Circuit is open - rejecting requests
  HALF_OPEN = 'HALF_OPEN', // Testing recovery - allowing trial requests
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /**
   * Request timeout in milliseconds
   * Default: 5000ms (5 seconds)
   */
  timeout: number;
  
  /**
   * Error threshold percentage to open circuit
   * Range: 0-100
   * Default: 50%
   */
  errorThresholdPercentage: number;
  
  /**
   * Time to wait before attempting reset (milliseconds)
   * Default: 30000ms (30 seconds)
   */
  resetTimeoutMs: number;
  
  /**
   * Minimum requests before calculating error rate
   * Default: 10
   */
  volumeThreshold: number;
  
  /**
   * Maximum number of retry attempts
   * Default: 3
   */
  maxRetries: number;
  
  /**
   * Backoff multiplier for retries
   * Default: 2 (exponential backoff)
   */
  backoffMultiplier: number;
  
  /**
   * Initial backoff delay in milliseconds
   * Default: 1000ms (1 second)
   */
  initialBackoffMs: number;
  
  /**
   * Enable debug logging
   * Default: false
   */
  debug: boolean;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rejectedRequests: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  errorRate: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

/**
 * Circuit breaker execution result
 */
export interface CircuitBreakerResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  state: CircuitState;
  retryCount: number;
  executionTime: number;
}

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

/**
 * Circuit Breaker Pattern Implementation
 * 
 * Protects external service calls with automatic failure detection,
 * circuit opening, and controlled recovery testing.
 */
export class CircuitBreaker {
  private readonly config: CircuitBreakerConfig;
  private state: CircuitState;
  private failureCount: number;
  private successCount: number;
  private consecutiveFailures: number;
  private consecutiveSuccesses: number;
  private totalRequests: number;
  private rejectedRequests: number;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private resetTimer?: NodeJS.Timeout;
  
  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      timeout: config?.timeout ?? 5000,
      errorThresholdPercentage: config?.errorThresholdPercentage ?? 50,
      resetTimeoutMs: config?.resetTimeoutMs ?? 30000,
      volumeThreshold: config?.volumeThreshold ?? 10,
      maxRetries: config?.maxRetries ?? 3,
      backoffMultiplier: config?.backoffMultiplier ?? 2,
      initialBackoffMs: config?.initialBackoffMs ?? 1000,
      debug: config?.debug ?? false,
    };
    
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.totalRequests = 0;
    this.rejectedRequests = 0;
  }
  
  // ============================================================================
  // Public Methods
  // ============================================================================
  
  /**
   * Execute function with circuit breaker protection
   * 
   * @param fn - Async function to execute
   * @param options - Optional execution configuration
   * @returns Circuit breaker result with data or error
   */
  async execute<T>(
    fn: () => Promise<T>,
    options?: {
      timeout?: number;
      retries?: number;
      fallback?: () => Promise<T>;
    }
  ): Promise<CircuitBreakerResult<T>> {
    const startTime = Date.now();
    this.totalRequests++;
    
    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        this.rejectedRequests++;
        return {
          success: false,
          error: new Error('Circuit breaker is OPEN - rejecting request'),
          state: this.state,
          retryCount: 0,
          executionTime: Date.now() - startTime,
        };
      }
    }
    
    // Execute with retries
    const maxRetries = options?.retries ?? this.config.maxRetries;
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeWithTimeout(
          fn,
          options?.timeout ?? this.config.timeout
        );
        
        this.onSuccess();
        
        return {
          success: true,
          data: result,
          state: this.state,
          retryCount: attempt,
          executionTime: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry if circuit just opened
        if (this.state === CircuitState.OPEN) {
          break;
        }
        
        // Don't retry on last attempt
        if (attempt < maxRetries) {
          await this.sleep(this.calculateBackoff(attempt));
        }
      }
    }
    
    // All attempts failed
    this.onFailure(lastError!);
    
    // Try fallback if provided
    if (options?.fallback) {
      try {
        const fallbackResult = await options.fallback();
        return {
          success: true,
          data: fallbackResult,
          state: this.state,
          retryCount: maxRetries,
          executionTime: Date.now() - startTime,
        };
      } catch (fallbackError) {
        lastError = fallbackError instanceof Error ? fallbackError : lastError;
      }
    }
    
    return {
      success: false,
      error: lastError,
      state: this.state,
      retryCount: maxRetries,
      executionTime: Date.now() - startTime,
    };
  }
  
  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    const totalCompleted = this.successCount + this.failureCount;
    const errorRate = totalCompleted > 0 
      ? (this.failureCount / totalCompleted) * 100 
      : 0;
    
    return {
      state: this.state,
      totalRequests: this.totalRequests,
      successfulRequests: this.successCount,
      failedRequests: this.failureCount,
      rejectedRequests: this.rejectedRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      errorRate,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
    };
  }
  
  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
    
    if (this.config.debug) {
      console.log('Circuit breaker manually reset');
    }
  }
  
  /**
   * Force circuit open (for testing or manual intervention)
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    if (this.config.debug) {
      console.log('Circuit breaker manually forced OPEN');
    }
  }
  
  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), timeout);
      }),
    ]);
  }
  
  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.successCount++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = new Date();
    
    // Transition from HALF_OPEN to CLOSED on success
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToClosed();
    }
    
    if (this.config.debug) {
      console.log('Circuit breaker: Success', {
        consecutiveSuccesses: this.consecutiveSuccesses,
        state: this.state,
      });
    }
  }
  
  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    this.failureCount++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = new Date();
    
    if (this.config.debug) {
      console.log('Circuit breaker: Failure', {
        consecutiveFailures: this.consecutiveFailures,
        error: error.message,
        state: this.state,
      });
    }
    
    // Check if circuit should open
    if (this.shouldOpenCircuit()) {
      this.transitionToOpen();
    }
  }
  
  /**
   * Determine if circuit should open based on error rate
   */
  private shouldOpenCircuit(): boolean {
    const totalCompleted = this.successCount + this.failureCount;
    
    // Need minimum volume before opening
    if (totalCompleted < this.config.volumeThreshold) {
      return false;
    }
    
    const errorRate = (this.failureCount / totalCompleted) * 100;
    return errorRate >= this.config.errorThresholdPercentage;
  }
  
  /**
   * Check if should attempt reset to HALF_OPEN
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) {
      return true;
    }
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.config.resetTimeoutMs;
  }
  
  /**
   * Transition circuit state to CLOSED
   */
  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.consecutiveFailures = 0;
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
    
    if (this.config.debug) {
      console.log('Circuit breaker transitioned to CLOSED');
    }
  }
  
  /**
   * Transition circuit state to OPEN
   */
  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    
    // Schedule automatic reset attempt
    this.resetTimer = setTimeout(() => {
      if (this.state === CircuitState.OPEN) {
        this.transitionToHalfOpen();
      }
    }, this.config.resetTimeoutMs);
    
    if (this.config.debug) {
      console.log('Circuit breaker transitioned to OPEN', {
        errorRate: this.getStats().errorRate,
        consecutiveFailures: this.consecutiveFailures,
      });
    }
  }
  
  /**
   * Transition circuit state to HALF_OPEN
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    
    if (this.config.debug) {
      console.log('Circuit breaker transitioned to HALF_OPEN - testing recovery');
    }
  }
  
  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    return this.config.initialBackoffMs * Math.pow(this.config.backoffMultiplier, attempt);
  }
  
  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Circuit Breaker Manager
// ============================================================================

/**
 * Circuit Breaker Manager
 * 
 * Manages multiple circuit breakers for different services
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker>;
  
  constructor() {
    this.breakers = new Map();
  }
  
  /**
   * Get or create circuit breaker for a service
   */
  getBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker(config));
    }
    return this.breakers.get(serviceName)!;
  }
  
  /**
   * Get statistics for all breakers
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    
    for (const [serviceName, breaker] of this.breakers.entries()) {
      stats[serviceName] = breaker.getStats();
    }
    
    return stats;
  }
  
  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
  
  /**
   * Remove circuit breaker for a service
   */
  removeBreaker(serviceName: string): boolean {
    return this.breakers.delete(serviceName);
  }
}

// ============================================================================
// Graceful Degradation Types
// ============================================================================

/**
 * Fallback strategy configuration
 */
export interface FallbackConfig<T> {
  /**
   * Primary function to execute
   */
  primary: () => Promise<T>;
  
  /**
   * Fallback function if primary fails
   */
  fallback: () => Promise<T>;
  
  /**
   * Secondary fallback (optional)
   */
  secondaryFallback?: () => Promise<T>;
  
  /**
   * Timeout for primary execution
   */
  timeout?: number;
  
  /**
   * Enable logging
   */
  debug?: boolean;
}

/**
 * Fallback execution result
 */
export interface FallbackResult<T> {
  success: boolean;
  data?: T;
  source: 'primary' | 'fallback' | 'secondary_fallback' | 'none';
  error?: Error;
  executionTime: number;
}

// ============================================================================
// Graceful Degradation Functions
// ============================================================================

/**
 * Execute with graceful degradation and fallback
 * 
 * Attempts primary function, falls back to alternatives on failure
 */
export async function executeWithFallback<T>(
  config: FallbackConfig<T>
): Promise<FallbackResult<T>> {
  const startTime = Date.now();
  
  // Try primary
  try {
    const data = await (config.timeout
      ? Promise.race([
          config.primary(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Primary timeout')), config.timeout);
          }),
        ])
      : config.primary());
    
    return {
      success: true,
      data,
      source: 'primary',
      executionTime: Date.now() - startTime,
    };
  } catch (primaryError) {
    if (config.debug) {
      console.warn('Primary execution failed, trying fallback:', primaryError);
    }
    
    // Try fallback
    try {
      const data = await config.fallback();
      
      return {
        success: true,
        data,
        source: 'fallback',
        executionTime: Date.now() - startTime,
      };
    } catch (fallbackError) {
      if (config.debug) {
        console.warn('Fallback execution failed:', fallbackError);
      }
      
      // Try secondary fallback if available
      if (config.secondaryFallback) {
        try {
          const data = await config.secondaryFallback();
          
          return {
            success: true,
            data,
            source: 'secondary_fallback',
            executionTime: Date.now() - startTime,
          };
        } catch (secondaryError) {
          if (config.debug) {
            console.error('All fallback strategies failed:', secondaryError);
          }
        }
      }
      
      // All attempts failed
      return {
        success: false,
        source: 'none',
        error: fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
        executionTime: Date.now() - startTime,
      };
    }
  }
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Retry configuration
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts
   */
  maxRetries: number;
  
  /**
   * Initial backoff delay in milliseconds
   */
  initialBackoffMs: number;
  
  /**
   * Backoff multiplier for exponential backoff
   */
  backoffMultiplier: number;
  
  /**
   * Maximum backoff delay in milliseconds
   */
  maxBackoffMs: number;
  
  /**
   * Function to determine if error is retryable
   */
  isRetryable?: (error: Error) => boolean;
  
  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Execute function with exponential backoff retry logic
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig: RetryConfig = {
    maxRetries: config.maxRetries ?? 3,
    initialBackoffMs: config.initialBackoffMs ?? 1000,
    backoffMultiplier: config.backoffMultiplier ?? 2,
    maxBackoffMs: config.maxBackoffMs ?? 30000,
    isRetryable: config.isRetryable ?? (() => true),
    debug: config.debug ?? false,
  };
  
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if should retry
      if (attempt >= retryConfig.maxRetries || !retryConfig.isRetryable(lastError)) {
        throw lastError;
      }
      
      // Calculate backoff delay
      const backoff = Math.min(
        retryConfig.initialBackoffMs * Math.pow(retryConfig.backoffMultiplier, attempt),
        retryConfig.maxBackoffMs
      );
      
      if (retryConfig.debug) {
        console.log(`Retry attempt ${attempt + 1}/${retryConfig.maxRetries} after ${backoff}ms`);
      }
      
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }
  
  throw lastError!;
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Error category for classification
 */
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  CLIENT_ERROR = 'CLIENT_ERROR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Classify error by category
 */
export function classifyError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  
  if (message.includes('timeout') || message.includes('timed out')) {
    return ErrorCategory.TIMEOUT;
  }
  
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return ErrorCategory.NETWORK;
  }
  
  if (message.includes('401') || message.includes('unauthorized') || message.includes('authentication')) {
    return ErrorCategory.AUTHENTICATION;
  }
  
  if (message.includes('403') || message.includes('forbidden') || message.includes('authorization')) {
    return ErrorCategory.AUTHORIZATION;
  }
  
  if (message.includes('429') || message.includes('rate limit')) {
    return ErrorCategory.RATE_LIMIT;
  }
  
  if (message.includes('400') || message.includes('validation') || message.includes('invalid')) {
    return ErrorCategory.VALIDATION;
  }
  
  if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
    return ErrorCategory.SERVER_ERROR;
  }
  
  return ErrorCategory.UNKNOWN;
}

/**
 * Determine if error is retryable based on category
 */
export function isRetryableError(error: Error): boolean {
  const category = classifyError(error);
  
  // Retry on transient errors
  return [
    ErrorCategory.NETWORK,
    ErrorCategory.TIMEOUT,
    ErrorCategory.RATE_LIMIT,
    ErrorCategory.SERVER_ERROR,
  ].includes(category);
}

// ============================================================================
// Singleton Instances
// ============================================================================

/**
 * Global circuit breaker manager instance
 */
let managerInstance: CircuitBreakerManager | null = null;

/**
 * Get global circuit breaker manager
 */
export function getCircuitBreakerManager(): CircuitBreakerManager {
  if (!managerInstance) {
    managerInstance = new CircuitBreakerManager();
  }
  return managerInstance;
}

/**
 * Get circuit breaker for a specific service
 */
export function getCircuitBreaker(
  serviceName: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  const manager = getCircuitBreakerManager();
  return manager.getBreaker(serviceName, config);
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Execute Mastra agent call with circuit breaker protection
 */
export async function executeAgentCallWithProtection<T>(
  agentName: string,
  fn: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  const breaker = getCircuitBreaker(`agent:${agentName}`, {
    timeout: 45000, // 45 seconds for agent calls
    errorThresholdPercentage: 60,
    resetTimeoutMs: 30000,
    volumeThreshold: 5,
  });
  
  const result = await breaker.execute(fn, { fallback });
  
  if (!result.success) {
    throw result.error || new Error('Agent call failed');
  }
  
  return result.data!;
}

/**
 * Execute database call with circuit breaker protection
 */
export async function executeDatabaseCallWithProtection<T>(
  operationName: string,
  fn: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  const breaker = getCircuitBreaker(`database:${operationName}`, {
    timeout: 10000, // 10 seconds for database calls
    errorThresholdPercentage: 70,
    resetTimeoutMs: 20000,
    volumeThreshold: 10,
  });
  
  const result = await breaker.execute(fn, { fallback });
  
  if (!result.success) {
    throw result.error || new Error('Database call failed');
  }
  
  return result.data!;
}

/**
 * Execute external API call with circuit breaker protection
 */
export async function executeExternalAPIWithProtection<T>(
  apiName: string,
  fn: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  const breaker = getCircuitBreaker(`api:${apiName}`, {
    timeout: 15000, // 15 seconds for API calls
    errorThresholdPercentage: 50,
    resetTimeoutMs: 60000, // 1 minute
    volumeThreshold: 5,
    maxRetries: 2,
  });
  
  const result = await breaker.execute(fn, {
    fallback,
    retries: 2,
  });
  
  if (!result.success) {
    throw result.error || new Error('External API call failed');
  }
  
  return result.data!;
}