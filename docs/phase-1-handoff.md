# Warung OS — Phase 1 Handoff

Date: 2026-05-31  
Owner: Raz  
Tech lead / QA: Mia  
Build worker: Claude Code CLI  
GitHub: https://github.com/warung-kerja/warung-os

## Status

Phase 1 is shipped as a local React/Vite/TypeScript MVP shell.

The current app is runnable locally and fixture-backed. It is not connected to live Hermes, TickTick, Obsidian, GitHub, or cron data yet.

## Verified artifact

Local workspace:

```text
/Users/gabi/Documents/warung-repo/warung-os
```

Remote repository:

```text
https://github.com/warung-kerja/warung-os
```

Current verified commits:

```text
8d9d905 Scope Operations data to Hermes agents
0beef88 Build Warung OS MVP shell
```

## What Phase 1 contains

- Four top-level pages:
  - Home / Daily Brief
  - Active Projects
  - Operations
  - Wiki
- Mission Control Online-inspired visual shell:
  - dark technical OS surface
  - strict grid
  - 1px hairlines
  - sharp rectangles
  - restrained orange signal
- Fixture-backed Operations parity sections:
  - agent token usage daily
  - model token burn daily
  - tool usage daily
  - cron/automation health
  - source freshness
  - sync runs and manual refresh requests
  - workspace/git signals
  - agent/team status
  - Hermes model/provider/fallback health
  - Dot/delegation status
- Placeholder approval/request-state actions only.

## QA evidence

Mia verified:

```bash
npm run build
```

Result:

```text
vite v5.4.21 building for production...
✓ 37 modules transformed.
✓ built in 366ms
```

Browser smoke test:

- local Vite page returned HTTP 200
- top-level tab switching worked
- Operations sub-tabs worked
- browser console showed no JavaScript errors
- secret-ish scan found no exposed API keys/tokens/passwords in tracked source files

## Important data caveat

All displayed data in Phase 1 is dummy fixture data from:

```text
src/data/fixtures.ts
```

Operations must remain scoped to Raz's Hermes agents/environment only. Do not mix in OpenClaw agents, OpenClaw token usage, OpenClaw cron jobs, or OpenClaw telemetry.

## Phase 1 limitations

- No real Hermes usage data yet.
- No live cron reader yet.
- No live TickTick ingestion yet.
- No Obsidian parser yet.
- No GitHub activity adapter yet.
- Approval buttons are UI state only.
- Manual refresh is a placeholder request pattern only.
- Wiki search is fixture-backed only.

## Phase 2 handoff

Next phase is Data Contracts + Hermes Source Adapters.

Primary goal: replace fixture-only Operations/Home/Project/Wiki data with read-only local snapshots generated from Raz's real Hermes environment and approved workspace sources.

See:

```text
docs/phase-2-data-adapters-plan.md
```

<!-- edited by Mia, 2026-05-31 -->
