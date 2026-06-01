# Warung OS — Snapshot Contract

**Schema version:** `1`
**Updated:** 2026-06-01 (Task 8 — Phase 2 QA and handoff)
**Owner:** Mia (tech lead)

---

## Overview

`/snapshots/latest.json` is the local JSON file produced by `npm run snapshot:generate`.
The browser app reads it on load. If the file is absent or malformed, the app falls back to
TypeScript fixture data automatically and shows `DATA SOURCE: FIXTURE FALLBACK` in Operations.

The snapshot contract is typed in `src/types/snapshot.ts`.

---

## Top-level structure

```json
{
  "meta":       { ... },
  "home":       { "daily_brief": [], "approvals": [] },
  "projects":   { "items": [], "team_members": [], "kanban_boards": [] },
  "operations": { "source_scope": "hermes-only", ... },
  "wiki":       { "entries": [] }
}
```

---

## meta

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `schema_version` | `"1"` | yes | Validated on load; reject if wrong |
| `source_mode` | `"fixture" \| "snapshot"` | yes | Shown as DATA SOURCE label in Operations |
| `generated_at` | ISO 8601 string | yes | When the generator ran |
| `source_scope` | `"hermes-only" \| "fixture"` | yes | `"hermes-only"` when real Hermes data |
| `profile` | string \| null | yes | Hermes profile name, or null for fixture |
| `warnings` | string[] | yes | Human-readable warnings shown in Operations |
| `redactions_applied` | boolean | yes | True if any values were redacted |
| `is_demo` | boolean | yes | True for fixture-backed / demo snapshots |
| `adapter_warnings` | Record<string, string> | yes | Per-adapter availability notes |

---

## operations

**Critical constraint:** `source_scope` in `operations` MUST be `"hermes-only"`. Do not include
OpenClaw agents, OpenClaw token usage, OpenClaw cron jobs, or OpenClaw telemetry.

Fields that may be empty when the adapter is not connected:

| Field | Empty state | Label shown |
|-------|-------------|-------------|
| `agent_token_daily` | `[]` | —unavailable— in usage panels |
| `model_token_daily` | `[]` | —unavailable— in usage panels |
| `tool_usage_daily` | `[]` | —unavailable— in usage panels |
| `workspace_signal` | `null` | "Git signals unavailable" in Workspace tab |
| `dot_delegation` | `[]` | Empty table — no fabricated values |

Fields that should always have a value when a snapshot is live:

| Field | Notes |
|-------|-------|
| `cron_jobs` | At minimum include the snapshot generator itself |
| `source_health` | Include adapter health rows with `status: "bad"` for disconnected adapters |
| `sync_runs` | Include the current snapshot generation run |
| `hermes_model_health` | At least the primary model |

---

## Freshness and staleness

The browser treats any loaded snapshot as `freshness: 'fresh'`.
Future: add a `max_age_minutes` field so the UI can show `DATA SOURCE: STALE` when a snapshot
is older than the threshold.

---

## Safety rules for generators

- Never write raw session transcripts, raw memories, or secret config values.
- Never include API keys, OAuth tokens, service-role keys, or Supabase credentials.
- Redact any value matching the pattern `/sk-[a-zA-Z0-9]{20,}/` or similar.
- If a data source is unavailable, write an explicit unavailable/warning state — do not fabricate values.
- Set `is_demo: true` for any fixture-backed or test snapshot.

---

## Local paths

| Artifact | Path |
|----------|------|
| Snapshot file | `public/snapshots/latest.json` |
| Generator script | `scripts/generate-snapshot.mjs` |
| Schema types | `src/types/snapshot.ts` |
| Snapshot loader | `src/data/snapshotLoader.ts` |
| Data source boundary | `src/data/dataSource.tsx` |

---

## Adapter status (as of Task 8 — Phase 2 complete)

| Adapter | Status | Data source |
|---------|--------|-------------|
| `workspace_signal` | **Real** | `git log`, `git status --porcelain` on warung-os repo |
| `source_health` | **Real** | `fs.stat` on snapshot, Hermes cron/config files, Obsidian projects dir, TickTick cache file + `git status` |
| `cron_jobs` | **Real (sanitized)** | Active Hermes profile `cron/jobs.json`; prompts, delivery targets, and chat IDs omitted |
| `hermes_model_health` | **Partial** | Active Hermes profile `config.yaml` model/provider metadata; no live API/latency check |
| `projects.items` | **Real (frontmatter only)** | `03_Active_Projects/` folder scan; YAML frontmatter parsed; folder paths redacted; body not read |
| `projects.kanban_boards` | **Real when cache populated** | `scripts/collect-ticktick.py` writes cache to Hermes profile; generator reads it. Task titles, columns, priorities only — no descriptions or comments. Run `npm run ticktick:collect` first. |
| `agent_token_daily` | Unavailable | Hermes log adapter not yet connected |
| `model_token_daily` | Unavailable | Hermes log adapter not yet connected |
| `tool_usage_daily` | Unavailable | Hermes log adapter not yet connected |
| `dot_delegation` | Unavailable | Live Hermes delegation tracker not yet connected |
| `team_members` (projects) | Static placeholder | Live Hermes agent status adapter not yet connected |
| `wiki.entries` | Unavailable | Scope/folders not yet approved by Raz |

### projects.kanban_boards adapter detail

- Populated by running `npm run ticktick:collect` (`scripts/collect-ticktick.py`).
- The generator reads the cache file at `~/.hermes/profiles/tech-director/cache/warung-os-ticktick-cache.json`.
- The generator **never** reads TickTick credentials directly — credentials stay inside the Python/Hermes layer.
- Fields collected per task: `id`, `title`, `column`, `column_id`, `priority`, `status`, `updated_at`.
- Fields deliberately excluded: task description, comments, attachments, personal notes.
- Board in scope: `Warung OS` TickTick project only. Additional boards require explicit Raz approval.
- Cache age is included in each board row and in the `sh-ticktick-cache` source health row.
- If cache is absent: `kanban_boards: []`, source health row `status: "bad"`, adapter warning included.
- If cache is stale (> 24h): source health row `status: "warn"`.
- `is_demo: false` — cache contains real board state when populated.

### projects.items adapter detail

- Scans `~/Documents/Warung Kerja 1.0/03_Active_Projects/` — approved folder only.
- Skips `_Archive`, `_Work Queue`, `_registry`, and any folder prefixed with `_`.
- For each project folder, reads ONLY the YAML frontmatter of the first "Project Home" `.md` file found (falls back to first `.md` alphabetically).
- Fields extracted: `project` (name), `status`, `owner`, `created`, `updated`. No body content read.
- Projects without frontmatter: `registry_status: "unstructured"`, `status: "unknown"`.
- `folder_path` is always `null` — Obsidian vault absolute paths are not exposed in snapshots.
- `warung-os` is additionally enriched with `source_root` and git-derived timestamps.

When an adapter is unavailable, the generator writes an empty array or `null` and adds an entry to `adapter_warnings`. The UI shows `—unavailable—` in those panels. Never fabricate values.

---

## Gitignore policy

`public/snapshots/latest.json` is gitignored — generated locally, never committed.
`public/snapshots/.gitkeep` is tracked to preserve the directory in git.

`~/.hermes/profiles/tech-director/cache/warung-os-ticktick-cache.json` lives outside the
repo in the Hermes profile cache directory and is never committed.

To share a demo snapshot, commit it as `public/snapshots/demo.json` with `is_demo: true`
and document it clearly. Do not commit snapshots that contain real Hermes data.
