# TapeScope polish task

## Objective
Polish the existing TapeScope Yard #3 screener into a single-screen cross-asset research desk.

## Requested capabilities
- Preserve the responsive web UI and existing read-only guardrails.
- Keep or improve the scrolling market tape across equities, ETFs, bonds, REITs, and commodities.
- Make the cross-asset vehicle summary useful in one pane.
- Add a Bloomberg-terminal-inspired information hierarchy without copying proprietary branding or code.
- Integrate the governed strategy-scout rubric and the market snapshot data already collected by the screener.
- Allow an operator-triggered, case-specific Scout memo to be delivered from `tapescope@agents.zouroboros.ai` with an HTML body and PDF attachment.
- Never place trades, infer missing news, expose credentials, or send analysis without an explicit user action/approval.

## Acceptance criteria
- Existing tests, typecheck, and production build pass.
- Scout has a visible evidence/sources panel and a clear fallback when live data or credentials are unavailable.
- Email delivery is fail-closed, rate-limited, and reports a receipt or actionable error.
- Public UI clearly labels delayed data and research-only scope.
- No orphaned capability: the UI action calls the endpoint and the endpoint's delivery path is documented.
