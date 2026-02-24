import { z } from "zod";

const POLYMARKET_CLOB_URL =
  process.env.POLYMARKET_CLOB_URL || "https://clob.polymarket.com";

const PolymarketTokenSchema = z.object({
  token_id: z.string(),
  outcome: z.string(),
  price: z.number(),
  winner: z.boolean().optional(),
});

const PolymarketMarketSchema = z.object({
  condition_id: z.string(),
  question_id: z.string().optional(),
  question: z.string(),
  description: z.string().optional(),
  market_slug: z.string().optional(),
  category: z.string().optional(),
  end_date_iso: z.string().optional(),
  tokens: z.array(PolymarketTokenSchema),
  active: z.boolean(),
  closed: z.boolean(),
  volume: z.number().optional(),
  volume_num: z.number().optional(),
  liquidity: z.number().optional(),
});

const PolymarketOrderSchema = z.object({
  id: z.string(),
  status: z.string(),
  size_matched: z.string().optional(),
  price: z.string().optional(),
});

export type PolymarketMarket = z.infer<typeof PolymarketMarketSchema>;
export type PolymarketToken = z.infer<typeof PolymarketTokenSchema>;

interface PolymarketClientConfig {
  apiKey?: string;
  privateKey?: string;
}

export class PolymarketClient {
  private apiKey: string | undefined;
  // Stored for order signing in production (EIP-712 typed data)
  public readonly privateKey: string | undefined;

  constructor(config: PolymarketClientConfig = {}) {
    this.apiKey = config.apiKey;
    this.privateKey = config.privateKey;
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit = {},
    retries = 3
  ): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          ...init,
          headers: {
            "Content-Type": "application/json",
            ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
            ...init.headers,
          },
        });
        if (!res.ok) {
          throw new Error(
            `Polymarket API error: ${res.status} ${res.statusText}`
          );
        }
        return res;
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
    throw new Error("Max retries exceeded");
  }

  async getMarkets(params?: {
    limit?: number;
    offset?: number;
    active?: boolean;
  }): Promise<PolymarketMarket[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    if (params?.active !== undefined)
      searchParams.set("active", String(params.active));

    const res = await this.fetchWithRetry(
      `${POLYMARKET_CLOB_URL}/markets?${searchParams}`
    );

    const data = await res.json();
    return z.array(PolymarketMarketSchema).parse(data);
  }

  async getMarket(conditionId: string): Promise<PolymarketMarket> {
    const res = await this.fetchWithRetry(
      `${POLYMARKET_CLOB_URL}/markets/${conditionId}`
    );
    const data = await res.json();
    return PolymarketMarketSchema.parse(data);
  }

  async getOrderBook(tokenId: string) {
    const res = await this.fetchWithRetry(
      `${POLYMARKET_CLOB_URL}/book?token_id=${tokenId}`
    );
    return res.json();
  }

  async getPrice(tokenId: string): Promise<{ price: number }> {
    const res = await this.fetchWithRetry(
      `${POLYMARKET_CLOB_URL}/price?token_id=${tokenId}`
    );
    return res.json();
  }

  async placeOrder(params: {
    tokenId: string;
    side: "BUY" | "SELL";
    size: number;
    price: number;
  }) {
    const res = await this.fetchWithRetry(`${POLYMARKET_CLOB_URL}/order`, {
      method: "POST",
      body: JSON.stringify({
        tokenID: params.tokenId,
        side: params.side,
        size: params.size,
        price: params.price,
      }),
    });

    const data = await res.json();
    return PolymarketOrderSchema.parse(data);
  }
}
