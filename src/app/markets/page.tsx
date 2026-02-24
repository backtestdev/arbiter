"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { MarketCard, MarketCardSkeleton } from "@/components/market/market-card";
import { TradePanel } from "@/components/trade/trade-panel";
import { usePriceStream } from "@/hooks/use-price-stream";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import type { Market, UnifiedMarket } from "@/types";

const CATEGORIES = ["All", "Politics", "Crypto", "Economics", "Finance", "Technology"] as const;

interface MarketSyncResponse {
  markets: Market[];
  syncedAt: string;
  count: number;
}

function buildUnifiedMarkets(markets: Market[]): UnifiedMarket[] {
  const matched = new Map<string, UnifiedMarket>();
  const unmatched: Market[] = [];

  for (const market of markets) {
    if (market.matchedMarketId) {
      const existingId = market.matchedMarketId;
      const existing = matched.get(existingId) || matched.get(market.id);

      if (existing) {
        if (market.platform === "KALSHI") {
          existing.kalshi = market;
        } else {
          existing.polymarket = market;
        }
        // Recalculate spread
        if (existing.kalshi && existing.polymarket) {
          existing.spread =
            Math.abs(existing.kalshi.yesPrice - existing.polymarket.yesPrice) * 100;
          const costAB = existing.kalshi.yesPrice + existing.polymarket.noPrice;
          const costBA = existing.polymarket.yesPrice + existing.kalshi.noPrice;
          existing.hasArbitrage = Math.min(costAB, costBA) < 0.99;
        }
        matched.set(market.id, existing);
      } else {
        const unified: UnifiedMarket = {
          id: market.id,
          title: market.title,
          description: market.description,
          category: market.category,
          closingTime: market.closingTime,
          kalshi: market.platform === "KALSHI" ? market : null,
          polymarket: market.platform === "POLYMARKET" ? market : null,
          spread: null,
          hasArbitrage: false,
        };
        matched.set(market.id, unified);
      }
    } else {
      unmatched.push(market);
    }
  }

  // Add unmatched markets
  for (const market of unmatched) {
    if (!matched.has(market.id)) {
      matched.set(market.id, {
        id: market.id,
        title: market.title,
        description: market.description,
        category: market.category,
        closingTime: market.closingTime,
        kalshi: market.platform === "KALSHI" ? market : null,
        polymarket: market.platform === "POLYMARKET" ? market : null,
        spread: null,
        hasArbitrage: false,
      });
    }
  }

  return Array.from(matched.values());
}

export default function MarketsPage() {
  usePriceStream();

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const { tradePanelOpen, tradePanelMarketId, openTradePanel, closeTradePanel } = useUIStore();

  const { data, isLoading } = useQuery<MarketSyncResponse>({
    queryKey: ["markets"],
    queryFn: async () => {
      const res = await fetch("/api/markets/sync");
      if (!res.ok) throw new Error("Failed to fetch markets");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const unifiedMarkets = useMemo(() => {
    if (!data?.markets) return [];
    return buildUnifiedMarkets(data.markets);
  }, [data]);

  const filteredMarkets = useMemo(() => {
    let markets = unifiedMarkets;

    if (activeCategory !== "All") {
      markets = markets.filter((m) => m.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      markets = markets.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
      );
    }

    return markets;
  }, [unifiedMarkets, activeCategory, searchQuery]);

  return (
    <>
      <PageHeader
        title="Markets"
        subtitle={`${unifiedMarkets.length} markets across Kalshi and Polymarket`}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200",
                activeCategory === cat
                  ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                  : "bg-arbiter-surface text-text-secondary border border-arbiter-border-subtle hover:text-text-primary hover:bg-arbiter-elevated"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search markets..."
            className="arbiter-input"
          />
        </div>
      </div>

      {/* Market grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <MarketCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredMarkets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-arbiter-elevated flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-text-secondary">No markets found</p>
          <p className="text-sm text-text-muted mt-1">
            Try adjusting your filters or search query
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredMarkets.map((market, i) => (
              <motion.div
                key={market.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                layout
              >
                <MarketCard
                  market={market}
                  onTrade={() => openTradePanel(market.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <TradePanel
        isOpen={tradePanelOpen}
        marketId={tradePanelMarketId}
        onClose={closeTradePanel}
      />
    </>
  );
}
