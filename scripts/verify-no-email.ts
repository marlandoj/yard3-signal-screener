/** Verifies the live send path by delivering to an operator-controlled mailbox. */
import { loadMarketData } from "../src/lib/market";


const symbol = (process.argv[2] ?? "SPY").toUpperCase();
const recipient = process.argv[3];
if (!recipient) throw new Error("usage: verify-no-email.ts <SYMBOL> <recipient>");

const started = Date.now();
const data = await loadMarketData();
const snapshot = data.stocks.find((s) => s.symbol === symbol);
if (!snapshot) throw new Error(`unknown symbol ${symbol}`);
console.log(`using ${snapshot.symbol} @ $${snapshot.price.toFixed(2)} score ${snapshot.score} ${snapshot.signal}`);
console.log(`source: ${data.source}`);

const response = await fetch("http://127.0.0.1:5187/api/scout", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ symbol, snapshot, recipient })
});
console.log(`HTTP ${response.status} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log(JSON.stringify(await response.json(), null, 2));
