import type { Market, UnifiedMarket } from "@/types";
import type { KalshiMarket } from "@/lib/kalshi/client";
import type { PolymarketMarket } from "@/lib/polymarket/client";

/**
 * Normalizes a Kalshi market response into our unified Market schema.
 * Kalshi prices are in cents (1-99), we normalize to 0-1.
 */
export function normalizeKalshiMarket(raw: KalshiMarket): Market {
  const yesPrice = raw.yes_bid / 100;
  const noPrice = raw.no_bid / 100;

  return {
    id: `kalshi_${raw.ticker}`,
    externalId: raw.ticker,
    platform: "KALSHI",
    title: raw.title,
    description: raw.subtitle || "",
    category: raw.category || "general",
    yesPrice: Math.max(0, Math.min(1, yesPrice)),
    noPrice: Math.max(0, Math.min(1, noPrice)),
    volume24h: raw.volume_24h || 0,
    liquidity: raw.open_interest || 0,
    closingTime: new Date(raw.close_time),
    resolvedAt: raw.result ? new Date() : null,
    resolution: raw.result === "yes" ? "YES" : raw.result === "no" ? "NO" : null,
    status: raw.status === "active" ? "ACTIVE" : raw.result ? "RESOLVED" : "CLOSED",
    matchedMarketId: null,
    lastUpdated: new Date(),
  };
}

/**
 * Normalizes a Polymarket CLOB market response into our unified Market schema.
 * Polymarket prices are already 0-1.
 */
export function normalizePolymarketMarket(raw: PolymarketMarket): Market {
  const yesToken = raw.tokens.find(
    (t) => t.outcome.toLowerCase() === "yes"
  );
  const noToken = raw.tokens.find(
    (t) => t.outcome.toLowerCase() === "no"
  );

  return {
    id: `poly_${raw.condition_id}`,
    externalId: raw.condition_id,
    platform: "POLYMARKET",
    title: raw.question,
    description: raw.description || "",
    category: raw.category || "general",
    yesPrice: yesToken?.price ?? 0.5,
    noPrice: noToken?.price ?? 0.5,
    volume24h: raw.volume_num || raw.volume || 0,
    liquidity: raw.liquidity || 0,
    closingTime: raw.end_date_iso ? new Date(raw.end_date_iso) : new Date("2025-12-31"),
    resolvedAt: yesToken?.winner !== undefined ? new Date() : null,
    resolution: yesToken?.winner ? "YES" : noToken?.winner ? "NO" : null,
    status: raw.closed ? "CLOSED" : raw.active ? "ACTIVE" : "RESOLVED",
    matchedMarketId: null,
    lastUpdated: new Date(),
  };
}

/**
 * Merges two matched markets (one from each platform) into a UnifiedMarket.
 */
export function createUnifiedMarket(
  kalshiMarket: Market | null,
  polymarketMarket: Market | null
): UnifiedMarket | null {
  const primary = kalshiMarket || polymarketMarket;
  if (!primary) return null;

  let spread: number | null = null;
  let hasArbitrage = false;

  if (kalshiMarket && polymarketMarket) {
    spread = Math.abs(kalshiMarket.yesPrice - polymarketMarket.yesPrice) * 100;
    // Arb exists if combined cost of opposing positions < $1
    const costAB = kalshiMarket.yesPrice + polymarketMarket.noPrice;
    const costBA = polymarketMarket.yesPrice + kalshiMarket.noPrice;
    hasArbitrage = Math.min(costAB, costBA) < 0.99;
  }

  return {
    id: primary.id,
    title: primary.title,
    description: primary.description,
    category: primary.category,
    closingTime: primary.closingTime,
    kalshi: kalshiMarket,
    polymarket: polymarketMarket,
    spread,
    hasArbitrage,
  };
}
