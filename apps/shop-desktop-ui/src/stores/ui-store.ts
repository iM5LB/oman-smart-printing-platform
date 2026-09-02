import { create } from 'zustand';

type UiState = {
  sidebarCollapsed: boolean;
  authenticated: boolean;
  selectedOrderId: string | null;
  toggleSidebar: () => void;
  setAuthenticated: (v: boolean) => void;
  setSelectedOrderId: (id: string | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  authenticated: false,
  selectedOrderId: null,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setAuthenticated: (authenticated) => set({ authenticated }),
  setSelectedOrderId: (selectedOrderId) => set({ selectedOrderId }),
}));
