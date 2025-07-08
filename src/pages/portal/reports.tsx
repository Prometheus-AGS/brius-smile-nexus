import React from 'react';
import { ReportsApp } from '@/components/apps/reports-app';

/**
 * Reports Page Component
 * 
 * Route page that wraps the ReportsApp component.
 * Accessible at /portal/reports
 */
const ReportsPage: React.FC = () => {
  return <ReportsApp />;
};

export default ReportsPage;