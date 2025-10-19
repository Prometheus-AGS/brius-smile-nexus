/**
 * Mastra Client Types
 * 
 * TypeScript interfaces for Mastra v0.21.1 client configuration,
 * agent responses, streaming, and error handling.
 * 
 * Based on Mastra v0.21.1 APIs and patterns for business intelligence agent integration.
 */

import { z } from 'zod';

// ============================================================================
// Core Mastra Configuration Types
// ============================================================================

/**
 * Mastra client configuration interface
 */
export interface MastraClientConfig {
  /** Base URL for the Mastra agent service */
  baseUrl: string;
  /** API key for authentication (optional for localhost) */
  apiKey?: string;
  /** Agent name to connect to */
  agentName: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom headers to include in requests */
  headers?: Record<string, string>;
}

/**
 * Environment configuration schema for validation
 */
export const MastraEnvSchema = z.object({
  VITE_MASTRA_BASE_URL: z.string().url().default('http://localhost:3000'),
  VITE_MASTRA_API_KEY: z.string().optional(),
  VITE_MASTRA_AGENT_NAME: z.string().default('business-intelligence'),
  VITE_MASTRA_TIMEOUT: z.coerce.number().default(30000),
  VITE_MASTRA_MAX_RETRIES: z.coerce.number().default(3),
  VITE_MASTRA_DEBUG: z.coerce.boolean().default(false),
});

/**
 * Validated environment configuration type
 */
export type MastraEnvConfig = z.infer<typeof MastraEnvSchema>;

// ============================================================================
// Agent Communication Types
// ============================================================================

/**
 * Base message interface for agent communication
 */
export interface MastraMessage {
  /** Unique message identifier */
  id: string;
  /** Message content */
  content: string;
  /** Message role (user, assistant, system) */
  role: 'user' | 'assistant' | 'system';
  /** Message timestamp */
  timestamp: Date;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Agent query request interface
 */
export interface MastraAgentQuery {
  /** Query identifier */
  id: string;
  /** Query content/prompt */
  query: string;
  /** Query type for routing */
  type: 'analytics' | 'dashboard' | 'report' | 'general';
  /** Additional context for the query */
  context?: {
    /** User context information */
    user?: {
      id: string;
      preferences?: Record<string, unknown>;
    };
    /** Session information */
    session?: {
      id: string;
      history?: MastraMessage[];
    };
    /** Business context */
    business?: {
      industry?: string;
      metrics?: string[];
      timeRange?: {
        start: Date;
        end: Date;
      };
      // BI-specific extensions
      biDataSources?: string[];
      biTimeRange?: {
        start: Date;
        end: Date;
        granularity?: 'hour' | 'day' | 'week' | 'month' | 'year';
      };
      biMetrics?: string[];
      biDimensions?: string[];
      biFilters?: Record<string, unknown>;
      biAggregations?: Array<{
        field: string;
        function: 'sum' | 'avg' | 'count' | 'min' | 'max';
      }>;
    };
  };
  /** Query parameters */
  parameters?: Record<string, unknown>;
}

/**
 * Agent response interface
 */
export interface MastraAgentResponse {
  /** Response identifier */
  id: string;
  /** Response content */
  content: string;
  /** Response type */
  type: 'text' | 'data' | 'chart' | 'table' | 'error';
  /** Structured data payload */
  data?: unknown;
  /** Response metadata */
  metadata?: {
    /** Processing time in milliseconds */
    processingTime?: number;
    /** Confidence score (0-1) */
    confidence?: number;
    /** Data sources used */
    sources?: string[];
    /** Additional context */
    context?: Record<string, unknown>;
  };
  /** Response timestamp */
  timestamp: Date;
  /** Error information if response type is error */
  error?: MastraClientError;
}

// ============================================================================
// Streaming Types
// ============================================================================

/**
 * Streaming response chunk interface
 */
export interface MastraStreamChunk {
  /** Chunk identifier */
  id: string;
  /** Chunk content */
  content: string;
  /** Whether this is the final chunk */
  done: boolean;
  /** Chunk metadata */
  metadata?: {
    /** Chunk index in the stream */
    index?: number;
    /** Total expected chunks (if known) */
    total?: number;
    /** Chunk type */
    type?: 'text' | 'data' | 'metadata';
  };
  /** Chunk timestamp */
  timestamp: Date;
}

/**
 * Streaming request configuration
 */
export interface MastraStreamConfig {
  /** Enable streaming response */
  stream: boolean;
  /** Chunk size for streaming (optional) */
  chunkSize?: number;
  /** Stream timeout in milliseconds */
  streamTimeout?: number;
  /** Callback for handling stream chunks */
  onChunk?: (chunk: MastraStreamChunk) => void;
  /** Callback for stream completion */
  onComplete?: (response: MastraAgentResponse) => void;
  /** Callback for stream errors */
  onError?: (error: MastraClientError) => void;
}

// ============================================================================
// Error Handling Types
// ============================================================================

/**
 * Mastra client error interface
 */
export interface MastraClientError extends Error {
  /** Error code */
  code: string;
  /** HTTP status code (if applicable) */
  status?: number;
  /** Error details */
  details?: Record<string, unknown>;
  /** Whether the error is retryable */
  retryable: boolean;
  /** Original error (if wrapped) */
  cause?: Error;
  /** Error timestamp */
  timestamp: Date;
}

/**
 * Error types enumeration
 */
export enum MastraErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AGENT_ERROR = 'AGENT_ERROR',
  STREAM_ERROR = 'STREAM_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// ============================================================================
// Health Check Types
// ============================================================================

/**
 * Health check response interface
 */
export interface MastraHealthResponse {
  /** Service status */
  status: 'healthy' | 'unhealthy' | 'degraded';
  /** Agent availability */
  agent: {
    /** Agent name */
    name: string;
    /** Agent status */
    status: 'available' | 'busy' | 'offline';
    /** Agent version */
    version?: string;
    /** Agent capabilities */
    capabilities?: string[];
  };
  /** Service uptime in milliseconds */
  uptime: number;
  /** Response timestamp */
  timestamp: Date;
  /** Additional service information */
  details?: Record<string, unknown>;
}

// ============================================================================
// Business Intelligence Specific Types
// ============================================================================

/**
 * BI query request interface extending base agent query
 */
export interface MastraBIQuery extends MastraAgentQuery {
  /** BI-specific query type */
  type: 'analytics' | 'dashboard' | 'report';
  /** Data source specifications */
  dataSources?: string[];
  /** Time range for the query */
  timeRange?: {
    start: Date;
    end: Date;
    granularity?: 'hour' | 'day' | 'week' | 'month' | 'year';
  };
  /** Metrics to analyze */
  metrics?: string[];
  /** Dimensions to group by */
  dimensions?: string[];
  /** Filters to apply */
  filters?: Record<string, unknown>;
  /** Aggregation functions */
  aggregations?: Array<{
    field: string;
    function: 'sum' | 'avg' | 'count' | 'min' | 'max';
  }>;
}

/**
 * BI response interface extending base agent response
 */
export interface MastraBIResponse extends MastraAgentResponse {
  /** BI-specific data structure */
  data?: {
    /** Query results */
    results?: unknown[];
    /** Data summary */
    summary?: {
      totalRecords: number;
      aggregations?: Record<string, number>;
      trends?: Record<string, number>;
    };
    /** Chart configuration */
    chart?: {
      type: 'line' | 'bar' | 'pie' | 'scatter' | 'table';
      config: Record<string, unknown>;
    };
    /** Insights and recommendations */
    insights?: {
      trends: string[];
      anomalies: string[];
      recommendations: string[];
    };
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Request options for Mastra client methods
 */
export interface MastraRequestOptions {
  /** Request timeout override */
  timeout?: number;
  /** Retry configuration override */
  retries?: number;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Request metadata */
  metadata?: Record<string, unknown>;
  /** Streaming configuration */
  stream?: MastraStreamConfig;
}

/**
 * Mastra client status
 */
export interface MastraClientStatus {
  /** Connection status */
  connected: boolean;
  /** Agent availability */
  agentAvailable: boolean;
  /** Last health check timestamp */
  lastHealthCheck: Date;
  /** Current configuration */
  config: MastraClientConfig;
  /** Connection statistics */
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
  };
}