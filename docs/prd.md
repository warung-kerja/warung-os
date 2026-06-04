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

### Could later / Phase 5

- Extend TickTick ingestion beyond the current cached Warung OS board adapter.
- Extend Obsidian parsing beyond the current approved project/wiki source folders if Raz approves more folders.
- Add remaining Hermes session/token/delegation data collectors across all Hermes profiles.
- Hosted snapshot mirror is parked/frozen as of 2026-06-05. P5.1-P5.4 already cover local export prep, hosted data-source boundaries, config templates, and a fail-closed publisher bridge; the current public/no-auth Vercel mirror remains live. Do not continue auth/private hosting/upload/deploy work unless Raz explicitly reopens Phase 5.
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

Data scope requirement: Operations must show Raz's Hermes environment only, across all Hermes profiles present now and added in the future. Token usage, cron/automation health, model/provider/fallback health, source health, sync runs, workspace/git signals, and agent/team status must not include OpenClaw agents or OpenClaw telemetry.

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
- Approved ingestion scope is everything within `/Users/gabi/Documents/Warung Kerja 1.0/05_1%_Journal/`.
- Supports basic keyword search/filter locally over fixture data.
- Shows source path/link placeholder and metadata: date, author/agent, project/tags.
- Snapshot output must use relative source paths only, e.g. `05_1%_Journal/<note>.md`, not absolute vault paths.
- AI/RAG assistant stays marked as Phase 2.

### FR6 — Safety and audit posture

Acceptance criteria:

- No secrets in repo or fixture data.
- Actions are placeholders/request states only.
- Any future write action must be modelled as auditable request, not direct execution.
- Manual refresh is a request pattern, not arbitrary command execution.

## Non-functional requirements

- Runs locally on macOS first.
- Future hosted access must support Raz using Warung OS from other computers through an auth-gated hosted snapshot mirror similar to Mission Control Online; browsers must not get arbitrary local command execution.
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

## Hosted access direction

Warung OS should eventually be accessible from Raz's other computers, similar to Mission Control Online. The target pattern is an auth-gated hosted read mirror fed by curated snapshots/sync bridge data, not direct local filesystem access and not arbitrary browser-triggered command execution.

## Open questions parked for later

- Snapshot storage: commit safe demo snapshots, or keep generated snapshots local-only/gitignored?
- TickTick privacy: exclude comments by default, or include selected comments in snapshots?
- P5.5 Supabase/Vercel/auth implementation remains frozen unless Raz explicitly reopens Phase 5.
- Exact approval write path.
- Gabs final visual direction pass.
