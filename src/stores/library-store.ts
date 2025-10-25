/**
 * Library Store
 * 
 * Zustand store for managing knowledge library documents from Supabase
 * Implements proper loading states and error handling
 */

import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Knowledge Document type matching Supabase schema
 * Defined directly until types are regenerated
 */
export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  file_path: string | null;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  tags: string[] | null;
  upload_user_id: string | null;
  processing_status: string | null;
  processed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  metadata: Record<string, unknown> | null;
}

export interface LibraryState {
  // Data
  documents: KnowledgeDocument[];
  selectedDocument: KnowledgeDocument | null;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  
  // Error state
  error: Error | null;
  
  // Metadata
  lastFetchedAt: Date | null;
  totalCount: number;
  
  // Actions
  fetchDocuments: (filters?: {
    category?: string;
    tags?: string[];
    searchTerm?: string;
  }) => Promise<void>;
  
  fetchDocumentById: (id: string) => Promise<void>;
  
  refreshDocuments: () => Promise<void>;
  
  selectDocument: (document: KnowledgeDocument | null) => void;
  
  clearError: () => void;
  
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  documents: [],
  selectedDocument: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastFetchedAt: null,
  totalCount: 0,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useLibraryStore = create<LibraryState>((set, get) => ({
  ...initialState,

  /**
   * Fetch documents from Supabase with optional filters
   */
  fetchDocuments: async (filters) => {
    set({ isLoading: true, error: null });

    try {
      // Type assertion needed - knowledge_documents table not yet in generated types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('knowledge_documents')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false });

      // Apply category filter
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      // Apply tag filter
      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      // Apply search filter
      if (filters?.searchTerm) {
        query = query.or(
          `title.ilike.%${filters.searchTerm}%,content.ilike.%${filters.searchTerm}%`
        );
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch documents: ${error.message}`);
      }

      set({
        documents: (data as unknown as KnowledgeDocument[]) || [],
        totalCount: count || 0,
        lastFetchedAt: new Date(),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
        isLoading: false,
      });
    }
  },

  /**
   * Fetch a specific document by ID
   */
  fetchDocumentById: async (id) => {
    set({ isLoading: true, error: null });

    try {
      // Type assertion needed - knowledge_documents table not yet in generated types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('knowledge_documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch document: ${error.message}`);
      }

      set({
        selectedDocument: data as unknown as KnowledgeDocument,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
        isLoading: false,
      });
    }
  },

  /**
   * Refresh documents (background refresh without loading state)
   */
  refreshDocuments: async () => {
    set({ isRefreshing: true, error: null });

    try {
      // Type assertion needed - knowledge_documents table not yet in generated types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error, count } = await (supabase as any)
        .from('knowledge_documents')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to refresh documents: ${error.message}`);
      }

      set({
        documents: (data as unknown as KnowledgeDocument[]) || [],
        totalCount: count || 0,
        lastFetchedAt: new Date(),
        isRefreshing: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
        isRefreshing: false,
      });
    }
  },

  /**
   * Select a document
   */
  selectDocument: (document) => {
    set({ selectedDocument: document });
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set(initialState);
  },
}));