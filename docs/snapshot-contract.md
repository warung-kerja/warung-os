# Warung OS — Snapshot Contract

**Schema version:** `1`
**Updated:** 2026-05-31 (Task 5 — cron/provider health adapter)
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
  "projects":   { "items": [], "team_members": [] },
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

## Adapter status (as of Task 5)

| Adapter | Status | Data source |
|---------|--------|-------------|
| `workspace_signal` | **Real** | `git log`, `git status --porcelain` on warung-os repo |
| `source_health` | **Real** | `fs.stat` on snapshot, Hermes cron/config metadata files + `git status` on repo |
| `cron_jobs` | **Real (sanitized)** | Active Hermes profile `cron/jobs.json`; prompts, delivery targets, and chat IDs omitted |
| `hermes_model_health` | **Partial** | Active Hermes profile `config.yaml` model/provider metadata; no live API/latency check |
| `agent_token_daily` | Unavailable | Hermes log adapter not yet connected |
| `model_token_daily` | Unavailable | Hermes log adapter not yet connected |
| `tool_usage_daily` | Unavailable | Hermes log adapter not yet connected |
| `dot_delegation` | Unavailable | Live Hermes delegation tracker not yet connected |
| `team_members` (projects) | Static placeholder | Live Hermes agent status adapter not yet connected |
| `wiki.entries` | Unavailable | Obsidian adapter not yet connected |

When an adapter is unavailable, the generator writes an empty array or `null` and adds an entry to `adapter_warnings`. The UI shows `—unavailable—` in those panels. Never fabricate values.

---

## Gitignore policy

`public/snapshots/latest.json` is gitignored — generated locally, never committed.
`public/snapshots/.gitkeep` is tracked to preserve the directory in git.

To share a demo snapshot, commit it as `public/snapshots/demo.json` with `is_demo: true`
and document it clearly. Do not commit snapshots that contain real Hermes data.
