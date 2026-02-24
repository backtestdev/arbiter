import { NextResponse } from "next/server";
import type { Market, Orderbook, OrderbookLevel } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Deterministic-ish pseudo-random from a seed so the mock data is stable
 * across hot-reloads but still looks "random".
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generate a realistic orderbook around a given midpoint price.
 *
 * - 6-10 levels per side for both YES and NO
 * - Spread of 1-3 cents between best bid and best ask
 * - Depth tapers as you move away from mid
 * - `liquidityMultiplier` scales quantity (popular markets get more depth)
 */
function generateOrderbook(
  yesPrice: number,
  liquidity: number,
  seed: number = 42,
): Orderbook {
  const rand = seededRandom(seed);
  const liquidityMultiplier = liquidity / 500_000; // normalise around 500k

  const numLevels = Math.floor(rand() * 5) + 6; // 6-10
  const halfSpread = (Math.floor(rand() * 3) + 1) / 200; // 0.005-0.015

  // --- YES side ---
  const yesBestBid = Math.round((yesPrice - halfSpread) * 100) / 100;
  const yesBestAsk = Math.round((yesPrice + halfSpread) * 100) / 100;

  const yesBids: OrderbookLevel[] = [];
  const yesAsks: OrderbookLevel[] = [];

  for (let i = 0; i < numLevels; i++) {
    const decay = Math.max(0.15, 1 - i * 0.12 + rand() * 0.05);
    const bidPrice = Math.round((yesBestBid - i * 0.01) * 100) / 100;
    const askPrice = Math.round((yesBestAsk + i * 0.01) * 100) / 100;
    if (bidPrice > 0 && bidPrice < 1) {
      yesBids.push({
        price: bidPrice,
        quantity: Math.round((500 + rand() * 1500) * liquidityMultiplier * decay),
      });
    }
    if (askPrice > 0 && askPrice < 1) {
      yesAsks.push({
        price: askPrice,
        quantity: Math.round((500 + rand() * 1500) * liquidityMultiplier * decay),
      });
    }
  }

  // --- NO side ---
  const noPrice = Math.round((1 - yesPrice) * 100) / 100;
  const noHalfSpread = (Math.floor(rand() * 3) + 1) / 200;
  const noBestBid = Math.round((noPrice - noHalfSpread) * 100) / 100;
  const noBestAsk = Math.round((noPrice + noHalfSpread) * 100) / 100;

  const noBids: OrderbookLevel[] = [];
  const noAsks: OrderbookLevel[] = [];

  for (let i = 0; i < numLevels; i++) {
    const decay = Math.max(0.15, 1 - i * 0.12 + rand() * 0.05);
    const bidPrice = Math.round((noBestBid - i * 0.01) * 100) / 100;
    const askPrice = Math.round((noBestAsk + i * 0.01) * 100) / 100;
    if (bidPrice > 0 && bidPrice < 1) {
      noBids.push({
        price: bidPrice,
        quantity: Math.round((400 + rand() * 1200) * liquidityMultiplier * decay),
      });
    }
    if (askPrice > 0 && askPrice < 1) {
      noAsks.push({
        price: askPrice,
        quantity: Math.round((400 + rand() * 1200) * liquidityMultiplier * decay),
      });
    }
  }

  // last trade is near mid on the YES side
  const lastTradePrice =
    Math.round((yesPrice + (rand() - 0.5) * 0.02) * 100) / 100;

  return {
    yes: { bids: yesBids, asks: yesAsks },
    no: { bids: noBids, asks: noAsks },
    lastTradePrice: Math.min(0.99, Math.max(0.01, lastTradePrice)),
    timestamp: Date.now() - Math.floor(rand() * 30_000), // within last 30 s
  };
}

// ---------------------------------------------------------------------------
// Mock market data — 12 matched pairs + 5 unmatched singles = 29 markets
// ---------------------------------------------------------------------------

const MOCK_MARKETS: Market[] = [
  // =========================================================================
  // PAIR 1 — Politics: 2028 Presidential Election (Democrat)
  // Spread ≈ 3 ¢  (Kalshi 0.52 vs Poly 0.49)
  // =========================================================================
  {
    id: "kalshi_pres_2028_dem",
    externalId: "PRES-2028-DEM",
    platform: "KALSHI",
    title: "Will a Democrat win the 2028 presidential election?",
    description:
      "Resolves Yes if the Democratic Party candidate wins the 2028 US presidential election, as called by the Associated Press.",
    category: "Politics",
    yesPrice: 0.52,
    noPrice: 0.48,
    volume24h: 284_000,
    liquidity: 1_200_000,
    closingTime: new Date("2028-11-03T23:59:59-05:00"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "poly_pres_2028_dem",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.52, 1_200_000, 101),
    settlementRules: {
      source: "Associated Press (AP) race call",
      criteria:
        "Resolves YES if the Associated Press calls the 2028 U.S. presidential election for the Democratic Party nominee. Resolves NO otherwise. If the AP has not issued a call by January 20, 2029 12:00 PM ET, the market resolves based on the candidate inaugurated.",
      expirationDate: "2028-11-03T23:59:59-05:00",
      timezone: "ET",
      additionalNotes:
        "In the event of a disputed election, Kalshi's resolution committee will determine the outcome no later than January 21, 2029.",
    },
  },
  {
    id: "poly_pres_2028_dem",
    externalId: "0x7a3f1bc9d4e8a2f05617c3b8e9d0f2a4b6c8e1d3",
    platform: "POLYMARKET",
    title: "Democrat wins 2028 presidential election",
    description:
      "Will the Democratic nominee win the 2028 presidential election?",
    category: "Politics",
    yesPrice: 0.49,
    noPrice: 0.51,
    volume24h: 520_000,
    liquidity: 3_400_000,
    closingTime: new Date("2028-11-04T00:00:00Z"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "kalshi_pres_2028_dem",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.49, 3_400_000, 102),
    settlementRules: {
      source: "UMA Optimistic Oracle",
      criteria:
        "Resolves YES if a Democratic Party candidate is certified as the winner of the 2028 United States presidential election by a joint session of Congress. Resolves NO otherwise.",
      expirationDate: "2029-01-06",
      timezone: "UTC",
      additionalNotes:
        "Resolution relies on UMA's Optimistic Oracle with a 2-hour challenge window. Congressional certification under the Electoral Count Reform Act is the binding event.",
    },
  },

  // =========================================================================
  // PAIR 2 — Crypto: Bitcoin > $100K by end of 2026
  // Spread ≈ 4 ¢  (Kalshi 0.72 vs Poly 0.68)
  // =========================================================================
  {
    id: "kalshi_btc_100k",
    externalId: "BTC-100K-2026",
    platform: "KALSHI",
    title: "Will Bitcoin exceed $100,000 by end of 2026?",
    description:
      "Resolves Yes if the CoinDesk Bitcoin Reference Rate (BRR) exceeds $100,000 at any point before the close of December 31, 2026.",
    category: "Crypto",
    yesPrice: 0.72,
    noPrice: 0.28,
    volume24h: 156_000,
    liquidity: 890_000,
    closingTime: new Date("2026-12-31T16:00:00-05:00"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "poly_btc_100k",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.72, 890_000, 201),
    settlementRules: {
      source: "CoinDesk Bitcoin Reference Rate (BRR)",
      criteria:
        "Resolves YES if the CoinDesk BRR, calculated at 4:00 PM ET on any day between now and December 31, 2026, prints a value >= $100,000.00 USD. Resolves NO if this threshold is never met by 4:00 PM ET on December 31, 2026.",
      expirationDate: "2026-12-31T16:00:00-05:00",
      timezone: "ET",
      priceSources: ["CoinDesk BRR"],
      additionalNotes:
        "Only the 4:00 PM ET BRR fixing is used. Intra-day spot price spikes above $100K on exchanges do NOT trigger resolution.",
    },
  },
  {
    id: "poly_btc_100k",
    externalId: "0x5678efab12cd34ef56ab78cd90ef12ab34cd56ef",
    platform: "POLYMARKET",
    title: "Bitcoin above $100K in 2026",
    description: "Will Bitcoin trade above $100,000 before end of 2026?",
    category: "Crypto",
    yesPrice: 0.68,
    noPrice: 0.32,
    volume24h: 340_000,
    liquidity: 2_100_000,
    closingTime: new Date("2026-12-31T23:59:59Z"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "kalshi_btc_100k",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.68, 2_100_000, 202),
    settlementRules: {
      source: "UMA Optimistic Oracle / CoinGecko",
      criteria:
        "Resolves YES if the CoinGecko BTC/USD price (volume-weighted average across top exchanges) exceeds $100,000 at any point during a 1-hour TWAP window on any day before December 31, 2026 23:59 UTC. Resolves NO otherwise.",
      expirationDate: "2026-12-31T23:59:59Z",
      timezone: "UTC",
      priceSources: ["CoinGecko", "CoinMarketCap"],
      additionalNotes:
        "Uses an hourly TWAP rather than a single point-in-time snapshot. Flash wicks under 5 minutes are excluded by the TWAP methodology.",
    },
  },

  // =========================================================================
  // PAIR 3 — Economics: Fed rate cut March 2026
  // Spread ≈ 4 ¢  (Kalshi 0.35 vs Poly 0.31)
  // =========================================================================
  {
    id: "kalshi_fed_rate_mar26",
    externalId: "FED-RATE-CUT-MAR26",
    platform: "KALSHI",
    title: "Will the Fed cut rates in March 2026?",
    description:
      "Resolves Yes if the FOMC cuts the federal funds target rate at the March 17-18, 2026 meeting.",
    category: "Economics",
    yesPrice: 0.35,
    noPrice: 0.65,
    volume24h: 89_000,
    liquidity: 450_000,
    closingTime: new Date("2026-03-18T14:30:00-05:00"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "poly_fed_rate_mar26",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.35, 450_000, 301),
    settlementRules: {
      source: "Federal Reserve FOMC Statement",
      criteria:
        "Resolves YES if the Federal Open Market Committee lowers the upper bound of the federal funds target range by at least 25 basis points at the conclusion of the March 17-18, 2026 meeting, as published in the official FOMC statement. Resolves NO otherwise.",
      expirationDate: "2026-03-18T14:30:00-05:00",
      timezone: "ET",
      additionalNotes:
        "An emergency inter-meeting cut before March 17 does NOT count. Only the scheduled meeting decision matters.",
    },
  },
  {
    id: "poly_fed_rate_mar26",
    externalId: "0x9abcdef012345678abcdef0123456789abcdef01",
    platform: "POLYMARKET",
    title: "Fed rate cut in March 2026",
    description:
      "Will the Federal Reserve lower interest rates at the March 2026 FOMC meeting?",
    category: "Economics",
    yesPrice: 0.31,
    noPrice: 0.69,
    volume24h: 125_000,
    liquidity: 780_000,
    closingTime: new Date("2026-03-19T00:00:00Z"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "kalshi_fed_rate_mar26",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.31, 780_000, 302),
    settlementRules: {
      source: "UMA Optimistic Oracle / CME FedWatch",
      criteria:
        "Resolves YES if the Federal Reserve reduces the federal funds target rate at the March 2026 FOMC meeting. The effective federal funds rate published by the New York Fed on the day after the meeting must be lower than the rate published the day before the meeting.",
      expirationDate: "2026-03-19T00:00:00Z",
      timezone: "UTC",
      additionalNotes:
        "Unlike the Kalshi variant, an emergency inter-meeting cut DOES count if it occurs between the prior meeting and March 19, 2026 00:00 UTC.",
    },
  },

  // =========================================================================
  // PAIR 4 — Finance: S&P 500 above 6,000 EOY 2026
  // Spread ≈ 4 ¢  (Kalshi 0.61 vs Poly 0.57)
  // =========================================================================
  {
    id: "kalshi_sp500_6000",
    externalId: "SP500-6000-2026",
    platform: "KALSHI",
    title: "Will the S&P 500 close above 6,000 on Dec 31, 2026?",
    description:
      "Resolves based on the official closing value of the S&P 500 index on December 31, 2026.",
    category: "Finance",
    yesPrice: 0.61,
    noPrice: 0.39,
    volume24h: 210_000,
    liquidity: 950_000,
    closingTime: new Date("2026-12-31T16:00:00-05:00"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "poly_sp500_6000",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.61, 950_000, 401),
    settlementRules: {
      source: "S&P Dow Jones Indices (official close)",
      criteria:
        "Resolves YES if the S&P 500 Index official closing price on the last trading day of 2026 is strictly above 6,000.00. Resolves NO if it is at or below 6,000.00.",
      expirationDate: "2026-12-31T16:00:00-05:00",
      timezone: "ET",
      priceSources: ["S&P Dow Jones Indices"],
      additionalNotes:
        "If the last trading day is not December 31 due to a holiday, the immediately preceding trading day's close is used.",
    },
  },
  {
    id: "poly_sp500_6000",
    externalId: "0xcafebabe12345678deadbeef12345678cafebabe",
    platform: "POLYMARKET",
    title: "S&P 500 above 6,000 at end of 2026",
    description:
      "Will the S&P 500 close above 6,000 on the last trading day of 2026?",
    category: "Finance",
    yesPrice: 0.57,
    noPrice: 0.43,
    volume24h: 175_000,
    liquidity: 1_100_000,
    closingTime: new Date("2027-01-01T00:00:00Z"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "kalshi_sp500_6000",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.57, 1_100_000, 402),
    settlementRules: {
      source: "UMA Optimistic Oracle / Yahoo Finance",
      criteria:
        "Resolves YES if the S&P 500 closing value on the final trading session of 2026, as reported by Yahoo Finance, is above 6,000. Resolves NO otherwise.",
      expirationDate: "2027-01-01T00:00:00Z",
      timezone: "UTC",
      priceSources: ["Yahoo Finance", "Google Finance"],
      additionalNotes:
        "Uses 'adjusted close' from Yahoo Finance, which may differ slightly from the official S&P DJI print due to rounding and data feed timing.",
    },
  },

  // =========================================================================
  // PAIR 5 — Crypto: Ethereum > $5,000 in 2026
  // Spread ≈ 4 ¢  (Kalshi 0.42 vs Poly 0.38)
  // =========================================================================
  {
    id: "kalshi_eth_5k",
    externalId: "ETH-5K-2026",
    platform: "KALSHI",
    title: "Will Ethereum exceed $5,000 in 2026?",
    description:
      "Resolves Yes if ETH trades above $5,000 on the CoinDesk Ether Price Index at any 4 PM ET snapshot in 2026.",
    category: "Crypto",
    yesPrice: 0.42,
    noPrice: 0.58,
    volume24h: 67_000,
    liquidity: 340_000,
    closingTime: new Date("2026-12-31T16:00:00-05:00"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "poly_eth_5k",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.42, 340_000, 501),
    settlementRules: {
      source: "CoinDesk Ether Price Index (EPX)",
      criteria:
        "Resolves YES if the CoinDesk EPX 4:00 PM ET daily fixing price is >= $5,000.00 on any day in 2026. Resolves NO if this threshold is never reached by December 31, 2026.",
      expirationDate: "2026-12-31T16:00:00-05:00",
      timezone: "ET",
      priceSources: ["CoinDesk EPX"],
      additionalNotes:
        "Only the 4:00 PM ET reference rate is used; intra-day spot prices are not considered.",
    },
  },
  {
    id: "poly_eth_5k",
    externalId: "0xfeedface12345678aabbccdd12345678feedface",
    platform: "POLYMARKET",
    title: "Ethereum above $5,000 in 2026",
    description: "Will ETH price exceed $5,000 before the end of 2026?",
    category: "Crypto",
    yesPrice: 0.38,
    noPrice: 0.62,
    volume24h: 92_000,
    liquidity: 560_000,
    closingTime: new Date("2026-12-31T23:59:59Z"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "kalshi_eth_5k",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.38, 560_000, 502),
    settlementRules: {
      source: "UMA Optimistic Oracle / CoinGecko",
      criteria:
        "Resolves YES if CoinGecko ETH/USD spot price exceeds $5,000 for a sustained 1-hour TWAP on any day before 2026-12-31 23:59 UTC. Resolves NO otherwise.",
      expirationDate: "2026-12-31T23:59:59Z",
      timezone: "UTC",
      priceSources: ["CoinGecko", "CoinMarketCap"],
      additionalNotes:
        "TWAP-based methodology may exclude short wicks. 8-hour delay window before UMA oracle finalises.",
    },
  },

  // =========================================================================
  // PAIR 6 — Politics: US House control after 2026 midterms
  // Spread ≈ 2 ¢  (Kalshi 0.46 vs Poly 0.44)
  // =========================================================================
  {
    id: "kalshi_house_gop_2026",
    externalId: "HOUSE-GOP-2026",
    platform: "KALSHI",
    title: "Will Republicans control the US House after 2026 midterms?",
    description:
      "Resolves Yes if the Republican Party holds a majority of seats in the U.S. House of Representatives after the 2026 midterm elections.",
    category: "Politics",
    yesPrice: 0.46,
    noPrice: 0.54,
    volume24h: 152_000,
    liquidity: 880_000,
    closingTime: new Date("2026-11-03T23:59:59-05:00"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "poly_house_gop_2026",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.46, 880_000, 601),
    settlementRules: {
      source: "Associated Press (AP) race calls",
      criteria:
        "Resolves YES when the Associated Press has called enough individual House races for Republican candidates such that the GOP is projected to hold at least 218 seats. Resolves NO if Democrats reach 218 first.",
      expirationDate: "2026-12-31",
      timezone: "ET",
      additionalNotes:
        "If AP has not projected a majority by January 3, 2027, the market resolves based on seated members at the swearing-in of the 120th Congress.",
    },
  },
  {
    id: "poly_house_gop_2026",
    externalId: "0xa1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    platform: "POLYMARKET",
    title: "Republicans win House majority in 2026 midterms",
    description:
      "Will the Republican Party control the U.S. House after the November 2026 elections?",
    category: "Politics",
    yesPrice: 0.44,
    noPrice: 0.56,
    volume24h: 230_000,
    liquidity: 1_600_000,
    closingTime: new Date("2026-11-04T00:00:00Z"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "kalshi_house_gop_2026",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.44, 1_600_000, 602),
    settlementRules: {
      source: "UMA Optimistic Oracle",
      criteria:
        "Resolves YES if the Republican Party wins 218 or more seats in the 2026 U.S. House elections, based on certified state results. Resolves NO otherwise.",
      expirationDate: "2027-01-03",
      timezone: "UTC",
      additionalNotes:
        "Relies on final certified results rather than AP projections. Disputed or uncertified races may delay resolution until Q1 2027.",
    },
  },

  // =========================================================================
  // PAIR 7 — Technology: Apple market cap > $4T in 2026
  // Spread ≈ 3 ¢  (Kalshi 0.58 vs Poly 0.55)
  // =========================================================================
  {
    id: "kalshi_aapl_4t",
    externalId: "AAPL-4T-2026",
    platform: "KALSHI",
    title: "Will Apple's market cap exceed $4 trillion in 2026?",
    description:
      "Resolves Yes if Apple Inc. (AAPL) market capitalisation exceeds $4 trillion on any trading day's close in 2026.",
    category: "Technology",
    yesPrice: 0.58,
    noPrice: 0.42,
    volume24h: 78_000,
    liquidity: 420_000,
    closingTime: new Date("2026-12-31T16:00:00-05:00"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "poly_aapl_4t",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.58, 420_000, 701),
    settlementRules: {
      source: "Bloomberg Terminal / NASDAQ official close",
      criteria:
        "Resolves YES if Apple Inc. (AAPL) market capitalisation, computed as shares outstanding × NASDAQ official closing price, exceeds $4,000,000,000,000 on any trading day in 2026. Resolves NO if this threshold is never breached.",
      expirationDate: "2026-12-31T16:00:00-05:00",
      timezone: "ET",
      priceSources: ["NASDAQ", "Bloomberg"],
      additionalNotes:
        "Uses fully diluted share count from most recent 10-Q filing at time of observation.",
    },
  },
  {
    id: "poly_aapl_4t",
    externalId: "0xb1a2c3d4e5f6b1a2c3d4e5f6b1a2c3d4e5f6b1a2",
    platform: "POLYMARKET",
    title: "Apple market cap above $4T in 2026",
    description:
      "Will Apple reach a $4 trillion market cap at any point in 2026?",
    category: "Technology",
    yesPrice: 0.55,
    noPrice: 0.45,
    volume24h: 104_000,
    liquidity: 620_000,
    closingTime: new Date("2026-12-31T23:59:59Z"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "kalshi_aapl_4t",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.55, 620_000, 702),
    settlementRules: {
      source: "UMA Optimistic Oracle / CompaniesMarketCap.com",
      criteria:
        "Resolves YES if Apple Inc. market capitalisation as listed on CompaniesMarketCap.com exceeds $4T at any daily snapshot (taken at 00:00 UTC) during 2026. Resolves NO otherwise.",
      expirationDate: "2026-12-31T23:59:59Z",
      timezone: "UTC",
      priceSources: ["CompaniesMarketCap.com", "Yahoo Finance"],
      additionalNotes:
        "Daily snapshot methodology may diverge from intra-day peaks. Share count source differs from Kalshi's 10-Q approach.",
    },
  },

  // =========================================================================
  // PAIR 8 — Sports: FIFA World Cup 2026 winner — Brazil
  // Spread ≈ 2 ¢  (Kalshi 0.14 vs Poly 0.12)
  // =========================================================================
  {
    id: "kalshi_wc2026_brazil",
    externalId: "WC2026-BRAZIL",
    platform: "KALSHI",
    title: "Will Brazil win the 2026 FIFA World Cup?",
    description:
      "Resolves Yes if Brazil's men's national football team wins the 2026 FIFA World Cup.",
    category: "Sports",
    yesPrice: 0.14,
    noPrice: 0.86,
    volume24h: 48_000,
    liquidity: 310_000,
    closingTime: new Date("2026-07-19T23:59:59-04:00"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "poly_wc2026_brazil",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.14, 310_000, 801),
    settlementRules: {
      source: "FIFA official results",
      criteria:
        "Resolves YES if Brazil wins the final match of the 2026 FIFA World Cup, including extra time and penalty shootout if applicable, as published by FIFA.com.",
      expirationDate: "2026-07-19",
      timezone: "ET",
      additionalNotes:
        "If the tournament is cancelled or postponed beyond 2026, the market resolves NO.",
    },
  },
  {
    id: "poly_wc2026_brazil",
    externalId: "0xc1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2",
    platform: "POLYMARKET",
    title: "Brazil wins 2026 World Cup",
    description:
      "Will Brazil win the 2026 FIFA World Cup held in USA, Mexico, and Canada?",
    category: "Sports",
    yesPrice: 0.12,
    noPrice: 0.88,
    volume24h: 63_000,
    liquidity: 480_000,
    closingTime: new Date("2026-07-20T00:00:00Z"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "kalshi_wc2026_brazil",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.12, 480_000, 802),
    settlementRules: {
      source: "UMA Optimistic Oracle / FIFA.com",
      criteria:
        "Resolves YES if Brazil is the winning team of the 2026 FIFA Men's World Cup Final. Resolves NO otherwise.",
      expirationDate: "2026-07-20T00:00:00Z",
      timezone: "UTC",
      additionalNotes:
        "If the tournament is rescheduled to 2027 but still branded '2026 FIFA World Cup', the market remains open. Cancellation resolves NO.",
    },
  },

  // =========================================================================
  // PAIR 9 — Culture / Entertainment: Film grossing > $2B in 2026
  // Spread ≈ 5 ¢  (Kalshi 0.22 vs Poly 0.17)  — wider arb
  // =========================================================================
  {
    id: "kalshi_film_2b_2026",
    externalId: "FILM-2B-2026",
    platform: "KALSHI",
    title: "Will any film gross over $2 billion worldwide in 2026?",
    description:
      "Resolves Yes if any single film released in 2026 crosses $2B in cumulative worldwide box office gross.",
    category: "Culture",
    yesPrice: 0.22,
    noPrice: 0.78,
    volume24h: 34_000,
    liquidity: 185_000,
    closingTime: new Date("2027-03-31T23:59:59-04:00"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "poly_film_2b_2026",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.22, 185_000, 901),
    settlementRules: {
      source: "Box Office Mojo (by IMDbPro)",
      criteria:
        "Resolves YES if any film with an initial wide-release date in 2026 (per Box Office Mojo) reaches a cumulative worldwide gross of $2,000,000,000 or more by March 31, 2027. Resolves NO otherwise.",
      expirationDate: "2027-03-31T23:59:59-04:00",
      timezone: "ET",
      priceSources: ["Box Office Mojo"],
      additionalNotes:
        "Only theatrical gross counts; streaming revenue is excluded. Re-releases of pre-2026 films do not qualify.",
    },
  },
  {
    id: "poly_film_2b_2026",
    externalId: "0xd1e2f3a4b5c6d1e2f3a4b5c6d1e2f3a4b5c6d1e2",
    platform: "POLYMARKET",
    title: "A movie grosses over $2B worldwide in 2026",
    description:
      "Will a 2026 movie reach $2 billion in global box office?",
    category: "Culture",
    yesPrice: 0.17,
    noPrice: 0.83,
    volume24h: 28_000,
    liquidity: 140_000,
    closingTime: new Date("2027-04-01T00:00:00Z"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "kalshi_film_2b_2026",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.17, 140_000, 902),
    settlementRules: {
      source: "UMA Optimistic Oracle / The Numbers (Nash Information Services)",
      criteria:
        "Resolves YES if any film first released theatrically in 2026 surpasses $2B in cumulative worldwide box office revenue per The-Numbers.com by end of Q1 2027. Resolves NO otherwise.",
      expirationDate: "2027-04-01T00:00:00Z",
      timezone: "UTC",
      priceSources: ["The-Numbers.com"],
      additionalNotes:
        "Data source differs from Kalshi (The Numbers vs Box Office Mojo). Minor discrepancies in reported grosses are possible due to currency conversion timing.",
    },
  },

  // =========================================================================
  // PAIR 10 — Economics: US CPI below 2.5% by Dec 2026
  // Spread ≈ 3 ¢  (Kalshi 0.41 vs Poly 0.38)
  // =========================================================================
  {
    id: "kalshi_cpi_below_25",
    externalId: "CPI-BELOW-25-DEC26",
    platform: "KALSHI",
    title: "Will US CPI year-over-year be below 2.5% in December 2026?",
    description:
      "Resolves Yes if the Bureau of Labor Statistics reports December 2026 CPI-U year-over-year change below 2.5%.",
    category: "Economics",
    yesPrice: 0.41,
    noPrice: 0.59,
    volume24h: 55_000,
    liquidity: 320_000,
    closingTime: new Date("2027-01-15T08:30:00-05:00"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "poly_cpi_below_25",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.41, 320_000, 1001),
    settlementRules: {
      source: "Bureau of Labor Statistics (BLS)",
      criteria:
        "Resolves YES if the CPI-U 12-month percent change for December 2026, as initially reported by the BLS, is strictly below 2.50%. Resolves NO if it is 2.50% or above.",
      expirationDate: "2027-01-15T08:30:00-05:00",
      timezone: "ET",
      additionalNotes:
        "Uses the initial (not seasonally adjusted, not revised) release. Revisions published after the initial report are ignored.",
    },
  },
  {
    id: "poly_cpi_below_25",
    externalId: "0xe1f2a3b4c5d6e1f2a3b4c5d6e1f2a3b4c5d6e1f2",
    platform: "POLYMARKET",
    title: "US inflation below 2.5% by end of 2026",
    description:
      "Will the US CPI annual rate fall below 2.5% by the December 2026 reading?",
    category: "Economics",
    yesPrice: 0.38,
    noPrice: 0.62,
    volume24h: 71_000,
    liquidity: 410_000,
    closingTime: new Date("2027-01-16T00:00:00Z"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "kalshi_cpi_below_25",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.38, 410_000, 1002),
    settlementRules: {
      source: "UMA Optimistic Oracle / BLS CPI data via FRED",
      criteria:
        "Resolves YES if the seasonally adjusted CPI-U 12-month percent change for December 2026 (FRED series CPIAUCSL) is below 2.5%. Resolves NO otherwise.",
      expirationDate: "2027-01-16T00:00:00Z",
      timezone: "UTC",
      priceSources: ["FRED (Federal Reserve Economic Data)"],
      additionalNotes:
        "Uses seasonally adjusted data from FRED, which can differ from the BLS non-seasonally-adjusted figure used by Kalshi. Historical divergence is typically 0.1-0.3%.",
    },
  },

  // =========================================================================
  // PAIR 11 — Crypto: Solana > $500 in 2026
  // Spread ≈ 2 ¢  (Kalshi 0.28 vs Poly 0.26)
  // =========================================================================
  {
    id: "kalshi_sol_500",
    externalId: "SOL-500-2026",
    platform: "KALSHI",
    title: "Will Solana exceed $500 in 2026?",
    description:
      "Resolves Yes if the SOL/USD reference rate exceeds $500 at the daily 4 PM ET fixing in 2026.",
    category: "Crypto",
    yesPrice: 0.28,
    noPrice: 0.72,
    volume24h: 42_000,
    liquidity: 260_000,
    closingTime: new Date("2026-12-31T16:00:00-05:00"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "poly_sol_500",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.28, 260_000, 1101),
    settlementRules: {
      source: "CoinDesk Solana Reference Rate",
      criteria:
        "Resolves YES if the CoinDesk SOL/USD reference rate at the 4:00 PM ET daily fixing is >= $500.00 on any day in 2026. Resolves NO otherwise.",
      expirationDate: "2026-12-31T16:00:00-05:00",
      timezone: "ET",
      priceSources: ["CoinDesk"],
      additionalNotes:
        "Single point-in-time snapshot. Exchange outages affecting the CoinDesk index may delay the fixing by up to 1 hour.",
    },
  },
  {
    id: "poly_sol_500",
    externalId: "0xf1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2",
    platform: "POLYMARKET",
    title: "Solana above $500 in 2026",
    description: "Will SOL trade above $500 at any point in 2026?",
    category: "Crypto",
    yesPrice: 0.26,
    noPrice: 0.74,
    volume24h: 58_000,
    liquidity: 350_000,
    closingTime: new Date("2026-12-31T23:59:59Z"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "kalshi_sol_500",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.26, 350_000, 1102),
    settlementRules: {
      source: "UMA Optimistic Oracle / CoinGecko",
      criteria:
        "Resolves YES if CoinGecko SOL/USD spot price exceeds $500 in any 1-hour TWAP window during 2026. Resolves NO if this never occurs by 2026-12-31 23:59 UTC.",
      expirationDate: "2026-12-31T23:59:59Z",
      timezone: "UTC",
      priceSources: ["CoinGecko", "CoinMarketCap"],
      additionalNotes:
        "TWAP methodology smooths flash wicks. Resolution may be delayed up to 8 hours due to UMA oracle dispute window.",
    },
  },

  // =========================================================================
  // PAIR 12 — Sports: NFL Super Bowl LXI winner — Kansas City Chiefs
  // Spread ≈ 1 ¢  (Kalshi 0.11 vs Poly 0.10)  — tight spread
  // =========================================================================
  {
    id: "kalshi_sb_lxi_chiefs",
    externalId: "SB-LXI-CHIEFS",
    platform: "KALSHI",
    title: "Will the Kansas City Chiefs win Super Bowl LXI?",
    description:
      "Resolves Yes if the Kansas City Chiefs win Super Bowl LXI (February 2027 season).",
    category: "Sports",
    yesPrice: 0.11,
    noPrice: 0.89,
    volume24h: 36_000,
    liquidity: 220_000,
    closingTime: new Date("2027-02-14T23:59:59-05:00"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "poly_sb_lxi_chiefs",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.11, 220_000, 1201),
    settlementRules: {
      source: "NFL.com official game results",
      criteria:
        "Resolves YES if the Kansas City Chiefs win Super Bowl LXI. Resolves NO if any other team wins or if the game is not played by June 30, 2027.",
      expirationDate: "2027-02-14",
      timezone: "ET",
      additionalNotes:
        "Overtime rules per current NFL regulations apply. If the game is relocated or rescheduled but still played by June 30, 2027, it still counts.",
    },
  },
  {
    id: "poly_sb_lxi_chiefs",
    externalId: "0xa2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3",
    platform: "POLYMARKET",
    title: "Chiefs win Super Bowl LXI",
    description: "Will Kansas City win the next Super Bowl (LXI)?",
    category: "Sports",
    yesPrice: 0.10,
    noPrice: 0.90,
    volume24h: 52_000,
    liquidity: 340_000,
    closingTime: new Date("2027-02-15T00:00:00Z"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: "kalshi_sb_lxi_chiefs",
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.10, 340_000, 1202),
    settlementRules: {
      source: "UMA Optimistic Oracle / ESPN",
      criteria:
        "Resolves YES if the Kansas City Chiefs are the winning team of Super Bowl LXI per ESPN's final box score. Resolves NO otherwise.",
      expirationDate: "2027-02-15T00:00:00Z",
      timezone: "UTC",
      additionalNotes:
        "ESPN box score is the binding source, which may rarely diverge from NFL.com in edge cases (stat corrections don't affect win/loss).",
    },
  },

  // =========================================================================
  // UNMATCHED MARKET 1 — Technology: AGI by end of 2026 (Kalshi only)
  // =========================================================================
  {
    id: "kalshi_agi_2026",
    externalId: "AGI-2026",
    platform: "KALSHI",
    title: "Will an AI system pass a comprehensive AGI test by end of 2026?",
    description:
      "Resolves Yes based on the criteria defined by Kalshi's designated evaluation board, including passing ARC-AGI, GPQA, and a Turing-style interview.",
    category: "Technology",
    yesPrice: 0.08,
    noPrice: 0.92,
    volume24h: 45_000,
    liquidity: 230_000,
    closingTime: new Date("2026-12-31T23:59:59-05:00"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: null,
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.08, 230_000, 1301),
    settlementRules: {
      source: "Kalshi Resolution Committee",
      criteria:
        "Resolves YES if any AI system, by December 31, 2026, achieves (a) >= 85% on ARC-AGI benchmark, (b) >= 80% on GPQA Diamond, and (c) passes a 2-hour Turing-style interview judged by a 5-person panel selected by Kalshi. All three conditions must be met.",
      expirationDate: "2026-12-31T23:59:59-05:00",
      timezone: "ET",
      additionalNotes:
        "The 5-person evaluation panel will be announced by April 1, 2026. Panel members must have no financial stake in AI companies.",
    },
  },

  // =========================================================================
  // UNMATCHED MARKET 2 — Economics: US Recession in 2026 (Polymarket only)
  // =========================================================================
  {
    id: "poly_recession_2026",
    externalId: "0xdeadbeef12345678abcdef0123456789deadbeef",
    platform: "POLYMARKET",
    title: "US recession in 2026",
    description: "Will the NBER declare a US recession starting in 2026?",
    category: "Economics",
    yesPrice: 0.22,
    noPrice: 0.78,
    volume24h: 198_000,
    liquidity: 1_500_000,
    closingTime: new Date("2027-06-30T23:59:59Z"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: null,
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.22, 1_500_000, 1401),
    settlementRules: {
      source: "UMA Optimistic Oracle / NBER Business Cycle Dating Committee",
      criteria:
        "Resolves YES if the NBER Business Cycle Dating Committee officially declares a recession with a peak date occurring in calendar year 2026. Resolves NO if no such declaration is made by June 30, 2027.",
      expirationDate: "2027-06-30T23:59:59Z",
      timezone: "UTC",
      additionalNotes:
        "The NBER typically announces recessions 6-18 months after they begin. This market extends into 2027 to allow for the lag.",
    },
  },

  // =========================================================================
  // UNMATCHED MARKET 3 — Technology: TikTok ban in US (Kalshi only)
  // =========================================================================
  {
    id: "kalshi_tiktok_ban",
    externalId: "TIKTOK-BAN-2026",
    platform: "KALSHI",
    title: "Will TikTok be banned in the US by end of 2026?",
    description:
      "Resolves Yes if TikTok is fully unavailable for download and use in the United States by December 31, 2026.",
    category: "Technology",
    yesPrice: 0.15,
    noPrice: 0.85,
    volume24h: 62_000,
    liquidity: 380_000,
    closingTime: new Date("2026-12-31T23:59:59-05:00"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: null,
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.15, 380_000, 1501),
    settlementRules: {
      source: "Kalshi Resolution Committee",
      criteria:
        "Resolves YES if, as of December 31, 2026, TikTok is (a) removed from both the Apple App Store and Google Play Store for US users, AND (b) functionally inaccessible (returning errors or blocked) when accessed from US IP addresses without a VPN. Both conditions must be met simultaneously on December 31, 2026. Resolves NO otherwise.",
      expirationDate: "2026-12-31T23:59:59-05:00",
      timezone: "ET",
      additionalNotes:
        "A 'ban' followed by reinstatement before Dec 31 means the market resolves NO. Only the state on Dec 31 matters.",
    },
  },

  // =========================================================================
  // UNMATCHED MARKET 4 — Culture: Oscar Best Picture (Polymarket only)
  // =========================================================================
  {
    id: "poly_oscar_best_picture",
    externalId: "0xbabe1234cafe5678dead9012beef3456face7890",
    platform: "POLYMARKET",
    title: "Will 'The Brutalist' win Best Picture at the 2026 Oscars?",
    description:
      "Resolves Yes if 'The Brutalist' wins the Academy Award for Best Picture at the 98th Academy Awards ceremony.",
    category: "Culture",
    yesPrice: 0.33,
    noPrice: 0.67,
    volume24h: 41_000,
    liquidity: 270_000,
    closingTime: new Date("2026-03-02T00:00:00Z"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: null,
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.33, 270_000, 1601),
    settlementRules: {
      source: "UMA Optimistic Oracle / Academy of Motion Picture Arts and Sciences",
      criteria:
        "Resolves YES if 'The Brutalist' is announced as the winner of the Best Picture award at the 98th Academy Awards (2026 ceremony). Resolves NO if any other film wins.",
      expirationDate: "2026-03-02T00:00:00Z",
      timezone: "UTC",
      additionalNotes:
        "If the ceremony is postponed, the market remains open until the award is announced or until June 30, 2026 (whichever comes first). If no ceremony by that date, resolves NO.",
    },
  },

  // =========================================================================
  // UNMATCHED MARKET 5 — Finance: Tesla stock above $500 (Kalshi only)
  // =========================================================================
  {
    id: "kalshi_tsla_500",
    externalId: "TSLA-500-2026",
    platform: "KALSHI",
    title: "Will Tesla close above $500 in 2026?",
    description:
      "Resolves Yes if TSLA closes above $500.00 on any trading day in 2026.",
    category: "Finance",
    yesPrice: 0.47,
    noPrice: 0.53,
    volume24h: 95_000,
    liquidity: 510_000,
    closingTime: new Date("2026-12-31T16:00:00-05:00"),
    resolvedAt: null,
    resolution: null,
    status: "ACTIVE",
    matchedMarketId: null,
    lastUpdated: new Date(),
    orderbook: generateOrderbook(0.47, 510_000, 1701),
    settlementRules: {
      source: "NASDAQ official closing price",
      criteria:
        "Resolves YES if Tesla Inc. (TSLA) NASDAQ official closing price exceeds $500.00 on any trading day during calendar year 2026. Resolves NO if this never occurs.",
      expirationDate: "2026-12-31T16:00:00-05:00",
      timezone: "ET",
      priceSources: ["NASDAQ"],
      additionalNotes:
        "After-hours and pre-market prices do not count. Only the official 4:00 PM ET closing price is considered. Stock splits would be adjusted retroactively.",
    },
  },
];

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function GET() {
  return NextResponse.json({
    markets: MOCK_MARKETS,
    syncedAt: new Date().toISOString(),
    count: MOCK_MARKETS.length,
  });
}

export async function POST() {
  // In production: trigger background sync from both APIs
  return NextResponse.json({
    status: "sync_initiated",
    message: "Market catalog sync started",
    estimatedMarkets: MOCK_MARKETS.length,
  });
}
