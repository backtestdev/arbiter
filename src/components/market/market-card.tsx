"use client";

import { memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatPrice, formatCompactNumber, calculateSpread } from "@/lib/utils";
import { usePriceFlash } from "@/hooks/use-price-flash";
import { useCountdown } from "@/hooks/use-countdown";
import type { UnifiedMarket, Market, Platform } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MarketCardProps {
  market: UnifiedMarket;
  onTrade: (market: UnifiedMarket) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Spread threshold (in percentage points) above which the arbitrage badge shows. */
const ARB_THRESHOLD = 2;

const SPRING_EASE = [0.16, 1, 0.3, 1] as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * FanDuel-style pill-shaped price tile with flash animation on price updates.
 * Flashes green on upward movement, red on downward movement.
 */
function PriceTile({
  price,
  side,
  flash,
}: {
  price: number;
  side: "yes" | "no";
  flash: "up" | "down" | null;
}) {
  const isYes = side === "yes";

  return (
    <motion.span
      className={cn(
        "price-tile relative overflow-hidden select-none",
        isYes ? "price-tile-yes" : "price-tile-no",
      )}
      animate={
        flash
          ? { scale: [1, 1.06, 1] }
          : { scale: 1 }
      }
      transition={{ duration: 0.35, ease: SPRING_EASE }}
    >
      {/* Flash overlay that fades out after a price tick */}
      <AnimatePresence>
        {flash && (
          <motion.span
            key={`${flash}-${Date.now()}`}
            initial={{ opacity: 0.55 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={cn(
              "absolute inset-0 rounded-xl pointer-events-none",
              flash === "up" ? "bg-profit/30" : "bg-loss/30",
            )}
          />
        )}
      </AnimatePresence>

      <span className="relative z-10 text-sm font-semibold tabular-nums" data-price>
        {formatPrice(price)}
      </span>
    </motion.span>
  );
}

/** Side labels + two price tiles for a single platform. */
function PlatformPrices({
  platform,
  market,
}: {
  platform: Platform;
  market: Market;
}) {
  const yesFlash = usePriceFlash(market.yesPrice);
  const noFlash = usePriceFlash(market.noPrice);

  const label = platform === "KALSHI" ? "Kalshi" : "Polymarket";

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary">
        {label}
      </span>

      {/* Column headers */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="flex-1 text-center text-2xs font-semibold text-profit/70">
          Yes
        </span>
        <span className="flex-1 text-center text-2xs font-semibold text-loss/70">
          No
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <PriceTile price={market.yesPrice} side="yes" flash={yesFlash} />
        <PriceTile price={market.noPrice} side="no" flash={noFlash} />
      </div>
    </div>
  );
}

/** Placeholder tiles shown when a platform has no data for this market. */
function PlatformPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </span>

      {/* Empty column headers to keep alignment */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="flex-1 text-center text-2xs font-semibold text-profit/70 opacity-40">
          Yes
        </span>
        <span className="flex-1 text-center text-2xs font-semibold text-loss/70 opacity-40">
          No
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="price-tile bg-arbiter-elevated/50 text-text-muted border border-arbiter-border-subtle text-sm">
          --
        </span>
        <span className="price-tile bg-arbiter-elevated/50 text-text-muted border border-arbiter-border-subtle text-sm">
          --
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category badge colour mapping
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  politics: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  crypto: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  sports: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  economics: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  science: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  culture: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  finance: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  tech: "bg-teal-500/15 text-teal-400 border-teal-500/20",
};

function categoryClass(category: string): string {
  const key = category.toLowerCase();
  return CATEGORY_COLORS[key] ?? "bg-arbiter-elevated text-text-secondary border-arbiter-border";
}

// ---------------------------------------------------------------------------
// Clock icon (inline SVG keeps the component self-contained)
// ---------------------------------------------------------------------------

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className={className}
    >
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M6 3.5V6L7.5 7.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Framer Motion variants
// ---------------------------------------------------------------------------

const cardVariants = {
  initial: { opacity: 0, y: 14, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.15 } },
};

// ---------------------------------------------------------------------------
// MarketCard
// ---------------------------------------------------------------------------

export const MarketCard = memo(function MarketCard({
  market,
  onTrade,
}: MarketCardProps) {
  const { formatted: countdown, isExpired } = useCountdown(market.closingTime);

  const handleClick = useCallback(() => {
    onTrade(market);
  }, [onTrade, market]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  // Compute spread when both platforms are available
  const spread =
    market.kalshi && market.polymarket
      ? calculateSpread(market.kalshi.yesPrice, market.polymarket.yesPrice)
      : null;

  const showArbBadge = market.hasArbitrage || (spread !== null && spread > ARB_THRESHOLD);

  // Aggregate 24h volume across available platforms
  const totalVolume =
    (market.kalshi?.volume24h ?? 0) + (market.polymarket?.volume24h ?? 0);

  return (
    <motion.article
      layout
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: SPRING_EASE }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className={cn(
        "arbiter-card group cursor-pointer p-5 flex flex-col gap-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-arbiter-bg",
      )}
    >
      {/* --------------------------------------------------------------- */}
      {/* Header: title, category badge, arbitrage badge, countdown       */}
      {/* --------------------------------------------------------------- */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2 min-w-0">
          {/* Market title */}
          <h3 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2 group-hover:text-white transition-colors duration-200">
            {market.title}
          </h3>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category badge */}
            <span
              className={cn(
                "arbiter-badge border",
                categoryClass(market.category),
              )}
            >
              {market.category}
            </span>

            {/* Arbitrage badge */}
            <AnimatePresence>
              {showArbBadge && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2, ease: SPRING_EASE }}
                  className="arbiter-badge bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 shadow-glow"
                >
                  {/* Pulsing dot */}
                  <span className="relative flex h-1.5 w-1.5 mr-1">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  </span>
                  ARB
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Countdown pill */}
        <div
          className={cn(
            "flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-medium tabular-nums",
            isExpired
              ? "bg-loss-dim text-loss"
              : "bg-arbiter-elevated text-text-secondary",
          )}
        >
          <ClockIcon
            className={cn(
              "flex-shrink-0",
              isExpired ? "text-loss" : "text-text-tertiary",
            )}
          />
          {countdown}
        </div>
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Price grid: side-by-side platform columns                       */}
      {/* --------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3">
        {/* Kalshi column */}
        {market.kalshi ? (
          <PlatformPrices platform="KALSHI" market={market.kalshi} />
        ) : (
          <PlatformPlaceholder label="Kalshi" />
        )}

        {/* Polymarket column */}
        {market.polymarket ? (
          <PlatformPrices platform="POLYMARKET" market={market.polymarket} />
        ) : (
          <PlatformPlaceholder label="Polymarket" />
        )}
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Footer: spread indicator + 24h volume                           */}
      {/* --------------------------------------------------------------- */}
      <div className="flex items-center justify-between pt-1 border-t border-arbiter-border-subtle">
        {/* Spread */}
        {spread !== null ? (
          <div className="flex items-center gap-1.5">
            <span className="text-2xs font-medium text-text-tertiary">
              Spread
            </span>
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                showArbBadge ? "text-indigo-400" : "text-text-secondary",
              )}
              data-price
            >
              {spread.toFixed(1)}%
            </span>

            {/* Breathing dot when arb is active */}
            {showArbBadge && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400"
              />
            )}
          </div>
        ) : (
          <span className="text-2xs text-text-muted">Single platform</span>
        )}

        {/* 24h volume */}
        <div className="flex items-center gap-1.5">
          <span className="text-2xs font-medium text-text-tertiary">
            24h Vol
          </span>
          <span
            className="text-xs font-semibold text-text-secondary tabular-nums"
            data-price
          >
            {formatCompactNumber(totalVolume)}
          </span>
        </div>
      </div>
    </motion.article>
  );
});

// ---------------------------------------------------------------------------
// MarketCardSkeleton
// ---------------------------------------------------------------------------

export function MarketCardSkeleton() {
  return (
    <div className="arbiter-card p-5 flex flex-col gap-4 pointer-events-none" aria-hidden>
      {/* Header skeleton */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {/* Title lines */}
          <div className="skeleton h-4 w-4/5 rounded-md" />
          <div className="skeleton h-4 w-3/5 rounded-md" />
          {/* Category badge */}
          <div className="flex items-center gap-2 mt-0.5">
            <div className="skeleton h-5 w-16 rounded-full" />
          </div>
        </div>
        {/* Countdown pill */}
        <div className="skeleton h-6 w-16 rounded-full flex-shrink-0" />
      </div>

      {/* Price grid skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {/* Kalshi column */}
        <div className="flex flex-col gap-1.5">
          <div className="skeleton h-3 w-12 rounded" />
          <div className="flex items-center gap-1.5">
            <div className="skeleton h-9 flex-1 rounded-xl" />
            <div className="skeleton h-9 flex-1 rounded-xl" />
          </div>
        </div>
        {/* Polymarket column */}
        <div className="flex flex-col gap-1.5">
          <div className="skeleton h-3 w-20 rounded" />
          <div className="flex items-center gap-1.5">
            <div className="skeleton h-9 flex-1 rounded-xl" />
            <div className="skeleton h-9 flex-1 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="flex items-center justify-between pt-1 border-t border-arbiter-border-subtle">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-3 w-16 rounded" />
      </div>
    </div>
  );
}
