/**
 * Persistent Chat Store for Assistant UI
 * Manages chat history, favorites, and conversation persistence using Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PersistentChatStore,
  ChatHistoryEntry
} from '@/types/business-intelligence';

/**
 * Create the persistent chat store with local storage persistence
 */
export const usePersistentChatStore = create<PersistentChatStore>()(
  persist(
    (set, get) => ({
      // State
      history: [],
      favorites: [],
      searchQuery: '',
      isLoading: false,
      error: null,

      // Actions
      addToHistory: (entry: ChatHistoryEntry) => {
        set(state => {
          // Check if entry already exists (by threadId)
          const existingIndex = state.history.findIndex(h => h.threadId === entry.threadId);
          
          if (existingIndex >= 0) {
            // Update existing entry
            const updatedHistory = [...state.history];
            updatedHistory[existingIndex] = {
              ...updatedHistory[existingIndex],
              ...entry,
              timestamp: new Date() // Update timestamp
            };
            return { history: updatedHistory };
          } else {
            // Add new entry at the beginning (most recent first)
            return {
              history: [entry, ...state.history.slice(0, 99)] // Keep only last 100 entries
            };
          }
        });
      },

      removeFromHistory: (entryId: string) => {
        set(state => ({
          history: state.history.filter(entry => entry.id !== entryId),
          favorites: state.favorites.filter(fav => fav !== entryId)
        }));
      },

      toggleFavorite: (entryId: string) => {
        set(state => {
          const isFavorite = state.favorites.includes(entryId);
          if (isFavorite) {
            return {
              favorites: state.favorites.filter(fav => fav !== entryId)
            };
          } else {
            return {
              favorites: [...state.favorites, entryId]
            };
          }
        });
      },

      searchHistory: (query: string) => {
        set({ searchQuery: query });
      },

      clearHistory: () => {
        set({
          history: [],
          favorites: [],
          searchQuery: ''
        });
      },

      loadHistory: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // In a real implementation, this would load from a backend API
          // For now, we'll just simulate loading from local storage
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // The history is already loaded from localStorage via persist middleware
          set({ isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load chat history';
          set({ error: errorMessage, isLoading: false });
        }
      },

      setError: (error: string | null) => {
        set({ error });
      }
    }),
    {
      name: 'persistent-chat-store',
      partialize: (state) => ({
        history: state.history,
        favorites: state.favorites
      })
    }
  )
);

/**
 * Custom hooks for accessing persistent chat store data
 * Following the project's Zustand patterns
 */

export const useChatHistory = () => {
  const history = usePersistentChatStore(state => state.history);
  const searchQuery = usePersistentChatStore(state => state.searchQuery);
  const isLoading = usePersistentChatStore(state => state.isLoading);
  const error = usePersistentChatStore(state => state.error);
  
  // Filter history based on search query
  const filteredHistory = searchQuery
    ? history.filter(entry => 
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : history;
  
  return { 
    history: filteredHistory, 
    searchQuery, 
    isLoading, 
    error,
    totalCount: history.length
  };
};

export const useChatFavorites = () => {
  const history = usePersistentChatStore(state => state.history);
  const favorites = usePersistentChatStore(state => state.favorites);
  
  const favoriteEntries = history.filter(entry => favorites.includes(entry.id));
  
  return { 
    favorites: favoriteEntries,
    favoriteIds: favorites
  };
};

export const useChatActions = () => {
  const addToHistory = usePersistentChatStore(state => state.addToHistory);
  const removeFromHistory = usePersistentChatStore(state => state.removeFromHistory);
  const toggleFavorite = usePersistentChatStore(state => state.toggleFavorite);
  const searchHistory = usePersistentChatStore(state => state.searchHistory);
  const clearHistory = usePersistentChatStore(state => state.clearHistory);
  const loadHistory = usePersistentChatStore(state => state.loadHistory);
  const setError = usePersistentChatStore(state => state.setError);
  
  return {
    addToHistory,
    removeFromHistory,
    toggleFavorite,
    searchHistory,
    clearHistory,
    loadHistory,
    setError
  };
};

/**
 * Helper function to create a chat history entry from thread data
 */
export const createChatHistoryEntry = (
  threadId: string,
  title: string,
  lastMessage: string,
  messageCount: number = 1,
  category?: 'analytics' | 'support' | 'general'
): ChatHistoryEntry => ({
  id: `history-${threadId}-${Date.now()}`,
  threadId,
  title: title.length > 50 ? title.substring(0, 47) + '...' : title,
  lastMessage: lastMessage.length > 100 ? lastMessage.substring(0, 97) + '...' : lastMessage,
  timestamp: new Date(),
  messageCount,
  category: category || 'general'
});

/**
 * Helper function to determine category based on message content
 */
export const categorizeMessage = (content: string): 'analytics' | 'support' | 'general' => {
  const lowerContent = content.toLowerCase();
  
  // Business intelligence keywords
  const analyticsKeywords = [
    'analytics', 'dashboard', 'metrics', 'revenue', 'orders', 'performance',
    'technician', 'complaints', 'risks', 'trends', 'chart', 'data',
    'business', 'kpi', 'report', 'analysis'
  ];
  
  // Support keywords
  const supportKeywords = [
    'help', 'support', 'issue', 'problem', 'error', 'bug', 'question',
    'how to', 'tutorial', 'guide', 'documentation', 'troubleshoot'
  ];
  
  if (analyticsKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'analytics';
  }
  
  if (supportKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'support';
  }
  
  return 'general';
};