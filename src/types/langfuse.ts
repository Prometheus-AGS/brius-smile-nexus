/**
 * Langfuse Integration Types
 * 
 * Comprehensive TypeScript definitions for client-side Langfuse integration
 * including observability, tracing, and business intelligence specific types.
 */

import { z } from 'zod';

// ============================================================================
// Environment Configuration Types
// ============================================================================

/**
 * Langfuse environment configuration schema for Vite compatibility
 */
export const LangfuseEnvSchema = z.object({
  VITE_LANGFUSE_BASE_URL: z.string().url(),
  VITE_LANGFUSE_PUBLIC_KEY: z.string().min(1),
  VITE_LANGFUSE_SECRET_KEY: z.string().min(1),
  VITE_LANGFUSE_HOST: z.string().url(),
  VITE_LANGFUSE_ENABLED: z.string().optional().default('true'),
  VITE_LANGFUSE_DEBUG: z.string().optional().default('false'),
  VITE_LANGFUSE_FLUSH_INTERVAL: z.string().optional().default('1000'),
  VITE_LANGFUSE_BATCH_SIZE: z.string().optional().default('10'),
});

export type LangfuseEnvConfig = z.infer<typeof LangfuseEnvSchema>;

/**
 * Processed Langfuse configuration with proper types
 */
export interface LangfuseConfig {
  baseUrl: string;
  publicKey: string;
  secretKey: string;
  host: string;
  enabled: boolean;
  debug: boolean;
  flushInterval: number;
  batchSize: number;
}

// ============================================================================
// Core Langfuse Types
// ============================================================================

/**
 * Langfuse trace levels for different types of operations
 */
export type LangfuseTraceLevel = 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR';

/**
 * Langfuse observation types
 */
export type LangfuseObservationType = 'SPAN' | 'GENERATION' | 'EVENT';

/**
 * Base metadata interface for all Langfuse operations
 */
export interface LangfuseBaseMetadata {
  userId?: string;
  userName?: string;
  sessionId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

/**
 * Langfuse trace creation parameters
 */
export interface LangfuseTraceParams extends LangfuseBaseMetadata {
  id?: string;
  name: string;
  input?: unknown;
  output?: unknown;
  level?: LangfuseTraceLevel;
  statusMessage?: string;
  version?: string;
  release?: string;
}

/**
 * Langfuse span creation parameters
 */
export interface LangfuseSpanParams extends LangfuseBaseMetadata {
  traceId: string;
  parentObservationId?: string;
  name: string;
  startTime?: Date;
  endTime?: Date;
  input?: unknown;
  output?: unknown;
  level?: LangfuseTraceLevel;
  statusMessage?: string;
  version?: string;
}

/**
 * Langfuse generation parameters for AI model calls
 */
export interface LangfuseGenerationParams extends LangfuseBaseMetadata {
  traceId: string;
  parentObservationId?: string;
  name: string;
  startTime?: Date;
  endTime?: Date;
  completionStartTime?: Date;
  input?: unknown;
  output?: unknown;
  model?: string;
  modelParameters?: Record<string, unknown>;
  usage?: LangfuseUsage;
  level?: LangfuseTraceLevel;
  statusMessage?: string;
  version?: string;
}

/**
 * Langfuse event parameters for discrete events
 */
export interface LangfuseEventParams extends LangfuseBaseMetadata {
  traceId: string;
  parentObservationId?: string;
  name: string;
  startTime?: Date;
  input?: unknown;
  output?: unknown;
  level?: LangfuseTraceLevel;
  statusMessage?: string;
  version?: string;
}

/**
 * Usage statistics for AI model calls
 */
export interface LangfuseUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  unit?: string;
  inputCost?: number;
  outputCost?: number;
  totalCost?: number;
}

// ============================================================================
// Business Intelligence Specific Types
// ============================================================================

/**
 * Business Intelligence query types for specialized tracking
 */
export type BIQueryType = 
  | 'data_analysis'
  | 'report_generation'
  | 'dashboard_query'
  | 'metric_calculation'
  | 'trend_analysis'
  | 'comparative_analysis'
  | 'predictive_analysis'
  | 'custom_query';

/**
 * Business Intelligence context for enhanced observability
 */
export interface BIObservabilityContext {
  queryType: BIQueryType;
  dataSource?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, unknown>;
  aggregations?: string[];
  dimensions?: string[];
  metrics?: string[];
  businessContext?: {
    department?: string;
    useCase?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Enhanced trace parameters for Business Intelligence operations
 */
export interface BITraceParams extends LangfuseTraceParams {
  biContext: BIObservabilityContext;
}

/**
 * Enhanced span parameters for Business Intelligence operations
 */
export interface BISpanParams extends LangfuseSpanParams {
  biContext?: Partial<BIObservabilityContext>;
}

/**
 * Tool call tracking for Business Intelligence operations
 */
export interface BIToolCallParams {
  traceId: string;
  parentObservationId?: string;
  toolName: string;
  toolVersion?: string;
  input: unknown;
  output?: unknown;
  startTime: Date;
  endTime?: Date;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  biContext?: Partial<BIObservabilityContext>;
}

// ============================================================================
// Performance Metrics Types
// ============================================================================

/**
 * Performance metrics for tracking system performance
 */
export interface PerformanceMetrics {
  responseTime: number;
  processingTime: number;
  queueTime?: number;
  networkLatency?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  cacheHitRate?: number;
  errorRate?: number;
  throughput?: number;
}

/**
 * Enhanced performance tracking parameters
 */
export interface PerformanceTrackingParams {
  traceId: string;
  operationName: string;
  metrics: PerformanceMetrics;
  thresholds?: {
    responseTimeWarning?: number;
    responseTimeError?: number;
    errorRateWarning?: number;
    errorRateError?: number;
  };
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Error Tracking Types
// ============================================================================

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error categories for classification
 */
export type ErrorCategory = 
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'network'
  | 'database'
  | 'external_api'
  | 'business_logic'
  | 'system'
  | 'unknown';

/**
 * Comprehensive error tracking parameters
 */
export interface ErrorTrackingParams {
  traceId: string;
  parentObservationId?: string;
  error: Error;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context?: Record<string, unknown>;
  userImpact?: string;
  recoveryAction?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Client Service Types
// ============================================================================

/**
 * Langfuse client service interface
 */
export interface LangfuseClientService {
  // Configuration
  isEnabled(): boolean;
  getConfig(): LangfuseConfig;
  
  // Trace Management
  createTrace(params: LangfuseTraceParams): Promise<string>;
  createBITrace(params: BITraceParams): Promise<string>;
  updateTrace(traceId: string, updates: Partial<LangfuseTraceParams>): Promise<void>;
  finalizeTrace(traceId: string): Promise<void>;
  
  // Span Management
  createSpan(params: LangfuseSpanParams): Promise<string>;
  createBISpan(params: BISpanParams): Promise<string>;
  updateSpan(spanId: string, updates: Partial<LangfuseSpanParams>): Promise<void>;
  finalizeSpan(spanId: string): Promise<void>;
  
  // Generation Tracking
  createGeneration(params: LangfuseGenerationParams): Promise<string>;
  updateGeneration(generationId: string, updates: Partial<LangfuseGenerationParams>): Promise<void>;
  finalizeGeneration(generationId: string): Promise<void>;
  
  // Event Tracking
  createEvent(params: LangfuseEventParams): Promise<string>;
  
  // Tool Call Tracking
  trackToolCall(params: BIToolCallParams): Promise<string>;
  
  // Performance Tracking
  trackPerformance(params: PerformanceTrackingParams): Promise<void>;
  
  // Error Tracking
  trackError(params: ErrorTrackingParams): Promise<void>;
  
  // Utility Methods
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}

/**
 * Observability service interface for comprehensive tracking
 */
export interface ObservabilityService {
  // Trace Management
  startTrace(name: string, input?: unknown, biContext?: BIObservabilityContext): Promise<string>;
  endTrace(traceId: string, output?: unknown): Promise<void>;
  
  // Span Management
  startSpan(traceId: string, name: string, input?: unknown, parentId?: string): Promise<string>;
  endSpan(spanId: string, output?: unknown): Promise<void>;
  
  // Automatic Tracking
  wrapFunction<T extends (...args: unknown[]) => unknown>(
    fn: T,
    name: string,
    options?: {
      traceId?: string;
      parentId?: string;
      biContext?: Partial<BIObservabilityContext>;
    }
  ): T;
  
  wrapAsyncFunction<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    name: string,
    options?: {
      traceId?: string;
      parentId?: string;
      biContext?: Partial<BIObservabilityContext>;
    }
  ): T;
  
  // Performance Monitoring
  measurePerformance<T>(
    operation: () => T | Promise<T>,
    operationName: string,
    traceId: string
  ): Promise<T>;
  
  // Error Handling
  handleError(
    error: Error,
    traceId: string,
    context?: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      parentId?: string;
    }
  ): Promise<void>;
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Langfuse hook return type
 */
export interface UseLangfuseReturn {
  client: LangfuseClientService;
  observability: ObservabilityService;
  isEnabled: boolean;
  config: LangfuseConfig;
}

/**
 * Business Intelligence observability hook return type
 */
export interface UseBIObservabilityReturn {
  startBITrace: (
    name: string,
    queryType: BIQueryType,
    input?: unknown,
    context?: Partial<BIObservabilityContext>
  ) => Promise<string>;
  
  endBITrace: (traceId: string, output?: unknown) => Promise<void>;
  
  trackBIQuery: (
    traceId: string,
    queryType: BIQueryType,
    query: unknown,
    result?: unknown,
    context?: Partial<BIObservabilityContext>
  ) => Promise<string>;
  
  trackToolUsage: (
    traceId: string,
    toolName: string,
    input: unknown,
    output?: unknown,
    parentId?: string
  ) => Promise<string>;
  
  measureQueryPerformance: <T>(
    operation: () => T | Promise<T>,
    queryName: string,
    traceId: string,
    queryType: BIQueryType
  ) => Promise<T>;
  
  handleBIError: (
    error: Error,
    traceId: string,
    context?: {
      queryType?: BIQueryType;
      severity?: ErrorSeverity;
      parentId?: string;
    }
  ) => Promise<void>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Langfuse initialization options
 */
export interface LangfuseInitOptions {
  config?: Partial<LangfuseConfig>;
  enableAutoFlush?: boolean;
  enablePerformanceTracking?: boolean;
  enableErrorTracking?: boolean;
  customTags?: string[];
  defaultMetadata?: Record<string, unknown>;
}

/**
 * Trace context for maintaining trace state
 */
export interface TraceContext {
  traceId: string;
  parentObservationId?: string;
  level: number;
  tags: string[];
  metadata: Record<string, unknown>;
  startTime: Date;
  biContext?: BIObservabilityContext;
}

/**
 * Batch operation parameters for efficient processing
 */
export interface BatchOperationParams {
  operations: Array<{
    type: 'trace' | 'span' | 'generation' | 'event';
    params: LangfuseTraceParams | LangfuseSpanParams | LangfuseGenerationParams | LangfuseEventParams;
  }>;
  batchId?: string;
  priority?: 'low' | 'normal' | 'high';
}

// ============================================================================
// Export All Types
// ============================================================================

export type {
  // Core types are already exported above
};

/**
 * Type guard to check if an object is a valid Langfuse trace parameter
 */
export function isLangfuseTraceParams(obj: unknown): obj is LangfuseTraceParams {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof (obj as LangfuseTraceParams).name === 'string'
  );
}

/**
 * Type guard to check if an object is a valid BI context
 */
export function isBIObservabilityContext(obj: unknown): obj is BIObservabilityContext {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'queryType' in obj &&
    typeof (obj as BIObservabilityContext).queryType === 'string'
  );
}
