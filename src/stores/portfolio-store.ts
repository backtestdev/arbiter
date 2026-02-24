import { create } from "zustand";
import type { Position, PortfolioSummary, Platform } from "@/types";

interface PortfolioState {
  positions: Position[];
  summary: PortfolioSummary;
  isLoading: boolean;

  setPositions: (positions: Position[]) => void;
  updatePosition: (position: Position) => void;
  removePosition: (positionId: string) => void;
  setSummary: (summary: PortfolioSummary) => void;
  setLoading: (loading: boolean) => void;
  getPositionsByPlatform: (platform: Platform) => Position[];
}

const defaultSummary: PortfolioSummary = {
  totalValue: 0,
  totalPnl: 0,
  totalPnlPercent: 0,
  kalshiValue: 0,
  polymarketValue: 0,
  openPositions: 0,
};

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  positions: [],
  summary: defaultSummary,
  isLoading: true,

  setPositions: (positions) => set({ positions }),

  updatePosition: (updated) =>
    set((state) => ({
      positions: state.positions.map((p) =>
        p.id === updated.id ? updated : p
      ),
    })),

  removePosition: (positionId) =>
    set((state) => ({
      positions: state.positions.filter((p) => p.id !== positionId),
    })),

  setSummary: (summary) => set({ summary }),
  setLoading: (isLoading) => set({ isLoading }),

  getPositionsByPlatform: (platform) =>
    get().positions.filter((p) => p.platform === platform),
}));
