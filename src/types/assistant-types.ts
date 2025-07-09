/**
 * Assistant Types
 * TypeScript interfaces for chat assistant functionality
 */

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

export interface ChatState {
  threads: Thread[];
  messages: Record<string, Message[]>;
  activeThreadId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface ChatActions {
  // Thread management
  loadThreads: (userId: string) => void;
  createThread: (userId: string, title?: string) => string;
  updateThread: (threadId: string, updates: Partial<Thread>) => void;
  deleteThread: (threadId: string) => void;
  setActiveThreadId: (threadId: string | null) => void;
  
  // Message management
  loadMessages: (threadId: string) => void;
  addMessage: (threadId: string, userId: string, role: 'user' | 'assistant', content: string) => void;
  
  // Utility actions
  clearError: () => void;
  createNewThread: (userId: string) => void;
}

export type ChatStore = ChatState & ChatActions;