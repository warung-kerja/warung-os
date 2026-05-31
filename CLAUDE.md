# Warung OS — Claude Code Project Context

You are implementing Warung OS for Raz / Warung Kerja.

## Non-negotiables

- Mia owns architecture, QA, and sign-off.
- Preserve docs and wireframes; do not delete `docs/` or `wireframes/`.
- No secrets, API keys, OAuth codes, service-role keys, raw transcripts, or private memory dumps in code/fixtures/docs.
- No paid APIs, no deployment, no external messaging/publishing.
- Browser actions are request-state placeholders only, not arbitrary command execution.

## Design direction

- Mission Control Online is the visual reference.
- Dark technical OS surface, flat fills, strict grid, 1px hairlines, sharp rectangles, restrained orange signal.
- No emoji UI, no glassmorphism, no rounded dashboard panels, no decorative gradients.

## Product structure

Top-level pages:

1. Home / Daily Brief
2. Active Projects
3. Operations
4. Wiki

Critical Operations requirement: preserve Mission Control Online-style data/report parity even if the Warung OS UI differs.

Operations data scope: token usage, cron/automation health, provider/fallback health, source health, sync runs, workspace signals, and agent/team status must represent Raz's Hermes agents/environment only. Do not mix in OpenClaw agents or OpenClaw telemetry.

## Local reference paths

- Reference repo: `/Users/gabi/Documents/warung-repo/_reference/mission-control-online`
- Approved wireframe: `wireframes/001-low-fi-warung-os/index.html`
- PRD: `docs/prd.md`
- Epic: `docs/epic.md`
- Build prompt: `docs/claude-build-prompt.md`
