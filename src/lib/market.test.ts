import { describe, expect, it } from "vitest";
import { computeScore, filterStocks, fallbackStocks, getSectorLeaders } from "./market";

describe("computeScore", () => {
  it("ranks a strong, liquid trend above a weak setup", () => {
    const leader = computeScore({ symbol: "AAA", name: "Leader", sector: "Technology", price: 190, previousClose: 180, changePercent: 5, volume: 9_000_000, averageVolume: 5_000_000, marketCap: 100_000_000_000, pe: 24, week52High: 195, rsi: 61, sma20: 185, sma50: 180, sparkline: [170, 175, 180, 185, 190] });
    const laggard = computeScore({ symbol: "BBB", name: "Laggard", sector: "Utilities", price: 42, previousClose: 44, changePercent: -4, volume: 800_000, averageVolume: 5_000_000, marketCap: 12_000_000_000, pe: 34, week52High: 60, rsi: 32, sma20: 40, sma50: 44, sparkline: [48, 46, 44, 42] });
    expect(leader.score).toBeGreaterThan(laggard.score);
    expect(leader.signal).toBe("Leading");
    expect(leader.reasons.length).toBeGreaterThanOrEqual(3);
  });
});

describe("filterStocks", () => {
  it("applies query, sector, score, and price constraints", () => {
    const result = filterStocks(fallbackStocks, { query: "NVDA", sector: "Technology", minScore: 70, maxPrice: 500, sortKey: "score" });
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("NVDA");
  });
});

describe("getSectorLeaders", () => {
  it("returns the strongest average sector move", () => {
    const result = getSectorLeaders(fallbackStocks);
    expect(result.length).toBeGreaterThan(1);
    expect(result[0].averageChange).toBeGreaterThanOrEqual(result[1].averageChange);
  });
});
