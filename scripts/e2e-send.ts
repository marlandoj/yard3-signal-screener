import { loadMarketData } from "../src/lib/market";

const symbol = (process.argv[2] ?? "NVDA").toUpperCase();
const recipient = process.argv[3];

const { stocks, source, message } = await loadMarketData();
const snapshot = stocks.find((stock) => stock.symbol === symbol);
if (!snapshot) throw new Error(`${symbol} not in universe`);

console.log(`source: ${source} (${message})`);
console.log(`using ${symbol} @ $${snapshot.price} score ${snapshot.score} ${snapshot.signal} (updated ${snapshot.updatedAt})`);

const response = await fetch("http://127.0.0.1:5187/api/scout", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ symbol, snapshot, recipient })
});

console.log(`HTTP ${response.status}`);
console.log(JSON.stringify(await response.json(), null, 2).slice(0, 900));
