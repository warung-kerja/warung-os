# Warung OS — Worksession Runbook

Purpose: project-local runbook for Mia's recurring 2-hour work-session dispatcher.

## Project

Warung OS

## Current priority

Phase 4 — approvals and audit trail.

Next slice: harden local-only action request UX by wiring remaining safe placeholders (for example run-log/open-detail buttons) into request-state records and audit entries. Keep all actions as local session placeholders only; no external publishing, messaging, deployment, or remote command execution.

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
