/**
 * Business Intelligence Assistant Store
 * Comprehensive Zustand store for managing BI assistant state with proper separation of concerns
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { MastraClient } from '@mastra/client-js';
import type {
  BIAssistantStore,
  BIAssistantState,
  BIAssistantActions,
  BIAssistantStoreConfig,
  StreamingState,
  UIState,
  ConnectionState,
  ThreadState,
  MessageState,
  ConfigState
} from '@/types/bi-assistant';
import type {
  BIMessage,
  BIThread,
  BusinessIntelligenceContext,
  BISendMessageConfig,
  BIRuntimeConfig,
  AssistantError,
  MastraClientConfig
} from '@/types/assistant';
import { usePersistentChatStore, createChatHistoryEntry, categorizeMessage } from './chat-store';

/**
 * Default store configuration
 */
const DEFAULT_CONFIG: BIAssistantStoreConfig = {
  enablePersistence: true,
  enableEventLogging: true,
  maxRetries: 3,
  retryDelay: 1000,
  maxThreadHistory: 10,
  maxMessageHistory: 100,
  autoReconnect: true,
  debugMode: false
};

/**
 * Initial streaming state
 */
const initialStreamingState: StreamingState = {
  isStreaming: false,
  currentMessageId: null,
  streamingContent: '',
  streamingRole: 'assistant',
  error: null
};

/**
 * Initial UI state
 */
const initialUIState: UIState = {
  isLoading: false,
  isInitializing: false,
  isProcessing: false,
  showWelcome: true,
  inputDisabled: false,
  lastActivity: null
};

/**
 * Initial connection state
 */
const initialConnectionState: ConnectionState = {
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  lastConnectionAttempt: null,
  retryCount: 0,
  maxRetries: DEFAULT_CONFIG.maxRetries
};

/**
 * Initial thread state
 */
const initialThreadState: ThreadState = {
  threads: [],
  currentThreadId: null,
  currentThread: null,
  threadHistory: [],
  maxThreadHistory: DEFAULT_CONFIG.maxThreadHistory
};

/**
 * Initial message state
 */
const initialMessageState: MessageState = {
  messages: [],
  messageHistory: new Map(),
  pendingMessage: null,
  lastMessageId: null
};

/**
 * Initial config state
 */
const initialConfigState: ConfigState = {
  mastraConfig: {
    baseUrl: process.env.VITE_MASTRA_BASE_URL || 'http://localhost:4000',
    retries: 3,
    backoffMs: 1000,
    maxBackoffMs: 10000
  },
  runtimeConfig: {},
  businessContext: null,
  agentId: null,
  resourceId: null
};

/**
 * Initial store state
 */
const initialState: BIAssistantState = {
  streaming: initialStreamingState,
  ui: initialUIState,
  connection: initialConnectionState,
  threads: initialThreadState,
  messages: initialMessageState,
  config: initialConfigState,
  client: null,
  error: null,
  initialized: false,
  version: '1.0.0'
};

/**
 * Utility function to generate unique IDs
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Utility function to create error objects
 */
const createError = (
  type: AssistantError['type'],
  message: string,
  details?: Record<string, unknown>
): AssistantError => ({
  type,
  message,
  details,
  timestamp: new Date()
});

/**
 * Create the BI Assistant store
 */
export const useBIAssistantStore = create<BIAssistantStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    actions: {
      // Streaming actions
      streaming: {
        startStreaming: (messageId: string, role: 'user' | 'assistant') => {
          set(state => ({
            streaming: {
              ...state.streaming,
              isStreaming: true,
              currentMessageId: messageId,
              streamingContent: '',
              streamingRole: role,
              error: null
            },
            ui: {
              ...state.ui,
              isProcessing: true,
              inputDisabled: true,
              lastActivity: new Date()
            }
          }));
        },

        updateStreamingContent: (content: string) => {
          set(state => ({
            streaming: {
              ...state.streaming,
              streamingContent: content
            }
          }));
        },

        finishStreaming: () => {
          const state = get();
          const { streaming, messages } = state;
          
          if (streaming.currentMessageId && streaming.streamingContent) {
            // Update the message with final content
            const updatedMessages = messages.messages.map(msg =>
              msg.id === streaming.currentMessageId
                ? { ...msg, content: streaming.streamingContent }
                : msg
            );

            set(state => ({
              streaming: {
                ...initialStreamingState
              },
              ui: {
                ...state.ui,
                isProcessing: false,
                inputDisabled: false,
                lastActivity: new Date()
              },
              messages: {
                ...state.messages,
                messages: updatedMessages
              }
            }));
          } else {
            set(state => ({
              streaming: {
                ...initialStreamingState
              },
              ui: {
                ...state.ui,
                isProcessing: false,
                inputDisabled: false
              }
            }));
          }
        },

        setStreamingError: (error: string | null) => {
          set(state => ({
            streaming: {
              ...state.streaming,
              error
            }
          }));
        },

        resetStreaming: () => {
          set(state => ({
            streaming: {
              ...initialStreamingState
            },
            ui: {
              ...state.ui,
              isProcessing: false,
              inputDisabled: false
            }
          }));
        }
      },

      // UI actions
      ui: {
        setLoading: (loading: boolean) => {
          set(state => ({
            ui: {
              ...state.ui,
              isLoading: loading,
              lastActivity: new Date()
            }
          }));
        },

        setProcessing: (processing: boolean) => {
          set(state => ({
            ui: {
              ...state.ui,
              isProcessing: processing,
              inputDisabled: processing,
              lastActivity: new Date()
            }
          }));
        },

        setInputDisabled: (disabled: boolean) => {
          set(state => ({
            ui: {
              ...state.ui,
              inputDisabled: disabled
            }
          }));
        },

        showWelcomeScreen: () => {
          set(state => ({
            ui: {
              ...state.ui,
              showWelcome: true
            }
          }));
        },

        hideWelcomeScreen: () => {
          set(state => ({
            ui: {
              ...state.ui,
              showWelcome: false
            }
          }));
        },

        updateLastActivity: () => {
          set(state => ({
            ui: {
              ...state.ui,
              lastActivity: new Date()
            }
          }));
        },

        resetUI: () => {
          set(state => ({
            ui: {
              ...initialUIState
            }
          }));
        }
      },

      // Connection actions
      connection: {
        connect: async () => {
          const state = get();
          
          set(state => ({
            connection: {
              ...state.connection,
              isConnecting: true,
              connectionError: null,
              lastConnectionAttempt: new Date()
            }
          }));

          try {
            const client = new MastraClient({
              ...state.config.mastraConfig,
              baseUrl: state.config.mastraConfig.baseUrl || 'http://localhost:4000'
            });
            
            // Test connection
            await new Promise(resolve => setTimeout(resolve, 100));
            
            set(state => ({
              client,
              connection: {
                ...state.connection,
                isConnected: true,
                isConnecting: false,
                connectionError: null,
                retryCount: 0
              }
            }));
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Connection failed';
            
            set(state => ({
              connection: {
                ...state.connection,
                isConnected: false,
                isConnecting: false,
                connectionError: errorMessage,
                retryCount: state.connection.retryCount + 1
              },
              error: createError('connection', errorMessage, { error })
            }));
          }
        },

        disconnect: () => {
          set(state => ({
            client: null,
            connection: {
              ...state.connection,
              isConnected: false,
              isConnecting: false,
              connectionError: null
            }
          }));
        },

        reconnect: async () => {
          const { actions } = get();
          actions.connection.disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000));
          await actions.connection.connect();
        },

        setConnectionError: (error: string | null) => {
          set(state => ({
            connection: {
              ...state.connection,
              connectionError: error
            }
          }));
        },

        resetConnection: () => {
          set(state => ({
            connection: {
              ...initialConnectionState
            }
          }));
        },

        incrementRetryCount: () => {
          set(state => ({
            connection: {
              ...state.connection,
              retryCount: state.connection.retryCount + 1
            }
          }));
        },

        resetRetryCount: () => {
          set(state => ({
            connection: {
              ...state.connection,
              retryCount: 0
            }
          }));
        }
      },

      // Thread actions
      threads: {
        createThread: async (config?: Partial<BIThread>): Promise<string> => {
          const threadId = generateId();
          const now = new Date();
          
          const newThread: BIThread = {
            id: threadId,
            title: config?.title || 'New Conversation',
            createdAt: now,
            updatedAt: now,
            metadata: config?.metadata || {},
            agentId: config?.agentId || get().config.agentId || undefined,
            businessDomain: config?.businessDomain,
            analysisType: config?.analysisType,
            lastInsight: config?.lastInsight
          };

          set(state => ({
            threads: {
              ...state.threads,
              threads: [newThread, ...state.threads.threads],
              currentThreadId: threadId,
              currentThread: newThread,
              threadHistory: [threadId, ...state.threads.threadHistory.slice(0, state.threads.maxThreadHistory - 1)]
            },
            messages: {
              ...state.messages,
              messages: []
            },
            ui: {
              ...state.ui,
              showWelcome: false
            }
          }));

          return threadId;
        },

        switchThread: async (threadId: string) => {
          const state = get();
          const thread = state.threads.threads.find(t => t.id === threadId);
          
          if (!thread) {
            throw new Error(`Thread ${threadId} not found`);
          }

          // Load messages for this thread
          const threadMessages = state.messages.messageHistory.get(threadId) || [];

          set(state => ({
            threads: {
              ...state.threads,
              currentThreadId: threadId,
              currentThread: thread,
              threadHistory: [threadId, ...state.threads.threadHistory.filter(id => id !== threadId).slice(0, state.threads.maxThreadHistory - 1)]
            },
            messages: {
              ...state.messages,
              messages: threadMessages
            },
            ui: {
              ...state.ui,
              showWelcome: threadMessages.length === 0
            }
          }));
        },

        deleteThread: async (threadId: string) => {
          set(state => {
            const updatedThreads = state.threads.threads.filter(t => t.id !== threadId);
            const updatedHistory = state.threads.threadHistory.filter(id => id !== threadId);
            const updatedMessageHistory = new Map(state.messages.messageHistory);
            updatedMessageHistory.delete(threadId);

            // If deleting current thread, switch to most recent or create new
            let newCurrentThreadId = state.threads.currentThreadId;
            let newCurrentThread = state.threads.currentThread;
            let newMessages = state.messages.messages;

            if (state.threads.currentThreadId === threadId) {
              if (updatedHistory.length > 0) {
                const nextThreadId = updatedHistory[0];
                newCurrentThreadId = nextThreadId;
                newCurrentThread = updatedThreads.find(t => t.id === nextThreadId) || null;
                newMessages = updatedMessageHistory.get(nextThreadId) || [];
              } else {
                newCurrentThreadId = null;
                newCurrentThread = null;
                newMessages = [];
              }
            }

            return {
              threads: {
                ...state.threads,
                threads: updatedThreads,
                currentThreadId: newCurrentThreadId,
                currentThread: newCurrentThread,
                threadHistory: updatedHistory
              },
              messages: {
                ...state.messages,
                messages: newMessages,
                messageHistory: updatedMessageHistory
              },
              ui: {
                ...state.ui,
                showWelcome: newMessages.length === 0
              }
            };
          });
        },

        updateThread: (threadId: string, updates: Partial<BIThread>) => {
          set(state => {
            const updatedThreads = state.threads.threads.map(thread =>
              thread.id === threadId
                ? { ...thread, ...updates, updatedAt: new Date() }
                : thread
            );

            const updatedCurrentThread = state.threads.currentThreadId === threadId
              ? updatedThreads.find(t => t.id === threadId) || state.threads.currentThread
              : state.threads.currentThread;

            return {
              threads: {
                ...state.threads,
                threads: updatedThreads,
                currentThread: updatedCurrentThread
              }
            };
          });
        },

        loadThreads: async () => {
          // In a real implementation, this would load from backend
          // For now, threads are managed in memory
          set(state => ({
            ui: {
              ...state.ui,
              isLoading: false
            }
          }));
        },

        clearThreadHistory: () => {
          set(state => ({
            threads: {
              ...state.threads,
              threadHistory: []
            }
          }));
        },

        addToThreadHistory: (threadId: string) => {
          set(state => ({
            threads: {
              ...state.threads,
              threadHistory: [threadId, ...state.threads.threadHistory.filter(id => id !== threadId).slice(0, state.threads.maxThreadHistory - 1)]
            }
          }));
        }
      },

      // Message actions
      messages: {
        sendMessage: async (config: BISendMessageConfig) => {
          const state = get();
          const { client, threads, actions } = state;

          if (!client) {
            throw createError('connection', 'No client connection available');
          }

          // Ensure we have a current thread
          let currentThreadId = threads.currentThreadId;
          if (!currentThreadId) {
            currentThreadId = await actions.threads.createThread({
              title: config.content.substring(0, 50) + (config.content.length > 50 ? '...' : '')
            });
          }

          // Create user message
          const userMessageId = generateId();
          const userMessage: BIMessage = {
            id: userMessageId,
            content: config.content,
            role: 'user',
            timestamp: new Date(),
            threadId: currentThreadId,
            metadata: config.metadata,
            type: 'query'
          };

          // Add user message
          actions.messages.addMessage(userMessage);

          // Create assistant message placeholder
          const assistantMessageId = generateId();
          const assistantMessage: BIMessage = {
            id: assistantMessageId,
            content: '',
            role: 'assistant',
            timestamp: new Date(),
            threadId: currentThreadId,
            type: 'insight'
          };

          // Add assistant message and start streaming
          actions.messages.addMessage(assistantMessage);
          actions.streaming.startStreaming(assistantMessageId, 'assistant');

          try {
            // Get the agent instance using correct Mastra API
            const agentId = state.config.agentId || 'default';
            const agent = client.getAgent(agentId);

            // Use the stream method for real-time streaming
            const stream = await agent.stream({
              messages: [
                {
                  role: 'user',
                  content: config.content
                }
              ],
              resourceId: config.resourceId || state.config.resourceId
            });

            let accumulatedContent = '';

            // Process the stream
            await stream.processDataStream({
              onTextPart: (text: string) => {
                accumulatedContent += text;
                actions.streaming.updateStreamingContent(accumulatedContent);
              }
            });

            actions.streaming.finishStreaming();

            // Update thread title if it's the first message
            const currentState = get();
            if (currentState.messages.messages.filter(m => m.threadId === currentThreadId).length === 2) {
              actions.threads.updateThread(currentThreadId, {
                title: config.content.substring(0, 50) + (config.content.length > 50 ? '...' : '')
              });
            }

            // Save to persistent chat store
            if (DEFAULT_CONFIG.enablePersistence) {
              const persistentStore = usePersistentChatStore.getState();
              const category = categorizeMessage(config.content);
              const historyEntry = createChatHistoryEntry(
                currentThreadId,
                currentState.threads.currentThread?.title || 'New Conversation',
                accumulatedContent.trim(),
                currentState.messages.messages.filter(m => m.threadId === currentThreadId).length,
                category
              );
              persistentStore.addToHistory(historyEntry);
            }

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
            actions.streaming.setStreamingError(errorMessage);
            actions.global.setError(createError('server', errorMessage, { error }));
          }
        },

        addMessage: (message: BIMessage) => {
          set(state => {
            const updatedMessages = [...state.messages.messages, message];
            const threadId = message.threadId || state.threads.currentThreadId;
            
            if (threadId) {
              const updatedHistory = new Map(state.messages.messageHistory);
              const threadMessages = updatedHistory.get(threadId) || [];
              updatedHistory.set(threadId, [...threadMessages, message]);

              return {
                messages: {
                  ...state.messages,
                  messages: updatedMessages,
                  messageHistory: updatedHistory,
                  lastMessageId: message.id
                }
              };
            }

            return {
              messages: {
                ...state.messages,
                messages: updatedMessages,
                lastMessageId: message.id
              }
            };
          });
        },

        updateMessage: (messageId: string, updates: Partial<BIMessage>) => {
          set(state => {
            const updatedMessages = state.messages.messages.map(msg =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            );

            // Update in history as well
            const updatedHistory = new Map(state.messages.messageHistory);
            for (const [threadId, messages] of updatedHistory.entries()) {
              const updatedThreadMessages = messages.map(msg =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              );
              updatedHistory.set(threadId, updatedThreadMessages);
            }

            return {
              messages: {
                ...state.messages,
                messages: updatedMessages,
                messageHistory: updatedHistory
              }
            };
          });
        },

        deleteMessage: (messageId: string) => {
          set(state => {
            const updatedMessages = state.messages.messages.filter(msg => msg.id !== messageId);
            
            // Update in history as well
            const updatedHistory = new Map(state.messages.messageHistory);
            for (const [threadId, messages] of updatedHistory.entries()) {
              const updatedThreadMessages = messages.filter(msg => msg.id !== messageId);
              updatedHistory.set(threadId, updatedThreadMessages);
            }

            return {
              messages: {
                ...state.messages,
                messages: updatedMessages,
                messageHistory: updatedHistory
              }
            };
          });
        },

        clearMessages: () => {
          set(state => ({
            messages: {
              ...initialMessageState
            }
          }));
        },

        loadMessageHistory: async (threadId: string) => {
          const state = get();
          const messages = state.messages.messageHistory.get(threadId) || [];
          
          set(state => ({
            messages: {
              ...state.messages,
              messages
            }
          }));
        },

        setPendingMessage: (message: BIMessage | null) => {
          set(state => ({
            messages: {
              ...state.messages,
              pendingMessage: message
            }
          }));
        }
      },

      // Config actions
      config: {
        initialize: async (config?: BIRuntimeConfig) => {
          set(state => ({
            ui: {
              ...state.ui,
              isInitializing: true
            }
          }));

          try {
            if (config) {
              set(state => ({
                config: {
                  ...state.config,
                  runtimeConfig: { ...state.config.runtimeConfig, ...config },
                  agentId: config.agentId || state.config.agentId,
                  resourceId: config.resourceId || state.config.resourceId,
                  businessContext: config.businessContext || state.config.businessContext
                }
              }));
            }

            // Initialize connection
            await get().actions.connection.connect();

            set(state => ({
              initialized: true,
              ui: {
                ...state.ui,
                isInitializing: false
              }
            }));
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
            set(state => ({
              ui: {
                ...state.ui,
                isInitializing: false
              },
              error: createError('unknown', errorMessage, { error })
            }));
          }
        },

        updateMastraConfig: (config: Partial<MastraClientConfig>) => {
          set(state => ({
            config: {
              ...state.config,
              mastraConfig: { ...state.config.mastraConfig, ...config }
            }
          }));
        },

        updateRuntimeConfig: (config: Partial<BIRuntimeConfig>) => {
          set(state => ({
            config: {
              ...state.config,
              runtimeConfig: { ...state.config.runtimeConfig, ...config }
            }
          }));
        },

        setBusinessContext: (context: BusinessIntelligenceContext | null) => {
          set(state => ({
            config: {
              ...state.config,
              businessContext: context
            }
          }));
        },

        setAgentId: (agentId: string | null) => {
          set(state => ({
            config: {
              ...state.config,
              agentId
            }
          }));
        },

        setResourceId: (resourceId: string | null) => {
          set(state => ({
            config: {
              ...state.config,
              resourceId
            }
          }));
        }
      },

      // Global actions
      global: {
        setError: (error: AssistantError | null) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },

        reset: () => {
          set({
            ...initialState,
            actions: get().actions
          });
        },

        cleanup: () => {
          const { actions } = get();
          actions.connection.disconnect();
          actions.global.reset();
        }
      }
    }
  }))
);

/**
 * Store event subscription for debugging and logging
 */
if (DEFAULT_CONFIG.enableEventLogging) {
  useBIAssistantStore.subscribe(
    (state) => state,
    (state, prevState) => {
      if (DEFAULT_CONFIG.debugMode) {
        console.log('BI Assistant Store State Change:', {
          prev: prevState,
          current: state,
          timestamp: new Date()
        });
      }
    }
  );
}