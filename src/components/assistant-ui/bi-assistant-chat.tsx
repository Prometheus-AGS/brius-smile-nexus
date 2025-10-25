/**
 * Business Intelligence Assistant Chat
 * 
 * Wrapper component for the Mastra BI chat interface
 * Uses the new MastraAssistantChat component with real Mastra server connections
 * 
 * MASTRA-ONLY: No fallbacks, connects exclusively to real Mastra servers
 */

import React from 'react';
import { MastraAssistantChat } from './mastra-assistant-chat';

// ============================================================================
// Component Types
// ============================================================================

export interface BIAssistantChatProps {
  className?: string;
  maxHeight?: string;
  debug?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Business Intelligence Assistant Chat Component
 * 
 * Provides a chat interface for business intelligence queries using Mastra agents.
 * This is a thin wrapper around MastraAssistantChat with BI-specific configuration.
 */
export const BIAssistantChat: React.FC<BIAssistantChatProps> = ({
  className = '',
  maxHeight = '600px',
  debug = false,
}) => {
  return (
    <MastraAssistantChat
      className={className}
      maxHeight={maxHeight}
      placeholder="Ask me about your business intelligence data..."
      debug={debug}
    />
  );
};

export default BIAssistantChat;