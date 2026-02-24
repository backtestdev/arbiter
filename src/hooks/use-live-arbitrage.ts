"use client";

import { useMemo } from "react";
import { usePriceStore } from "@/stores/price-store";
import type { ArbitrageOpportunity } from "@/types";

/**
 * Applies live SSE price updates to arbitrage opportunities,
 * recalculating spreads and estimated profits in real-time.
 */
export function useLiveArbitrage(
  opportunities: ArbitrageOpportunity[]
): ArbitrageOpportunity[] {
  const prices = usePriceStore((s) => s.prices);

  return useMemo(() => {
    return opportunities.map((opp) => {
      const liveA = prices[opp.marketA.id];
      const liveB = prices[opp.marketB.id];

      // If no live updates, return as-is
      if (!liveA && !liveB) return opp;

      const marketA = liveA
        ? { ...opp.marketA, yesPrice: liveA.yesPrice, noPrice: liveA.noPrice }
        : opp.marketA;

      const marketB = liveB
        ? { ...opp.marketB, yesPrice: liveB.yesPrice, noPrice: liveB.noPrice }
        : opp.marketB;

      // Recalculate spread and profit with live prices
      const spreadYes = Math.abs(marketA.yesPrice - marketB.yesPrice);
      const spreadPercent = parseFloat((spreadYes * 100).toFixed(1));

      const costAB = marketA.yesPrice + marketB.noPrice;
      const costBA = marketB.yesPrice + marketA.noPrice;
      const minCost = Math.min(costAB, costBA);
      const estimatedProfit100 =
        minCost < 1 ? parseFloat(((1 - minCost) * 100).toFixed(2)) : 0;

      const yesArb = costAB < 0.99;
      const noArb = costBA < 0.99;

      return {
        ...opp,
        marketA,
        marketB,
        spreadPercent,
        estimatedProfit100,
        yesArb,
        noArb,
      };
    });
  }, [opportunities, prices]);
}
