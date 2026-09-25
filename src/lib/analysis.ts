import { computeScore, type ScoreInput, type StockSnapshot } from "./market";

export const BENCHMARK_SYMBOL = "SPY";
const RELATIVE_STRENGTH_WINDOW = 20;

export interface RelativeStrength {
  symbol: string;
  excessReturn: number;
  windowBars: number;
  benchmarkReturn: number;
  instrumentReturn: number;
}

function windowReturn(series: number[], bars: number): number | null {
  const usable = series.filter((value) => Number.isFinite(value) && value > 0);
  if (usable.length < 2) return null;
  const start = Math.max(0, usable.length - 1 - bars);
  const first = usable[start];
  const last = usable[usable.length - 1];
  if (!first || !last) return null;
  return ((last - first) / first) * 100;
}

export function computeRelativeStrength(stocks: StockSnapshot[], benchmarkSymbol = BENCHMARK_SYMBOL): Map<string, RelativeStrength> {
  const results = new Map<string, RelativeStrength>();
  const benchmark = stocks.find((stock) => stock.symbol === benchmarkSymbol);
  const benchmarkReturn = benchmark ? windowReturn(benchmark.history, RELATIVE_STRENGTH_WINDOW) : null;
  for (const stock of stocks) {
    const instrumentReturn = stock.symbol === benchmarkSymbol ? benchmarkReturn : windowReturn(stock.history, RELATIVE_STRENGTH_WINDOW);
    if (instrumentReturn === null) continue;
    const excess = benchmarkReturn === null ? 0 : instrumentReturn - benchmarkReturn;
    results.set(stock.symbol, {
      symbol: stock.symbol,
      excessReturn: Math.round(excess * 100) / 100,
      windowBars: RELATIVE_STRENGTH_WINDOW,
      benchmarkReturn: benchmarkReturn === null ? 0 : Math.round(benchmarkReturn * 100) / 100,
      instrumentReturn: Math.round(instrumentReturn * 100) / 100
    });
  }
  return results;
}

export function previousCloseOf(stock: StockSnapshot): number {
  const factor = 1 + stock.changePercent / 100;
  return factor > 0 ? stock.price / factor : stock.price;
}

export function toScoreInput(stock: StockSnapshot, price: number, changePercent: number): ScoreInput {
  const { score: _score, signal: _signal, reasons: _reasons, history: _history, volumeRatio: _volumeRatio, updatedAt: _updatedAt, ...rest } = stock;
  const scenarioSeries = rest.sparkline.length ? [...rest.sparkline.slice(0, -1), price] : [price];
  return { ...rest, sparkline: scenarioSeries, price, changePercent };
}

export interface ScenarioPoint {
  movePercent: number;
  price: number;
  score: number;
  signal: string;
  delta: number;
}

export const SCENARIO_MOVES = [-20, -10, -5, 0, 5, 10, 20] as const;

export function buildScenario(stock: StockSnapshot, moves: readonly number[] = SCENARIO_MOVES): ScenarioPoint[] {
  const previousClose = previousCloseOf(stock);
  return moves.map((movePercent) => {
    const price = Math.max(0.01, stock.price * (1 + movePercent / 100));
    const changePercent = previousClose > 0 ? (price / previousClose - 1) * 100 : stock.changePercent;
    const result = computeScore(toScoreInput(stock, price, changePercent));
    return { movePercent, price, score: result.score, signal: result.signal, delta: result.score - stock.score };
  });
}

export interface Invalidation {
  level: number;
  kind: "support" | "invalidated";
  description: string;
}

export function invalidationLevels(stock: StockSnapshot): Invalidation[] {
  const levels: Invalidation[] = [
    { level: stock.sma20, kind: "support", description: "20-period average. Sustained closes below it weaken the short-term structure." },
    { level: stock.sma50, kind: "support", description: "50-period average. Losing it on a closing basis invalidates the constructive read." }
  ];
  return levels.sort((left, right) => right.level - left.level);
}
