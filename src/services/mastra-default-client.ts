/**
 * Mastra Default Client Service
 * 
 * Direct access to the Default agent for simple queries, general assistance,
 * and fallback scenarios. This service provides lightweight processing for
 * quick responses and serves as the final fallback in the agent hierarchy.
 * 
 * Based on Mastra v0.21.1 default agent patterns from brius-business-intelligence
 */

import { z } from 'zod';
import type {
  MastraDefaultRequest,
  MastraDefaultResponse,
  MastraAgentConfig,
  MastraMultiAgentEnvConfig,
} from '@/types/mastra-agents-types';
import {
  MastraMultiAgentEnvSchema,
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
 * Load and validate Default agent configuration
 */
function loadDefaultAgentConfig(): MastraAgentConfig {
  try {
    const env = MastraMultiAgentEnvSchema.parse(import.meta.env);
    return {
      baseUrl: env.VITE_MASTRA_BASE_URL,
      endpoint: env.VITE_MASTRA_DEFAULT_ENDPOINT,
      apiKey: env.VITE_MASTRA_API_KEY,
      timeout: env.VITE_MASTRA_DEFAULT_TIMEOUT,
      maxRetries: env.VITE_MASTRA_MAX_RETRIES,
      debug: env.VITE_MASTRA_DEBUG,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'brius-smile-nexus/1.0.0',
        'X-Agent-Type': 'default',
      },
    };
  } catch (error) {
    console.warn('Failed to parse default agent environment variables, using defaults:', error);
    return {
      baseUrl: 'http://localhost:3000',
      endpoint: '/agents/default-agent/generate',
      timeout: 30000,
      maxRetries: 3,
      debug: false,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'brius-smile-nexus/1.0.0',
        'X-Agent-Type': 'default',
      },
    };
  }
}

// ============================================================================
// Default Client Service Class
// ============================================================================

/**
 * Mastra Default Client Service
 * 
 * Provides direct access to the default agent for simple queries, general
 * assistance, and fallback scenarios when other agents are unavailable.
 */
export class MastraDefaultClient {
  private readonly config: MastraAgentConfig;
  private readonly stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    queryTypes: Record<string, number>;
    fallbackUsage: number;
  };
  private lastHealthCheck: Date;
  private isConnected: boolean;
  private agentAvailable: boolean;

  constructor(config?: Partial<MastraAgentConfig>) {
    this.config = { ...loadDefaultAgentConfig(), ...config };
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      queryTypes: {},
      fallbackUsage: 0,
    };
    this.lastHealthCheck = new Date();
    this.isConnected = false;
    this.agentAvailable = false;

    // Initialize connection status
    this.initializeConnection();

    if (this.config.debug) {
      console.log('MastraDefaultClient initialized with config:', {
        ...this.config,
        apiKey: this.config.apiKey ? '[REDACTED]' : undefined,
      });
    }
  }

  /**
   * Initialize connection to default agent service
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
        console.log('Default agent connection status:', { connected: this.isConnected });
      }
    } catch (error) {
      if (this.config.debug) {
        console.warn('Default agent connection failed:', error);
      }
      this.isConnected = false;
      this.agentAvailable = false;
    }
  }

  // ============================================================================
  // Core Default Agent Methods
  // ============================================================================

  /**
   * Execute a simple query through the default agent
   */
  async executeQuery(
    request: MastraDefaultRequest,
    options: {
      timeout?: number;
      retries?: number;
      headers?: Record<string, string>;
      asFallback?: boolean;
    } = {}
  ): Promise<MastraDefaultResponse> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    if (options.asFallback) {
      this.stats.fallbackUsage++;
    }

    try {
      if (this.config.debug) {
        console.log('Executing default agent query:', request);
      }

      // Validate request input
      this.validateRequest(request);

      let response: MastraDefaultResponse;

      if (this.isConnected) {
        response = await this.makeHttpRequest(request, options);
      } else {
        response = await this.generateMockResponse(request);
      }

      // Update statistics
      this.updateStats(startTime, true, request.type);
      this.stats.successfulRequests++;

      if (this.config.debug) {
        console.log('Default agent query executed successfully:', {
          type: request.type,
          asFallback: options.asFallback,
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
        `Default agent query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MastraMultiAgentErrorType.DEFAULT_AGENT_ERROR,
        {
          retryable: true,
          cause: error instanceof Error ? error : undefined,
          details: { requestId: request.id, type: request.type, asFallback: options.asFallback },
          agent: MastraAgentType.DEFAULT,
        }
      );
    }
  }

  /**
   * Execute general assistance query
   */
  async executeGeneralQuery(
    query: string,
    options: {
      context?: Record<string, unknown>;
      expectSimpleResponse?: boolean;
    } = {}
  ): Promise<MastraDefaultResponse> {
    const request: MastraDefaultRequest = {
      id: `general-${Date.now()}`,
      query,
      type: 'general',
      context: options.context,
    };

    return this.executeQuery(request);
  }

  /**
   * Execute help query
   */
  async executeHelpQuery(
    query: string,
    options: {
      context?: Record<string, unknown>;
      topic?: string;
    } = {}
  ): Promise<MastraDefaultResponse> {
    const request: MastraDefaultRequest = {
      id: `help-${Date.now()}`,
      query,
      type: 'help',
      context: {
        ...options.context,
        helpTopic: options.topic,
      },
    };

    return this.executeQuery(request);
  }

  /**
   * Execute clarification query
   */
  async executeClarificationQuery(
    query: string,
    options: {
      context?: Record<string, unknown>;
      previousQuery?: string;
    } = {}
  ): Promise<MastraDefaultResponse> {
    const request: MastraDefaultRequest = {
      id: `clarification-${Date.now()}`,
      query,
      type: 'clarification',
      context: {
        ...options.context,
        previousQuery: options.previousQuery,
      },
    };

    return this.executeQuery(request);
  }

  // ============================================================================
  // Health Check and Status Methods
  // ============================================================================

  /**
   * Check default agent health
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
        console.log('Checking default agent health...');
      }

      await this.initializeConnection();
      this.lastHealthCheck = new Date();

      const healthResponse = {
        status: this.agentAvailable ? 'healthy' as const : 'degraded' as const,
        agent: {
          name: 'default-agent',
          status: this.agentAvailable ? 'available' as const : 'offline' as const,
          version: '0.21.1',
          capabilities: [
            'general-assistance',
            'help-queries',
            'clarification',
            'fallback-processing',
            'lightweight-responses',
          ],
        },
        uptime: Date.now() - this.lastHealthCheck.getTime(),
        timestamp: new Date(),
        details: {
          baseUrl: this.config.baseUrl,
          endpoint: this.config.endpoint,
          totalRequests: this.stats.totalRequests,
          successRate: this.calculateSuccessRate(),
          fallbackUsage: this.stats.fallbackUsage,
          queryTypes: this.stats.queryTypes,
        },
      };

      if (this.config.debug) {
        console.log('Default agent health check completed:', healthResponse);
      }

      return healthResponse;
    } catch (error) {
      this.isConnected = false;
      this.agentAvailable = false;

      throw new MastraMultiAgentError(
        `Default agent health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MastraMultiAgentErrorType.HEALTH_CHECK_FAILED,
        {
          retryable: true,
          cause: error instanceof Error ? error : undefined,
          agent: MastraAgentType.DEFAULT,
        }
      );
    }
  }

  /**
   * Get current default agent status
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
   * Make HTTP request to default agent service
   */
  private async makeHttpRequest(
    request: MastraDefaultRequest,
    options: {
      timeout?: number;
      retries?: number;
      headers?: Record<string, string>;
    }
  ): Promise<MastraDefaultResponse> {
    const requestBody = {
      messages: [
        {
          role: 'user',
          content: request.query,
        },
      ],
      context: request.context,
      parameters: request.parameters,
    };

    // Build headers with context information if AgentInputContext is provided
    const requestHeaders: Record<string, string> = {
      ...this.config.headers,
      ...options.headers,
    };

    // Add Authorization header
    if (this.config.apiKey) {
      requestHeaders['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    // Extract and add context headers if available
    if (request.context && isAgentInputContext(request.context)) {
      const context: AgentInputContext = request.context;
      requestHeaders['X-Context-User'] = context.userId;
      requestHeaders['X-Context-Session'] = context.sessionId;
      requestHeaders['X-Context-Roles'] = JSON.stringify(context.roles);
      requestHeaders['X-Context-Authenticated'] = context.isAuthenticated.toString();
      requestHeaders['X-Context-App'] = 'brius-smile-nexus';
      requestHeaders['X-Context-Primary-Role'] = context.primaryRole;
      requestHeaders['X-Request-ID'] = `default-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      if (this.config.debug) {
        console.log('Adding context headers to default agent request:', {
          userId: context.userId,
          roles: context.roles,
          primaryRole: context.primaryRole,
          isAuthenticated: context.isAuthenticated,
        });
      }
    }

    const response = await fetch(`${this.config.baseUrl}${this.config.endpoint}`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(options.timeout || this.config.timeout),
    });

    if (!response.ok) {
      throw new MastraMultiAgentError(
        `HTTP ${response.status}: ${response.statusText}`,
        MastraMultiAgentErrorType.DEFAULT_AGENT_ERROR,
        {
          status: response.status,
          retryable: response.status >= 500,
          agent: MastraAgentType.DEFAULT,
        }
      );
    }

    const data = await response.json();

    return {
      id: request.id,
      content: data.text || data.content || 'Response processed',
      type: 'text',
      data: data.data || data,
      metadata: {
        processingTime: data.processingTime || 0,
        confidence: data.confidence || 0.9,
        sources: ['default-agent'],
        context: request.context as Record<string, unknown>,
      },
      timestamp: new Date(),
      default_agent: {
        response_type: this.determineResponseType(request.type),
        confidence_level: this.determineConfidenceLevel(data.confidence || 0.9),
        suggested_actions: data.suggested_actions || this.generateSuggestedActions(request.type),
      },
    };
  }

  /**
   * Generate mock response for development/fallback
   */
  private async generateMockResponse(request: MastraDefaultRequest): Promise<MastraDefaultResponse> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    let mockContent: string;
    let suggestedActions: string[];

    switch (request.type) {
      case 'help':
        mockContent = `I can help you with general questions about the Brius system. What specific area would you like assistance with?`;
        suggestedActions = [
          'Ask about system features',
          'Get help with navigation',
          'Learn about available tools',
        ];
        break;
      case 'clarification':
        mockContent = `I'd be happy to clarify that for you. Could you provide more specific details about what you'd like to understand better?`;
        suggestedActions = [
          'Provide more context',
          'Ask a more specific question',
          'Try rephrasing your question',
        ];
        break;
      case 'general':
      default:
        mockContent = `I understand you're asking about: "${request.query}". I can provide general assistance and help route you to the right resources.`;
        suggestedActions = [
          'Ask for more detailed analysis',
          'Get help with specific features',
          'Explore related topics',
        ];
        break;
    }

    return {
      id: request.id,
      content: mockContent,
      type: 'text',
      data: {
        queryType: request.type,
        processingMode: 'mock',
        timestamp: new Date().toISOString(),
      },
      metadata: {
        processingTime: 500,
        confidence: 0.9,
        sources: ['default-agent-mock'],
        context: request.context as Record<string, unknown>,
      },
      timestamp: new Date(),
      default_agent: {
        response_type: this.determineResponseType(request.type),
        confidence_level: 'high',
        suggested_actions: suggestedActions,
      },
    };
  }

  /**
   * Validate default agent request
   */
  private validateRequest(request: MastraDefaultRequest): void {
    if (!request.id || typeof request.id !== 'string') {
      throw new MastraMultiAgentError(
        'Request ID is required and must be a string',
        MastraMultiAgentErrorType.DEFAULT_AGENT_ERROR,
        { retryable: false, agent: MastraAgentType.DEFAULT }
      );
    }

    if (!request.query || typeof request.query !== 'string' || request.query.trim().length === 0) {
      throw new MastraMultiAgentError(
        'Query is required and must be a non-empty string',
        MastraMultiAgentErrorType.DEFAULT_AGENT_ERROR,
        { retryable: false, agent: MastraAgentType.DEFAULT }
      );
    }

    if (!['general', 'help', 'clarification'].includes(request.type)) {
      throw new MastraMultiAgentError(
        'Invalid default agent query type. Must be: general, help, or clarification',
        MastraMultiAgentErrorType.DEFAULT_AGENT_ERROR,
        { retryable: false, agent: MastraAgentType.DEFAULT }
      );
    }
  }

  /**
   * Determine response type based on query type
   */
  private determineResponseType(queryType: string): 'informational' | 'clarification' | 'help' | 'fallback' {
    switch (queryType) {
      case 'help':
        return 'help';
      case 'clarification':
        return 'clarification';
      case 'general':
        return 'informational';
      default:
        return 'fallback';
    }
  }

  /**
   * Determine confidence level from numeric confidence
   */
  private determineConfidenceLevel(confidence: number): 'low' | 'medium' | 'high' {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Generate suggested actions based on query type
   */
  private generateSuggestedActions(queryType: string): string[] {
    switch (queryType) {
      case 'help':
        return [
          'Browse available features',
          'Check documentation',
          'Contact support if needed',
        ];
      case 'clarification':
        return [
          'Provide more specific details',
          'Try a different approach',
          'Ask for examples',
        ];
      case 'general':
      default:
        return [
          'Ask for more detailed information',
          'Explore related topics',
          'Get specialized assistance',
        ];
    }
  }

  /**
   * Update performance statistics
   */
  private updateStats(startTime: number, success: boolean, queryType?: string): void {
    const executionTime = Date.now() - startTime;
    
    // Update average response time
    const totalTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + executionTime;
    this.stats.averageResponseTime = totalTime / this.stats.totalRequests;

    // Track query types
    if (success && queryType) {
      this.stats.queryTypes[queryType] = (this.stats.queryTypes[queryType] || 0) + 1;
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
 * Factory function to get default client instance
 */
export function getMastraDefaultClient(config?: Partial<MastraAgentConfig>): MastraDefaultClient {
  return new MastraDefaultClient(config);
}

/**
 * Default client instance
 */
export const defaultDefaultClient = getMastraDefaultClient();