/**
 * Mastra Orchestrator Client Service
 * 
 * Primary agent communication layer that provides intelligent routing and classification
 * through the Mastra orchestrator agent. This service handles intent classification,
 * complexity analysis, and automatic routing to appropriate specialized agents.
 * 
 * Based on Mastra v0.21.1 orchestrator patterns from brius-business-intelligence
 */

import { z } from 'zod';
import type {
  MastraOrchestratorRequest,
  MastraOrchestratorResponse,
  OrchestratorInput,
  OrchestratorOutput,
  MastraAgentConfig,
  MastraMultiAgentEnvConfig,
} from '@/types/mastra-agents-types';
import {
  MastraMultiAgentEnvSchema,
  OrchestratorInputSchema,
  OrchestratorOutputSchema,
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
 * Load and validate orchestrator configuration
 */
function loadOrchestratorConfig(): MastraAgentConfig {
  try {
    const env = MastraMultiAgentEnvSchema.parse(import.meta.env);
    return {
      baseUrl: env.VITE_MASTRA_BASE_URL,
      endpoint: env.VITE_MASTRA_ORCHESTRATOR_ENDPOINT,
      apiKey: env.VITE_MASTRA_API_KEY,
      timeout: env.VITE_MASTRA_ORCHESTRATOR_TIMEOUT,
      maxRetries: env.VITE_MASTRA_MAX_RETRIES,
      debug: env.VITE_MASTRA_DEBUG,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'brius-smile-nexus/1.0.0',
        'X-Agent-Type': 'orchestrator',
      },
    };
  } catch (error) {
    console.warn('Failed to parse orchestrator environment variables, using defaults:', error);
    return {
      baseUrl: 'http://localhost:3000',
      endpoint: '/agents/orchestrator-agent/generate',
      timeout: 45000,
      maxRetries: 3,
      debug: false,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'brius-smile-nexus/1.0.0',
        'X-Agent-Type': 'orchestrator',
      },
    };
  }
}

// ============================================================================
// Orchestrator Client Service Class
// ============================================================================

/**
 * Mastra Orchestrator Client Service
 * 
 * Provides intelligent routing and classification through the orchestrator agent.
 * This is the primary interface for complex queries that require agent selection.
 */
export class MastraOrchestratorClient {
  private readonly config: MastraAgentConfig;
  private readonly stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    routingDecisions: Record<string, number>;
  };
  private lastHealthCheck: Date;
  private isConnected: boolean;
  private agentAvailable: boolean;

  constructor(config?: Partial<MastraAgentConfig>) {
    this.config = { ...loadOrchestratorConfig(), ...config };
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      routingDecisions: {},
    };
    this.lastHealthCheck = new Date();
    this.isConnected = false;
    this.agentAvailable = false;

    // Initialize connection status
    this.initializeConnection();

    if (this.config.debug) {
      console.log('MastraOrchestratorClient initialized with config:', {
        ...this.config,
        apiKey: this.config.apiKey ? '[REDACTED]' : undefined,
      });
    }
  }

  /**
   * Initialize connection to orchestrator service
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
        console.log('Orchestrator connection status:', { connected: this.isConnected });
      }
    } catch (error) {
      if (this.config.debug) {
        console.warn('Orchestrator connection failed:', error);
      }
      this.isConnected = false;
      this.agentAvailable = false;
    }
  }

  // ============================================================================
  // Core Orchestrator Communication Methods
  // ============================================================================

  /**
   * Execute a query through the orchestrator agent with intelligent routing
   */
  async executeQuery(
    request: MastraOrchestratorRequest,
    options: {
      timeout?: number;
      retries?: number;
      headers?: Record<string, string>;
    } = {}
  ): Promise<MastraOrchestratorResponse> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      if (this.config.debug) {
        console.log('Executing orchestrator query:', request);
      }

      // Validate request input
      this.validateRequest(request);

      // Transform request to orchestrator input format
      const orchestratorInput = this.transformToOrchestratorInput(request);

      // Make HTTP request to orchestrator
      const orchestratorOutput = await this.makeHttpRequest(orchestratorInput, options);

      // Transform response to client format
      const response = this.transformToOrchestratorResponse(request.id, orchestratorOutput);

      // Update statistics
      this.updateStats(startTime, true, orchestratorOutput.routing_decision.selected_agent);
      this.stats.successfulRequests++;

      if (this.config.debug) {
        console.log('Orchestrator query executed successfully:', {
          selectedAgent: orchestratorOutput.routing_decision.selected_agent,
          confidence: orchestratorOutput.routing_decision.confidence,
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

      // Wrap unknown errors
      throw new MastraMultiAgentError(
        `Orchestrator query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MastraMultiAgentErrorType.ORCHESTRATOR_ERROR,
        {
          retryable: true,
          cause: error instanceof Error ? error : undefined,
          details: { requestId: request.id, type: request.type },
          agent: MastraAgentType.ORCHESTRATOR,
        }
      );
    }
  }

  /**
   * Execute a streaming query through the orchestrator (future enhancement)
   */
  async executeStreamingQuery(
    request: MastraOrchestratorRequest,
    onChunk: (chunk: { content: string; done: boolean; metadata?: Record<string, unknown> }) => void,
    options: {
      timeout?: number;
      retries?: number;
      headers?: Record<string, string>;
    } = {}
  ): Promise<MastraOrchestratorResponse> {
    // For now, execute as regular query and simulate streaming
    const response = await this.executeQuery(request, options);
    
    // Simulate streaming by chunking the response
    const content = response.content;
    const chunkSize = 100;
    
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = {
        content: content.slice(i, i + chunkSize),
        done: i + chunkSize >= content.length,
        metadata: {
          index: Math.floor(i / chunkSize),
          total: Math.ceil(content.length / chunkSize),
        },
      };
      
      onChunk(chunk);
      
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return response;
  }

  // ============================================================================
  // Health Check and Status Methods
  // ============================================================================

  /**
   * Check orchestrator health
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
        console.log('Checking orchestrator health...');
      }

      await this.initializeConnection();
      this.lastHealthCheck = new Date();

      const healthResponse = {
        status: this.agentAvailable ? 'healthy' as const : 'degraded' as const,
        agent: {
          name: 'orchestrator-agent',
          status: this.agentAvailable ? 'available' as const : 'offline' as const,
          version: '0.21.1',
          capabilities: ['intent-classification', 'agent-routing', 'complexity-analysis', 'streaming'],
        },
        uptime: Date.now() - this.lastHealthCheck.getTime(),
        timestamp: new Date(),
        details: {
          baseUrl: this.config.baseUrl,
          endpoint: this.config.endpoint,
          totalRequests: this.stats.totalRequests,
          successRate: this.calculateSuccessRate(),
          routingDecisions: this.stats.routingDecisions,
        },
      };

      if (this.config.debug) {
        console.log('Orchestrator health check completed:', healthResponse);
      }

      return healthResponse;
    } catch (error) {
      this.isConnected = false;
      this.agentAvailable = false;

      throw new MastraMultiAgentError(
        `Orchestrator health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MastraMultiAgentErrorType.HEALTH_CHECK_FAILED,
        {
          retryable: true,
          cause: error instanceof Error ? error : undefined,
          agent: MastraAgentType.ORCHESTRATOR,
        }
      );
    }
  }

  /**
   * Get current orchestrator status
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
   * Transform client request to orchestrator input format
   */
  private transformToOrchestratorInput(request: MastraOrchestratorRequest): OrchestratorInput {
    return {
      query: request.query,
      user_id: request.context?.userId,
      conversation_id: request.context?.conversationId,
      session_id: request.context?.sessionId,
      context: request.context,
      routing_hints: request.routing_hints ? {
        ...request.routing_hints,
        bypass_classification: request.routing_hints.bypass_classification ?? false,
      } : undefined,
    };
  }

  /**
   * Transform orchestrator output to client response format
   */
  private transformToOrchestratorResponse(
    requestId: string,
    output: OrchestratorOutput
  ): MastraOrchestratorResponse {
    return {
      id: requestId,
      content: output.final_response,
      type: 'text',
      data: output.agent_execution_result,
      metadata: {
        processingTime: output.orchestration_metadata.total_execution_time_ms,
        confidence: output.routing_decision.confidence,
        sources: ['orchestrator-agent'],
        context: {
          selectedAgent: output.routing_decision.selected_agent,
          routingPath: output.orchestration_metadata.routing_path,
        },
      },
      timestamp: new Date(),
      orchestration: {
        routing_decision: output.routing_decision,
        orchestration_metadata: output.orchestration_metadata,
        follow_up_suggestions: output.follow_up_suggestions,
      },
    };
  }

  /**
   * Make HTTP request to orchestrator service with role-based context headers
   */
  private async makeHttpRequest(
    input: OrchestratorInput,
    options: {
      timeout?: number;
      retries?: number;
      headers?: Record<string, string>;
    }
  ): Promise<OrchestratorOutput> {
    const requestBody = {
      messages: [
        {
          role: 'user',
          content: input.query,
        },
      ],
      context: input.context,
      routing_hints: input.routing_hints,
    };

    // Extract context for headers (compatible with AgentInputContext)
    const contextHeaders: Record<string, string> = {};
    
    if (input.context && isAgentInputContext(input.context)) {
      const context: AgentInputContext = input.context;
      
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
    } else if (input.context) {
      // Fallback for legacy context format
      const legacyContext = input.context as Record<string, unknown>;
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
        MastraMultiAgentErrorType.ORCHESTRATOR_ERROR,
        {
          status: response.status,
          retryable: response.status >= 500,
          agent: MastraAgentType.ORCHESTRATOR,
        }
      );
    }

    const data = await response.json();

    // Validate response against schema
    try {
      return OrchestratorOutputSchema.parse(data);
    } catch (validationError) {
      // If validation fails, create a compatible response
      return {
        original_query: input.query,
        routing_decision: {
          selected_agent: data.selected_agent || 'business-intelligence-agent',
          confidence: data.confidence || 0.8,
          reasoning: data.reasoning || 'Orchestrator response processed',
          classification_details: {
            classification: data.classification || {},
            complexity_analysis: data.complexity_analysis || {},
            routing_decision: {
              recommended_agent: data.selected_agent || 'business-intelligence-agent',
              confidence: data.confidence || 0.8,
              reasoning: data.reasoning || 'Processed by orchestrator',
            },
          },
        },
        agent_execution_result: data.agent_execution_result || data,
        orchestration_metadata: {
          total_execution_time_ms: data.total_execution_time_ms || 0,
          classification_time_ms: data.classification_time_ms || 0,
          agent_execution_time_ms: data.agent_execution_time_ms || 0,
          routing_path: data.routing_path || ['orchestrator-agent'],
        },
        final_response: data.final_response || data.text || data.content || JSON.stringify(data),
        follow_up_suggestions: data.follow_up_suggestions,
      };
    }
  }

  /**
   * Validate orchestrator request
   */
  private validateRequest(request: MastraOrchestratorRequest): void {
    if (!request.id || typeof request.id !== 'string') {
      throw new MastraMultiAgentError(
        'Request ID is required and must be a string',
        MastraMultiAgentErrorType.ORCHESTRATOR_ERROR,
        { retryable: false, agent: MastraAgentType.ORCHESTRATOR }
      );
    }

    if (!request.query || typeof request.query !== 'string' || request.query.trim().length === 0) {
      throw new MastraMultiAgentError(
        'Query is required and must be a non-empty string',
        MastraMultiAgentErrorType.ORCHESTRATOR_ERROR,
        { retryable: false, agent: MastraAgentType.ORCHESTRATOR }
      );
    }

    // Validate orchestrator input schema
    try {
      OrchestratorInputSchema.parse({
        query: request.query,
        user_id: request.context?.userId,
        conversation_id: request.context?.conversationId,
        session_id: request.context?.sessionId,
        context: request.context,
        routing_hints: request.routing_hints,
      });
    } catch (error) {
      throw new MastraMultiAgentError(
        `Invalid orchestrator request format: ${error instanceof Error ? error.message : 'Unknown validation error'}`,
        MastraMultiAgentErrorType.ORCHESTRATOR_ERROR,
        {
          retryable: false,
          cause: error instanceof Error ? error : undefined,
          agent: MastraAgentType.ORCHESTRATOR,
        }
      );
    }
  }

  /**
   * Update performance statistics
   */
  private updateStats(startTime: number, success: boolean, selectedAgent?: string): void {
    const executionTime = Date.now() - startTime;
    
    // Update average response time
    const totalTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + executionTime;
    this.stats.averageResponseTime = totalTime / this.stats.totalRequests;

    // Track routing decisions
    if (success && selectedAgent) {
      this.stats.routingDecisions[selectedAgent] = (this.stats.routingDecisions[selectedAgent] || 0) + 1;
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
 * Factory function to get orchestrator client instance
 */
export function getMastraOrchestratorClient(config?: Partial<MastraAgentConfig>): MastraOrchestratorClient {
  return new MastraOrchestratorClient(config);
}

/**
 * Default orchestrator client instance
 */
export const defaultOrchestratorClient = getMastraOrchestratorClient();