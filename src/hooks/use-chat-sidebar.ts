/**
 * Custom hook for chat history sidebar state management
 * Provides sidebar state and actions using Zustand store pattern
 */

import { useCallback } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ChatSidebarUiState {
  isOpen: boolean;
  searchQuery: string;
  selectedCategory: 'all' | 'analytics' | 'support' | 'general';
}

interface ChatSidebarUiActions {
  setOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: 'all' | 'analytics' | 'support' | 'general') => void;
}

type ChatSidebarUiStore = ChatSidebarUiState & ChatSidebarUiActions;

/**
 * Chat sidebar Zustand store for UI state
 */
const useChatSidebarStore = create<ChatSidebarUiStore>()(
  devtools(
    (set, get) => ({
      isOpen: false,
      searchQuery: '',
      selectedCategory: 'all',

      setOpen: (isOpen) => {
        console.log(`[DEBUG] useChatSidebar: setOpen called`, { stateTransition: `${get().isOpen} -> ${isOpen}` });
        set({ isOpen }, false, 'setOpen');
      },

      toggleSidebar: () => {
        const newValue = !get().isOpen;
        console.log(`[DEBUG] useChatSidebar: toggleSidebar called`, { stateTransition: `${get().isOpen} -> ${newValue}` });
        set({ isOpen: newValue }, false, 'toggleSidebar');
      },

      setSearchQuery: (searchQuery) => {
        set({ searchQuery }, false, 'setSearchQuery');
      },

      setSelectedCategory: (selectedCategory) => {
        set({ selectedCategory }, false, 'setSelectedCategory');
      },
    }),
    {
      name: 'chat-sidebar-ui-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

/**
 * Custom hook for accessing sidebar UI state
 */
export const useChatSidebarState = () => {
  const isOpen = useChatSidebarStore(state => state.isOpen);
  const searchQuery = useChatSidebarStore(state => state.searchQuery);
  const selectedCategory = useChatSidebarStore(state => state.selectedCategory);
  return { isOpen, searchQuery, selectedCategory };
};

/**
 * Custom hook for accessing sidebar UI actions
 */
export const useChatSidebarActions = () => {
  const setOpen = useChatSidebarStore(state => state.setOpen);
  const toggleSidebar = useChatSidebarStore(state => state.toggleSidebar);
  const setSearchQuery = useChatSidebarStore(state => state.setSearchQuery);
  const setSelectedCategory = useChatSidebarStore(state => state.setSelectedCategory);
  return { setOpen, toggleSidebar, setSearchQuery, setSelectedCategory };
};

/**
 * Combined hook for both state and actions
 */
export const useChatSidebar = () => {
  const state = useChatSidebarState();
  const actions = useChatSidebarActions();
  return { ...state, ...actions };
};

/**
 * Hook for keyboard shortcuts
 */
export const useChatSidebarKeyboard = () => {
  const { toggleSidebar } = useChatSidebarActions();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'H') {
      event.preventDefault();
      toggleSidebar();
    }
  }, [toggleSidebar]);

  return { handleKeyDown };
};