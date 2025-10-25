/**
 * Mastra Chat Hook
 *
 * Custom hook that manages chat state and integrates with Mastra runtime adapter.
 * Provides a clean interface for chat components to interact with Mastra agents.
 *
 * MASTRA-ONLY: No fallbacks, connects exclusively to real Mastra servers
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { MastraBIClient, getMastraBIClient } from '@/services/mastra-bi-client';
import {
  MastraRuntimeAdapter,
  createMastraRuntime,
  generateMessageId,
  type MastraChatMessage
} from '@/lib/mastra-runtime-adapter';
import { useAuthStore } from '@/stores/auth-store';

// ============================================================================
// Hook State Interface
// ============================================================================

export interface UseMastraChatState {
  messages: MastraChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: Error | null;
  isConnected: boolean;
}

export interface UseMastraChatActions {
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  retry: () => Promise<void>;
}

export interface UseMastraChatReturn extends UseMastraChatState, UseMastraChatActions {
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

// ============================================================================
// Hook Configuration
// ============================================================================

export interface UseMastraChatConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Default query type for Mastra agent */
  defaultQueryType?: 'analytics' | 'dashboard' | 'report' | 'general';
  /** Auto-scroll to bottom on new messages */
  autoScroll?: boolean;
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

/**
 * Custom hook for managing Mastra chat interactions
 * 
 * Handles:
 * - Message state management
 * - Streaming responses from Mastra
 * - Error handling and recovery
 * - Connection status monitoring
 */
export function useMastraChat(config: UseMastraChatConfig = {}): UseMastraChatReturn {
  const {
    debug = false,
    defaultQueryType = 'general',
  } = config;

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mastraClientRef = useRef<MastraBIClient | null>(null);
  const runtimeAdapterRef = useRef<MastraRuntimeAdapter | null>(null);
  const lastMessageRef = useRef<string>('');
  const initializedRef = useRef(false);

  // State
  const [messages, setMessages] = useState<MastraChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Get auth session for JWT token
  const session = useAuthStore(state => state.session);

  // Initialize Mastra client and runtime adapter
  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initializeMastra = async () => {
      try {
        // Get JWT token from session
        const jwtToken = session?.access_token;

        if (debug) {
          console.log('Initializing Mastra with JWT:', {
            hasSession: !!session,
            hasToken: !!jwtToken,
            tokenLength: jwtToken?.length,
          });
        }

        // Create Mastra client with JWT token
        const client = getMastraBIClient(undefined, jwtToken);
        mastraClientRef.current = client;

        // Create runtime adapter
        const adapter = createMastraRuntime({
          client,
          debug,
          defaultQueryType,
        });
        runtimeAdapterRef.current = adapter;

        // Perform health check to verify connection
        try {
          const health = await client.checkHealth();
          const connected = health.status === 'healthy';
          setIsConnected(connected);

          if (debug) {
            console.log('Mastra health check completed:', {
              status: health.status,
              connected,
              agentStatus: health.agent.status,
            });
          }
        } catch (healthError) {
          // Health check failed, but don't block initialization
          setIsConnected(false);
          
          if (debug) {
            console.warn('Mastra health check failed:', healthError);
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize Mastra chat');
        setError(error);
        setIsConnected(false);

        if (debug) {
          console.error('Failed to initialize Mastra chat:', error);
        }
      }
    };

    initializeMastra();
  }, [debug, defaultQueryType, session]);

  // Update JWT token when session changes
  useEffect(() => {
    if (mastraClientRef.current && session?.access_token) {
      mastraClientRef.current.setJwtToken(session.access_token);
      
      if (debug) {
        console.log('JWT token updated in Mastra client');
      }

      // Re-check health after token update
      mastraClientRef.current.checkHealth()
        .then(health => {
          setIsConnected(health.status === 'healthy');
          
          if (debug) {
            console.log('Health check after token update:', health.status);
          }
        })
        .catch(err => {
          setIsConnected(false);
          
          if (debug) {
            console.warn('Health check failed after token update:', err);
          }
        });
    }
  }, [session?.access_token, debug]);

  // Send message handler
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    if (!runtimeAdapterRef.current) {
      setError(new Error('Mastra runtime not initialized'));
      return;
    }

    const trimmedContent = content.trim();
    lastMessageRef.current = trimmedContent;

    // Add user message
    const userMessage: MastraChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: trimmedContent,
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsStreaming(true);
    setError(null);

    // Create assistant message placeholder
    const assistantMessageId = generateMessageId();
    const assistantMessage: MastraChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Send message with streaming
      await runtimeAdapterRef.current.sendMessage(
        trimmedContent,
        messages,
        // Stream handler - update message content as chunks arrive
        (chunk: string) => {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId
              ? { ...msg, content: msg.content + chunk }
              : msg
          ));
        },
        // Complete handler
        (fullResponse: string) => {
          setIsStreaming(false);
          setIsLoading(false);

          if (debug) {
            console.log('Streaming completed:', fullResponse);
          }
        },
        // Error handler
        (err: Error) => {
          setError(err);
          setIsStreaming(false);
          setIsLoading(false);

          // Update assistant message with error
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId
              ? { ...msg, content: `Error: ${err.message}` }
              : msg
          ));

          if (debug) {
            console.error('Streaming error:', err);
          }
        }
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send message');
      setError(error);
      setIsStreaming(false);
      setIsLoading(false);

      // Update assistant message with error
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId
          ? { ...msg, content: `Error: ${error.message}` }
          : msg
      ));

      if (debug) {
        console.error('Failed to send message:', error);
      }
    }
  }, [messages, debug]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    
    if (runtimeAdapterRef.current) {
      runtimeAdapterRef.current.startNewThread();
    }

    if (debug) {
      console.log('Messages cleared, new thread started');
    }
  }, [debug]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Retry last message
  const retry = useCallback(async () => {
    if (lastMessageRef.current) {
      await sendMessage(lastMessageRef.current);
    }
  }, [sendMessage]);

  return {
    // State
    messages,
    isLoading,
    isStreaming,
    error,
    isConnected,
    // Actions
    sendMessage,
    clearMessages,
    clearError,
    retry,
    // Refs
    inputRef,
  };
}