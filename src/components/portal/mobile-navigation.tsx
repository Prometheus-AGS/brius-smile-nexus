import React from 'react';
import { Home, MessageSquare } from 'lucide-react';
import { useNavigation } from '@/hooks/use-navigation';

const menuItems = [
  { id: 'home', title: 'Home', icon: Home, url: '/portal' },
  { id: 'assistant', title: 'Assistant', icon: MessageSquare, url: '/portal/assistant' },
];

export const MobileNavigation: React.FC = () => {
  const { navigateTo, isActive } = useNavigation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-brius-gray/20 md:hidden">
      <div className="flex justify-around items-center h-16">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.url);
          
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.url)}
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${
                active
                  ? 'text-brius-primary'
                  : 'text-brius-gray hover:text-brius-primary'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-body">{item.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
