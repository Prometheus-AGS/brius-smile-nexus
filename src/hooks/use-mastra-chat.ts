/**
 * Custom hook for integrating with Mastra client for assistant chat functionality
 * Handles conversation management, message sending, streaming responses, and business intelligence context
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { MastraClient } from '@mastra/client-js';
import { createClient, type User } from '@supabase/supabase-js';
import type {
  UseAssistantChatReturn,
  AssistantMessage,
  AssistantThread,
  AssistantError,
  MastraClientConfig,
  SendMessageConfig,
  CreateThreadConfig,
} from '@/types/assistant';
import type { BusinessContext } from '@/types/business-intelligence';
import { 
  useChatActions, 
  createChatHistoryEntry, 
  categorizeMessage 
} from '@/stores/chat-store';

/**
 * Default configuration for Mastra client
 */
const DEFAULT_CONFIG: MastraClientConfig = {
  baseUrl: import.meta.env.VITE_MASTRA_API_URL || 'http://localhost:4111',
  retries: 3,
  backoffMs: 300,
  maxBackoffMs: 5000,
};

// Debug logging for environment configuration
console.log('🔧 Mastra Configuration Debug:', {
  VITE_MASTRA_API_URL: import.meta.env.VITE_MASTRA_API_URL,
  defaultBaseUrl: DEFAULT_CONFIG.baseUrl,
  allEnvVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
});

/**
 * Get current user from Supabase (simplified approach)
 */
const getCurrentUser = async () => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.warn('Failed to get current user:', error);
    return null;
  }
};

/**
 * Custom hook for managing assistant chat with Mastra integration
 * Enhanced with Supabase user context and persistent chat history
 */
export function useMastraChat(
  initialConfig?: MastraClientConfig
): UseAssistantChatReturn {
  // Persistent chat store integration
  const { addToHistory } = useChatActions();

  // State management
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [threads, setThreads] = useState<AssistantThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<AssistantError | null>(null);
  const [client, setClient] = useState<MastraClient | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Load current user
   */
  const loadUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.warn('Failed to load user:', error);
    }
  }, []);

  /**
   * Create business context from current user and environment
   */
  const createBusinessContext = useCallback((): BusinessContext | null => {
    if (!user) return null;

    return {
      userId: user.id,
      userRole: user.user_metadata?.role || 'user',
      companyId: user.user_metadata?.company_id,
      permissions: user.user_metadata?.permissions || [],
      preferences: {
        defaultDashboard: user.user_metadata?.default_dashboard,
        refreshInterval: user.user_metadata?.refresh_interval || 300000, // 5 minutes
        timezone: user.user_metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
  }, [user]);

  /**
   * Create an error object with consistent structure
   */
  const createError = useCallback((
    type: AssistantError['type'],
    message: string,
    details?: Record<string, unknown>
  ): AssistantError => ({
    type,
    message,
    details,
    timestamp: new Date(),
  }), []);

  /**
   * Initialize the Mastra client with business context
   */
  const initialize = useCallback(async (config?: MastraClientConfig) => {
    try {
      setIsLoading(true);
      setError(null);

      const clientConfig = { ...DEFAULT_CONFIG, ...initialConfig, ...config };
      
      // Ensure baseUrl is provided for MastraClient
      if (!clientConfig.baseUrl) {
        clientConfig.baseUrl = import.meta.env.VITE_MASTRA_API_URL || 'http://localhost:4111';
      }

      console.log('🚀 Initializing Mastra Client:', {
        baseUrl: clientConfig.baseUrl,
        config: clientConfig
      });

      const mastraClient = new MastraClient({
        baseUrl: clientConfig.baseUrl
      });
      
      setClient(mastraClient);

      // Load existing threads
      try {
        console.log('📋 Attempting to load agents...');
        const agentsList = await mastraClient.getAgents();
        console.log('✅ Agents loaded successfully:', agentsList);
        
        // Handle the response properly - getAgents might return different structure
        if (agentsList && typeof agentsList === 'object') {
          // Assume agentsList has agents array or is a single agent
          const agents = Array.isArray(agentsList) ? agentsList : [agentsList];
          
          if (agents.length > 0) {
            const firstAgent = agents[0];
            const agentId = firstAgent.id || firstAgent.name || import.meta.env.VITE_BUSINESS_INTELLIGENCE_NAME || 'business-intelligence';
            
            console.log('🤖 Using agent:', { agentId, firstAgent });
            
            try {
              console.log('🧵 Attempting to load threads for agent:', agentId);
              const threadsList = await mastraClient.getMemoryThreads({
                agentId: agentId,
                resourceId: user?.id || 'default',
              });
              console.log('✅ Threads loaded successfully:', threadsList);
              
              if (threadsList && Array.isArray(threadsList)) {
                const mappedThreads: AssistantThread[] = threadsList.map((thread) => ({
                  id: thread.id,
                  title: thread.title || 'Business Intelligence Chat',
                  createdAt: new Date(thread.createdAt || Date.now()),
                  updatedAt: new Date(thread.updatedAt || Date.now()),
                  metadata: {
                    ...thread.metadata,
                    businessContext: createBusinessContext()
                  },
                  agentId: agentId,
                }));
                setThreads(mappedThreads);
              }
            } catch (threadsError) {
              console.error('❌ Failed to load threads for agent:', {
                error: threadsError,
                agentId,
                message: threadsError instanceof Error ? threadsError.message : 'Unknown error'
              });
            }
          } else {
            console.warn('⚠️ No agents found in response');
          }
        } else {
          console.warn('⚠️ Invalid agents response structure:', agentsList);
        }
      } catch (agentsError) {
        console.error('❌ Failed to load agents:', {
          error: agentsError,
          message: agentsError instanceof Error ? agentsError.message : 'Unknown error',
          baseUrl: clientConfig.baseUrl
        });
        // Don't throw here, as this is not critical for initialization
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Mastra client';
      setError(createError('connection', errorMessage, { originalError: err }));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [initialConfig, createError, user, createBusinessContext]);

  /**
   * Create a new conversation thread with business context
   */
  const createThread = useCallback(async (config?: CreateThreadConfig): Promise<string> => {
    if (!client) {
      throw createError('connection', 'Mastra client not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get available agents
      const agentsList = await client.getAgents();
      const agents = Array.isArray(agentsList) ? agentsList : [agentsList];
      
      if (!agents || agents.length === 0) {
        throw createError('server', 'No agents available');
      }

      const firstAgent = agents[0];
      const agentId = config?.agentId || firstAgent.id || firstAgent.name || import.meta.env.VITE_BUSINESS_INTELLIGENCE_NAME || 'business-intelligence';
      const resourceId = config?.resourceId || user?.id || 'default';
      const businessContext = createBusinessContext();

      const newThread = await client.createMemoryThread({
        title: config?.title || 'Business Intelligence Chat',
        metadata: {
          ...config?.metadata,
          businessContext,
          createdBy: user?.id,
          userRole: user?.user_metadata?.role
        },
        resourceId: resourceId,
        agentId: agentId,
      });

      const thread: AssistantThread = {
        id: newThread.id,
        title: newThread.title || 'Business Intelligence Chat',
        createdAt: new Date(newThread.createdAt || Date.now()),
        updatedAt: new Date(newThread.updatedAt || Date.now()),
        metadata: newThread.metadata,
        agentId: agentId,
      };

      setThreads(prev => [thread, ...prev]);
      setCurrentThreadId(newThread.id);
      setMessages([]); // Clear messages for new thread

      return newThread.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create thread';
      const error = createError('server', errorMessage, { originalError: err });
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [client, createError, user, createBusinessContext]);

  /**
   * Switch to a different thread
   */
  const switchThread = useCallback(async (threadId: string) => {
    if (!client) {
      throw createError('connection', 'Mastra client not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Find the thread
      const thread = threads.find(t => t.id === threadId);
      if (!thread) {
        throw createError('validation', 'Thread not found');
      }

      setCurrentThreadId(threadId);
      
      // Load messages for this thread (if available)
      // Note: This would depend on Mastra's memory API for retrieving thread history
      // For now, we'll clear messages as thread history retrieval isn't implemented
      setMessages([]);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch thread';
      const error = createError('server', errorMessage, { originalError: err });
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [client, threads, createError]);

  /**
   * Delete a thread
   */
  const deleteThread = useCallback(async (threadId: string) => {
    if (!client) {
      throw createError('connection', 'Mastra client not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      const thread = threads.find(t => t.id === threadId);
      if (!thread) {
        throw createError('validation', 'Thread not found');
      }

      const threadClient = client.getMemoryThread(threadId, thread.agentId!);
      await threadClient.delete();

      setThreads(prev => prev.filter(t => t.id !== threadId));
      
      if (currentThreadId === threadId) {
        setCurrentThreadId(null);
        setMessages([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete thread';
      const error = createError('server', errorMessage, { originalError: err });
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [client, threads, currentThreadId, createError]);

  /**
   * Send a message and get response from the agent with business context
   */
  const sendMessage = useCallback(async (config: SendMessageConfig) => {
    console.log('🔍 DEBUG: useMastraChat sendMessage called:', { config });
    
    if (!client) {
      throw createError('connection', 'Mastra client not initialized');
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setIsStreaming(true);
      setError(null);
      
      console.log('🔍 DEBUG: STREAM START - Set loading and streaming states:', {
        isLoading: true,
        isStreaming: true,
        timestamp: new Date().toISOString()
      });

      let threadId = config.threadId || currentThreadId;
      
      // Create a new thread if none exists
      if (!threadId) {
        const category = categorizeMessage(config.content);
        const title = config.content.slice(0, 50) + (config.content.length > 50 ? '...' : '');
        
        threadId = await createThread({
          title,
          resourceId: config.resourceId,
          metadata: {
            category,
            firstMessage: config.content
          }
        });
      }

      // Add user message to state immediately
      const userMessage: AssistantMessage = {
        id: `user-${Date.now()}`,
        content: config.content,
        role: 'user',
        timestamp: new Date(),
        threadId: threadId,
        metadata: config.metadata,
      };

      setMessages(prev => [...prev, userMessage]);

      // Get available agents
      const agentsList = await client.getAgents();
      const agents = Array.isArray(agentsList) ? agentsList : [agentsList];
      
      if (!agents || agents.length === 0) {
        throw createError('server', 'No agents available');
      }

      const firstAgent = agents[0];
      const agentId = firstAgent.id || firstAgent.name || import.meta.env.VITE_BUSINESS_INTELLIGENCE_NAME || 'business-intelligence';
      const agent = client.getAgent(agentId);
      const businessContext = createBusinessContext();

      // Enhanced context for business intelligence
      const contextualMessages = [
        {
          role: 'system' as const,
          content: `You are a Business Intelligence Assistant for a service company. 
          
User Context:
- User ID: ${businessContext?.userId || 'unknown'}
- Role: ${businessContext?.userRole || 'user'}
- Company: ${businessContext?.companyId || 'default'}
- Timezone: ${businessContext?.preferences.timezone || 'UTC'}

You help business owners and shareholders make data-driven decisions by:
1. Analyzing order trends and performance metrics
2. Reviewing technician performance and efficiency
3. Identifying customer complaints and satisfaction issues
4. Assessing operational risks and mitigation strategies
5. Providing revenue analysis and growth insights
6. Creating actionable business recommendations

Always provide specific, actionable insights with supporting data when possible. 
Use charts, tables, and visualizations in your responses when appropriate.
Focus on business impact and ROI in your recommendations.`
        },
        {
          role: 'user' as const,
          content: config.content,
        },
      ];

      // Send message to agent and stream response
      const response = await agent.stream({
        messages: contextualMessages,
        threadId: threadId,
        resourceId: config.resourceId || user?.id || 'default',
      });

      // Create assistant message placeholder
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: AssistantMessage = {
        id: assistantMessageId,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        threadId: threadId,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Process streaming response
      let fullContent = '';
      let streamStarted = false;
      console.log('🔍 DEBUG: STREAM PROCESSING - Starting stream processing in useMastraChat');
      
      response.processDataStream({
        onTextPart: (text: string) => {
          if (!streamStarted) {
            streamStarted = true;
            console.log('🔍 DEBUG: STREAM FIRST CHUNK - First text chunk received, streaming officially started');
          }
          console.log('🔍 DEBUG: STREAM CHUNK - Received text part:', {
            text,
            textLength: text.length,
            fullContentLength: fullContent.length,
            timestamp: new Date().toISOString()
          });
          fullContent += text;
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullContent }
                : msg
            )
          );
        },
        onFilePart: (file: unknown) => {
          console.log('File received:', file);
        },
        onDataPart: (data: unknown) => {
          console.log('Data received:', data);
        },
        onErrorPart: (error: unknown) => {
          console.error('Stream error:', error);
          setError(createError('server', 'Streaming error occurred'));
        },
      });

      // Add to chat history after successful completion
      const category = categorizeMessage(config.content);
      const thread = threads.find(t => t.id === threadId);
      if (thread) {
        const historyEntry = createChatHistoryEntry(
          threadId,
          thread.title,
          config.content,
          messages.length + 2, // +2 for user and assistant messages
          category
        );
        addToHistory(historyEntry);
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled, don't set error
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      const error = createError('server', errorMessage, { originalError: err });
      setError(error);
      throw error;
    } finally {
      console.log('🔍 DEBUG: STREAM END - Cleaning up streaming states:', {
        timestamp: new Date().toISOString()
      });
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [client, currentThreadId, createThread, createError, user, createBusinessContext, threads, messages.length, addToHistory]);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Auto-initialize on mount when user is available
  useEffect(() => {
    if (!client && user) {
      initialize().catch(console.error);
    }
  }, [client, initialize, user]);

  return {
    // State
    messages,
    threads,
    currentThreadId,
    isLoading,
    isStreaming,
    error,
    client,
    
    // Actions
    sendMessage,
    createThread,
    switchThread,
    deleteThread,
    clearError,
    initialize,
  };
}