# Warung OS — Worksession Runbook

Purpose: project-local runbook for Mia's recurring 2-hour work-session dispatcher.

## Project

Warung OS

## Current priority

Phase 3 — hosted-readiness and real-data hardening.

Next slice: draft the auth-gated hosted mirror architecture for Warung OS: local snapshot publisher boundary, hosted read-only mirror contract, access/auth assumptions, and request/approval-based browser actions. Do not deploy or create paid services.

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
