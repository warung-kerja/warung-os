# Warung OS — Epic / Build Plan

## Current approved state

- Wireframe approved by Raz: `/Users/gabi/Documents/warung-repo/warung-os/wireframes/001-low-fi-warung-os/index.html`
- TickTick board created: `Warung OS` under `🏪Warung Kerja 1.0`
- Phase 1 app shell built, QA'd, committed, and pushed.
- GitHub repo: https://github.com/warung-kerja/warung-os
- Build worker: Claude Code CLI, launched by Mia with `HOME=/Users/gabi /Users/gabi/.local/bin/claude ...`

## Phase 0 — Foundation docs and kanban

Status: Done.

- Obsidian project docs updated.
- Repo PRD created.
- TickTick board created.
- Claude build prompt prepared.

## Phase 1 — Local app shell MVP

Status: Done / QA passed / pushed to GitHub.

Deliverables:

- React/Vite/TypeScript local app.
- Four tabs/pages: Home, Active Projects, Operations, Wiki.
- Mission Control-inspired visual shell.
- Fixture-backed useful data.
- README with commands.
- Build validation.

Acceptance:

- `npm install` succeeds.
- `npm run build` succeeds.
- Browser smoke test shows all four pages and tab switching.
- Operations page visibly includes Mission Control Online-style data/report categories.

## Phase 2 — Data contracts and source adapters

Status: Active next phase.

Plan: `docs/phase-2-data-adapters-plan.md`

Deliverables:

- Add a data-source boundary between UI components and fixture/snapshot data.
- Formalize sanitized `WarungSnapshot` contracts.
- Add fixture fallback plus local snapshot loading.
- Build local snapshot collector skeleton.
- Add Hermes-only cron/provider/usage source adapters where safely available.
- Add Obsidian project tracker and TickTick board source adapters.
- Document source freshness rules and unavailable/stale states.
- Keep Operations scoped to Hermes agents/environment only; exclude OpenClaw telemetry.

## Phase 3 — Real data integration

Deliverables:

- Read-only local ingestion from approved sources.
- Snapshot files or local API depending on chosen architecture.
- Manual refresh request model.

## Phase 4 — Approvals and audit trail

Deliverables:

- Approval request records.
- Approve/reject/request-changes state handling.
- Audit log UX.
- No direct external publishing or messaging without Raz approval.

## Phase 5 — Hosted mirror, if approved

Deliverables:

- Secure hosted snapshot mirror, likely Mission Control Online-style Supabase/Vercel pattern.
- Auth and RLS.
- Local bridge only writes curated snapshots.

## Risks / constraints

- Scope can balloon; Phase 2 must start with read-only snapshot adapters and keep fixture fallback.
- Operations parity is important; do not reduce it to a tiny health card.
- Operations data must be Hermes-only; do not mix in OpenClaw agents, token usage, cron jobs, or telemetry.
- No secrets or raw transcripts may be exposed.
- Write paths stay request-state/audited until Raz explicitly approves real actions.
