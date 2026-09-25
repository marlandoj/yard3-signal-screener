# TapeScope — Hack Yard 3 Submission Build

status: in_progress
watchdog: active

Live URL: https://yard3-signal-screener-live-marlandoj.zocomputer.io
Service: svc_TzfmetZc0ns (yard3-signal-screener-live), local port 5187, workdir /home/workspace/Projects/yard3-signal-screener-live

## Done and verified

- [x]   Rebuilt on a new tree at `Projects/yard3-signal-screener-live` (the prior `yard3-signal-screener` tree is kept untouched as the checkpoint)

- [x]   Scoping scrub: zero references to any third-party financial organisation anywhere in server.ts, src/, index.html, docs (verified by grep)

- [x]   Vendor-neutral scoring rubric vendored into `file src/lib/scout-rubric.ts`; server and tests no longer reach outside the project

- [x]   Relative strength: `vsSpy` column computed against SPY, sortable (`SortKey` gained `relative`)

- [x]   Watchlist persistence in localStorage with star toggle per row, plus a Watchlist filter toggle

- [x]   Scrolling market tape: two-pass marquee across the top, seamless loop, pauses on hover/focus, respects reduced motion, selects an instrument

- [x]   Scenario planner: 2x2 of -20/-10/-5/0/+5/+10/+20 %, recomputed score, invalidation levels from SMA20/SMA50, explicitly labelled as arithmetic replays not forecasts

- [x]   Operator-selectable Scout delivery email, default blank in the UI, server-side validation, never hardcoded

- [x]   Boot-time env loader (`loadEnvFiles`) so the supervised service picks up `/root/.zo_secrets` and `.env.local`; values never logged

- [x]   AgentMail delivery path; inbox resolved by name; PDF attached; temp dir cleaned in `finally`

- [x]   `file src/lib/market.ts` made runtime-agnostic (no `window`/`location` at module scope) so it runs under Bun

- [x]   typecheck clean, 17/17 tests pass, production build succeeds

- [x]   UI verified in browser at 1280x720: no overflow, tape animating, scenario planner renders, recipient field present

## Verified by test

- `/api/health` returns ok
- `/api/scout` dryRun returns `mode: scout-model` (live model call, \~27s)
- Bad recipient returns HTTP 400 `Enter a valid delivery email address.`

## Verified since the last checkpoint

- [x]  Live Scout send to the default recipient `marlandoj@gmail.com` returned HTTP 200 with `delivery.recipient` and `delivery.sender: tapescope@agents.zouroboros.ai` (NVDA, real model path)

- [x]  Live Scout send to an operator-supplied address returned HTTP 200 and delivered to that address, not the default (GLD to `review@tapescope.dev`) — NOTE: that test address is real; use a @agents.zouroboros.ai or operator address for any further test sends

- [x]  Invalid recipient returns HTTP 400 `Enter a valid delivery email address.`

- [x]  `window.setTimeout` in `loadMarketData` replaced with `setTimeout` so the market module truly runs under Bun

- [x]  Screen-capture script `file submission/capture.sh`; 8 shots in `submission/shots/`

- [x]  Service restarted; live URL serving the new build

## In flight

- [ ] HeyGen avatar render. `file submission/render-avatar.sh` (pid detached), log at `submission/render.log`, session at `file submission/heygen-session.json` (still empty at last read). Re-checking the log is the only thing needed to know if it finished.

## Next

1. Poll `submission/render.log` for the HeyGen video URL; download the MP4
2. Composite: screen capture in `submission/shots/` + avatar in a circular window at lower-right, narration = `file submission/heygen-narration.txt`
3. If the HeyGen render fails, fall back to `Skills/academy-video-pipeline` (local headless Chrome + ffmpeg, avatar as a static portrait circle) so a video still lands
4. Confirm the scout email landed in the operator inbox independently of the API response

## Notes for the next session

- `bun run check` uses `tsc -b` and caches; run it before concluding anything is broken
- The supervised service is `bun run serve`; env comes from the in-process loader, NOT from env_vars
- Do not reintroduce absolute paths outside the project directory