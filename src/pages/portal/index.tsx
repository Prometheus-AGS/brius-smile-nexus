import React from 'react';
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/portal/app-sidebar';
import { PortalHeader } from '@/components/portal/portal-header';
import { MobileNavigation } from '@/components/portal/mobile-navigation';

/**
 * Portal Layout Component
 *
 * Main layout for authenticated portal pages.
 * This component is protected and requires authentication to access.
 * Contains the portal layout with navigation and uses React Router's Outlet for nested routes.
 */
const PortalLayout: React.FC = () => {
  return (
    <ProtectedRoute
      requiredPermissions={[]}
      redirectTo="/login"
    >
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <PortalHeader />
            <main className="flex-1 p-6 pb-20 md:pb-6 overflow-y-auto">
              <Outlet />
            </main>
          </div>
          <MobileNavigation />
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
};

export default PortalLayout;