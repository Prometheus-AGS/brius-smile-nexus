
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useNavigation } from '@/hooks/use-navigation';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Settings } from 'lucide-react';

const appTitles = {
  home: 'Dashboard',
  assistant: 'AI Assistant',
  library: 'Knowledge Library',
  orders: 'Order Management',
  reports: 'Reports & Analytics',
  profile: 'Profile',
  settings: 'Settings',
};

export const PortalHeader: React.FC = () => {
  const { currentApp, setCurrentApp } = useNavigation();
  const { user } = useAuth();

  const handleNavigate = (path: string) => {
    if (path === '/profile') {
      setCurrentApp('profile');
    } else if (path === '/settings') {
      setCurrentApp('settings');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 cursor-pointer hover:bg-brius-gray/10 rounded-lg p-2 transition-colors">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="bg-brius-primary text-white font-display">
                  {user?.name ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <div className="text-sm font-display font-medium text-brius-black">
                  {user?.name}
                </div>
                <div className="text-xs text-brius-gray font-body">
                  {user?.role}
                </div>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem 
              onClick={() => handleNavigate('/profile')}
              className="cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleNavigate('/settings')}
              className="cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
