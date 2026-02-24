"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ArbitrageOpportunity, ArbRisk } from "@/types";
import {
  cn,
  formatPrice,
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
// Risk badge
// ---------------------------------------------------------------------------

function RiskBadge({ risk }: { risk: ArbRisk }) {
  return (
    <span
      className={cn(
        "arbiter-badge border text-2xs",
        risk.level === "low" && "bg-profit/10 text-profit border-profit/20",
        risk.level === "medium" && "bg-amber-500/10 text-amber-400 border-amber-500/20",
        risk.level === "high" && "bg-loss/10 text-loss border-loss/20",
      )}
      title={risk.factors.map((f) => f.title).join(", ")}
    >
      {risk.level === "low" && "Low Risk"}
      {risk.level === "medium" && "Med Risk"}
      {risk.level === "high" && "High Risk"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Platform badge
// ---------------------------------------------------------------------------

function PlatformBadge({
  platform,
  price,
  label,
}: {
  platform: string;
  price: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className="text-2xs text-text-muted">{label}</span>
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-2xs font-semibold",
            platform === "KALSHI"
              ? "bg-indigo-500/15 text-indigo-400"
              : "bg-purple-500/15 text-purple-400",
          )}
        >
          {platform === "KALSHI" ? "K" : "PM"}
        </span>
        <span className="tabular-nums text-sm font-semibold text-text-primary">
          {formatPrice(price)}
        </span>
      </div>
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
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="mb-6"
      >
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-indigo-500">
          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
          <circle cx="24" cy="24" r="12" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
          <circle cx="24" cy="24" r="3" fill="currentColor" fillOpacity="0.6" />
          <motion.line
            x1="24" y1="24" x2="24" y2="4"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
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
        Scanning orderbooks...
      </motion.p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Opportunity card
// ---------------------------------------------------------------------------

function OpportunityCard({
  opportunity,
  onExecute,
}: {
  opportunity: ArbitrageOpportunity;
  onExecute: (id: string) => void;
}) {
  const isActive = opportunity.status === "ACTIVE";
  const isExpired = opportunity.status === "EXPIRED";
  const isExecuted = opportunity.status === "EXECUTED";

  const capitalRequired =
    opportunity.maxExecutableSize *
    (opportunity.executableDepth.avgBuyPrice + opportunity.executableDepth.avgSellPrice);

  return (
    <motion.div
      layout
      variants={rowVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        "group rounded-xl p-4 transition-colors duration-200",
        "bg-arbiter-surface border border-arbiter-border-subtle",
        "hover:bg-arbiter-elevated hover:border-arbiter-border",
        (isExpired || isExecuted) && "opacity-50",
      )}
    >
      {/* Row 1: Market title + risk + time */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">
            {opportunity.marketA.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <RiskBadge risk={opportunity.arbRisk} />
            <span className="text-2xs text-text-muted tabular-nums">
              {timeAgo(opportunity.detectedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Trade legs + metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <PlatformBadge
          platform={opportunity.buyPlatform}
          price={opportunity.bestBuyPrice}
          label={`Buy ${opportunity.yesArb ? "YES" : "YES"}`}
        />
        <PlatformBadge
          platform={opportunity.sellPlatform}
          price={opportunity.bestSellPrice}
          label={`Buy ${opportunity.yesArb ? "NO" : "NO"}`}
        />
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-2xs text-text-muted">Spread</span>
          <span className="tabular-nums text-sm font-bold text-profit">
            +{opportunity.spreadPercent.toFixed(1)}%
          </span>
        </div>
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-2xs text-text-muted">Book Depth</span>
          <span className="tabular-nums text-sm font-semibold text-text-primary">
            {opportunity.maxExecutableSize.toLocaleString()} shares
          </span>
        </div>
      </div>

      {/* Row 3: $ metrics + execute */}
      <div className="flex items-center justify-between pt-3 border-t border-arbiter-border-subtle">
        <div className="flex items-center gap-5">
          <div className="flex flex-col gap-0.5">
            <span className="text-2xs text-text-muted">Max Profit</span>
            <span className="tabular-nums text-lg font-bold text-profit">
              {formatCurrency(opportunity.maxExecutableProfit)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-2xs text-text-muted">Capital Req.</span>
            <span className="tabular-nums text-sm font-semibold text-text-secondary">
              {formatCurrency(capitalRequired)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-2xs text-text-muted">ROI</span>
            <span className="tabular-nums text-sm font-semibold text-profit">
              {capitalRequired > 0
                ? `+${((opportunity.maxExecutableProfit / capitalRequired) * 100).toFixed(1)}%`
                : "--"}
            </span>
          </div>
        </div>

        <button
          onClick={() => onExecute(opportunity.id)}
          disabled={!isActive}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2",
            "text-sm font-semibold tracking-wide transition-all duration-200",
            isActive
              ? "bg-indigo-500 text-white hover:bg-indigo-400 hover:shadow-glow active:scale-[0.97]"
              : "bg-arbiter-elevated text-text-muted cursor-not-allowed",
          )}
        >
          {isExecuted ? "Executed" : isExpired ? "Expired" : "Execute"}
        </button>
      </div>

      {/* Risk factors */}
      {opportunity.arbRisk.factors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-arbiter-border-subtle">
          <div className="flex flex-wrap gap-1.5">
            {opportunity.arbRisk.factors.map((factor, i) => (
              <span
                key={i}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs",
                  factor.severity === "critical" && "bg-loss/10 text-loss",
                  factor.severity === "warning" && "bg-amber-500/10 text-amber-400",
                  factor.severity === "info" && "bg-sky-500/10 text-sky-400",
                )}
                title={factor.description}
              >
                {factor.severity === "critical" && "⚠ "}
                {factor.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
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
  const sorted = useMemo(
    () => [...opportunities].sort((a, b) => b.maxExecutableProfit - a.maxExecutableProfit),
    [opportunities],
  );

  const totalProfit = sorted.reduce((sum, o) => sum + o.maxExecutableProfit, 0);
  const totalCapital = sorted.reduce(
    (sum, o) =>
      sum + o.maxExecutableSize * (o.executableDepth.avgBuyPrice + o.executableDepth.avgSellPrice),
    0,
  );

  if (isLoading) {
    return <ArbitrageScannerSkeleton />;
  }

  return (
    <div className="w-full space-y-4">
      {/* Summary stats */}
      {sorted.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          <div className="glass rounded-xl p-4">
            <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-1">
              Opportunities
            </p>
            <p className="text-xl font-bold text-text-primary tabular-nums">{sorted.length}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-1">
              Total Profit Available
            </p>
            <p className="text-xl font-bold text-profit tabular-nums">
              {formatCurrency(totalProfit)}
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-1">
              Capital Required
            </p>
            <p className="text-xl font-bold text-text-primary tabular-nums">
              {formatCurrency(totalCapital)}
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-1">
              Avg ROI
            </p>
            <p className="text-xl font-bold text-profit tabular-nums">
              {totalCapital > 0 ? `+${((totalProfit / totalCapital) * 100).toFixed(1)}%` : "--"}
            </p>
          </div>
        </motion.div>
      )}

      {sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-3"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {sorted.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} onExecute={onExecute} />
            ))}
          </AnimatePresence>
        </motion.div>
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
    <div className="w-full space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass rounded-xl p-4 space-y-2">
            <SkeletonPulse className="h-3 w-20" />
            <SkeletonPulse className="h-6 w-16" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4 bg-arbiter-surface border border-arbiter-border-subtle space-y-3"
          >
            <div className="space-y-1.5">
              <SkeletonPulse className="h-4 w-3/4" />
              <div className="flex gap-2">
                <SkeletonPulse className="h-5 w-16 rounded-full" />
                <SkeletonPulse className="h-5 w-12" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-1">
                  <SkeletonPulse className="h-3 w-12" />
                  <SkeletonPulse className="h-5 w-16" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-arbiter-border-subtle">
              <div className="flex gap-4">
                <SkeletonPulse className="h-8 w-20" />
                <SkeletonPulse className="h-5 w-16 mt-2" />
              </div>
              <SkeletonPulse className="h-9 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
