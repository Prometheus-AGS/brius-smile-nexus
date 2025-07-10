/**
 * Chat History List Component
 * Displays a virtualized list of chat history items with performance optimization
 */

import { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Clock, Trash, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Thread, Message } from '@/stores/assistant/chat-store';

interface ChatHistoryListProps {
  items: Thread[];
  messages: Message[];
  onItemClick: (item: Thread) => void;
  onDeleteItem: (threadId: string) => void;
  onUpdateItem: (threadId: string, updates: Partial<Thread>) => void;
  selectedItemId: string | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: 'all' | 'analytics' | 'support' | 'general';
  className?: string;
}

interface ChatHistoryItemProps {
  index: number;
  style?: React.CSSProperties;
  data: {
    items: Thread[];
    messages: Message[];
    onItemClick: (item: Thread) => void;
    onDeleteItem: (threadId: string) => void;
    onUpdateItem: (threadId: string, updates: Partial<Thread>) => void;
    selectedItemId?: string | null;
  };
}

const ChatHistoryItem = memo<ChatHistoryItemProps>(({ index, style = {}, data }) => {
  const { items, messages, onItemClick, onDeleteItem, onUpdateItem, selectedItemId } = data;
  const item = items[index];
  const [isEditing, setIsEditing] = useState(false);
  const [isHoveringTitle, setIsHoveringTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(item.title);
  const [originalTitle, setOriginalTitle] = useState(item.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find the first user message for this thread to use as preview text
  const firstUserMessage = useMemo(() => {
    return messages.find(msg => msg.thread_id === item.id && msg.role === 'user');
  }, [messages, item.id]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  // Update local state when item title changes externally
  useEffect(() => {
    if (!isEditing) {
      setNewTitle(item.title);
      setOriginalTitle(item.title);
    }
  }, [item.title, isEditing]);

  const handleItemClick = useCallback(() => {
    // Only allow item selection when NOT in editing mode
    if (!isEditing) {
      onItemClick(item);
    }
  }, [item, onItemClick, isEditing]);

  const handleStartEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOriginalTitle(item.title);
    setNewTitle(item.title);
    setIsEditing(true);
  }, [item.title]);

  const handleSaveEdit = useCallback(() => {
    const trimmedTitle = newTitle.trim();
    if (trimmedTitle && trimmedTitle !== originalTitle) {
      onUpdateItem(item.id, { title: trimmedTitle });
    }
    setIsEditing(false);
  }, [newTitle, originalTitle, onUpdateItem, item.id]);

  const handleCancelEdit = useCallback(() => {
    setNewTitle(originalTitle);
    setIsEditing(false);
  }, [originalTitle]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteItem(item.id);
  }, [onDeleteItem, item.id]);

  const isSelected = selectedItemId === item.id;
  // Use the first user message content as preview text, fallback to title if no message found
  const previewText = firstUserMessage?.content || item.title || 'No preview available';
  const truncatedPreview = previewText.length > 100 ? `${previewText.substring(0, 100)}...` : previewText;

  return (
    <div style={style}>
      <div
        className={`
          group p-3 mx-2 mb-2 rounded-lg border transition-all duration-200
          ${isEditing 
            ? 'bg-accent/50 border-primary/50 shadow-sm cursor-default' 
            : `cursor-pointer hover:bg-accent hover:border-accent-foreground/20 ${
                isSelected
                  ? 'bg-accent border-accent-foreground/30 shadow-sm'
                  : 'bg-background border-border'
              }`
          }
        `}
        onClick={handleItemClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleItemClick();
          }
        }}
        aria-label={`Chat: ${item.title}`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2 flex-1 min-w-0 pr-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            
            {isEditing ? (
              <div className="flex items-center space-x-2 flex-1">
                <Input
                  ref={inputRef}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-6 text-sm flex-1"
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-green-100 hover:text-green-600 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveEdit();
                  }}
                  title="Save changes"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-red-100 hover:text-red-600 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelEdit();
                  }}
                  title="Cancel editing"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center flex-1 min-w-0">
                {/* Edit button - shows on hover, positioned on the left */}
                {isHoveringTitle && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 mr-1 opacity-80 hover:opacity-100 hover:bg-primary/10 hover:text-primary flex-shrink-0"
                    onClick={handleStartEdit}
                    title="Edit title"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                
                <div 
                  className="flex-1 min-w-0"
                  onMouseEnter={() => setIsHoveringTitle(true)}
                  onMouseLeave={() => setIsHoveringTitle(false)}
                >
                  <h3 
                    className={`text-sm font-medium truncate transition-colors duration-200 ${
                      isHoveringTitle ? 'cursor-text text-primary' : 'cursor-pointer'
                    }`}
                    title={item.title}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%'
                    }}
                  >
                    {item.title}
                  </h3>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1 text-xs text-muted-foreground ml-2 flex-shrink-0">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(new Date(item.created_at).getTime())}</span>
          </div>
        </div>
        
        <div className="flex items-end justify-between">
          <p 
            className="whitespace-pre-line text-xs text-muted-foreground leading-relaxed pr-2 flex-1"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {truncatedPreview}
          </p>
          
          {/* Delete button - only show when not editing */}
          {!isEditing && (
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive" 
                onClick={handleDeleteClick}
                title="Delete thread"
              >
                <Trash className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
ChatHistoryItem.displayName = 'ChatHistoryItem';

const ChatHistoryItemSkeleton = memo(() => (
  <div className="p-3 mx-2 mb-2">
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center space-x-2 flex-1">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
    <Skeleton className="h-3 w-full mb-1" />
    <Skeleton className="h-3 w-3/4" />
  </div>
));
ChatHistoryItemSkeleton.displayName = 'ChatHistoryItemSkeleton';

const EmptyState = memo<{ searchQuery?: string; selectedCategory?: string }>(
  ({ searchQuery, selectedCategory }) => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center h-full">
      <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        {searchQuery || (selectedCategory && selectedCategory !== 'all')
          ? 'No matching chats found'
          : 'No chat history yet'}
      </h3>
      <p className="text-xs text-muted-foreground max-w-[200px]">
        {searchQuery || (selectedCategory && selectedCategory !== 'all')
          ? 'Try adjusting your search or filter criteria'
          : 'Start a conversation to see your chat history here'}
      </p>
    </div>
  )
);
EmptyState.displayName = 'EmptyState';

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString();
}

export const ChatHistoryList = memo<ChatHistoryListProps>(({
  items,
  messages,
  onItemClick,
  onDeleteItem,
  onUpdateItem,
  selectedItemId,
  isLoading = false,
  error = null,
  searchQuery,
  selectedCategory,
  className = '',
}) => {
  const listData = useMemo(() => ({
    items,
    messages,
    onItemClick,
    onDeleteItem,
    onUpdateItem,
    selectedItemId,
  }), [items, messages, onItemClick, onDeleteItem, onUpdateItem, selectedItemId]);

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load chat history: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex-1 overflow-hidden ${className}`}>
        <ScrollArea className="h-full">
          <div className="py-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <ChatHistoryItemSkeleton key={index} />
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`flex-1 ${className}`}>
        <EmptyState
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
        />
      </div>
    );
  }

  return (
    <ScrollArea className={`h-full ${className}`}>
      <div className="py-2">
        {items.map((item) => (
          <ChatHistoryItem
            key={item.id}
            index={items.indexOf(item)}
            data={{
              items,
              messages,
              onItemClick,
              onDeleteItem,
              onUpdateItem,
              selectedItemId,
            }}
          />
        ))}
      </div>
    </ScrollArea>
  );
});
ChatHistoryList.displayName = 'ChatHistoryList';
