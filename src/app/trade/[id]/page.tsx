"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { PriceChart } from "@/components/market/price-chart";
import { usePriceStream } from "@/hooks/use-price-stream";
import { usePriceFlash } from "@/hooks/use-price-flash";
import { cn, formatPrice, formatCompactNumber } from "@/lib/utils";
import { useCountdown } from "@/hooks/use-countdown";
import type { Market } from "@/types";

interface MarketSyncResponse {
  markets: Market[];
}

// Generate mock price history
function generatePriceHistory(basePrice: number, points = 48): { timestamp: number; price: number }[] {
  const now = Date.now();
  const data: { timestamp: number; price: number }[] = [];
  let price = basePrice - 0.1 + Math.random() * 0.05;

  for (let i = points; i >= 0; i--) {
    price += (Math.random() - 0.48) * 0.02;
    price = Math.max(0.05, Math.min(0.95, price));
    data.push({
      timestamp: now - i * 30 * 60 * 1000, // 30-min intervals
      price: Math.round(price * 100) / 100,
    });
  }
  return data;
}

function MarketPriceDisplay({ market, label }: { market: Market; label: string }) {
  const yesFlash = usePriceFlash(market.yesPrice);
  const noFlash = usePriceFlash(market.noPrice);

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-secondary">{label}</h3>
        <span className={cn(
          "arbiter-badge",
          market.platform === "KALSHI" ? "bg-indigo-500/10 text-indigo-400" : "bg-purple-500/10 text-purple-400"
        )}>
          {market.platform}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={cn(
          "price-tile price-tile-yes text-lg",
          yesFlash === "up" && "animate-flash-green",
          yesFlash === "down" && "animate-flash-red"
        )}>
          Yes {formatPrice(market.yesPrice)}
        </div>
        <div className={cn(
          "price-tile price-tile-no text-lg",
          noFlash === "up" && "animate-flash-green",
          noFlash === "down" && "animate-flash-red"
        )}>
          No {formatPrice(market.noPrice)}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>Vol: {formatCompactNumber(market.volume24h)}</span>
        <span>Liq: {formatCompactNumber(market.liquidity)}</span>
      </div>
    </div>
  );
}

export default function TradePage() {
  usePriceStream();
  const params = useParams();
  const marketId = params.id as string;

  const { data } = useQuery<MarketSyncResponse>({
    queryKey: ["markets"],
    queryFn: async () => {
      const res = await fetch("/api/markets/sync");
      if (!res.ok) throw new Error("Failed to fetch markets");
      return res.json();
    },
  });

  const market = data?.markets.find((m) => m.id === marketId);
  const matchedMarket = market?.matchedMarketId
    ? data?.markets.find((m) => m.id === market.matchedMarketId)
    : null;

  const countdown = useCountdown(
    market?.closingTime ? new Date(market.closingTime) : new Date()
  );

  if (!market) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="skeleton h-8 w-64 mb-4" />
        <div className="skeleton h-4 w-48" />
      </div>
    );
  }

  const priceHistory = generatePriceHistory(market.yesPrice);

  return (
    <>
      <PageHeader
        title={market.title}
        subtitle={`${market.category} · Closes ${countdown.formatted}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-2 glass rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Price History</h2>
            <div className="flex gap-2">
              {["24h", "7d", "30d"].map((period) => (
                <button
                  key={period}
                  className="px-3 py-1 rounded-lg text-xs font-medium text-text-muted
                             hover:text-text-secondary hover:bg-arbiter-elevated transition-colors"
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <PriceChart data={priceHistory} height={300} showTooltip />
        </motion.div>

        {/* Price panels */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <MarketPriceDisplay market={market} label="Primary Market" />
          </motion.div>

          {matchedMarket && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <MarketPriceDisplay market={matchedMarket} label="Matched Market" />
            </motion.div>
          )}

          {/* Trade button */}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="arbiter-btn-primary w-full py-3.5 text-base"
          >
            Trade This Market
          </motion.button>
        </div>
      </div>
    </>
  );
}
