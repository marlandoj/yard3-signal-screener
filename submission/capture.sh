#!/bin/bash
# Capture the TapeScope walkthrough frame sequence.
# Drives the real UI through agent-browser so every frame is genuine product state.
set -u
export PATH="$PATH:/root/.local/bin"
URL="https://yard3-signal-screener-live-marlandoj.zocomputer.io"
OUT="/home/workspace/Projects/yard3-signal-screener-live/submission/shots"
mkdir -p "$OUT"
rm -f "$OUT"/*.png

say() { echo "[capture] $*"; }
shot() { agent-browser screenshot "$OUT/$1.png" >/dev/null 2>&1 && say "shot $1"; }
# Click by aria-label substring; $1 = label, $2 = "all" to click every match.
tap() {
  local mode="${2:-one}"
  agent-browser eval "
    (() => {
      const nodes = [...document.querySelectorAll('button, [role=button], a, input, tr')];
      const hits = nodes.filter(n => ((n.getAttribute('aria-label')||'') + '|' + (n.textContent||'') + '|' + (n.id||'')).includes('$1'));
      if (!hits.length) return 'no-match:$1';
      (('$mode') === 'all' ? hits.slice(0,3) : [hits[0]]).forEach(n => n.click());
      return 'ok:' + hits.length;
    })()
  " 2>&1 | tail -1
}

say "open $URL"
agent-browser open "$URL" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 5
shot 01-opening

say "build a watchlist"
tap "Add NVDA to watchlist"; sleep 0.6
tap "Add AVGO to watchlist"; sleep 0.6
tap "Add AMD to watchlist"; sleep 1.2
shot 02-watchlist-stars

say "filter to the watchlist"
tap "Watchlist"; sleep 1.4
shot 03-watchlist-filter

say "reset, then sort by relative strength"
tap "Reset filters"; sleep 1.0
tap "Outperforming"; sleep 1.4
shot 04-relative-strength

say "inspect a signal"
tap "Inspect NVDA"; sleep 1.6
shot 05-methodology

say "scroll to the scenario planner"
agent-browser eval "document.querySelector('.detail-panel')?.scrollIntoView({block:'end',behavior:'instant'})" >/dev/null 2>&1
sleep 1.2
shot 06-scenario-planner

say "scout delivery panel"
agent-browser eval "document.querySelector('.scout-box')?.scrollIntoView({block:'center',behavior:'instant'})" >/dev/null 2>&1
sleep 1.2
shot 07-scout-delivery

say "cross-asset vehicles"
tap "Inspect AAPL"; sleep 1.2
agent-browser eval "document.querySelector('.vehicle-panel')?.scrollIntoView({block:'center',behavior:'instant'})" >/dev/null 2>&1
sleep 1.0
shot 08-vehicles

say "done"
ls -1 "$OUT"
