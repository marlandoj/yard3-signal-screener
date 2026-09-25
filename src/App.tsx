import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Layers3,
  LoaderCircle,
  Mail,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X
} from "lucide-react";
import {
  fallbackStocks,
  filterStocks,
  loadMarketData,
  type AssetClass,
  type MarketPayload,
  type SortKey,
  type StockSnapshot
} from "./lib/market";
import "./styles.css";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const vehicleLabels: Array<AssetClass | "All vehicles"> = ["All vehicles", "Equity", "ETF", "REIT ETF", "Bond ETF", "Commodity ETF"];

function formatAge(iso: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function Delta({ value }: { value: number }) {
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return <span className={`delta ${positive ? "positive" : "negative"}`}><Icon size={14} aria-hidden="true" />{positive ? "+" : ""}{value.toFixed(2)}%</span>;
}

function Score({ value, large = false }: { value: number; large?: boolean }) {
  const tone = value >= 75 ? "leading" : value >= 60 ? "watch" : "building";
  return <span className={`score ${tone} ${large ? "score-large" : ""}`} aria-label={`Signal score ${value} out of 100`}>{value}</span>;
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const width = 116;
  const height = 34;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.slice(-24).map((value, index, list) => {
    const x = (index / Math.max(1, list.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Recent price trend"><line x1="0" y1={height - 1} x2={width} y2={height - 1} className="spark-baseline" /><polyline points={points} className={positive ? "spark-positive" : "spark-negative"} /></svg>;
}

function MarketTape({ stocks, onSelect }: { stocks: StockSnapshot[]; onSelect: (stock: StockSnapshot) => void }) {
  const movers = [...stocks].sort((left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent)).slice(0, 12);
  const items = [...movers, ...movers];
  return <section className="tape-strip" aria-label="Scrolling market tape">
    <div className="tape-status"><Radio size={14} /><span>MARKET TAPE</span><small>01</small></div>
    <div className="tape-viewport"><div className="tape-track">
      {items.map((stock, index) => <button className="tape-item" key={`${stock.symbol}-${index}`} onClick={() => onSelect(stock)} aria-label={`Inspect ${stock.symbol}`}>
        <strong>{stock.symbol}</strong><span>{stock.price.toFixed(2)}</span><em className={stock.changePercent >= 0 ? "positive" : "negative"}>{stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%</em><small>{stock.assetClass}</small>
      </button>)}
    </div></div>
    <div className="tape-universe"><Layers3 size={13} /> {stocks.length} instruments</div>
  </section>;
}

function VehicleSummary({ stocks }: { stocks: StockSnapshot[] }) {
  const vehicleGroups = useMemo(() => {
    const groups = new Map<AssetClass, StockSnapshot[]>();
    for (const stock of stocks) groups.set(stock.assetClass, [...(groups.get(stock.assetClass) ?? []), stock]);
    return [...groups.entries()].map(([assetClass, items]) => ({ assetClass, count: items.length, averageChange: items.reduce((sum, item) => sum + item.changePercent, 0) / items.length, leader: [...items].sort((left, right) => right.score - left.score)[0] })).sort((left, right) => right.count - left.count);
  }, [stocks]);
  return <section className="vehicle-panel panel" aria-labelledby="vehicles-title">
    <div className="panel-heading"><div><span className="eyebrow">Cross-asset lens</span><h2 id="vehicles-title">Financial vehicles</h2></div><Layers3 size={18} /></div>
    <div className="vehicle-list">{vehicleGroups.map((group) => <div className="vehicle-row" key={group.assetClass}><span>{group.assetClass}</span><strong>{group.count}</strong><em className={group.averageChange >= 0 ? "positive" : "negative"}>{group.averageChange >= 0 ? "+" : ""}{group.averageChange.toFixed(2)}%</em><small>{group.leader.symbol}</small></div>)}</div>
    <p className="microcopy">One scan across operating companies, index baskets, duration, real estate, and commodities.</p>
  </section>;
}

function StockRow({ stock, selected, onSelect, onSort }: { stock: StockSnapshot; selected: boolean; onSelect: () => void; onSort: (key: SortKey) => void }) {
  return <tr className={selected ? "selected" : ""} onClick={onSelect} tabIndex={0} onKeyDown={(event) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); }
  }}>
    <td><button className="stock-identity" onClick={onSelect} aria-label={`Inspect ${stock.symbol}`}><span className="ticker">{stock.symbol}</span><span className="company">{stock.name}</span></button></td>
    <td><span className="sector-label">{stock.assetClass}</span></td>
    <td className="numeric">{currency.format(stock.price)}</td>
    <td className="numeric"><Delta value={stock.changePercent} /></td>
    <td className="numeric mobile-hide">{stock.volumeRatio.toFixed(1)}×</td>
    <td className="numeric mobile-hide">{stock.rsi.toFixed(0)}</td>
    <td><Sparkline values={stock.history} positive={stock.changePercent >= 0} /></td>
    <td><button className="score-button" onClick={() => onSort("score")} aria-label={`Sort by ${stock.symbol} score`}><Score value={stock.score} /></button></td>
  </tr>;
}

function Methodology({ stock, scoutStatus, onScout, onClose }: { stock: StockSnapshot; scoutStatus: { state: "idle" | "sending" | "sent" | "error"; message?: string }; onScout: () => void; onClose: () => void }) {
  return <section className="detail-panel panel" aria-label={`${stock.symbol} score explanation`}>
    <div className="panel-heading"><div><span className="eyebrow">Signal anatomy</span><h2>{stock.symbol} / {stock.name}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close signal explanation"><X size={17} /></button></div>
    <div className="score-explainer"><Score value={stock.score} large /><div><strong>{stock.signal}</strong><p>Composite evidence, not a price prediction.</p></div></div>
    <Sparkline values={stock.history} positive={stock.changePercent >= 0} />
    <ul className="reason-list">{stock.reasons.map((reason) => <li key={reason.label}><span>{reason.label}</span><div className="reason-track"><i style={{ width: `${reason.value}%` }} /></div><strong>{reason.value}</strong></li>)}</ul>
    <div className="scout-box"><div><span className="eyebrow">Scout deep analysis</span><p>Send a research memo from TapeScope to the operator. No order is placed.</p></div><button className="scout-button" onClick={onScout} disabled={scoutStatus.state === "sending"}>{scoutStatus.state === "sending" ? <LoaderCircle size={14} className="spin" /> : scoutStatus.state === "sent" ? <CheckCircle2 size={14} /> : <Mail size={14} />}{scoutStatus.state === "sending" ? "Preparing" : scoutStatus.state === "sent" ? "Sent" : "Email memo"}</button>{scoutStatus.message && <span className={`scout-status ${scoutStatus.state}`}>{scoutStatus.message}</span>}</div>
    <p className="detail-note">Weights: momentum 28%, 52-week proximity 20%, volume 18%, trend 14%, RSI 14%, valuation 6%. Signals refresh from public delayed market data when available.</p>
  </section>;
}

export default function App() {
  const [payload, setPayload] = useState<MarketPayload>({ stocks: fallbackStocks, source: "fallback", updatedAt: fallbackStocks[0].updatedAt });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All sectors");
  const [assetClass, setAssetClass] = useState<AssetClass | "All vehicles">("All vehicles");
  const [minScore, setMinScore] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1500);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [selectedSymbol, setSelectedSymbol] = useState(fallbackStocks[0].symbol);
  const [showMethodology, setShowMethodology] = useState(false);
  const [scoutStatus, setScoutStatus] = useState<{ state: "idle" | "sending" | "sent" | "error"; message?: string }>({ state: "idle" });

  async function refresh() {
    setLoading(true);
    const next = await loadMarketData();
    setPayload(next);
    setSelectedSymbol((current) => next.stocks.some((stock) => stock.symbol === current) ? current : next.stocks[0]?.symbol);
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, []);

  const sectors = useMemo(() => ["All sectors", ...new Set(payload.stocks.map((stock) => stock.sector))], [payload.stocks]);
  const visible = useMemo(() => filterStocks(payload.stocks, { query, sector, assetClass, minScore, maxPrice, sortKey }), [payload.stocks, query, sector, assetClass, minScore, maxPrice, sortKey]);
  const selected = payload.stocks.find((stock) => stock.symbol === selectedSymbol) ?? visible[0] ?? payload.stocks[0];
  const gainers = payload.stocks.filter((stock) => stock.changePercent > 0).length;
  const leaders = payload.stocks.filter((stock) => stock.score >= 75).length;
  const averageChange = payload.stocks.reduce((sum, stock) => sum + stock.changePercent, 0) / Math.max(1, payload.stocks.length);
  const strongest = [...payload.stocks].sort((left, right) => right.score - left.score)[0];

  function resetFilters() {
    setQuery(""); setSector("All sectors"); setAssetClass("All vehicles"); setMinScore(0); setMaxPrice(1500); setScoutStatus({ state: "idle" });
  }

  function selectStock(stock: StockSnapshot) {
    setSelectedSymbol(stock.symbol);
    setShowMethodology(true);
    setScoutStatus({ state: "idle" });
  }

  async function requestScout() {
    if (!selected || scoutStatus.state === "sending") return;
    setScoutStatus({ state: "sending" });
    try {
      const response = await fetch("/api/scout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol: selected.symbol, snapshot: selected }) });
      const result = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Scout request failed");
      setScoutStatus({ state: "sent", message: `Memo queued for ${selected.symbol}.` });
    } catch (error) {
      setScoutStatus({ state: "error", message: error instanceof Error ? error.message : "Scout request failed" });
    }
  }

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand-block"><div className="brand-mark" aria-hidden="true"><Activity size={20} /></div><div><div className="brand-name">TapeScope</div><div className="brand-subtitle">Cross-asset signal desk</div></div></div>
      <div className="topbar-actions"><div className={`source-status ${payload.source}`} role="status" aria-live="polite"><span className="status-dot" /><div><strong>{payload.source === "live" ? "Live delayed" : payload.source === "hybrid" ? "Hybrid feed" : "Reference feed"}</strong><small><Clock3 size={12} /> {formatAge(payload.updatedAt)}</small></div></div><button className="secondary-button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh</button></div>
    </header>
    <MarketTape stocks={payload.stocks} onSelect={selectStock} />
    <section className="workspace" aria-label="TapeScope stock screener">
      <aside className="control-rail panel">
        <div className="rail-intro"><span className="eyebrow">One screen. Clear evidence.</span><h1>Signal, not noise.</h1><p>Scan companies and financial vehicles, inspect the score, then make your own decision.</p></div>
        <div className="control-group"><label htmlFor="ticker-search">Search</label><div className="search-field"><Search size={15} aria-hidden="true" /><input id="ticker-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ticker, company, or vehicle" /></div></div>
        <div className="control-group"><label htmlFor="sector-filter">Sector</label><select id="sector-filter" value={sector} onChange={(event) => setSector(event.target.value)}>{sectors.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="control-group"><label htmlFor="vehicle-filter">Vehicle class</label><select id="vehicle-filter" value={assetClass} onChange={(event) => setAssetClass(event.target.value as AssetClass | "All vehicles")}>{vehicleLabels.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="control-group"><div className="label-row"><label htmlFor="score-filter">Minimum score</label><output>{minScore}</output></div><input id="score-filter" type="range" min="0" max="90" step="5" value={minScore} onChange={(event) => setMinScore(Number(event.target.value))} /></div>
        <div className="control-group"><div className="label-row"><label htmlFor="price-filter">Maximum price</label><output>{currency.format(maxPrice)}</output></div><input id="price-filter" type="range" min="50" max="1500" step="25" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} /></div>
        <button className="text-button" onClick={resetFilters}>Reset filters</button>
        <div className="safety-note"><ShieldCheck size={17} /><div><strong>Read-only research</strong><span>No orders, no brokerage connection.</span></div></div>
      </aside>
      <section className="results-panel panel" aria-labelledby="results-title">
        <div className="results-header"><div><span className="eyebrow">Watchlist scan</span><h2 id="results-title">Strongest signals</h2></div><div className="result-count">{visible.length} of {payload.stocks.length} instruments</div></div>
        <div className="table-wrap" aria-live="polite"><table><thead><tr><th>Instrument</th><th>Vehicle</th><th className="numeric">Price</th><th className="numeric">Today</th><th className="numeric mobile-hide">Volume</th><th className="numeric mobile-hide">RSI</th><th>Trend</th><th><button onClick={() => setSortKey("score")}>Score</button></th></tr></thead><tbody>{visible.map((stock) => <StockRow key={stock.symbol} stock={stock} selected={selected?.symbol === stock.symbol} onSelect={() => selectStock(stock)} onSort={setSortKey} />)}</tbody></table>{visible.length === 0 && <div className="empty-state"><SlidersHorizontal size={20} /><strong>No signals match</strong><span>Lower the score or price threshold.</span></div>}</div>
      </section>
      <aside className="insight-rail">
        <section className="pulse-panel panel" aria-labelledby="pulse-title"><div className="panel-heading"><div><span className="eyebrow">Market pulse</span><h2 id="pulse-title">Breadth</h2></div><BarChart3 size={18} /></div><div className="pulse-grid"><div><span>Advancing</span><strong>{number.format(gainers)}<small>/{payload.stocks.length}</small></strong></div><div><span>Avg move</span><strong className={averageChange >= 0 ? "positive" : "negative"}>{averageChange >= 0 ? "+" : ""}{averageChange.toFixed(2)}%</strong></div><div><span>Leading</span><strong>{leaders}</strong></div><div><span>Top signal</span><strong>{strongest?.symbol ?? "—"}</strong></div></div><div className="breadth-track" aria-label={`${gainers} of ${payload.stocks.length} instruments advancing`}><i style={{ width: `${(gainers / Math.max(1, payload.stocks.length)) * 100}%` }} /></div><p className="microcopy">Based on the loaded {payload.stocks.length}-instrument universe—not the full market.</p></section>
        <VehicleSummary stocks={payload.stocks} />
        {showMethodology && selected ? <Methodology stock={selected} scoutStatus={scoutStatus} onScout={() => void requestScout()} onClose={() => setShowMethodology(false)} /> : <section className="method-card panel"><span className="eyebrow">Transparent by design</span><h2>Every score opens up.</h2><p>Select any row to see the evidence components, then ask Scout for a deeper memo.</p><button className="primary-button" onClick={() => setShowMethodology(true)} disabled={!selected}><Sparkles size={14} /> Inspect {selected?.symbol ?? "signal"}</button><div className="formula">score = evidence × fit</div></section>}
        <section className="disclaimer panel"><strong>Research tool, not advice.</strong><span>Public data may be delayed. Verify prices independently before acting. Scout never places trades.</span></section>
      </aside>
    </section>
  </main>;
}
