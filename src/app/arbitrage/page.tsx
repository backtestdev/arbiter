"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { ArbitrageScanner, ArbitrageScannerSkeleton } from "@/components/market/arbitrage-scanner";
import { usePriceStream } from "@/hooks/use-price-stream";
import { useLiveArbitrage } from "@/hooks/use-live-arbitrage";
import type { ArbitrageOpportunity } from "@/types";

interface ArbScanResponse {
  opportunities: ArbitrageOpportunity[];
  scannedAt: string;
  count: number;
}

export default function ArbitragePage() {
  usePriceStream();

  const { data, isLoading } = useQuery<ArbScanResponse>({
    queryKey: ["arbitrage"],
    queryFn: async () => {
      const res = await fetch("/api/arbitrage/scan");
      if (!res.ok) throw new Error("Failed to scan for arbitrage");
      return res.json();
    },
    refetchInterval: 15_000,
  });

  // Apply live price updates to recalculate spreads in real-time
  const liveOpportunities = useLiveArbitrage(data?.opportunities ?? []);

  const handleExecute = async (opportunityId: string) => {
    const opp = liveOpportunities.find((o) => o.id === opportunityId);
    if (!opp) return;

    try {
      const res = await fetch("/api/trade/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: opp.marketA.externalId,
          platform: opp.marketA.platform,
          side: opp.marketA.yesPrice < opp.marketB.yesPrice ? "YES" : "NO",
          shares: 100,
          limitPrice: Math.min(opp.marketA.yesPrice, opp.marketB.yesPrice),
        }),
      });
      const result = await res.json();
      if (!result.success) {
        console.error("Arbitrage execution failed:", result.error);
      }
    } catch (err) {
      console.error("Arbitrage execution error:", err);
    }
  };

  return (
    <>
      <PageHeader
        title="Arbitrage Scanner"
        subtitle="Real-time pricing inefficiencies between Kalshi and Polymarket"
        action={
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-profit opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-profit" />
            </span>
            <span className="text-sm text-text-secondary">Scanning live</span>
          </div>
        }
      />

      {isLoading ? (
        <ArbitrageScannerSkeleton />
      ) : (
        <ArbitrageScanner
          opportunities={liveOpportunities}
          isLoading={isLoading}
          onExecute={handleExecute}
        />
      )}
    </>
  );
}
