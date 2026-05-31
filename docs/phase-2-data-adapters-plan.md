# Warung OS Phase 2 — Data Contracts + Hermes Source Adapters Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace Phase 1 dummy fixtures with read-only local snapshots from Raz's real Hermes environment and approved Warung Kerja workspace sources.

**Architecture:** Keep the browser app static and safe. Add a local collection layer that writes sanitized JSON snapshots under `data/snapshots/` or `public/snapshots/`, then add adapter modules that can read either fixtures or snapshots through one normalized data boundary. No browser-originated shell execution, no secrets, no raw transcripts.

**Tech Stack:** React + Vite + TypeScript app, Node/TypeScript or Python snapshot scripts, local filesystem JSON snapshots, TickTick MCP/API via Hermes-side tooling only, Obsidian markdown parsing, git CLI read-only signals.

---

## Non-negotiables

- Operations data must be scoped to Raz's Hermes agents/environment only.
- Do not include OpenClaw agents, token usage, cron jobs, or telemetry.
- No secrets, OAuth tokens, raw private memory dumps, raw transcripts, service-role keys, or credentials in repo or snapshots.
- All Phase 2 integrations are read-only except explicit request records such as manual refresh requests.
- Browser UI can create request-state placeholders only; trusted local/Hermes processes decide whether to act.
- Keep fixture fallback available so the UI works when snapshots are missing.

## Phase 2 source map

- Hermes agent/profile metadata: local Hermes profile files and safe CLI/status outputs.
- Hermes cron/scheduled jobs: Hermes cron registry/output, scoped to current profile unless Raz explicitly broadens scope.
- Hermes token/model/tool usage: only if available from Hermes logs/usage summaries; otherwise create a clearly marked unavailable state instead of fake real data.
- TickTick project/task state: Warung OS TickTick project only first, then approved project boards later.
- Obsidian project docs: `~/Documents/Warung Kerja 1.0/03_Active_Projects/` and `01_Passive_Engine/` project notes.
- Wiki/journal notes: approved folders only; exact folders must be confirmed before ingestion.
- Git/workspace signals: local git status/log for approved repos under `~/Documents/warung-repo/`.

## Acceptance criteria

- `npm run build` passes.
- Snapshot schemas are typed and documented.
- UI clearly labels fixture vs real snapshot mode.
- Missing sources show stale/unavailable states, not fabricated values.
- Operations usage/cron/provider panels show only Hermes-scoped data.
- Secret scan remains clean.
- A local snapshot generation command exists and is documented.

---

## Task 1: Add source mode boundary

**Objective:** Create one app-level data boundary so components stop importing raw fixtures directly.

**Files:**
- Create: `src/data/dataSource.ts`
- Modify: `src/components/HomePage.tsx`
- Modify: `src/components/ActiveProjectsPage.tsx`
- Modify: `src/components/OperationsPage.tsx`
- Modify: `src/components/WikiPage.tsx`

**Steps:**
1. Create `dataSource.ts` that exports a `getWarungData()` function returning the same data objects currently imported from `fixtures.ts`.
2. Move all component fixture imports to `getWarungData()` or named selector helpers.
3. Add a `sourceMode: 'fixture' | 'snapshot'` field to the returned object, initially hardcoded as `'fixture'`.
4. Render a small data-source label in Operations: `DATA SOURCE: FIXTURE`.
5. Run `npm run build`.
6. Commit: `refactor: add Warung OS data source boundary`.

## Task 2: Formalize snapshot schema

**Objective:** Define the JSON snapshot contract that Phase 2 collectors must emit.

**Files:**
- Create: `src/types/snapshots.ts`
- Modify: `src/types/warung-os.ts` if shared fields need cleanup.
- Create: `docs/snapshot-contract.md`

**Steps:**
1. Define `WarungSnapshot` with sections for home, projects, operations, wiki, and metadata.
2. Add snapshot metadata fields: `generated_at`, `source_scope`, `source_mode`, `profile`, `warnings`, `redactions_applied`.
3. Require `source_scope: 'hermes-only'` for Operations snapshots.
4. Document which fields may be empty/unavailable.
5. Run `npm run build`.
6. Commit: `docs: define Warung OS snapshot contract`.

## Task 3: Add local snapshot loader with fixture fallback

**Objective:** Let the app read a local static JSON snapshot when present, while keeping fixtures as fallback.

**Files:**
- Create: `public/snapshots/.gitkeep`
- Create: `src/data/snapshotLoader.ts`
- Modify: `src/data/dataSource.ts`
- Modify: `README.md`

**Steps:**
1. Add async snapshot loading from `/snapshots/latest.json`.
2. If load fails, return fixture data with a warning.
3. Surface `DATA SOURCE: SNAPSHOT` or `DATA SOURCE: FIXTURE FALLBACK` in Operations.
4. Document where generated snapshots live.
5. Run `npm run build`.
6. Commit: `feat: load local snapshots with fixture fallback`.

## Task 4: Build Hermes-safe snapshot collector skeleton

**Objective:** Create a local script that emits a sanitized snapshot file without integrating every source yet.

**Files:**
- Create: `scripts/generate_snapshot.py` or `scripts/generate-snapshot.ts`
- Create: `scripts/README.md`
- Modify: `.gitignore`
- Modify: `package.json`

**Steps:**
1. Add a command such as `npm run snapshot:generate` or `uv run scripts/generate_snapshot.py`.
2. Emit `public/snapshots/latest.json` matching `WarungSnapshot`.
3. Include metadata and explicit placeholder unavailable states.
4. Add redaction helpers for email/token/path-sensitive values as needed.
5. Ensure generated snapshots are either safe to commit or explicitly gitignored; decide and document.
6. Run snapshot command and `npm run build`.
7. Commit: `feat: add Hermes-safe snapshot generator skeleton`.

## Task 5: Add Hermes cron/provider health collector

**Objective:** Populate Operations health with real Hermes status where safe and available.

**Files:**
- Modify: `scripts/generate_snapshot.py` or equivalent.
- Modify: `docs/snapshot-contract.md`.
- Modify: `src/components/OperationsPage.tsx` if additional unavailable states are needed.

**Steps:**
1. Read Hermes cron job list via safe local source/tooling where available.
2. Read provider/fallback health from safe Hermes config/status outputs without exposing keys.
3. Scope to active profile first: `tech-director`.
4. Populate unavailable/warning states if data is inaccessible.
5. Run snapshot command, inspect JSON manually for secrets.
6. Run `npm run build`.
7. Commit: `feat: collect Hermes cron and provider health snapshots`.

## Task 6: Add project tracker source adapter

**Objective:** Start replacing Active Projects fixtures with real Obsidian project tracker data.

**Files:**
- Modify: `scripts/generate_snapshot.py` or equivalent.
- Modify: `docs/snapshot-contract.md`.
- Modify: `src/components/ActiveProjectsPage.tsx` only if needed.

**Steps:**
1. Parse known Warung Kerja project docs from approved folders.
2. Extract conservative fields: project name, stage/status, owner, latest updated date, links.
3. Do not parse raw private agent memories or transcripts.
4. If a project lacks required metadata, mark fields as `unknown` rather than inventing values.
5. Run snapshot command and compare UI with fixtures.
6. Run `npm run build`.
7. Commit: `feat: collect Obsidian project tracker snapshots`.

## Task 7: Add TickTick Warung OS board adapter

**Objective:** Include Warung OS kanban state in snapshots.

**Files:**
- Modify: `scripts/generate_snapshot.py` or equivalent.
- Modify: `docs/snapshot-contract.md`.
- Modify: Home/Operations/Active Projects data mapping as needed.

**Steps:**
1. Read only the `Warung OS` TickTick project initially.
2. Capture columns, task titles, statuses, priorities, and updated times.
3. Exclude private comments unless explicitly approved.
4. Add summary counts to Home and detailed project/task state to Active Projects or Operations.
5. Run snapshot command, inspect for secrets/private comments.
6. Run `npm run build`.
7. Commit: `feat: collect Warung OS TickTick board snapshot`.

## Task 8: QA and handoff

**Objective:** Prove Phase 2 is safe and useful before expanding sources.

**Files:**
- Modify: `docs/phase-1-handoff.md` or create `docs/phase-2-handoff.md`.
- Modify: `README.md`.

**Steps:**
1. Run `npm run build`.
2. Run snapshot generation.
3. Start local dev server and browser-smoke all pages.
4. Secret-scan tracked source and generated snapshots.
5. Confirm Operations data labels show Hermes-only scope.
6. Update Obsidian tracker and TickTick.
7. Commit: `docs: add Phase 2 adapter handoff`.

---

## Open decisions for Raz

- Which Hermes profiles should Operations include first: `tech-director` only, or all Warung Kerja Hermes profiles on this Mac?
- Should generated snapshots be committed for demo/history, or gitignored and local-only?
- Which Obsidian folders are approved for Wiki ingestion?
- Should TickTick comments be excluded by default from snapshots?
- Should Phase 2 remain local-only, or prepare an auth-gated hosted mirror contract now?

<!-- edited by Mia, 2026-05-31 -->
