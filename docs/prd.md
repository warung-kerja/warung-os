# Warung OS — MVP PRD

Date: 2026-05-31  
Owner: Raz  
Tech lead: Mia  
Build worker: Claude Code CLI  
Reference: Mission Control Online (`/Users/gabi/Documents/warung-repo/_reference/mission-control-online`)

## Executive summary

Warung OS is Raz's Hermes-native command centre for Warung Kerja. It gives him a daily operating surface for agent/project status, approvals, system health, TickTick kanban progress, and approved wiki/journal knowledge.

The first build is a local MVP shell based on the approved static wireframe. It should be runnable locally, use local fixture data first, and preserve the Mission Control Online operating style without exposing secrets, raw transcripts, or unsafe write actions.

## Approved navigation

1. Home / Daily Brief
2. Active Projects
3. Operations
4. Wiki

## Design constraints

- Preserve Mission Control Online style DNA: dark technical OS surface, flat fills, strict grid, sharp rectangles, 1px hairline rules, mono metadata labels, restrained orange signal.
- No glassmorphism, no rounded dashboard cards, no emoji-led UI, no decorative gradients.
- Treat the current wireframe as structure approval, not final visual design.

## Goals

### Must

- Build a local app shell with the four approved sections.
- Use fixture/snapshot-shaped data so the UI is meaningful immediately.
- Home shows a daily brief with last-24h recap, wins, failures/blockers, approvals, moved projects, system summary, and suggested focus.
- Active Projects shows project state, blockers, next actions, and approval module placeholders.
- Operations preserves Mission Control Online-style operational data/report parity.
- Wiki supports simple browse/search/read patterns with source links as placeholders.
- Include clear empty/loading/error/stale states where relevant.
- Include timestamps/freshness indicators on operational data.
- Keep all secrets out of code and fixtures.

### Should

- Structure data contracts in TypeScript so real adapters can replace fixtures later.
- Keep components modular enough for future sync bridge/Supabase/local adapters.
- Document commands and limitations in README.
- Include a basic QA/build command.

### Could later

- Add real TickTick MCP ingestion.
- Add Obsidian file parsing for project/wiki sources.
- Add Hermes cron/session/provider data collectors.
- Add hosted snapshot mirror with auth.
- Add Telegram approval buttons.

### Won't in first build

- No arbitrary command execution from browser.
- No external deployment.
- No paid APIs.
- No real publishing/sending/deploying actions.
- No raw private transcript or memory dump exposure.
- No Supabase/service-role keys or OAuth credentials.

## Functional requirements

### FR1 — App shell and navigation

- Four top-level tabs/pages: Home, Active Projects, Operations, Wiki.
- Desktop-first layout matching approved wireframe: persistent left navigation, main content, decision/attention rail where useful.
- Active page state must be clear.

### FR2 — Home / Daily Brief

Acceptance criteria:

- Shows greeting/headline in plain Mia-style language.
- Shows last 24h wins, failures/blockers, moved projects, approvals, system health summary, and today's suggested focus.
- Highlights what needs Raz's attention.
- Does not overwhelm with raw technical data; links/summarizes Operations issues instead.

### FR3 — Active Projects

Acceptance criteria:

- Shows multiple projects with stage/status/owner/priority/last movement/blocker/next action.
- Includes a project detail/approval area based on the approved wireframe.
- Approval states include pending, approved, rejected, changes requested, and blocked as data states, even if actions are placeholders.

### FR4 — Operations data/report parity

Raz requirement: the Operations page can use a different UI solution, but it must let him read the same type of data and report as Mission Control Online.

Data scope requirement: Operations must show Raz's Hermes agents/environment only. Token usage, cron/automation health, model/provider/fallback health, source health, sync runs, workspace/git signals, and agent/team status must not include OpenClaw agents or OpenClaw telemetry.

The first build must include fixture-backed sections for:

- Agent token usage daily.
- Model token burn daily.
- Tool usage daily by tool/category/model/agent.
- Cron/automation health with last/next runs and timeline summary.
- Source health/freshness.
- Sync runs and manual refresh requests.
- Workspace/git signals.
- Agent/team status.
- Hermes model/provider/fallback health.
- Dot/delegation status.

Mission Control Online reference type names to preserve/adapt:

- `CanonicalProject`
- `CanonicalTeamMember`
- `SyncRun`
- `SyncRequest`
- `SourceHealthSnapshot`
- `CronJobSnapshot`
- `AgentTokenUsageDaily`
- `ModelTokenUsageDaily`
- `ToolUsageDaily`
- `WorkspaceSignalSnapshot`

### FR5 — Wiki

Acceptance criteria:

- Shows list of wiki/journal entries.
- Supports basic keyword search/filter locally over fixture data.
- Shows source path/link placeholder and metadata: date, author/agent, project/tags.
- AI/RAG assistant stays marked as Phase 2.

### FR6 — Safety and audit posture

Acceptance criteria:

- No secrets in repo or fixture data.
- Actions are placeholders/request states only.
- Any future write action must be modelled as auditable request, not direct execution.
- Manual refresh is a request pattern, not arbitrary command execution.

## Non-functional requirements

- Runs locally on macOS.
- Prefer TypeScript for data contracts.
- Keep first implementation simple and maintainable.
- Build should pass `npm run build` or equivalent.
- UI should be readable in desktop browser at normal laptop width.

## Architecture recommendation

First build: clean local React/Vite/TypeScript app under `/Users/gabi/Documents/warung-repo/warung-os/`.

Suggested source layout:

```text
src/
  App.tsx
  main.tsx
  styles.css
  data/fixtures.ts
  types/warung-os.ts
  components/
    Shell.tsx
    HomePage.tsx
    ActiveProjectsPage.tsx
    OperationsPage.tsx
    WikiPage.tsx
```

Keep adapters out of first pass unless cheap. Use fixture data shaped like future adapters.

## Open questions parked for later

- Which Hermes profiles should Operations include first: `tech-director` only, or all Warung Kerja Hermes profiles on this Mac?
- Snapshot storage: commit safe demo snapshots, or keep generated snapshots local-only/gitignored?
- Exact Wiki ingestion scope: which Obsidian folders are approved for diary/journal browsing?
- TickTick privacy: exclude comments by default, or include selected comments in snapshots?
- Hosted mirror: local-only vs online auth-gated snapshot mirror.
- Exact approval write path.
- Gabs final visual direction pass.
