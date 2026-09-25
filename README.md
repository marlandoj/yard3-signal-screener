# TapeScope

TapeScope is a one-screen, read-only stock screener prototype for HackYard Yard 3. It turns a focused watchlist into explainable signals so a trader can scan, inspect, and decide without leaving the screen.

## What is included

- Responsive one-screen workspace with ticker/company search, sector, minimum-score, and maximum-price filters.
- Transparent six-factor signal score: momentum, participation, 52-week proximity, trend confirmation, RSI health, and valuation context.
- Public delayed market-history adapter through Yahoo Finance's chart endpoint with a CORS relay, plus a timestamped deterministic reference feed when the network is unavailable.
- Read-only safety boundary: no orders, brokerage connection, portfolio mutation, or trade recommendation.
- Keyboard-accessible table rows, visible focus states, responsive layout, reduced-motion support, and a mobile stacked view.
- Unit coverage for score ordering, filtering, and sector leadership.

## Run locally

```bash
bun install
bun run dev
bun run check
bun run test
bun run build
```

The local dev server is configured for port `5183` in `zosite.json`.

## Data and safety

The live adapter requests six months of daily history for a 15-symbol liquid universe. The score is an educational ranking heuristic, not a prediction or investment advice. The interface labels delayed/reference data and keeps the fallback timestamp visible. A production brokerage integration is intentionally out of scope.

## HackYard Yard 3

The implementation was written as fresh code in this repository. A separately built screener was consulted only as a behavioral reference for familiar market-data concepts; no source files or assets from any other application were copied. The project is MIT licensed so the baseline source is public and reusable.

## Submission evidence

- Source: this repository
- Production build: `bun run build`
- Verification: `bun run check && bun run test && bun run build`
- Visual evidence: `evaluations/` after the production deployment check
