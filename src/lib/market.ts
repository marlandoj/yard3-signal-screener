export type Signal = "Leading" | "Watch" | "Building";
export type SortKey = "score" | "change" | "price" | "volume" | "relative";
export type AssetClass = "Equity" | "ETF" | "REIT ETF" | "Bond ETF" | "Commodity ETF";

export interface ScoreReason {
  label: string;
  value: number;
}

export interface StockSnapshot {
  symbol: string;
  name: string;
  sector: string;
  assetClass: AssetClass;
  vehicle: string;
  price: number;
  changePercent: number;
  volume: number;
  averageVolume: number;
  volumeRatio: number;
  marketCap: number;
  pe: number;
  week52High: number;
  rsi: number;
  sma20: number;
  sma50: number;
  sparkline: number[];
  history: number[];
  score: number;
  signal: Signal;
  reasons: ScoreReason[];
  updatedAt: string;
}

export type ScoreInput = Omit<StockSnapshot, "score" | "signal" | "reasons" | "volumeRatio" | "history" | "updatedAt" | "assetClass" | "vehicle"> & {
  previousClose?: number;
  updatedAt?: string;
  assetClass?: AssetClass;
  vehicle?: string;
};

export interface MarketData {
  stocks: StockSnapshot[];
  source: "live" | "hybrid" | "fallback";
  updatedAt: string;
  message?: string;
}

export type MarketPayload = MarketData;

export interface MarketTapeItem {
  symbol: string;
  label: string;
  price: number;
  changePercent: number;
  kind: "index" | "stock" | "vehicle";
}

interface RawSeries {
  symbol: string;
  name: string;
  sector: string;
  assetClass: AssetClass;
  vehicle: string;
  marketCap: number;
  pe: number;
  timestamps: number[];
  closes: number[];
  volumes: number[];
}

const equityUniverse: RawSeries[] = [
  { symbol: "NVDA", name: "NVIDIA", sector: "Technology", assetClass: "Equity", vehicle: "Common stock", marketCap: 4.1e12, pe: 51, timestamps: [], closes: [], volumes: [] },
  { symbol: "AAPL", name: "Apple", sector: "Technology", assetClass: "Equity", vehicle: "Common stock", marketCap: 3.5e12, pe: 35, timestamps: [], closes: [], volumes: [] },
  { symbol: "MSFT", name: "Microsoft", sector: "Technology", assetClass: "Equity", vehicle: "Common stock", marketCap: 3.8e12, pe: 37, timestamps: [], closes: [], volumes: [] },
  { symbol: "AMZN", name: "Amazon", sector: "Consumer", assetClass: "Equity", vehicle: "Common stock", marketCap: 2.4e12, pe: 36, timestamps: [], closes: [], volumes: [] },
  { symbol: "META", name: "Meta Platforms", sector: "Communication", assetClass: "Equity", vehicle: "Common stock", marketCap: 1.7e12, pe: 29, timestamps: [], closes: [], volumes: [] },
  { symbol: "GOOGL", name: "Alphabet", sector: "Communication", assetClass: "Equity", vehicle: "Common stock", marketCap: 2.3e12, pe: 25, timestamps: [], closes: [], volumes: [] },
  { symbol: "AVGO", name: "Broadcom", sector: "Technology", assetClass: "Equity", vehicle: "Common stock", marketCap: 1.5e12, pe: 72, timestamps: [], closes: [], volumes: [] },
  { symbol: "JPM", name: "JPMorgan Chase", sector: "Financials", assetClass: "Equity", vehicle: "Common stock", marketCap: 830e9, pe: 14, timestamps: [], closes: [], volumes: [] },
  { symbol: "LLY", name: "Eli Lilly", sector: "Healthcare", assetClass: "Equity", vehicle: "Common stock", marketCap: 920e9, pe: 48, timestamps: [], closes: [], volumes: [] },
  { symbol: "XOM", name: "Exxon Mobil", sector: "Energy", assetClass: "Equity", vehicle: "Common stock", marketCap: 510e9, pe: 15, timestamps: [], closes: [], volumes: [] },
  { symbol: "WMT", name: "Walmart", sector: "Consumer", assetClass: "Equity", vehicle: "Common stock", marketCap: 1.0e12, pe: 41, timestamps: [], closes: [], volumes: [] },
  { symbol: "COST", name: "Costco", sector: "Consumer", assetClass: "Equity", vehicle: "Common stock", marketCap: 445e9, pe: 57, timestamps: [], closes: [], volumes: [] },
  { symbol: "NFLX", name: "Netflix", sector: "Communication", assetClass: "Equity", vehicle: "Common stock", marketCap: 510e9, pe: 49, timestamps: [], closes: [], volumes: [] },
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Technology", assetClass: "Equity", vehicle: "Common stock", marketCap: 265e9, pe: 46, timestamps: [], closes: [], volumes: [] },
  { symbol: "CRM", name: "Salesforce", sector: "Technology", assetClass: "Equity", vehicle: "Common stock", marketCap: 245e9, pe: 39, timestamps: [], closes: [], volumes: [] }
];

const vehicleUniverse: RawSeries[] = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF", sector: "Broad Market", assetClass: "ETF", vehicle: "Equity basket", marketCap: 650e9, pe: 25, timestamps: [], closes: [], volumes: [] },
  { symbol: "QQQ", name: "Invesco QQQ Trust", sector: "Broad Market", assetClass: "ETF", vehicle: "Growth basket", marketCap: 350e9, pe: 32, timestamps: [], closes: [], volumes: [] },
  { symbol: "IWM", name: "iShares Russell 2000 ETF", sector: "Small Cap", assetClass: "ETF", vehicle: "Small-cap basket", marketCap: 75e9, pe: 24, timestamps: [], closes: [], volumes: [] },
  { symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF", sector: "Fixed Income", assetClass: "Bond ETF", vehicle: "Long-duration Treasury", marketCap: 55e9, pe: 0, timestamps: [], closes: [], volumes: [] },
  { symbol: "GLD", name: "SPDR Gold Shares", sector: "Commodities", assetClass: "Commodity ETF", vehicle: "Physical gold exposure", marketCap: 85e9, pe: 0, timestamps: [], closes: [], volumes: [] },
  { symbol: "VNQ", name: "Vanguard Real Estate ETF", sector: "Real Estate", assetClass: "REIT ETF", vehicle: "REIT basket", marketCap: 38e9, pe: 0, timestamps: [], closes: [], volumes: [] }
];

const universe = [...equityUniverse, ...vehicleUniverse];

export const fallbackStocks: StockSnapshot[] = [
  ["NVDA", 182.42, 3.84, 4.7, "Technology"],
  ["AAPL", 229.87, 1.42, 1.1, "Technology"],
  ["MSFT", 429.03, 0.84, 0.8, "Technology"],
  ["AMZN", 218.49, 2.16, 1.6, "Consumer"],
  ["META", 714.22, 1.73, 1.2, "Communication"],
  ["GOOGL", 198.66, -0.42, 0.9, "Communication"],
  ["AVGO", 349.18, 4.21, 3.1, "Technology"],
  ["JPM", 289.31, 0.63, 0.7, "Financials"],
  ["LLY", 812.44, -1.18, 0.8, "Healthcare"],
  ["XOM", 117.82, 1.12, 1.4, "Energy"],
  ["WMT", 102.36, 0.38, 0.6, "Consumer"],
  ["COST", 921.55, -0.27, 0.5, "Consumer"],
  ["NFLX", 1182.4, 2.77, 1.4, "Communication"],
  ["AMD", 168.93, 3.19, 2.6, "Technology"],
  ["CRM", 258.17, -0.81, 0.9, "Technology"],
  ["SPY", 681.24, 0.62, 0.8, "Broad Market"],
  ["QQQ", 604.18, 0.94, 0.9, "Broad Market"],
  ["IWM", 237.46, -0.18, 0.7, "Small Cap"],
  ["TLT", 88.71, -0.27, 0.6, "Fixed Income"],
  ["GLD", 341.52, 1.12, 0.9, "Commodities"],
  ["VNQ", 91.38, 0.36, 0.5, "Real Estate"]
].map(([symbol, price, changePercent, volumeRatio, sector], index) => {
  const item = universe.find((stock) => stock.symbol === symbol)!;
  const change = Number(changePercent);
  const ratio = Number(volumeRatio);
  const sparkline = Array.from({ length: 24 }, (_, point) => Number(price) * (1 - (23 - point) * (change / 100) / 28));
  return enrich({
    symbol: String(symbol),
    name: item.name,
    sector: String(sector),
    assetClass: item.assetClass,
    vehicle: item.vehicle,
    price: Number(price),
    changePercent: change,
    volume: Math.round(32_000_000 * (1 + index * 0.08)),
    averageVolume: Math.round(32_000_000 * (1 + index * 0.08) / ratio),
    marketCap: item.marketCap,
    pe: item.pe,
    week52High: Number(price) * 1.09,
    rsi: 56 + (index % 5) * 3,
    sma20: Number(price) * 0.975,
    sma50: Number(price) * 0.942,
    sparkline,
    updatedAt: "2026-09-25T04:00:00.000Z"
  });
});

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function computeScore(stock: ScoreInput): { score: number; signal: Signal; reasons: ScoreReason[] } {
  const momentum = clamp(50 + stock.changePercent * 8);
  const participation = clamp((stock.volume / Math.max(stock.averageVolume, 1)) * 50);
  const proximity = clamp((stock.price / Math.max(stock.week52High, stock.price)) * 100);
  const rsiHealth = clamp(100 - Math.abs(stock.rsi - 58) * 2.6);
  const trend = stock.price > stock.sma20 && stock.sma20 > stock.sma50 ? 100 : stock.price > stock.sma20 ? 68 : 32;
  const valuation = stock.pe <= 0 ? 50 : clamp(100 - Math.max(stock.pe - 12, 0) * 1.45);
  const score = Math.round(momentum * 0.28 + participation * 0.18 + proximity * 0.2 + rsiHealth * 0.14 + trend * 0.12 + valuation * 0.08);
  const signal: Signal = score >= 76 ? "Leading" : score >= 60 ? "Watch" : "Building";
  return {
    score,
    signal,
    reasons: [
      { label: "Session momentum", value: Math.round(momentum) },
      { label: "Volume participation", value: Math.round(participation) },
      { label: "52-week proximity", value: Math.round(proximity) },
      { label: "Trend confirmation", value: trend },
      { label: "RSI health", value: Math.round(rsiHealth) },
      { label: "Valuation context", value: Math.round(valuation) }
    ]
  };
}

export function enrich(stock: ScoreInput): StockSnapshot {
  const result = computeScore(stock);
  return {
    ...stock,
    ...result,
    volumeRatio: stock.volume / Math.max(stock.averageVolume, 1),
    assetClass: stock.assetClass ?? "Equity",
    vehicle: stock.vehicle ?? "Single security",
    history: stock.sparkline,
    updatedAt: stock.updatedAt ?? new Date().toISOString()
  };
}

const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

function rsi(closes: number[], period = 14): number {
  if (closes.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let index = closes.length - period; index < closes.length; index += 1) {
    const difference = closes[index] - closes[index - 1];
    gains += Math.max(difference, 0);
    losses += Math.max(-difference, 0);
  }
  if (losses === 0) return 100;
  const relativeStrength = gains / losses;
  return 100 - 100 / (1 + relativeStrength);
}

async function fetchSeries(item: RawSeries, signal: AbortSignal): Promise<RawSeries> {
  const target = `https://query1.finance.yahoo.com/v8/finance/chart/${item.symbol}?range=6mo&interval=1d&events=history`;
  const proxy = `https://corsproxy.io/?url=${encodeURIComponent(target)}`;
  const response = await fetch(proxy, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Market data request failed with ${response.status}`);
  const payload = await response.json() as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: Array<number | null>; volume?: Array<number | null> }> };
      }>;
    };
  };
  const result = payload.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const closes = (quote?.close ?? []).filter((value): value is number => typeof value === "number");
  const volumes = (quote?.volume ?? []).filter((value): value is number => typeof value === "number");
  if (!result?.timestamp?.length || closes.length < 22) throw new Error(`${item.symbol} history is incomplete`);
  return { ...item, timestamps: result.timestamp, closes, volumes };
}

export async function loadMarketData(): Promise<MarketData> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const results = await Promise.allSettled(universe.map((item) => fetchSeries(item, controller.signal)));
    const live = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    if (!live.length) {
      return { stocks: fallbackStocks, source: "fallback", updatedAt: new Date().toISOString(), message: "Live feed unavailable · showing timestamped demo data" };
    }
    const stocks = live.map((item) => {
      const closes = item.closes;
      const volumes = item.volumes.length ? item.volumes : closes.map(() => 1);
      const price = closes.at(-1)!;
      const previous = closes.at(-2) ?? price;
      const recentVolumes = volumes.slice(-21, -1);
      return enrich({
        symbol: item.symbol,
        name: item.name,
        sector: item.sector,
        assetClass: item.assetClass,
        vehicle: item.vehicle,
        price,
        changePercent: ((price - previous) / previous) * 100,
        volume: volumes.at(-1) ?? 0,
        averageVolume: average(recentVolumes),
        marketCap: item.marketCap,
        pe: item.pe,
        week52High: Math.max(...closes),
        rsi: rsi(closes),
        sma20: average(closes.slice(-20)),
        sma50: average(closes.slice(-50)),
        sparkline: closes.slice(-28),
        updatedAt: new Date().toISOString()
      });
    });
    return {
      stocks,
      source: stocks.length === universe.length ? "live" : "hybrid",
      updatedAt: new Date().toISOString(),
      message: stocks.length === universe.length ? "Live market history connected" : `Live feed ${stocks.length}/${universe.length} · remaining rows use demo data`
    };
  } catch {
    return { stocks: fallbackStocks, source: "fallback", updatedAt: new Date().toISOString(), message: "Live feed unavailable · showing timestamped demo data" };
  } finally {
    clearTimeout(timer);
  }
}

export interface FilterOptions {
  query?: string;
  sector?: string;
  minScore?: number;
  maxPrice?: number;
  assetClass?: AssetClass | "All vehicles";
  sortKey?: SortKey;
}

export function filterStocks(stocks: StockSnapshot[], options: FilterOptions): StockSnapshot[];
export function filterStocks(stocks: StockSnapshot[], query: string, sector: string, minimumScore: number, maximumPrice: number): StockSnapshot[];
export function filterStocks(stocks: StockSnapshot[], optionsOrQuery: FilterOptions | string, sector = "All sectors", minimumScore = 0, maximumPrice = Number.POSITIVE_INFINITY): StockSnapshot[] {
  const provided = typeof optionsOrQuery === "string" ? { query: optionsOrQuery, sector, minScore: minimumScore, maxPrice: maximumPrice } : optionsOrQuery;
  const options = {
    query: provided.query ?? "",
    sector: provided.sector ?? "All sectors",
    minScore: provided.minScore ?? 0,
    maxPrice: provided.maxPrice ?? Number.POSITIVE_INFINITY,
    assetClass: provided.assetClass,
    sortKey: provided.sortKey
  };
  const normalized = options.query.trim().toLowerCase();
  const filtered = stocks.filter((stock) => {
    const matchesQuery = !normalized || stock.symbol.toLowerCase().includes(normalized) || stock.name.toLowerCase().includes(normalized);
    return matchesQuery && (options.sector === "All sectors" || stock.sector === options.sector) && (!options.assetClass || options.assetClass === "All vehicles" || stock.assetClass === options.assetClass) && stock.score >= options.minScore && stock.price <= options.maxPrice;
  });
  return options.sortKey ? sortStocks(filtered, options.sortKey) : filtered;
}

export function sortStocks(stocks: StockSnapshot[], key: SortKey = "score", relative?: Map<string, number>): StockSnapshot[] {
  return [...stocks].sort((left, right) => {
    if (key === "change") return right.changePercent - left.changePercent;
    if (key === "price") return right.price - left.price;
    if (key === "volume") return right.volumeRatio - left.volumeRatio;
    if (key === "relative") {
      const leftExcess = relative?.get(left.symbol) ?? Number.NEGATIVE_INFINITY;
      const rightExcess = relative?.get(right.symbol) ?? Number.NEGATIVE_INFINITY;
      return rightExcess - leftExcess;
    }
    return right.score - left.score;
  });
}

export function getSectorLeaders(stocks: StockSnapshot[]): Array<{ sector: string; averageChange: number }> {
  const grouped = new Map<string, number[]>();
  for (const stock of stocks) grouped.set(stock.sector, [...(grouped.get(stock.sector) ?? []), stock.changePercent]);
  return [...grouped.entries()]
    .map(([sector, changes]) => ({ sector, averageChange: average(changes) }))
    .sort((left, right) => right.averageChange - left.averageChange);
}

export function buildMarketTape(stocks: StockSnapshot[]): MarketTapeItem[] {
  const preferred = ["SPY", "QQQ", "IWM", "TLT", "GLD", "NVDA", "AAPL", "MSFT", "AMZN", "META", "JPM", "XOM", "VNQ"];
  return preferred.flatMap((symbol) => {
    const stock = stocks.find((item) => item.symbol === symbol);
    if (!stock) return [];
    return [{ symbol: stock.symbol, label: stock.assetClass === "Equity" ? stock.symbol : stock.assetClass, price: stock.price, changePercent: stock.changePercent, kind: stock.assetClass === "Equity" ? "stock" : "vehicle" } satisfies MarketTapeItem];
  });
}
