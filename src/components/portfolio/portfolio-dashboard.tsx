"use client";

import { motion } from "framer-motion";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { usePriceFlash } from "@/hooks/use-price-flash";
import type { Position, PortfolioSummary } from "@/types";

// --- Stat Card ---
function StatCard({
  label,
  value,
  change,
  prefix,
  delay = 0,
}: {
  label: string;
  value: number;
  change?: number;
  prefix?: string;
  delay?: number;
}) {
  const flash = usePriceFlash(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "glass rounded-2xl p-5 relative overflow-hidden",
        flash === "up" && "animate-flash-green",
        flash === "down" && "animate-flash-red"
      )}
    >
      <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-text-primary tabular-nums" data-price>
        {prefix}
        {formatCurrency(value)}
      </p>
      {change !== undefined && (
        <p
          className={cn(
            "text-sm font-medium tabular-nums mt-1",
            change >= 0 ? "text-profit" : "text-loss"
          )}
        >
          {formatPercent(change)}
        </p>
      )}
    </motion.div>
  );
}

// --- Positions Table ---
function PositionsTable({
  positions,
  onSelectPosition,
}: {
  positions: Position[];
  onSelectPosition?: (pos: Position) => void;
}) {
  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-arbiter-elevated flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-text-secondary font-medium">No open positions</p>
        <p className="text-text-muted text-sm mt-1">
          Browse markets to place your first trade
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-arbiter-border-subtle">
            <th className="text-left text-2xs font-semibold uppercase tracking-wider text-text-muted py-3 px-4">
              Market
            </th>
            <th className="text-center text-2xs font-semibold uppercase tracking-wider text-text-muted py-3 px-2">
              Platform
            </th>
            <th className="text-center text-2xs font-semibold uppercase tracking-wider text-text-muted py-3 px-2">
              Side
            </th>
            <th className="text-right text-2xs font-semibold uppercase tracking-wider text-text-muted py-3 px-2">
              Shares
            </th>
            <th className="text-right text-2xs font-semibold uppercase tracking-wider text-text-muted py-3 px-2">
              Avg Price
            </th>
            <th className="text-right text-2xs font-semibold uppercase tracking-wider text-text-muted py-3 px-2">
              Current
            </th>
            <th className="text-right text-2xs font-semibold uppercase tracking-wider text-text-muted py-3 px-4">
              P&L
            </th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos, i) => (
            <motion.tr
              key={pos.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              onClick={() => onSelectPosition?.(pos)}
              className="border-b border-arbiter-border-subtle hover:bg-arbiter-elevated/50 cursor-pointer transition-colors"
            >
              <td className="py-3 px-4">
                <p className="text-sm font-medium text-text-primary truncate max-w-[200px]">
                  {pos.marketTitle}
                </p>
              </td>
              <td className="py-3 px-2 text-center">
                <span
                  className={cn(
                    "arbiter-badge",
                    pos.platform === "KALSHI"
                      ? "bg-indigo-500/10 text-indigo-400"
                      : "bg-purple-500/10 text-purple-400"
                  )}
                >
                  {pos.platform === "KALSHI" ? "K" : "PM"}
                </span>
              </td>
              <td className="py-3 px-2 text-center">
                <span
                  className={cn(
                    "arbiter-badge",
                    pos.side === "YES" ? "bg-profit-dim text-profit" : "bg-loss-dim text-loss"
                  )}
                >
                  {pos.side}
                </span>
              </td>
              <td className="py-3 px-2 text-right text-sm text-text-primary tabular-nums">
                {pos.shares.toFixed(1)}
              </td>
              <td className="py-3 px-2 text-right text-sm text-text-secondary tabular-nums">
                {(pos.avgPrice * 100).toFixed(0)}¢
              </td>
              <td className="py-3 px-2 text-right text-sm text-text-primary tabular-nums">
                {(pos.currentPrice * 100).toFixed(0)}¢
              </td>
              <td className="py-3 px-4 text-right">
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    pos.pnl >= 0 ? "text-profit" : "text-loss"
                  )}
                >
                  {pos.pnl >= 0 ? "+" : ""}
                  {formatCurrency(pos.pnl)}
                </span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Platform Breakdown ---
function PlatformBreakdown({
  kalshiValue,
  polymarketValue,
  totalValue,
}: {
  kalshiValue: number;
  polymarketValue: number;
  totalValue: number;
}) {
  const kalshiPct = totalValue > 0 ? (kalshiValue / totalValue) * 100 : 0;
  const polyPct = totalValue > 0 ? (polymarketValue / totalValue) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span className="text-sm text-text-secondary">Kalshi</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text-primary tabular-nums">
            {formatCurrency(kalshiValue)}
          </span>
          <span className="text-2xs text-text-muted tabular-nums w-10 text-right">
            {kalshiPct.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span className="text-sm text-text-secondary">Polymarket</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text-primary tabular-nums">
            {formatCurrency(polymarketValue)}
          </span>
          <span className="text-2xs text-text-muted tabular-nums w-10 text-right">
            {polyPct.toFixed(0)}%
          </span>
        </div>
      </div>
      {/* Bar visualization */}
      <div className="h-2 rounded-full bg-arbiter-elevated overflow-hidden flex">
        {kalshiPct > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${kalshiPct}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="h-full bg-indigo-500 rounded-l-full"
          />
        )}
        {polyPct > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${polyPct}%` }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="h-full bg-purple-500 rounded-r-full"
          />
        )}
      </div>
    </div>
  );
}

// --- Main Dashboard ---
interface PortfolioDashboardProps {
  summary: PortfolioSummary;
  positions: Position[];
  isLoading: boolean;
  onSelectPosition?: (pos: Position) => void;
}

export function PortfolioDashboard({
  summary,
  positions,
  isLoading,
  onSelectPosition,
}: PortfolioDashboardProps) {
  if (isLoading) {
    return <PortfolioDashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Portfolio Value" value={summary.totalValue} delay={0} />
        <StatCard
          label="Total P&L"
          value={summary.totalPnl}
          change={summary.totalPnlPercent}
          delay={0.05}
        />
        <StatCard label="Open Positions" value={summary.openPositions} delay={0.1} />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="glass rounded-2xl p-5"
        >
          <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
            Platform Allocation
          </p>
          <PlatformBreakdown
            kalshiValue={summary.kalshiValue}
            polymarketValue={summary.polymarketValue}
            totalValue={summary.totalValue}
          />
        </motion.div>
      </div>

      {/* Positions table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="glass rounded-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-arbiter-border-subtle">
          <h2 className="text-lg font-semibold text-text-primary">Open Positions</h2>
          <span className="arbiter-badge-neutral">{positions.length} active</span>
        </div>
        <PositionsTable positions={positions} onSelectPosition={onSelectPosition} />
      </motion.div>
    </div>
  );
}

// --- Skeleton ---
export function PortfolioDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass rounded-2xl p-5 space-y-3">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-7 w-32" />
            <div className="skeleton h-4 w-16" />
          </div>
        ))}
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-arbiter-border-subtle">
          <div className="skeleton h-5 w-32" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
