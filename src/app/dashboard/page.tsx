"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { PortfolioDashboard } from "@/components/portfolio/portfolio-dashboard";
import { ConnectionFlow } from "@/components/connection/connection-flow";
import { usePriceStream } from "@/hooks/use-price-stream";
import { useUIStore } from "@/stores/ui-store";
import { usePortfolioStore } from "@/stores/portfolio-store";
import { cn } from "@/lib/utils";
import type { Position, PortfolioSummary, ArbitrageOpportunity } from "@/types";

interface PortfolioResponse {
  positions: Position[];
  summary: PortfolioSummary;
}

interface ArbScanResponse {
  opportunities: ArbitrageOpportunity[];
  count: number;
}

function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6"
    >
      <Link
        href="/markets"
        className={cn(
          "glass rounded-2xl p-5 group cursor-pointer",
          "hover:bg-arbiter-elevated hover:border-arbiter-border transition-all duration-200"
        )}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-indigo-400">
              <path d="M3 17V10M8 17V6M13 17V8M18 17V3" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-text-primary group-hover:text-white transition-colors">
            Browse Markets
          </h3>
        </div>
        <p className="text-xs text-text-muted">
          Explore prediction markets across Kalshi and Polymarket
        </p>
      </Link>

      <Link
        href="/arbitrage"
        className={cn(
          "glass rounded-2xl p-5 group cursor-pointer",
          "hover:bg-arbiter-elevated hover:border-arbiter-border transition-all duration-200"
        )}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-profit-dim flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-profit">
              <path d="M4 8L8 4L12 8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 4V13" strokeLinecap="round" />
              <path d="M16 12L12 16L8 12" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 16V7" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-text-primary group-hover:text-white transition-colors">
            Find Arbitrage
          </h3>
        </div>
        <p className="text-xs text-text-muted">
          Detect pricing inefficiencies and execute cross-platform trades
        </p>
      </Link>

      <button
        onClick={() => useUIStore.getState().setConnectionModal(true)}
        className={cn(
          "glass rounded-2xl p-5 group cursor-pointer text-left",
          "hover:bg-arbiter-elevated hover:border-arbiter-border transition-all duration-200"
        )}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-purple-400">
              <path d="M13 3h4v4M17 3l-6 6M7 3H3v4M3 3l6 6M13 17h4v-4M17 17l-6-6M7 17H3v-4M3 17l6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-text-primary group-hover:text-white transition-colors">
            Connect Accounts
          </h3>
        </div>
        <p className="text-xs text-text-muted">
          Link your Kalshi and Polymarket accounts for live trading
        </p>
      </button>
    </motion.div>
  );
}

function LiveArbCount() {
  const { data } = useQuery<ArbScanResponse>({
    queryKey: ["arbitrage"],
    queryFn: async () => {
      const res = await fetch("/api/arbitrage/scan");
      if (!res.ok) throw new Error("Failed to scan");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const count = data?.count ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <Link
        href="/arbitrage"
        className="glass rounded-2xl p-5 flex items-center justify-between group hover:bg-arbiter-elevated transition-all duration-200"
      >
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary mb-1">
            Live Arbitrage Opportunities
          </p>
          <p className="text-2xl font-bold text-text-primary tabular-nums">
            {count}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-profit opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-profit" />
            </span>
          )}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted group-hover:text-text-secondary transition-colors">
            <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </Link>
    </motion.div>
  );
}

export default function DashboardPage() {
  usePriceStream();

  const { connectionModalOpen, setConnectionModal } = useUIStore();
  const { setPositions, setSummary, setLoading } = usePortfolioStore();

  const { data, isLoading } = useQuery<PortfolioResponse>({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const res = await fetch("/api/portfolio/positions");
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (data) {
      setPositions(data.positions);
      setSummary(data.summary);
      setLoading(false);
    }
  }, [data, setPositions, setSummary, setLoading]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Your unified portfolio across all prediction markets"
        action={
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setConnectionModal(true)}
            className="arbiter-btn-primary"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v10M3 8h10" strokeLinecap="round" />
            </svg>
            Connect Account
          </motion.button>
        }
      />

      <PortfolioDashboard
        summary={data?.summary ?? {
          totalValue: 0,
          totalPnl: 0,
          totalPnlPercent: 0,
          kalshiValue: 0,
          polymarketValue: 0,
          openPositions: 0,
        }}
        positions={data?.positions ?? []}
        isLoading={isLoading}
      />

      <LiveArbCount />

      <QuickActions />

      <ConnectionFlow
        isOpen={connectionModalOpen}
        onClose={() => setConnectionModal(false)}
      />
    </>
  );
}
