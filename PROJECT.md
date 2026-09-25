# TapeScope — Hackyard Yard #3

**Date:** 2026-09-25  
**Theme:** One Screen  
**Deadline:** 11:00 AM Arizona / 18:00 UTC  
**Status:** In progress

## Objective

Build a polished, public, single-screen stock-research screener that ranks a bounded market universe by transparent momentum, liquidity, volatility, and risk factors. The application is educational research tooling: it has no login, no brokerage connection, no order entry, and no buy/sell execution.

## Hackyard compliance

- Solo build using freely available AI tooling.
- Entire experience lives in one view; no routes, pages, or back navigation.
- Scrolling, filtering, selection, and in-place detail panels are allowed because they remain within the same view.
- All application source code is original and written after the Yard #3 kickoff on 2026-09-21.
- JHF is used only as a behavioral/product reference. No JHF source, credentials, private data, or production endpoint is copied.
- Final submission includes a public repository, public live demo, and demo video.

## Product

**TapeScope** is a one-screen market map with:

- A ranked, filterable candidate table.
- Transparent 0–100 opportunity scores and factor breakdowns.
- Market regime, breadth, freshness, and data-source status.
- A same-screen detail panel with catalyst context, technical trigger, invalidation, and risk notes.
- A live quote adapter with a bundled last-known snapshot fallback.
- CSV export and URL-shareable state without routing.
- Read-only research controls and visible data provenance.

## Acceptance criteria

- [ ] `npm run build` succeeds with zero TypeScript errors.
- [ ] Unit tests cover scoring, filters, and stale-data handling.
- [ ] The production build renders and works from a static host.
- [ ] No client route or second page exists.
- [ ] The full experience is usable at 1440×900 and 390×844.
- [ ] Keyboard, focus, contrast, and reduced-motion checks pass.
- [ ] Public repository and live deployment are verified.
- [ ] Demo video shows the core flow in under 60 seconds.

## Constraints

- Deadline is hard; ship the smallest credible complete product before optional expansion.
- The live-data adapter must fail visibly and safely rather than fabricate freshness.
- The bundled snapshot is labeled with its actual capture time.
- No financial account, secret, or private JHF dependency may enter the public repository.
