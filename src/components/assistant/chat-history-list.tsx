/**
 * Chat History List Component
 * Displays a virtualized list of chat history items with performance optimization
 */

import { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Clock, Trash, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Thread } from '@/stores/assistant/chat-store';

interface ChatHistoryListProps {
  items: Thread[];
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
  style: React.CSSProperties;
  data: {
    items: Thread[];
    onItemClick: (item: Thread) => void;
    onDeleteItem: (threadId: string) => void;
    onUpdateItem: (threadId: string, updates: Partial<Thread>) => void;
    selectedItemId?: string | null;
  };
}

const ChatHistoryItem = memo<ChatHistoryItemProps>(({ index, style, data }) => {
  const { items, onItemClick, onDeleteItem, onUpdateItem, selectedItemId } = data;
  const item = items[index];
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(item.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleClick = useCallback(() => {
    if (!isEditing) {
      onItemClick(item);
    }
  }, [item, onItemClick, isEditing]);

  const handleUpdate = () => {
    if (newTitle.trim() && newTitle.trim() !== item.title) {
      onUpdateItem(item.id, { title: newTitle.trim() });
    }
    setIsEditing(false);
  };

  const isSelected = selectedItemId === item.id;
  const previewText = item.title || 'No preview available';
  const truncatedPreview = previewText.length > 100 ? `${previewText.substring(0, 100)}...` : previewText;

  return (
    <div style={style}>
      <div
        className={`
          group p-3 mx-2 mb-2 rounded-lg border cursor-pointer transition-all duration-200
          hover:bg-accent hover:border-accent-foreground/20
          ${isSelected
            ? 'bg-accent border-accent-foreground/30 shadow-sm'
            : 'bg-background border-border'
          }
        `}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={`Chat: ${item.title}`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {isEditing ? (
              <Input
                ref={inputRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onBlur={handleUpdate}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                className='h-6 text-sm'
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3 className="text-sm font-medium truncate flex-grow" title={item.title}>
                {item.title}
              </h3>
            )}
          </div>
          <div className="flex items-center space-x-1 text-xs text-muted-foreground ml-2">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(new Date(item.created_at).getTime())}</span>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed pr-2">
            {truncatedPreview}
          </p>
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}>
              <Trash className="h-4 w-4" />
            </Button>
          </div>
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
    onItemClick,
    onDeleteItem,
    onUpdateItem,
    selectedItemId,
  }), [items, onItemClick, onDeleteItem, onUpdateItem, selectedItemId]);

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
            style={{}}
            data={{
              items,
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