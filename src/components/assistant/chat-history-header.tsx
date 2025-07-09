/**
 * Chat History Header Component
 * Displays the header for the chat history sidebar
 */

import { memo } from 'react';

export interface ChatHistoryHeaderProps {
  className?: string;
}

/**
 * Header component for the chat history sidebar
 */
export const ChatHistoryHeader = memo<ChatHistoryHeaderProps>(({ className = '' }) => {
  return (
    <div className={`flex items-center justify-between p-4 border-b border-border ${className}`}>
      <h2 className="text-lg font-semibold">Chat History</h2>
    </div>
  );
});

ChatHistoryHeader.displayName = 'ChatHistoryHeader';
