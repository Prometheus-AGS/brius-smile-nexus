/**
 * Message component that renders individual chat messages
 * Supports both user and assistant messages with proper styling
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Bot, Clock } from 'lucide-react';
import type { MessageProps } from '@/types/assistant';
import { cn } from '@/lib/utils';

/**
 * Format timestamp for display
 */
const formatTimestamp = (timestamp: Date): string => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return timestamp.toLocaleDateString();
};

/**
 * Message component renders individual chat messages
 */
export const Message: React.FC<MessageProps> = ({
  message,
  className
}) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div className={cn('flex gap-4 group', className)}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage 
            src={isUser ? undefined : '/bot-avatar.png'} 
            alt={isUser ? 'User' : 'Assistant'} 
          />
          <AvatarFallback className={cn(
            'text-xs font-medium',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
          )}>
            {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Message Content */}
      <div className="flex-1 space-y-2">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isUser ? 'You' : 'Assistant'}
          </span>
          
          {/* Role Badge */}
          {isAssistant && (
            <Badge variant="secondary" className="text-xs">
              AI
            </Badge>
          )}
          
          {/* Timestamp */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <Clock className="h-3 w-3" />
            <span>{formatTimestamp(message.timestamp)}</span>
          </div>
        </div>

        {/* Message Body */}
        <Card className={cn(
          'p-3 max-w-none',
          isUser 
            ? 'bg-primary text-primary-foreground ml-0' 
            : 'bg-muted'
        )}>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {/* Basic message content - in a real app you might want markdown rendering */}
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
            
            {/* Metadata display for debugging */}
            {message.metadata && Object.keys(message.metadata).length > 0 && (
              <details className="mt-2 text-xs opacity-70">
                <summary className="cursor-pointer">Metadata</summary>
                <pre className="mt-1 text-xs bg-background/10 p-2 rounded">
                  {JSON.stringify(message.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </Card>

        {/* Thread ID indicator (for debugging) */}
        {message.threadId && process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted-foreground opacity-50">
            Thread: {message.threadId}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;