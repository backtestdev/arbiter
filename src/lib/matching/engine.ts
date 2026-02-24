import Fuse from "fuse.js";

interface MatchCandidate {
  id: string;
  title: string;
  category: string;
  closingTime: string;
  platform: string;
}

interface MatchResult {
  marketAId: string;
  marketBId: string;
  confidence: number;
  titleSimilarity: number;
}

/**
 * Normalizes a market title for comparison:
 * - Lowercases
 * - Strips punctuation
 * - Removes common stop words and platform-specific prefixes
 * - Extracts key entities (names, dates, numbers)
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[''""]/g, "'")
    .replace(/[^\w\s']/g, " ")
    .replace(
      /\b(will|the|a|an|in|on|at|by|to|for|of|be|is|are|was|were|do|does|did|has|have|had)\b/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if two markets have similar closing times (within 48 hours).
 * Markets about the same event should close around the same time.
 */
function hasCompatibleClosingTime(
  timeA: string,
  timeB: string,
  toleranceMs = 48 * 60 * 60 * 1000
): boolean {
  const dateA = new Date(timeA).getTime();
  const dateB = new Date(timeB).getTime();
  return Math.abs(dateA - dateB) <= toleranceMs;
}

/**
 * Finds matching markets across platforms using fuzzy string matching.
 * Returns pairs with confidence scores.
 */
export function findMatches(
  marketsA: MatchCandidate[],
  marketsB: MatchCandidate[]
): MatchResult[] {
  const normalizedB = marketsB.map((m) => ({
    ...m,
    normalizedTitle: normalizeTitle(m.title),
  }));

  const fuse = new Fuse(normalizedB, {
    keys: ["normalizedTitle"],
    threshold: 0.4,
    includeScore: true,
    minMatchCharLength: 3,
  });

  const results: MatchResult[] = [];

  for (const marketA of marketsA) {
    const normalizedA = normalizeTitle(marketA.title);
    const matches = fuse.search(normalizedA);

    for (const match of matches) {
      if (!match.score) continue;

      const marketB = match.item;

      // Skip same-platform matches
      if (marketA.platform === marketB.platform) continue;

      // Require compatible closing times
      if (!hasCompatibleClosingTime(marketA.closingTime, marketB.closingTime)) {
        continue;
      }

      const titleSimilarity = 1 - match.score;

      // Boost confidence for same-category matches
      const categoryBonus =
        marketA.category.toLowerCase() === marketB.category.toLowerCase()
          ? 0.1
          : 0;

      const confidence = Math.min(titleSimilarity + categoryBonus, 1);

      // Only include high-confidence matches
      if (confidence >= 0.6) {
        results.push({
          marketAId: marketA.id,
          marketBId: marketB.id,
          confidence,
          titleSimilarity,
        });
      }
    }
  }

  // Sort by confidence descending, deduplicate
  results.sort((a, b) => b.confidence - a.confidence);

  const usedA = new Set<string>();
  const usedB = new Set<string>();
  const deduped: MatchResult[] = [];

  for (const result of results) {
    if (!usedA.has(result.marketAId) && !usedB.has(result.marketBId)) {
      deduped.push(result);
      usedA.add(result.marketAId);
      usedB.add(result.marketBId);
    }
  }

  return deduped;
}

/**
 * Detects arbitrage opportunities between matched market pairs.
 * Arb exists when you can buy YES on one platform and NO on the other
 * for a combined cost less than $1.
 */
export function detectArbitrage(
  yesA: number,
  noA: number,
  yesB: number,
  noB: number
): {
  hasYesArb: boolean;
  hasNoArb: boolean;
  yesSpread: number;
  noSpread: number;
  bestArbProfit100: number;
} {
  // YES arb: buy YES where cheaper, sell (buy NO) where the other is cheaper
  // If yesA + noB < 1, or yesB + noA < 1 → arb exists
  const costYesANoB = yesA + noB;
  const costYesBNoA = yesB + noA;

  const hasYesArb = costYesANoB < 0.99 || costYesBNoA < 0.99;
  const hasNoArb = costYesANoB < 0.99 || costYesBNoA < 0.99;

  const yesSpread = Math.abs(yesA - yesB) * 100;
  const noSpread = Math.abs(noA - noB) * 100;

  const minCost = Math.min(costYesANoB, costYesBNoA);
  const bestArbProfit100 = minCost < 1 ? (1 - minCost) * 100 : 0;

  return { hasYesArb, hasNoArb, yesSpread, noSpread, bestArbProfit100 };
}
