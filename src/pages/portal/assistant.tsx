import React from 'react';
import { AssistantApp } from '@/components/apps/assistant-app';

/**
 * Assistant Page Component
 * 
 * Route page that wraps the AssistantApp component.
 * Accessible at /portal/assistant
 */
const AssistantPage: React.FC = () => {
  return <AssistantApp />;
};

export default AssistantPage;