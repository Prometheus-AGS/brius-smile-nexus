/**
 * Business Intelligence Assistant Chat Component
 * 
 * Updated to use Mastra client while maintaining existing interface
 * This component now delegates to the new MastraBIChat component
 */

import React from 'react';
import MastraBIChat from './mastra-bi-chat';

// ============================================================================
// Component Types
// ============================================================================

interface BIAssistantChatProps {
  className?: string;
  placeholder?: string;
  maxHeight?: string;
  showSuggestions?: boolean;
  agentId?: string;
  resourceId?: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * BIAssistantChat component that wraps the new MastraBIChat
 * This maintains backward compatibility while using the new Mastra implementation
 */
export const BIAssistantChat: React.FC<BIAssistantChatProps> = ({
  className = '',
  placeholder = 'Ask me about your business intelligence data...',
  maxHeight = '600px',
  showSuggestions = true,
  agentId = 'business-intelligence',
  resourceId = 'default'
}) => {
  return (
    <MastraBIChat
      className={className}
      placeholder={placeholder}
      maxHeight={maxHeight}
      showSuggestions={showSuggestions}
      agentId={agentId}
      resourceId={resourceId}
    />
  );
};

export default BIAssistantChat;