"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { PortfolioDashboard } from "@/components/portfolio/portfolio-dashboard";
import { ConnectionFlow } from "@/components/connection/connection-flow";
import { usePriceStream } from "@/hooks/use-price-stream";
import { useUIStore } from "@/stores/ui-store";
import { usePortfolioStore } from "@/stores/portfolio-store";
import type { Position, PortfolioSummary } from "@/types";

interface PortfolioResponse {
  positions: Position[];
  summary: PortfolioSummary;
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

      <ConnectionFlow
        isOpen={connectionModalOpen}
        onClose={() => setConnectionModal(false)}
      />
    </>
  );
}
