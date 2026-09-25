import { describe, expect, it } from "vitest";
import { fallbackStocks, filterStocks, sortStocks } from "./market";
import {
  BENCHMARK_SYMBOL,
  buildScenario,
  computeRelativeStrength,
  invalidationLevels,
  previousCloseOf,
  SCENARIO_MOVES
} from "./analysis";

const spy = fallbackStocks.find((stock) => stock.symbol === BENCHMARK_SYMBOL)!;
const aapl = fallbackStocks.find((stock) => stock.symbol === "AAPL")!;

describe("relative strength", () => {
  it("anchors the benchmark to zero excess return", () => {
    const table = computeRelativeStrength(fallbackStocks);
    expect(table.get(BENCHMARK_SYMBOL)?.excessReturn).toBe(0);
  });

  it("measures excess return over the 20-bar window", () => {
    const table = computeRelativeStrength(fallbackStocks);
    const entry = table.get("AAPL");
    expect(entry).toBeDefined();
    expect(entry!.windowBars).toBe(20);
    expect(entry!.excessReturn).toBeCloseTo(
      Math.round((entry!.instrumentReturn - entry!.benchmarkReturn) * 100) / 100,
      5
    );
  });

  it("omits instruments without usable history instead of inventing a value", () => {
    const broken = [{ ...aapl, history: [] as number[] }, spy];
    const table = computeRelativeStrength(broken);
    expect(table.has("AAPL")).toBe(false);
    expect(table.has(BENCHMARK_SYMBOL)).toBe(true);
  });

  it("ranks a stronger instrument above a weaker one", () => {
    const strong = { ...aapl, history: [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121] };
    const weak = { ...aapl, symbol: "WEAK", history: [100, 99, 98, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80, 79] };
    const table = computeRelativeStrength([strong, weak, spy]);
    expect(table.get("AAPL")!.excessReturn).toBeGreaterThan(table.get("WEAK")!.excessReturn);
  });
});

describe("previous close", () => {
  it("reverses the session change", () => {
    const close = previousCloseOf({ ...aapl, price: 110, changePercent: 10 });
    expect(close).toBeCloseTo(100, 6);
  });

  it("falls back to price when the change cannot be reversed", () => {
    expect(previousCloseOf({ ...aapl, price: 100, changePercent: -100 })).toBe(100);
  });
});

describe("scenario planner", () => {
  it("reproduces the live score at a zero move", () => {
    const base = buildScenario(aapl, [0])[0];
    expect(base.price).toBeCloseTo(aapl.price, 6);
    expect(base.score).toBe(aapl.score);
    expect(base.delta).toBe(0);
  });

  it("prices each move monotonically, so deeper downside means a lower price", () => {
    const rows = buildScenario(aapl);
    for (let index = 1; index < rows.length; index += 1) {
      expect(rows[index].price).toBeGreaterThan(rows[index - 1].price);
      expect(rows[index].movePercent).toBeGreaterThan(rows[index - 1].movePercent);
    }
    const flat = rows.find((row) => row.movePercent === 0);
    const deepest = rows.find((row) => row.movePercent === -20);
    expect(deepest!.price).toBeLessThan(flat!.price);
  });

  it("keeps every projected price non-negative at -20%", () => {
    const row = buildScenario(aapl, [-20])[0];
    expect(row.price).toBeGreaterThan(0);
  });

  it("uses the scenario move, not the session move, for the projected return", () => {
    const up = buildScenario(aapl, [10])[0];
    const previousClose = previousCloseOf(aapl);
    expect(up.price).toBeCloseTo(aapl.price * 1.1, 6);
    expect(up.price / previousClose).toBeGreaterThan(aapl.price / previousClose);
  });

  it("exposes the declared default stress range", () => {
    expect(SCENARIO_MOVES).toContain(-20);
    expect(SCENARIO_MOVES).toContain(20);
    expect(buildScenario(aapl)).toHaveLength(SCENARIO_MOVES.length);
  });
});

describe("invalidation levels", () => {
  it("returns both averages ordered from the highest", () => {
    const levels = invalidationLevels(aapl);
    expect(levels).toHaveLength(2);
    expect(levels[0].level).toBeGreaterThanOrEqual(levels[1].level);
  });
});

describe("existing score model is unchanged", () => {
  it("still sorts by score by default", () => {
    const sorted = sortStocks(fallbackStocks);
    expect(sorted[0].score).toBeGreaterThanOrEqual(sorted[sorted.length - 1].score);
  });

  it("still filters by minimum score", () => {
    const filtered = filterStocks(fallbackStocks, { minScore: 70 });
    expect(filtered.every((stock) => stock.score >= 70)).toBe(true);
  });
});
