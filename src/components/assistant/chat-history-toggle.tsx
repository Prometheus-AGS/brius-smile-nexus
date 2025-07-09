/**
 * Chat History Toggle Component
 * Header toggle button component for opening the chat history sidebar
 */

import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatSidebarActions } from '@/hooks/use-chat-sidebar';

export interface ChatHistoryToggleProps {
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
}

/**
 * Chat history toggle button component
 * Displays in the header to open the chat history sidebar
 */
export const ChatHistoryToggle = memo<ChatHistoryToggleProps>(({
  isOpen,
  onToggle,
  className,
}) => {
  const { setOpen } = useChatSidebarActions();

  const handleToggle = useCallback(() => {
    console.log('[ChatHistoryToggle] Toggle clicked:', {
      isOpen,
      hasOnToggleProp: !!onToggle,
      timestamp: new Date().toISOString()
    });
    
    // Use the onToggle prop if provided, otherwise use the store action
    if (onToggle) {
      console.log('[ChatHistoryToggle] Using onToggle prop');
      onToggle();
    } else {
      console.log('[ChatHistoryToggle] Using store setOpen action');
      setOpen(!isOpen);
    }
  }, [onToggle, setOpen, isOpen]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className={cn(
        'flex items-center gap-2 transition-all duration-200',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isOpen && 'bg-accent text-accent-foreground',
        className
      )}
      aria-label={isOpen ? 'Close chat history' : 'Open chat history'}
      title={isOpen ? 'Close chat history' : 'Open chat history'}
    >
      <History className="h-4 w-4 flex-shrink-0" />
    </Button>
  );
});

ChatHistoryToggle.displayName = 'ChatHistoryToggle';