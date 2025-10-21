import React from 'react';
import { AssistantApp } from '@/components/apps/assistant-app';
import { ChatHistorySidebar } from '@/components/assistant/chat-history-sidebar';

/**
 * Assistant Page Component
 * 
 * Main route for the Assistant experience, combining the chat interface
 * with the collapsible history sidebar.
 * Accessible at /portal/assistant
 */
const AssistantPage: React.FC = () => {
  return (
    <div className="flex h-full">
      <ChatHistorySidebar />
      <main className="flex-1 flex flex-col min-h-0">
        <AssistantApp />
      </main>
    </div>
  );
};

export default AssistantPage;