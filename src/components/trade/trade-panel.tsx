"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatPrice, formatCurrency } from "@/lib/utils";
import { OrderbookDisplay } from "@/components/market/orderbook-display";
import type { Market, Platform, Side, OrderType, OrderbookLevel } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TradePanelProps {
  isOpen: boolean;
  marketId: string | null;
  markets: Market[];
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Platform option built from real market data
// ---------------------------------------------------------------------------

interface PlatformOption {
  platform: Platform;
  label: string;
  yesPrice: number;
  noPrice: number;
  liquidity: number;
}

// ---------------------------------------------------------------------------
// Trade execution state machine
// ---------------------------------------------------------------------------

type TradeStep = "configure" | "confirm" | "executing" | "success";

// ---------------------------------------------------------------------------
// Orderbook walk result
// ---------------------------------------------------------------------------

interface WalkResult {
  avgPrice: number;
  filledShares: number;
  filledAmount: number;
}

// ---------------------------------------------------------------------------
// Helper: walk the orderbook to compute average fill price for a $ amount
// ---------------------------------------------------------------------------

function walkOrderbook(
  levels: OrderbookLevel[],
  amount: number,
): WalkResult {
  if (amount <= 0 || levels.length === 0) {
    return { avgPrice: 0, filledShares: 0, filledAmount: 0 };
  }

  let remainingDollars = amount;
  let totalShares = 0;
  let totalSpent = 0;

  for (const level of levels) {
    if (remainingDollars <= 0) break;

    // Max shares we can buy at this price level
    const maxSharesAtLevel = level.quantity;
    const costForAllShares = maxSharesAtLevel * level.price;

    if (costForAllShares <= remainingDollars) {
      // Consume the entire level
      totalShares += maxSharesAtLevel;
      totalSpent += costForAllShares;
      remainingDollars -= costForAllShares;
    } else {
      // Partially consume this level
      const sharesBought = remainingDollars / level.price;
      totalShares += sharesBought;
      totalSpent += remainingDollars;
      remainingDollars = 0;
    }
  }

  return {
    avgPrice: totalShares > 0 ? totalSpent / totalShares : 0,
    filledShares: totalShares,
    filledAmount: totalSpent,
  };
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: {
      type: "spring" as const,
      damping: 30,
      stiffness: 300,
      mass: 0.8,
    },
  },
  exit: {
    x: "100%",
    transition: {
      type: "spring" as const,
      damping: 30,
      stiffness: 300,
      mass: 0.8,
    },
  },
};

const stepVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Close (X) button for the panel header. */
function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg",
        "bg-arbiter-elevated hover:bg-arbiter-border/50",
        "text-text-tertiary hover:text-text-primary",
        "border border-arbiter-border-subtle hover:border-arbiter-border",
        "transition-all duration-200 ease-spring",
      )}
      aria-label="Close trade panel"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M1.5 1.5L12.5 12.5M12.5 1.5L1.5 12.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

/** Pill-shaped YES / NO toggle selector. */
function SideSelector({
  selected,
  onSelect,
}: {
  selected: Side;
  onSelect: (side: Side) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-arbiter-elevated border border-arbiter-border-subtle">
      {(["YES", "NO"] as const).map((side) => {
        const isActive = selected === side;
        const isYes = side === "YES";

        return (
          <button
            key={side}
            type="button"
            onClick={() => onSelect(side)}
            className={cn(
              "relative flex-1 px-6 py-2.5 rounded-full text-sm font-semibold",
              "transition-colors duration-200 ease-spring",
              isActive
                ? "text-white"
                : "text-text-muted hover:text-text-secondary",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="side-selector-pill"
                className={cn(
                  "absolute inset-0 rounded-full",
                  isYes
                    ? "bg-profit/20 border border-profit/30 shadow-glow-profit"
                    : "bg-loss/20 border border-loss/30 shadow-glow-loss",
                )}
                transition={{
                  type: "spring",
                  damping: 25,
                  stiffness: 300,
                }}
              />
            )}
            <span
              className={cn(
                "relative z-10",
                isActive && isYes && "text-profit",
                isActive && !isYes && "text-loss",
              )}
            >
              {side}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Compact toggle between Market and Limit order types. */
function OrderTypeSelector({
  selected,
  onSelect,
}: {
  selected: OrderType;
  onSelect: (type: OrderType) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary">
        Order Type
      </label>
      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-arbiter-elevated border border-arbiter-border-subtle">
        {(["market", "limit"] as const).map((type) => {
          const isActive = selected === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              className={cn(
                "relative flex-1 px-4 py-1.5 rounded-md text-xs font-semibold",
                "transition-colors duration-200 ease-spring capitalize",
                isActive
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-secondary",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="order-type-pill"
                  className="absolute inset-0 rounded-md bg-indigo-500/15 border border-indigo-500/30"
                  transition={{
                    type: "spring",
                    damping: 25,
                    stiffness: 300,
                  }}
                />
              )}
              <span className={cn("relative z-10", isActive && "text-indigo-400")}>
                {type}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Platform selector radio showing platform name, price, and liquidity. */
function PlatformSelector({
  platforms,
  selectedSide,
  selectedPlatform,
  onSelect,
}: {
  platforms: PlatformOption[];
  selectedSide: Side;
  selectedPlatform: Platform;
  onSelect: (platform: Platform) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary">
        Platform
      </label>
      <div className="flex flex-col gap-1.5">
        {platforms.map((p) => {
          const isActive = selectedPlatform === p.platform;
          const price = selectedSide === "YES" ? p.yesPrice : p.noPrice;

          return (
            <button
              key={p.platform}
              type="button"
              onClick={() => onSelect(p.platform)}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl",
                "border transition-all duration-200 ease-spring",
                isActive
                  ? "bg-indigo-500/8 border-indigo-500/30 shadow-glow"
                  : "bg-arbiter-elevated border-arbiter-border-subtle hover:border-arbiter-border",
              )}
            >
              <div className="flex items-center gap-3">
                {/* Radio indicator */}
                <span
                  className={cn(
                    "flex items-center justify-center w-4 h-4 rounded-full border-2 transition-colors duration-200",
                    isActive
                      ? "border-indigo-500"
                      : "border-text-muted",
                  )}
                >
                  {isActive && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 rounded-full bg-indigo-500"
                    />
                  )}
                </span>
                <div className="flex flex-col items-start gap-0.5">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isActive ? "text-text-primary" : "text-text-secondary",
                    )}
                  >
                    {p.label}
                  </span>
                  <span className="text-2xs text-text-muted">
                    {(p.liquidity / 1000).toFixed(0)}K liquidity
                  </span>
                </div>
              </div>

              {/* Price display */}
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  selectedSide === "YES" ? "text-profit" : "text-loss",
                )}
                data-price
              >
                {formatPrice(price)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Dollar amount input with shares/payout calculation, slider, and orderbook-aware estimates. */
function PositionSizer({
  amount,
  onAmountChange,
  orderType,
  limitPrice,
  onLimitPriceChange,
  avgFillPrice,
  shares,
  payout,
  maxCost,
  bestAsk,
}: {
  amount: string;
  onAmountChange: (val: string) => void;
  orderType: OrderType;
  limitPrice: string;
  onLimitPriceChange: (val: string) => void;
  avgFillPrice: number;
  shares: number;
  payout: number;
  maxCost: number | null;
  bestAsk: number;
}) {
  const parsedAmount = parseFloat(amount) || 0;
  const profit = payout - parsedAmount;

  // Slider range
  const sliderMax = 1000;
  const sliderValue = Math.min(parsedAmount, sliderMax);

  return (
    <div className="flex flex-col gap-3">
      <label className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary">
        Amount
      </label>

      {/* Dollar input */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-medium">
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            const val = e.target.value;
            // Allow empty, numbers, and decimals
            if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
              onAmountChange(val);
            }
          }}
          placeholder="0.00"
          className={cn(
            "arbiter-input pl-8 pr-4 text-right text-lg font-semibold tabular-nums",
            "focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30",
          )}
        />
      </div>

      {/* Slider */}
      <div className="px-1">
        <input
          type="range"
          min={0}
          max={sliderMax}
          step={1}
          value={sliderValue}
          onChange={(e) => {
            const val = Number(e.target.value);
            onAmountChange(val > 0 ? String(val) : "");
          }}
          className={cn(
            "w-full h-1.5 rounded-full appearance-none cursor-pointer",
            "bg-arbiter-border-subtle",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500",
            "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-300",
            "[&::-webkit-slider-thumb]:shadow-sm",
            "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150",
            "[&::-webkit-slider-thumb]:hover:scale-110",
            "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4",
            "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-500",
            "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-indigo-300",
            "[&::-moz-range-thumb]:shadow-sm",
          )}
        />
      </div>

      {/* Quick amount buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {[10, 25, 50, 100, 250, 500, 1000].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onAmountChange(String(preset))}
            className={cn(
              "flex-1 min-w-[3rem] py-1.5 rounded-lg text-xs font-medium",
              "bg-arbiter-elevated border border-arbiter-border-subtle",
              "text-text-secondary hover:text-text-primary hover:border-arbiter-border",
              "transition-all duration-150 ease-spring",
              amount === String(preset) && "border-indigo-500/40 text-indigo-400",
            )}
          >
            ${preset >= 1000 ? `${preset / 1000}k` : preset}
          </button>
        ))}
      </div>

      {/* Limit price input (limit orders only) */}
      {orderType === "limit" && (
        <div className="flex flex-col gap-2">
          <label className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary">
            Limit Price
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={limitPrice}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*\.?\d{0,4}$/.test(val)) {
                  onLimitPriceChange(val);
                }
              }}
              placeholder={bestAsk > 0 ? bestAsk.toFixed(2) : "0.00"}
              className={cn(
                "arbiter-input pr-10 text-right text-sm font-semibold tabular-nums",
                "focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30",
              )}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-2xs font-medium">
              per share
            </span>
          </div>
        </div>
      )}

      {/* Shares, fill price, & payout calculations */}
      <div className="flex flex-col gap-2 px-1">
        <div className="flex items-center justify-between">
          <span className="text-2xs text-text-muted">Est. avg fill price</span>
          <span className="text-xs font-semibold text-text-secondary tabular-nums" data-price>
            {avgFillPrice > 0 ? formatPrice(avgFillPrice) : "--"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-2xs text-text-muted">Shares</span>
          <span className="text-xs font-semibold text-text-primary tabular-nums" data-price>
            {shares > 0 ? shares.toFixed(2) : "--"}
          </span>
        </div>
        {orderType === "limit" && maxCost !== null && (
          <div className="flex items-center justify-between">
            <span className="text-2xs text-text-muted">Max cost</span>
            <span className="text-xs font-semibold text-text-secondary tabular-nums" data-price>
              {maxCost > 0 ? formatCurrency(maxCost) : "--"}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-2xs text-text-muted">Payout if correct</span>
          <span className="text-xs font-semibold text-profit tabular-nums" data-price>
            {payout > 0 ? formatCurrency(payout) : "--"}
          </span>
        </div>
        {profit > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-2xs text-text-muted">Potential profit</span>
            <span className="text-xs font-semibold text-profit tabular-nums" data-price>
              +{formatCurrency(profit)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Summary card showing trade details before confirmation. */
function OrderSummary({
  orderType,
  side,
  platform,
  amount,
  avgFillPrice,
  shares,
  payout,
  profit,
  limitPrice,
}: {
  orderType: OrderType;
  side: Side;
  platform: string;
  amount: number;
  avgFillPrice: number;
  shares: number;
  payout: number;
  profit: number;
  limitPrice?: number;
}) {
  const isYes = side === "YES";

  const rows: { label: string; value: string; highlight?: boolean }[] = [
    { label: "Order type", value: orderType === "market" ? "Market" : "Limit" },
    { label: "Side", value: side },
    { label: "Platform", value: platform },
    { label: "Amount", value: formatCurrency(amount) },
    { label: "Est. avg fill price", value: avgFillPrice > 0 ? formatPrice(avgFillPrice) : "--" },
    { label: "Shares", value: shares > 0 ? shares.toFixed(2) : "--" },
  ];

  if (orderType === "limit" && limitPrice !== undefined) {
    rows.push({ label: "Limit price", value: formatPrice(limitPrice) });
  }

  rows.push(
    { label: "Potential payout", value: payout > 0 ? formatCurrency(payout) : "--" },
    { label: "Potential profit", value: profit > 0 ? `+${formatCurrency(profit)}` : "--", highlight: profit > 0 },
  );

  return (
    <div className="flex flex-col gap-0.5 rounded-xl overflow-hidden border border-arbiter-border-subtle">
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={cn(
            "flex items-center justify-between px-4 py-2.5",
            i % 2 === 0 ? "bg-arbiter-surface" : "bg-arbiter-elevated/50",
          )}
        >
          <span className="text-xs text-text-tertiary">{row.label}</span>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              row.highlight
                ? "text-profit"
                : row.label === "Side"
                  ? isYes
                    ? "text-profit"
                    : "text-loss"
                  : "text-text-primary",
            )}
            data-price
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Skeleton placeholder when market data is not yet available. */
function PanelBodySkeleton() {
  return (
    <div className="flex flex-col gap-6 px-6 py-6 animate-pulse">
      {/* Side selector skeleton */}
      <div className="h-12 rounded-full bg-arbiter-elevated border border-arbiter-border-subtle" />

      {/* Order type skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-3 w-20 rounded bg-arbiter-elevated" />
        <div className="h-9 rounded-lg bg-arbiter-elevated border border-arbiter-border-subtle" />
      </div>

      {/* Platform selector skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-3 w-16 rounded bg-arbiter-elevated" />
        <div className="flex flex-col gap-1.5">
          <div className="h-16 rounded-xl bg-arbiter-elevated border border-arbiter-border-subtle" />
          <div className="h-16 rounded-xl bg-arbiter-elevated border border-arbiter-border-subtle" />
        </div>
      </div>

      {/* Amount skeleton */}
      <div className="flex flex-col gap-3">
        <div className="h-3 w-14 rounded bg-arbiter-elevated" />
        <div className="h-12 rounded-xl bg-arbiter-elevated border border-arbiter-border-subtle" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 h-8 rounded-lg bg-arbiter-elevated border border-arbiter-border-subtle" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: build platform options from the primary market + its match
// ---------------------------------------------------------------------------

function buildPlatformOptions(
  market: Market,
  matchedMarket: Market | undefined,
): PlatformOption[] {
  const options: PlatformOption[] = [];

  const toOption = (m: Market): PlatformOption => ({
    platform: m.platform,
    label: m.platform === "KALSHI" ? "Kalshi" : "Polymarket",
    yesPrice: m.yesPrice,
    noPrice: m.noPrice,
    liquidity: m.liquidity,
  });

  options.push(toOption(market));

  if (matchedMarket) {
    options.push(toOption(matchedMarket));
  }

  return options;
}

// ---------------------------------------------------------------------------
// TradePanel
// ---------------------------------------------------------------------------

export function TradePanel({ isOpen, marketId, markets, onClose }: TradePanelProps) {
  // -- State ----------------------------------------------------------------
  const [side, setSide] = useState<Side>("YES");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("POLYMARKET");
  const [amount, setAmount] = useState<string>("");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [step, setStep] = useState<TradeStep>("configure");
  const [tradeError, setTradeError] = useState<string | null>(null);

  // Ref for the auto-close timer so we can clean it up
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -- Find real market data ------------------------------------------------
  const market = useMemo(
    () => (marketId ? markets.find((m) => m.id === marketId) : undefined),
    [marketId, markets],
  );

  const matchedMarket = useMemo(
    () =>
      market?.matchedMarketId
        ? markets.find((m) => m.id === market.matchedMarketId)
        : undefined,
    [market, markets],
  );

  const platforms = useMemo(
    () => (market ? buildPlatformOptions(market, matchedMarket) : []),
    [market, matchedMarket],
  );

  // -- Derived data ---------------------------------------------------------
  const activePlatform = useMemo(
    () => platforms.find((p) => p.platform === selectedPlatform) ?? platforms[0],
    [platforms, selectedPlatform],
  );

  // Get the active market object (for orderbook access)
  const activeMarket = useMemo(() => {
    if (!market) return undefined;
    if (market.platform === selectedPlatform) return market;
    if (matchedMarket?.platform === selectedPlatform) return matchedMarket;
    return market;
  }, [market, matchedMarket, selectedPlatform]);

  // Orderbook data for the currently selected side
  const orderbookSide = useMemo(() => {
    if (!activeMarket?.orderbook) return { bids: [], asks: [] };
    return side === "YES"
      ? activeMarket.orderbook.yes
      : activeMarket.orderbook.no;
  }, [activeMarket, side]);

  const bestAsk = orderbookSide.asks[0]?.price ?? 0;

  // Default limit price to best ask when switching to limit mode or changing side
  useEffect(() => {
    if (orderType === "limit" && limitPrice === "" && bestAsk > 0) {
      setLimitPrice(bestAsk.toFixed(2));
    }
  }, [orderType, bestAsk, limitPrice]);

  // Parsed values
  const parsedAmount = parseFloat(amount) || 0;
  const parsedLimitPrice = parseFloat(limitPrice) || 0;

  // Orderbook walk for market orders
  const marketWalk = useMemo(
    () => walkOrderbook(orderbookSide.asks, parsedAmount),
    [orderbookSide.asks, parsedAmount],
  );

  // Calculate shares and avg fill price based on order type
  const avgFillPrice = useMemo(() => {
    if (orderType === "market") {
      return marketWalk.avgPrice;
    }
    // For limit orders, the fill price is the limit price
    return parsedLimitPrice;
  }, [orderType, marketWalk.avgPrice, parsedLimitPrice]);

  const shares = useMemo(() => {
    if (parsedAmount <= 0 || avgFillPrice <= 0) return 0;
    if (orderType === "market") {
      return marketWalk.filledShares;
    }
    return parsedAmount / parsedLimitPrice;
  }, [orderType, parsedAmount, avgFillPrice, marketWalk.filledShares, parsedLimitPrice]);

  // Payout at $1/share resolution
  const payout = shares;
  const profit = payout - parsedAmount;

  // Max cost for limit orders (capped by available depth)
  const maxCost = useMemo(() => {
    if (orderType !== "limit" || parsedLimitPrice <= 0) return null;
    // Walk the book up to our limit price to see what's available
    const levelsAtOrBelowLimit = orderbookSide.asks.filter(
      (l) => l.price <= parsedLimitPrice,
    );
    const totalAvailable = levelsAtOrBelowLimit.reduce(
      (acc, l) => acc + l.quantity * l.price,
      0,
    );
    return Math.min(parsedAmount, totalAvailable);
  }, [orderType, parsedLimitPrice, orderbookSide.asks, parsedAmount]);

  const canConfirm = parsedAmount > 0 && (orderType === "market" || parsedLimitPrice > 0);

  // -- Reset selected platform when platforms change ------------------------
  useEffect(() => {
    if (platforms.length > 0 && !platforms.find((p) => p.platform === selectedPlatform)) {
      setSelectedPlatform(platforms[0].platform);
    }
  }, [platforms, selectedPlatform]);

  // -- Reset limit price when side or platform changes ---------------------
  useEffect(() => {
    if (orderType === "limit") {
      setLimitPrice(bestAsk > 0 ? bestAsk.toFixed(2) : "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side, selectedPlatform, orderType, bestAsk]);

  // -- Cleanup success timer on unmount -------------------------------------
  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  // -- Handlers -------------------------------------------------------------
  const handleClose = useCallback(() => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setStep("configure");
    setAmount("");
    setLimitPrice("");
    setSide("YES");
    setOrderType("market");
    setTradeError(null);
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    if (!canConfirm) return;
    setTradeError(null);
    setStep("confirm");
  }, [canConfirm]);

  const handleBack = useCallback(() => {
    setTradeError(null);
    setStep("configure");
  }, []);

  const handleOrderbookPriceClick = useCallback((price: number) => {
    // Switch to limit mode and set the clicked price
    setOrderType("limit");
    setLimitPrice(price.toFixed(2));
  }, []);

  const handleExecute = useCallback(async () => {
    if (!market || !activePlatform) return;

    setStep("executing");
    setTradeError(null);

    try {
      const res = await fetch("/api/trade/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: market.id,
          platform: activePlatform.platform,
          side,
          orderType,
          amount: parsedAmount,
          limitPrice: orderType === "limit" ? parsedLimitPrice : undefined,
          shares,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Surface Zod validation details if present
        const detail =
          data.details && Array.isArray(data.details)
            ? data.details.map((d: { message: string }) => d.message).join("; ")
            : data.error ?? "Trade execution failed";
        setTradeError(detail);
        setStep("confirm");
        return;
      }

      // Execution succeeded -- show success animation then auto-close
      setStep("success");
      successTimerRef.current = setTimeout(() => {
        handleClose();
      }, 1500);
    } catch {
      setTradeError("Network error. Please try again.");
      setStep("confirm");
    }
  }, [market, activePlatform, side, orderType, parsedAmount, parsedLimitPrice, shares, handleClose]);

  // -- Render ---------------------------------------------------------------
  const marketNotFound = isOpen && marketId && !market;

  return (
    <AnimatePresence>
      {isOpen && marketId && (
        <>
          {/* Backdrop */}
          <motion.div
            key="trade-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            aria-hidden
          />

          {/* Panel */}
          <motion.aside
            key="trade-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "fixed right-0 top-0 z-50 h-full w-full max-w-[420px]",
              "flex flex-col",
              "bg-arbiter-surface/80 backdrop-blur-2xl",
              "border-l border-arbiter-border-subtle",
              "shadow-card-hover",
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Trade panel"
          >
            {/* ------- Header ------- */}
            <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-arbiter-border-subtle">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-2xs font-semibold uppercase tracking-wider text-indigo-400">
                  {step === "configure"
                    ? "New Trade"
                    : step === "confirm"
                      ? "Confirm Trade"
                      : step === "executing"
                        ? "Executing..."
                        : "Trade Placed"}
                </span>
                <h2 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2">
                  {market?.title ?? "Loading market..."}
                </h2>
              </div>
              <CloseButton onClick={handleClose} />
            </div>

            {/* ------- Body with step transitions ------- */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {marketNotFound ? (
                /* No market found -- show loading skeleton */
                <PanelBodySkeleton />
              ) : (
                <AnimatePresence mode="wait">
                  {step === "configure" ? (
                    <motion.div
                      key="step-configure"
                      variants={stepVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col gap-6 px-6 py-6"
                    >
                      {/* Side selector */}
                      <SideSelector selected={side} onSelect={setSide} />

                      {/* Order type selector */}
                      <OrderTypeSelector selected={orderType} onSelect={setOrderType} />

                      {/* Platform selector */}
                      <PlatformSelector
                        platforms={platforms}
                        selectedSide={side}
                        selectedPlatform={selectedPlatform}
                        onSelect={setSelectedPlatform}
                      />

                      {/* Mini orderbook */}
                      {activeMarket?.orderbook && (
                        <div className="flex flex-col gap-2">
                          <label className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary">
                            Orderbook
                          </label>
                          <OrderbookDisplay
                            orderbook={activeMarket.orderbook}
                            side={side}
                            maxLevels={5}
                            onPriceClick={handleOrderbookPriceClick}
                          />
                        </div>
                      )}

                      {/* Position sizing */}
                      <PositionSizer
                        amount={amount}
                        onAmountChange={setAmount}
                        orderType={orderType}
                        limitPrice={limitPrice}
                        onLimitPriceChange={setLimitPrice}
                        avgFillPrice={avgFillPrice}
                        shares={shares}
                        payout={payout}
                        maxCost={maxCost}
                        bestAsk={bestAsk}
                      />

                      {/* Order summary preview */}
                      {canConfirm && activePlatform && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <label className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-2 block">
                            Order Summary
                          </label>
                          <OrderSummary
                            orderType={orderType}
                            side={side}
                            platform={activePlatform.label}
                            amount={parsedAmount}
                            avgFillPrice={avgFillPrice}
                            shares={shares}
                            payout={payout}
                            profit={profit}
                            limitPrice={orderType === "limit" ? parsedLimitPrice : undefined}
                          />
                        </motion.div>
                      )}
                    </motion.div>
                  ) : step === "confirm" ? (
                    <motion.div
                      key="step-confirm"
                      variants={stepVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col gap-6 px-6 py-6"
                    >
                      {/* Confirmation header */}
                      <div className="flex flex-col items-center gap-3 py-4">
                        <div
                          className={cn(
                            "flex items-center justify-center w-14 h-14 rounded-2xl",
                            side === "YES"
                              ? "bg-profit/15 border border-profit/25"
                              : "bg-loss/15 border border-loss/25",
                          )}
                        >
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            className={side === "YES" ? "text-profit" : "text-loss"}
                          >
                            {side === "YES" ? (
                              <path
                                d="M5 13l4 4L19 7"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            ) : (
                              <path
                                d="M6 6l12 12M18 6L6 18"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                            )}
                          </svg>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-lg font-semibold text-text-primary">
                            Review Your Trade
                          </span>
                          <span className="text-xs text-text-tertiary text-center max-w-[280px]">
                            Please review the details below before executing your{" "}
                            {orderType === "market" ? "market" : "limit"} order.
                          </span>
                        </div>
                      </div>

                      {/* Error banner */}
                      {tradeError && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start gap-2 px-4 py-3 rounded-xl bg-loss/10 border border-loss/20"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            className="text-loss mt-0.5 shrink-0"
                          >
                            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <circle cx="8" cy="11" r="0.75" fill="currentColor" />
                          </svg>
                          <span className="text-xs text-loss leading-relaxed">{tradeError}</span>
                        </motion.div>
                      )}

                      {/* Full summary */}
                      {activePlatform && (
                        <OrderSummary
                          orderType={orderType}
                          side={side}
                          platform={activePlatform.label}
                          amount={parsedAmount}
                          avgFillPrice={avgFillPrice}
                          shares={shares}
                          payout={payout}
                          profit={profit}
                          limitPrice={orderType === "limit" ? parsedLimitPrice : undefined}
                        />
                      )}

                      {/* Disclaimer */}
                      <p className="text-2xs text-text-muted text-center leading-relaxed px-2">
                        By executing this trade you acknowledge that prediction market
                        outcomes are uncertain and you may lose your entire position.
                      </p>
                    </motion.div>
                  ) : step === "executing" ? (
                    <motion.div
                      key="step-executing"
                      variants={stepVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col items-center justify-center gap-4 px-6 py-20"
                    >
                      {/* Spinner */}
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-12 h-12 rounded-full border-[3px] border-arbiter-border-subtle border-t-indigo-500"
                      />
                      <span className="text-sm font-semibold text-text-secondary">
                        Executing trade...
                      </span>
                      <span className="text-xs text-text-muted">
                        Placing your {orderType} order on {activePlatform?.label ?? "the platform"}
                      </span>
                    </motion.div>
                  ) : (
                    /* step === "success" */
                    <motion.div
                      key="step-success"
                      variants={stepVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col items-center justify-center gap-4 px-6 py-20"
                    >
                      {/* Green checkmark with scale-in animation */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          damping: 12,
                          stiffness: 200,
                          delay: 0.1,
                        }}
                        className="flex items-center justify-center w-16 h-16 rounded-full bg-profit/15 border-2 border-profit/30"
                      >
                        <motion.svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          className="text-profit"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.4, delay: 0.3 }}
                        >
                          <motion.path
                            d="M5 13l4 4L19 7"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.4, delay: 0.3 }}
                          />
                        </motion.svg>
                      </motion.div>
                      <motion.span
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-lg font-semibold text-profit"
                      >
                        Trade Placed!
                      </motion.span>
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-xs text-text-muted"
                      >
                        Your {orderType} order has been submitted successfully.
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {/* ------- Footer action buttons ------- */}
            {!marketNotFound && step !== "executing" && step !== "success" && (
              <div className="px-6 pb-6 pt-4 border-t border-arbiter-border-subtle">
                {step === "configure" ? (
                  <button
                    type="button"
                    disabled={!canConfirm}
                    onClick={handleConfirm}
                    className="arbiter-btn-primary w-full py-3 text-sm"
                  >
                    Confirm Trade
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleExecute}
                      className={cn(
                        "w-full py-3 text-sm font-semibold rounded-xl",
                        "text-white transition-all duration-200 ease-spring",
                        "shadow-glow-lg hover:brightness-110 active:brightness-90",
                        side === "YES"
                          ? "bg-profit hover:bg-profit/90"
                          : "bg-loss hover:bg-loss/90",
                      )}
                    >
                      Execute {orderType === "market" ? "Market" : "Limit"} Order
                    </button>
                    <button
                      type="button"
                      onClick={handleBack}
                      className="arbiter-btn-secondary w-full py-2.5 text-sm"
                    >
                      Back
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
