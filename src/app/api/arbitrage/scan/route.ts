import { NextRequest, NextResponse } from "next/server";
import type {
  Market,
  ArbitrageOpportunity,
  ArbitrageStatus,
  OrderbookLevel,
  ExecutableDepth,
  ArbRisk,
  ArbRiskFactor,
  ArbRiskSeverity,
} from "@/types";

// ---------------------------------------------------------------------------
// Helper: Calculate executable depth by walking both orderbooks
// ---------------------------------------------------------------------------
// Both `buyAsks` and `sellAsks` are the ASK sides of two different orderbooks
// (sorted ascending by price — cheapest first).
//
// In an arb trade you BUY YES on one platform and BUY NO on the other.
// A share pair (one YES + one NO) always settles to exactly $1.00, so the
// arb is profitable as long as buyPrice + sellPrice < 1.00.
//
// This function walks through both ask ladders simultaneously, consuming
// liquidity level-by-level from cheapest to most expensive, and stops
// when the next shares would cost >= $1.00 combined (no longer profitable).
// ---------------------------------------------------------------------------

function calculateExecutableDepth(
  buyAsks: OrderbookLevel[],
  sellAsks: OrderbookLevel[],
): ExecutableDepth {
  // Guard: if either side has no asks we can't execute anything
  if (buyAsks.length === 0 || sellAsks.length === 0) {
    return {
      maxSize: 0,
      buyLevels: [],
      sellLevels: [],
      avgBuyPrice: 0,
      avgSellPrice: 0,
    };
  }

  let buyIdx = 0;
  let sellIdx = 0;
  let buyRemaining = buyAsks[0].quantity;
  let sellRemaining = sellAsks[0].quantity;

  let totalShares = 0;
  let totalBuyCost = 0;
  let totalSellCost = 0;

  const consumedBuyLevels: OrderbookLevel[] = [];
  const consumedSellLevels: OrderbookLevel[] = [];

  while (buyIdx < buyAsks.length && sellIdx < sellAsks.length) {
    const buyPrice = buyAsks[buyIdx].price;
    const sellPrice = sellAsks[sellIdx].price;

    // Combined cost per share at the current level pair
    if (buyPrice + sellPrice >= 1.0) {
      break; // No more profitable depth beyond this point
    }

    // We can execute the minimum of what remains on each side
    const executableAtLevel = Math.min(buyRemaining, sellRemaining);

    if (executableAtLevel > 0) {
      totalShares += executableAtLevel;
      totalBuyCost += executableAtLevel * buyPrice;
      totalSellCost += executableAtLevel * sellPrice;

      // Record consumed buy level (merge if same price as previous entry)
      const lastBuy = consumedBuyLevels[consumedBuyLevels.length - 1];
      if (lastBuy && lastBuy.price === buyPrice) {
        lastBuy.quantity += executableAtLevel;
      } else {
        consumedBuyLevels.push({ price: buyPrice, quantity: executableAtLevel });
      }

      // Record consumed sell level (merge if same price as previous entry)
      const lastSell = consumedSellLevels[consumedSellLevels.length - 1];
      if (lastSell && lastSell.price === sellPrice) {
        lastSell.quantity += executableAtLevel;
      } else {
        consumedSellLevels.push({ price: sellPrice, quantity: executableAtLevel });
      }
    }

    // Consume liquidity and advance through the books
    buyRemaining -= executableAtLevel;
    sellRemaining -= executableAtLevel;

    if (buyRemaining <= 0) {
      buyIdx++;
      buyRemaining = buyAsks[buyIdx]?.quantity ?? 0;
    }
    if (sellRemaining <= 0) {
      sellIdx++;
      sellRemaining = sellAsks[sellIdx]?.quantity ?? 0;
    }
  }

  const avgBuyPrice = totalShares > 0 ? totalBuyCost / totalShares : 0;
  const avgSellPrice = totalShares > 0 ? totalSellCost / totalShares : 0;

  return {
    maxSize: totalShares,
    buyLevels: consumedBuyLevels,
    sellLevels: consumedSellLevels,
    avgBuyPrice: parseFloat(avgBuyPrice.toFixed(4)),
    avgSellPrice: parseFloat(avgSellPrice.toFixed(4)),
  };
}

// ---------------------------------------------------------------------------
// Helper: Assess arb risk by comparing settlement rules between two markets
// ---------------------------------------------------------------------------
// Returns a risk object containing individual factors and an aggregate level.
// The risk assessment flags any differences in how the two platforms would
// resolve what is supposed to be the same underlying event.
// ---------------------------------------------------------------------------

function assessArbRisk(marketA: Market, marketB: Market): ArbRisk {
  const factors: ArbRiskFactor[] = [];

  const rulesA = marketA.settlementRules;
  const rulesB = marketB.settlementRules;

  // --- Resolution source difference ---
  if (rulesA.source !== rulesB.source) {
    const severity: ArbRiskSeverity =
      rulesA.source.toLowerCase().includes("oracle") ||
      rulesB.source.toLowerCase().includes("oracle")
        ? "critical"
        : "warning";

    factors.push({
      type: "source_difference",
      title: "Different resolution sources",
      description:
        `${marketA.platform} uses "${rulesA.source}" while ` +
        `${marketB.platform} uses "${rulesB.source}".`,
      severity,
    });
  }

  // --- Timezone difference ---
  if (rulesA.timezone !== rulesB.timezone) {
    factors.push({
      type: "timing_difference",
      title: "Different settlement timezones",
      description:
        `${marketA.platform} settles in ${rulesA.timezone} while ` +
        `${marketB.platform} settles in ${rulesB.timezone}. ` +
        `This may cause one side to resolve before the other.`,
      severity: "warning",
    });
  }

  // --- Expiration date difference ---
  if (rulesA.expirationDate !== rulesB.expirationDate) {
    factors.push({
      type: "timing_difference",
      title: "Different expiration dates",
      description:
        `${marketA.platform} expires ${rulesA.expirationDate} vs ` +
        `${marketB.platform} expires ${rulesB.expirationDate}.`,
      severity: "critical",
    });
  }

  // --- Resolution criteria wording difference ---
  if (
    rulesA.criteria.toLowerCase().trim() !==
    rulesB.criteria.toLowerCase().trim()
  ) {
    factors.push({
      type: "wording_difference",
      title: "Different resolution criteria wording",
      description:
        "Resolution criteria differ between platforms. " +
        "Review carefully to ensure both markets resolve identically.",
      severity: "warning",
    });
  }

  // --- Liquidity risk (thin orderbook on either side) ---
  const MIN_LIQUIDITY = 500_000;
  if (marketA.liquidity < MIN_LIQUIDITY || marketB.liquidity < MIN_LIQUIDITY) {
    const thinSide =
      marketA.liquidity < marketB.liquidity ? marketA : marketB;
    const severity: ArbRiskSeverity =
      thinSide.liquidity < 250_000 ? "critical" : "warning";

    factors.push({
      type: "liquidity_risk",
      title: "Low liquidity on one side",
      description:
        `${thinSide.platform} market has only ` +
        `$${thinSide.liquidity.toLocaleString()} liquidity. ` +
        `Fills may slip or fail.`,
      severity,
    });
  }

  // --- Price source overlap check ---
  if (rulesA.priceSources && rulesB.priceSources) {
    const sourcesA = new Set(rulesA.priceSources.map((s) => s.toLowerCase()));
    const sourcesB = new Set(rulesB.priceSources.map((s) => s.toLowerCase()));
    const hasOverlap = Array.from(sourcesA).some((s) => sourcesB.has(s));

    if (!hasOverlap && sourcesA.size > 0 && sourcesB.size > 0) {
      factors.push({
        type: "source_difference",
        title: "No overlapping price sources",
        description:
          `${marketA.platform} uses [${rulesA.priceSources.join(", ")}] while ` +
          `${marketB.platform} uses [${rulesB.priceSources.join(", ")}]. ` +
          `Prices may diverge at settlement.`,
        severity: "critical",
      });
    }
  }

  // --- Aggregate risk level ---
  let level: ArbRisk["level"];
  if (factors.length === 0) {
    level = "low";
  } else if (factors.length <= 2) {
    level = "medium";
  } else {
    level = "high";
  }

  return { level, factors };
}

// ---------------------------------------------------------------------------
// Main scanner: find depth-aware arbitrage across all matched market pairs
// ---------------------------------------------------------------------------
//
// Algorithm:
//   1. Index markets by ID for O(1) lookup.
//   2. Iterate markets and follow matchedMarketId links to form pairs.
//   3. For each pair, check TWO arb directions:
//        Direction A: Buy YES on marketA + Buy NO on marketB  (yesArb)
//        Direction B: Buy YES on marketB + Buy NO on marketA  (noArb)
//   4. If the best ask prices combine to < $1.00, an arb exists.
//   5. Walk the depth to compute max executable size and profit.
//   6. Assess settlement risk.
//   7. Return opportunities sorted by maxExecutableProfit descending.
// ---------------------------------------------------------------------------

function scanForArbitrage(markets: Market[]): ArbitrageOpportunity[] {
  const now = new Date();
  const opportunities: ArbitrageOpportunity[] = [];

  // Build index for O(1) partner lookup
  const marketById = new Map<string, Market>();
  for (const m of markets) {
    marketById.set(m.id, m);
  }

  // Track processed pairs to avoid duplicates (A-B and B-A are the same pair)
  const processedPairs = new Set<string>();

  for (const market of markets) {
    if (!market.matchedMarketId) continue;
    if (market.status !== "ACTIVE") continue;

    const paired = marketById.get(market.matchedMarketId);
    if (!paired || paired.status !== "ACTIVE") continue;

    // Canonical pair key — sort IDs so order doesn't matter
    const pairKey = [market.id, paired.id].sort().join("|");
    if (processedPairs.has(pairKey)) continue;
    processedPairs.add(pairKey);

    const marketA = market;
    const marketB = paired;

    // Grab ask ladders from both orderbooks
    const yesAsksA = marketA.orderbook.yes.asks; // ascending by price
    const noAsksA = marketA.orderbook.no.asks;
    const yesAsksB = marketB.orderbook.yes.asks;
    const noAsksB = marketB.orderbook.no.asks;

    // ----- Direction 1 (yesArb): Buy YES on A + Buy NO on B -----
    const bestYesAskA = yesAsksA[0]?.price ?? Infinity;
    const bestNoAskB = noAsksB[0]?.price ?? Infinity;
    const costDir1 = bestYesAskA + bestNoAskB;

    // ----- Direction 2 (noArb): Buy YES on B + Buy NO on A -----
    const bestYesAskB = yesAsksB[0]?.price ?? Infinity;
    const bestNoAskA = noAsksA[0]?.price ?? Infinity;
    const costDir2 = bestYesAskB + bestNoAskA;

    // Evaluate both directions
    const directions: Array<{
      cost: number;
      yesArb: boolean;
      noArb: boolean;
      buyAsks: OrderbookLevel[];
      sellAsks: OrderbookLevel[];
      bestBuyPrice: number;
      bestSellPrice: number;
      buyPlatform: Market["platform"];
      sellPlatform: Market["platform"];
    }> = [
      {
        cost: costDir1,
        yesArb: true,
        noArb: false,
        buyAsks: yesAsksA,
        sellAsks: noAsksB,
        bestBuyPrice: bestYesAskA,
        bestSellPrice: bestNoAskB,
        buyPlatform: marketA.platform,
        sellPlatform: marketB.platform,
      },
      {
        cost: costDir2,
        yesArb: false,
        noArb: true,
        buyAsks: yesAsksB,
        sellAsks: noAsksA,
        bestBuyPrice: bestYesAskB,
        bestSellPrice: bestNoAskA,
        buyPlatform: marketB.platform,
        sellPlatform: marketA.platform,
      },
    ];

    for (const dir of directions) {
      // Skip if no arb at top-of-book
      if (dir.cost >= 1.0) continue;

      const spreadPerShare = 1.0 - dir.cost;
      const spreadPercent = parseFloat((spreadPerShare * 100).toFixed(2));

      // Walk the depth to find total executable size and profit
      const depth = calculateExecutableDepth(dir.buyAsks, dir.sellAsks);

      // Skip if nothing executable at profitable prices
      if (depth.maxSize <= 0) continue;

      // Profit = totalShares * (1.00 - avgBuyPrice - avgSellPrice)
      const maxExecutableProfit = parseFloat(
        (depth.maxSize * (1.0 - depth.avgBuyPrice - depth.avgSellPrice)).toFixed(2),
      );

      if (maxExecutableProfit <= 0) continue;

      const arbRisk = assessArbRisk(marketA, marketB);

      const status: ArbitrageStatus = "ACTIVE";

      opportunities.push({
        id: `arb_${marketA.id}_${marketB.id}_${dir.yesArb ? "yes" : "no"}`,
        marketA,
        marketB,
        spreadPercent,
        yesArb: dir.yesArb,
        noArb: dir.noArb,
        estimatedProfit100: parseFloat((spreadPerShare * 100).toFixed(2)),
        detectedAt: now,
        expiresAt: new Date(now.getTime() + 5 * 60 * 1000), // 5 min TTL
        status,
        buyPlatform: dir.buyPlatform,
        sellPlatform: dir.sellPlatform,
        bestBuyPrice: dir.bestBuyPrice,
        bestSellPrice: dir.bestSellPrice,
        maxExecutableProfit,
        maxExecutableSize: depth.maxSize,
        executableDepth: depth,
        arbRisk,
      });
    }
  }

  // Best opportunities first
  opportunities.sort((a, b) => b.maxExecutableProfit - a.maxExecutableProfit);

  return opportunities;
}

// ---------------------------------------------------------------------------
// GET /api/arbitrage/scan
// ---------------------------------------------------------------------------
// Fetches the current market catalog from the internal sync endpoint, runs
// the depth-aware arb scanner across all matched pairs, and returns any
// profitable opportunities sorted by max executable profit.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const origin = new URL(request.url).origin;
    const marketsRes = await fetch(`${origin}/api/markets/sync`);

    if (!marketsRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch markets", detail: marketsRes.statusText },
        { status: 502 },
      );
    }

    const { markets } = (await marketsRes.json()) as { markets: Market[] };

    const opportunities = scanForArbitrage(markets);

    return NextResponse.json({
      opportunities,
      scannedAt: new Date().toISOString(),
      count: opportunities.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Arbitrage scan failed", detail: message },
      { status: 500 },
    );
  }
}
