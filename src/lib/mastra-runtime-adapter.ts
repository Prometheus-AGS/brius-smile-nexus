/**
 * Mastra Runtime Adapter for AG-UI (@assistant-ui/react)
 * 
 * This adapter uses @assistant-ui/react-ai-sdk to bridge Mastra BI client
 * with AG-UI components through the Vercel AI SDK interface.
 * 
 * MASTRA-ONLY: No fallbacks, connects exclusively to real Mastra servers
 * 
 * Architecture:
 * - Uses useChat from @ai-sdk/react for state management
 * - Connects to MastraBIClient via custom API route pattern
 * - Supports real streaming from Mastra servers
 * - Provides proper error handling and state management
 */

import { MastraBIClient } from '@/services/mastra-bi-client';
import type {
  MastraAgentQuery,
  MastraStreamChunk,
  MastraStreamConfig,
} from '@/types/mastra-types';
import type { AgentInputContext } from '@/types/role-types';
import { DEFAULT_PERMISSIONS } from '@/types/role-types';

/**
 * Create minimal AgentInputContext for runtime adapter
 * Used when full auth context is not available
 */
function createRuntimeContext(sessionId: string, history?: unknown): AgentInputContext {
  return {
    userId: 'runtime-user',
    sessionId,
    roles: ['user'],
    primaryRole: 'user',
    permissions: DEFAULT_PERMISSIONS.user,
    isAuthenticated: false, // Runtime adapter doesn't have auth
    isAnonymous: true,
    userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    featureFlags: {
      useMastra: true,
      enableUserContext: true,
      enableMemoryPersistence: false,
    },
    metadata: {
      conversationHistory: history,
    },
  };
}

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Configuration for Mastra runtime adapter
 */
export interface MastraRuntimeConfig {
  /** Mastra BI client instance */
  client: MastraBIClient;
  /** Enable debug logging */
  debug?: boolean;
  /** Default query type */
  defaultQueryType?: 'analytics' | 'dashboard' | 'report' | 'general';
}

/**
 * Message format for Mastra chat
 */
export interface MastraChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: Date;
}

/**
 * Mastra streaming response handler
 */
export type MastraStreamHandler = (chunk: string) => void;

// ============================================================================
// Mastra Runtime Adapter Implementation
// ============================================================================

/**
 * Mastra Runtime Adapter for AG-UI
 * 
 * Provides a clean interface for AG-UI components to interact with Mastra agents.
 * Uses streaming for real-time responses from Mastra servers.
 */
export class MastraRuntimeAdapter {
  private readonly client: MastraBIClient;
  private readonly debug: boolean;
  private readonly defaultQueryType: 'analytics' | 'dashboard' | 'report' | 'general';
  private currentThreadId: string;
  private abortController: AbortController | null;

  constructor(config: MastraRuntimeConfig) {
    this.client = config.client;
    this.debug = config.debug ?? false;
    this.defaultQueryType = config.defaultQueryType ?? 'general';
    this.currentThreadId = this.generateThreadId();
    this.abortController = null;

    if (this.debug) {
      console.log('MastraRuntimeAdapter initialized:', {
        threadId: this.currentThreadId,
        defaultQueryType: this.defaultQueryType,
      });
    }
  }

  // ============================================================================
  // Core Methods
  // ============================================================================

  /**
   * Send a message to Mastra agent with streaming response
   */
  async sendMessage(
    userMessage: string,
    conversationHistory: MastraChatMessage[],
    onStream: MastraStreamHandler,
    onComplete?: (fullResponse: string) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    this.abortController = new AbortController();
    
    const conversationData = conversationHistory.map(msg => ({
      id: msg.id,
      content: msg.content,
      role: msg.role,
      timestamp: msg.createdAt || new Date(),
    }));

    const query: MastraAgentQuery = {
      id: this.generateQueryId(),
      query: userMessage,
      type: this.defaultQueryType,
      context: createRuntimeContext(this.currentThreadId, conversationData),
    };

    let accumulatedContent = '';

    const streamConfig: MastraStreamConfig = {
      stream: true,
      onChunk: (chunk: MastraStreamChunk) => {
        accumulatedContent += chunk.content;
        onStream(chunk.content);

        if (this.debug) {
          console.log('Received chunk:', chunk);
        }
      },
      onComplete: () => {
        if (this.debug) {
          console.log('Streaming completed, final content:', accumulatedContent);
        }
        
        if (onComplete) {
          onComplete(accumulatedContent);
        }
      },
      onError: (error) => {
        if (this.debug) {
          console.error('Streaming error:', error);
        }
        
        if (onError) {
          onError(error);
        }
      },
    };

    try {
      await this.client.executeStreamingQuery(query, streamConfig);
    } catch (error) {
      if (this.debug) {
        console.error('Failed to execute streaming query:', error);
      }
      
      if (onError) {
        onError(error instanceof Error ? error : new Error('Unknown error occurred'));
      } else {
        throw error;
      }
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Send a non-streaming message to Mastra agent
   */
  async sendMessageSync(
    userMessage: string,
    conversationHistory: MastraChatMessage[]
  ): Promise<string> {
    const conversationData = conversationHistory.map(msg => ({
      id: msg.id,
      content: msg.content,
      role: msg.role,
      timestamp: msg.createdAt || new Date(),
    }));

    const query: MastraAgentQuery = {
      id: this.generateQueryId(),
      query: userMessage,
      type: this.defaultQueryType,
      context: createRuntimeContext(this.currentThreadId, conversationData),
    };

    try {
      const response = await this.client.executeQuery(query);
      return response.content;
    } catch (error) {
      if (this.debug) {
        console.error('Failed to execute query:', error);
      }
      throw error;
    }
  }

  /**
   * Cancel the current streaming operation
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.debug) {
      console.log('Mastra operation cancelled');
    }
  }

  /**
   * Start a new conversation thread
   */
  startNewThread(): string {
    this.currentThreadId = this.generateThreadId();
    
    if (this.debug) {
      console.log('New thread started:', this.currentThreadId);
    }
    
    return this.currentThreadId;
  }

  /**
   * Get current thread ID
   */
  getCurrentThreadId(): string {
    return this.currentThreadId;
  }

  /**
   * Get Mastra client status
   */
  getClientStatus() {
    return this.client.getStatus();
  }

  /**
   * Check if Mastra client is connected
   */
  isConnected(): boolean {
    const status = this.client.getStatus();
    return status.connected && status.agentAvailable;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Generate unique thread ID
   */
  private generateThreadId(): string {
    return `thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique query ID
   */
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new Mastra runtime adapter instance
 */
export function createMastraRuntime(config: MastraRuntimeConfig): MastraRuntimeAdapter {
  return new MastraRuntimeAdapter(config);
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}