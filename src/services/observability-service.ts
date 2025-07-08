/**
 * Observability Service
 * 
 * High-level service for comprehensive observability including automatic tracking,
 * performance monitoring, error handling, and business intelligence specific features.
 */

import { getLangfuseClientService } from './langfuse-client';
import {
  type ObservabilityService,
  type BIObservabilityContext,
  type BIQueryType,
  type ErrorSeverity,
  type ErrorCategory,
  type PerformanceMetrics,
  type TraceContext,
} from '../types/langfuse';

// ============================================================================
// Service Error Classes
// ============================================================================

/**
 * Base error class for observability service errors
 */
export class ObservabilityServiceError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'ObservabilityServiceError';
  }
}

/**
 * Error thrown when trace context is invalid or missing
 */
export class InvalidTraceContextError extends ObservabilityServiceError {
  constructor(traceId: string) {
    super(`Invalid or missing trace context for trace ID: ${traceId}`);
    this.name = 'InvalidTraceContextError';
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a unique correlation ID
 */
function generateCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Measures execution time of a function
 */
async function measureExecutionTime<T>(
  operation: () => T | Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = performance.now();
  const result = await operation();
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  return { result, duration };
}

/**
 * Creates performance metrics from execution data
 */
function createPerformanceMetrics(
  duration: number,
  additionalMetrics?: Partial<PerformanceMetrics>
): PerformanceMetrics {
  // Type-safe memory usage detection
  let memoryUsage = 0;
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const perfMemory = performance as Performance & {
      memory?: {
        usedJSHeapSize?: number;
        totalJSHeapSize?: number;
        jsHeapSizeLimit?: number;
      };
    };
    memoryUsage = perfMemory.memory?.usedJSHeapSize || 0;
  }

  return {
    responseTime: duration,
    processingTime: duration,
    queueTime: 0,
    networkLatency: 0,
    memoryUsage,
    cpuUsage: 0,
    cacheHitRate: 0,
    errorRate: 0,
    throughput: 1,
    ...additionalMetrics,
  };
}

/**
 * Determines error category from error type
 */
function categorizeError(error: Error): ErrorCategory {
  const errorName = error.name.toLowerCase();
  const errorMessage = error.message.toLowerCase();
  
  if (errorName.includes('validation') || errorMessage.includes('validation')) {
    return 'validation';
  }
  
  if (errorName.includes('auth') || errorMessage.includes('auth')) {
    return 'authentication';
  }
  
  if (errorName.includes('permission') || errorMessage.includes('permission')) {
    return 'authorization';
  }
  
  if (errorName.includes('network') || errorMessage.includes('network') || 
      errorName.includes('fetch') || errorMessage.includes('fetch')) {
    return 'network';
  }
  
  if (errorName.includes('database') || errorMessage.includes('database') ||
      errorName.includes('sql') || errorMessage.includes('sql')) {
    return 'database';
  }
  
  if (errorMessage.includes('api') || errorMessage.includes('external')) {
    return 'external_api';
  }
  
  if (errorName.includes('business') || errorMessage.includes('business')) {
    return 'business_logic';
  }
  
  if (errorName.includes('system') || errorMessage.includes('system')) {
    return 'system';
  }
  
  return 'unknown';
}

/**
 * Determines error severity from error characteristics
 */
function determineErrorSeverity(error: Error, context?: Record<string, unknown>): ErrorSeverity {
  const errorName = error.name.toLowerCase();
  const errorMessage = error.message.toLowerCase();
  
  // Critical errors
  if (errorName.includes('fatal') || errorMessage.includes('fatal') ||
      errorName.includes('critical') || errorMessage.includes('critical') ||
      errorMessage.includes('crash') || errorMessage.includes('abort')) {
    return 'critical';
  }
  
  // High severity errors
  if (errorName.includes('security') || errorMessage.includes('security') ||
      errorName.includes('unauthorized') || errorMessage.includes('unauthorized') ||
      errorName.includes('database') || errorMessage.includes('database') ||
      errorMessage.includes('timeout') || errorMessage.includes('connection')) {
    return 'high';
  }
  
  // Medium severity errors
  if (errorName.includes('validation') || errorMessage.includes('validation') ||
      errorName.includes('business') || errorMessage.includes('business') ||
      errorMessage.includes('not found') || errorMessage.includes('invalid')) {
    return 'medium';
  }
  
  // Default to low severity
  return 'low';
}

// ============================================================================
// Trace Context Management
// ============================================================================

/**
 * In-memory trace context storage
 */
class TraceContextManager {
  private contexts = new Map<string, TraceContext>();

  public setContext(traceId: string, context: TraceContext): void {
    this.contexts.set(traceId, context);
  }

  public getContext(traceId: string): TraceContext | undefined {
    return this.contexts.get(traceId);
  }

  public updateContext(traceId: string, updates: Partial<TraceContext>): void {
    const existing = this.contexts.get(traceId);
    if (existing) {
      this.contexts.set(traceId, { ...existing, ...updates });
    }
  }

  public removeContext(traceId: string): void {
    this.contexts.delete(traceId);
  }

  public clear(): void {
    this.contexts.clear();
  }
}

// ============================================================================
// Observability Service Implementation
// ============================================================================

/**
 * Implementation of the observability service
 */
export class ObservabilityServiceImpl implements ObservabilityService {
  private langfuseClient = getLangfuseClientService();
  private traceContextManager = new TraceContextManager();

  // ========================================================================
  // Trace Management
  // ========================================================================

  public async startTrace(
    name: string, 
    input?: unknown, 
    biContext?: BIObservabilityContext
  ): Promise<string> {
    try {
      const correlationId = generateCorrelationId();
      
      let traceId: string;
      
      if (biContext) {
        traceId = await this.langfuseClient.createBITrace({
          name,
          input,
          biContext,
          tags: [correlationId],
          metadata: {
            correlationId,
            startedAt: new Date().toISOString(),
          },
        });
      } else {
        traceId = await this.langfuseClient.createTrace({
          name,
          input,
          tags: [correlationId],
          metadata: {
            correlationId,
            startedAt: new Date().toISOString(),
          },
        });
      }

      // Store trace context
      const context: TraceContext = {
        traceId,
        level: 0,
        tags: [correlationId],
        metadata: {
          correlationId,
          startedAt: new Date().toISOString(),
        },
        startTime: new Date(),
        biContext,
      };

      this.traceContextManager.setContext(traceId, context);

      return traceId;
    } catch (error) {
      throw new ObservabilityServiceError('Failed to start trace', error as Error);
    }
  }

  public async endTrace(traceId: string, output?: unknown): Promise<void> {
    try {
      const context = this.traceContextManager.getContext(traceId);
      
      if (context) {
        const duration = Date.now() - context.startTime.getTime();
        
        await this.langfuseClient.updateTrace(traceId, {
          output,
          metadata: {
            ...context.metadata,
            endedAt: new Date().toISOString(),
            duration,
          },
        });
      }

      await this.langfuseClient.finalizeTrace(traceId);
      this.traceContextManager.removeContext(traceId);
    } catch (error) {
      throw new ObservabilityServiceError('Failed to end trace', error as Error);
    }
  }

  // ========================================================================
  // Span Management
  // ========================================================================

  public async startSpan(
    traceId: string, 
    name: string, 
    input?: unknown, 
    parentId?: string
  ): Promise<string> {
    try {
      const context = this.traceContextManager.getContext(traceId);
      if (!context) {
        throw new InvalidTraceContextError(traceId);
      }

      const spanId = await this.langfuseClient.createSpan({
        traceId,
        parentObservationId: parentId,
        name,
        input,
        tags: context.tags,
        metadata: {
          ...context.metadata,
          level: context.level + 1,
          parentId,
        },
      });

      return spanId;
    } catch (error) {
      throw new ObservabilityServiceError('Failed to start span', error as Error);
    }
  }

  public async endSpan(spanId: string, output?: unknown): Promise<void> {
    try {
      await this.langfuseClient.updateSpan(spanId, { output });
      await this.langfuseClient.finalizeSpan(spanId);
    } catch (error) {
      throw new ObservabilityServiceError('Failed to end span', error as Error);
    }
  }

  // ========================================================================
  // Automatic Function Wrapping
  // ========================================================================

  public wrapFunction<T extends (...args: unknown[]) => unknown>(
    fn: T,
    name: string,
    options?: {
      traceId?: string;
      parentId?: string;
      biContext?: Partial<BIObservabilityContext>;
    }
  ): T {
    const wrappedFunction = ((...args: Parameters<T>) => {
      const startTime = performance.now();
      
      try {
        const result = fn(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Log synchronous function execution
        if (options?.traceId) {
          this.logFunctionExecution(name, args, result, duration, options.traceId, options.parentId);
        }

        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Log function error
        if (options?.traceId) {
          this.logFunctionError(name, args, error as Error, duration, options.traceId, options.parentId);
        }

        throw error;
      }
    }) as T;

    return wrappedFunction;
  }

  public wrapAsyncFunction<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    name: string,
    options?: {
      traceId?: string;
      parentId?: string;
      biContext?: Partial<BIObservabilityContext>;
    }
  ): T {
    const wrappedFunction = (async (...args: Parameters<T>) => {
      const startTime = performance.now();
      let spanId: string | undefined;

      try {
        // Create span if trace ID is provided
        if (options?.traceId) {
          spanId = await this.startSpan(options.traceId, name, args, options.parentId);
        }

        const result = await fn(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        // End span with result
        if (spanId) {
          await this.endSpan(spanId, result);
        }

        // Track performance
        if (options?.traceId) {
          await this.trackFunctionPerformance(name, duration, options.traceId);
        }

        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Handle error in span
        if (spanId) {
          await this.endSpan(spanId, { error: (error as Error).message });
        }

        // Track error
        if (options?.traceId) {
          await this.handleError(error as Error, options.traceId, {
            parentId: options.parentId,
            severity: determineErrorSeverity(error as Error),
            category: categorizeError(error as Error),
          });
        }

        throw error;
      }
    }) as T;

    return wrappedFunction;
  }

  // ========================================================================
  // Performance Monitoring
  // ========================================================================

  public async measurePerformance<T>(
    operation: () => T | Promise<T>,
    operationName: string,
    traceId: string
  ): Promise<T> {
    const { result, duration } = await measureExecutionTime(operation);
    
    const metrics = createPerformanceMetrics(duration);
    
    await this.langfuseClient.trackPerformance({
      traceId,
      operationName,
      metrics,
      tags: ['performance-measurement'],
    });

    return result;
  }

  // ========================================================================
  // Error Handling
  // ========================================================================

  public async handleError(
    error: Error,
    traceId: string,
    context?: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      parentId?: string;
    }
  ): Promise<void> {
    const severity = context?.severity || determineErrorSeverity(error);
    const category = context?.category || categorizeError(error);

    await this.langfuseClient.trackError({
      traceId,
      parentObservationId: context?.parentId,
      error,
      severity,
      category,
      context: {
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      },
      tags: ['error-tracking', `severity:${severity}`, `category:${category}`],
    });
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  private async logFunctionExecution(
    functionName: string,
    args: unknown[],
    result: unknown,
    duration: number,
    traceId: string,
    parentId?: string
  ): Promise<void> {
    try {
      await this.langfuseClient.createEvent({
        traceId,
        parentObservationId: parentId,
        name: `function:${functionName}`,
        input: { args },
        output: { result, duration },
        level: 'DEFAULT',
        tags: ['function-execution'],
        metadata: {
          functionName,
          duration,
          executionTime: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.warn('Failed to log function execution:', error);
    }
  }

  private async logFunctionError(
    functionName: string,
    args: unknown[],
    error: Error,
    duration: number,
    traceId: string,
    parentId?: string
  ): Promise<void> {
    try {
      await this.langfuseClient.createEvent({
        traceId,
        parentObservationId: parentId,
        name: `function-error:${functionName}`,
        input: { args },
        output: { 
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          duration 
        },
        level: 'ERROR',
        statusMessage: error.message,
        tags: ['function-error'],
        metadata: {
          functionName,
          duration,
          errorTime: new Date().toISOString(),
        },
      });
    } catch (logError) {
      console.warn('Failed to log function error:', logError);
    }
  }

  private async trackFunctionPerformance(
    functionName: string,
    duration: number,
    traceId: string
  ): Promise<void> {
    try {
      const metrics = createPerformanceMetrics(duration);
      
      await this.langfuseClient.trackPerformance({
        traceId,
        operationName: functionName,
        metrics,
        tags: ['function-performance'],
      });
    } catch (error) {
      console.warn('Failed to track function performance:', error);
    }
  }
}

// ============================================================================
// Business Intelligence Observability Service
// ============================================================================

/**
 * Specialized observability service for Business Intelligence operations
 */
export class BIObservabilityServiceImpl {
  private observabilityService = new ObservabilityServiceImpl();
  private langfuseClient = getLangfuseClientService();

  public async startBITrace(
    name: string,
    queryType: BIQueryType,
    input?: unknown,
    context?: Partial<BIObservabilityContext>
  ): Promise<string> {
    const biContext: BIObservabilityContext = {
      queryType,
      ...context,
    };

    return this.observabilityService.startTrace(name, input, biContext);
  }

  public async endBITrace(traceId: string, output?: unknown): Promise<void> {
    return this.observabilityService.endTrace(traceId, output);
  }

  public async trackBIQuery(
    traceId: string,
    queryType: BIQueryType,
    query: unknown,
    result?: unknown,
    context?: Partial<BIObservabilityContext>
  ): Promise<string> {
    return this.langfuseClient.createBISpan({
      traceId,
      name: `bi-query:${queryType}`,
      input: query,
      output: result,
      biContext: {
        queryType,
        ...context,
      },
      tags: ['bi-query', `query-type:${queryType}`],
    });
  }

  public async trackToolUsage(
    traceId: string,
    toolName: string,
    input: unknown,
    output?: unknown,
    parentId?: string
  ): Promise<string> {
    return this.langfuseClient.trackToolCall({
      traceId,
      parentObservationId: parentId,
      toolName,
      input,
      output,
      startTime: new Date(),
      endTime: new Date(),
      success: output !== undefined,
    });
  }

  public async measureQueryPerformance<T>(
    operation: () => T | Promise<T>,
    queryName: string,
    traceId: string,
    queryType: BIQueryType
  ): Promise<T> {
    const { result, duration } = await measureExecutionTime(operation);
    
    const metrics = createPerformanceMetrics(duration, {
      // Add BI-specific metrics
      cacheHitRate: Math.random() * 100, // Placeholder - would be real cache metrics
      throughput: 1 / (duration / 1000), // Queries per second
    });
    
    await this.langfuseClient.trackPerformance({
      traceId,
      operationName: `bi-query:${queryName}`,
      metrics,
      tags: ['bi-performance', `query-type:${queryType}`],
      metadata: {
        queryType,
        queryName,
      },
    });

    return result;
  }

  public async handleBIError(
    error: Error,
    traceId: string,
    context?: {
      queryType?: BIQueryType;
      severity?: ErrorSeverity;
      parentId?: string;
    }
  ): Promise<void> {
    await this.observabilityService.handleError(error, traceId, {
      severity: context?.severity,
      category: 'business_logic',
      parentId: context?.parentId,
    });
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

let observabilityServiceInstance: ObservabilityServiceImpl | null = null;
let biObservabilityServiceInstance: BIObservabilityServiceImpl | null = null;

/**
 * Gets the singleton instance of the observability service
 */
export function getObservabilityService(): ObservabilityService {
  if (!observabilityServiceInstance) {
    observabilityServiceInstance = new ObservabilityServiceImpl();
  }
  return observabilityServiceInstance;
}

/**
 * Gets the singleton instance of the BI observability service
 */
export function getBIObservabilityService(): BIObservabilityServiceImpl {
  if (!biObservabilityServiceInstance) {
    biObservabilityServiceInstance = new BIObservabilityServiceImpl();
  }
  return biObservabilityServiceInstance;
}

/**
 * Resets service instances (useful for testing)
 */
export function resetObservabilityServices(): void {
  observabilityServiceInstance = null;
  biObservabilityServiceInstance = null;
}