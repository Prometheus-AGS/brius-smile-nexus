/**
 * Langfuse Client Service
 * 
 * Core service for managing Langfuse client operations including trace creation,
 * span management, generation tracking, and comprehensive error handling.
 */

import { Langfuse } from 'langfuse';
import { 
  getLangfuseConfig, 
  isLangfuseEnabled,
  LangfuseConfigError 
} from '../lib/langfuse-config';
import {
  type LangfuseClientService,
  type LangfuseTraceParams,
  type LangfuseSpanParams,
  type LangfuseGenerationParams,
  type LangfuseEventParams,
  type BITraceParams,
  type BISpanParams,
  type BIToolCallParams,
  type PerformanceTrackingParams,
  type ErrorTrackingParams,
  type LangfuseConfig,
  type ErrorSeverity,
  type ErrorCategory,
} from '../types/langfuse';

// ============================================================================
// Service Error Classes
// ============================================================================

/**
 * Base error class for Langfuse service errors
 */
export class LangfuseServiceError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'LangfuseServiceError';
  }
}

/**
 * Error thrown when Langfuse is not properly initialized
 */
export class LangfuseNotInitializedError extends LangfuseServiceError {
  constructor() {
    super('Langfuse client is not initialized. Ensure configuration is valid and service is enabled.');
    this.name = 'LangfuseNotInitializedError';
  }
}

/**
 * Error thrown when Langfuse operations fail
 */
export class LangfuseOperationError extends LangfuseServiceError {
  constructor(operation: string, cause?: Error) {
    super(`Langfuse operation failed: ${operation}`, cause);
    this.name = 'LangfuseOperationError';
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a unique ID for traces and observations
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Safely converts unknown input to JSON-serializable format
 */
function sanitizeInput(input: unknown): unknown {
  try {
    if (input === null || input === undefined) {
      return input;
    }
    
    if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
      return input;
    }
    
    if (input instanceof Date) {
      return input.toISOString();
    }
    
    if (input instanceof Error) {
      return {
        name: input.name,
        message: input.message,
        stack: input.stack,
      };
    }
    
    // For objects and arrays, attempt JSON serialization
    JSON.stringify(input);
    return input;
  } catch (error) {
    // If serialization fails, return a safe representation
    return {
      type: typeof input,
      toString: String(input),
      serializationError: 'Failed to serialize input',
    };
  }
}

/**
 * Creates standardized metadata for all operations
 */
function createStandardMetadata(customMetadata?: Record<string, unknown>): Record<string, unknown> {
  return {
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
    sessionId: typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem('sessionId') || generateId()) : generateId(),
    ...customMetadata,
  };
}

/**
 * Converts model parameters to the expected format
 */
function sanitizeModelParameters(params?: Record<string, unknown>): Record<string, string | number | boolean | string[]> | undefined {
  if (!params) return undefined;
  
  const sanitized: Record<string, string | number | boolean | string[]> = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
      sanitized[key] = value as string[];
    } else {
      // Convert other types to string
      sanitized[key] = String(value);
    }
  }
  
  return sanitized;
}

// ============================================================================
// Langfuse Client Service Implementation
// ============================================================================

/**
 * Implementation of the Langfuse client service
 */
export class LangfuseClientServiceImpl implements LangfuseClientService {
  private client: Langfuse | null = null;
  private config: LangfuseConfig | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Initialize asynchronously to avoid blocking
    this.initializationPromise = this.initialize();
  }

  // ========================================================================
  // Initialization and Configuration
  // ========================================================================

  /**
   * Initializes the Langfuse client
   */
  private async initialize(): Promise<void> {
    try {
      if (!isLangfuseEnabled()) {
        console.log('Langfuse is disabled, skipping initialization');
        return;
      }

      this.config = getLangfuseConfig();
      
      this.client = new Langfuse({
        baseUrl: this.config.baseUrl,
        publicKey: this.config.publicKey,
        secretKey: this.config.secretKey,
        flushInterval: this.config.flushInterval,
      });

      this.isInitialized = true;

      if (this.config.debug) {
        console.log('Langfuse client initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize Langfuse client:', error);
      this.isInitialized = false;
      throw new LangfuseServiceError('Failed to initialize Langfuse client', error as Error);
    }
  }

  /**
   * Ensures the client is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
      this.initializationPromise = null;
    }

    if (!this.isInitialized || !this.client) {
      throw new LangfuseNotInitializedError();
    }
  }

  public isEnabled(): boolean {
    return isLangfuseEnabled() && this.isInitialized;
  }

  public getConfig(): LangfuseConfig {
    if (!this.config) {
      throw new LangfuseConfigError('Configuration not available');
    }
    return this.config;
  }

  // ========================================================================
  // Trace Management
  // ========================================================================

  public async createTrace(params: LangfuseTraceParams): Promise<string> {
    await this.ensureInitialized();

    try {
      const traceId = params.id || generateId();
      const sanitizedInput = sanitizeInput(params.input);
      const sanitizedOutput = sanitizeInput(params.output);
      const metadata = createStandardMetadata(params.metadata);

      const trace = this.client!.trace({
        id: traceId,
        name: params.name,
        input: sanitizedInput,
        output: sanitizedOutput,
        userId: params.userId,
        sessionId: params.sessionId,
        version: params.version,
        release: params.release,
        metadata,
      });

      if (this.config?.debug) {
        console.log('Created Langfuse trace:', { traceId, name: params.name });
      }

      return traceId;
    } catch (error) {
      throw new LangfuseOperationError('createTrace', error as Error);
    }
  }

  public async createBITrace(params: BITraceParams): Promise<string> {
    const enhancedParams: LangfuseTraceParams = {
      ...params,
      metadata: {
        ...params.metadata,
        biContext: params.biContext,
        queryType: params.biContext.queryType,
        dataSource: params.biContext.dataSource,
        timeRange: params.biContext.timeRange,
        filters: params.biContext.filters,
        aggregations: params.biContext.aggregations,
        dimensions: params.biContext.dimensions,
        metrics: params.biContext.metrics,
        businessContext: params.biContext.businessContext,
      },
    };

    return this.createTrace(enhancedParams);
  }

  public async updateTrace(traceId: string, updates: Partial<LangfuseTraceParams>): Promise<void> {
    await this.ensureInitialized();

    try {
      const trace = this.client!.trace({ id: traceId });
      
      if (updates.output !== undefined) {
        trace.update({
          output: sanitizeInput(updates.output),
        });
      }

      if (updates.metadata) {
        trace.update({
          metadata: createStandardMetadata(updates.metadata),
        });
      }

      if (this.config?.debug) {
        console.log('Updated Langfuse trace:', { traceId, updates: Object.keys(updates) });
      }
    } catch (error) {
      throw new LangfuseOperationError('updateTrace', error as Error);
    }
  }

  public async finalizeTrace(traceId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const trace = this.client!.trace({ id: traceId });
      trace.update({
        timestamp: new Date(),
      });

      if (this.config?.debug) {
        console.log('Finalized Langfuse trace:', { traceId });
      }
    } catch (error) {
      throw new LangfuseOperationError('finalizeTrace', error as Error);
    }
  }

  // ========================================================================
  // Span Management
  // ========================================================================

  public async createSpan(params: LangfuseSpanParams): Promise<string> {
    await this.ensureInitialized();

    try {
      const spanId = generateId();
      const sanitizedInput = sanitizeInput(params.input);
      const sanitizedOutput = sanitizeInput(params.output);
      const metadata = createStandardMetadata(params.metadata);

      const span = this.client!.span({
        id: spanId,
        traceId: params.traceId,
        parentObservationId: params.parentObservationId,
        name: params.name,
        startTime: params.startTime || new Date(),
        input: sanitizedInput,
        output: sanitizedOutput,
        level: params.level,
        statusMessage: params.statusMessage,
        version: params.version,
        metadata,
      });

      if (this.config?.debug) {
        console.log('Created Langfuse span:', { spanId, traceId: params.traceId, name: params.name });
      }

      return spanId;
    } catch (error) {
      throw new LangfuseOperationError('createSpan', error as Error);
    }
  }

  public async createBISpan(params: BISpanParams): Promise<string> {
    const enhancedParams: LangfuseSpanParams = {
      ...params,
      metadata: {
        ...params.metadata,
        ...(params.biContext && { biContext: params.biContext }),
      },
    };

    return this.createSpan(enhancedParams);
  }

  public async updateSpan(spanId: string, updates: Partial<LangfuseSpanParams>): Promise<void> {
    await this.ensureInitialized();

    try {
      const span = this.client!.span({ id: spanId });
      
      if (updates.output !== undefined) {
        span.update({
          output: sanitizeInput(updates.output),
        });
      }

      if (updates.endTime) {
        span.update({
          endTime: updates.endTime,
        });
      }

      if (this.config?.debug) {
        console.log('Updated Langfuse span:', { spanId, updates: Object.keys(updates) });
      }
    } catch (error) {
      throw new LangfuseOperationError('updateSpan', error as Error);
    }
  }

  public async finalizeSpan(spanId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const span = this.client!.span({ id: spanId });
      span.update({
        endTime: new Date(),
      });

      if (this.config?.debug) {
        console.log('Finalized Langfuse span:', { spanId });
      }
    } catch (error) {
      throw new LangfuseOperationError('finalizeSpan', error as Error);
    }
  }

  // ========================================================================
  // Generation Tracking
  // ========================================================================

  public async createGeneration(params: LangfuseGenerationParams): Promise<string> {
    await this.ensureInitialized();

    try {
      const generationId = generateId();
      const sanitizedInput = sanitizeInput(params.input);
      const sanitizedOutput = sanitizeInput(params.output);
      const metadata = createStandardMetadata(params.metadata);
      const sanitizedModelParams = sanitizeModelParameters(params.modelParameters);

      const generation = this.client!.generation({
        id: generationId,
        traceId: params.traceId,
        parentObservationId: params.parentObservationId,
        name: params.name,
        startTime: params.startTime || new Date(),
        endTime: params.endTime,
        completionStartTime: params.completionStartTime,
        input: sanitizedInput,
        output: sanitizedOutput,
        model: params.model,
        modelParameters: sanitizedModelParams,
        usage: params.usage,
        level: params.level,
        statusMessage: params.statusMessage,
        version: params.version,
        metadata,
      });

      if (this.config?.debug) {
        console.log('Created Langfuse generation:', { 
          generationId, 
          traceId: params.traceId, 
          name: params.name,
          model: params.model 
        });
      }

      return generationId;
    } catch (error) {
      throw new LangfuseOperationError('createGeneration', error as Error);
    }
  }

  public async updateGeneration(generationId: string, updates: Partial<LangfuseGenerationParams>): Promise<void> {
    await this.ensureInitialized();

    try {
      const generation = this.client!.generation({ id: generationId });
      
      if (updates.output !== undefined) {
        generation.update({
          output: sanitizeInput(updates.output),
        });
      }

      if (updates.endTime) {
        generation.update({
          endTime: updates.endTime,
        });
      }

      if (updates.usage) {
        generation.update({
          usage: updates.usage,
        });
      }

      if (this.config?.debug) {
        console.log('Updated Langfuse generation:', { generationId, updates: Object.keys(updates) });
      }
    } catch (error) {
      throw new LangfuseOperationError('updateGeneration', error as Error);
    }
  }

  public async finalizeGeneration(generationId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const generation = this.client!.generation({ id: generationId });
      generation.update({
        endTime: new Date(),
      });

      if (this.config?.debug) {
        console.log('Finalized Langfuse generation:', { generationId });
      }
    } catch (error) {
      throw new LangfuseOperationError('finalizeGeneration', error as Error);
    }
  }

  // ========================================================================
  // Event Tracking
  // ========================================================================

  public async createEvent(params: LangfuseEventParams): Promise<string> {
    await this.ensureInitialized();

    try {
      const eventId = generateId();
      const sanitizedInput = sanitizeInput(params.input);
      const sanitizedOutput = sanitizeInput(params.output);
      const metadata = createStandardMetadata(params.metadata);

      const event = this.client!.event({
        id: eventId,
        traceId: params.traceId,
        parentObservationId: params.parentObservationId,
        name: params.name,
        startTime: params.startTime || new Date(),
        input: sanitizedInput,
        output: sanitizedOutput,
        level: params.level,
        statusMessage: params.statusMessage,
        version: params.version,
        metadata,
      });

      if (this.config?.debug) {
        console.log('Created Langfuse event:', { eventId, traceId: params.traceId, name: params.name });
      }

      return eventId;
    } catch (error) {
      throw new LangfuseOperationError('createEvent', error as Error);
    }
  }

  // ========================================================================
  // Tool Call Tracking
  // ========================================================================

  public async trackToolCall(params: BIToolCallParams): Promise<string> {
    const spanParams: LangfuseSpanParams = {
      traceId: params.traceId,
      parentObservationId: params.parentObservationId,
      name: `tool:${params.toolName}`,
      startTime: params.startTime,
      endTime: params.endTime,
      input: params.input,
      output: params.output,
      level: params.success ? 'DEFAULT' : 'ERROR',
      statusMessage: params.errorMessage,
      metadata: {
        ...params.metadata,
        toolName: params.toolName,
        toolVersion: params.toolVersion,
        success: params.success,
        errorMessage: params.errorMessage,
        ...(params.biContext && { biContext: params.biContext }),
      },
    };

    return this.createSpan(spanParams);
  }

  // ========================================================================
  // Performance Tracking
  // ========================================================================

  public async trackPerformance(params: PerformanceTrackingParams): Promise<void> {
    const eventParams: LangfuseEventParams = {
      traceId: params.traceId,
      name: `performance:${params.operationName}`,
      input: {
        operationName: params.operationName,
        thresholds: params.thresholds,
      },
      output: params.metrics,
      level: this.determinePerformanceLevel(params.metrics, params.thresholds),
      metadata: {
        ...params.metadata,
        metrics: params.metrics,
        thresholds: params.thresholds,
      },
    };

    await this.createEvent(eventParams);
  }

  private determinePerformanceLevel(
    metrics: PerformanceTrackingParams['metrics'], 
    thresholds?: PerformanceTrackingParams['thresholds']
  ): 'DEFAULT' | 'WARNING' | 'ERROR' {
    if (!thresholds) return 'DEFAULT';

    if (thresholds.responseTimeError && metrics.responseTime > thresholds.responseTimeError) {
      return 'ERROR';
    }

    if (thresholds.errorRateError && metrics.errorRate && metrics.errorRate > thresholds.errorRateError) {
      return 'ERROR';
    }

    if (thresholds.responseTimeWarning && metrics.responseTime > thresholds.responseTimeWarning) {
      return 'WARNING';
    }

    if (thresholds.errorRateWarning && metrics.errorRate && metrics.errorRate > thresholds.errorRateWarning) {
      return 'WARNING';
    }

    return 'DEFAULT';
  }

  // ========================================================================
  // Error Tracking
  // ========================================================================

  public async trackError(params: ErrorTrackingParams): Promise<void> {
    const eventParams: LangfuseEventParams = {
      traceId: params.traceId,
      parentObservationId: params.parentObservationId,
      name: `error:${params.error.name}`,
      input: {
        errorName: params.error.name,
        errorMessage: params.error.message,
        severity: params.severity,
        category: params.category,
        context: params.context,
      },
      output: {
        stack: params.error.stack,
        userImpact: params.userImpact,
        recoveryAction: params.recoveryAction,
      },
      level: this.mapErrorSeverityToLevel(params.severity),
      statusMessage: params.error.message,
      metadata: {
        ...params.metadata,
        error: {
          name: params.error.name,
          message: params.error.message,
          stack: params.error.stack,
        },
        severity: params.severity,
        category: params.category,
        context: params.context,
        userImpact: params.userImpact,
        recoveryAction: params.recoveryAction,
      },
    };

    await this.createEvent(eventParams);
  }

  private mapErrorSeverityToLevel(severity: ErrorSeverity): 'DEFAULT' | 'WARNING' | 'ERROR' {
    switch (severity) {
      case 'low':
        return 'DEFAULT';
      case 'medium':
        return 'WARNING';
      case 'high':
      case 'critical':
        return 'ERROR';
      default:
        return 'ERROR';
    }
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  public async flush(): Promise<void> {
    if (!this.isInitialized || !this.client) {
      return;
    }

    try {
      await this.client.flushAsync();
      
      if (this.config?.debug) {
        console.log('Langfuse client flushed successfully');
      }
    } catch (error) {
      throw new LangfuseOperationError('flush', error as Error);
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized || !this.client) {
      return;
    }

    try {
      await this.client.shutdownAsync();
      this.isInitialized = false;
      this.client = null;
      
      if (this.config?.debug) {
        console.log('Langfuse client shutdown successfully');
      }
    } catch (error) {
      throw new LangfuseOperationError('shutdown', error as Error);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientServiceInstance: LangfuseClientServiceImpl | null = null;

/**
 * Gets the singleton instance of the Langfuse client service
 */
export function getLangfuseClientService(): LangfuseClientService {
  if (!clientServiceInstance) {
    clientServiceInstance = new LangfuseClientServiceImpl();
  }
  return clientServiceInstance;
}

/**
 * Resets the client service instance (useful for testing)
 */
export function resetLangfuseClientService(): void {
  if (clientServiceInstance) {
    clientServiceInstance.shutdown().catch(console.error);
    clientServiceInstance = null;
  }
}