import { create } from "zustand";
import type { PriceUpdate } from "@/types";

interface PriceState {
  // Map of marketId -> latest prices per platform
  prices: Record<string, { yesPrice: number; noPrice: number; timestamp: number }>;
  // Track which prices just changed for flash animations
  flashStates: Record<string, "up" | "down" | null>;

  updatePrice: (update: PriceUpdate) => void;
  updatePrices: (updates: PriceUpdate[]) => void;
  clearFlash: (marketId: string) => void;
  getPrice: (marketId: string) => { yesPrice: number; noPrice: number } | undefined;
}

function priceKey(marketId: string): string {
  return marketId;
}

export const usePriceStore = create<PriceState>((set, get) => ({
  prices: {},
  flashStates: {},

  updatePrice: (update) => {
    const key = priceKey(update.marketId);
    const current = get().prices[key];
    const direction = current
      ? update.yesPrice > current.yesPrice
        ? "up"
        : update.yesPrice < current.yesPrice
          ? "down"
          : null
      : null;

    set((state) => ({
      prices: {
        ...state.prices,
        [key]: {
          yesPrice: update.yesPrice,
          noPrice: update.noPrice,
          timestamp: update.timestamp,
        },
      },
      flashStates: {
        ...state.flashStates,
        [key]: direction,
      },
    }));

    // Auto-clear flash after animation duration
    if (direction) {
      setTimeout(() => get().clearFlash(key), 600);
    }
  },

  updatePrices: (updates) => {
    const newPrices: typeof get extends () => infer S
      ? S extends { prices: infer P }
        ? P
        : never
      : never = { ...get().prices };
    const newFlashes: Record<string, "up" | "down" | null> = {
      ...get().flashStates,
    };

    for (const update of updates) {
      const key = priceKey(update.marketId);
      const current = newPrices[key];
      const direction = current
        ? update.yesPrice > current.yesPrice
          ? "up"
          : update.yesPrice < current.yesPrice
            ? "down"
            : null
        : null;

      newPrices[key] = {
        yesPrice: update.yesPrice,
        noPrice: update.noPrice,
        timestamp: update.timestamp,
      };
      newFlashes[key] = direction;

      if (direction) {
        setTimeout(() => get().clearFlash(key), 600);
      }
    }

    set({ prices: newPrices, flashStates: newFlashes });
  },

  clearFlash: (marketId) => {
    set((state) => ({
      flashStates: { ...state.flashStates, [marketId]: null },
    }));
  },

  getPrice: (marketId) => {
    return get().prices[priceKey(marketId)];
  },
}));
