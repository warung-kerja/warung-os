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

## Phase 5 — Hosted mirror

Status: Frozen / parked as of 2026-06-05. P5.1-P5.4 fail-closed hosted readiness is complete and the public/no-auth Vercel mirror remains live, but Raz asked to stop Phase 5 work for now and move back to the core product MVP. Plan archive: `docs/phase-5-hosted-mirror-plan.md`.

Completed readiness slices:

- P5.1 local hosted export package with safety manifest.
- P5.2 frontend data-source boundary for local/prepared/remote snapshots plus unavailable/auth/stale states.
- P5.3 Supabase/Vercel config templates with no real credentials.
- P5.4 local publisher bridge that defaults to dry-run and requires `.env.publish` + `--upload` for any real upload.

Frozen boundary:

- Keep the current public/no-auth hosted mirror live.
- Keep the snapshot/export/publisher path fail-closed and documented for later.
- Do not continue auth/RLS, private deployment, Supabase, Vercel, or publisher work unless Raz explicitly reopens Phase 5.
- Local bridge only writes curated snapshots and must not expose service-role keys to frontend/Vercel.


## Active post-Phase-5 plan — Core product MVP

Status: Active after Raz froze Phase 5 on 2026-06-05.

Priority order:

1. **Morning Brief MVP** — make Home genuinely useful: last-24h recap, blockers, moved projects, approvals, system concerns, and suggested focus.
2. **Project source-of-truth** — decide and document whether Obsidian, TickTick, Warung OS snapshot data, or a future DB owns each project-status field.
3. **Active Projects coverage** — add structured frontmatter/metadata to the wider Obsidian project set and keep TickTick board data as execution signal.
4. **Gabs visual polish** — refine Mission Control-inspired visual system after functional flows are stable.
5. **Safe team/delegation sources** — replace static team/Dot placeholders only when a safe Hermes live source exists.

## Risks / constraints

- Scope can balloon; Phase 2 must start with read-only snapshot adapters and keep fixture fallback.
- Operations parity is important; do not reduce it to a tiny health card.
- Operations data must be Hermes-only; do not mix in OpenClaw agents, token usage, cron jobs, or telemetry.
- No secrets or raw transcripts may be exposed.
- Write paths stay request-state/audited until Raz explicitly approves real actions.
