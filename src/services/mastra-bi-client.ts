/**
 * Mastra Business Intelligence Client Service
 * 
 * MASTRA-ONLY Implementation - No Fallbacks, No Mocks
 * Connects exclusively to remote Mastra servers at https://mastra.brius.com
 * 
 * This service provides a clean interface for business intelligence agent operations
 * using Mastra v0.21.1 API with strict TypeScript typing and comprehensive error handling.
 */

import { z } from 'zod';
import type {
  MastraClientConfig,
  MastraAgentQuery,
  MastraAgentResponse,
  MastraStreamChunk,
  MastraStreamConfig,
  MastraClientError,
  MastraHealthResponse,
  MastraBIQuery,
  MastraBIResponse,
  MastraRequestOptions,
  MastraClientStatus,
} from '@/types/mastra-types';
import {
  MastraEnvSchema,
  MastraErrorType,
} from '@/types/mastra-types';

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Custom error class for Mastra client operations
 */
class MastraClientErrorImpl extends Error implements MastraClientError {
  public readonly code: string;
  public readonly status?: number;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;
  public readonly cause?: Error;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    options: {
      status?: number;
      details?: Record<string, unknown>;
      retryable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'MastraClientError';
    this.code = code;
    this.status = options.status;
    this.details = options.details;
    this.retryable = options.retryable ?? false;
    this.cause = options.cause;
    this.timestamp = new Date();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MastraClientErrorImpl);
    }
  }
}

// ============================================================================
// Configuration and Validation
// ============================================================================

/**
 * Load and validate environment configuration for Mastra client
 * STRICT: Throws error if configuration is invalid - no defaults
 */
function loadMastraConfig(): MastraClientConfig {
  const env = MastraEnvSchema.parse(import.meta.env);
  
  if (!env.VITE_MASTRA_BASE_URL) {
    throw new Error('VITE_MASTRA_BASE_URL is required for Mastra client');
  }

  return {
    baseUrl: env.VITE_MASTRA_BASE_URL,
    apiKey: env.VITE_MASTRA_API_KEY,
    agentName: env.VITE_MASTRA_AGENT_NAME,
    timeout: env.VITE_MASTRA_TIMEOUT,
    maxRetries: env.VITE_MASTRA_MAX_RETRIES,
    debug: env.VITE_MASTRA_DEBUG,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'brius-smile-nexus/1.0.0',
    },
  };
}

// ============================================================================
// Main Mastra Client Service Class
// ============================================================================

/**
 * Mastra Business Intelligence Client Service
 * 
 * MASTRA-ONLY: Connects exclusively to remote Mastra servers
 * NO FALLBACKS: Throws errors if Mastra server is unavailable
 * NO MOCKS: All responses come from real Mastra agents
 */
export class MastraBIClient {
  private readonly config: MastraClientConfig;
  private readonly stats: MastraClientStatus['stats'];
  private lastHealthCheck: Date;
  private isConnected: boolean;
  private agentAvailable: boolean;
  private jwtToken?: string; // Dynamic JWT token from auth session

  constructor(config?: Partial<MastraClientConfig>, jwtToken?: string) {
    this.config = { ...loadMastraConfig(), ...config };
    this.jwtToken = jwtToken;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
    };
    this.lastHealthCheck = new Date();
    this.isConnected = false;
    this.agentAvailable = false;

    // Initialize connection to Mastra server
    this.initializeConnection();

    if (this.config.debug) {
      console.log('MastraBIClient initialized with config:', {
        ...this.config,
        apiKey: this.config.apiKey ? '[REDACTED]' : undefined,
        hasJwtToken: !!this.jwtToken,
      });
    }
  }

  /**
   * Update the JWT token for authentication
   * Call this when the user's session changes
   */
  setJwtToken(token: string | undefined): void {
    this.jwtToken = token;
    
    if (this.config.debug) {
      console.log('JWT token updated:', { hasToken: !!token });
    }
  }

  /**
   * Initialize connection to Mastra service
   * MASTRA-ONLY: Validates connection using real health endpoint
   */
  private async initializeConnection(): Promise<void> {
    try {
      const health = await this.checkHealth();
      this.isConnected = health.status === 'healthy';
      this.agentAvailable = health.agent.status === 'available';

      if (this.config.debug) {
        console.log('Mastra connection established:', {
          connected: this.isConnected,
          agentAvailable: this.agentAvailable,
          status: health.status,
          timestamp: health.timestamp,
        });
      }
    } catch (error) {
      // Graceful degradation - don't block initialization
      this.isConnected = false;
      this.agentAvailable = false;
      
      if (this.config.debug) {
        console.warn('Mastra health check failed, will retry on first request:', error);
      }
    }
  }

  // ============================================================================
  // Core Agent Communication Methods
  // ============================================================================

  /**
   * Execute a query against the business intelligence agent
   * MASTRA-ONLY: No fallbacks, throws error if server unavailable
   */
  async executeQuery(
    query: MastraAgentQuery,
    options: MastraRequestOptions = {}
  ): Promise<MastraAgentResponse> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      if (this.config.debug) {
        console.log('Executing Mastra BI query:', query);
      }

      // Validate query input
      this.validateQuery(query);

      // Make HTTP request to Mastra server
      const response = await this.makeHttpRequest(query, options);
      
      this.updateStats(startTime, true);
      this.stats.successfulRequests++;

      if (this.config.debug) {
        console.log('Mastra BI query executed successfully:', response);
      }

      return response;
    } catch (error) {
      this.stats.failedRequests++;
      this.updateStats(startTime, false);

      if (error instanceof MastraClientErrorImpl) {
        throw error;
      }

      throw new MastraClientErrorImpl(
        `Failed to execute query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MastraErrorType.AGENT_ERROR,
        {
          retryable: true,
          cause: error instanceof Error ? error : undefined,
          details: { query: query.id, type: query.type },
        }
      );
    }
  }

  /**
   * Execute a streaming query against the business intelligence agent
   * MASTRA-ONLY: Real streaming from Mastra server
   */
  async executeStreamingQuery(
    query: MastraAgentQuery,
    streamConfig: MastraStreamConfig,
    options: MastraRequestOptions = {}
  ): Promise<void> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      if (this.config.debug) {
        console.log('Executing streaming Mastra BI query:', query);
      }

      // Validate query input
      this.validateQuery(query);

      // Make streaming HTTP request to Mastra server
      await this.makeStreamingHttpRequest(query, streamConfig, options);

      this.updateStats(startTime, true);
      this.stats.successfulRequests++;

      if (this.config.debug) {
        console.log('Streaming Mastra BI query completed successfully');
      }
    } catch (error) {
      this.stats.failedRequests++;
      this.updateStats(startTime, false);

      const clientError = error instanceof MastraClientErrorImpl 
        ? error 
        : new MastraClientErrorImpl(
            `Streaming query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            MastraErrorType.STREAM_ERROR,
            {
              retryable: true,
              cause: error instanceof Error ? error : undefined,
            }
          );

      if (streamConfig.onError) {
        streamConfig.onError(clientError);
      } else {
        throw clientError;
      }
    }
  }

  // ============================================================================
  // Business Intelligence Specific Methods
  // ============================================================================

  /**
   * Execute a business intelligence specific query
   */
  async executeBIQuery(
    query: MastraBIQuery,
    options: MastraRequestOptions = {}
  ): Promise<MastraBIResponse> {
    // Use the query directly - context is now AgentInputContext with biOptions
    const response = await this.executeQuery(query, options);

    // Transform to BI-specific response
    const biResponse: MastraBIResponse = {
      ...response,
      data: {
        results: this.extractResults(response.data),
        summary: this.extractSummary(response.data),
        chart: this.extractChartConfig(response.data),
        insights: this.extractInsights(response.data),
      },
    };

    return biResponse;
  }

  // ============================================================================
  // Health Check and Status Methods
  // ============================================================================

  /**
   * Check the health of the Mastra service using real health endpoint
   * MASTRA-ONLY: Calls /health endpoint on Mastra server
   */
  async checkHealth(): Promise<MastraHealthResponse> {
    try {
      const headers: Record<string, string> = {
        ...this.config.headers,
      };

      // Add JWT token if available (preferred) or fall back to API key
      if (this.jwtToken) {
        headers['Authorization'] = `Bearer ${this.jwtToken}`;
      } else if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(5000),
      });

      this.lastHealthCheck = new Date();

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { healthy: boolean; timestamp: string };

      // Update connection status
      this.isConnected = data.healthy;
      this.agentAvailable = data.healthy;

      const healthResponse: MastraHealthResponse = {
        status: data.healthy ? 'healthy' : 'unhealthy',
        agent: {
          name: this.config.agentName,
          status: data.healthy ? 'available' : 'offline',
          version: '0.21.1',
          capabilities: ['analytics', 'reporting', 'dashboard', 'streaming'],
        },
        uptime: 0,
        timestamp: new Date(data.timestamp),
        details: {
          baseUrl: this.config.baseUrl,
          totalRequests: this.stats.totalRequests,
          successRate: this.calculateSuccessRate(),
        },
      };

      if (this.config.debug) {
        console.log('Mastra health check successful:', healthResponse);
      }

      return healthResponse;
    } catch (error) {
      this.lastHealthCheck = new Date();
      this.isConnected = false;
      this.agentAvailable = false;

      if (this.config.debug) {
        console.error('Mastra health check failed:', error);
      }

      throw new MastraClientErrorImpl(
        `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        MastraErrorType.CONNECTION_ERROR,
        {
          retryable: true,
          cause: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  /**
   * Get current client status
   */
  getStatus(): MastraClientStatus {
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
   * Make HTTP request to Mastra service
   * MASTRA-ONLY: Real HTTP request, no mocks
   */
  private async makeHttpRequest(
    query: MastraAgentQuery,
    options: MastraRequestOptions
  ): Promise<MastraAgentResponse> {
    const endpoint = `${this.config.baseUrl}/api/agents/${this.config.agentName}/generate`;

    const requestBody = {
      messages: [
        {
          role: 'user',
          content: query.query,
        }
      ],
      context: query.context,
      parameters: query.parameters,
    };

    if (this.config.debug) {
      console.log('Making HTTP request to Mastra:', { endpoint, body: requestBody });
    }

    const headers: Record<string, string> = {
      ...this.config.headers,
      ...options.headers,
    };

    // Add JWT token if available (preferred) or fall back to API key
    if (this.jwtToken) {
      headers['Authorization'] = `Bearer ${this.jwtToken}`;
    } else if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(options.timeout || this.config.timeout || 60000),
    });

    if (!response.ok) {
      throw new MastraClientErrorImpl(
        `HTTP ${response.status}: ${response.statusText}`,
        MastraErrorType.CONNECTION_ERROR,
        {
          status: response.status,
          retryable: response.status >= 500,
        }
      );
    }

    const data = await response.json();

    return {
      id: query.id,
      content: data.text || data.content || data.response || '',
      type: this.determineResponseType(data),
      data: data.data || data,
      metadata: {
        processingTime: data.processingTime || 0,
        confidence: data.confidence || 0.9,
        sources: ['mastra-agent'],
        context: query.context as Record<string, unknown>,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Make streaming HTTP request to Mastra service
   * MASTRA-ONLY: Real streaming from server
   */
  private async makeStreamingHttpRequest(
    query: MastraAgentQuery,
    streamConfig: MastraStreamConfig,
    options: MastraRequestOptions
  ): Promise<void> {
    const endpoint = `${this.config.baseUrl}/api/agents/${this.config.agentName}/generate`;

    const requestBody = {
      messages: [
        {
          role: 'user',
          content: query.query,
        }
      ],
      context: query.context,
      parameters: query.parameters,
    };

    const headers: Record<string, string> = {
      ...this.config.headers,
      ...options.headers,
      'Accept': 'text/event-stream',
    };

    // Add JWT token if available (preferred) or fall back to API key
    if (this.jwtToken) {
      headers['Authorization'] = `Bearer ${this.jwtToken}`;
    } else if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(options.timeout || this.config.timeout || 60000),
    });

    if (!response.ok) {
      throw new MastraClientErrorImpl(
        `HTTP ${response.status}: ${response.statusText}`,
        MastraErrorType.CONNECTION_ERROR,
        {
          status: response.status,
          retryable: response.status >= 500,
        }
      );
    }

    if (!response.body) {
      throw new MastraClientErrorImpl(
        'No response body for streaming request',
        MastraErrorType.STREAM_ERROR,
        { retryable: false }
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let chunkIndex = 0;
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunkText = decoder.decode(value, { stream: true });
        fullContent += chunkText;

        const chunk: MastraStreamChunk = {
          id: `${query.id}-chunk-${chunkIndex}`,
          content: chunkText,
          done: false,
          metadata: {
            index: chunkIndex,
            type: 'text',
          },
          timestamp: new Date(),
        };

        chunkIndex++;

        if (streamConfig.onChunk) {
          streamConfig.onChunk(chunk);
        }
      }

      // Send final chunk
      const finalChunk: MastraStreamChunk = {
        id: `${query.id}-chunk-${chunkIndex}`,
        content: '',
        done: true,
        metadata: {
          index: chunkIndex,
          total: chunkIndex,
          type: 'text',
        },
        timestamp: new Date(),
      };

      if (streamConfig.onChunk) {
        streamConfig.onChunk(finalChunk);
      }

      if (streamConfig.onComplete) {
        const completeResponse: MastraAgentResponse = {
          id: query.id,
          content: fullContent,
          type: 'text',
          data: { text: fullContent },
          metadata: {
            processingTime: 0,
            confidence: 0.9,
            sources: ['mastra-agent'],
            context: query.context as Record<string, unknown>,
          },
          timestamp: new Date(),
        };
        streamConfig.onComplete(completeResponse);
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Validate query input
   */
  private validateQuery(query: MastraAgentQuery): void {
    if (!query.id || !query.query || !query.type) {
      throw new MastraClientErrorImpl(
        'Invalid query: id, query, and type are required',
        MastraErrorType.VALIDATION_ERROR,
        {
          retryable: false,
          details: { query },
        }
      );
    }
  }

  /**
   * Determine response type from Mastra response
   */
  private determineResponseType(response: unknown): MastraAgentResponse['type'] {
    if (typeof response === 'object' && response !== null) {
      const data = response as Record<string, unknown>;
      if (data.type) return data.type as MastraAgentResponse['type'];
      if (data.chart) return 'chart';
      if (data.table) return 'table';
    }
    return 'text';
  }

  /**
   * Extract results from response data
   */
  private extractResults(data: unknown): unknown[] {
    if (Array.isArray(data)) return data;
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.results)) return obj.results;
      if (Array.isArray(obj.data)) return obj.data;
    }
    return [];
  }

  /**
   * Extract summary from response data
   */
  private extractSummary(data: unknown): MastraBIResponse['data']['summary'] {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if (obj.summary && typeof obj.summary === 'object') {
        const summary = obj.summary as Record<string, unknown>;
        return {
          totalRecords: typeof summary.totalRecords === 'number' ? summary.totalRecords : 0,
          aggregations: summary.aggregations as Record<string, number> | undefined,
          trends: summary.trends as Record<string, number> | undefined,
        };
      }
    }
    return undefined;
  }

  /**
   * Extract chart configuration from response data
   */
  private extractChartConfig(data: unknown): MastraBIResponse['data']['chart'] {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if (obj.chart && typeof obj.chart === 'object') {
        return obj.chart as MastraBIResponse['data']['chart'];
      }
    }
    return undefined;
  }

  /**
   * Extract insights from response data
   */
  private extractInsights(data: unknown): MastraBIResponse['data']['insights'] {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if (obj.insights && typeof obj.insights === 'object') {
        const insights = obj.insights as Record<string, unknown>;
        return {
          trends: Array.isArray(insights.trends) ? insights.trends.map(i => String(i)) : [],
          anomalies: Array.isArray(insights.anomalies) ? insights.anomalies.map(i => String(i)) : [],
          recommendations: Array.isArray(insights.recommendations) ? insights.recommendations.map(i => String(i)) : [],
        };
      }
    }
    return undefined;
  }

  /**
   * Update statistics
   */
  private updateStats(startTime: number, success: boolean): void {
    const responseTime = Date.now() - startTime;
    const totalTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime;
    this.stats.averageResponseTime = totalTime / this.stats.totalRequests;
  }

  /**
   * Calculate success rate
   */
  private calculateSuccessRate(): number {
    if (this.stats.totalRequests === 0) return 0;
    return (this.stats.successfulRequests / this.stats.totalRequests) * 100;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let clientInstance: MastraBIClient | null = null;

/**
 * Get or create Mastra BI client instance (singleton pattern)
 * @param config - Optional configuration overrides
 * @param jwtToken - Optional JWT token for authentication (from Supabase session)
 */
export function getMastraBIClient(config?: Partial<MastraClientConfig>, jwtToken?: string): MastraBIClient {
  if (!clientInstance) {
    clientInstance = new MastraBIClient(config, jwtToken);
  } else if (jwtToken) {
    // Update JWT token if client already exists
    clientInstance.setJwtToken(jwtToken);
  }
  return clientInstance;
}

/**
 * Reset client instance (useful for testing)
 */
export function resetMastraBIClient(): void {
  clientInstance = null;
}