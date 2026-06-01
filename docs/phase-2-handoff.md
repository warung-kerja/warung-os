# Warung OS — Phase 2 Handoff

Date: 2026-06-01
Owner: Raz
Tech lead / QA: Mia
Build worker: Claude Code CLI
GitHub: https://github.com/warung-kerja/warung-os

## Status

Phase 2 (Data Contracts + Hermes Source Adapters) is complete and QA-passed locally.

All seven implementation tasks are done. The app reads real local data from four safe sources
while keeping fixture fallback for sources that are not yet connected.

## Phase 2 commits (local, pending GitHub push)

```text
760b612  feat: add TickTick board snapshot adapter
958f4da  feat: add Obsidian project snapshot adapter
537fb28  feat: collect Hermes cron and provider snapshot metadata
3b5dfb0  docs: add Warung OS worksession runbook
9d03041  feat: add Warung OS snapshot data boundary
```

Note: GitHub push is blocked by local HTTPS auth (`could not read Username for
'https://github.com': Device not configured`). Push requires SSH key or token setup
by Raz — see risks section.

## What Phase 2 added

### Data source boundary (`src/data/dataSource.tsx`, `src/data/snapshotLoader.ts`)

The app now loads `public/snapshots/latest.json` when present. If absent or malformed it
falls back to fixture data and labels Operations as `DATA SOURCE: FIXTURE FALLBACK`.

### Snapshot schema (`src/types/snapshot.ts`, `docs/snapshot-contract.md`)

`WarungSnapshot` typed contract defines all section shapes, safety rules (redaction,
Hermes-only scope), and adapter availability states.

### Snapshot generator (`scripts/generate-snapshot.mjs`)

`npm run snapshot:generate` produces `public/snapshots/latest.json` from five safe local
sources:

| Adapter | Source | Status |
|---------|--------|--------|
| `workspace_signal` | `git log`, `git status --porcelain` on warung-os repo | **Real** |
| `source_health` | `fs.stat` on snapshot file, Hermes cron/config, Obsidian dir, TickTick cache | **Real** |
| `cron_jobs` | `~/.hermes/profiles/tech-director/cron/jobs.json` (prompts/targets redacted) | **Real (sanitized)** |
| `hermes_model_health` | `~/.hermes/profiles/tech-director/config.yaml` (config metadata only, no live check) | **Partial** |
| `projects.items` | `03_Active_Projects/` YAML frontmatter only; folder paths redacted | **Real** |
| `projects.kanban_boards` | TickTick cache from `npm run ticktick:collect`; task descriptions excluded | **Real when populated** |

### TickTick collector (`scripts/collect-ticktick.py`)

`npm run ticktick:collect` reads the `Warung OS` TickTick board via Hermes MCP and writes
a sanitized cache to `~/.hermes/profiles/tech-director/cache/warung-os-ticktick-cache.json`.
Task descriptions and comments are excluded. The generator reads the cache; it never
handles TickTick credentials directly.

## QA evidence (2026-06-01)

```bash
npm run snapshot:generate
```

```text
source_mode: snapshot · scope: hermes-only · is_demo: false · profile: tech-director
Git signals:    ok  (branch: main, head: 760b612228b0, commits_24h: 8)
Cron jobs:      1 Hermes profile job(s) recorded (prompts/delivery targets omitted)
Model health:   2 config row(s) listed (no live health check)
Source health:  6 ok / 8 total
Obsidian projects: ok  (10 folder(s), 1 with frontmatter)
Projects in snapshot: 10
TickTick board: ok  (13 task(s), cache 2.07h old)
Duration:       138ms
```

```bash
npm run build
```

```text
vite v5.4.21 building for production...
✓ 39 modules transformed.
✓ built in 386ms
```

Dev server: started clean on port 5174 (5173 in use), no startup errors.

Secret scan: no API keys, OAuth tokens, service-role keys, or credential patterns found
in tracked source files or generated snapshot.

Privacy checks:
- `folder_path: null` on all 10 project items (Obsidian paths not exposed).
- Kanban task objects contain only: `id`, `title`, `column`, `column_id`, `priority`, `status`, `updated_at` — no descriptions or comments.
- Cron job objects contain sanitized scheduler metadata only (`id`, optional `agent`, `name`, `schedule`, `status`, `enabled`, model labels, run timestamps, duration/error summary, `synced_at`) — prompts, delivery targets, chat IDs, and raw cron prompt bodies omitted.
- `source_scope: "hermes-only"` in both `meta` and `operations`.

## Remaining unavailable adapters

These adapters are not connected. Their panel shows `—unavailable—` in Operations UI.

| Adapter | Blocker |
|---------|---------|
| `agent_token_daily` | Hermes log adapter not connected |
| `model_token_daily` | Hermes log adapter not connected |
| `tool_usage_daily` | Hermes log adapter not connected |
| `dot_delegation` | Live Hermes delegation tracker not connected |
| `team_members` | Static placeholder; live agent status adapter not connected |
| `wiki.entries` | Real from approved folder `05_1%_Journal/` only |

## Phase 2 limitations

- Model/provider health is config metadata only — no live API latency or availability check.
- Hermes token/usage data requires a Hermes log adapter (Phase 3 scope).
- Most Obsidian projects show `registry_status: "unstructured"` because they lack Project
  Home frontmatter. Adding frontmatter to each folder improves coverage.
- Wiki ingestion is approved only for `05_1%_Journal` unless Raz expands scope.
- Snapshot freshness: generated snapshots stay local-only/gitignored by default; only deliberately sanitized demo snapshots should ever be committed.

## Resolved Phase 3 decisions

- **Wiki ingestion scope:** approved source is `/Users/gabi/Documents/Warung Kerja 1.0/05_1%_Journal/` only unless Raz expands scope.
- **Snapshot policy:** generated snapshots stay local-only/gitignored by default; commit only deliberately sanitized demo snapshots if needed later.
- **Hermes profile scope:** Operations should cover Raz's Hermes environment across all Hermes profiles now/future, not OpenClaw.
- **Hosted direction:** prepare an eventual auth-gated hosted mirror pattern similar to Mission Control Online.

## Open decision for Raz

1. **GitHub push unblock:** HTTPS auth is broken locally (`could not read Username`). SSH
   key or personal access token needed to push Phase 2 commits to GitHub.

## Phase 3 handoff

Next phase targets real data integration for currently-unavailable adapters.

Candidates (all require Raz approval before connecting):

- Hermes log/usage adapter (token/model/tool usage).
- Live Hermes agent status adapter (team_members).
- Obsidian wiki ingestion (approved folders only).
- Dot/delegation tracker.

See `docs/phase-2-data-adapters-plan.md` and `docs/epic.md` for Phase 3 scope.

<!-- edited by Mia, 2026-06-01 -->
