/**
 * Seed script for populating realistic fake market data in development.
 * Run with: npx tsx scripts/seed.ts
 *
 * Since we're using mock API routes for development, this script
 * outputs the seed data structure that the API routes use.
 * In production, this would populate the Prisma/PostgreSQL database.
 */

interface SeedMarket {
  id: string;
  externalId: string;
  platform: "KALSHI" | "POLYMARKET";
  title: string;
  description: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  liquidity: number;
  closingTime: string;
  matchedMarketId: string | null;
}

const categories = ["Politics", "Crypto", "Economics", "Finance", "Technology", "Sports", "Science"];

const marketPairs: Array<{
  kalshiTitle: string;
  polyTitle: string;
  category: string;
  yesKalshi: number;
  yesPoly: number;
  volume: [number, number];
  liquidity: [number, number];
  closingTime: string;
}> = [
  {
    kalshiTitle: "Will a Democrat win the 2028 presidential election?",
    polyTitle: "Democrat wins 2028 presidential election",
    category: "Politics",
    yesKalshi: 0.52,
    yesPoly: 0.49,
    volume: [284000, 520000],
    liquidity: [1200000, 3400000],
    closingTime: "2028-11-03T00:00:00Z",
  },
  {
    kalshiTitle: "Will Bitcoin exceed $100,000 by end of 2026?",
    polyTitle: "Bitcoin above $100K in 2026",
    category: "Crypto",
    yesKalshi: 0.72,
    yesPoly: 0.68,
    volume: [156000, 340000],
    liquidity: [890000, 2100000],
    closingTime: "2026-12-31T00:00:00Z",
  },
  {
    kalshiTitle: "Will the Fed cut rates in March 2026?",
    polyTitle: "Fed rate cut in March 2026",
    category: "Economics",
    yesKalshi: 0.35,
    yesPoly: 0.31,
    volume: [89000, 125000],
    liquidity: [450000, 780000],
    closingTime: "2026-03-20T00:00:00Z",
  },
  {
    kalshiTitle: "Will the S&P 500 close above 6,000 on Dec 31, 2026?",
    polyTitle: "S&P 500 above 6,000 at end of 2026",
    category: "Finance",
    yesKalshi: 0.61,
    yesPoly: 0.57,
    volume: [210000, 175000],
    liquidity: [950000, 1100000],
    closingTime: "2026-12-31T00:00:00Z",
  },
  {
    kalshiTitle: "Will Ethereum exceed $5,000 in 2026?",
    polyTitle: "Ethereum above $5,000 in 2026",
    category: "Crypto",
    yesKalshi: 0.42,
    yesPoly: 0.38,
    volume: [67000, 92000],
    liquidity: [340000, 560000],
    closingTime: "2026-12-31T00:00:00Z",
  },
  {
    kalshiTitle: "Will US unemployment exceed 5% in 2026?",
    polyTitle: "US unemployment above 5% in 2026",
    category: "Economics",
    yesKalshi: 0.18,
    yesPoly: 0.15,
    volume: [45000, 78000],
    liquidity: [230000, 410000],
    closingTime: "2027-01-31T00:00:00Z",
  },
  {
    kalshiTitle: "Will Tesla stock exceed $400 by end of 2026?",
    polyTitle: "Tesla above $400 in 2026",
    category: "Finance",
    yesKalshi: 0.55,
    yesPoly: 0.52,
    volume: [134000, 245000],
    liquidity: [670000, 980000],
    closingTime: "2026-12-31T00:00:00Z",
  },
  {
    kalshiTitle: "Will GPT-5 be released before July 2026?",
    polyTitle: "GPT-5 release before July 2026",
    category: "Technology",
    yesKalshi: 0.65,
    yesPoly: 0.7,
    volume: [98000, 187000],
    liquidity: [450000, 890000],
    closingTime: "2026-07-01T00:00:00Z",
  },
];

const soloMarkets: Array<{
  title: string;
  platform: "KALSHI" | "POLYMARKET";
  category: string;
  yesPrice: number;
  volume: number;
  liquidity: number;
  closingTime: string;
}> = [
  {
    title: "Will an AI system pass a comprehensive AGI test by end of 2026?",
    platform: "KALSHI",
    category: "Technology",
    yesPrice: 0.08,
    volume: 45000,
    liquidity: 230000,
    closingTime: "2026-12-31T00:00:00Z",
  },
  {
    title: "US recession in 2026",
    platform: "POLYMARKET",
    category: "Economics",
    yesPrice: 0.22,
    volume: 198000,
    liquidity: 1500000,
    closingTime: "2027-06-30T00:00:00Z",
  },
  {
    title: "Will the next iPhone have a foldable display?",
    platform: "POLYMARKET",
    category: "Technology",
    yesPrice: 0.12,
    volume: 34000,
    liquidity: 190000,
    closingTime: "2026-09-30T00:00:00Z",
  },
  {
    title: "Will a Category 5 hurricane hit the US in 2026?",
    platform: "KALSHI",
    category: "Science",
    yesPrice: 0.31,
    volume: 56000,
    liquidity: 280000,
    closingTime: "2026-11-30T00:00:00Z",
  },
];

function generateSeedData(): SeedMarket[] {
  const markets: SeedMarket[] = [];
  let pairIndex = 0;

  for (const pair of marketPairs) {
    const kalshiId = `kalshi_seed_${pairIndex}`;
    const polyId = `poly_seed_${pairIndex}`;

    markets.push({
      id: kalshiId,
      externalId: `SEED-K-${pairIndex}`,
      platform: "KALSHI",
      title: pair.kalshiTitle,
      description: `Kalshi market: ${pair.kalshiTitle}`,
      category: pair.category,
      yesPrice: pair.yesKalshi,
      noPrice: parseFloat((1 - pair.yesKalshi).toFixed(2)),
      volume24h: pair.volume[0],
      liquidity: pair.liquidity[0],
      closingTime: pair.closingTime,
      matchedMarketId: polyId,
    });

    markets.push({
      id: polyId,
      externalId: `0xseed${pairIndex.toString(16).padStart(4, "0")}`,
      platform: "POLYMARKET",
      title: pair.polyTitle,
      description: `Polymarket market: ${pair.polyTitle}`,
      category: pair.category,
      yesPrice: pair.yesPoly,
      noPrice: parseFloat((1 - pair.yesPoly).toFixed(2)),
      volume24h: pair.volume[1],
      liquidity: pair.liquidity[1],
      closingTime: pair.closingTime,
      matchedMarketId: kalshiId,
    });

    pairIndex++;
  }

  for (const solo of soloMarkets) {
    markets.push({
      id: `${solo.platform.toLowerCase()}_solo_${pairIndex}`,
      externalId: solo.platform === "KALSHI" ? `SOLO-K-${pairIndex}` : `0xsolo${pairIndex}`,
      platform: solo.platform,
      title: solo.title,
      description: solo.title,
      category: solo.category,
      yesPrice: solo.yesPrice,
      noPrice: parseFloat((1 - solo.yesPrice).toFixed(2)),
      volume24h: solo.volume,
      liquidity: solo.liquidity,
      closingTime: solo.closingTime,
      matchedMarketId: null,
    });
    pairIndex++;
  }

  return markets;
}

const seedData = generateSeedData();
console.log(JSON.stringify(seedData, null, 2));
console.log(`\nGenerated ${seedData.length} seed markets (${marketPairs.length} matched pairs, ${soloMarkets.length} solo markets)`);
