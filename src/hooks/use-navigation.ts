
import { useNavigationStore } from '@/stores/navigation-store';

export const useNavigation = () => {
  const { 
    currentApp, 
    sidebarOpen, 
    setCurrentApp, 
    setSidebarOpen, 
    toggleSidebar 
  } = useNavigationStore();

  return {
    currentApp,
    sidebarOpen,
    setCurrentApp,
    setSidebarOpen,
    toggleSidebar,
  };
};
