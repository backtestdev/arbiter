"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { ArbitrageScanner, ArbitrageScannerSkeleton } from "@/components/market/arbitrage-scanner";
import { usePriceStream } from "@/hooks/use-price-stream";
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

  const handleExecute = async (opportunityId: string) => {
    // In production: call /api/trade/execute for both legs
    console.log("Executing arbitrage:", opportunityId);
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
          opportunities={data?.opportunities ?? []}
          isLoading={isLoading}
          onExecute={handleExecute}
        />
      )}
    </>
  );
}
