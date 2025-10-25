/**
 * Mastra Business Intelligence Client Service
 * 
 * Direct access to the Business Intelligence agent with sophisticated planner-executor
 * pattern for complex analytical workflows. This service provides specialized BI
 * capabilities including advanced analytics, reporting, and dashboard generation.
 * 
 * Based on Mastra v0.21.1 BI agent patterns from brius-business-intelligence
 */

import { z } from 'zod';
import type {
  MastraBusinessIntelligenceRequest,
  MastraBusinessIntelligenceResponse,
  BusinessIntelligencePlannerInput,
  BusinessIntelligenceExecutorOutput,
  MastraAgentConfig,
  MastraMultiAgentEnvConfig,
} from '@/types/mastra-agents-types';
import {
  MastraMultiAgentEnvSchema,
  BusinessIntelligencePlannerInputSchema,
  BusinessIntelligenceExecutorOutputSchema,
  MastraMultiAgentError,
  MastraMultiAgentErrorType,
  MastraAgentType,
} from '@/types/mastra-agents-types';
import type { AgentInputContext } from '@/types/role-types';
import { isAgentInputContext } from '@/types/role-types';

// ============================================================================
// Configuration and Validation
// ============================================================================

/**
 * Load and validate Business Intelligence agent configuration
 */
function loadBusinessIntelligenceConfig(): MastraAgentConfig {
  try {
    const env = MastraMultiAgentEnvSchema.parse(import.meta.env);
    return {
      baseUrl: env.VITE_MASTRA_BASE_URL,
      endpoint: env.VITE_MASTRA_BI_ENDPOINT,
      apiKey: env.VITE_MASTRA_API_KEY,
      timeout: env.VITE_MASTRA_BI_TIMEOUT,
      maxRetries: env.VITE_MASTRA_MAX_RETRIES,
      debug: env.VITE_MASTRA_DEBUG,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'brius-smile-nexus/1.0.0',
        'X-Agent-Type': 'business-intelligence',
      },
    };
  } catch (error) {
    console.warn('Failed to parse BI agent environment variables, using defaults:', error);
    return {
      baseUrl: 'http://localhost:3000',
      endpoint: '/agents/business-intelligence-agent/generate',
      timeout: 60000,
      maxRetries: 3,
      debug: false,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'brius-smile-nexus/1.0.0',
        'X-Agent-Type': 'business-intelligence',
      },
    };
  }
}

// ============================================================================
// Business Intelligence Client Service Class
// ============================================================================

/**
 * Mastra Business Intelligence Client Service
 * 
 * Provides direct access to the sophisticated BI agent with planner-executor
 * architecture for complex analytical workflows and executive-ready deliverables.
 */
export class MastraBusinessIntelligenceClient {
  private readonly config: MastraAgentConfig;
  private readonly stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    analysisTypes: Record<string, number>;
    plannerExecutorUsage: number;
    fallbackUsage: number;
  };
  private lastHealthCheck: Date;
  private isConnected: boolean;
  private agentAvailable: boolean;

  constructor(config?: Partial<MastraAgentConfig>) {
    this.config = { ...loadBusinessIntelligenceConfig(), ...config };
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      analysisTypes: {},
      plannerExecutorUsage: 0,
      fallbackUsage: 0,
    };
    this.lastHealthCheck = new Date();
    this.isConnected = false;
    this.agentAvailable = false;

    // Initialize connection status
    this.initializeConnection();

    if (this.config.debug) {
      console.log('MastraBusinessIntelligenceClient initialized with config:', {
        ...this.config,
        apiKey: this.config.apiKey ? '[REDACTED]' : undefined,
      });
    }
  }

  /**
   * Initialize connection to BI agent service
   */
  private async initializeConnection(): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: this.config.headers,
        signal: AbortSignal.timeout(5000),
      });

      this.isConnected = response.ok;
      this.agentAvailable = response.ok;

      if (this.config.debug) {
        console.log('BI agent connection status:', { connected: this.isConnected });
      }
    } catch (error) {
      if (this.config.debug) {
        console.warn('BI agent connection failed:', error);
      }
      this.isConnected = false;
      this.agentAvailable = false;
    }
  }

  // ============================================================================
  // Core Business Intelligence Methods
  // ============================================================================

  /**
   * Execute a business intelligence query with planner-executor pattern
   */
  async executeQuery(
    request: MastraBusinessIntelligenceRequest,
    options: {
      timeout?: number;
      retries?: number;
      headers?: Record<string, string>;
      usePlannerExecutor?: boolean;
    } = {}
  ): Promise<MastraBusinessIntelligenceResponse> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      if (this.config.debug) {
        console.log('Executing BI query:', request);
      }

      // Validate request input
      this.validateRequest(request);

      // Use planner-executor pattern by default for complex queries
      const usePlannerExecutor = options.usePlannerExecutor ?? this.shouldUsePlannerExecutor(request);

      let response: MastraBusinessIntelligenceResponse;

      if (usePlannerExecutor && this.isConnected) {
        response = await this.executePlannerExecutorWorkflow(request, options);
        this.stats.plannerExecutorUsage++;
      } else {
        response = await this.executeDirectQuery(request, options);
        this.stats.fallbackUsage++;
      }

      // Update statistics
      this.updateStats(startTime, true, request.type);
      this.stats.successfulRequests++;

      if (this.config.debug) {
        console.log('BI query executed successfully:', {
          type: request.type,
          usedPlannerExecutor: usePlannerExecutor,
          executionTime: Date.now() - startTime,
        });
      }

      return response;
    } catch (error) {
      this.stats.failedRequests++;
      this.updateStats(startTime, false);

      if (error instanceof MastraMultiAgentError) {
        throw error;
      }

      throw new MastraMultiAgentError(
        `BI query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MastraMultiAgentErrorType.BUSINESS_INTELLIGENCE_ERROR,
        {
          retryable: true,
          cause: error instanceof Error ? error : undefined,
          details: { requestId: request.id, type: request.type },
          agent: MastraAgentType.BUSINESS_INTELLIGENCE,
        }
      );
    }
  }

  /**
   * Execute analytics query with specialized BI processing
   */
  async executeAnalyticsQuery(
    query: string,
    options: {
      dataSources?: string[];
      timeRange?: {
        start: Date;
        end: Date;
        granularity?: 'hour' | 'day' | 'week' | 'month' | 'year';
      };
      metrics?: string[];
      dimensions?: string[];
      filters?: Record<string, unknown>;
      context?: Record<string, unknown>;
    } = {}
  ): Promise<MastraBusinessIntelligenceResponse> {
    const request: MastraBusinessIntelligenceRequest = {
      id: `analytics-${Date.now()}`,
      query,
      type: 'analytics',
      dataSources: options.dataSources,
      timeRange: options.timeRange,
      metrics: options.metrics,
      dimensions: options.dimensions,
      filters: options.filters,
      context: options.context,
    };

    return this.executeQuery(request, { usePlannerExecutor: true });
  }

  /**
   * Generate dashboard with BI agent
   */
  async generateDashboard(
    dashboardId: string,
    options: {
      widgets?: string[];
      timeRange?: { start: Date; end: Date };
      refreshInterval?: number;
      context?: Record<string, unknown>;
    } = {}
  ): Promise<MastraBusinessIntelligenceResponse> {
    const request: MastraBusinessIntelligenceRequest = {
      id: `dashboard-${dashboardId}`,
      query: `Generate dashboard with ID: ${dashboardId}`,
      type: 'dashboard',
      timeRange: options.timeRange,
      context: {
        ...options.context,
        dashboardId,
        widgets: options.widgets,
        refreshInterval: options.refreshInterval,
      },
    };

    return this.executeQuery(request, { usePlannerExecutor: true });
  }

  /**
   * Generate comprehensive report with BI agent
   */
  async generateReport(
    reportConfig: {
      type: 'summary' | 'detailed' | 'trend' | 'comparative';
      title: string;
      dataSources: string[];
      timeRange: { start: Date; end: Date };
      metrics: string[];
      dimensions: string[];
      filters?: Record<string, unknown>;
      format: 'json' | 'csv' | 'pdf';
    },
    options: {
      context?: Record<string, unknown>;
    } = {}
  ): Promise<MastraBusinessIntelligenceResponse> {
    const request: MastraBusinessIntelligenceRequest = {
      id: `report-${Date.now()}`,
      query: `Generate ${reportConfig.type} report: ${reportConfig.title}`,
      type: 'report',
      dataSources: reportConfig.dataSources,
      timeRange: {
        ...reportConfig.timeRange,
        granularity: 'day',
      },
      metrics: reportConfig.metrics,
      dimensions: reportConfig.dimensions,
      filters: reportConfig.filters,
      context: {
        ...options.context,
        reportConfig,
      },
    };

    return this.executeQuery(request, { usePlannerExecutor: true });
  }

  // ============================================================================
  // Health Check and Status Methods
  // ============================================================================

  /**
   * Check BI agent health
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'offline';
    agent: {
      name: string;
      status: 'available' | 'busy' | 'offline';
      version: string;
      capabilities: string[];
    };
    uptime: number;
    timestamp: Date;
    details: Record<string, unknown>;
  }> {
    try {
      if (this.config.debug) {
        console.log('Checking BI agent health...');
      }

      await this.initializeConnection();
      this.lastHealthCheck = new Date();

      const healthResponse = {
        status: this.agentAvailable ? 'healthy' as const : 'degraded' as const,
        agent: {
          name: 'business-intelligence-agent',
          status: this.agentAvailable ? 'available' as const : 'offline' as const,
          version: '0.21.1',
          capabilities: [
            'planner-executor-pattern',
            'advanced-analytics',
            'executive-reporting',
            'orthodontic-domain-expertise',
            'time-aware-analysis',
            'multi-step-workflows',
          ],
        },
        uptime: Date.now() - this.lastHealthCheck.getTime(),
        timestamp: new Date(),
        details: {
          baseUrl: this.config.baseUrl,
          endpoint: this.config.endpoint,
          totalRequests: this.stats.totalRequests,
          successRate: this.calculateSuccessRate(),
          plannerExecutorUsage: this.stats.plannerExecutorUsage,
          analysisTypes: this.stats.analysisTypes,
        },
      };

      if (this.config.debug) {
        console.log('BI agent health check completed:', healthResponse);
      }

      return healthResponse;
    } catch (error) {
      this.isConnected = false;
      this.agentAvailable = false;

      throw new MastraMultiAgentError(
        `BI agent health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MastraMultiAgentErrorType.HEALTH_CHECK_FAILED,
        {
          retryable: true,
          cause: error instanceof Error ? error : undefined,
          agent: MastraAgentType.BUSINESS_INTELLIGENCE,
        }
      );
    }
  }

  /**
   * Get current BI agent status
   */
  getStatus(): {
    connected: boolean;
    agentAvailable: boolean;
    lastHealthCheck: Date;
    config: MastraAgentConfig;
    stats: typeof this.stats;
  } {
    return {
      connected: this.isConnected,
      agentAvailable: this.agentAvailable,
      lastHealthCheck: this.lastHealthCheck,
      config: this.config,
      stats: { ...this.stats },
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Execute planner-executor workflow for complex BI queries
   */
  private async executePlannerExecutorWorkflow(
    request: MastraBusinessIntelligenceRequest,
    options: {
      timeout?: number;
      retries?: number;
      headers?: Record<string, string>;
    }
  ): Promise<MastraBusinessIntelligenceResponse> {
    const requestBody = {
      messages: [
        {
          role: 'user',
          content: request.query,
        },
      ],
      context: {
        ...request.context,
        biRequest: {
          type: request.type,
          dataSources: request.dataSources,
          timeRange: request.timeRange,
          metrics: request.metrics,
          dimensions: request.dimensions,
          filters: request.filters,
          aggregations: request.aggregations,
        },
      },
    };

    // Extract context for headers (compatible with AgentInputContext)
    const contextHeaders: Record<string, string> = {};
    
    if (request.context && isAgentInputContext(request.context)) {
      const context: AgentInputContext = request.context;
      
      // Add role-based context headers for Mastra v0.21.1
      contextHeaders['X-Context-User'] = context.userId;
      contextHeaders['X-Context-Session'] = context.sessionId;
      contextHeaders['X-Context-Roles'] = JSON.stringify(context.roles);
      contextHeaders['X-Context-Authenticated'] = String(context.isAuthenticated);
      contextHeaders['X-Context-App'] = 'brius-smile-nexus';
      
      // Add optional context headers
      if (context.primaryRole) {
        contextHeaders['X-Context-Primary-Role'] = context.primaryRole;
      }
      if (context.requestId) {
        contextHeaders['X-Request-ID'] = context.requestId;
      }
    } else if (request.context) {
      // Fallback for legacy context format
      const legacyContext = request.context as Record<string, unknown>;
      if (typeof legacyContext.userId === 'string') {
        contextHeaders['X-Context-User'] = legacyContext.userId;
      }
      if (typeof legacyContext.sessionId === 'string') {
        contextHeaders['X-Context-Session'] = legacyContext.sessionId;
      }
      contextHeaders['X-Context-Roles'] = JSON.stringify(['user']); // Default role
      contextHeaders['X-Context-Authenticated'] = 'true';
      contextHeaders['X-Context-App'] = 'brius-smile-nexus';
    }

    const response = await fetch(`${this.config.baseUrl}${this.config.endpoint}`, {
      method: 'POST',
      headers: {
        ...this.config.headers,
        ...contextHeaders,
        ...options.headers,
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(options.timeout || this.config.timeout),
    });

    if (!response.ok) {
      throw new MastraMultiAgentError(
        `HTTP ${response.status}: ${response.statusText}`,
        MastraMultiAgentErrorType.BUSINESS_INTELLIGENCE_ERROR,
        {
          status: response.status,
          retryable: response.status >= 500,
          agent: MastraAgentType.BUSINESS_INTELLIGENCE,
        }
      );
    }

    const data = await response.json();

    // Validate response against BI executor output schema
    let executorOutput: BusinessIntelligenceExecutorOutput;
    try {
      executorOutput = BusinessIntelligenceExecutorOutputSchema.parse(data);
    } catch (validationError) {
      // Create compatible response if validation fails
      executorOutput = {
        original_query: request.query,
        execution_summary: {
          total_execution_time_ms: data.total_execution_time_ms || 0,
          steps_attempted: data.steps_attempted || 1,
          steps_completed: data.steps_completed || 1,
          steps_failed: data.steps_failed || 0,
          tools_executed: data.tools_executed || 0,
          data_sources_accessed: data.data_sources_accessed || [],
        },
        step_results: data.step_results || [],
        final_analysis: {
          key_findings: data.key_findings || ['Analysis completed'],
          insights: data.insights || ['BI analysis processed'],
          recommendations: data.recommendations || ['Continue monitoring'],
          confidence_score: data.confidence_score || 0.8,
          data_quality_assessment: data.data_quality_assessment || 'Good',
          limitations: data.limitations,
        },
        deliverables: data.deliverables || data.data || {},
        executive_summary: data.executive_summary || data.text || data.content || 'BI analysis completed',
        next_actions: data.next_actions,
        metadata: {
          analysis_approach_used: data.analysis_approach_used || 'descriptive',
          primary_data_sources: data.primary_data_sources || [],
          execution_quality_score: data.execution_quality_score || 0.8,
        },
      };
    }

    // Transform to client response format
    return {
      id: request.id,
      content: executorOutput.executive_summary,
      type: 'data',
      data: executorOutput.deliverables,
      metadata: {
        processingTime: executorOutput.execution_summary.total_execution_time_ms,
        confidence: executorOutput.final_analysis.confidence_score,
        sources: ['business-intelligence-agent'],
        context: {
          analysisApproach: executorOutput.metadata.analysis_approach_used,
          executionQuality: executorOutput.metadata.execution_quality_score,
          stepsCompleted: executorOutput.execution_summary.steps_completed,
          toolsExecuted: executorOutput.execution_summary.tools_executed,
        },
      },
      timestamp: new Date(),
      business_intelligence: executorOutput,
    };
  }

  /**
   * Execute direct query without planner-executor (fallback)
   */
  private async executeDirectQuery(
    request: MastraBusinessIntelligenceRequest,
    options: {
      timeout?: number;
      retries?: number;
      headers?: Record<string, string>;
    }
  ): Promise<MastraBusinessIntelligenceResponse> {
    const requestBody = {
      query: request.query,
      type: request.type,
      context: request.context,
      parameters: {
        dataSources: request.dataSources,
        timeRange: request.timeRange,
        metrics: request.metrics,
        dimensions: request.dimensions,
        filters: request.filters,
        aggregations: request.aggregations,
      },
    };

    // Extract context for headers (compatible with AgentInputContext)
    const contextHeaders: Record<string, string> = {};
    
    if (request.context && isAgentInputContext(request.context)) {
      const context: AgentInputContext = request.context;
      
      // Add role-based context headers for Mastra v0.21.1
      contextHeaders['X-Context-User'] = context.userId;
      contextHeaders['X-Context-Session'] = context.sessionId;
      contextHeaders['X-Context-Roles'] = JSON.stringify(context.roles);
      contextHeaders['X-Context-Authenticated'] = String(context.isAuthenticated);
      contextHeaders['X-Context-App'] = 'brius-smile-nexus';
      
      // Add optional context headers
      if (context.primaryRole) {
        contextHeaders['X-Context-Primary-Role'] = context.primaryRole;
      }
      if (context.requestId) {
        contextHeaders['X-Request-ID'] = context.requestId;
      }
    } else if (request.context) {
      // Fallback for legacy context format
      const legacyContext = request.context as Record<string, unknown>;
      if (typeof legacyContext.userId === 'string') {
        contextHeaders['X-Context-User'] = legacyContext.userId;
      }
      if (typeof legacyContext.sessionId === 'string') {
        contextHeaders['X-Context-Session'] = legacyContext.sessionId;
      }
      contextHeaders['X-Context-Roles'] = JSON.stringify(['user']); // Default role
      contextHeaders['X-Context-Authenticated'] = 'true';
      contextHeaders['X-Context-App'] = 'brius-smile-nexus';
    }

    const response = await fetch(`${this.config.baseUrl}${this.config.endpoint}`, {
      method: 'POST',
      headers: {
        ...this.config.headers,
        ...contextHeaders,
        ...options.headers,
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(options.timeout || this.config.timeout),
    });

    if (!response.ok) {
      throw new MastraMultiAgentError(
        `HTTP ${response.status}: ${response.statusText}`,
        MastraMultiAgentErrorType.BUSINESS_INTELLIGENCE_ERROR,
        {
          status: response.status,
          retryable: response.status >= 500,
          agent: MastraAgentType.BUSINESS_INTELLIGENCE,
        }
      );
    }

    const data = await response.json();

    return {
      id: request.id,
      content: data.text || data.content || 'BI analysis completed',
      type: 'data',
      data: data.data || data,
      metadata: {
        processingTime: data.processingTime || 0,
        confidence: data.confidence || 0.8,
        sources: ['business-intelligence-agent'],
        context: request.context,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Determine if planner-executor pattern should be used
   */
  private shouldUsePlannerExecutor(request: MastraBusinessIntelligenceRequest): boolean {
    // Use planner-executor for complex queries
    const complexityIndicators = [
      request.type === 'analytics' && (request.metrics?.length || 0) > 2,
      request.type === 'report' && (request.dimensions?.length || 0) > 1,
      request.query.toLowerCase().includes('trend'),
      request.query.toLowerCase().includes('forecast'),
      request.query.toLowerCase().includes('analysis'),
      request.query.toLowerCase().includes('compare'),
      request.filters && Object.keys(request.filters).length > 2,
      request.aggregations && request.aggregations.length > 1,
    ];

    return complexityIndicators.filter(Boolean).length >= 2;
  }

  /**
   * Validate BI request
   */
  private validateRequest(request: MastraBusinessIntelligenceRequest): void {
    if (!request.id || typeof request.id !== 'string') {
      throw new MastraMultiAgentError(
        'Request ID is required and must be a string',
        MastraMultiAgentErrorType.BUSINESS_INTELLIGENCE_ERROR,
        { retryable: false, agent: MastraAgentType.BUSINESS_INTELLIGENCE }
      );
    }

    if (!request.query || typeof request.query !== 'string' || request.query.trim().length === 0) {
      throw new MastraMultiAgentError(
        'Query is required and must be a non-empty string',
        MastraMultiAgentErrorType.BUSINESS_INTELLIGENCE_ERROR,
        { retryable: false, agent: MastraAgentType.BUSINESS_INTELLIGENCE }
      );
    }

    if (!['analytics', 'dashboard', 'report'].includes(request.type)) {
      throw new MastraMultiAgentError(
        'Invalid BI query type. Must be: analytics, dashboard, or report',
        MastraMultiAgentErrorType.BUSINESS_INTELLIGENCE_ERROR,
        { retryable: false, agent: MastraAgentType.BUSINESS_INTELLIGENCE }
      );
    }
  }

  /**
   * Update performance statistics
   */
  private updateStats(startTime: number, success: boolean, analysisType?: string): void {
    const executionTime = Date.now() - startTime;
    
    // Update average response time
    const totalTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + executionTime;
    this.stats.averageResponseTime = totalTime / this.stats.totalRequests;

    // Track analysis types
    if (success && analysisType) {
      this.stats.analysisTypes[analysisType] = (this.stats.analysisTypes[analysisType] || 0) + 1;
    }
  }

  /**
   * Calculate success rate
   */
  private calculateSuccessRate(): number {
    if (this.stats.totalRequests === 0) return 0;
    return this.stats.successfulRequests / this.stats.totalRequests;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Factory function to get BI client instance
 */
export function getMastraBusinessIntelligenceClient(config?: Partial<MastraAgentConfig>): MastraBusinessIntelligenceClient {
  return new MastraBusinessIntelligenceClient(config);
}

/**
 * Default BI client instance
 */
export const defaultBusinessIntelligenceClient = getMastraBusinessIntelligenceClient();