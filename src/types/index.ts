export type Platform = "KALSHI" | "POLYMARKET";
export type Side = "YES" | "NO";
export type MarketStatus = "ACTIVE" | "CLOSED" | "RESOLVED";
export type ArbitrageStatus = "ACTIVE" | "EXPIRED" | "EXECUTED";
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "syncing" | "error";
export type OrderType = "market" | "limit";

// ---------------------------------------------------------------------------
// Orderbook
// ---------------------------------------------------------------------------

export interface OrderbookLevel {
  price: number;    // e.g., 0.52
  quantity: number; // shares available at this price
}

export interface Orderbook {
  yes: {
    bids: OrderbookLevel[]; // sorted descending by price (best bid first)
    asks: OrderbookLevel[]; // sorted ascending by price (best ask first)
  };
  no: {
    bids: OrderbookLevel[];
    asks: OrderbookLevel[];
  };
  lastTradePrice: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Settlement rules — used to compare matched markets for arb risk
// ---------------------------------------------------------------------------

export interface SettlementRules {
  source: string;           // "AP race call", "UMA Oracle", "CoinGecko", etc.
  criteria: string;         // Full resolution criteria text
  expirationDate: string;   // "2028-11-03" or "2026-12-31T23:59:59Z"
  timezone: string;         // "ET", "UTC", "PT"
  priceSources?: string[];  // e.g., ["CoinGecko", "CoinMarketCap"]
  additionalNotes?: string; // Any special conditions or quirks
}

// ---------------------------------------------------------------------------
// Arb risk assessment — flags potential differences between matched markets
// ---------------------------------------------------------------------------

export type ArbRiskSeverity = "info" | "warning" | "critical";

export interface ArbRiskFactor {
  type: "settlement_difference" | "timing_difference" | "source_difference" | "wording_difference" | "liquidity_risk";
  title: string;
  description: string;
  severity: ArbRiskSeverity;
}

export interface ArbRisk {
  level: "low" | "medium" | "high";
  factors: ArbRiskFactor[];
}

// ---------------------------------------------------------------------------
// Market
// ---------------------------------------------------------------------------

export interface Market {
  id: string;
  externalId: string;
  platform: Platform;
  title: string;
  description: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  liquidity: number;
  closingTime: Date;
  resolvedAt: Date | null;
  resolution: Side | null;
  status: MarketStatus;
  matchedMarketId: string | null;
  lastUpdated: Date;
  orderbook: Orderbook;
  settlementRules: SettlementRules;
}

// ---------------------------------------------------------------------------
// Unified market (cross-platform view)
// ---------------------------------------------------------------------------

export interface UnifiedMarket {
  id: string;
  title: string;
  description: string;
  category: string;
  closingTime: Date;
  kalshi: Market | null;
  polymarket: Market | null;
  spread: number | null;
  hasArbitrage: boolean;
  arbRisk?: ArbRisk;
}

// ---------------------------------------------------------------------------
// Arbitrage — depth-aware with executable $ amounts
// ---------------------------------------------------------------------------

export interface ExecutableDepth {
  /** Total $ you can deploy at the given prices */
  maxSize: number;
  /** Price levels consumed on the buy side (asks) */
  buyLevels: OrderbookLevel[];
  /** Price levels consumed on the sell side (bids) */
  sellLevels: OrderbookLevel[];
  /** Weighted average buy price across consumed levels */
  avgBuyPrice: number;
  /** Weighted average sell price across consumed levels */
  avgSellPrice: number;
}

export interface ArbitrageOpportunity {
  id: string;
  marketA: Market;
  marketB: Market;
  spreadPercent: number;
  yesArb: boolean;
  noArb: boolean;
  estimatedProfit100: number;
  detectedAt: Date;
  expiresAt: Date;
  status: ArbitrageStatus;

  // Depth-aware fields
  buyPlatform: Platform;
  sellPlatform: Platform;
  bestBuyPrice: number;   // best ask on the platform to buy
  bestSellPrice: number;  // best bid on the platform to sell
  maxExecutableProfit: number; // $ profit given orderbook depth
  maxExecutableSize: number;   // max $ you can deploy
  executableDepth: ExecutableDepth;
  arbRisk: ArbRisk;
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export interface Position {
  id: string;
  userId: string;
  platform: Platform;
  marketId: string;
  marketTitle: string;
  side: Side;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  openedAt: Date;
}

export interface PortfolioSummary {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  kalshiValue: number;
  polymarketValue: number;
  openPositions: number;
}

// ---------------------------------------------------------------------------
// Prices (SSE stream)
// ---------------------------------------------------------------------------

export interface PriceUpdate {
  marketId: string;
  platform: Platform;
  yesPrice: number;
  noPrice: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Trade
// ---------------------------------------------------------------------------

export interface TradeOrder {
  marketId: string;
  platform: Platform;
  side: Side;
  orderType: OrderType;
  amount: number;       // dollars to wager
  limitPrice?: number;  // only for limit orders
  shares?: number;      // calculated from amount / price
}

export interface TradeResult {
  success: boolean;
  orderId?: string;
  filledShares?: number;
  avgFillPrice?: number;
  error?: string;
}

export interface PlatformConnection {
  platform: Platform;
  status: ConnectionStatus;
  connectedAt: Date | null;
  lastValidated: Date | null;
}
