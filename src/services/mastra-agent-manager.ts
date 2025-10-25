/**
 * Mastra Agent Manager Service
 * 
 * Central coordination service that manages all three Mastra agents:
 * - Orchestrator Agent (primary with intelligent routing)
 * - Business Intelligence Agent (direct BI access)
 * - Default Agent (simple queries and fallback)
 * 
 * Provides intelligent agent selection, cascading fallback logic, and
 * comprehensive health monitoring across all agents.
 */

import { z } from 'zod';
import type {
  MastraAgentRequest,
  MastraAgentResponse,
  MastraOrchestratorRequest,
  MastraOrchestratorResponse,
  MastraBusinessIntelligenceRequest,
  MastraBusinessIntelligenceResponse,
  MastraDefaultRequest,
  MastraDefaultResponse,
  AgentSelectionStrategy,
  AgentHealthStatus,
  MultiAgentExecutionResult,
  MastraMultiAgentConfig,
} from '@/types/mastra-agents-types';
import {
  MastraMultiAgentEnvSchema,
  MastraMultiAgentError,
  MastraMultiAgentErrorType,
  MastraAgentType,
} from '@/types/mastra-agents-types';
import { MastraOrchestratorClient, getMastraOrchestratorClient } from './mastra-orchestrator-client';
import { MastraBusinessIntelligenceClient, getMastraBusinessIntelligenceClient } from './mastra-business-intelligence-client';
import { MastraDefaultClient, getMastraDefaultClient } from './mastra-default-client';

// ============================================================================
// Configuration and Validation
// ============================================================================

/**
 * Load and validate multi-agent configuration
 */
function loadMultiAgentConfig(): MastraMultiAgentConfig {
  try {
    const env = MastraMultiAgentEnvSchema.parse(import.meta.env);
    
    // Parse fallback chain
    const fallbackChain = env.VITE_MASTRA_FALLBACK_CHAIN
      .split(',')
      .map(agent => agent.trim() as MastraAgentType)
      .filter(agent => Object.values(MastraAgentType).includes(agent));

    return {
      orchestrator: {
        baseUrl: env.VITE_MASTRA_BASE_URL,
        endpoint: env.VITE_MASTRA_ORCHESTRATOR_ENDPOINT,
        apiKey: env.VITE_MASTRA_API_KEY,
        timeout: env.VITE_MASTRA_ORCHESTRATOR_TIMEOUT,
        maxRetries: env.VITE_MASTRA_MAX_RETRIES,
        debug: env.VITE_MASTRA_DEBUG,
      },
      businessIntelligence: {
        baseUrl: env.VITE_MASTRA_BASE_URL,
        endpoint: env.VITE_MASTRA_BI_ENDPOINT,
        apiKey: env.VITE_MASTRA_API_KEY,
        timeout: env.VITE_MASTRA_BI_TIMEOUT,
        maxRetries: env.VITE_MASTRA_MAX_RETRIES,
        debug: env.VITE_MASTRA_DEBUG,
      },
      default: {
        baseUrl: env.VITE_MASTRA_BASE_URL,
        endpoint: env.VITE_MASTRA_DEFAULT_ENDPOINT,
        apiKey: env.VITE_MASTRA_API_KEY,
        timeout: env.VITE_MASTRA_DEFAULT_TIMEOUT,
        maxRetries: env.VITE_MASTRA_MAX_RETRIES,
        debug: env.VITE_MASTRA_DEBUG,
      },
      strategy: {
        primary: env.VITE_MASTRA_PRIMARY_AGENT as MastraAgentType,
        fallback: fallbackChain,
        criteria: {
          complexity_threshold: 0.7,
          query_type_mapping: {
            'analytics': MastraAgentType.BUSINESS_INTELLIGENCE,
            'dashboard': MastraAgentType.BUSINESS_INTELLIGENCE,
            'report': MastraAgentType.BUSINESS_INTELLIGENCE,
            'general': MastraAgentType.DEFAULT,
            'help': MastraAgentType.DEFAULT,
            'clarification': MastraAgentType.DEFAULT,
          },
        },
      },
      healthCheckInterval: env.VITE_MASTRA_HEALTH_CHECK_INTERVAL,
      enableFallback: env.VITE_MASTRA_ENABLE_FALLBACK,
    };
  } catch (error) {
    console.warn('Failed to parse multi-agent environment variables, using defaults:', error);
    return {
      orchestrator: {
        baseUrl: 'http://localhost:3000',
        endpoint: '/agents/orchestrator-agent/generate',
        timeout: 45000,
        maxRetries: 3,
        debug: false,
      },
      businessIntelligence: {
        baseUrl: 'http://localhost:3000',
        endpoint: '/agents/business-intelligence-agent/generate',
        timeout: 60000,
        maxRetries: 3,
        debug: false,
      },
      default: {
        baseUrl: 'http://localhost:3000',
        endpoint: '/agents/default-agent/generate',
        timeout: 30000,
        maxRetries: 3,
        debug: false,
      },
      strategy: {
        primary: MastraAgentType.DEFAULT,
        fallback: [MastraAgentType.DEFAULT, MastraAgentType.BUSINESS_INTELLIGENCE, MastraAgentType.ORCHESTRATOR],
        criteria: {
          complexity_threshold: 0.7,
          query_type_mapping: {
            'analytics': MastraAgentType.BUSINESS_INTELLIGENCE,
            'dashboard': MastraAgentType.BUSINESS_INTELLIGENCE,
            'report': MastraAgentType.BUSINESS_INTELLIGENCE,
            'general': MastraAgentType.DEFAULT,
            'help': MastraAgentType.DEFAULT,
            'clarification': MastraAgentType.DEFAULT,
          },
        },
      },
      healthCheckInterval: 60000,
      enableFallback: true,
    };
  }
}

// ============================================================================
// Multi-Agent Manager Service Class
// ============================================================================

/**
 * Mastra Agent Manager Service
 * 
 * Central coordination service that manages all three Mastra agents with
 * intelligent selection, cascading fallback logic, and comprehensive monitoring.
 */
export class MastraAgentManager {
  private readonly config: MastraMultiAgentConfig;
  private readonly orchestratorClient: MastraOrchestratorClient;
  private readonly businessIntelligenceClient: MastraBusinessIntelligenceClient;
  private readonly defaultClient: MastraDefaultClient;
  
  private readonly stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    agentUsage: Record<MastraAgentType, number>;
    fallbackUsage: number;
    averageResponseTime: number;
  };
  
  private agentHealth: Map<MastraAgentType, AgentHealthStatus>;
  private healthCheckInterval: NodeJS.Timeout | null;

  constructor(config?: Partial<MastraMultiAgentConfig>) {
    this.config = { ...loadMultiAgentConfig(), ...config };
    
    // Initialize agent clients
    this.orchestratorClient = getMastraOrchestratorClient(this.config.orchestrator);
    this.businessIntelligenceClient = getMastraBusinessIntelligenceClient(this.config.businessIntelligence);
    this.defaultClient = getMastraDefaultClient(this.config.default);
    
    // Initialize statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      agentUsage: {
        [MastraAgentType.ORCHESTRATOR]: 0,
        [MastraAgentType.BUSINESS_INTELLIGENCE]: 0,
        [MastraAgentType.DEFAULT]: 0,
      },
      fallbackUsage: 0,
      averageResponseTime: 0,
    };
    
    // Initialize health tracking
    this.agentHealth = new Map();
    this.healthCheckInterval = null;
    
    // Start health monitoring
    this.startHealthMonitoring();

    if (this.config.orchestrator.debug) {
      console.log('MastraAgentManager initialized with strategy:', this.config.strategy);
    }
  }

  // ============================================================================
  // Core Agent Management Methods
  // ============================================================================

  /**
   * Execute query with intelligent agent selection and fallback
   */
  async executeQuery(
    request: MastraAgentRequest,
    options: {
      preferredAgent?: MastraAgentType;
      bypassFallback?: boolean;
      timeout?: number;
      retries?: number;
      headers?: Record<string, string>;
    } = {}
  ): Promise<MultiAgentExecutionResult> {
    const startTime = Date.now();
    this.stats.totalRequests++;
    const agentsAttempted: MastraAgentType[] = [];

    try {
      // Determine agent selection strategy
      const selectedAgent = this.selectAgent(request, options.preferredAgent);
      agentsAttempted.push(selectedAgent);

      if (this.config.orchestrator.debug) {
        console.log('Agent selection result:', {
          selectedAgent,
          preferredAgent: options.preferredAgent,
          queryType: 'type' in request ? (request as { type: string }).type : 'unknown',
        });
      }

      // Attempt execution with selected agent
      let response: MastraAgentResponse;
      let executedBy: MastraAgentType;

      try {
        const result = await this.executeWithAgent(selectedAgent, request, options);
        response = result.response;
        executedBy = result.agent;
      } catch (error) {
        if (!this.config.enableFallback || options.bypassFallback) {
          throw error;
        }

        // Attempt fallback chain
        const fallbackResult = await this.executeFallbackChain(
          request,
          options,
          agentsAttempted,
          error as Error
        );
        response = fallbackResult.response;
        executedBy = fallbackResult.agent;
        agentsAttempted.push(...fallbackResult.agentsAttempted);
        this.stats.fallbackUsage++;
      }

      // Update statistics
      this.updateStats(startTime, true, executedBy);
      this.stats.successfulRequests++;

      // Get current agent health
      const currentAgentHealth = await this.getCurrentAgentHealth();

      const result: MultiAgentExecutionResult = {
        request,
        executed_by: executedBy,
        response,
        execution_metadata: {
          total_time_ms: Date.now() - startTime,
          agents_attempted: agentsAttempted,
          agent_health: currentAgentHealth,
        },
      };

      if (this.config.orchestrator.debug) {
        console.log('Multi-agent execution completed:', {
          executedBy,
          agentsAttempted,
          totalTime: result.execution_metadata.total_time_ms,
        });
      }

      return result;
    } catch (error) {
      this.stats.failedRequests++;
      this.updateStats(startTime, false);

      if (error instanceof MastraMultiAgentError) {
        throw error;
      }

      throw new MastraMultiAgentError(
        `Multi-agent execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MastraMultiAgentErrorType.AGENT_SELECTION_ERROR,
        {
          retryable: false,
          cause: error instanceof Error ? error : undefined,
          details: {
            requestId: request.id,
            agentsAttempted,
            fallbackEnabled: this.config.enableFallback,
          },
        }
      );
    }
  }

  /**
   * Execute query with specific agent (bypass selection logic)
   */
  async executeWithSpecificAgent(
    agent: MastraAgentType,
    request: MastraAgentRequest,
    options: {
      timeout?: number;
      retries?: number;
      headers?: Record<string, string>;
    } = {}
  ): Promise<MultiAgentExecutionResult> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const result = await this.executeWithAgent(agent, request, options);
      
      this.updateStats(startTime, true, agent);
      this.stats.successfulRequests++;

      const currentAgentHealth = await this.getCurrentAgentHealth();

      return {
        request,
        executed_by: result.agent,
        response: result.response,
        execution_metadata: {
          total_time_ms: Date.now() - startTime,
          agents_attempted: [agent],
          agent_health: currentAgentHealth,
        },
      };
    } catch (error) {
      this.stats.failedRequests++;
      this.updateStats(startTime, false);
      throw error;
    }
  }

  // ============================================================================
  // Health Monitoring Methods
  // ============================================================================

  /**
   * Check health of all agents
   */
  async checkAllAgentsHealth(): Promise<Map<MastraAgentType, AgentHealthStatus>> {
    const healthResults = new Map<MastraAgentType, AgentHealthStatus>();

    // Check orchestrator health
    try {
      const orchestratorHealth = await this.orchestratorClient.checkHealth();
      healthResults.set(MastraAgentType.ORCHESTRATOR, {
        agent: MastraAgentType.ORCHESTRATOR,
        status: orchestratorHealth.status === 'healthy' ? 'healthy' : 'degraded',
        last_check: new Date(),
        response_time: orchestratorHealth.details.totalRequests ? 
          this.orchestratorClient.getStatus().stats.averageResponseTime : undefined,
      });
    } catch (error) {
      healthResults.set(MastraAgentType.ORCHESTRATOR, {
        agent: MastraAgentType.ORCHESTRATOR,
        status: 'offline',
        last_check: new Date(),
        error: error instanceof Error ? error.message : 'Health check failed',
      });
    }

    // Check BI agent health
    try {
      const biHealth = await this.businessIntelligenceClient.checkHealth();
      healthResults.set(MastraAgentType.BUSINESS_INTELLIGENCE, {
        agent: MastraAgentType.BUSINESS_INTELLIGENCE,
        status: biHealth.status === 'healthy' ? 'healthy' : 'degraded',
        last_check: new Date(),
        response_time: biHealth.details.totalRequests ? 
          this.businessIntelligenceClient.getStatus().stats.averageResponseTime : undefined,
      });
    } catch (error) {
      healthResults.set(MastraAgentType.BUSINESS_INTELLIGENCE, {
        agent: MastraAgentType.BUSINESS_INTELLIGENCE,
        status: 'offline',
        last_check: new Date(),
        error: error instanceof Error ? error.message : 'Health check failed',
      });
    }

    // Check default agent health
    try {
      const defaultHealth = await this.defaultClient.checkHealth();
      healthResults.set(MastraAgentType.DEFAULT, {
        agent: MastraAgentType.DEFAULT,
        status: defaultHealth.status === 'healthy' ? 'healthy' : 'degraded',
        last_check: new Date(),
        response_time: defaultHealth.details.totalRequests ? 
          this.defaultClient.getStatus().stats.averageResponseTime : undefined,
      });
    } catch (error) {
      healthResults.set(MastraAgentType.DEFAULT, {
        agent: MastraAgentType.DEFAULT,
        status: 'offline',
        last_check: new Date(),
        error: error instanceof Error ? error.message : 'Health check failed',
      });
    }

    // Update internal health tracking
    this.agentHealth = healthResults;

    if (this.config.orchestrator.debug) {
      console.log('Agent health check completed:', Object.fromEntries(healthResults));
    }

    return healthResults;
  }

  /**
   * Get current agent health status
   */
  async getCurrentAgentHealth(): Promise<AgentHealthStatus[]> {
    if (this.agentHealth.size === 0) {
      await this.checkAllAgentsHealth();
    }
    return Array.from(this.agentHealth.values());
  }

  /**
   * Get manager status and statistics
   */
  getStatus(): {
    config: MastraMultiAgentConfig;
    stats: typeof this.stats;
    agentHealth: AgentHealthStatus[];
    healthMonitoringActive: boolean;
  } {
    return {
      config: this.config,
      stats: { ...this.stats },
      agentHealth: Array.from(this.agentHealth.values()),
      healthMonitoringActive: this.healthCheckInterval !== null,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Select appropriate agent based on request and strategy
   */
  private selectAgent(request: MastraAgentRequest, preferredAgent?: MastraAgentType): MastraAgentType {
    // Use preferred agent if specified and healthy
    if (preferredAgent && this.isAgentHealthy(preferredAgent)) {
      return preferredAgent;
    }

    // Use query type mapping if available
    const requestType = 'type' in request ? (request as { type: string }).type : undefined;
    if (requestType && this.config.strategy.criteria.query_type_mapping?.[requestType]) {
      const mappedAgent = this.config.strategy.criteria.query_type_mapping[requestType];
      if (this.isAgentHealthy(mappedAgent)) {
        return mappedAgent;
      }
    }

    // Use primary agent if healthy
    if (this.isAgentHealthy(this.config.strategy.primary)) {
      return this.config.strategy.primary;
    }

    // Fall back to first healthy agent in fallback chain
    for (const agent of this.config.strategy.fallback) {
      if (this.isAgentHealthy(agent)) {
        return agent;
      }
    }

    // Default to orchestrator as last resort
    return MastraAgentType.ORCHESTRATOR;
  }

  /**
   * Execute request with specific agent
   */
  private async executeWithAgent(
    agent: MastraAgentType,
    request: MastraAgentRequest,
    options: {
      timeout?: number;
      retries?: number;
      headers?: Record<string, string>;
    }
  ): Promise<{ agent: MastraAgentType; response: MastraAgentResponse }> {
    switch (agent) {
      case MastraAgentType.ORCHESTRATOR: {
        const orchestratorRequest: MastraOrchestratorRequest = {
          ...request,
          type: 'type' in request ? (request as { type: string }).type as 'analytics' | 'dashboard' | 'report' | 'general' : 'general',
        };
        const orchestratorResponse = await this.orchestratorClient.executeQuery(orchestratorRequest, options);
        return { agent, response: orchestratorResponse };
      }

      case MastraAgentType.BUSINESS_INTELLIGENCE: {
        const biRequest: MastraBusinessIntelligenceRequest = {
          ...request,
          type: 'type' in request ? (request as { type: string }).type as 'analytics' | 'dashboard' | 'report' : 'analytics',
          dataSources: 'dataSources' in request ? (request as { dataSources: string[] }).dataSources : undefined,
          timeRange: 'timeRange' in request ? (request as { timeRange: { start: Date; end: Date; granularity?: 'hour' | 'day' | 'week' | 'month' | 'year' } }).timeRange : undefined,
          metrics: 'metrics' in request ? (request as { metrics: string[] }).metrics : undefined,
          dimensions: 'dimensions' in request ? (request as { dimensions: string[] }).dimensions : undefined,
          filters: 'filters' in request ? (request as { filters: Record<string, unknown> }).filters : undefined,
          aggregations: 'aggregations' in request ? (request as { aggregations: Array<{ field: string; function: 'sum' | 'avg' | 'count' | 'min' | 'max' }> }).aggregations : undefined,
        };
        const biResponse = await this.businessIntelligenceClient.executeQuery(biRequest, options);
        return { agent, response: biResponse };
      }

      case MastraAgentType.DEFAULT: {
        const defaultRequest: MastraDefaultRequest = {
          ...request,
          type: 'type' in request ? (request as { type: string }).type as 'general' | 'help' | 'clarification' : 'general',
        };
        const defaultResponse = await this.defaultClient.executeQuery(defaultRequest, options);
        return { agent, response: defaultResponse };
      }

      default:
        throw new MastraMultiAgentError(
          `Unknown agent type: ${agent}`,
          MastraMultiAgentErrorType.AGENT_SELECTION_ERROR,
          { retryable: false }
        );
    }
  }

  /**
   * Execute fallback chain when primary agent fails
   */
  private async executeFallbackChain(
    request: MastraAgentRequest,
    options: {
      timeout?: number;
      retries?: number;
      headers?: Record<string, string>;
    },
    alreadyAttempted: MastraAgentType[],
    originalError: Error
  ): Promise<{ agent: MastraAgentType; response: MastraAgentResponse; agentsAttempted: MastraAgentType[] }> {
    const fallbackAgents = this.config.strategy.fallback.filter(
      agent => !alreadyAttempted.includes(agent) && this.isAgentHealthy(agent)
    );

    if (fallbackAgents.length === 0) {
      throw new MastraMultiAgentError(
        'All agents in fallback chain are unavailable',
        MastraMultiAgentErrorType.FALLBACK_EXHAUSTED,
        {
          retryable: false,
          cause: originalError,
          details: {
            alreadyAttempted,
            fallbackChain: this.config.strategy.fallback,
            agentHealth: Array.from(this.agentHealth.values()),
          },
        }
      );
    }

    const additionalAttempts: MastraAgentType[] = [];

    for (const agent of fallbackAgents) {
      additionalAttempts.push(agent);
      
      try {
        if (this.config.orchestrator.debug) {
          console.log(`Attempting fallback to ${agent}...`);
        }

        const result = await this.executeWithAgent(agent, request, {
          ...options,
          // Reduce timeout for fallback attempts
          timeout: options.timeout ? Math.floor(options.timeout * 0.8) : undefined,
        });

        if (this.config.orchestrator.debug) {
          console.log(`Fallback to ${agent} successful`);
        }

        return {
          agent: result.agent,
          response: result.response,
          agentsAttempted: additionalAttempts,
        };
      } catch (error) {
        if (this.config.orchestrator.debug) {
          console.warn(`Fallback to ${agent} failed:`, error);
        }
        // Continue to next agent in fallback chain
        continue;
      }
    }

    throw new MastraMultiAgentError(
      'All fallback agents failed',
      MastraMultiAgentErrorType.FALLBACK_EXHAUSTED,
      {
        retryable: false,
        cause: originalError,
        details: {
          alreadyAttempted: [...alreadyAttempted, ...additionalAttempts],
          fallbackChain: this.config.strategy.fallback,
        },
      }
    );
  }

  /**
   * Check if agent is healthy
   */
  private isAgentHealthy(agent: MastraAgentType): boolean {
    const health = this.agentHealth.get(agent);
    return health?.status === 'healthy' || health?.status === 'degraded';
  }

  /**
   * Start health monitoring for all agents
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Initial health check
    this.checkAllAgentsHealth().catch(error => {
      console.warn('Initial health check failed:', error);
    });

    // Set up periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkAllAgentsHealth();
      } catch (error) {
        console.warn('Periodic health check failed:', error);
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Update performance statistics
   */
  private updateStats(startTime: number, success: boolean, agent?: MastraAgentType): void {
    const executionTime = Date.now() - startTime;
    
    // Update average response time
    const totalTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + executionTime;
    this.stats.averageResponseTime = totalTime / this.stats.totalRequests;

    // Track agent usage
    if (success && agent) {
      this.stats.agentUsage[agent]++;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopHealthMonitoring();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Factory function to get agent manager instance
 */
export function getMastraAgentManager(config?: Partial<MastraMultiAgentConfig>): MastraAgentManager {
  return new MastraAgentManager(config);
}

/**
 * Default agent manager instance
 */
export const defaultAgentManager = getMastraAgentManager();