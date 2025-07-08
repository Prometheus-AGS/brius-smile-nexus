import React from 'react';
import { LibraryApp } from '@/components/apps/library-app';

/**
 * Library Page Component
 * 
 * Route page that wraps the LibraryApp component.
 * Accessible at /portal/library
 */
const LibraryPage: React.FC = () => {
  return <LibraryApp />;
};

export default LibraryPage;