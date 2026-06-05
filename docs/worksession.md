# Warung OS — Worksession Runbook

Purpose: project-local runbook for Mia's recurring 2-hour work-session dispatcher.

## Project

Warung OS

## Current priority

Core product MVP — Phase 5 frozen / parked.

Current state: Phase 5 hosted/auth work is frozen as of Raz's 2026-06-05 direction. Keep the live public/no-auth mirror at `https://warung-os-online.vercel.app` and preserve the safe snapshot/export/publisher boundary, but do not continue auth, Supabase, Vercel, deployment, or publisher work unless Raz explicitly reopens Phase 5. Operations Usage and Sources now have safe Hermes aggregate/session/source-health coverage; next work returns to product usefulness.

Next slice: Obsidian frontmatter seeding — Raz to add `status:` and `priority:` YAML frontmatter to Obsidian project notes so the Active Projects list can show real statuses (currently 12/13 are `unknown`). Alternatively: explore Gabs visual polish pass (typography, spacing, grid refinements on existing pages) or expand Home / Morning Brief with week-level activity summary.

**Active Projects source-of-truth pass completed (2026-06-05):** surfaced TickTick board status more prominently in Active Projects list view using only existing snapshot fields. Changes: (1) `statusTag` now renders `status === 'unknown'` as a dim "No data" tag (distinguishable from genuine status values); (2) new `BoardBadge` component — shown in the status column of each list row when a TickTick board matches by project name (case-insensitive), displaying active-column task count in signal orange or total task count in muted tone when no active tasks; (3) `boardByName` Map built once from `kanbanBoards` for O(1) per-row lookup; (4) frontmatter completeness notice rendered above the project table when any project has no Obsidian status (shows "N/M no frontmatter" + actionable guidance to add `status:` and `priority:` fields; also shows "Some projects tracked." in ok-green when partial coverage exists); (5) column header updated to "Status · Board" to signal dual content. No new data sources, snapshot fields, or adapters. QA passed: `npm run snapshot:generate` (13 projects, 1 board matched), `npm run build` (tsc+vite clean). Backward compatible: `boardByName.get()` returns `undefined` for unmatched projects; notice hidden when `unknownCount === 0`; fixture mode has no boards so badge is not rendered.

**Morning Brief MVP usefulness pass completed (2026-06-05):** replaced all hardcoded metrics and stale copy in `src/components/HomePage.tsx` with real derived signals from existing snapshot data. Changes: (1) `runsSucceeded` now counts enabled cron jobs that have output files (`run_count > 0`), with note showing "N of M enabled jobs · 30d"; (2) `blocked` now counts `status === 'blocked'` projects + `status === 'bad'` source health rows; (3) `movedProjects` now filters by non-terminal statuses (excludes archived/done/cancelled — generator already skips `_Archive` folders so all 12 Obsidian projects pass); (4) all metric notes replaced with derived values (real project names, cron job counts, blocker labels, first pending approval title); (5) "Today's suggested focus" headline and body are now dynamically derived: pending approvals → approval queue prompt, blocked projects → unblock prompt, bad sources → source health prompt, otherwise healthy message; (6) added an ops health strip between metrics and brief layout showing SOURCES ok/warn/bad counts, CRON jobs ran/total + error count, SESSIONS most-recent-day session count, and snapshot generation time (right-aligned). Strip is hidden in fixture mode when both `sourceHealth` and `cronJobs` are empty. No new snapshot fields, adapters, or raw data reads. QA passed: `npm run snapshot:generate` (12 projects tracked, 11/12 cron jobs ran, 0 blocked, 21 ok / 6 warn sources, 2 sessions on 2026-06-05), `npm run build` (tsc+vite clean). Live snapshot metrics render correctly: movedProjects=12, runsSucceeded=11, blocked=0, razAttention=0. Focus headline: "Workspace is healthy. Keep the momentum." Backward compatible: all fields have `?? []` or empty-fallbacks; fixture data still renders in fallback mode.

**Source Health status filter slice completed (2026-06-05):** added `SourceFilter` type (`'all' | 'issues' | 'ok'`) and `useState<SourceFilter>('all')` to `SourcesTab` in `src/components/OperationsPage.tsx`. Three filter buttons (all·N / warn+bad·N / ok·N) rendered between the `SourceHealthDetailPanel` summary and the full table; active button styled with signal-orange border/text using existing `.btn .btn--sm` + `.btn--ghost` classes. `filteredRows` derived value drives table output; empty-filter state renders a single "No rows match filter." row spanning all columns. `SourceHealthDetailPanel` summary panel above is unchanged — always shows full counts. No new adapters, snapshot fields, or raw data reads added. QA passed: `npm run snapshot:generate` (27 source_health rows, 20 ok / 7 warn), `npm run snapshot:prepare-hosted`, `npm run hosted:publish:dry-run`, `npm run build` (tsc+vite clean), `npm run hosted:preflight` (local snapshot pipeline ready). Backward compatible: no snapshot changes; filter state is session-only.

**Source Health detail panel slice completed (2026-06-05):** added `SourceHealthDetailPanel` to `src/components/OperationsPage.tsx` and rendered it above the existing Operations → Sources table. It groups existing `source_health` rows into ok/warn/bad counts and lists warn/bad sources first, including only existing safe fields (`label`, `status`, `error`). No new adapters, snapshot fields, or raw data reads were added. QA passed: snapshot privacy/key inspection confirmed 27 source_health rows (20 ok / 7 warn) with keys limited to `age_hours`, `error`, `exists`, `id`, `label`, `modified_at`, `readable`, `source_type`, `status`, `synced_at` and no forbidden prompt/content/credential fields. Validation passed: `npm run snapshot:generate`, `npm run snapshot:prepare-hosted`, `npm run hosted:publish:dry-run`, `npm run build`, `npm run hosted:preflight`, and browser smoke on Operations → Sources with a clean console.

**Session hourly heatmap slice completed (2026-06-04):** extended `scripts/adapters/hermes-session-activity.mjs` with a safe per-hour SQL grouping over the last 30 days. It reads only `started_at`, aggregate message/tool counts, and aggregate token totals from Hermes `state.db` sessions tables, then emits `session_activity_hourly` as hour buckets (`hour`, `session_count`, `message_total`, `tool_call_total`, `total_tokens`) with no titles, prompts, transcripts/content, credentials, comments, or secret-bearing fields. Operations → Usage now renders `Sessions by hour of day · 30d window · local time` inside the existing session activity feed. QA passed: standalone adapter run (24 hourly buckets), snapshot privacy/key inspection, `npm run snapshot:generate`, `npm run snapshot:prepare-hosted`, `npm run hosted:publish:dry-run`, `npm run build`, `npm run hosted:preflight`, and browser smoke on Operations → Usage with a clean console. Backward compatible: optional snapshot field and empty fixture fallback.

**UsageTab per-profile token usage slice completed (2026-06-04):** added a `Token usage by profile · 30d window · Hermes state.db` section to `UsageTab` in `src/components/OperationsPage.tsx`. It reuses existing `sessionActivityByProfile` aggregate data only — profile folder name, 30-day token total, session count, and derived average tokens/session — with no new snapshot fields or adapter reads. QA passed: snapshot privacy inspection confirmed 3 profile summaries and no forbidden prompt/content/credential keys; browser smoke confirmed the Operations → Usage section renders the by-profile chart/detail table with a clean console; `npm run snapshot:generate`, `npm run snapshot:prepare-hosted`, `npm run hosted:publish:dry-run`, `npm run build`, and `npm run hosted:preflight` all passed. Backward compatible: section is hidden when `sessionActivityByProfile` is empty.

**Session activity per-profile breakdown slice completed (2026-06-04):** added `SessionActivityByProfile` type to `src/types/warung-os.ts` — per-profile window summary (session_count, message_total, tool_call_total, total_tokens, primary_source, primary_model, active_days, first/last_active_day). Added optional `session_activity_by_profile` field to `OperationsSnapshot` and `sessionActivityByProfile` to `WarungData` in `src/types/snapshot.ts`. Extended `scripts/adapters/hermes-session-activity.mjs` `collectSessionActivity()` to also compute `byProfile` — aggregates raw rows by profile, tracks source/model counters and day sets, elects primary_source and primary_model by session_count, sorts descending by session_count. Wired into `scripts/generate-snapshot.mjs` (new `session_activity_by_profile` field in snapshot output, updated adapter warning message to include byProfile count). Updated `src/data/dataSource.tsx` to map `session_activity_by_profile ?? []` → `sessionActivityByProfile` (both snapshotToData and buildFixtureData). Updated `ActivityFeedPanel` in `src/components/OperationsPage.tsx` — signature accepts `byProfile`, renders a second grid row with HBarRow chart (sessions by profile, 30d) and a detail table (profile / sessions / active days / primary source) when byProfile is non-empty. Privacy boundary maintained: only profile folder names (non-secret), aggregate integer counts, and model/source label strings surfaced — no content, titles, prompts, or credentials. QA passed: `tsc+vite build` clean, `npm run snapshot:generate` (3 profile summaries: default/108 sessions, tech-director/96, general-assistant/5), `npm run snapshot:prepare-hosted`, `npm run hosted:publish:dry-run`, `npm run hosted:preflight` (all checks pass). Backward compatible: optional fields, `?? []` fallbacks, panel hidden when byProfile is empty (fixture mode).

**TickTick per-task list slice completed (2026-06-04):** surfaced per-task list (title/status/priority) inside `KanbanBoardPanel` in `src/components/ActiveProjectsPage.tsx`. Tasks are grouped by column in `column_counts` order; active work columns ("In Build", "Build Ready", "QA / Review") render task titles in `var(--fg)` and column headers in signal orange; inactive columns are muted. Status tags translate sanitized TickTick status numbers into labels (`Open`/`Done`/`Archived`/`Unknown`) without exposing raw integers. Priority tags (`High`/`Med`/`Low`) shown as `tag--signal`/`tag--blue`/bare tag; `none` priority renders no tag. `ttPriorityTag` and `ttStatusTag` helpers added (separate from the `priorityLabel` p0–p3 system used for canonical projects). Show/hide toggle (default: show) collapses the task list. No new data sources — `tasks` was already present in the snapshot via `...board` spread in `collectTickTickKanban` and the `TickTickTask[]` type was already in the contract. Privacy boundary maintained: only `id`, `title`, `column`, `priority`, and `status` fields rendered — no descriptions, comments, attachments, or updated timestamps surfaced. QA passed: `tsc+vite build` clean, `npm run snapshot:generate` (13 tasks, 6 columns confirmed), `npm run snapshot:prepare-hosted`, `npm run hosted:publish:dry-run`, `npm run hosted:preflight` (all checks pass). Backward compatible: `board.tasks ?? []` fallback; fixture has no boards so panel is not rendered; `TickTickTask` import added to component.

**Session activity feed slice completed (2026-06-04):** added `scripts/adapters/hermes-session-activity.mjs` — reads aggregate session metadata from Hermes state.db sessions table. Groups by (day, source, model) across all profiles (30-day window); aggregates to (day, source) in JS; picks primary_model by highest session_count; computes weighted-average session duration from `ended_at - started_at`. New type `SessionActivityDaily` added to `warung-os.ts`; optional field `session_activity_daily` added to `OperationsSnapshot`; `sessionActivityDaily` added to `WarungData`. Wired into `generate-snapshot.mjs` (new `collectSessionActivity` import, adapter warning, sync_run summary field, console log line). `dataSource.tsx` maps `operations.session_activity_daily ?? []`. Added `ActivityFeedPanel` component and "Session activity · 14d" section to `UsageTab` in `OperationsPage.tsx` — 14-day bar chart (all sources) + latest-day breakdown (session count, tool calls, avg duration). Privacy boundary maintained: never reads title, system_prompt, model_config, handoff_state, billing/cost fields, or user_id. QA passed: standalone adapter run (29 day-source rows, 4 profiles, 5 sources: acp/cli/cron/telegram/tui), `npm run snapshot:generate` (session_activity_daily: 29 rows confirmed), `npm run snapshot:prepare-hosted`, `npm run hosted:publish:dry-run`, `npm run hosted:preflight` (all checks pass), `npm run build` (tsc+vite clean). Backward compatible: optional field, `?? []` fallback in dataSource, empty array in fixture fallback.

**TickTick board panel slice completed (2026-06-04):** surfaced TickTick board columns/task counts in Active Projects UI. Added `KanbanBoardPanel` component to `src/components/ActiveProjectsPage.tsx`: renders when the selected project matches a TickTick board by name (case-insensitive). Shows column breakdown with proportional bar chart — active work columns ("In Build", "Build Ready", "QA / Review") highlighted in signal orange; done/backlog columns in muted tone. Shows total task count, board name, collection timestamp, and cache age. Privacy boundary maintained: no descriptions or comments surfaced; data sourced only from sanitized TickTick cache (`projects.kanban_boards` from snapshot). Board is matched from `kanbanBoards` in `WarungData` (already populated via `snapshotToData`). QA passed: `tsc+vite build` clean, `npm run snapshot:generate` (13 tasks/6 columns verified), `npm run snapshot:prepare-hosted`, `npm run hosted:publish:dry-run`, `npm run hosted:preflight` (all checks pass). No new data sources, no secrets read, backward compatible (board panel is conditionally rendered — null-safe).

**Cron run-history chart slice completed (2026-06-03):** extended `scripts/adapters/hermes-cron.mjs` with `_buildDailyHistory()` — buckets all output filenames into 30 UTC calendar day counts per job (safe: filenames only, no content read). Added `run_history_daily: Array<{date:string;count:number}>` to `CronJobSnapshot` type. Added "Run activity · 14d" chart panel (aggregated VertBarChart) and per-job HBarRow breakdown to `AutomationTab` in `OperationsPage.tsx`. All 10 jobs show real data in the chart (e.g. Taste Daily Scan: 12 runs across 10 active days). QA passed: standalone adapter run (30-day histograms verified), `npm run snapshot:generate` (10 jobs, run_history_daily present), `npm run snapshot:prepare-hosted`, `npm run hosted:publish:dry-run`, `npm run build` (tsc+vite clean), `npm run hosted:preflight` (all checks pass). No new data sources; no secrets read; backward compatible (optional field).

**TickTick refresh + snapshot validation slice completed (2026-06-03):** refreshed sanitized TickTick Warung OS board cache via `npm run ticktick:collect` (credentials available via Hermes tech-director profile TickTick MCP config; 13 tasks across 6 columns: In Build:4, Build Ready:3, Approved/Done:2, QA/Review:2, Design Direction:1, Data Contracts:1). Regenerated snapshot — `meta.is_demo:false`, `meta.source_scope:hermes-only`, `projects.kanban_boards[0].cache_age_hours:0`. Ran full validation chain: `npm run snapshot:generate`, `npm run hosted:prepare`, `npm run hosted:publish:dry-run`, `npm run hosted:preflight` (all checks pass, 1 optional publishing item pending), `npm run build` (tsc+vite clean). Confirmed cron (10 jobs/2 profiles), provider health (6 model, 3 gateway, 5 catalog), and tool-usage adapters producing live Hermes data. No code changes — pure data refresh and validation pass.

**Public/no-auth preflight + adapter extraction slice completed (2026-06-03):** replaced stale P5.5/auth-gated blocker wording in repo docs and `scripts/hosted-preflight.mjs` with the current live public/no-auth direction. Extracted `team_members` into `scripts/adapters/hermes-team-members.mjs` as a documented static placeholder and added `scripts/adapters/hermes-dot-delegation.mjs` as an unavailable skeleton adapter that returns `[]` rather than inventing delegation data. Added source-health warnings for both unavailable live sources. QA passed: standalone adapter runs, `npm run snapshot:generate`, `npm run snapshot:prepare-hosted`, `npm run hosted:publish:dry-run`, `npm run hosted:preflight`, and `npm run build`.

**Hosted mirror preflight slice completed (2026-06-03):** added `scripts/hosted-preflight.mjs` and `npm run hosted:preflight`. The preflight script validates the full local readiness chain in a single pass without contacting Supabase/Vercel: (1) snapshot pipeline — `latest.json` exists, hermes-only scope, is_demo:false, schema_version:1, freshness; (2) hosted export — `hosted-export/latest.json` + `manifest.json` exist, sha256 hash verified, upload_performed:false; (3) env variable boundary — `SUPABASE_SERVICE_ROLE_KEY` absent from browser template, `.env.publish.example` documents all publisher vars, `.gitignore` protects all secret/export files; (4) current live public/no-auth Vercel direction and optional Supabase publishing status. Updated `docs/supabase-vercel-config-template.md` with an explicit env variable hierarchy table showing which vars are browser-safe vs publisher-only and the boundary rule. QA passed: `npm run hosted:preflight` (exit 0, local checks pass), `npm run snapshot:prepare-hosted`, `npm run hosted:publish:dry-run`, `npm run build`.

**Tool usage adapter completed (2026-06-02):** added `scripts/adapters/hermes-tool-usage.mjs` — the first adapter reading Hermes `state.db messages` table. Queries `tool_name`, `timestamp`, and `token_count` (joined to `sessions` for `model` + `source`) with a 7-day rolling window; groups by `(day, tool_name)` across all profiles; applies a Hermes-native snake_case + Claude Code CamelCase tool category lookup (filesystem, shell, browser, mcp, skill, memory, vision, scheduling, search, agent, web, ui, monitoring, git, planning, remote, meta). Never reads: `content`, `tool_calls`, `reasoning*`, `system_prompt`, `title`, or any credential field. Token split (input/output/cache) is 0 — `messages.token_count` is not directional. Replaced static `sh-hermes-token-log:bad` source health entry with dynamic per-profile `state.db` filesystem checks. QA passed: standalone adapter run (164 tool-day rows, 3 profiles, 335 raw rows), `npm run snapshot:generate`, `npm run snapshot:prepare-hosted`, `npm run hosted:publish:dry-run`, `npm run build`. Snapshot confirms `tool_usage_daily: 164 rows`, `source_scope: hermes-only`, `is_demo: false`.

**Adapter extraction completed (2026-06-02):** extracted Hermes cron and provider health adapters from the monolithic snapshot generator into standalone modules `scripts/adapters/hermes-cron.mjs` and `scripts/adapters/hermes-provider-health.mjs`. Each adapter exports a single parameterised function (`collectCronJobs`, `collectProviderHealth`), can run standalone for debugging (`node scripts/adapters/hermes-cron.mjs`), and is documented in `scripts/adapters/README.md`. Enhancement: `hermes-provider-health.mjs` now extracts actual fallback provider names from `fallback_providers:` config (both inline and multiline YAML formats). No changes to snapshot output shape. QA passed: `npm run snapshot:generate`, `npm run snapshot:prepare-hosted`, `npm run hosted:publish:dry-run`, `npm run build`. Standalone adapter runs confirmed live Hermes data (10 cron jobs/2 profiles, 4 model health rows, 2 gateway rows, 5 provider catalog rows).

**Phase 5 frozen (2026-06-05):** Raz asked to freeze hosted/auth work for now and move on to finish the rest of Warung OS. The frontend `snapshotLoader.ts` can still represent `auth_required` for future auth mode, but P5.5 is no longer the next slice. Do not continue auth, Supabase, Vercel, deployment, or publisher work unless Raz explicitly reopens Phase 5. Active priority is the core product MVP: Morning Brief usefulness, project source-of-truth, broader Active Projects coverage, Gabs visual polish, and safe live team/delegation sources.

**Phase 5.4 publisher bridge completed (2026-06-02):** added `scripts/publish-snapshot.mjs`, `.env.publish.example`, `.env.example`, and `docs/supabase-vercel-config-template.md`. The publisher validates `hosted-export/latest.json` against `manifest.json`, checks Hermes-only scope, and defaults to dry-run. Real upload is fail-closed behind `.env.publish` + `--upload`; service-role keys stay local only and never enter Vite/Vercel/browser config. QA passed: `npm run snapshot:prepare-hosted`, `npm run hosted:publish:dry-run`, and `npm run build`. Dry-run target showed `SUPABASE_URL_UNSET/storage/v1/object/warung-os-snapshots/latest.json`; no upload was performed.

**Phase 5.2 hosted data-source boundary completed (2026-06-02):** updated the React snapshot loader so Warung OS can distinguish `local`, `prepared`, and `remote` snapshot modes with explicit `fresh`, `stale`, `unavailable`, `auth_required`, and `error` states. Local dev still defaults to `/snapshots/latest.json`; remote Supabase auth mode deliberately returns `auth_required` until P5.5 implements the auth wall.

**Phase 5.1 local export prep completed (2026-06-02):** added `scripts/prepare-hosted-snapshot.mjs`, `npm run hosted:prepare`, and `npm run snapshot:prepare-hosted`. The script validates the generated snapshot for Hermes-only scope, absolute local paths, secret-like values, and sensitive keys, then writes gitignored `hosted-export/latest.json` and `hosted-export/manifest.json` with `upload_performed: false`, `max_age_minutes: 60`, and local-export-only metadata. QA passed: `npm run snapshot:prepare-hosted` and `npm run build`. No upload, deployment, external account configuration, paid service, or credential changes were performed.

**Phase 4 slice completed (2026-06-02):** wired remaining dead placeholder buttons into LocalState audit trail. "Open run log" (Operations header) now creates a `view_run_log` audit entry and navigates to the Automation tab. "View source notes" (Home header) creates a `view_source_notes` entry. "Approve focus" (Home header) approves the first pending approval item or records `focus_approved`. "Mark structure approved" (Home) approves the matching project approval or records `focus_approved`. Active Projects approval buttons now update session-only approval overrides; "Sync Obsidian" and "New review queue" create local audit entries only. Added `view_run_log`, `view_source_notes`, `focus_approved`, `sync_obsidian_requested`, and `review_queue_requested` to `AuditAction` type. Surfaced Hermes cron run history in AutomationTab: added `Runs` column showing `run_count` (from filesystem output filenames) and uses `recent_run_timestamps` as a fallback for last-run time when `last_run_at` is absent. Build, snapshot generation, and browser smoke pass. Snapshot generator unchanged and still collecting real Hermes data.

**Phase 4 slice completed (2026-06-01):** added in-memory LocalStateProvider, session audit log tab, local manual-refresh request records, and local approval status actions. Header, Overview, and Sources manual refresh buttons now create pending SyncRequest records and audit entries only — no disk writes, network calls, external publishing, or remote execution.

**Phase 3 slice completed (2026-06-01):** gateway_status and provider_catalog real data surfaced in Operations UI (Agents tab). Both sections render live snapshot data (2 profiles, 5 providers, 90 models). Build and browser smoke test passed; pushed in commit `c426392`.

## Source of truth

- Repo: `/Users/gabi/Documents/warung-repo/warung-os`
- PRD: `docs/prd.md`
- Epic: `docs/epic.md`
- Snapshot contract: `docs/snapshot-contract.md`
- Obsidian project: `/Users/gabi/Documents/Warung Kerja 1.0/03_Active_Projects/Warung OS/`
- Obsidian tracker: `/Users/gabi/Documents/Warung Kerja 1.0/03_Active_Projects/Warung OS/Project Tracker Masterlist.md`
- Priority board: TickTick `Dev Project Status`
- Implementation board: TickTick `Warung OS` / `Dev Production Line` as applicable

## Default worker

`claude-code`

Use Claude Code print mode for bounded implementation slices:

```bash
HOME=/Users/gabi /Users/gabi/.local/bin/claude -p "$(cat <prompt-file>)" \
  --max-turns 45 \
  --permission-mode acceptEdits \
  --allowedTools 'Read,Write,Edit,Bash' \
  --output-format json
```

## Model policy

- Use Sonnet for bounded implementation slices.
- Use Opus/stronger review when architecture, ambiguity, difficult debugging, high-risk refactors, or final quality review materially benefits from stronger reasoning.
- Do not use paid tools/accounts beyond existing approved subscriptions.

## Validation commands

Run these before sign-off when relevant:

```bash
npm run snapshot:generate
# Optional hosted checks only when touching snapshot/export boundary; Phase 5 is frozen
npm run snapshot:prepare-hosted
npm run hosted:publish:dry-run
npm run build
```

For UI-affecting changes, run a local browser smoke test and check browser console errors.

## Definition of done per slice

A slice is only done when all are true:

- Code/docs implemented.
- Build/test/smoke validation passed, or blocker documented honestly.
- Claude/Dot/Codex output inspected by Mia; worker completion alone is not proof.
- Obsidian tracker updated.
- TickTick project/status card updated.
- Git status reviewed.
- Clean changes committed and pushed when appropriate.
- Known risks/limitations recorded.

## Autonomy allowed

Mia may autonomously:

- edit local code/docs in this repo,
- run local tests/builds/browser smoke,
- create local snapshot/demo files that are gitignored,
- update Obsidian project docs,
- update TickTick cards/comments,
- commit and push completed safe slices after QA.

## Stop and ask Raz before

- paid API/tool/account use,
- deployment/public release,
- contacting real people,
- changing secrets/OAuth credentials,
- destructive git operations,
- major product direction changes,
- using private data sources that could leak transcripts, secrets, or personal memory.

## Current known limitation

The snapshot system is structurally ready and now collects several real local sources. Real telemetry must be added carefully from safe local Hermes sources only, scoped across Raz's Hermes profiles now and in the future — not OpenClaw. Wiki ingestion is approved only for `05_1%_Journal` unless Raz expands scope.
