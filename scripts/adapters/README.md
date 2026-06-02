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
| dot delegation | Hermes delegation tracker | Unavailable — live source not yet defined |
| agent status | Hermes agent status | Placeholder only — live source not yet defined |
