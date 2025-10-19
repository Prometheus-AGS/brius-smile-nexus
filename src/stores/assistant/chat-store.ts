import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
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

// User context interface for agent server headers
export interface UserContext {
  id: string;
  email?: string;
  role?: string;
  tier?: string;
  language?: string;
  organization?: string;
  sessionId?: string;
}

interface ChatStoreState {
  // State
  threads: Thread[];
  messages: Message[];
  activeThreadId: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  openaiClient: boolean;
  currentUser: UserContext | null;
  
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
  
  // OpenAI integration actions
  initializeOpenAI: () => Promise<void>;
  createNewChat: (userId: string) => Promise<string>;
  
  // User context management
  getUserContextHeaders: () => Record<string, string>;
  updateUserContext: (context: Partial<UserContext>) => void;
  
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
        openaiClient: false,
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
              console.log('[DEBUG] ChatStore: Thread not found for deletion', { threadId });
              return {};
            }
            
            const updatedThreads = threads.filter((t) => t.id !== threadId);
            const updatedMessages = messages.filter((m) => m.thread_id !== threadId);
            let newActiveThreadId = activeThreadId;
            
            // If we're deleting the currently active thread, select a new one
            if (activeThreadId === threadId) {
              if (updatedThreads.length > 0) {
                // Try to select the next thread, or the previous one if we're at the end
                let nextIndex = deletedThreadIndex;
                if (nextIndex >= updatedThreads.length) {
                  nextIndex = updatedThreads.length - 1;
                }
                newActiveThreadId = updatedThreads[nextIndex].id;
                
                console.log('[DEBUG] ChatStore: Selected new active thread after deletion', {
                  deletedThreadId: threadId,
                  newActiveThreadId,
                  deletedIndex: deletedThreadIndex,
                  selectedIndex: nextIndex,
                  remainingThreads: updatedThreads.length
                });
              } else {
                newActiveThreadId = null;
                console.log('[DEBUG] ChatStore: No threads remaining after deletion', { threadId });
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

        // OpenAI integration functions
        initializeOpenAI: async () => {
          console.log('[DEBUG] ChatStore: Initializing OpenAI client with user context');
          
          try {
            set({ isLoading: true, error: null });
            
            // Get current user from Supabase with extended context
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            
            let currentUser: UserContext | null = null;
            if (supabaseUrl && supabaseKey) {
              const supabase = createClient(supabaseUrl, supabaseKey);
              const { data: { user } } = await supabase.auth.getUser();
              
              if (user) {
                // Create user context with proper headers format for agent server
                currentUser = {
                  id: user.id,
                  email: user.email || undefined,
                  role: user.user_metadata?.role || 'user',
                  tier: user.user_metadata?.tier || 'standard',
                  language: user.user_metadata?.language || 'en',
                  organization: user.user_metadata?.organization || 'default',
                  sessionId: `session-${Date.now()}-${user.id}`,
                };
              }
            }

            if (!currentUser) {
              throw new Error('User not authenticated - cannot initialize OpenAI client');
            }
            
            // Initialize OpenAI client (will be handled by Vercel AI SDK)
            set({ 
              openaiClient: true, 
              currentUser,
              isLoading: false 
            });
            
            console.log('[DEBUG] ChatStore: OpenAI client initialized successfully', {
              userId: currentUser.id,
              userName: currentUser.email,
              userRole: currentUser.role,
              userTier: currentUser.tier,
              userOrganization: currentUser.organization,
              hasUser: !!currentUser
            });
          } catch (error) {
            console.error('[DEBUG] ChatStore: Failed to initialize OpenAI client', error);
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
          
          if (!state.openaiClient) {
            await get().initializeOpenAI();
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
                // Extract user name from various possible sources
                const userName = state.currentUser.email?.split('@')[0] || 'Unknown User';
                
                traceId = await langfuseClient.createBITrace({
                  name: 'bi-assistant-chat',
                  input: { userMessage: content },
                  userId: state.currentUser.id,
                  userName: userName,
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
                    userName: userName,
                    userEmail: state.currentUser.email,
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
            
            // Note: The actual AI response will be handled by the useOpenAIChat hook
            // This store method is now simplified to just handle message persistence
            console.log('[DEBUG] ChatStore: Message processing will be handled by useOpenAIChat hook');

            const processingTime = Date.now() - startTime;

            // End Langfuse trace with success
            if (isLangfuseEnabled && traceId && langfuseClient.isEnabled()) {
              try {
                const userName = state.currentUser.email?.split('@')[0] || 'Unknown User';
                
                await langfuseClient.updateTrace(traceId, {
                  output: { 
                    success: true,
                    processingTime,
                    messageAdded: true,
                  },
                  metadata: {
                    userName: userName,
                    userEmail: state.currentUser.email,
                    processingTime,
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
                const userName = state.currentUser.email?.split('@')[0] || 'Unknown User';
                
                await langfuseClient.trackError({
                  traceId,
                  error: error instanceof Error ? error : new Error('Unknown error'),
                  severity: 'high',
                  category: 'business_logic',
                  context: { 
                    userMessage: content,
                    userName: userName,
                    userEmail: state.currentUser.email,
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
                  metadata: {
                    userName: userName,
                    userEmail: state.currentUser.email,
                    processingTime,
                    errorOccurredAt: new Date().toISOString(),
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

        // User context management for agent server headers
        getUserContextHeaders: () => {
          const state = get();
          if (!state.currentUser) {
            return {};
          }

          return {
            'x-user-id': state.currentUser.id,
            'x-user-role': state.currentUser.role || 'user',
            'x-user-tier': state.currentUser.tier || 'standard',
            'x-user-language': state.currentUser.language || 'en',
            'x-organization': state.currentUser.organization || 'default',
            'x-session-id': state.currentUser.sessionId || `session-${Date.now()}`,
          };
        },

        updateUserContext: (context: Partial<UserContext>) => {
          set((state) => ({
            currentUser: state.currentUser ? {
              ...state.currentUser,
              ...context,
            } : null,
          }));
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
