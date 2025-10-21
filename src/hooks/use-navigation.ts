
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigationStore } from '@/stores/navigation-store';

/**
 * Navigation Hook
 *
 * Provides navigation utilities that work with React Router and Zustand.
 * Handles both route navigation and UI state management.
 */
export const useNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useNavigationStore();

  /**
   * Navigate to a specific route
   */
  const navigateTo = (path: string) => {
    navigate(path);
  };

  /**
   * Check if a route is currently active
   */
  const isActive = (path: string) => {
    // Handle exact match for portal home route
    if (path === '/portal' && location.pathname === '/portal') {
      return true;
    }
    // Handle other portal routes
    return location.pathname === path;
  };

  /**
   * Get the current route path
   */
  const currentPath = location.pathname;

  /**
   * Check if we're currently in the portal
   */
  const isInPortal = location.pathname.startsWith('/portal');

  /**
   * Get the current app from the route path
   */
  const currentApp = location.pathname.split('/')[2] || 'home';

  return {
    // Navigation functions
    navigateTo,
    isActive,
    
    // Route information
    currentPath,
    currentApp,
    isInPortal,
    
    // Sidebar state management
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
  };
};
