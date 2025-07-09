/**
 * Custom hook for interfacing with the chat store
 * This hook orchestrates the interaction between components and the chat store
 * Following the proper architecture where components never directly access stores
 */

import { useCallback, useEffect } from 'react';
import { useChatStore } from '@/stores/assistant/chat-store';
import { useAuth } from '@/hooks/use-auth';
import { useChatSidebarActions } from '@/hooks/use-chat-sidebar';

export function useMastraChat() {
  const { user } = useAuth();
  const { setOpen: setSidebarOpen } = useChatSidebarActions();
  
  // Get store state and actions
  const {
    threads,
    messages,
    activeThreadId,
    isLoading,
    isStreaming,
    error,
    mastraClient,
    currentUser,
    
    // Actions
    setActiveThreadId,
    loadThreads,
    createThread,
    updateThread,
    deleteThread,
    loadMessages,
    addMessage,
    updateMessage,
    deleteMessage,
    initializeMastra,
    sendMessage,
    createNewChat,
    clearError,
    setLoading,
    setStreaming,
  } = useChatStore();

  // Initialize Mastra when user is available
  useEffect(() => {
    if (user && !mastraClient) {
      initializeMastra().catch(console.error);
    }
  }, [user, mastraClient, initializeMastra]);

  // Load user threads when user changes
  useEffect(() => {
    if (user?.id) {
      loadThreads(user.id);
    }
  }, [user?.id, loadThreads]);

  // Get messages for active thread
  const activeThreadMessages = activeThreadId 
    ? messages.filter(m => m.thread_id === activeThreadId)
    : [];

  // Get user threads
  const userThreads = user?.id 
    ? threads.filter(t => t.user_id === user.id)
    : [];

  // Orchestrated actions
  const handleSendMessage = useCallback(async (content: string, threadId?: string) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    try {
      await sendMessage(content, threadId);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [user?.id, sendMessage]);

  const handleCreateNewChat = useCallback(async () => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    try {
      const threadId = await createNewChat(user.id);
      return threadId;
    } catch (error) {
      console.error('Failed to create new chat:', error);
      throw error;
    }
  }, [user?.id, createNewChat]);

  const handleSwitchThread = useCallback((threadId: string | null) => {
    setActiveThreadId(threadId);
    // Close sidebar after switching thread for better UX
    setSidebarOpen(false);
  }, [setActiveThreadId, setSidebarOpen]);

  const handleDeleteThread = useCallback((threadId: string) => {
    deleteThread(threadId);
  }, [deleteThread]);

  return {
    // State
    threads: userThreads,
    messages: activeThreadMessages,
    activeThreadId,
    isLoading,
    isStreaming,
    error,
    isInitialized: !!mastraClient,
    user: currentUser,
    
    // Actions
    sendMessage: handleSendMessage,
    createNewChat: handleCreateNewChat,
    switchThread: handleSwitchThread,
    deleteThread: handleDeleteThread,
    clearError,
    
    // Raw store actions (for advanced use cases)
    store: {
      createThread,
      updateThread,
      addMessage,
      updateMessage,
      deleteMessage,
      loadMessages,
      setLoading,
      setStreaming,
    }
  };
}
