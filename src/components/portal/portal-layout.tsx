
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { PortalHeader } from './portal-header';
import { MobileNavigation } from './mobile-navigation';
import { useNavigation } from '@/hooks/use-navigation';
import { HomeApp } from '@/components/apps/home-app';
import { AssistantApp } from '@/components/apps/assistant-app';
import { LibraryApp } from '@/components/apps/library-app';
import { OrdersApp } from '@/components/apps/orders-app';
import { ReportsApp } from '@/components/apps/reports-app';

const appComponents = {
  home: HomeApp,
  assistant: AssistantApp,
  library: LibraryApp,
  orders: OrdersApp,
  reports: ReportsApp,
};

export const PortalLayout: React.FC = () => {
  const { currentApp } = useNavigation();
  const CurrentAppComponent = appComponents[currentApp as keyof typeof appComponents] || HomeApp;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <PortalHeader />
          <main className="flex-1 p-6 pb-20 md:pb-6 overflow-y-auto">
            <CurrentAppComponent />
          </main>
        </div>
        <MobileNavigation />
      </div>
    </SidebarProvider>
  );
};
