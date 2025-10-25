/**
 * Comprehensive Mastra Multi-Agent Types
 * 
 * TypeScript interfaces for all three Mastra agents:
 * - Orchestrator Agent (primary with intelligent routing)
 * - Business Intelligence Agent (direct BI access)
 * - Default Agent (simple queries and fallback)
 * 
 * Based on Mastra v0.21.1 APIs and orchestrator patterns from brius-business-intelligence
 */

import { z } from 'zod';

// ============================================================================
// Base Agent Communication Types
// ============================================================================

/**
 * Base agent request interface
 */
export interface MastraAgentRequest {
  /** Request identifier */
  id: string;
  /** User query/prompt */
  query: string;
  /** Request context */
  context?: {
    userId?: string;
    sessionId?: string;
    conversationId?: string;
    [key: string]: unknown;
  };
  /** Request parameters */
  parameters?: Record<string, unknown>;
}

/**
 * Base agent response interface
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
    processingTime?: number;
    confidence?: number;
    sources?: string[];
    context?: Record<string, unknown>;
  };
  /** Response timestamp */
  timestamp: Date;
  /** Error information if response type is error */
  error?: MastraAgentError;
}

/**
 * Agent error interface
 */
export interface MastraAgentError extends Error {
  code: string;
  status?: number;
  details?: Record<string, unknown>;
  retryable: boolean;
  cause?: Error;
  timestamp: Date;
}

// ============================================================================
// Orchestrator Agent Types
// ============================================================================

/**
 * Intent classification input schema
 */
export const IntentClassificationInputSchema = z.object({
  prompt: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Intent classification output schema
 */
export const IntentClassificationOutputSchema = z.object({
  classification: z.record(z.string(), z.unknown()),
  complexity_analysis: z.record(z.string(), z.unknown()),
  routing_decision: z.object({
    recommended_agent: z.string(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
  }),
});

/**
 * Orchestrator input schema
 */
export const OrchestratorInputSchema = z.object({
  query: z.string().min(1),
  user_id: z.string().optional(),
  conversation_id: z.string().optional(),
  session_id: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  routing_hints: z
    .object({
      preferred_agent: z.string().optional(),
      complexity_override: z.enum(['force_simple', 'force_complex']).optional(),
      bypass_classification: z.boolean().default(false),
    })
    .optional(),
});

/**
 * Orchestrator output schema
 */
export const OrchestratorOutputSchema = z.object({
  original_query: z.string(),
  routing_decision: z.object({
    selected_agent: z.string(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
    classification_details: IntentClassificationOutputSchema,
  }),
  agent_execution_result: z.record(z.string(), z.unknown()),
  orchestration_metadata: z.object({
    total_execution_time_ms: z.number().int().nonnegative(),
    classification_time_ms: z.number().int().nonnegative(),
    agent_execution_time_ms: z.number().int().nonnegative(),
    routing_path: z.array(z.string()),
  }),
  final_response: z.string(),
  follow_up_suggestions: z.array(z.string()).optional(),
});

// TypeScript types inferred from schemas
export type IntentClassificationInput = z.infer<typeof IntentClassificationInputSchema>;
export type IntentClassificationOutput = z.infer<typeof IntentClassificationOutputSchema>;
export type OrchestratorInput = z.infer<typeof OrchestratorInputSchema>;
export type OrchestratorOutput = z.infer<typeof OrchestratorOutputSchema>;

/**
 * Orchestrator request interface
 */
export interface MastraOrchestratorRequest extends MastraAgentRequest {
  /** Query type for routing hints */
  type?: 'analytics' | 'dashboard' | 'report' | 'general';
  /** Routing preferences */
  routing_hints?: {
    preferred_agent?: string;
    complexity_override?: 'force_simple' | 'force_complex';
    bypass_classification?: boolean;
  };
}

/**
 * Orchestrator response interface
 */
export interface MastraOrchestratorResponse extends MastraAgentResponse {
  /** Orchestrator-specific data */
  orchestration?: {
    routing_decision: {
      selected_agent: string;
      confidence: number;
      reasoning: string;
      classification_details: IntentClassificationOutput;
    };
    orchestration_metadata: {
      total_execution_time_ms: number;
      classification_time_ms: number;
      agent_execution_time_ms: number;
      routing_path: string[];
    };
    follow_up_suggestions?: string[];
  };
}

// ============================================================================
// Business Intelligence Agent Types
// ============================================================================

/**
 * Business Intelligence planner input schema
 */
export const BusinessIntelligencePlannerInputSchema = z.object({
  query: z.string().min(1),
  user_id: z.string().optional(),
  conversation_id: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  knowledge_context: z.array(z.any()).optional(),
  memory_context: z.array(z.any()).optional(),
  available_tools: z.array(z.string()).optional(),
  constraints: z
    .object({
      max_execution_time_ms: z.number().int().positive().optional(),
      max_tool_calls: z.number().int().positive().optional(),
      required_confidence_threshold: z.number().min(0).max(1).optional(),
      preferred_data_sources: z.array(z.string()).optional(),
    })
    .optional(),
});

/**
 * Business Intelligence executor output schema
 */
export const BusinessIntelligenceExecutorOutputSchema = z.object({
  original_query: z.string(),
  execution_summary: z.object({
    total_execution_time_ms: z.number().int().nonnegative(),
    steps_attempted: z.number().int().nonnegative(),
    steps_completed: z.number().int().nonnegative(),
    steps_failed: z.number().int().nonnegative(),
    tools_executed: z.number().int().nonnegative(),
    data_sources_accessed: z.array(z.string()),
  }),
  step_results: z.array(z.any()),
  final_analysis: z.object({
    key_findings: z.array(z.string()),
    insights: z.array(z.string()),
    recommendations: z.array(z.string()),
    confidence_score: z.number().min(0).max(1),
    data_quality_assessment: z.string(),
    limitations: z.array(z.string()).optional(),
  }),
  deliverables: z.record(z.string(), z.unknown()),
  executive_summary: z.string(),
  next_actions: z.array(z.string()).optional(),
  metadata: z.object({
    analysis_approach_used: z.enum(['descriptive', 'diagnostic', 'predictive', 'prescriptive']),
    primary_data_sources: z.array(z.string()),
    tools_effectiveness: z.record(z.string(), z.number().min(0).max(1)).optional(),
    execution_quality_score: z.number().min(0).max(1),
  }),
});

// TypeScript types for BI agent
export type BusinessIntelligencePlannerInput = z.infer<typeof BusinessIntelligencePlannerInputSchema>;
export type BusinessIntelligenceExecutorOutput = z.infer<typeof BusinessIntelligenceExecutorOutputSchema>;

/**
 * Business Intelligence request interface
 */
export interface MastraBusinessIntelligenceRequest extends MastraAgentRequest {
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
 * Business Intelligence response interface
 */
export interface MastraBusinessIntelligenceResponse extends MastraAgentResponse {
  /** BI-specific data structure */
  business_intelligence?: {
    execution_summary: {
      total_execution_time_ms: number;
      steps_attempted: number;
      steps_completed: number;
      steps_failed: number;
      tools_executed: number;
      data_sources_accessed: string[];
    };
    final_analysis: {
      key_findings: string[];
      insights: string[];
      recommendations: string[];
      confidence_score: number;
      data_quality_assessment: string;
      limitations?: string[];
    };
    deliverables: Record<string, unknown>;
    executive_summary: string;
    next_actions?: string[];
    metadata: {
      analysis_approach_used: 'descriptive' | 'diagnostic' | 'predictive' | 'prescriptive';
      primary_data_sources: string[];
      execution_quality_score: number;
    };
  };
}

// ============================================================================
// Default Agent Types
// ============================================================================

/**
 * Default agent request interface
 */
export interface MastraDefaultRequest extends MastraAgentRequest {
  /** Simple query type */
  type: 'general' | 'help' | 'clarification';
}

/**
 * Default agent response interface
 */
export interface MastraDefaultResponse extends MastraAgentResponse {
  /** Default agent specific data */
  default_agent?: {
    response_type: 'informational' | 'clarification' | 'help' | 'fallback';
    confidence_level: 'low' | 'medium' | 'high';
    suggested_actions?: string[];
  };
}

// ============================================================================
// Multi-Agent Management Types
// ============================================================================

/**
 * Agent types enumeration
 */
export enum MastraAgentType {
  ORCHESTRATOR = 'orchestrator',
  BUSINESS_INTELLIGENCE = 'business-intelligence',
  DEFAULT = 'default',
}

/**
 * Agent selection strategy
 */
export interface AgentSelectionStrategy {
  /** Primary agent to use */
  primary: MastraAgentType;
  /** Fallback chain */
  fallback: MastraAgentType[];
  /** Selection criteria */
  criteria: {
    complexity_threshold?: number;
    query_type_mapping?: Record<string, MastraAgentType>;
    user_preferences?: Record<string, MastraAgentType>;
  };
}

/**
 * Agent health status
 */
export interface AgentHealthStatus {
  /** Agent type */
  agent: MastraAgentType;
  /** Health status */
  status: 'healthy' | 'degraded' | 'offline';
  /** Last health check */
  last_check: Date;
  /** Response time in ms */
  response_time?: number;
  /** Error details if unhealthy */
  error?: string;
}

/**
 * Multi-agent execution result
 */
export interface MultiAgentExecutionResult {
  /** Original request */
  request: MastraAgentRequest;
  /** Agent that handled the request */
  executed_by: MastraAgentType;
  /** Agent response */
  response: MastraAgentResponse | MastraOrchestratorResponse | MastraBusinessIntelligenceResponse | MastraDefaultResponse;
  /** Execution metadata */
  execution_metadata: {
    /** Total execution time */
    total_time_ms: number;
    /** Agents attempted */
    agents_attempted: MastraAgentType[];
    /** Fallback reason if applicable */
    fallback_reason?: string;
    /** Health status of all agents */
    agent_health: AgentHealthStatus[];
  };
}

/**
 * Agent configuration interface
 */
export interface MastraAgentConfig {
  /** Base URL for the agent service */
  baseUrl: string;
  /** Agent endpoint path */
  endpoint: string;
  /** API key for authentication */
  apiKey?: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Enable debug logging */
  debug: boolean;
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Multi-agent manager configuration
 */
export interface MastraMultiAgentConfig {
  /** Orchestrator agent configuration */
  orchestrator: MastraAgentConfig;
  /** Business Intelligence agent configuration */
  businessIntelligence: MastraAgentConfig;
  /** Default agent configuration */
  default: MastraAgentConfig;
  /** Agent selection strategy */
  strategy: AgentSelectionStrategy;
  /** Health check interval in ms */
  healthCheckInterval: number;
  /** Enable automatic fallback */
  enableFallback: boolean;
}

// ============================================================================
// Environment Configuration Schema
// ============================================================================

/**
 * Environment configuration schema for multi-agent setup
 */
export const MastraMultiAgentEnvSchema = z.object({
  // Base configuration
  VITE_MASTRA_BASE_URL: z.string().url().default('http://localhost:3000'),
  VITE_MASTRA_API_KEY: z.string().optional(),
  VITE_MASTRA_DEBUG: z.coerce.boolean().default(false),
  
  // Orchestrator configuration
  VITE_MASTRA_ORCHESTRATOR_ENDPOINT: z.string().default('/agents/orchestrator-agent/generate'),
  VITE_MASTRA_ORCHESTRATOR_TIMEOUT: z.coerce.number().default(45000),
  
  // Business Intelligence configuration
  VITE_MASTRA_BI_ENDPOINT: z.string().default('/agents/business-intelligence-agent/generate'),
  VITE_MASTRA_BI_TIMEOUT: z.coerce.number().default(60000),
  
  // Default agent configuration
  VITE_MASTRA_DEFAULT_ENDPOINT: z.string().default('/agents/default-agent/generate'),
  VITE_MASTRA_DEFAULT_TIMEOUT: z.coerce.number().default(30000),
  
  // Multi-agent strategy configuration
  VITE_MASTRA_PRIMARY_AGENT: z.enum(['orchestrator', 'business-intelligence', 'default']).default('orchestrator'),
  VITE_MASTRA_ENABLE_FALLBACK: z.coerce.boolean().default(true),
  VITE_MASTRA_FALLBACK_CHAIN: z.string().default('orchestrator,business-intelligence,default'),
  VITE_MASTRA_MAX_RETRIES: z.coerce.number().default(3),
  VITE_MASTRA_HEALTH_CHECK_INTERVAL: z.coerce.number().default(60000),
});

/**
 * Validated environment configuration type
 */
export type MastraMultiAgentEnvConfig = z.infer<typeof MastraMultiAgentEnvSchema>;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Multi-agent error types
 */
export enum MastraMultiAgentErrorType {
  ORCHESTRATOR_ERROR = 'ORCHESTRATOR_ERROR',
  BUSINESS_INTELLIGENCE_ERROR = 'BUSINESS_INTELLIGENCE_ERROR',
  DEFAULT_AGENT_ERROR = 'DEFAULT_AGENT_ERROR',
  AGENT_SELECTION_ERROR = 'AGENT_SELECTION_ERROR',
  FALLBACK_EXHAUSTED = 'FALLBACK_EXHAUSTED',
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

/**
 * Multi-agent error class
 */
export class MastraMultiAgentError extends Error implements MastraAgentError {
  public readonly code: string;
  public readonly status?: number;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;
  public readonly cause?: Error;
  public readonly timestamp: Date;
  public readonly agent?: MastraAgentType;

  constructor(
    message: string,
    code: MastraMultiAgentErrorType,
    options: {
      status?: number;
      details?: Record<string, unknown>;
      retryable?: boolean;
      cause?: Error;
      agent?: MastraAgentType;
    } = {}
  ) {
    super(message);
    this.name = 'MastraMultiAgentError';
    this.code = code;
    this.status = options.status;
    this.details = options.details;
    this.retryable = options.retryable ?? false;
    this.cause = options.cause;
    this.agent = options.agent;
    this.timestamp = new Date();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MastraMultiAgentError);
    }
  }
}