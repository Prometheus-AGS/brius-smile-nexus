/**
 * Thread component that displays a conversation thread with messages
 * Handles message rendering, scrolling, and loading states
 */

import React, { useEffect, useRef } from 'react';
import { Message } from './message';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import type { ThreadProps } from '@/types/assistant';
import { cn } from '@/lib/utils';

/**
 * Thread component displays a list of messages in a conversation
 */
export const Thread: React.FC<ThreadProps> = ({
  messages,
  isLoading = false,
  isStreaming = false,
  className
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  /**
   * Auto-scroll to bottom when new messages arrive or streaming starts
   */
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, []);

  /**
   * Show empty state when no messages
   */
  if (messages.length === 0 && !isLoading) {
    return (
      <div className={cn('flex-1 flex items-center justify-center', className)}>
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">No messages yet</p>
          <p className="text-sm">Start a conversation by sending a message below.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex-1 flex flex-col', className)}>
      <ScrollArea 
        ref={scrollAreaRef}
        className="flex-1 px-4 py-6"
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Render Messages */}
          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              className="w-full"
            />
          ))}

          {/* Loading Indicator */}
          {(isLoading || isStreaming) && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">
                  {isStreaming ? 'Assistant is typing...' : 'Loading...'}
                </span>
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={bottomRef} className="h-1" />
        </div>
      </ScrollArea>
    </div>
  );
};

export default Thread;
