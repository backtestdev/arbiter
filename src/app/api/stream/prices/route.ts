import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events endpoint for real-time price updates.
 * In production, this subscribes to Upstash Redis pub/sub.
 * For development, simulates price ticks every 2-5 seconds.
 */
export async function GET(_request: NextRequest) {
  const encoder = new TextEncoder();

  const marketIds = [
    "kalshi_pres_2028",
    "poly_pres_2028",
    "kalshi_btc_100k",
    "poly_btc_100k",
    "kalshi_fed_rate",
    "poly_fed_rate",
    "kalshi_sp500",
    "poly_sp500",
    "kalshi_eth_merge",
    "poly_eth_5k",
  ];

  // Base prices for simulation
  const basePrices: Record<string, number> = {
    kalshi_pres_2028: 0.52,
    poly_pres_2028: 0.49,
    kalshi_btc_100k: 0.72,
    poly_btc_100k: 0.68,
    kalshi_fed_rate: 0.35,
    poly_fed_rate: 0.31,
    kalshi_sp500: 0.61,
    poly_sp500: 0.57,
    kalshi_eth_merge: 0.42,
    poly_eth_5k: 0.38,
  };

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        // Pick a random market to update
        const marketId =
          marketIds[Math.floor(Math.random() * marketIds.length)];
        const base = basePrices[marketId] || 0.5;

        // Random walk
        const delta = (Math.random() - 0.5) * 0.02;
        const newYes = Math.max(0.01, Math.min(0.99, base + delta));
        basePrices[marketId] = newYes;

        const data = JSON.stringify({
          marketId,
          yesPrice: Math.round(newYes * 100) / 100,
          noPrice: Math.round((1 - newYes) * 100) / 100,
          timestamp: Date.now(),
        });

        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }, 2000 + Math.random() * 3000);

      // Clean up on close
      _request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
