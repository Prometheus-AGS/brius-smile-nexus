
import { create } from 'zustand';

/**
 * Navigation Store Interface
 *
 * Simplified navigation store that only manages UI state.
 * Route navigation is now handled by React Router.
 */
interface NavigationState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

/**
 * Navigation Store
 *
 * Manages sidebar state and other UI navigation elements.
 * App routing is handled by React Router, not this store.
 */
export const useNavigationStore = create<NavigationState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
