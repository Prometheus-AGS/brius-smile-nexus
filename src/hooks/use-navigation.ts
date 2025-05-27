
import { useNavigationStore } from '@/stores/navigation-store';

export const useNavigation = () => {
  const { currentApp, setCurrentApp } = useNavigationStore();

  return {
    currentApp,
    setCurrentApp,
  };
};
