/**
 * Enhanced Mastra Chat Hook with Comprehensive Langfuse Integration
 * 
 * This hook extends the original useMastraChat with full Langfuse observability,
 * providing automatic tracking of all BI assistant interactions, performance monitoring,
 * error tracking, and business intelligence context enrichment.
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
import type {
  BIObservabilityContext,
  BIQueryType,
} from '@/types/langfuse';
import { 
  useChatActions, 
  createChatHistoryEntry, 
  categorizeMessage 
} from '@/stores/chat-store';
import { useBIObservability, useLangfuse } from './use-langfuse';

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
 * Enhanced hook for managing assistant chat with Mastra integration and Langfuse observability
 * Provides comprehensive tracking of all BI assistant interactions
 */
export function useMastraChatWithLangfuse(
  initialConfig?: MastraClientConfig
): UseAssistantChatReturn {
  // Langfuse integration
  const { isEnabled: langfuseEnabled } = useLangfuse();
  const {
    startBITrace,
    endBITrace,
    trackBIQuery,
    trackToolUsage,
    measureQueryPerformance,
    handleBIError,
  } = useBIObservability();

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

  // Refs for cleanup and tracking
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeTraces = useRef(new Map<string, string>()); // threadId -> traceId mapping

  /**
   * Load current user with Langfuse tracking
   */
  const loadUser = useCallback(async () => {
    const traceId = await startBITrace(
      'load-user',
      'custom_query',
      undefined,
      {
        queryType: 'custom_query',
        businessContext: {
          useCase: 'user_authentication',
          department: 'system',
          priority: 'medium',
        },
      }
    );

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      await endBITrace(traceId, {
        success: true,
        userId: currentUser?.id,
        userRole: currentUser?.user_metadata?.role,
      });
    } catch (error) {
      console.warn('Failed to load user:', error);
      await handleBIError(error as Error, traceId, {
        queryType: 'custom_query',
        severity: 'medium',
      });
    }
  }, [startBITrace, endBITrace, handleBIError]);

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
   * Create BI observability context from business context
   */
  const createBIObservabilityContext = useCallback((
    queryType: BIQueryType,
    additionalContext?: Partial<BIObservabilityContext>
  ): BIObservabilityContext => {
    const businessContext = createBusinessContext();
    
    return {
      queryType,
      dataSource: additionalContext?.dataSource || 'mastra_chat',
      businessContext: {
        department: businessContext?.userRole || 'general',
        useCase: additionalContext?.businessContext?.useCase || 'chat_interaction',
        priority: additionalContext?.businessContext?.priority || 'medium',
      },
      ...additionalContext,
    };
  }, [createBusinessContext]);

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
   * Initialize the Mastra client with business context and Langfuse tracking
   */
  const initialize = useCallback(async (config?: MastraClientConfig) => {
    const traceId = await startBITrace(
      'initialize-mastra-client',
      'custom_query',
      { config: { ...DEFAULT_CONFIG, ...initialConfig, ...config } },
      createBIObservabilityContext('custom_query', {
        businessContext: {
          useCase: 'client_initialization',
          department: 'system',
          priority: 'high',
        },
      })
    );

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

      // Load existing threads with performance tracking
      await measureQueryPerformance(async () => {
        try {
          console.log('📋 Attempting to load agents...');
          const agentsList = await mastraClient.getAgents();
          console.log('✅ Agents loaded successfully:', agentsList);
          
          await trackBIQuery(
            traceId,
            'custom_query',
            { operation: 'load_agents' },
            { agents: agentsList },
            createBIObservabilityContext('custom_query', {
              businessContext: {
                useCase: 'load_agents',
                department: 'system',
                priority: 'medium',
              },
            })
          );
          
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
                
                await trackBIQuery(
                  traceId,
                  'custom_query',
                  { operation: 'load_threads', agentId },
                  { threads: threadsList },
                  createBIObservabilityContext('custom_query', {
                    businessContext: {
                      useCase: 'load_threads',
                      department: 'system',
                      priority: 'medium',
                    },
                  })
                );
                
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
                
                await handleBIError(threadsError as Error, traceId, {
                  queryType: 'custom_query',
                  severity: 'medium',
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
          
          await handleBIError(agentsError as Error, traceId, {
            queryType: 'custom_query',
            severity: 'high',
          });
          // Don't throw here, as this is not critical for initialization
        }
      }, 'load-agents-and-threads', traceId, 'custom_query');

      await endBITrace(traceId, {
        success: true,
        clientConfig,
        threadsCount: threads.length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Mastra client';
      setError(createError('connection', errorMessage, { originalError: err }));
      
      await handleBIError(err as Error, traceId, {
        queryType: 'custom_query',
        severity: 'critical',
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [
    initialConfig, 
    createError, 
    user, 
    createBusinessContext, 
    createBIObservabilityContext,
    startBITrace,
    endBITrace,
    trackBIQuery,
    measureQueryPerformance,
    handleBIError,
    threads.length
  ]);

  /**
   * Create a new conversation thread with business context and Langfuse tracking
   */
  const createThread = useCallback(async (config?: CreateThreadConfig): Promise<string> => {
    if (!client) {
      throw createError('connection', 'Mastra client not initialized');
    }

    const traceId = await startBITrace(
      'create-thread',
      'custom_query',
      { config },
      createBIObservabilityContext('custom_query', {
        businessContext: {
          useCase: 'create_thread',
          department: 'chat',
          priority: 'medium',
        },
      })
    );

    try {
      setIsLoading(true);
      setError(null);

      // Get available agents with tracking
      const agentsList = await measureQueryPerformance(
        () => client.getAgents(),
        'get-agents',
        traceId,
        'custom_query'
      );
      
      const agents = Array.isArray(agentsList) ? agentsList : [agentsList];
      
      if (!agents || agents.length === 0) {
        throw createError('server', 'No agents available');
      }

      const firstAgent = agents[0];
      const agentId = config?.agentId || firstAgent.id || firstAgent.name || import.meta.env.VITE_BUSINESS_INTELLIGENCE_NAME || 'business-intelligence';
      const resourceId = config?.resourceId || user?.id || 'default';
      const businessContext = createBusinessContext();

      const newThread = await measureQueryPerformance(
        () => client.createMemoryThread({
          title: config?.title || 'Business Intelligence Chat',
          metadata: {
            ...config?.metadata,
            businessContext,
            createdBy: user?.id,
            userRole: user?.user_metadata?.role
          },
          resourceId: resourceId,
          agentId: agentId,
        }),
        'create-memory-thread',
        traceId,
        'custom_query'
      );

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

      // Track the thread creation
      await trackBIQuery(
        traceId,
        'custom_query',
        { operation: 'create_thread', agentId, resourceId },
        { thread, threadId: newThread.id },
        createBIObservabilityContext('custom_query', {
          businessContext: {
            useCase: 'create_thread',
            department: 'chat',
            priority: 'medium',
          },
        })
      );

      // Store trace ID for this thread
      activeTraces.current.set(newThread.id, traceId);

      await endBITrace(traceId, {
        success: true,
        threadId: newThread.id,
        agentId,
        resourceId,
      });

      return newThread.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create thread';
      const error = createError('server', errorMessage, { originalError: err });
      setError(error);
      
      await handleBIError(err as Error, traceId, {
        queryType: 'custom_query',
        severity: 'high',
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [
    client, 
    createError, 
    user, 
    createBusinessContext, 
    createBIObservabilityContext,
    startBITrace,
    endBITrace,
    trackBIQuery,
    measureQueryPerformance,
    handleBIError
  ]);

  /**
   * Switch to a different thread with Langfuse tracking
   */
  const switchThread = useCallback(async (threadId: string) => {
    if (!client) {
      throw createError('connection', 'Mastra client not initialized');
    }

    const traceId = await startBITrace(
      'switch-thread',
      'custom_query',
      { threadId },
      createBIObservabilityContext('custom_query', {
        businessContext: {
          useCase: 'switch_thread',
          department: 'chat',
          priority: 'low',
        },
      })
    );

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

      await trackBIQuery(
        traceId,
        'custom_query',
        { operation: 'switch_thread', threadId },
        { success: true, thread },
        createBIObservabilityContext('custom_query', {
          businessContext: {
            useCase: 'switch_thread',
            department: 'chat',
            priority: 'low',
          },
        })
      );

      await endBITrace(traceId, {
        success: true,
        threadId,
        threadTitle: thread.title,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch thread';
      const error = createError('server', errorMessage, { originalError: err });
      setError(error);
      
      await handleBIError(err as Error, traceId, {
        queryType: 'custom_query',
        severity: 'medium',
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [
    client, 
    threads, 
    createError, 
    createBIObservabilityContext,
    startBITrace,
    endBITrace,
    trackBIQuery,
    handleBIError
  ]);

  /**
   * Delete a thread with Langfuse tracking
   */
  const deleteThread = useCallback(async (threadId: string) => {
    if (!client) {
      throw createError('connection', 'Mastra client not initialized');
    }

    const traceId = await startBITrace(
      'delete-thread',
      'custom_query',
      { threadId },
      createBIObservabilityContext('custom_query', {
        businessContext: {
          useCase: 'delete_thread',
          department: 'chat',
          priority: 'medium',
        },
      })
    );

    try {
      setIsLoading(true);
      setError(null);

      const thread = threads.find(t => t.id === threadId);
      if (!thread) {
        throw createError('validation', 'Thread not found');
      }

      const threadClient = client.getMemoryThread(threadId, thread.agentId!);
      await measureQueryPerformance(
        () => threadClient.delete(),
        'delete-memory-thread',
        traceId,
        'custom_query'
      );

      setThreads(prev => prev.filter(t => t.id !== threadId));
      
      if (currentThreadId === threadId) {
        setCurrentThreadId(null);
        setMessages([]);
      }

      // Clean up active trace for this thread
      activeTraces.current.delete(threadId);

      await trackBIQuery(
        traceId,
        'custom_query',
        { operation: 'delete_thread', threadId },
        { success: true, deletedThread: thread },
        createBIObservabilityContext('custom_query', {
          businessContext: {
            useCase: 'delete_thread',
            department: 'chat',
            priority: 'medium',
          },
        })
      );

      await endBITrace(traceId, {
        success: true,
        threadId,
        threadTitle: thread.title,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete thread';
      const error = createError('server', errorMessage, { originalError: err });
      setError(error);
      
      await handleBIError(err as Error, traceId, {
        queryType: 'custom_query',
        severity: 'medium',
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [
    client, 
    threads, 
    currentThreadId, 
    createError,
    createBIObservabilityContext,
    startBITrace,
    endBITrace,
    trackBIQuery,
    measureQueryPerformance,
    handleBIError
  ]);

  /**
   * Send a message and get response from the agent with comprehensive Langfuse tracking
   */
  const sendMessage = useCallback(async (config: SendMessageConfig) => {
    if (!client) {
      throw createError('connection', 'Mastra client not initialized');
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Determine query type based on message content
    const category = categorizeMessage(config.content);
    const queryType: BIQueryType = category === 'general' ? 'data_analysis' : 
                                  category === 'support' ? 'custom_query' :
                                  'custom_query';

    const traceId = await startBITrace(
      'send-message',
      queryType,
      { 
        message: config.content,
        threadId: config.threadId || currentThreadId,
        category 
      },
      createBIObservabilityContext(queryType, {
        businessContext: {
          useCase: 'send_message',
          department: 'chat',
          priority: 'high',
        },
      })
    );

    try {
      setIsLoading(true);
      setIsStreaming(true);
      setError(null);

      let threadId = config.threadId || currentThreadId;
      
      // Create a new thread if none exists
      if (!threadId) {
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

      // Store trace ID for this thread
      activeTraces.current.set(threadId, traceId);

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

      // Track user message
      await trackBIQuery(
        traceId,
        queryType,
        { 
          operation: 'user_message',
          message: config.content,
          messageId: userMessage.id 
        },
        { userMessage },
        createBIObservabilityContext(queryType, {
          businessContext: {
            useCase: 'user_message',
            department: 'chat',
            priority: 'medium',
          },
        })
      );

      // Get available agents with performance tracking
      const agentsList = await measureQueryPerformance(
        () => client.getAgents(),
        'get-agents-for-message',
        traceId,
        queryType
      );
      
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

      // Track agent interaction start
      const agentSpanId = await trackBIQuery(
        traceId,
        queryType,
        { 
          operation: 'agent_interaction_start',
          agentId,
          contextualMessages 
        },
        undefined,
        createBIObservabilityContext(queryType, {
          businessContext: {
            useCase: 'agent_interaction',
            department: 'chat',
            priority: 'high',
          },
        })
      );

      // Send message to agent and stream response with performance tracking
      const response = await measureQueryPerformance(
        () => agent.stream({
          messages: contextualMessages,
          threadId: threadId,
          resourceId: config.resourceId || user?.id || 'default',
        }),
        'agent-stream-response',
        traceId,
        queryType
      );

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

      // Process streaming response with tracking
      let fullContent = '';
      const streamStartTime = Date.now();
      
      response.processDataStream({
        onTextPart: (text: string) => {
          fullContent += text;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: fullContent }
                : msg
            )
          );
        },
        onFilePart: async (file: unknown) => {
          console.log('File received:', file);
          await trackToolUsage(
            traceId,
            'file-processing',
            { file },
            { processed: true },
            agentSpanId
          );
        },
        onDataPart: async (data: unknown) => {
          console.log('Data received:', data);
          await trackToolUsage(
            traceId,
            'data-processing',
            { data },
            { processed: true },
            agentSpanId
          );
        },
        onErrorPart: async (error: unknown) => {
          console.error('Stream error:', error);
          setError(createError('server', 'Streaming error occurred'));
          await handleBIError(error as Error, traceId, {
            queryType,
            severity: 'high',
            parentId: agentSpanId,
          });
        },
      });

      // Track streaming completion
      const streamDuration = Date.now() - streamStartTime;
      await trackBIQuery(
        traceId,
        queryType,
        { 
          operation: 'agent_response_complete',
          streamDuration,
          responseLength: fullContent.length 
        },
        { 
          assistantMessage: { ...assistantMessage, content: fullContent },
          performance: {
            streamDuration,
            responseLength: fullContent.length,
            wordsPerSecond: fullContent.split(' ').length / (streamDuration / 1000)
          }
        },
        createBIObservabilityContext(queryType, {
          businessContext: {
            useCase: 'agent_response',
            department: 'chat',
            priority: 'high',
          },
        })
      );

      // Add to chat history after successful completion
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

      await endBITrace(traceId, {
        success: true,
        threadId,
        messagesSent: 2, // user + assistant
        responseLength: fullContent.length,
        streamDuration,
        category,
        queryType,
      });

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled, don't set error
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      const error = createError('server', errorMessage, { originalError: err });
      setError(error);
      
      await handleBIError(err as Error, traceId, {
        queryType,
        severity: 'high',
      });
      
      throw error;
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [
    client,
    currentThreadId,
    createThread,
    createError,
    user,
    createBusinessContext,
    createBIObservabilityContext,
    threads,
    messages.length,
    addToHistory,
    startBITrace,
    endBITrace,
    trackBIQuery,
    trackToolUsage,
    measureQueryPerformance,
    handleBIError
  ]);

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
      
      // End any active traces
      if (langfuseEnabled && activeTraces.current.size > 0) {
        Promise.all(
          Array.from(activeTraces.current.values()).map(traceId =>
            endBITrace(traceId, { cleanup: true }).catch(console.error)
          )
        ).catch(console.error);
        activeTraces.current.clear();
      }
    };
  }, [langfuseEnabled, endBITrace]);

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