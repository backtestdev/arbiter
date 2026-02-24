import { z } from "zod";
import type { Platform, TradeOrder, TradeResult } from "@/types";
import { KalshiClient } from "@/lib/kalshi/client";
import { PolymarketClient } from "@/lib/polymarket/client";

const ExecuteTradeSchema = z.object({
  marketId: z.string(),
  platform: z.enum(["KALSHI", "POLYMARKET"]),
  side: z.enum(["YES", "NO"]),
  shares: z.number().positive(),
  limitPrice: z.number().min(0.01).max(0.99),
});

interface ExecutionRouterConfig {
  kalshiClient?: KalshiClient;
  polymarketClient?: PolymarketClient;
}

/**
 * Routes trades to the appropriate platform client based on the market.
 * Handles order translation between platform APIs.
 */
export class ExecutionRouter {
  private kalshi?: KalshiClient;
  private polymarket?: PolymarketClient;

  constructor(config: ExecutionRouterConfig) {
    this.kalshi = config.kalshiClient;
    this.polymarket = config.polymarketClient;
  }

  async executeTrade(order: TradeOrder): Promise<TradeResult> {
    const validated = ExecuteTradeSchema.parse(order);

    try {
      if (validated.platform === "KALSHI") {
        return await this.executeKalshiTrade(validated);
      } else {
        return await this.executePolymarketTrade(validated);
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown execution error",
      };
    }
  }

  /**
   * Executes an arbitrage trade: simultaneous opposing trades on two platforms.
   * Buy YES on the cheaper platform, buy NO on the other.
   */
  async executeArbitrage(params: {
    marketAId: string;
    marketAPlatform: Platform;
    marketBId: string;
    marketBPlatform: Platform;
    side: "buyA_sellB" | "buyB_sellA";
    shares: number;
    priceA: number;
    priceB: number;
  }): Promise<{ legA: TradeResult; legB: TradeResult }> {
    const [legA, legB] = await Promise.allSettled([
      this.executeTrade({
        marketId: params.marketAId,
        platform: params.marketAPlatform,
        side: params.side === "buyA_sellB" ? "YES" : "NO",
        shares: params.shares,
        limitPrice: params.priceA,
      }),
      this.executeTrade({
        marketId: params.marketBId,
        platform: params.marketBPlatform,
        side: params.side === "buyA_sellB" ? "NO" : "YES",
        shares: params.shares,
        limitPrice: params.priceB,
      }),
    ]);

    return {
      legA:
        legA.status === "fulfilled"
          ? legA.value
          : { success: false, error: String(legA.reason) },
      legB:
        legB.status === "fulfilled"
          ? legB.value
          : { success: false, error: String(legB.reason) },
    };
  }

  private async executeKalshiTrade(
    order: z.infer<typeof ExecuteTradeSchema>
  ): Promise<TradeResult> {
    if (!this.kalshi) {
      return { success: false, error: "Kalshi client not configured" };
    }

    const result = await this.kalshi.placeOrder({
      ticker: order.marketId,
      side: order.side.toLowerCase() as "yes" | "no",
      count: Math.floor(order.shares),
      price: Math.round(order.limitPrice * 100),
    });

    return {
      success: result.status !== "rejected",
      orderId: result.order_id,
      filledShares: result.filled_count,
      avgFillPrice: result.avg_fill_price
        ? result.avg_fill_price / 100
        : undefined,
    };
  }

  private async executePolymarketTrade(
    order: z.infer<typeof ExecuteTradeSchema>
  ): Promise<TradeResult> {
    if (!this.polymarket) {
      return { success: false, error: "Polymarket client not configured" };
    }

    const result = await this.polymarket.placeOrder({
      tokenId: order.marketId,
      side: "BUY",
      size: order.shares,
      price: order.limitPrice,
    });

    return {
      success: result.status !== "rejected",
      orderId: result.id,
      filledShares: result.size_matched
        ? parseFloat(result.size_matched)
        : undefined,
      avgFillPrice: result.price ? parseFloat(result.price) : undefined,
    };
  }
}
