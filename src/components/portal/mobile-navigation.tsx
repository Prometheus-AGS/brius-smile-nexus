
import React from 'react';
import { Home, MessageSquare, BookOpen, BarChart3, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigation } from '@/hooks/use-navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const primaryItems = [
  { id: 'home', title: 'Home', icon: Home },
  { id: 'assistant', title: 'Assistant', icon: MessageSquare },
  { id: 'library', title: 'Library', icon: BookOpen },
  { id: 'reports', title: 'Reports', icon: BarChart3 },
];

const secondaryItems = [
  // Empty for now - can be used for additional items later
];

export const MobileNavigation: React.FC = () => {
  const { currentApp, setCurrentApp } = useNavigation();

  const handleItemClick = (appId: string) => {
    setCurrentApp(appId);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brius-gray/20 px-4 py-2">
      <div className="flex items-center justify-around">
        {primaryItems.map((item) => (
          <Button
            key={item.id}
            variant={currentApp === item.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleItemClick(item.id)}
            className="flex-col h-auto py-2 px-3"
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="text-xs font-body">{item.title}</span>
          </Button>
        ))}
        
        {secondaryItems.length > 0 && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="flex-col h-auto py-2 px-3">
                <MoreHorizontal className="h-5 w-5 mb-1" />
                <span className="text-xs font-body">More</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <div className="grid grid-cols-2 gap-4 py-4">
                {secondaryItems.map((item) => (
                  <Button
                    key={item.id}
                    variant={currentApp === item.id ? 'default' : 'outline'}
                    onClick={() => handleItemClick(item.id)}
                    className="flex items-center gap-2 h-12 font-body"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.title}
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  );
};
