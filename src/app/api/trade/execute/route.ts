import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const TradeRequestSchema = z.object({
  marketId: z.string(),
  platform: z.enum(["KALSHI", "POLYMARKET"]),
  side: z.enum(["YES", "NO"]),
  shares: z.number().positive(),
  limitPrice: z.number().min(0.01).max(0.99),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = TradeRequestSchema.parse(body);

    // In production: route to appropriate platform client via ExecutionRouter
    // For development, simulate a successful trade
    const slippage = (Math.random() - 0.5) * 0.01;
    const fillPrice = Math.max(
      0.01,
      Math.min(0.99, validated.limitPrice + slippage)
    );

    return NextResponse.json({
      success: true,
      orderId: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      filledShares: validated.shares,
      avgFillPrice: Math.round(fillPrice * 100) / 100,
      platform: validated.platform,
      side: validated.side,
      executedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid trade parameters", details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Trade execution failed" },
      { status: 500 }
    );
  }
}
