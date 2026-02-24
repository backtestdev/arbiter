import { create } from "zustand";
import type { ConnectionStatus, Platform } from "@/types";

interface UIState {
  sidebarCollapsed: boolean;
  tradePanelOpen: boolean;
  tradePanelMarketId: string | null;
  connectionModalOpen: boolean;
  connections: Record<Platform, ConnectionStatus>;
  mobileMenuOpen: boolean;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openTradePanel: (marketId: string) => void;
  closeTradePanel: () => void;
  setConnectionModal: (open: boolean) => void;
  setConnectionStatus: (platform: Platform, status: ConnectionStatus) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  tradePanelOpen: false,
  tradePanelMarketId: null,
  connectionModalOpen: false,
  connections: {
    KALSHI: "disconnected",
    POLYMARKET: "disconnected",
  },
  mobileMenuOpen: false,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  openTradePanel: (marketId) =>
    set({ tradePanelOpen: true, tradePanelMarketId: marketId }),

  closeTradePanel: () =>
    set({ tradePanelOpen: false, tradePanelMarketId: null }),

  setConnectionModal: (open) => set({ connectionModalOpen: open }),

  setConnectionStatus: (platform, status) =>
    set((state) => ({
      connections: { ...state.connections, [platform]: status },
    })),

  toggleMobileMenu: () =>
    set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
}));
