
import { create } from 'zustand';

interface NavigationState {
  currentApp: string;
  sidebarOpen: boolean;
  setCurrentApp: (app: string) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentApp: 'home',
  sidebarOpen: true,
  setCurrentApp: (app: string) => set({ currentApp: app }),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
