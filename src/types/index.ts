export type Platform = "KALSHI" | "POLYMARKET";
export type Side = "YES" | "NO";
export type MarketStatus = "ACTIVE" | "CLOSED" | "RESOLVED";
export type ArbitrageStatus = "ACTIVE" | "EXPIRED" | "EXECUTED";
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "syncing" | "error";

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
}

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
}

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

export interface PriceUpdate {
  marketId: string;
  platform: Platform;
  yesPrice: number;
  noPrice: number;
  timestamp: number;
}

export interface TradeOrder {
  marketId: string;
  platform: Platform;
  side: Side;
  shares: number;
  limitPrice: number;
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
