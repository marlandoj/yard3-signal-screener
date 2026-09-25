# HackYard Yard 3 — TapeScope Submission

**Project:** TapeScope — explainable cross-asset stock screener
**Repo:** https://github.com/marlandoj/yard3-signal-screener
**Demo (live):** https://yard3-signal-screener-live-marlandoj.zocomputer.io
**Walkthrough video:** https://github.com/marlandoj/yard3-signal-screener/raw/main/submission/tapescope-walkthrough.mp4
**Screenshot gallery (public):** https://marlandoj.zo.space/tapescope
(`file submission/tapescope-walkthrough.mp4` · 140 s · 1080p · 13.0 MB)

---

## 1. What it is

A screener that ranks a universe on a single transparent composite score and shows
**why** every symbol ranks where it does. No black box, no order placement.

Core loop: build a watchlist → filter the universe to it → sort by composite score →
open any row to see the per-factor contribution and the scenario planner.

## 2. Feature set (shipped)

| Capability | Behaviour |
| --- | --- |
| Screener table | Sortable, filterable across the 6-month daily-bar universe |
| Composite score | Weighted momentum, trend, liquidity and volatility factors, each shown as its own contribution bar |
| Relative strength | Every symbol scored against a chosen benchmark (default SPY) so "strong" is measured, not asserted |
| Watchlist persistence | Watchlists survive reloads; add or remove a symbol inline from any row |
| Scenario planner | Per-symbol entry/stop/target with position sizing and max-loss shown before you commit to a view |
| Scout deep analysis | On-demand research memo from an AI model, **emailed to any address the operator types** — no fixed recipient |
| No-trade by design | The app reads market data and writes nothing to any broker. There is no order path in the codebase. |

Every screen states its data provenance and as-of timestamp. A stale or failed feed
degrades to a labelled "no data" state rather than a fabricated number.

## 3. Compliance posture

- **Read-only.** No broker integration, no order endpoint, no credential for any
  trading account exists in this repository.
- **No affiliation.** This project is original work. It shares no code, no data
  pipeline and no branding with any existing platform, and contains no references
  to any third-party financial organisation.
- **Not investment advice.** Scenario output is arithmetic on user-supplied inputs.
- **Data.** Daily OHLCV bars from the Yahoo Finance chart API (6-month daily
  interval), fetched through a CORS proxy, cached client-side, with the as-of date
  displayed on every view.

## 4. Architecture

```markdown
src/App.tsx        320 lines   React UI: screener table, row detail, scenario planner, scout
src/lib/market.ts  332 lines   fetch, cache, normalise, 6mo daily series
src/lib/analysis.ts 86 lines   factor computation, composite score, relative strength
src/lib/scout-rubric.ts       prompt rubric for the deep-analysis memo
server.ts          291 lines   Bun HTTP server: static SPA + /api/scout + /api/scout/send
src/lib/*.test.ts            Vitest suites for market and analysis logic
```

Scoring is deterministic and unit-tested. The only model call in the system is the
optional Scout memo, which is a bounded, rate-limited request that produces prose —
it never touches the score, the ranking, or any numeric field on screen.

## 5. Build & run

```bash
bun install
bun run dev        # local dev
bun run check      # tsc -b, must be clean
bun run test       # vitest run
bun run build      # tsc -b && scripts/build.ts
bun run serve      # production server
```

Environment: `ZO_API_BASE` / a Zo API key for the Scout memo, `AGENTMAIL_API_KEY`
and `SCOUT_INBOX` for report delivery. Both are optional — the screener itself runs
fully without them.

## 6. Tooling and model stack used to build it

| Layer | Tool |
| --- | --- |
| Agent harness | Claude Code (Opus 4.5) on Zo Computer, persona **Alaric · Deep** |
| Routing | `tier-resolver` model-route gate (silent tier adaptation) and swarm decision gate (scored this build **DIRECT/SUGGEST**, so it ran inline rather than as a swarm) |
| Build / runtime | Bun 1.x, Vite 8, React 19, TypeScript 7 (`tsc -b`), Vitest 5, lucide-react |
| Hosting | Zo managed user service (public HTTP, port 5187, supervised, auto-restart) |
| Browser capture | `agent-browser` CLI driving the **live** URL — every video frame is real product state, not a mockup |
| Narration | HeyGen — script authored, TTS voice rendered, 8 scene clips muxed to the capture |
| Video assembly | Python (`file submission/build-video-avatar.py`) + ffmpeg/ffprobe for Ken Burns motion, lip-synced avatar panel, A/V drift check (final drift 0.03 s over 140 s) |

### Video composition disclosure

The first render attempt failed with `MOVIO_PAYMENT_INSUFFICIENT_CREDIT` — the HeyGen
wallet had no API credit available at the moment of submission, and the local 40-minute
`--wait` expired before the terminal status was read, so the log reported a timeout
rather than the real cause. The wallet was recharged and the render re-run.

The walkthrough now composites a **lip-synced talking-head avatar** (lower right,
ring-bordered, captioned) over the live capture, driven by the HeyGen voiceover.
Avatar: `bc40317a44b445029f2c123a83be197a` ("Marlando the podcast host").
Voice: `01528fb7edde4be7b224a1a145b0be34` ("Kevin Jackson", private clone).
Scene cuts land on the silences detected in the rendered audio, so every caption
changes on a spoken beat.

## 7. Verification performed

- `bun run check` — clean, no TypeScript errors
- `bun run test` — passing (market + analysis suites)
- `bun run build` — production build succeeds
- Live URL exercised end to end: watchlist add/remove, watchlist filter, benchmark
  switch, row detail, scenario planner, Scout memo with operator-supplied recipient
- Responsive check at mobile width
- Reference sweep: zero matches for third-party platform names, brands, domains or
  code identifiers anywhere in the repository