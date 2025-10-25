/**
 * Portal Layout Component (DEPRECATED - NOT USED)
 * 
 * This file is kept for reference but is NOT being used.
 * The actual portal layout is in src/pages/portal/index.tsx
 * which uses React Router's <Outlet /> pattern.
 * 
 * DO NOT USE THIS COMPONENT - IT CONFLICTS WITH REACT ROUTER
 */

import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { PortalHeader } from './portal-header';
import { MobileNavigation } from './mobile-navigation';

export const PortalLayout: React.FC = () => {
  console.warn('⚠️ DEPRECATED: portal-layout.tsx is being rendered but should not be used!');
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <PortalHeader />
          <main className="flex-1 p-6 pb-20 md:pb-6 overflow-y-auto">
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <h1 className="text-2xl font-bold text-destructive">
                  Configuration Error
                </h1>
                <p className="text-muted-foreground">
                  Wrong portal layout component is being used.
                  Please use src/pages/portal/index.tsx instead.
                </p>
              </div>
            </div>
          </main>
        </div>
        <MobileNavigation />
      </div>
    </SidebarProvider>
  );
};
