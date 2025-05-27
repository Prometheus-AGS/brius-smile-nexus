
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useNavigation } from '@/hooks/use-navigation';
import { useAuth } from '@/hooks/use-auth';

const appTitles = {
  home: 'Dashboard',
  assistant: 'AI Assistant',
  library: 'Knowledge Library',
  orders: 'Order Management',
  reports: 'Reports & Analytics',
};

export const PortalHeader: React.FC = () => {
  const { currentApp } = useNavigation();
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-brius-gray/20 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="hidden md:flex" />
          <div>
            <h1 className="text-xl font-display font-medium text-brius-black">
              {appTitles[currentApp as keyof typeof appTitles] || 'Portal'}
            </h1>
            <p className="text-sm text-brius-gray font-body">
              Welcome back, {user?.name}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
