/**
 * Mastra Data Sync Service
 * 
 * Centralized service for fetching data from the Mastra agent server.
 * Provides methods for syncing threads, messages, memories, and agent health data.
 * Integrates with AgentInputContext and circuit breaker patterns for robust error handling.
 * 
 * @module mastra-data-sync-service
 */

import type { AgentInputContext } from '@/types/agent-context';
import type { UserMemory, GlobalMemory } from '@/types/memory';
import type { AgentHealthStatus, MastraAgentType } from '@/types/mastra-agents-types';
import { getCircuitBreaker, type CircuitBreakerConfig } from '@/lib/error-handling';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Thread/Conversation interface for Mastra API responses
 */
export interface MastraThread {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message?: string;
}

/**
 * Message interface for Mastra API responses
 */
export interface MastraMessage {
  id: string;
  thread_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * Agent execution history entry
 */
export interface ExecutionHistoryEntry {
  id: string;
  timestamp: Date;
  agent: MastraAgentType;
  query: string;
  success: boolean;
  execution_time_ms: number;
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for Mastra data sync service
 */
export interface MastraDataSyncConfig {
  baseUrl: string;
  timeout: number;
  circuitBreaker: CircuitBreakerConfig;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: MastraDataSyncConfig = {
  baseUrl: import.meta.env.VITE_MASTRA_API_URL || 'http://localhost:4111',
  timeout: 10000, // 10 seconds
  circuitBreaker: {
    timeout: 10000,
    errorThresholdPercentage: 50,
    resetTimeoutMs: 30000, // 30 seconds
    volumeThreshold: 5,
    maxRetries: 3,
    backoffMultiplier: 2,
    initialBackoffMs: 1000, // 1 second
    debug: false,
  },
};

// ============================================================================
// Mastra Data Sync Service Class
// ============================================================================

/**
 * Service for syncing data from the Mastra agent server
 */
export class MastraDataSyncService {
  private config: MastraDataSyncConfig;
  private cache: Map<string, { data: unknown; timestamp: Date }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(config: Partial<MastraDataSyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // Thread Management
  // ==========================================================================

  /**
   * Fetch all threads for a user from Mastra server
   * @param userId - User ID to fetch threads for
   * @param context - Agent input context with auth and permissions
   * @returns Promise resolving to array of threads
   */
  async fetchThreads(
    userId: string,
    context: AgentInputContext
  ): Promise<MastraThread[]> {
    const cacheKey = `threads:${userId}`;
    
    // Check cache first
    const cached = this.getCachedData<MastraThread[]>(cacheKey);
    if (cached) {
      console.log('[MastraDataSync] Returning cached threads', { userId, count: cached.length });
      return cached;
    }

    console.log('[MastraDataSync] Fetching threads from server', { userId });

    const breaker = getCircuitBreaker('mastra-fetch-threads', this.config.circuitBreaker);
    const result = await breaker.execute(async () => {
      const response = await this.makeRequest<{ threads: MastraThread[] }>(
        `/api/threads?userId=${userId}`,
        {
          method: 'GET',
          headers: this.getHeaders(context),
        }
      );

      const threads = response.threads || [];
      this.setCachedData(cacheKey, threads);
      
      console.log('[MastraDataSync] Threads fetched successfully', {
        userId,
        count: threads.length
        });
      
      return threads;
    });
    
    if (!result.success) {
      throw result.error || new Error('Failed to fetch threads from Mastra server');
    }
    
    return result.data!;
  }

  /**
   * Fetch messages for a specific thread
   * @param threadId - Thread ID to fetch messages for
   * @param context - Agent input context with auth and permissions
   * @returns Promise resolving to array of messages
   */
  async fetchThreadMessages(
    threadId: string,
    context: AgentInputContext
  ): Promise<MastraMessage[]> {
    const cacheKey = `messages:${threadId}`;
    
    // Check cache first
    const cached = this.getCachedData<MastraMessage[]>(cacheKey);
    if (cached) {
      console.log('[MastraDataSync] Returning cached messages', { 
        threadId, 
        count: cached.length 
      });
      return cached;
    }

    console.log('[MastraDataSync] Fetching messages from server', { threadId });

    const breaker = getCircuitBreaker('mastra-fetch-messages', this.config.circuitBreaker);
    const result = await breaker.execute(async () => {
      const response = await this.makeRequest<{ messages: MastraMessage[] }>(
        `/api/threads/${threadId}/messages`,
        {
          method: 'GET',
          headers: this.getHeaders(context),
        }
      );

      const messages = response.messages || [];
      this.setCachedData(cacheKey, messages);
      
      console.log('[MastraDataSync] Messages fetched successfully', {
        threadId,
        count: messages.length
      });
      
      return messages;
    });
    
    if (!result.success) {
      throw result.error || new Error('Failed to fetch messages from Mastra server');
    }
    
    return result.data!;
  }

  // ==========================================================================
  // Memory Management
  // ==========================================================================

  /**
   * Fetch user memories for personalization
   * @param userId - User ID to fetch memories for
   * @param context - Agent input context with auth and permissions
   * @returns Promise resolving to array of user memories
   */
  async fetchUserMemories(
    userId: string,
    context: AgentInputContext
  ): Promise<UserMemory[]> {
    const cacheKey = `memories:user:${userId}`;
    
    // Check cache first
    const cached = this.getCachedData<UserMemory[]>(cacheKey);
    if (cached) {
      console.log('[MastraDataSync] Returning cached user memories', { 
        userId, 
        count: cached.length 
      });
      return cached;
    }

    console.log('[MastraDataSync] Fetching user memories from server', { userId });

    const breaker = getCircuitBreaker('mastra-fetch-user-memories', this.config.circuitBreaker);
    const result = await breaker.execute(async () => {
      const response = await this.makeRequest<{ memories: UserMemory[] }>(
        `/api/memories/user/${userId}`,
        {
          method: 'GET',
          headers: this.getHeaders(context),
        }
      );

      const memories = response.memories || [];
      this.setCachedData(cacheKey, memories);
      
      console.log('[MastraDataSync] User memories fetched successfully', {
        userId,
        count: memories.length
      });
      
      return memories;
    });
    
    if (!result.success) {
      throw result.error || new Error('Failed to fetch user memories from Mastra server');
    }
    
    return result.data!;
  }

  /**
   * Fetch global memories (organization-wide knowledge)
   * @param context - Agent input context with auth and permissions
   * @returns Promise resolving to array of global memories
   */
  async fetchGlobalMemories(
    context: AgentInputContext
  ): Promise<GlobalMemory[]> {
    const cacheKey = 'memories:global';
    
    // Check cache first
    const cached = this.getCachedData<GlobalMemory[]>(cacheKey);
    if (cached) {
      console.log('[MastraDataSync] Returning cached global memories', { 
        count: cached.length 
      });
      return cached;
    }

    console.log('[MastraDataSync] Fetching global memories from server');

    const breaker = getCircuitBreaker('mastra-fetch-global-memories', this.config.circuitBreaker);
    const result = await breaker.execute(async () => {
      const response = await this.makeRequest<{ memories: GlobalMemory[] }>(
        '/api/memories/global',
        {
          method: 'GET',
          headers: this.getHeaders(context),
        }
      );

      const memories = response.memories || [];
      this.setCachedData(cacheKey, memories);
      
      console.log('[MastraDataSync] Global memories fetched successfully', {
        count: memories.length
      });
      
      return memories;
    });
    
    if (!result.success) {
      throw result.error || new Error('Failed to fetch global memories from Mastra server');
    }
    
    return result.data!;
  }

  // ==========================================================================
  // Agent Health & Metadata
  // ==========================================================================

  /**
   * Fetch agent health status from Mastra server
   * @param context - Agent input context with auth and permissions
   * @returns Promise resolving to map of agent health statuses
   */
  async fetchAgentHealth(
    context: AgentInputContext
  ): Promise<Map<MastraAgentType, AgentHealthStatus>> {
    const cacheKey = 'agent:health';
    
    // Check cache first (shorter TTL for health data - 1 minute)
    const cached = this.getCachedData<Map<MastraAgentType, AgentHealthStatus>>(
      cacheKey,
      60000 // 1 minute cache for health data
    );
    if (cached) {
      console.log('[MastraDataSync] Returning cached agent health');
      return cached;
    }

    console.log('[MastraDataSync] Fetching agent health from server');

    const breaker = getCircuitBreaker('mastra-fetch-agent-health', this.config.circuitBreaker);
    const result = await breaker.execute(async () => {
      const response = await this.makeRequest<{
        agents: Array<{ agent: MastraAgentType; health: AgentHealthStatus }>
      }>(
        '/api/agents/health',
        {
          method: 'GET',
          headers: this.getHeaders(context),
        }
      );

      const healthMap = new Map<MastraAgentType, AgentHealthStatus>();
      
      if (response.agents) {
        response.agents.forEach(({ agent, health }) => {
          healthMap.set(agent, health);
        });
      }

      this.setCachedData(cacheKey, healthMap);
      
      console.log('[MastraDataSync] Agent health fetched successfully', {
        agentCount: healthMap.size
      });
      
      return healthMap;
    });
    
    if (!result.success) {
      throw result.error || new Error('Failed to fetch agent health from Mastra server');
    }
    
    return result.data!;
  }

  /**
   * Fetch execution history for analytics
   * @param userId - User ID to fetch history for
   * @param context - Agent input context with auth and permissions
   * @param limit - Maximum number of entries to fetch (default: 50)
   * @returns Promise resolving to array of execution history entries
   */
  async fetchExecutionHistory(
    userId: string,
    context: AgentInputContext,
    limit: number = 50
  ): Promise<ExecutionHistoryEntry[]> {
    const cacheKey = `execution:history:${userId}:${limit}`;
    
    // Check cache first
    const cached = this.getCachedData<ExecutionHistoryEntry[]>(cacheKey);
    if (cached) {
      console.log('[MastraDataSync] Returning cached execution history', { 
        userId, 
        count: cached.length 
      });
      return cached;
    }

    console.log('[MastraDataSync] Fetching execution history from server', { 
      userId, 
      limit 
    });

    const breaker = getCircuitBreaker('mastra-fetch-execution-history', this.config.circuitBreaker);
    const result = await breaker.execute(async () => {
      const response = await this.makeRequest<{ history: ExecutionHistoryEntry[] }>(
        `/api/executions/history?userId=${userId}&limit=${limit}`,
        {
          method: 'GET',
          headers: this.getHeaders(context),
        }
      );

      const history = response.history || [];
      this.setCachedData(cacheKey, history);
      
      console.log('[MastraDataSync] Execution history fetched successfully', {
        userId,
        count: history.length
      });
      
      return history;
    });
    
    if (!result.success) {
      throw result.error || new Error('Failed to fetch execution history from Mastra server');
    }
    
    return result.data!;
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  /**
   * Invalidate cache for a specific key
   * @param key - Cache key to invalidate
   */
  invalidateCache(key: string): void {
    this.cache.delete(key);
    console.log('[MastraDataSync] Cache invalidated', { key });
  }

  /**
   * Invalidate all cached data
   */
  invalidateAllCache(): void {
    this.cache.clear();
    console.log('[MastraDataSync] All cache invalidated');
  }

  /**
   * Get cache timestamp for a key
   * @param key - Cache key to check
   * @returns Cache timestamp or null if not cached
   */
  getCacheTimestamp(key: string): Date | null {
    const cached = this.cache.get(key);
    return cached ? cached.timestamp : null;
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Get cached data if available and not expired
   * @param key - Cache key
   * @param ttl - Time to live in milliseconds (optional, uses default if not provided)
   * @returns Cached data or null if not available/expired
   */
  private getCachedData<T>(key: string, ttl?: number): T | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp.getTime();
    const maxAge = ttl || this.CACHE_TTL_MS;
    
    if (age > maxAge) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Set data in cache with timestamp
   * @param key - Cache key
   * @param data - Data to cache
   */
  private setCachedData(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
    });
  }

  /**
   * Get headers for Mastra API requests
   * @param context - Agent input context with auth info
   * @returns Headers object for fetch request
   */
  private getHeaders(context: AgentInputContext): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add JWT authorization if available
    if (context.metadata?.jwt) {
      headers['Authorization'] = `Bearer ${context.metadata.jwt}`;
    }

    // Add custom context headers for Mastra agent server
    headers['X-Context-User'] = context.userId;
    headers['X-Context-Roles'] = context.roles.join(',');
    headers['X-Context-Session'] = context.sessionId;
    
    if (context.metadata?.applicationName) {
      headers['X-Context-App'] = context.metadata.applicationName as string;
    }
    
    headers['X-Context-Stream'] = context.streaming ? 'true' : 'false';

    return headers;
  }

  /**
   * Make HTTP request to Mastra API with timeout and error handling
   * @param endpoint - API endpoint path
   * @param options - Fetch options
   * @returns Promise resolving to response data
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Mastra API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Mastra API request timeout after ${this.config.timeout}ms`);
        }
        throw error;
      }
      
      throw new Error('Unknown error during Mastra API request');
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: MastraDataSyncService | null = null;

/**
 * Get singleton instance of Mastra Data Sync Service
 * @param config - Optional configuration overrides
 * @returns Mastra Data Sync Service instance
 */
export function getMastraDataSyncService(
  config?: Partial<MastraDataSyncConfig>
): MastraDataSyncService {
  if (!instance) {
    instance = new MastraDataSyncService(config);
  }
  return instance;
}

/**
 * Reset singleton instance (useful for testing)
 */
export function resetMastraDataSyncService(): void {
  instance = null;
}