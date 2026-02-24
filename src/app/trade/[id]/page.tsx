"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { PriceChart, PriceChartSkeleton } from "@/components/market/price-chart";
import { TradePanel } from "@/components/trade/trade-panel";
import { OrderbookDisplay, OrderbookSkeleton } from "@/components/market/orderbook-display";
import { SettlementComparison, SingleSettlementRules } from "@/components/market/settlement-comparison";
import { usePriceStream } from "@/hooks/use-price-stream";
import { useLiveMarket } from "@/hooks/use-live-market";
import { usePriceFlash } from "@/hooks/use-price-flash";
import { cn, formatPrice, formatCompactNumber, formatCurrency, calculateSpread } from "@/lib/utils";
import { useCountdown } from "@/hooks/use-countdown";
import type { Market, Side } from "@/types";

interface MarketSyncResponse {
  markets: Market[];
}

// Generate mock price history with a trending walk toward current price
function generatePriceHistory(
  basePrice: number,
  points = 48
): { timestamp: number; price: number }[] {
  const now = Date.now();
  const data: { timestamp: number; price: number }[] = [];
  let price = basePrice - 0.1 + Math.random() * 0.05;

  for (let i = points; i >= 0; i--) {
    // Drift toward basePrice
    const drift = (basePrice - price) * 0.05;
    price += drift + (Math.random() - 0.48) * 0.015;
    price = Math.max(0.05, Math.min(0.95, price));
    data.push({
      timestamp: now - i * 30 * 60 * 1000,
      price: Math.round(price * 100) / 100,
    });
  }
  return data;
}

function LivePriceDisplay({
  market,
  label,
}: {
  market: Market;
  label: string;
}) {
  const yesFlash = usePriceFlash(market.yesPrice);
  const noFlash = usePriceFlash(market.noPrice);

  const bestYesAsk = market.orderbook.yes.asks[0]?.price;
  const bestYesBid = market.orderbook.yes.bids[0]?.price;

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-secondary">{label}</h3>
        <span
          className={cn(
            "arbiter-badge",
            market.platform === "KALSHI"
              ? "bg-indigo-500/10 text-indigo-400"
              : "bg-purple-500/10 text-purple-400"
          )}
        >
          {market.platform}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div
          className={cn(
            "price-tile price-tile-yes text-lg",
            yesFlash === "up" && "animate-flash-green",
            yesFlash === "down" && "animate-flash-red"
          )}
        >
          Yes {formatPrice(market.yesPrice)}
        </div>
        <div
          className={cn(
            "price-tile price-tile-no text-lg",
            noFlash === "up" && "animate-flash-green",
            noFlash === "down" && "animate-flash-red"
          )}
        >
          No {formatPrice(market.noPrice)}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>Vol: {formatCompactNumber(market.volume24h)}</span>
        <span>Liq: {formatCompactNumber(market.liquidity)}</span>
      </div>
      {/* Bid/ask spread */}
      {bestYesBid !== undefined && bestYesAsk !== undefined && (
        <div className="flex items-center justify-between text-xs text-text-muted border-t border-arbiter-border-subtle pt-2">
          <span>
            Bid {formatPrice(bestYesBid)} / Ask {formatPrice(bestYesAsk)}
          </span>
          <span>
            Spread {Math.round((bestYesAsk - bestYesBid) * 100)}¢
          </span>
        </div>
      )}
    </div>
  );
}

function SpreadIndicator({
  marketA,
  marketB,
}: {
  marketA: Market;
  marketB: Market;
}) {
  // Use orderbook ask prices for more accurate arb detection
  const bestYesAskA = marketA.orderbook.yes.asks[0]?.price ?? marketA.yesPrice;
  const bestNoAskA = marketA.orderbook.no.asks[0]?.price ?? marketA.noPrice;
  const bestYesAskB = marketB.orderbook.yes.asks[0]?.price ?? marketB.yesPrice;
  const bestNoAskB = marketB.orderbook.no.asks[0]?.price ?? marketB.noPrice;

  const spread = calculateSpread(marketA.yesPrice, marketB.yesPrice);

  // Check both arb directions using orderbook asks
  const costAB = bestYesAskA + bestNoAskB; // Buy YES on A, Buy NO on B
  const costBA = bestYesAskB + bestNoAskA; // Buy YES on B, Buy NO on A
  const minCost = Math.min(costAB, costBA);
  const hasArb = minCost < 1.0;
  const arbProfit = hasArb ? (1 - minCost) * 100 : 0;

  const buyDirection = costAB <= costBA
    ? { buy: "YES", buyPlatform: marketA.platform, sell: "NO", sellPlatform: marketB.platform }
    : { buy: "YES", buyPlatform: marketB.platform, sell: "NO", sellPlatform: marketA.platform };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className={cn(
        "glass rounded-2xl p-5 space-y-3",
        hasArb && "border-indigo-500/20 shadow-glow"
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-secondary">
          Cross-Platform Spread
        </h3>
        {hasArb && (
          <span className="arbiter-badge bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
            <span className="relative flex h-1.5 w-1.5 mr-1">
              <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
            </span>
            ARB DETECTED
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xs text-text-muted">Yes Price Spread</p>
          <p className="text-2xl font-bold tabular-nums text-text-primary">
            {spread.toFixed(1)}%
          </p>
        </div>
        {hasArb && (
          <div className="text-right">
            <p className="text-2xs text-text-muted">Est. Profit / $100</p>
            <p className="text-2xl font-bold tabular-nums text-profit">
              {formatCurrency(arbProfit)}
            </p>
          </div>
        )}
      </div>
      {hasArb && (
        <div className="flex items-center gap-2 text-xs text-text-muted border-t border-arbiter-border-subtle pt-2">
          <span>
            Buy {buyDirection.buy} on{" "}
            <span className="text-text-secondary font-medium">{buyDirection.buyPlatform}</span>
            {" + "}
            Buy {buyDirection.sell} on{" "}
            <span className="text-text-secondary font-medium">{buyDirection.sellPlatform}</span>
          </span>
        </div>
      )}
    </motion.div>
  );
}

function DetailSkeleton() {
  return (
    <>
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="skeleton h-8 w-80 mb-2" />
          <div className="skeleton h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-2xl p-5">
            <div className="skeleton h-5 w-32 mb-4" />
            <PriceChartSkeleton height={300} />
          </div>
          <OrderbookSkeleton />
        </div>
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="skeleton h-4 w-24" />
            <div className="grid grid-cols-2 gap-3">
              <div className="skeleton h-12 rounded-xl" />
              <div className="skeleton h-12 rounded-xl" />
            </div>
            <div className="flex justify-between">
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-3 w-16" />
            </div>
          </div>
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
      </div>
    </>
  );
}

export default function TradePage() {
  usePriceStream();
  const params = useParams();
  const marketId = params.id as string;
  const [tradePanelOpen, setTradePanelOpen] = useState(false);
  const [activePeriod, setActivePeriod] = useState("24h");
  const [bookSide, setBookSide] = useState<Side>("YES");

  const { data, isLoading } = useQuery<MarketSyncResponse>({
    queryKey: ["markets"],
    queryFn: async () => {
      const res = await fetch("/api/markets/sync");
      if (!res.ok) throw new Error("Failed to fetch markets");
      return res.json();
    },
  });

  const rawMarket = data?.markets.find((m) => m.id === marketId) ?? null;
  const rawMatched = rawMarket?.matchedMarketId
    ? data?.markets.find((m) => m.id === rawMarket.matchedMarketId) ?? null
    : null;

  // Apply live SSE price updates
  const market = useLiveMarket(rawMarket);
  const matchedMarket = useLiveMarket(rawMatched);

  const countdown = useCountdown(
    market?.closingTime ? new Date(market.closingTime) : new Date()
  );

  const priceHistory = useMemo(
    () =>
      market
        ? generatePriceHistory(
            market.yesPrice,
            activePeriod === "24h" ? 48 : activePeriod === "7d" ? 168 : 360
          )
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [market?.id, activePeriod]
  );

  const allMarkets = data?.markets ?? [];

  if (isLoading || !market) {
    return <DetailSkeleton />;
  }

  return (
    <>
      <PageHeader
        title={market.title}
        subtitle={`${market.category} · Closes ${countdown.formatted}`}
        action={
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setTradePanelOpen(true)}
            className="arbiter-btn-primary"
          >
            Trade
          </motion.button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: chart + orderbook + settlement */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Price History
              </h2>
              <div className="flex gap-1 p-1 rounded-lg bg-arbiter-elevated">
                {(["24h", "7d", "30d"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setActivePeriod(period)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-medium transition-all duration-150",
                      activePeriod === period
                        ? "bg-indigo-500/15 text-indigo-400"
                        : "text-text-muted hover:text-text-secondary"
                    )}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <PriceChart data={priceHistory} height={300} showTooltip />
          </motion.div>

          {/* Orderbook section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="glass rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">
                Orderbook
              </h2>
              <div className="flex gap-1 p-1 rounded-lg bg-arbiter-elevated">
                {(["YES", "NO"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setBookSide(s)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150",
                      bookSide === s
                        ? s === "YES"
                          ? "bg-profit/15 text-profit"
                          : "bg-loss/15 text-loss"
                        : "text-text-muted hover:text-text-secondary"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">
                  {market.platform}
                </p>
                <OrderbookDisplay
                  orderbook={market.orderbook}
                  side={bookSide}
                  onPriceClick={() => setTradePanelOpen(true)}
                />
              </div>
              {matchedMarket && (
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">
                    {matchedMarket.platform}
                  </p>
                  <OrderbookDisplay
                    orderbook={matchedMarket.orderbook}
                    side={bookSide}
                  />
                </div>
              )}
            </div>
          </motion.div>

          {/* Settlement comparison */}
          {matchedMarket ? (
            <SettlementComparison marketA={market} marketB={matchedMarket} />
          ) : (
            <SingleSettlementRules market={market} />
          )}
        </div>

        {/* Right column: prices, spread, trade CTA */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <LivePriceDisplay market={market} label="Primary Market" />
          </motion.div>

          {matchedMarket && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <LivePriceDisplay
                  market={matchedMarket}
                  label="Matched Market"
                />
              </motion.div>

              <SpreadIndicator marketA={market} marketB={matchedMarket} />
            </>
          )}

          {/* Trade CTA */}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setTradePanelOpen(true)}
            className="arbiter-btn-primary w-full py-3.5 text-base"
          >
            Trade This Market
          </motion.button>

          {/* Market info */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="glass rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-sm font-semibold text-text-secondary">
              About This Market
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              {market.description || market.title}
            </p>
            <div className="flex items-center gap-4 pt-2 border-t border-arbiter-border-subtle">
              <div>
                <p className="text-2xs text-text-muted">Category</p>
                <p className="text-sm font-medium text-text-primary">
                  {market.category}
                </p>
              </div>
              <div>
                <p className="text-2xs text-text-muted">Platform</p>
                <p className="text-sm font-medium text-text-primary">
                  {market.platform}
                </p>
              </div>
              <div>
                <p className="text-2xs text-text-muted">Closes</p>
                <p className="text-sm font-medium text-text-primary">
                  {countdown.formatted}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <TradePanel
        isOpen={tradePanelOpen}
        marketId={marketId}
        markets={allMarkets}
        onClose={() => setTradePanelOpen(false)}
      />
    </>
  );
}
