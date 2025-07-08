/**
 * Composer component that provides message input functionality
 * Handles text input, send actions, and loading states
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send, Loader2, Square } from 'lucide-react';
import type { ComposerProps } from '@/types/assistant';
import { cn } from '@/lib/utils';

/**
 * Composer component provides message input and send functionality
 */
export const Composer: React.FC<ComposerProps> = ({
  onSendMessage,
  isLoading = false,
  isStreaming = false,
  placeholder = 'Type your message...',
  className
}) => {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Auto-resize textarea based on content
   */
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

  /**
   * Handle send message
   */
  const handleSendMessage = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading || isStreaming) return;

    try {
      setIsComposing(true);
      await onSendMessage(trimmedMessage);
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsComposing(false);
    }
  }, [message, isLoading, isStreaming, onSendMessage]);

  /**
   * Handle key press events
   */
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow new line with Shift+Enter
        return;
      } else {
        // Send message with Enter
        e.preventDefault();
        handleSendMessage();
      }
    }
  }, [handleSendMessage]);

  /**
   * Focus textarea on mount
   */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  /**
   * Adjust height when message changes
   */
  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  const canSend = message.trim().length > 0 && !isLoading && !isStreaming;
  const showLoading = isLoading || isComposing;

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex gap-3 items-end">
        {/* Message Input */}
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading || isStreaming}
            className={cn(
              'min-h-[44px] max-h-[200px] resize-none',
              'border-0 shadow-none focus-visible:ring-0',
              'bg-transparent placeholder:text-muted-foreground'
            )}
            rows={1}
          />
          
          {/* Character count for long messages */}
          {message.length > 500 && (
            <div className="text-xs text-muted-foreground mt-1 text-right">
              {message.length}/2000
            </div>
          )}
        </div>

        {/* Send Button */}
        <div className="flex gap-2">
          {isStreaming && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // In a real implementation, this would stop the streaming
                console.log('Stop streaming requested');
              }}
              className="h-10 w-10 p-0"
            >
              <Square className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            onClick={handleSendMessage}
            disabled={!canSend}
            size="sm"
            className="h-10 w-10 p-0"
          >
            {showLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
        <span>
          Press Enter to send, Shift+Enter for new line
        </span>
        
        {(isLoading || isStreaming) && (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {isStreaming ? 'Streaming response...' : 'Sending...'}
          </span>
        )}
      </div>
    </Card>
  );
};

export default Composer;