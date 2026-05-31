# Warung OS — Phase 1 MVP Shell

Local React + Vite + TypeScript operating surface for Warung Kerja.

## Commands

```bash
npm install       # install dependencies
npm run dev       # dev server at http://localhost:5173
npm run build     # production build (tsc + vite)
npm run preview   # preview production build
```

## Structure

```
src/
  App.tsx                      page state root
  main.tsx                     React entry
  styles.css                   design tokens + all component styles
  types/warung-os.ts           TypeScript contracts (MC Online compatible)
  data/fixtures.ts             all fixture data
  components/
    Shell.tsx                  topbar + sidebar nav + rail (context-sensitive)
    HomePage.tsx               Daily Brief — metrics, recap, focus, approvals
    ActiveProjectsPage.tsx     Project list + detail + approval module
    OperationsPage.tsx         6-tab ops surface (all 10 data categories)
    WikiPage.tsx               search/browse + detail reader
```

## Operations page coverage

All 10 Mission Control Online data/report categories are present:

| Tab | Categories |
|-----|-----------|
| Overview | Automation timeline, latest sync run, cron summary |
| Usage | Agent token usage daily, model token burn daily, tool usage daily |
| Automation | Cron job health table (last/next run, duration, error) |
| Sources | Source health/freshness, sync runs, manual refresh |
| Workspace | Git signals, recent commits, file churn |
| Agents | Team/agent status, Hermes model health, dot/delegation status |

## Design

Mission Control Online operating surface:
- Dark technical OS surface (`#0d0f13` bg)
- Flat fills, 1px hairline rules, strict grid
- Sharp rectangles — no rounded panels, no glassmorphism
- Orange (`#f17450`) as signal only — never decorative
- Mono labels: uppercase, 0.06em tracking, `ui-monospace` stack

## Data

All data is fixture-backed. No live API calls, no secrets, no write actions.

TypeScript contracts in `src/types/warung-os.ts` are adapted from Mission Control Online's
`supabase.ts` contracts — same field names and shapes so real adapters can replace fixtures
in Phase 2 with minimal refactoring.

## Limitations (Phase 1)

- No live data: all content is from `src/data/fixtures.ts`
- No authentication
- No Supabase / external services
- Approval buttons are UI state only — no write actions
- Manual refresh is a placeholder — no actual sync triggered
- Wiki search is client-side over fixture data only
- AI/RAG wiki assistant deferred to Phase 2
- Charts are CSS-only (no charting library)

## Phase 2 targets

- Adapter boundaries for Obsidian, TickTick, Hermes, and git sources
- Real cron/token/tool data collectors
- SyncRequest write path
- Hosted snapshot mirror (optional, auth-gated)
