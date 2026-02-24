"use client";

import { useMemo, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatPrice } from "@/lib/utils";
import type { Orderbook, OrderbookLevel, Side } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OrderbookDisplayProps {
  orderbook: Orderbook;
  side: Side;
  onPriceClick?: (price: number, side: "bid" | "ask") => void;
  maxLevels?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface DisplayLevel extends OrderbookLevel {
  cumulative: number;
}

/** Compute cumulative totals for a list of levels. */
function withCumulatives(levels: OrderbookLevel[]): DisplayLevel[] {
  let running = 0;
  return levels.map((l) => {
    running += l.quantity;
    return { ...l, cumulative: running };
  });
}

/** Format a number with locale-aware separators. */
function formatQty(n: number): string {
  return n.toLocaleString("en-US");
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const rowVariants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4, transition: { duration: 0.1 } },
};

// ---------------------------------------------------------------------------
// OrderbookRow
// ---------------------------------------------------------------------------

const OrderbookRow = memo(function OrderbookRow({
  level,
  depthPercent,
  type,
  onClick,
}: {
  level: DisplayLevel;
  depthPercent: number;
  type: "bid" | "ask";
  onClick?: () => void;
}) {
  const isBid = type === "bid";

  return (
    <motion.button
      type="button"
      layout="position"
      variants={rowVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={cn(
        "relative flex items-center w-full px-3",
        "py-[5px] text-2xs",
        "transition-colors duration-100",
        onClick
          ? "cursor-pointer"
          : "cursor-default",
        isBid
          ? "hover:bg-profit/[0.08]"
          : "hover:bg-loss/[0.08]",
      )}
    >
      {/* Depth bar */}
      <motion.span
        className={cn(
          "absolute inset-y-0 right-0 pointer-events-none",
          isBid ? "bg-profit/[0.10]" : "bg-loss/[0.10]",
        )}
        initial={false}
        animate={{ width: `${depthPercent}%` }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Price */}
      <span
        className={cn(
          "relative z-10 w-[36%] text-left font-semibold tabular-nums",
          isBid ? "text-profit" : "text-loss",
        )}
        data-price
      >
        {formatPrice(level.price)}
      </span>

      {/* Quantity */}
      <span className="relative z-10 w-[32%] text-right tabular-nums text-text-secondary">
        {formatQty(level.quantity)}
      </span>

      {/* Cumulative total */}
      <span className="relative z-10 w-[32%] text-right tabular-nums text-text-muted">
        {formatQty(level.cumulative)}
      </span>
    </motion.button>
  );
});

// ---------------------------------------------------------------------------
// SpreadIndicator
// ---------------------------------------------------------------------------

function SpreadIndicator({
  bestBid,
  bestAsk,
  lastTradePrice,
}: {
  bestBid: number | null;
  bestAsk: number | null;
  lastTradePrice: number;
}) {
  const spreadCents =
    bestAsk !== null && bestBid !== null
      ? Math.round((bestAsk - bestBid) * 100)
      : null;

  const midpoint =
    bestAsk !== null && bestBid !== null ? (bestAsk + bestBid) / 2 : null;

  const spreadPct =
    spreadCents !== null && midpoint !== null && midpoint > 0
      ? ((spreadCents / 100) / midpoint) * 100
      : null;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-arbiter-elevated/40 border-y border-arbiter-border-subtle">
      {/* Spread */}
      <div className="flex items-center gap-2">
        {spreadCents !== null ? (
          <>
            <span className="text-2xs text-text-muted">Spread</span>
            <span className="text-2xs font-semibold tabular-nums text-text-secondary" data-price>
              {spreadCents}&#162;
            </span>
            {spreadPct !== null && (
              <span className="text-2xs tabular-nums text-text-muted">
                ({spreadPct.toFixed(1)}%)
              </span>
            )}
          </>
        ) : (
          <span className="text-2xs text-text-muted">--</span>
        )}
      </div>

      {/* Last trade */}
      <div className="flex items-center gap-1.5">
        <span className="text-2xs text-text-muted">Last</span>
        <span className="text-2xs font-semibold tabular-nums text-indigo-400" data-price>
          {formatPrice(lastTradePrice)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OrderbookDisplay
// ---------------------------------------------------------------------------

export const OrderbookDisplay = memo(function OrderbookDisplay({
  orderbook,
  side,
  onPriceClick,
  maxLevels = 8,
  className,
}: OrderbookDisplayProps) {
  const sideBook = side === "YES" ? orderbook.yes : orderbook.no;

  // Asks: sorted ascending by price in the data. We show them in descending
  // order so the best (lowest) ask is at the bottom, adjacent to the spread.
  const visibleAsks = useMemo(() => {
    const sliced = sideBook.asks.slice(0, maxLevels);
    // Reverse for display: highest ask at top, best ask at bottom
    const reversed = [...sliced].reverse();
    return withCumulatives(reversed);
  }, [sideBook.asks, maxLevels]);

  // Bids: sorted descending by price in the data. Best bid is at the top,
  // adjacent to the spread.
  const visibleBids = useMemo(() => {
    const sliced = sideBook.bids.slice(0, maxLevels);
    return withCumulatives(sliced);
  }, [sideBook.bids, maxLevels]);

  // Max quantity across all visible levels — used to normalize depth bars
  const maxQty = useMemo(() => {
    return Math.max(
      ...visibleAsks.map((l) => l.quantity),
      ...visibleBids.map((l) => l.quantity),
      1,
    );
  }, [visibleAsks, visibleBids]);

  const bestBid = sideBook.bids[0]?.price ?? null;
  const bestAsk = sideBook.asks[0]?.price ?? null;

  const handlePriceClick = useCallback(
    (price: number, bookSide: "bid" | "ask") => {
      onPriceClick?.(price, bookSide);
    },
    [onPriceClick],
  );

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-arbiter-border-subtle overflow-hidden",
        "bg-arbiter-surface",
        className,
      )}
    >
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center justify-between px-3 py-2 bg-arbiter-elevated/50 border-b border-arbiter-border-subtle">
        <span className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary">
          {side} Book
        </span>
        <div className="flex items-center">
          <span className="w-[36%] text-left text-2xs font-medium text-text-muted">
            Price
          </span>
          <span className="w-[32%] text-right text-2xs font-medium text-text-muted">
            Qty
          </span>
          <span className="w-[32%] text-right text-2xs font-medium text-text-muted">
            Total
          </span>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Asks section (red-tinted, descending — best ask at bottom)        */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col">
        <AnimatePresence initial={false} mode="popLayout">
          {visibleAsks.map((level) => (
            <OrderbookRow
              key={`ask-${level.price}`}
              level={level}
              depthPercent={(level.quantity / maxQty) * 100}
              type="ask"
              onClick={
                onPriceClick
                  ? () => handlePriceClick(level.price, "ask")
                  : undefined
              }
            />
          ))}
        </AnimatePresence>

        {visibleAsks.length === 0 && (
          <div className="flex items-center justify-center py-3">
            <span className="text-2xs text-text-muted">No asks</span>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Spread indicator                                                  */}
      {/* ----------------------------------------------------------------- */}
      <SpreadIndicator
        bestBid={bestBid}
        bestAsk={bestAsk}
        lastTradePrice={orderbook.lastTradePrice}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Bids section (green-tinted, descending — best bid at top)         */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col">
        <AnimatePresence initial={false} mode="popLayout">
          {visibleBids.map((level) => (
            <OrderbookRow
              key={`bid-${level.price}`}
              level={level}
              depthPercent={(level.quantity / maxQty) * 100}
              type="bid"
              onClick={
                onPriceClick
                  ? () => handlePriceClick(level.price, "bid")
                  : undefined
              }
            />
          ))}
        </AnimatePresence>

        {visibleBids.length === 0 && (
          <div className="flex items-center justify-center py-3">
            <span className="text-2xs text-text-muted">No bids</span>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Empty state when neither side has data                            */}
      {/* ----------------------------------------------------------------- */}
      {visibleAsks.length === 0 && visibleBids.length === 0 && (
        <div className="flex items-center justify-center px-3 py-6">
          <span className="text-2xs text-text-muted">No orderbook data</span>
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// OrderbookSkeleton
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="flex items-center px-3 py-[5px]">
      <div className="w-[36%]">
        <div className="skeleton h-3 w-10 rounded" />
      </div>
      <div className="w-[32%] flex justify-end">
        <div className="skeleton h-3 w-12 rounded" />
      </div>
      <div className="w-[32%] flex justify-end">
        <div className="skeleton h-3 w-14 rounded" />
      </div>
    </div>
  );
}

export function OrderbookSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-arbiter-border-subtle overflow-hidden",
        "bg-arbiter-surface",
        className,
      )}
      aria-hidden
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-arbiter-elevated/50 border-b border-arbiter-border-subtle">
        <div className="skeleton h-3 w-16 rounded" />
        <div className="flex items-center gap-4">
          <div className="skeleton h-3 w-8 rounded" />
          <div className="skeleton h-3 w-6 rounded" />
          <div className="skeleton h-3 w-8 rounded" />
        </div>
      </div>

      {/* Ask rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonRow key={`ask-skel-${i}`} />
      ))}

      {/* Spread skeleton */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-arbiter-elevated/40 border-y border-arbiter-border-subtle">
        <div className="flex items-center gap-2">
          <div className="skeleton h-3 w-10 rounded" />
          <div className="skeleton h-3 w-6 rounded" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="skeleton h-3 w-8 rounded" />
          <div className="skeleton h-3 w-10 rounded" />
        </div>
      </div>

      {/* Bid rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonRow key={`bid-skel-${i}`} />
      ))}
    </div>
  );
}
