import { z } from "zod";

const KALSHI_API_BASE =
  process.env.KALSHI_API_BASE || "https://trading-api.kalshi.com/trade-api/v2";

const KalshiMarketSchema = z.object({
  ticker: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  category: z.string(),
  yes_bid: z.number(),
  yes_ask: z.number(),
  no_bid: z.number(),
  no_ask: z.number(),
  volume: z.number(),
  volume_24h: z.number(),
  open_interest: z.number(),
  close_time: z.string(),
  result: z.string().optional(),
  status: z.string(),
});

const KalshiMarketsResponseSchema = z.object({
  markets: z.array(KalshiMarketSchema),
  cursor: z.string().optional(),
});

const KalshiOrderSchema = z.object({
  order_id: z.string(),
  status: z.string(),
  filled_count: z.number().optional(),
  avg_fill_price: z.number().optional(),
});

export type KalshiMarket = z.infer<typeof KalshiMarketSchema>;

interface KalshiClientConfig {
  apiKey: string;
  apiSecret: string;
}

export class KalshiClient {
  private apiKey: string;
  private apiSecret: string;
  private token: string | null = null;

  constructor(config: KalshiClientConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.token) {
      await this.login();
    }
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private async login(): Promise<void> {
    const res = await this.fetchWithRetry(`${KALSHI_API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: this.apiKey,
        password: this.apiSecret,
      }),
    });

    const data = await res.json();
    this.token = data.token;
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    retries = 3
  ): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, init);
        if (res.status === 401 && attempt < retries) {
          this.token = null;
          await this.login();
          const headers = await this.getAuthHeaders();
          init.headers = headers;
          continue;
        }
        if (!res.ok) {
          throw new Error(`Kalshi API error: ${res.status} ${res.statusText}`);
        }
        return res;
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
    throw new Error("Max retries exceeded");
  }

  async getMarkets(
    cursor?: string,
    limit = 100
  ): Promise<{ markets: KalshiMarket[]; cursor?: string }> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);

    const headers = await this.getAuthHeaders();
    const res = await this.fetchWithRetry(
      `${KALSHI_API_BASE}/markets?${params}`,
      { headers }
    );

    const data = await res.json();
    return KalshiMarketsResponseSchema.parse(data);
  }

  async getMarket(ticker: string): Promise<KalshiMarket> {
    const headers = await this.getAuthHeaders();
    const res = await this.fetchWithRetry(
      `${KALSHI_API_BASE}/markets/${ticker}`,
      { headers }
    );

    const data = await res.json();
    return KalshiMarketSchema.parse(data.market);
  }

  async placeOrder(params: {
    ticker: string;
    side: "yes" | "no";
    count: number;
    price: number; // cents 1-99
    type?: "limit" | "market";
  }) {
    const headers = await this.getAuthHeaders();
    const res = await this.fetchWithRetry(`${KALSHI_API_BASE}/portfolio/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ticker: params.ticker,
        action: "buy",
        side: params.side,
        count: params.count,
        type: params.type || "limit",
        ...(params.type !== "market" ? { yes_price: params.price } : {}),
      }),
    });

    const data = await res.json();
    return KalshiOrderSchema.parse(data.order);
  }

  async getPositions() {
    const headers = await this.getAuthHeaders();
    const res = await this.fetchWithRetry(
      `${KALSHI_API_BASE}/portfolio/positions`,
      { headers }
    );
    return res.json();
  }

  async getBalance() {
    const headers = await this.getAuthHeaders();
    const res = await this.fetchWithRetry(
      `${KALSHI_API_BASE}/portfolio/balance`,
      { headers }
    );
    return res.json();
  }
}
