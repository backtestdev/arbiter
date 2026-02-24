import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const TradeRequestSchema = z.object({
  marketId: z.string(),
  platform: z.enum(["KALSHI", "POLYMARKET"]),
  side: z.enum(["YES", "NO"]),
  orderType: z.enum(["market", "limit"]).default("market"),
  amount: z.number().positive(),
  limitPrice: z.number().min(0.01).max(0.99).optional(),
  shares: z.number().positive().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = TradeRequestSchema.parse(body);

    // For limit orders, require limitPrice
    if (validated.orderType === "limit" && !validated.limitPrice) {
      return NextResponse.json(
        { success: false, error: "Limit price required for limit orders" },
        { status: 400 },
      );
    }

    // Simulate fill based on order type
    const basePrice = validated.limitPrice ?? 0.50;
    const slippage = validated.orderType === "market"
      ? (Math.random() * 0.02)
      : (Math.random() * 0.005);

    const fillPrice = Math.max(
      0.01,
      Math.min(0.99, basePrice + slippage),
    );

    // For limit orders, ensure we don't fill above limit
    const actualFillPrice = validated.orderType === "limit" && validated.limitPrice
      ? Math.min(fillPrice, validated.limitPrice)
      : fillPrice;

    const filledShares = validated.shares ?? (validated.amount / actualFillPrice);

    return NextResponse.json({
      success: true,
      orderId: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      orderType: validated.orderType,
      filledShares: Math.round(filledShares * 100) / 100,
      avgFillPrice: Math.round(actualFillPrice * 100) / 100,
      totalCost: Math.round(filledShares * actualFillPrice * 100) / 100,
      platform: validated.platform,
      side: validated.side,
      executedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid trade parameters", details: err.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Trade execution failed" },
      { status: 500 },
    );
  }
}
