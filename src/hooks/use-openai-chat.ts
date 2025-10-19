/**
 * OpenAI Chat Hook
 * 
 * React hook that provides chat functionality using Vercel AI SDK with OpenAI
 * Uses environment variables for base URL and model configuration
 */

import { useCallback, useState, useMemo, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useChatStore } from '@/stores/assistant/chat-store';
import type { User } from '@/types/auth';
import type { Message, Thread } from '@/stores/assistant/chat-store';

// ============================================================================
// Hook Return Type
// ============================================================================

interface UseOpenAIChatReturn {
  // Chat state
  messages: Message[];
  input: string;
  isLoading: boolean;
  isStreaming: boolean;
  error: Error | null;
  
  // Chat actions
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  append: (message: { role: 'user' | 'assistant'; content: string }) => void;
  reload: () => void;
  stop: () => void;
  setInput: (input: string) => void;
  
  // Store integration
  activeThreadId: string | null;
  threads: Thread[];
  
  // Thread management
  createNewThread: () => void;
  switchThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  createNewChat: () => Promise<void>;
  
  // Additional methods for compatibility
  sendMessage?: (content: string) => Promise<void>;
  
  // Utility
  clearError: () => void;
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

export function useOpenAIChat(user?: User): UseOpenAIChatReturn {
  const [error, setError] = useState<Error | null>(null);
  const [input, setInput] = useState('');
  
  // Get chat store state and actions
  const {
    threads,
    messages: storeMessages,
    activeThreadId,
    isLoading: storeLoading,
    createThread,
    setActiveThreadId,
    deleteThread: storeDeleteThread,
    addMessage,
    loadMessages,
    clearError: storeClearError,
  } = useChatStore();

  // Initialize Vercel AI SDK chat with proper transport
  const {
    messages: aiMessages,
    sendMessage,
    status,
    error: aiError,
    stop,
    regenerate,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      headers: user ? {
        'x-user-id': user.id,
        'x-user-role': user.role || 'user',
        'x-user-tier': user.tier || 'standard',
        'x-user-language': user.language || 'en',
        'x-organization': user.organization || 'default',
        'x-session-id': `session-${Date.now()}-${user.id}`,
      } : {},
    }),
    onFinish: (options) => {
      console.log('[DEBUG] useOpenAIChat: Message finished', {
        messageId: options.message.id,
        role: options.message.role,
        contentLength: options.message.parts.length,
        activeThreadId
      });
      
      // Add the assistant message to the store
      if (activeThreadId && user) {
        // Extract text content from message parts
        const textContent = options.message.parts
          .filter(part => part.type === 'text')
          .map(part => part.text)
          .join('');
        
        if (textContent) {
          addMessage({
            thread_id: activeThreadId,
            user_id: user.id,
            role: 'assistant',
            content: textContent,
          });
        }
      }
    },
    onError: (error) => {
      console.error('[DEBUG] useOpenAIChat: Chat error', error);
      setError(error);
    },
  });

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  // Custom submit handler that integrates with store
  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim() || !user) return;
    
    try {
      setError(null);
      
      // Create thread if none exists
      let currentThreadId = activeThreadId;
      if (!currentThreadId) {
        const newThread = createThread(user.id, input.slice(0, 50));
        currentThreadId = newThread.id;
      }
      
      // Add user message to store
      addMessage({
        thread_id: currentThreadId,
        user_id: user.id,
        role: 'user',
        content: input,
      });
      
      // Send message via AI SDK
      sendMessage({ text: input });
      
      // Clear input
      setInput('');
      
    } catch (err) {
      console.error('[DEBUG] useOpenAIChat: Submit error', err);
      setError(err as Error);
    }
  }, [input, user, activeThreadId, createThread, addMessage, sendMessage]);

  // Append function for compatibility
  const append = useCallback((message: { role: 'user' | 'assistant'; content: string }) => {
    if (!user) return;
    
    // Create thread if none exists
    let currentThreadId = activeThreadId;
    if (!currentThreadId) {
      const newThread = createThread(user.id, message.content.slice(0, 50));
      currentThreadId = newThread.id;
    }
    
    // Add message to store
    addMessage({
      thread_id: currentThreadId,
      user_id: user.id,
      role: message.role,
      content: message.content,
    });
    
    // If it's a user message, send to AI
    if (message.role === 'user') {
      sendMessage({ text: message.content });
    }
  }, [user, activeThreadId, createThread, addMessage, sendMessage]);

  // Reload function (regenerate last message)
  const reload = useCallback(() => {
    regenerate();
  }, [regenerate]);

  // Thread management functions
  const createNewThread = useCallback(() => {
    if (!user) return;
    
    const newThread = createThread(user.id, 'New Chat');
    setActiveThreadId(newThread.id);
  }, [user, createThread, setActiveThreadId]);

  const switchThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
    loadMessages(threadId);
  }, [setActiveThreadId, loadMessages]);

  const deleteThread = useCallback((threadId: string) => {
    storeDeleteThread(threadId);
  }, [storeDeleteThread]);

  const createNewChat = useCallback(async () => {
    if (!user) return;
    
    const newThread = createThread(user.id, 'New Chat');
    setActiveThreadId(newThread.id);
  }, [user, createThread, setActiveThreadId]);

  // Send message function for compatibility
  const sendMessageCompat = useCallback(async (content: string) => {
    if (!user) return;
    
    // Create thread if none exists
    let currentThreadId = activeThreadId;
    if (!currentThreadId) {
      const newThread = createThread(user.id, content.slice(0, 50));
      currentThreadId = newThread.id;
    }
    
    // Add user message to store
    addMessage({
      thread_id: currentThreadId,
      user_id: user.id,
      role: 'user',
      content,
    });
    
    // Send via AI SDK
    sendMessage({ text: content });
  }, [user, activeThreadId, createThread, addMessage, sendMessage]);

  const clearError = useCallback(() => {
    setError(null);
    storeClearError();
  }, [storeClearError]);

  // Get messages for current thread - memoized to prevent unnecessary re-renders
  const messages = useMemo(() => {
    return storeMessages.filter(msg => msg.thread_id === activeThreadId);
  }, [storeMessages, activeThreadId]);

  // Determine loading states
  const isLoading = storeLoading || status === 'streaming';
  const isStreaming = status === 'streaming';

  // Combine errors
  const combinedError = error || aiError || null;

  return {
    // Chat state
    messages,
    input,
    isLoading,
    isStreaming,
    error: combinedError,
    
    // Chat actions
    handleInputChange,
    handleSubmit,
    append,
    reload,
    stop,
    setInput,
    
    // Store integration
    activeThreadId,
    threads,
    
    // Thread management
    createNewThread,
    switchThread,
    deleteThread,
    createNewChat,
    
    // Additional methods
    sendMessage: sendMessageCompat,
    
    // Utility
    clearError,
  };
}
