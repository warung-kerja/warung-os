# Warung OS — Hermes Adapter Modules

Standalone adapter modules for reading safe local Hermes metadata.

Each adapter can be run independently for debugging without regenerating the full snapshot:

```
node scripts/adapters/hermes-cron.mjs
node scripts/adapters/hermes-provider-health.mjs
```

`generate-snapshot.mjs` imports both adapters and passes the discovered profile list + `nowISO` timestamp.

---

## Available adapters

### hermes-dot-delegation.mjs

**Export:** `collectDotDelegation(profiles, nowISO) → { items: [], warning: string }`

**Status: unavailable** — no live Hermes delegation source defined.

Returns an empty array and a documented warning. No data is fabricated. Documents the source shape needed to connect a live delegation tracker when one becomes available.

### hermes-team-members.mjs

**Export:** `collectTeamMembers(profiles, nowISO) → { members: CanonicalTeamMember[], note: string }`

**Status: static placeholder** — no live Hermes agent status source defined.

Returns the known Warung Kerja core agent roster (Baro, Mia, Gabs, Obey) with fixed role/model metadata. Status and `current_task` reflect documented defaults, not live data. Documents the source shape needed once a live agent status adapter is available.

### hermes-cron.mjs

**Export:** `collectCronJobs(profiles, nowISO) → CronJobSnapshot[]`

Reads from each Hermes profile:
- `cron/jobs.json` — job names, schedules, enabled status, models, skills, `repeat.completed`
- `cron/output/<jobId>/` — filenames only (derives `run_count`, `recent_run_timestamps`)

Never reads: prompts, delivery targets, chat IDs, script contents, file contents of outputs.

### hermes-provider-health.mjs

**Export:** `collectProviderHealth(profiles, nowISO) → { modelHealth, gatewayStatus, providerCatalog }`

Reads from each Hermes profile:
- `config.yaml` — `model.default`, `model.provider`, `fallback_providers` names → `HermesModelHealth[]`
- `gateway_state.json` — `gateway_state`, `active_agents`, platform names/states → `HermesGatewayStatus[]`
- `provider_models_cache.json` — provider names, model counts, cache timestamps → `HermesProviderCatalogEntry[]`

Status reflects config metadata only — no live API health check or latency measurement is performed.
Never reads: API keys, OAuth tokens, credentials, session transcripts, delivery targets.

### hermes-session-activity.mjs

**Export:** `collectSessionActivity(profiles, nowISO) → { daily: SessionActivityDaily[], profileCount, rowCount }`

Reads from each Hermes profile's `state.db`:
- `sessions` table: `started_at`, `ended_at`, `source`, `model`, `message_count`, `tool_call_count`, `input_tokens`, `output_tokens`

Groups by `(day, source, model)` across all profiles (30-day window), then aggregates to `(day, source)` in JS, picking `primary_model` by highest session count. Computes weighted average session duration from `ended_at - started_at`.

Never reads: `title`, `system_prompt`, `model_config`, `handoff_state`, `handoff_error`, `billing_base_url`, `billing_mode`, `estimated_cost_usd`, `actual_cost_usd`, `cost_status`, `cost_source`, or `user_id`.

### hermes-tool-usage.mjs

**Export:** `collectToolUsage(profiles, nowISO) → { daily: ToolUsageDaily[], profileCount, rowCount }`

Reads from each Hermes profile's `state.db`:
- `messages` table: `tool_name`, `timestamp`, `token_count` — tool name, when it was called, token cost
- `sessions` table (JOIN): `model`, `source` — to group by model and execution context (cron/cli/telegram)

Groups by `(day, tool_name)` across all profiles. `input_tokens`, `output_tokens`, `cache_*_tokens` are always `0` — the messages table stores a single `token_count` per message, not split by direction.

Never reads: `content`, `tool_calls` (arguments), `reasoning`, `system_prompt`, `title`, or any credential/transcript field.

---

## Safety rules for all adapters

1. Read only from the approved safe source list (see `generate-snapshot.mjs` SAFETY CONTRACT header).
2. Return empty arrays or `status:'bad'` rows for missing/unreadable files. Never fabricate data.
3. Operations scope must remain `hermes-only` — never include OpenClaw agents or OpenClaw telemetry.
4. Absolute local paths must not appear in adapter output (redact before emitting).
5. No credentials, secrets, OAuth tokens, prompts, delivery targets, raw transcripts, or raw memory dumps.

---

## Adding a new adapter

1. Create `scripts/adapters/hermes-<name>.mjs` following the pattern above.
2. Export a single top-level function: `collect<Name>(profiles, nowISO) → <Shape>[]`
3. Add standalone execution block at the bottom (detect `process.argv[1] === __filename`).
4. Document the source files read, the safety contract, and unavailable conditions.
5. Import in `generate-snapshot.mjs` and add to the Run all collectors section.
6. Add a `source_health` entry in `collectSourceHealth()` for each new file source.

---

## Adapter status

| Adapter | Source files | Status |
|---|---|---|
| `hermes-cron.mjs` | `cron/jobs.json`, `cron/output/` filenames | Connected — real data |
| `hermes-provider-health.mjs` | `config.yaml`, `gateway_state.json`, `provider_models_cache.json` | Connected — config metadata only, no live API |
| token usage | `state.db` sessions table | Embedded in generator — real data |
| `hermes-tool-usage.mjs` | `state.db` messages table | Connected — tool_name + token_count, last 7 days; no input/output/cache split |
| `hermes-session-activity.mjs` | `state.db` sessions table | Connected — (day, source) aggregate: session_count, tool_call_total, avg_duration_s; 30-day window; no titles/prompts/content |
| `hermes-dot-delegation.mjs` | Hermes delegation tracker | Skeleton — unavailable; no live source defined |
| `hermes-team-members.mjs` | Hermes agent status | Static placeholder — no live source; documents connection boundary |
