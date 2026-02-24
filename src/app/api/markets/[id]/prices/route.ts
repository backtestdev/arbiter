import { NextRequest, NextResponse } from "next/server";

// Simulates real-time price with small random walks
function simulatePrice(base: number): number {
  const delta = (Math.random() - 0.5) * 0.02;
  return Math.max(0.01, Math.min(0.99, base + delta));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const marketId = params.id;

  // In production, fetch from Redis cache or platform APIs
  const baseYes = 0.5 + (Math.random() - 0.5) * 0.4;
  const yesPrice = simulatePrice(baseYes);
  const noPrice = simulatePrice(1 - baseYes);

  return NextResponse.json({
    marketId,
    yesPrice: Math.round(yesPrice * 100) / 100,
    noPrice: Math.round(noPrice * 100) / 100,
    timestamp: Date.now(),
  });
}
