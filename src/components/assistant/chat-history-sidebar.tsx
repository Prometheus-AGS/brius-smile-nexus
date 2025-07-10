/**
 * Chat History Sidebar Component
 * Collapsible sidebar that displays chat history with horizontal sliding animation
 */

import { memo, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useChatSidebar, useChatSidebarKeyboard } from '@/hooks/use-chat-sidebar';
import { useChatStore, Thread } from '@/stores/assistant/chat-store';
import { useAuth } from '@/hooks/use-auth';
import { ChatHistoryHeader } from './chat-history-header';
import { ChatHistorySearch } from './chat-history-search';
import { ChatHistoryList } from './chat-history-list';

interface ChatHistorySidebarProps {
  className?: string;
  maxHeight?: string;
}

/**
 * Main chat history sidebar component with responsive behavior
 */
export const ChatHistorySidebar = memo<ChatHistorySidebarProps>(({ 
  className = '', 
  maxHeight = '100vh' 
}) => {
  const { user } = useAuth();
  const { isOpen, setOpen, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } = useChatSidebar();
  const {
    threads,
    messages,
    isLoading,
    error,
    activeThreadId,
    setActiveThreadId,
    loadThreads,
    createNewThread,
    deleteThread,
    updateThread,
  } = useChatStore();

  const { handleKeyDown } = useChatSidebarKeyboard();

  useEffect(() => {
    console.log('ChatHistorySidebar: Authentication effect triggered', {
      user: user ? { id: user.id, email: user.email } : null,
      hasUserId: !!user?.id,
      timestamp: new Date().toISOString()
    });
    
    if (user?.id) {
      console.log('ChatHistorySidebar: User authenticated, calling loadThreads', {
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      loadThreads(user.id);
    } else {
      console.log('ChatHistorySidebar: No user or user ID, skipping loadThreads', {
        user: user ? 'exists but no ID' : 'null/undefined',
        timestamp: new Date().toISOString()
      });
    }
  }, [loadThreads, user]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCreateNewThread = useCallback(() => {
    createNewThread();
    if (window.innerWidth < 768) { // md breakpoint
      setOpen(false);
    }
  }, [createNewThread, setOpen]);
  
  const handleThreadSelect = useCallback((thread: Thread) => {
    console.log('[DEBUG] ChatHistorySidebar: Thread selected', {
      threadId: thread.id,
      threadTitle: thread.title,
      timestamp: new Date().toISOString()
    });
    
    // First set the active thread in the store
    setActiveThreadId(thread.id);
    
    // Then close the sidebar after a brief delay to ensure state update
    setTimeout(() => {
      setOpen(false);
    }, 100);
  }, [setActiveThreadId, setOpen]);

  const handleDeleteThread = useCallback((threadId: string) => {
    deleteThread(threadId);
  }, [deleteThread]);

  const handleUpdateThread = useCallback((threadId: string, updates: Partial<Thread>) => {
    updateThread(threadId, updates);
  }, [updateThread]);

  const filteredThreads = useMemo(() => {
    return threads.filter(thread => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return thread.title.toLowerCase().includes(query);
    });
  }, [threads, searchQuery]);

  const SidebarContent = () => (
    <div className='flex-1 flex flex-col min-h-0'>
      <div className="p-4 border-b border-border">
        <ChatHistorySearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </div>
      <div className="flex-1 min-h-0">
        <ChatHistoryList
          items={filteredThreads}
          messages={messages}
          onItemClick={handleThreadSelect}
          onDeleteItem={handleDeleteThread}
          onUpdateItem={handleUpdateThread}
          selectedItemId={activeThreadId}
          isLoading={isLoading}
          error={error}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
        />
      </div>
    </div>
  );

  const DesktopSidebar = () => (
   <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200, duration: 0.3 }}
          className={`fixed left-0 top-0 z-50 h-full w-[420px] bg-background border-r border-border shadow-lg flex flex-col ${className}`}
          style={{ maxHeight }}
        >
          <ChatHistoryHeader />
          <SidebarContent />
        </motion.div>
      )}
    </AnimatePresence>
  );

  const MobileSidebar = () => (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent 
        side="left" 
        className="w-80 p-0 flex flex-col"
        style={{ maxHeight }}
      >
        <ChatHistoryHeader />
        <SidebarContent />
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      <div className="hidden md:block">
        <DesktopSidebar />
      </div>
      <div className="block md:hidden">
        <MobileSidebar />
      </div>
    </>
  );
});

ChatHistorySidebar.displayName = 'ChatHistorySidebar';
