/**
 * Library App Component
 * 
 * Displays knowledge library documents from Supabase
 * Uses proper loading states to prevent UI flashing
 * Follows hook-based data orchestration pattern
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FileText, Folder, Plus, Loader2, AlertCircle } from 'lucide-react';
import { useLibrary } from '@/hooks/use-library';
import type { KnowledgeDocument } from '@/stores/library-store';

export const LibraryApp: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Use custom hook for data orchestration
  const {
    documents,
    isLoading,
    error,
    fetchDocuments,
    clearError,
  } = useLibrary({
    autoFetch: true,
  });

  // Client-side filtering for immediate feedback
  const filteredDocuments = useMemo((): KnowledgeDocument[] => {
    if (!searchTerm) return documents;
    
    const term = searchTerm.toLowerCase();
    return documents.filter((doc: KnowledgeDocument) =>
      doc.title.toLowerCase().includes(term) ||
      (doc.content && doc.content.toLowerCase().includes(term)) ||
      (doc.category && doc.category.toLowerCase().includes(term))
    );
  }, [documents, searchTerm]);

  // Determine document type from file_type or category
  const getDocumentType = (doc: KnowledgeDocument): 'folder' | 'document' => {
    if (doc.category === 'folder' || doc.file_type === 'folder') {
      return 'folder';
    }
    return 'document';
  };

  // Handle search with debouncing for server-side search
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Could add server-side search here if needed
    // fetchDocuments({ searchTerm: value });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-brius-primary mx-auto" />
          <p className="text-brius-gray font-body">Loading knowledge library...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Error Loading Library</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-brius-gray font-body">{error.message}</p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  clearError();
                  fetchDocuments();
                }}
                variant="default"
                className="bg-brius-primary hover:bg-brius-secondary"
              >
                Retry
              </Button>
              <Button
                onClick={clearError}
                variant="outline"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-display font-medium text-brius-black">
              Knowledge Library
            </h2>
            <p className="text-brius-gray font-body">
              Access corporate knowledge base and personal documents
            </p>
          </div>
          <Button className="bg-brius-primary hover:bg-brius-secondary">
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-brius-gray" />
          <Input
            placeholder="Search knowledge base..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 font-body"
          />
        </div>

        {/* Empty state */}
        {documents.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 text-brius-gray mx-auto mb-4" />
              <CardTitle className="mb-2">No Documents Yet</CardTitle>
              <CardDescription className="font-body mb-4">
                Start building your knowledge library by adding documents
              </CardDescription>
              <Button className="bg-brius-primary hover:bg-brius-secondary">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Document
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Document grid */}
        {filteredDocuments.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredDocuments.map((doc, index) => {
                const docType = getDocumentType(doc);
                
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                    layout
                  >
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {docType === 'folder' ? (
                              <Folder className="h-5 w-5 text-brius-secondary flex-shrink-0" />
                            ) : (
                              <FileText className="h-5 w-5 text-brius-primary flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <CardTitle className="text-lg font-display font-medium truncate">
                                {doc.title}
                              </CardTitle>
                              {doc.category && (
                                <span className="text-xs text-brius-gray font-body">
                                  {doc.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="font-body mb-3 line-clamp-2">
                          {doc.content.substring(0, 150)}...
                        </CardDescription>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-brius-gray font-body">
                            {doc.updated_at 
                              ? `Updated: ${new Date(doc.updated_at).toLocaleDateString()}`
                              : doc.created_at 
                                ? `Created: ${new Date(doc.created_at).toLocaleDateString()}`
                                : 'No date'
                            }
                          </div>
                          {doc.processing_status && (
                            <span className={`text-xs px-2 py-1 rounded-full font-body ${
                              doc.processing_status === 'completed' 
                                ? 'bg-green-100 text-green-700'
                                : doc.processing_status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                            }`}>
                              {doc.processing_status}
                            </span>
                          )}
                        </div>
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {doc.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-1 bg-brius-primary/10 text-brius-primary rounded font-body"
                              >
                                {tag}
                              </span>
                            ))}
                            {doc.tags.length > 3 && (
                              <span className="text-xs px-2 py-1 text-brius-gray font-body">
                                +{doc.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* No search results */}
        {documents.length > 0 && filteredDocuments.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Search className="h-12 w-12 text-brius-gray mx-auto mb-4" />
              <CardTitle className="mb-2">No Results Found</CardTitle>
              <CardDescription className="font-body">
                Try adjusting your search terms
              </CardDescription>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
};
