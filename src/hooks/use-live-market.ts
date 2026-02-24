"use client";

import { useMemo } from "react";
import { usePriceStore } from "@/stores/price-store";
import type { Market, UnifiedMarket } from "@/types";

/**
 * Merges live SSE price updates into a single Market object.
 * Returns the original market with prices overridden by the latest stream data.
 */
export function useLiveMarket(market: Market | null): Market | null {
  const prices = usePriceStore((s) => s.prices);

  return useMemo(() => {
    if (!market) return null;

    const live = prices[market.id];
    if (!live) return market;

    return {
      ...market,
      yesPrice: live.yesPrice,
      noPrice: live.noPrice,
      lastUpdated: new Date(live.timestamp),
    };
  }, [market, prices]);
}

/**
 * Applies live price updates to a list of markets, returning updated UnifiedMarkets.
 * This re-calculates spreads and arbitrage flags using the latest stream prices.
 */
export function useLiveUnifiedMarkets(markets: UnifiedMarket[]): UnifiedMarket[] {
  const prices = usePriceStore((s) => s.prices);

  return useMemo(() => {
    return markets.map((m) => {
      const kalshiLive = m.kalshi ? prices[m.kalshi.id] : undefined;
      const polyLive = m.polymarket ? prices[m.polymarket.id] : undefined;

      // If no live updates, return as-is
      if (!kalshiLive && !polyLive) return m;

      const kalshi = m.kalshi
        ? kalshiLive
          ? { ...m.kalshi, yesPrice: kalshiLive.yesPrice, noPrice: kalshiLive.noPrice }
          : m.kalshi
        : null;

      const polymarket = m.polymarket
        ? polyLive
          ? { ...m.polymarket, yesPrice: polyLive.yesPrice, noPrice: polyLive.noPrice }
          : m.polymarket
        : null;

      // Recalculate spread and arbitrage with live prices
      let spread: number | null = null;
      let hasArbitrage = false;

      if (kalshi && polymarket) {
        spread = Math.abs(kalshi.yesPrice - polymarket.yesPrice) * 100;
        const costAB = kalshi.yesPrice + polymarket.noPrice;
        const costBA = polymarket.yesPrice + kalshi.noPrice;
        hasArbitrage = Math.min(costAB, costBA) < 0.99;
      }

      return { ...m, kalshi, polymarket, spread, hasArbitrage };
    });
  }, [markets, prices]);
}
