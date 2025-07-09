import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { MastraClient } from '@mastra/client-js';
import { createClient } from '@supabase/supabase-js';
import { getLangfuseConfig } from '@/lib/langfuse-config';
import { getLangfuseClientService } from '@/services/langfuse-client';

// Local storage-based interfaces with user_id for multi-user support
export interface Thread {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatStoreState {
  // State
  threads: Thread[];
  messages: Message[];
  activeThreadId: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  mastraClient: MastraClient | null;
  currentUser: { id: string; email?: string } | null;
  
  // Thread management actions
  setActiveThreadId: (threadId: string | null) => void;
  loadThreads: (userId: string) => void;
  createThread: (userId: string, title?: string, select?: boolean) => Thread;
  updateThread: (threadId: string, updates: Partial<Thread>) => void;
  deleteThread: (threadId: string) => void;
  
  // Message management actions
  loadMessages: (threadId: string) => void;
  addMessage: (message: Omit<Message, 'id' | 'created_at'>) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;
  
  // Mastra integration actions
  initializeMastra: () => Promise<void>;
  sendMessage: (content: string, threadId?: string) => Promise<void>;
  createNewChat: (userId: string) => Promise<string>;
  
  // Utility actions
  createNewThread: () => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
}

// Utility functions for local storage operations
const generateId = (): string => {
  return crypto.randomUUID();
};

const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

const generateThreadTitle = (messageContent?: string): string => {
  if (!messageContent) {
    return `New Chat ${new Date().toLocaleDateString()}`;
  }
  
  // Generate title from first message (max 50 chars)
  const title = messageContent.slice(0, 50);
  return title.length < messageContent.length ? `${title}...` : title;
};

export const useChatStore = create<ChatStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        threads: [],
        messages: [],
        activeThreadId: null,
        isLoading: false,
        isStreaming: false,
        error: null,
        mastraClient: null,
        currentUser: null,

        setActiveThreadId: (threadId) => {
          console.log('[DEBUG] ChatStore: Setting active thread', {
            threadId,
            timestamp: new Date().toISOString()
          });
          
          set({ activeThreadId: threadId });
          
          if (threadId) {
            get().loadMessages(threadId);
          } else {
            set({ messages: [] });
          }
        },
        
        loadThreads: (userId: string) => {
          console.log('[DEBUG] ChatStore: Loading threads for user from local storage', {
            userId,
            timestamp: new Date().toISOString()
          });
          
          try {
            const state = get();
            // Filter threads by user_id for user-specific data isolation
            const userThreads = state.threads.filter(thread => thread.user_id === userId);
            
            console.log('[DEBUG] ChatStore: User threads loaded from persist', {
              userId,
              totalThreads: state.threads.length,
              userThreads: userThreads.length,
              threads: userThreads.map(t => ({ id: t.id, title: t.title, user_id: t.user_id }))
            });
            
            // Update state with filtered threads for this user
            set({
              threads: userThreads,
              error: null
            });
          } catch (err) {
            console.error('[DEBUG] ChatStore: Error loading user threads', err);
            set({ error: 'Failed to load chat history' });
          }
        },

        createThread: (userId: string, title, select = true) => {
          console.log('[DEBUG] ChatStore: Creating new thread for user', {
            userId,
            title,
            select,
            timestamp: new Date().toISOString()
          });
          
          const newThread: Thread = {
            id: generateId(),
            user_id: userId,
            title: title || 'New Chat',
            created_at: getCurrentTimestamp(),
            updated_at: getCurrentTimestamp(),
          };
          
          set((state) => {
            const newState: Partial<ChatStoreState> = {
              threads: [newThread, ...state.threads],
              error: null,
            };
            if (select) {
              newState.activeThreadId = newThread.id;
              newState.messages = [];
            }
            return newState as ChatStoreState;
          });
          
          console.log('[DEBUG] ChatStore: Thread created successfully for user', {
            threadId: newThread.id,
            userId: newThread.user_id,
            title: newThread.title
          });
          
          return newThread;
        },

        updateThread: (threadId, updates) => {
          console.log('[DEBUG] ChatStore: Updating thread', {
            threadId,
            updates,
            timestamp: new Date().toISOString()
          });
          
          set((state) => ({
            threads: state.threads.map((thread) =>
              thread.id === threadId
                ? { ...thread, ...updates, updated_at: getCurrentTimestamp() }
                : thread
            ),
            error: null,
          }));
        },

        deleteThread: (threadId) => {
          console.log('[DEBUG] ChatStore: Deleting thread', {
            threadId,
            timestamp: new Date().toISOString()
          });
          
          set((state) => {
            const { threads, messages, activeThreadId } = state;
            const deletedThreadIndex = threads.findIndex((t) => t.id === threadId);
            
            if (deletedThreadIndex === -1) {
              return {};
            }
            
            const updatedThreads = threads.filter((t) => t.id !== threadId);
            const updatedMessages = messages.filter((m) => m.thread_id !== threadId);
            let newActiveThreadId = activeThreadId;
            
            if (activeThreadId === threadId) {
              if (updatedThreads.length > 0) {
                const nextIndex = Math.max(0, deletedThreadIndex - 1);
                newActiveThreadId = updatedThreads[nextIndex].id;
              } else {
                newActiveThreadId = null;
              }
            }
            
            return {
              threads: updatedThreads,
              messages: updatedMessages,
              activeThreadId: newActiveThreadId,
              error: null,
            };
          });
          
          console.log('[DEBUG] ChatStore: Thread deleted successfully', { threadId });
        },

        loadMessages: (threadId) => {
          console.log('[DEBUG] ChatStore: Loading messages for thread', {
            threadId,
            timestamp: new Date().toISOString()
          });
          
          try {
            const state = get();
            const threadMessages = state.messages.filter(m => m.thread_id === threadId);
            
            console.log('[DEBUG] ChatStore: Messages loaded', {
              threadId,
              messageCount: threadMessages.length,
              messages: threadMessages.map(m => ({ id: m.id, role: m.role, content: m.content.slice(0, 50) }))
            });
            
            // Messages are already filtered and available in state
            // This function exists for compatibility but the filtering happens in components/hooks
          } catch (err) {
            console.error('[DEBUG] ChatStore: Error loading messages', err);
            set({ error: 'Failed to load messages' });
          }
        },
        
        addMessage: (messageData) => {
          console.log('[DEBUG] ChatStore: Adding message', {
            threadId: messageData.thread_id,
            userId: messageData.user_id,
            role: messageData.role,
            contentLength: messageData.content.length,
            timestamp: new Date().toISOString()
          });
          
          const newMessage: Message = {
            ...messageData,
            id: generateId(),
            created_at: getCurrentTimestamp(),
          };
          
          set((state) => {
            // Update thread title if this is the first user message for this thread
            const threadMessages = state.messages.filter(m => m.thread_id === messageData.thread_id);
            const isFirstMessage = threadMessages.length === 0;
            
            let updatedThreads = state.threads;
            
            if (isFirstMessage && messageData.role === 'user') {
              const newTitle = generateThreadTitle(messageData.content);
              updatedThreads = state.threads.map(thread =>
                thread.id === messageData.thread_id
                  ? { ...thread, title: newTitle, updated_at: getCurrentTimestamp() }
                  : thread
              );
            } else {
              // Update thread's updated_at timestamp
              updatedThreads = state.threads.map(thread =>
                thread.id === messageData.thread_id
                  ? { ...thread, updated_at: getCurrentTimestamp() }
                  : thread
              );
            }
            
            return {
              messages: [...state.messages, newMessage],
              threads: updatedThreads,
              error: null,
            };
          });
          
          console.log('[DEBUG] ChatStore: Message added successfully', {
            messageId: newMessage.id,
            threadId: newMessage.thread_id,
            userId: newMessage.user_id
          });
        },

        updateMessage: (messageId, updates) => {
          console.log('[DEBUG] ChatStore: Updating message', {
            messageId,
            updates,
            timestamp: new Date().toISOString()
          });
          
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === messageId
                ? { ...message, ...updates }
                : message
            ),
            error: null,
          }));
        },

        deleteMessage: (messageId) => {
          console.log('[DEBUG] ChatStore: Deleting message', {
            messageId,
            timestamp: new Date().toISOString()
          });
          
          set((state) => ({
            messages: state.messages.filter((m) => m.id !== messageId),
            error: null,
          }));
        },

        createNewThread: () => {
          console.log('[DEBUG] ChatStore: Creating new thread via createNewThread - ERROR: Missing userId', {
            timestamp: new Date().toISOString()
          });
          
          // This function needs to be updated to accept userId parameter
          // For now, log an error to help with debugging
          console.error('[DEBUG] ChatStore: createNewThread called without userId - this will not work with user-specific storage');
          set({ error: 'Cannot create thread without user context' });
        },

        clearError: () => {
          set({ error: null });
        },

        setLoading: (loading) => {
          set({ isLoading: loading });
        },

        setStreaming: (streaming) => {
          set({ isStreaming: streaming });
        },

        // Mastra integration functions
        initializeMastra: async () => {
          console.log('[DEBUG] ChatStore: Initializing Mastra client');
          
          try {
            set({ isLoading: true, error: null });
            
            const baseUrl = import.meta.env.VITE_MASTRA_API_URL || 'http://localhost:4111';
            const client = new MastraClient({ baseUrl });
            
            // Get current user from Supabase
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            
            let currentUser = null;
            if (supabaseUrl && supabaseKey) {
              const supabase = createClient(supabaseUrl, supabaseKey);
              const { data: { user } } = await supabase.auth.getUser();
              currentUser = user ? { id: user.id, email: user.email } : null;
            }
            
            set({ 
              mastraClient: client, 
              currentUser,
              isLoading: false 
            });
            
            console.log('[DEBUG] ChatStore: Mastra client initialized successfully', {
              baseUrl,
              hasUser: !!currentUser
            });
          } catch (error) {
            console.error('[DEBUG] ChatStore: Failed to initialize Mastra client', error);
            set({ 
              error: 'Failed to initialize chat client', 
              isLoading: false 
            });
          }
        },

        sendMessage: async (content: string, threadId?: string) => {
          console.log('[DEBUG] ChatStore: Sending message with Langfuse tracking', {
            contentLength: content.length,
            threadId,
            timestamp: new Date().toISOString()
          });
          
          const state = get();
          
          if (!state.mastraClient) {
            await get().initializeMastra();
          }
          
          if (!state.currentUser) {
            throw new Error('User not authenticated');
          }

          // Initialize Langfuse client and tracking
          const langfuseClient = getLangfuseClientService();
          const langfuseConfig = getLangfuseConfig();
          const isLangfuseEnabled = langfuseConfig.enabled;
          const startTime = Date.now();
          let traceId: string | null = null;
          
          try {
            set({ isLoading: true, isStreaming: true, error: null });
            
            let activeThreadId = threadId || state.activeThreadId;
            
            // Create new thread if none exists
            if (!activeThreadId) {
              const newThread = get().createThread(state.currentUser.id, generateThreadTitle(content));
              activeThreadId = newThread.id;
            }

            // Start Langfuse trace for BI observability
            if (isLangfuseEnabled && langfuseClient.isEnabled()) {
              try {
                traceId = await langfuseClient.createBITrace({
                  name: 'bi-assistant-chat',
                  input: { userMessage: content },
                  userId: state.currentUser.id,
                  sessionId: activeThreadId,
                  biContext: {
                    queryType: 'data_analysis',
                    dataSource: 'business_intelligence',
                    businessContext: {
                      department: 'operations',
                      useCase: 'business_intelligence',
                      priority: 'high',
                    },
                  },
                  metadata: {
                    threadId: activeThreadId,
                    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
                    timestamp: new Date().toISOString(),
                  },
                });
                
                console.log('[DEBUG] ChatStore: Langfuse trace created', { traceId });
              } catch (langfuseError) {
                console.error('[DEBUG] ChatStore: Failed to create Langfuse trace', langfuseError);
                // Continue without Langfuse if it fails
              }
            }
            
            // Add user message
            get().addMessage({
              thread_id: activeThreadId,
              user_id: state.currentUser.id,
              role: 'user',
              content
            });
            
            // Get available agents and send message
            const agentsList = await state.mastraClient!.getAgents();
            const agents = Array.isArray(agentsList) ? agentsList : [agentsList];
            
            if (!agents || agents.length === 0) {
              throw new Error('No agents available');
            }
            
            const firstAgent = agents[0];
            const agentId = firstAgent.id || firstAgent.name || 'businessIntelligenceAgent';
            const agent = state.mastraClient!.getAgent(agentId);
            
            // Generate assistant message ID but don't create the message yet
            const assistantMessageId = generateId();
            let assistantMessageCreated = false;

            // Track BI query in Langfuse
            if (isLangfuseEnabled && traceId && langfuseClient.isEnabled()) {
              try {
                await langfuseClient.createBISpan({
                  traceId,
                  name: 'bi-query-processing',
                  startTime: new Date(),
                  input: { 
                    query: content,
                    agentId,
                    threadId: activeThreadId 
                  },
                  biContext: {
                    queryType: 'data_analysis',
                    dataSource: 'business_intelligence',
                    businessContext: {
                      department: 'operations',
                      useCase: 'business_intelligence',
                      priority: 'high',
                    },
                  },
                  metadata: {
                    agentId,
                    processingStartTime: startTime,
                  },
                });
              } catch (langfuseError) {
                console.error('[DEBUG] ChatStore: Failed to track BI query', langfuseError);
              }
            }
            
            // Send message and stream response
            const response = await agent.stream({
              messages: [
                {
                  role: 'system',
                  content: `You are a Business Intelligence Assistant for a service company. 
                  Help business owners make data-driven decisions by analyzing trends, performance, and providing actionable insights.`
                },
                {
                  role: 'user',
                  content
                }
              ],
              threadId: activeThreadId,
              resourceId: state.currentUser.id
            });
            
            // Process streaming response
            let fullContent = '';
            response.processDataStream({
              onTextPart: (text: string) => {
                // Preserve all characters including newlines and whitespace
                fullContent += text;
                
                // Create assistant message on first text part
                if (!assistantMessageCreated) {
                  const assistantMessage = {
                    id: assistantMessageId,
                    thread_id: activeThreadId,
                    user_id: state.currentUser.id,
                    role: 'assistant' as const,
                    content: fullContent, // Use fullContent to ensure proper accumulation
                    created_at: getCurrentTimestamp(),
                  };
                  
                  set((state) => ({
                    messages: [...state.messages, assistantMessage],
                    error: null,
                  }));
                  
                  assistantMessageCreated = true;
                } else {
                  // Update existing message with accumulated content
                  get().updateMessage(assistantMessageId, { content: fullContent });
                }
              },
              onErrorPart: (error: unknown) => {
                console.error('[DEBUG] ChatStore: Stream error', error);
                set({ error: 'Streaming error occurred' });
                
                // Track streaming error in Langfuse
                if (isLangfuseEnabled && traceId && langfuseClient.isEnabled()) {
                  langfuseClient.trackError({
                    traceId,
                    error: error instanceof Error ? error : new Error('Streaming error'),
                    severity: 'medium',
                    category: 'system',
                    context: { threadId: activeThreadId, assistantMessageId },
                    userImpact: 'Chat response interrupted',
                    recoveryAction: 'User can retry the message',
                  }).catch(console.error);
                }
              }
            });

            const processingTime = Date.now() - startTime;

            // End Langfuse trace with success
            if (isLangfuseEnabled && traceId && langfuseClient.isEnabled()) {
              try {
                await langfuseClient.updateTrace(traceId, {
                  output: { 
                    response: fullContent,
                    processingTime,
                    success: true,
                    messageCount: fullContent.length,
                  },
                  metadata: {
                    processingTime,
                    responseLength: fullContent.length,
                    completedAt: new Date().toISOString(),
                  },
                });
                
                await langfuseClient.finalizeTrace(traceId);
                console.log('[DEBUG] ChatStore: Langfuse trace completed successfully', { 
                  traceId, 
                  processingTime 
                });
              } catch (langfuseError) {
                console.error('[DEBUG] ChatStore: Failed to finalize Langfuse trace', langfuseError);
              }
            }
            
          } catch (error) {
            console.error('[DEBUG] ChatStore: Failed to send message', error);
            
            const processingTime = Date.now() - startTime;
            
            // Track error in Langfuse
            if (isLangfuseEnabled && traceId && langfuseClient.isEnabled()) {
              try {
                await langfuseClient.trackError({
                  traceId,
                  error: error instanceof Error ? error : new Error('Unknown error'),
                  severity: 'high',
                  category: 'business_logic',
                  context: { 
                    userMessage: content,
                    processingTime,
                    threadId: threadId || state.activeThreadId,
                  },
                  userImpact: 'Chat message failed to process',
                  recoveryAction: 'User should retry the message',
                });
                
                await langfuseClient.updateTrace(traceId, {
                  output: { 
                    error: (error as Error).message,
                    success: false,
                    processingTime,
                  },
                });
                
                await langfuseClient.finalizeTrace(traceId);
              } catch (langfuseError) {
                console.error('[DEBUG] ChatStore: Failed to track error in Langfuse', langfuseError);
              }
            }
            
            set({ error: error instanceof Error ? error.message : 'Failed to send message' });
          } finally {
            set({ isLoading: false, isStreaming: false });
          }
        },

        createNewChat: async (userId: string) => {
          console.log('[DEBUG] ChatStore: Creating new chat for user', { userId });
          
          const newThread = get().createThread(userId, 'New Chat');
          get().setActiveThreadId(newThread.id);
          
          return newThread.id;
        },
      }),
      {
        name: 'chat-store-persist',
        // Persist threads and messages, but not loading states or errors
        partialize: (state) => ({
          threads: state.threads,
          messages: state.messages,
          activeThreadId: state.activeThreadId,
        }),
      }
    ),
    {
      name: 'chat-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);
