/**
 * Mastra Agent Types
 * 
 * Type definitions for Mastra business intelligence agent integration
 * Includes user context, request/response types, and client configuration
 */

// ============================================================================
// User Context Types
// ============================================================================

/**
 * User business intelligence context for personalized agent interactions
 */
export interface UserBIContext {
  userId: string;
  name?: string;
  role?: string;
  department?: string;
  sessionId: string;
  
  analyticalPreferences?: {
    focusAreas: string[];
    defaultTimeRange: string;
    preferredChartTypes: string[];
    reportingStyle: 'summary' | 'detailed' | 'executive';
  };
  
  businessContext?: {
    industry?: string;
    keyMetrics: string[];
    reportingFrequency: string;
    complianceRequirements: string[];
  };
  
  capabilities: string[];
  dataSources: string[];
  lastAnalysisDate?: Date;
  timezone?: string;
}

// ============================================================================
// Agent Request/Response Types
// ============================================================================

/**
 * Request to the business intelligence agent
 */
export interface BIAgentRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  resourceId: string;
  threadId: string;
  userContext: UserBIContext;
  options?: {
    maxSteps?: number;
    temperature?: number;
    output?: Record<string, unknown>;
  };
}

/**
 * Response from the business intelligence agent
 */
export interface BIAgentResponse {
  text: string;
  object?: Record<string, unknown>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  steps?: Array<{
    stepType: string;
    text?: string;
    toolCalls?: Array<{
      toolName: string;
      args: Record<string, unknown>;
      result?: unknown;
    }>;
  }>;
  metadata?: {
    executionTime: number;
    agentId: string;
    threadId: string;
    resourceId: string;
  };
}

/**
 * Streaming response chunk from the business intelligence agent
 */
export interface BIStreamResponse {
  type: 'text' | 'tool_call' | 'tool_result' | 'finish' | 'error';
  content?: string;
  toolCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  toolResult?: {
    name: string;
    result: unknown;
  };
  error?: string;
  finish?: BIAgentResponse;
}

// ============================================================================
// Business Intelligence Query Types
// ============================================================================

/**
 * Business intelligence query types for analytics operations
 * Aligned with existing langfuse types for compatibility
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
 * Analytics query configuration
 */
export interface AnalyticsQuery {
  id: string;
  type: BIQueryType;
  query: string;
  parameters?: Record<string, unknown>;
  timeRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, unknown>;
  aggregations?: string[];
  dimensions?: string[];
  metrics?: string[];
}

/**
 * Analytics result from the BI agent
 */
export interface AnalyticsResult {
  id: string;
  data: unknown;
  metadata: {
    executionTime: number;
    recordCount: number;
    cacheHit: boolean;
    queryOptimized: boolean;
  };
  insights?: {
    trends: string[];
    anomalies: string[];
    recommendations: string[];
  };
}

// ============================================================================
// Dashboard Types
// ============================================================================

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  id: string;
  title: string;
  description?: string;
  widgets: DashboardWidget[];
  refreshInterval: number;
  userContext: UserBIContext;
}

/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text' | 'alert';
  title: string;
  data: unknown;
  config: Record<string, unknown>;
  refreshInterval?: number;
}

/**
 * Dashboard data response
 */
export interface DashboardData {
  id: string;
  title: string;
  widgets: DashboardWidget[];
  lastUpdated: Date;
  refreshInterval: number;
  metrics?: Array<{
    id: string;
    title: string;
    value: string | number;
    change: number;
    changeType: 'increase' | 'decrease' | 'neutral';
    description: string;
    category: 'performance' | 'business' | 'operational';
  }>;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Mastra client error
 */
export interface MastraClientError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  recoverable: boolean;
}

/**
 * Analytics error
 */
export interface AnalyticsError {
  queryId: string;
  error: Error;
  context: Record<string, unknown>;
  recoverable: boolean;
}

// ============================================================================
// Feature Flag Types
// ============================================================================

/**
 * Feature flags for BI system (updated for Mastra)
 */
export interface BIFeatureFlags {
  useMastra: boolean;
  enableUserContext: boolean;
  enableMemoryPersistence: boolean;
  fallbackToLegacy: boolean;
  debugMode: boolean;
}

// ============================================================================
// Migration Bridge Types
// ============================================================================

/**
 * Migration bridge configuration
 */
export interface MigrationBridgeConfig {
  featureFlags: BIFeatureFlags;
  mastraServerUrl: string;
  agentId: string;
  fallbackTimeout: number;
  retryAttempts: number;
}

/**
 * Service response wrapper for migration bridge
 */
export interface ServiceResponse<T> {
  data: T;
  source: 'mastra' | 'legacy';
  timestamp: Date;
  executionTime: number;
  cached: boolean;
}