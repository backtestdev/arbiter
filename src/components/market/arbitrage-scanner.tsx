"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ArbitrageOpportunity } from "@/types";
import {
  cn,
  formatPrice,
  formatPercent,
  formatCurrency,
  timeAgo,
} from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArbitrageScannerProps {
  opportunities: ArbitrageOpportunity[];
  isLoading: boolean;
  onExecute: (opportunityId: string) => void;
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.97,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// ---------------------------------------------------------------------------
// Platform badge
// ---------------------------------------------------------------------------

function PlatformBadge({
  platform,
  yesPrice,
}: {
  platform: string;
  yesPrice: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider",
          platform === "KALSHI"
            ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
            : "bg-purple-500/15 text-purple-400 border border-purple-500/20",
        )}
      >
        {platform}
      </span>
      <span className="tabular-nums text-sm font-semibold text-text-primary">
        {formatPrice(yesPrice)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-20"
    >
      {/* Animated radar / scanning icon */}
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="mb-6"
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          className="text-indigo-500"
        >
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="1.5"
          />
          <circle
            cx="24"
            cy="24"
            r="12"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeWidth="1.5"
          />
          <circle cx="24" cy="24" r="3" fill="currentColor" fillOpacity="0.6" />
          <motion.line
            x1="24"
            y1="24"
            x2="24"
            y2="4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "24px 24px" }}
          />
        </svg>
      </motion.div>

      <p className="text-base font-medium text-text-secondary">
        No arbitrage opportunities detected.
      </p>
      <motion.p
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="mt-1 text-sm text-text-muted"
      >
        Scanning...
      </motion.p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Opportunity row
// ---------------------------------------------------------------------------

function OpportunityRow({
  opportunity,
  onExecute,
}: {
  opportunity: ArbitrageOpportunity;
  onExecute: (id: string) => void;
}) {
  const isExpired = opportunity.status === "EXPIRED";
  const isExecuted = opportunity.status === "EXECUTED";
  const isActive = opportunity.status === "ACTIVE";

  return (
    <motion.div
      layout
      variants={rowVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        "group grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] items-center gap-4",
        "rounded-xl px-4 py-3 transition-colors duration-200",
        "bg-arbiter-surface border border-arbiter-border-subtle",
        "hover:bg-arbiter-elevated hover:border-arbiter-border",
        (isExpired || isExecuted) && "opacity-50",
      )}
    >
      {/* 1. Market name */}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">
          {opportunity.marketA.title}
        </p>
      </div>

      {/* 2. Platform A */}
      <PlatformBadge
        platform={opportunity.marketA.platform}
        yesPrice={opportunity.marketA.yesPrice}
      />

      {/* 3. Platform B */}
      <PlatformBadge
        platform={opportunity.marketB.platform}
        yesPrice={opportunity.marketB.yesPrice}
      />

      {/* 4. Spread % */}
      <div className="flex items-center justify-center min-w-[5rem]">
        <span
          className={cn(
            "tabular-nums text-lg font-bold",
            opportunity.spreadPercent > 0 ? "text-profit" : "text-loss",
          )}
        >
          {formatPercent(opportunity.spreadPercent)}
        </span>
      </div>

      {/* 5. Estimated profit on $100 */}
      <div className="flex items-center justify-end min-w-[5.5rem]">
        <span
          className={cn(
            "tabular-nums text-sm font-semibold",
            opportunity.estimatedProfit100 > 0 ? "text-profit" : "text-loss",
          )}
        >
          {formatCurrency(opportunity.estimatedProfit100)}
        </span>
      </div>

      {/* 6. Execute button */}
      <div className="flex items-center justify-center min-w-[7rem]">
        <button
          onClick={() => onExecute(opportunity.id)}
          disabled={!isActive}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5",
            "text-xs font-semibold tracking-wide transition-all duration-200",
            isActive
              ? "bg-indigo-500 text-white hover:bg-indigo-400 hover:shadow-glow active:scale-[0.97]"
              : "bg-arbiter-elevated text-text-muted cursor-not-allowed",
          )}
        >
          {isExecuted ? "Executed" : isExpired ? "Expired" : "Execute Arb"}
        </button>
      </div>

      {/* 7. Time detected */}
      <div className="flex items-center justify-end min-w-[4rem]">
        <span className="tabular-nums text-xs text-text-tertiary">
          {timeAgo(opportunity.detectedAt)}
        </span>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Column header
// ---------------------------------------------------------------------------

function ColumnHeaders() {
  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] items-center gap-4",
        "px-4 py-2",
      )}
    >
      <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
        Market
      </span>
      <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
        Platform A
      </span>
      <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
        Platform B
      </span>
      <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted text-center min-w-[5rem]">
        Spread
      </span>
      <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted text-right min-w-[5.5rem]">
        Est. Profit
      </span>
      <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted text-center min-w-[7rem]">
        Action
      </span>
      <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted text-right min-w-[4rem]">
        Detected
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ArbitrageScanner({
  opportunities,
  isLoading,
  onExecute,
}: ArbitrageScannerProps) {
  // Sort by spread descending
  const sorted = useMemo(
    () => [...opportunities].sort((a, b) => b.spreadPercent - a.spreadPercent),
    [opportunities],
  );

  if (isLoading) {
    return <ArbitrageScannerSkeleton />;
  }

  return (
    <div className="w-full rounded-2xl bg-arbiter-surface border border-arbiter-border-subtle overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-arbiter-border-subtle">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-text-primary tracking-tight">
            Arbitrage Scanner
          </h2>
          <span className="tabular-nums inline-flex items-center rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-2xs font-semibold text-indigo-400 border border-indigo-500/20">
            {sorted.length} live
          </span>
        </div>

        {/* Scanning indicator */}
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="inline-block h-2 w-2 rounded-full bg-profit"
          />
          <span className="text-2xs font-medium text-text-tertiary uppercase tracking-wider">
            Live
          </span>
        </div>
      </div>

      {/* Content */}
      {sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="p-2">
          <ColumnHeaders />

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-1.5"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {sorted.map((opp) => (
                <OpportunityRow
                  key={opp.id}
                  opportunity={opp}
                  onExecute={onExecute}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md bg-arbiter-elevated animate-shimmer",
        "bg-gradient-to-r from-arbiter-elevated via-arbiter-border/30 to-arbiter-elevated bg-[length:200%_100%]",
        className,
      )}
    />
  );
}

export function ArbitrageScannerSkeleton() {
  return (
    <div className="w-full rounded-2xl bg-arbiter-surface border border-arbiter-border-subtle overflow-hidden">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-arbiter-border-subtle">
        <div className="flex items-center gap-3">
          <SkeletonPulse className="h-5 w-40" />
          <SkeletonPulse className="h-5 w-14 rounded-full" />
        </div>
        <SkeletonPulse className="h-4 w-12" />
      </div>

      {/* Column headers skeleton */}
      <div className="px-4 py-2 mx-2 mt-2">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] items-center gap-4">
          <SkeletonPulse className="h-3 w-16" />
          <SkeletonPulse className="h-3 w-20" />
          <SkeletonPulse className="h-3 w-20" />
          <SkeletonPulse className="h-3 w-12 mx-auto" />
          <SkeletonPulse className="h-3 w-16 ml-auto" />
          <SkeletonPulse className="h-3 w-14 mx-auto" />
          <SkeletonPulse className="h-3 w-16 ml-auto" />
        </div>
      </div>

      {/* Row skeletons */}
      <div className="flex flex-col gap-1.5 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] items-center gap-4",
              "rounded-xl px-4 py-3",
              "bg-arbiter-surface border border-arbiter-border-subtle",
            )}
          >
            <SkeletonPulse className="h-4 w-3/4" />
            <div className="flex items-center gap-2">
              <SkeletonPulse className="h-5 w-16 rounded-md" />
              <SkeletonPulse className="h-4 w-10" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonPulse className="h-5 w-20 rounded-md" />
              <SkeletonPulse className="h-4 w-10" />
            </div>
            <SkeletonPulse className="h-5 w-14 mx-auto" />
            <SkeletonPulse className="h-4 w-16 ml-auto" />
            <SkeletonPulse className="h-7 w-24 rounded-lg mx-auto" />
            <SkeletonPulse className="h-3 w-12 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
