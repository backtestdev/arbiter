"use client";

import { useMemo } from "react";
import { usePriceStore } from "@/stores/price-store";
import type { ArbitrageOpportunity } from "@/types";

/**
 * Applies live SSE price updates to arbitrage opportunities,
 * recalculating spreads and estimated profits in real-time.
 * Preserves orderbook depth data from the initial scan.
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

      // Recalculate spread using best ask prices from orderbooks
      const yesAsksA = marketA.orderbook.yes.asks;
      const noAsksA = marketA.orderbook.no.asks;
      const yesAsksB = marketB.orderbook.yes.asks;
      const noAsksB = marketB.orderbook.no.asks;

      let bestBuyPrice = opp.bestBuyPrice;
      let bestSellPrice = opp.bestSellPrice;

      if (opp.yesArb) {
        if (opp.buyPlatform === marketA.platform) {
          bestBuyPrice = yesAsksA[0]?.price ?? opp.bestBuyPrice;
          bestSellPrice = noAsksB[0]?.price ?? opp.bestSellPrice;
        } else {
          bestBuyPrice = yesAsksB[0]?.price ?? opp.bestBuyPrice;
          bestSellPrice = noAsksA[0]?.price ?? opp.bestSellPrice;
        }
      } else {
        if (opp.buyPlatform === marketB.platform) {
          bestBuyPrice = yesAsksB[0]?.price ?? opp.bestBuyPrice;
          bestSellPrice = noAsksA[0]?.price ?? opp.bestSellPrice;
        } else {
          bestBuyPrice = yesAsksA[0]?.price ?? opp.bestBuyPrice;
          bestSellPrice = noAsksB[0]?.price ?? opp.bestSellPrice;
        }
      }

      const combinedCost = bestBuyPrice + bestSellPrice;
      const spreadPerShare = Math.max(0, 1.0 - combinedCost);
      const spreadPercent = parseFloat((spreadPerShare * 100).toFixed(2));
      const maxExecutableProfit = parseFloat(
        (opp.executableDepth.maxSize * spreadPerShare).toFixed(2),
      );

      return {
        ...opp,
        marketA,
        marketB,
        bestBuyPrice,
        bestSellPrice,
        spreadPercent,
        estimatedProfit100: parseFloat((spreadPerShare * 100).toFixed(2)),
        maxExecutableProfit: Math.max(0, maxExecutableProfit),
      };
    });
  }, [opportunities, prices]);
}
