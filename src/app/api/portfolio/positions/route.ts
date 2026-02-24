import { NextResponse } from "next/server";
import type { Position, PortfolioSummary } from "@/types";

// Mock positions for development
const MOCK_POSITIONS: Position[] = [
  {
    id: "pos_1",
    userId: "user_1",
    platform: "KALSHI",
    marketId: "kalshi_pres_2028",
    marketTitle: "Will a Democrat win the 2028 presidential election?",
    side: "YES",
    shares: 200,
    avgPrice: 0.48,
    currentPrice: 0.52,
    pnl: 8.0,
    pnlPercent: 8.33,
    openedAt: new Date("2026-01-15"),
  },
  {
    id: "pos_2",
    userId: "user_1",
    platform: "POLYMARKET",
    marketId: "poly_btc_100k",
    marketTitle: "Bitcoin above $100K in 2026",
    side: "YES",
    shares: 150,
    avgPrice: 0.65,
    currentPrice: 0.68,
    pnl: 4.5,
    pnlPercent: 4.62,
    openedAt: new Date("2026-02-01"),
  },
  {
    id: "pos_3",
    userId: "user_1",
    platform: "KALSHI",
    marketId: "kalshi_fed_rate",
    marketTitle: "Will the Fed cut rates in March 2026?",
    side: "NO",
    shares: 300,
    avgPrice: 0.6,
    currentPrice: 0.65,
    pnl: 15.0,
    pnlPercent: 8.33,
    openedAt: new Date("2026-02-10"),
  },
  {
    id: "pos_4",
    userId: "user_1",
    platform: "POLYMARKET",
    marketId: "poly_sp500",
    marketTitle: "S&P 500 above 6,000 at end of 2026",
    side: "YES",
    shares: 100,
    avgPrice: 0.59,
    currentPrice: 0.57,
    pnl: -2.0,
    pnlPercent: -3.39,
    openedAt: new Date("2026-02-14"),
  },
  {
    id: "pos_5",
    userId: "user_1",
    platform: "KALSHI",
    marketId: "kalshi_eth_merge",
    marketTitle: "Will Ethereum exceed $5,000 in 2026?",
    side: "YES",
    shares: 250,
    avgPrice: 0.39,
    currentPrice: 0.42,
    pnl: 7.5,
    pnlPercent: 7.69,
    openedAt: new Date("2026-02-05"),
  },
];

function calculateSummary(positions: Position[]): PortfolioSummary {
  let totalValue = 0;
  let totalCost = 0;
  let kalshiValue = 0;
  let polymarketValue = 0;

  for (const pos of positions) {
    const posValue = pos.shares * pos.currentPrice;
    const posCost = pos.shares * pos.avgPrice;
    totalValue += posValue;
    totalCost += posCost;

    if (pos.platform === "KALSHI") {
      kalshiValue += posValue;
    } else {
      polymarketValue += posValue;
    }
  }

  const totalPnl = totalValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return {
    totalValue,
    totalPnl,
    totalPnlPercent,
    kalshiValue,
    polymarketValue,
    openPositions: positions.length,
  };
}

export async function GET() {
  const summary = calculateSummary(MOCK_POSITIONS);

  return NextResponse.json({
    positions: MOCK_POSITIONS,
    summary,
  });
}
