import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, normalize } from "node:path";
import { tmpdir } from "node:os";
import { fallbackStocks, type StockSnapshot } from "./src/lib/market";

type BunFile = Blob & { exists: () => Promise<boolean> };
type BunRuntime = {
  env: Record<string, string | undefined>;
  file: (path: string) => BunFile;
  serve: (options: { port: number; fetch: (request: Request) => Response | Promise<Response> }) => { port: number };
  write: (path: string, data: string | Uint8Array) => Promise<number>;
  spawnSync: (options: { cmd: string[]; stdout?: string | number; stderr?: string | number }) => { exitCode: number; stdout?: Uint8Array; stderr?: Uint8Array };
};

type ScoutAnalysis = {
  mode: "scout-model" | "rules-fallback";
  executiveSummary: string;
  technicalRead: string;
  riskFlags: string;
  watchLevels: string;
  verdict: string;
  sources: string;
};

const runtime = (globalThis as typeof globalThis & { Bun: BunRuntime }).Bun;
const port = Number(runtime.env.PORT ?? 5187);
const root = join(import.meta.dir, "dist");
const recipient = "marlandoj@gmail.com";
const sender = "tapescope@agents.zouroboros.ai";
const scoutModel = "byok:dbce4b53-28f2-4a4d-ada2-30326765d57b";
const requestLog = new Map<string, number[]>();
const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function clean(value: unknown, fallback: string, maxLength = 900) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : fallback;
}

function rateLimited(request: Request) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const recent = (requestLog.get(key) ?? []).filter((timestamp) => now - timestamp < 60 * 60 * 1000);
  if (recent.length >= 5) return true;
  requestLog.set(key, [...recent, now]);
  return false;
}

function buildPrompt(symbol: string, snapshot: StockSnapshot) {
  const compact = {
    symbol: snapshot.symbol,
    name: snapshot.name,
    assetClass: snapshot.assetClass,
    vehicle: snapshot.vehicle,
    sector: snapshot.sector,
    price: snapshot.price,
    changePercent: snapshot.changePercent,
    volumeRatio: snapshot.volumeRatio,
    rsi: snapshot.rsi,
    sma20: snapshot.sma20,
    sma50: snapshot.sma50,
    week52High: snapshot.week52High,
    score: snapshot.score,
    signal: snapshot.signal,
    reasons: snapshot.reasons,
    updatedAt: snapshot.updatedAt,
    history: snapshot.history.slice(-28)
  };
  return `You are TapeScope Scout, a careful market research analyst. Read and apply the rubric in /home/workspace/Projects/zouroboros/Skills/jhf-strategy-scout/SKILL.md and /home/workspace/Projects/zouroboros/Skills/jhf-strategy-scout/references/verdict-rubric.md. Analyze the supplied ${symbol} snapshot for a single-screen research desk. This is analysis only: do not place orders, claim certainty, invent news, or give personalized financial advice. Explain what the evidence supports, what it does not support, the key risks, and levels a trader would monitor next. Use the exact JSON output schema requested. Keep each field concise and evidence-based. Snapshot: ${JSON.stringify(compact)}`;
}

function rulesFallbackAnalysis(snapshot: StockSnapshot): ScoutAnalysis {
  const trend = snapshot.price > snapshot.sma20 && snapshot.sma20 > snapshot.sma50 ? "constructive" : snapshot.price > snapshot.sma20 ? "mixed" : "fragile";
  const rsiRead = snapshot.rsi >= 70 ? "overbought" : snapshot.rsi <= 30 ? "oversold" : "neutral";
  const participation = snapshot.volumeRatio >= 1.2 ? "above" : snapshot.volumeRatio <= 0.8 ? "below" : "near";
  return {
    mode: "rules-fallback",
    executiveSummary: `${snapshot.symbol} is a ${snapshot.signal.toLowerCase()} ${snapshot.assetClass.toLowerCase()} signal at ${snapshot.score}/100. The tape shows a ${trend} short-term structure with ${participation} volume participation. This is a research snapshot, not a trade instruction.`,
    technicalRead: `Price is $${snapshot.price.toFixed(2)} versus a 20-period average of $${snapshot.sma20.toFixed(2)} and a 50-period average of $${snapshot.sma50.toFixed(2)}. RSI is ${snapshot.rsi.toFixed(0)} (${rsiRead}); the latest close is ${snapshot.changePercent >= 0 ? "above" : "below"} the prior session by ${Math.abs(snapshot.changePercent).toFixed(2)}%. The score rewards momentum, participation, trend confirmation, RSI health, 52-week proximity, and valuation context.`,
    riskFlags: snapshot.assetClass === "Equity" ? "Single-name equity risk remains material: gap risk, earnings events, and sector concentration can overwhelm a technical signal. Do not infer a target price or position size from this screen." : `${snapshot.assetClass} exposure is not the same as a single stock: check duration, tracking error, liquidity, and the underlying index before drawing conclusions.`,
    watchLevels: `Monitor the 20-period average ($${snapshot.sma20.toFixed(2)}), 50-period average ($${snapshot.sma50.toFixed(2)}), and the observed six-month high ($${snapshot.week52High.toFixed(2)}). A trader should confirm the next move with volume and a fresh catalyst rather than treating the score as a standalone trigger.`,
    verdict: `Evidence grade: ${trend}; research posture: monitor for confirmation. TapeScope does not place orders or provide personalized advice.`,
    sources: `TapeScope market adapter (${snapshot.updatedAt}); score model in src/lib/market.ts; Scout rubric at /home/workspace/Projects/zouroboros/Skills/jhf-strategy-scout/references/verdict-rubric.md.`
  };
}

function fallbackAnalysis(snapshot: StockSnapshot): ScoutAnalysis {
  const trend = snapshot.price >= snapshot.sma20 && snapshot.sma20 >= snapshot.sma50 ? "constructive" : snapshot.price < snapshot.sma50 ? "fragile" : "mixed";
  const distanceToHigh = ((snapshot.price / snapshot.week52High) - 1) * 100;
  const volumeRead = snapshot.volumeRatio >= 1.2 ? "participation is above its recent baseline" : snapshot.volumeRatio <= 0.8 ? "participation is below its recent baseline" : "participation is near its recent baseline";
  return {
    mode: "rules-fallback",
    executiveSummary: `${snapshot.symbol} is classified ${snapshot.signal.toLowerCase()} with a ${snapshot.score}/100 composite score. The rules-based read is ${trend}; it is a research snapshot, not a trade instruction.`,
    technicalRead: `Price is $${snapshot.price.toFixed(2)} versus a 20-day average of $${snapshot.sma20.toFixed(2)} and a 50-day average of $${snapshot.sma50.toFixed(2)}. RSI is ${snapshot.rsi.toFixed(0)} and ${volumeRead}. The supplied reasons are: ${snapshot.reasons.join("; ")}.`,
    riskFlags: `${snapshot.assetClass} / ${snapshot.vehicle} exposure can carry sector, duration, rate, commodity, and concentration risks that are not visible in this single snapshot. The tape is delayed and the data adapter may be incomplete.`,
    watchLevels: `Monitor the 20-day and 50-day moving averages, the 52-week high near $${snapshot.week52High.toFixed(2)} (${distanceToHigh.toFixed(1)}% from current), and volume relative to the ${snapshot.averageVolume.toLocaleString()} average. Confirm the setup with independent research before acting.`,
    verdict: `Rules-based evidence is ${trend}; verify with current news, filings, liquidity, and risk limits before making any decision.`,
    sources: "TapeScope delayed market snapshot and Yahoo Finance historical data adapter. Fallback generated from the jhf-strategy-scout rubric; no news or order data is inferred."
  };
}

async function runScout(symbol: string, snapshot: StockSnapshot): Promise<ScoutAnalysis> {
  const token = runtime.env.ZO_CLIENT_IDENTITY_TOKEN ?? runtime.env.ZO_API_KEY ?? runtime.env.JHF_ZO_API_KEY;
  if (!token) return fallbackAnalysis(snapshot);
  const base = runtime.env.ZO_API_BASE ?? "https://api.zo.computer";
  const response = await fetch(`${base}/zo/ask`, {
    method: "POST",
    headers: { authorization: token, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      input: buildPrompt(symbol, snapshot),
      model_name: scoutModel,
      output_format: {
        type: "object",
        properties: {
          executiveSummary: { type: "string" },
          technicalRead: { type: "string" },
          riskFlags: { type: "string" },
          watchLevels: { type: "string" },
          verdict: { type: "string" },
          sources: { type: "string" }
        },
        required: ["executiveSummary", "technicalRead", "riskFlags", "watchLevels", "verdict", "sources"]
      }
    })
  });
  if (!response.ok) throw new Error(`Scout model returned ${response.status}`);
  const payload = await response.json() as { output?: unknown };
  let output = payload.output;
  if (typeof output === "string") {
    try { output = JSON.parse(output); } catch { throw new Error("Scout model returned an unreadable report"); }
  }
  if (!output || typeof output !== "object") throw new Error("Scout model returned no report");
  const value = output as Record<string, unknown>;
  return {
    mode: "scout-model",
    executiveSummary: clean(value.executiveSummary, "No executive summary returned.", 1400),
    technicalRead: clean(value.technicalRead, "No technical read returned.", 2200),
    riskFlags: clean(value.riskFlags, "No risk flags returned.", 1800),
    watchLevels: clean(value.watchLevels, "No watch levels returned.", 1600),
    verdict: clean(value.verdict, "Research verdict unavailable.", 700),
    sources: clean(value.sources, "TapeScope delayed market snapshot; Yahoo Finance historical data adapter.", 1200)
  };
}

function reportHtml(snapshot: StockSnapshot, analysis: ScoutAnalysis, generatedAt: string) {
  const positive = snapshot.changePercent >= 0;
  const changeClass = positive ? "positive" : "negative";
  const change = `${positive ? "+" : ""}${snapshot.changePercent.toFixed(2)}%`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body{font-family:Arial,sans-serif;color:#172033;margin:0;padding:28px;line-height:1.5}h1{font-size:25px;margin:0 0 5px}h2{font-size:16px;margin:25px 0 8px;color:#0e6173;border-bottom:1px solid #d9e3ea;padding-bottom:5px}p{margin:7px 0}table{border-collapse:collapse;width:100%;margin:15px 0}td{border:1px solid #d9e3ea;padding:8px;font-size:12px}td:first-child{background:#eef5f7;font-weight:bold;width:31%}.positive{color:#087443}.negative{color:#a22b3d}.muted{color:#5b6a79;font-size:11px}.footer{margin-top:28px;padding-top:12px;border-top:1px solid #d9e3ea;color:#6b7785;font-size:11px}
  </style></head><body><p class="muted">TAPESCOPE / SCOUT RESEARCH DESK · ${escapeHtml(generatedAt)}</p><h1>${escapeHtml(snapshot.symbol)} — ${escapeHtml(snapshot.name)}</h1><p class="muted">${escapeHtml(snapshot.assetClass)} · ${escapeHtml(snapshot.vehicle)} · ${escapeHtml(snapshot.sector)}</p><table><tr><td>Signal</td><td>${escapeHtml(snapshot.signal)} / ${snapshot.score} of 100</td><td>Session move</td><td class="${changeClass}">${change}</td></tr><tr><td>Scout mode</td><td>${escapeHtml(analysis.mode === "scout-model" ? "Scout model + rubric" : "Rubric fallback")}</td><td>Snapshot</td><td>${escapeHtml(snapshot.updatedAt)}</td></tr><tr><td>Price</td><td>$${snapshot.price.toFixed(2)}</td><td>RSI</td><td>${snapshot.rsi.toFixed(0)}</td></tr><tr><td>20 / 50 SMA</td><td>${snapshot.sma20.toFixed(2)} / ${snapshot.sma50.toFixed(2)}</td><td>52-week high</td><td>${snapshot.week52High.toFixed(2)}</td></tr></table><h2>Executive summary</h2><p>${escapeHtml(analysis.executiveSummary)}</p><h2>Technical read</h2><p>${escapeHtml(analysis.technicalRead)}</p><h2>Risk flags</h2><p>${escapeHtml(analysis.riskFlags)}</p><h2>Levels to monitor</h2><p>${escapeHtml(analysis.watchLevels)}</p><h2>Research verdict</h2><p>${escapeHtml(analysis.verdict)}</p><h2>Evidence and sources</h2><p>${escapeHtml(analysis.sources)}</p><p class="muted">Snapshot timestamp: ${escapeHtml(snapshot.updatedAt)}. Public data may be delayed. This report is for research and education only; it is not a recommendation or an instruction to trade.</p><p class="footer">Sent by TapeScope from ${escapeHtml(sender)}. No brokerage connection or order execution is used.</p></body></html>`;
}

async function sendReport(snapshot: StockSnapshot, analysis: ScoutAnalysis) {
  const apiKey = runtime.env.AGENTMAIL_API_KEY;
  if (!apiKey) throw new Error("AgentMail is not configured");
  const generatedAt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", dateStyle: "medium", timeStyle: "short" }).format(new Date());
  const html = reportHtml(snapshot, analysis, `${generatedAt} Arizona`);
  const directory = mkdtempSync(join(tmpdir(), "tapescope-scout-"));
  const htmlPath = join(directory, "report.html");
  const pdfPath = join(directory, "report.pdf");
  try {
    await runtime.write(htmlPath, html);
    const rendered = runtime.spawnSync({ cmd: ["wkhtmltopdf", "--quiet", "--enable-local-file-access", htmlPath, pdfPath], stdout: "pipe", stderr: "pipe" });
    if (rendered.exitCode !== 0) throw new Error("Scout PDF renderer failed");
    const pdf = readFileSync(pdfPath);
    const inboxesResponse = await fetch("https://api.agentmail.to/v0/inboxes", { headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" } });
    if (!inboxesResponse.ok) throw new Error(`AgentMail inbox lookup returned ${inboxesResponse.status}`);
    const inboxPayload = await inboxesResponse.json() as { inboxes?: Array<{ inbox_id?: string }> };
    const inbox = inboxPayload.inboxes?.find((item) => item.inbox_id === sender)?.inbox_id;
    if (!inbox) throw new Error("TapeScope AgentMail inbox is not provisioned");
    const response = await fetch(`https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inbox)}/messages/send`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        to: [recipient],
        subject: `✅ TapeScope Scout — ${snapshot.symbol} deep analysis (${new Date().toISOString().slice(0, 10)})`,
        text: `TapeScope Scout analysis for ${snapshot.symbol}. Research only; no trade execution. The full report is in the attached PDF.`,
        html,
        attachments: [{ filename: `tapescope-scout-${snapshot.symbol.toLowerCase()}-report-${new Date().toISOString().slice(0, 10)}.pdf`, content: pdf.toString("base64"), content_type: "application/pdf" }]
      })
    });
    if (!response.ok) throw new Error(`AgentMail send returned ${response.status}`);
    return { recipient, sender };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function parseSnapshot(value: unknown): StockSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const known = fallbackStocks.find((stock) => stock.symbol === candidate.symbol);
  if (!known) return null;
  const numeric = (key: keyof StockSnapshot, fallback: number) => typeof candidate[key] === "number" && Number.isFinite(candidate[key]) ? candidate[key] as number : fallback;
  return {
    ...known,
    name: clean(candidate.name, known.name, 90),
    price: numeric("price", known.price),
    changePercent: numeric("changePercent", known.changePercent),
    volumeRatio: numeric("volumeRatio", known.volumeRatio),
    rsi: numeric("rsi", known.rsi),
    sma20: numeric("sma20", known.sma20),
    sma50: numeric("sma50", known.sma50),
    week52High: numeric("week52High", known.week52High),
    score: numeric("score", known.score),
    updatedAt: clean(candidate.updatedAt, known.updatedAt, 60),
    history: Array.isArray(candidate.history) ? candidate.history.filter((item): item is number => typeof item === "number" && Number.isFinite(item)).slice(-28) : known.history
  };
}

async function handleScout(request: Request) {
  if (request.method !== "POST") return json({ error: "POST required" }, 405);
  let body: { symbol?: unknown; snapshot?: unknown; dryRun?: unknown };
  try { body = await request.json() as { symbol?: unknown; snapshot?: unknown; dryRun?: unknown }; } catch { return json({ error: "Invalid JSON body" }, 400); }
  const symbol = typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() : "";
  const snapshot = parseSnapshot(body.snapshot);
  if (!symbol || !snapshot || snapshot.symbol !== symbol) return json({ error: "Unknown symbol" }, 400);
  if (rateLimited(request)) return json({ error: "Scout delivery is rate-limited to five requests per hour." }, 429);
  try {
    const analysis = await runScout(symbol, snapshot).catch(() => fallbackAnalysis(snapshot));
    if (body.dryRun === true) return json({ ok: true, dryRun: true, symbol, analysis });
    const delivery = await sendReport(snapshot, analysis);
    return json({ ok: true, symbol, delivery, message: `Deep analysis sent to ${delivery.recipient}.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scout delivery failed";
    return json({ error: message }, 502);
  }
}

runtime.serve({
  port,
  async fetch(request) {
    const requestPath = decodeURIComponent(new URL(request.url).pathname);
    if (requestPath === "/api/health") return json({ ok: true, service: "tapescope", sender });
    if (requestPath === "/api/scout") return handleScout(request);
    const candidate = normalize(join(root, requestPath));
    if (candidate.startsWith(root) && existsSync(candidate) && statSync(candidate).isFile()) {
      const file = runtime.file(candidate);
      const extension = candidate.slice(candidate.lastIndexOf("."));
      return new Response(file, { headers: { "content-type": contentTypes[extension] ?? "application/octet-stream" } });
    }
    const fallback = runtime.file(join(root, "index.html"));
    return new Response(fallback, { headers: { "content-type": contentTypes[".html"] } });
  }
});

console.log(`TapeScope serving on ${port}`);
