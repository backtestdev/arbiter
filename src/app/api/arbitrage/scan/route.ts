import { NextResponse } from "next/server";
import type { ArbitrageOpportunity, Market, ArbitrageStatus } from "@/types";

// Mock arbitrage opportunities for development
function generateMockOpportunities(): ArbitrageOpportunity[] {
  const now = new Date();
  const pairs: Array<{
    marketA: Market;
    marketB: Market;
  }> = [
    {
      marketA: {
        id: "kalshi_pres_2028",
        externalId: "PRES-2028-DEM",
        platform: "KALSHI",
        title: "Will a Democrat win the 2028 presidential election?",
        description: "",
        category: "Politics",
        yesPrice: 0.52,
        noPrice: 0.48,
        volume24h: 284000,
        liquidity: 1200000,
        closingTime: new Date("2028-11-03"),
        resolvedAt: null,
        resolution: null,
        status: "ACTIVE",
        matchedMarketId: "poly_pres_2028",
        lastUpdated: now,
      },
      marketB: {
        id: "poly_pres_2028",
        externalId: "0x1234abcd",
        platform: "POLYMARKET",
        title: "Democrat wins 2028 presidential election",
        description: "",
        category: "Politics",
        yesPrice: 0.49,
        noPrice: 0.51,
        volume24h: 520000,
        liquidity: 3400000,
        closingTime: new Date("2028-11-03"),
        resolvedAt: null,
        resolution: null,
        status: "ACTIVE",
        matchedMarketId: "kalshi_pres_2028",
        lastUpdated: now,
      },
    },
    {
      marketA: {
        id: "kalshi_btc_100k",
        externalId: "BTC-100K-2026",
        platform: "KALSHI",
        title: "Will Bitcoin exceed $100,000 by end of 2026?",
        description: "",
        category: "Crypto",
        yesPrice: 0.72,
        noPrice: 0.28,
        volume24h: 156000,
        liquidity: 890000,
        closingTime: new Date("2026-12-31"),
        resolvedAt: null,
        resolution: null,
        status: "ACTIVE",
        matchedMarketId: "poly_btc_100k",
        lastUpdated: now,
      },
      marketB: {
        id: "poly_btc_100k",
        externalId: "0x5678efgh",
        platform: "POLYMARKET",
        title: "Bitcoin above $100K in 2026",
        description: "",
        category: "Crypto",
        yesPrice: 0.68,
        noPrice: 0.32,
        volume24h: 340000,
        liquidity: 2100000,
        closingTime: new Date("2026-12-31"),
        resolvedAt: null,
        resolution: null,
        status: "ACTIVE",
        matchedMarketId: "kalshi_btc_100k",
        lastUpdated: now,
      },
    },
    {
      marketA: {
        id: "kalshi_fed_rate",
        externalId: "FED-RATE-CUT-MAR26",
        platform: "KALSHI",
        title: "Will the Fed cut rates in March 2026?",
        description: "",
        category: "Economics",
        yesPrice: 0.35,
        noPrice: 0.65,
        volume24h: 89000,
        liquidity: 450000,
        closingTime: new Date("2026-03-20"),
        resolvedAt: null,
        resolution: null,
        status: "ACTIVE",
        matchedMarketId: "poly_fed_rate",
        lastUpdated: now,
      },
      marketB: {
        id: "poly_fed_rate",
        externalId: "0x9abcdef0",
        platform: "POLYMARKET",
        title: "Fed rate cut in March 2026",
        description: "",
        category: "Economics",
        yesPrice: 0.31,
        noPrice: 0.69,
        volume24h: 125000,
        liquidity: 780000,
        closingTime: new Date("2026-03-20"),
        resolvedAt: null,
        resolution: null,
        status: "ACTIVE",
        matchedMarketId: "kalshi_fed_rate",
        lastUpdated: now,
      },
    },
    {
      marketA: {
        id: "kalshi_sp500",
        externalId: "SP500-6000-2026",
        platform: "KALSHI",
        title: "Will the S&P 500 close above 6,000 on Dec 31, 2026?",
        description: "",
        category: "Finance",
        yesPrice: 0.61,
        noPrice: 0.39,
        volume24h: 210000,
        liquidity: 950000,
        closingTime: new Date("2026-12-31"),
        resolvedAt: null,
        resolution: null,
        status: "ACTIVE",
        matchedMarketId: "poly_sp500",
        lastUpdated: now,
      },
      marketB: {
        id: "poly_sp500",
        externalId: "0xcafebabe",
        platform: "POLYMARKET",
        title: "S&P 500 above 6,000 at end of 2026",
        description: "",
        category: "Finance",
        yesPrice: 0.57,
        noPrice: 0.43,
        volume24h: 175000,
        liquidity: 1100000,
        closingTime: new Date("2026-12-31"),
        resolvedAt: null,
        resolution: null,
        status: "ACTIVE",
        matchedMarketId: "kalshi_sp500",
        lastUpdated: now,
      },
    },
    {
      marketA: {
        id: "kalshi_eth_merge",
        externalId: "ETH-5K-2026",
        platform: "KALSHI",
        title: "Will Ethereum exceed $5,000 in 2026?",
        description: "",
        category: "Crypto",
        yesPrice: 0.42,
        noPrice: 0.58,
        volume24h: 67000,
        liquidity: 340000,
        closingTime: new Date("2026-12-31"),
        resolvedAt: null,
        resolution: null,
        status: "ACTIVE",
        matchedMarketId: "poly_eth_5k",
        lastUpdated: now,
      },
      marketB: {
        id: "poly_eth_5k",
        externalId: "0xfeedface",
        platform: "POLYMARKET",
        title: "Ethereum above $5,000 in 2026",
        description: "",
        category: "Crypto",
        yesPrice: 0.38,
        noPrice: 0.62,
        volume24h: 92000,
        liquidity: 560000,
        closingTime: new Date("2026-12-31"),
        resolvedAt: null,
        resolution: null,
        status: "ACTIVE",
        matchedMarketId: "kalshi_eth_merge",
        lastUpdated: now,
      },
    },
  ];

  return pairs
    .map((pair, i) => {
      const { marketA, marketB } = pair;
      const spreadYes = Math.abs(marketA.yesPrice - marketB.yesPrice);
      const costAB = marketA.yesPrice + marketB.noPrice;
      const costBA = marketB.yesPrice + marketA.noPrice;
      const minCost = Math.min(costAB, costBA);
      const profit = minCost < 1 ? (1 - minCost) * 100 : 0;

      return {
        id: `arb_${i}`,
        marketA,
        marketB,
        spreadPercent: parseFloat((spreadYes * 100).toFixed(1)),
        yesArb: costAB < 0.99,
        noArb: costBA < 0.99,
        estimatedProfit100: parseFloat(profit.toFixed(2)),
        detectedAt: new Date(now.getTime() - Math.random() * 600000),
        expiresAt: new Date(now.getTime() + 300000),
        status: "ACTIVE" as ArbitrageStatus,
      };
    })
    .filter((o) => o.spreadPercent > 1)
    .sort((a, b) => b.spreadPercent - a.spreadPercent);
}

export async function GET() {
  const opportunities = generateMockOpportunities();

  return NextResponse.json({
    opportunities,
    scannedAt: new Date().toISOString(),
    count: opportunities.length,
  });
}
