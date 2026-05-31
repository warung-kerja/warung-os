# Warung OS — Epic / Build Plan

## Current approved state

- Wireframe approved by Raz: `/Users/gabi/Documents/warung-repo/warung-os/wireframes/001-low-fi-warung-os/index.html`
- TickTick board created: `Warung OS` under `🏪Warung Kerja 1.0`
- Build worker: Claude Code CLI, launched by Mia with `HOME=/Users/gabi /Users/gabi/.local/bin/claude ...`

## Phase 0 — Foundation docs and kanban

Status: Done / in progress.

- Obsidian project docs updated.
- Repo PRD created.
- TickTick board created.
- Claude build prompt prepared.

## Phase 1 — Local app shell MVP

Status: In build.

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

Deliverables:

- Formal TypeScript contracts for fixture data.
- Adapter boundaries for Obsidian, TickTick, Hermes health, local git/workspaces, and wiki/journal notes.
- Document source freshness rules.

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

- GitHub push is pending `gh` auth / repo creation approval.
- Scope can balloon; keep first build fixture-backed and local.
- Operations parity is important; do not reduce it to a tiny health card.
- No secrets or raw transcripts may be exposed.
