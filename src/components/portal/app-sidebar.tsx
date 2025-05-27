
import React from 'react';
import { Home, MessageSquare, BookOpen, Package, BarChart3, Menu } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/ui/logo';
import { useNavigation } from '@/hooks/use-navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

const menuItems = [
  {
    id: 'home',
    title: 'Home',
    icon: Home,
    url: '/portal/home',
  },
  {
    id: 'assistant',
    title: 'Assistant',
    icon: MessageSquare,
    url: '/portal/assistant',
  },
  {
    id: 'library',
    title: 'Library',
    icon: BookOpen,
    url: '/portal/library',
  },
  {
    id: 'orders',
    title: 'Orders',
    icon: Package,
    url: '/portal/orders',
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: BarChart3,
    url: '/portal/reports',
  },
];

export const AppSidebar: React.FC = () => {
  const { currentApp, setCurrentApp } = useNavigation();
  const { user, logout } = useAuth();

  const handleMenuClick = (appId: string) => {
    setCurrentApp(appId);
  };

  return (
    <Sidebar className="border-r border-brius-gray/20">
      <SidebarHeader className="border-b border-brius-gray/20 p-4">
        <div className="flex items-center justify-between">
          <Logo />
          <SidebarTrigger className="md:hidden">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleMenuClick(item.id)}
                    isActive={currentApp === item.id}
                    className="font-body"
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-brius-gray/20 p-4">
        <div className="space-y-2">
          <div className="text-sm font-body">
            <div className="font-semibold text-brius-black">{user?.name}</div>
            <div className="text-brius-gray">{user?.role}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="w-full font-body"
          >
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
