/**
 * Library Custom Hook
 * 
 * Provides interface between components and library store
 * Follows mandatory hook-based data orchestration pattern
 */

import { useEffect, useCallback } from 'react';
import { useLibraryStore, type KnowledgeDocument } from '@/stores/library-store';

// ============================================================================
// Hook Return Type
// ============================================================================

export interface UseLibraryReturn {
  // Data
  documents: KnowledgeDocument[];
  selectedDocument: KnowledgeDocument | null;
  totalCount: number;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  
  // Error state
  error: Error | null;
  
  // Metadata
  lastFetchedAt: Date | null;
  
  // Actions
  fetchDocuments: (filters?: {
    category?: string;
    tags?: string[];
    searchTerm?: string;
  }) => Promise<void>;
  
  refreshDocuments: () => Promise<void>;
  
  selectDocument: (document: KnowledgeDocument | null) => void;
  
  clearError: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Custom hook for library document management
 * 
 * Orchestrates data loading and provides clean interface for components
 * Components must never directly access the store
 */
export function useLibrary(options?: {
  autoFetch?: boolean;
  filters?: {
    category?: string;
    tags?: string[];
    searchTerm?: string;
  };
}): UseLibraryReturn {
  // Select data from store
  const documents = useLibraryStore(state => state.documents);
  const selectedDocument = useLibraryStore(state => state.selectedDocument);
  const isLoading = useLibraryStore(state => state.isLoading);
  const isRefreshing = useLibraryStore(state => state.isRefreshing);
  const error = useLibraryStore(state => state.error);
  const lastFetchedAt = useLibraryStore(state => state.lastFetchedAt);
  const totalCount = useLibraryStore(state => state.totalCount);
  
  // Select actions from store
  const fetchDocuments = useLibraryStore(state => state.fetchDocuments);
  const refreshDocuments = useLibraryStore(state => state.refreshDocuments);
  const selectDocument = useLibraryStore(state => state.selectDocument);
  const clearError = useLibraryStore(state => state.clearError);

  // Memoized fetch with filters
  const fetchWithFilters = useCallback(async (filters?: {
    category?: string;
    tags?: string[];
    searchTerm?: string;
  }) => {
    await fetchDocuments(filters);
  }, [fetchDocuments]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (options?.autoFetch !== false && documents.length === 0 && !isLoading) {
      fetchWithFilters(options?.filters);
    }
  }, [options?.autoFetch, options?.filters, documents.length, isLoading, fetchWithFilters]);

  return {
    // Data
    documents,
    selectedDocument,
    totalCount,
    
    // Loading states
    isLoading,
    isRefreshing,
    
    // Error state
    error,
    
    // Metadata
    lastFetchedAt,
    
    // Actions
    fetchDocuments: fetchWithFilters,
    refreshDocuments,
    selectDocument,
    clearError,
  };
}