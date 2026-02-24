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
    "kalshi_pres_2028_dem",
    "poly_pres_2028_dem",
    "kalshi_btc_100k",
    "poly_btc_100k",
    "kalshi_fed_rate_mar26",
    "poly_fed_rate_mar26",
    "kalshi_sp500_6000",
    "poly_sp500_6000",
    "kalshi_eth_5k",
    "poly_eth_5k",
    "kalshi_house_gop_2026",
    "poly_house_gop_2026",
    "kalshi_aapl_4t",
    "poly_aapl_4t",
    "kalshi_wc2026_brazil",
    "poly_wc2026_brazil",
    "kalshi_film_2b_2026",
    "poly_film_2b_2026",
    "kalshi_cpi_below_25",
    "poly_cpi_below_25",
    "kalshi_sol_500",
    "poly_sol_500",
    "kalshi_sb_lxi_chiefs",
    "poly_sb_lxi_chiefs",
    "kalshi_agi_2026",
    "poly_recession_2026",
    "kalshi_tiktok_ban",
    "poly_oscar_best_picture",
    "kalshi_tsla_500",
  ];

  // Base prices for simulation
  const basePrices: Record<string, number> = {
    kalshi_pres_2028_dem: 0.52,
    poly_pres_2028_dem: 0.49,
    kalshi_btc_100k: 0.72,
    poly_btc_100k: 0.68,
    kalshi_fed_rate_mar26: 0.35,
    poly_fed_rate_mar26: 0.31,
    kalshi_sp500_6000: 0.61,
    poly_sp500_6000: 0.57,
    kalshi_eth_5k: 0.42,
    poly_eth_5k: 0.38,
    kalshi_house_gop_2026: 0.46,
    poly_house_gop_2026: 0.44,
    kalshi_aapl_4t: 0.58,
    poly_aapl_4t: 0.55,
    kalshi_wc2026_brazil: 0.14,
    poly_wc2026_brazil: 0.12,
    kalshi_film_2b_2026: 0.22,
    poly_film_2b_2026: 0.17,
    kalshi_cpi_below_25: 0.41,
    poly_cpi_below_25: 0.38,
    kalshi_sol_500: 0.28,
    poly_sol_500: 0.26,
    kalshi_sb_lxi_chiefs: 0.11,
    poly_sb_lxi_chiefs: 0.10,
    kalshi_agi_2026: 0.08,
    poly_recession_2026: 0.22,
    kalshi_tiktok_ban: 0.15,
    poly_oscar_best_picture: 0.33,
    kalshi_tsla_500: 0.47,
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
