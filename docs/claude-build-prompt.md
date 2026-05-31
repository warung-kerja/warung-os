# Claude Code Build Prompt — Warung OS MVP Shell

You are building the first local Warung OS MVP shell for Raz / Warung Kerja.

## Context

Project path: `/Users/gabi/Documents/warung-repo/warung-os/`

Read these files first:

- `docs/prd.md`
- `docs/epic.md`
- `wireframes/001-low-fi-warung-os/index.html`
- `wireframes/001-low-fi-warung-os/README.md`
- `/Users/gabi/Documents/warung-repo/_reference/mission-control-online/docs/MISSION_CONTROL_STYLEGUIDE.md`
- `/Users/gabi/Documents/warung-repo/_reference/mission-control-online/src/styles/mission-control-tokens.css`
- `/Users/gabi/Documents/warung-repo/_reference/mission-control-online/src/types/supabase.ts`

## Build objective

Create a maintainable local React + Vite + TypeScript app that implements the approved Warung OS shell.

If a minimal Vite app does not exist, create one in this directory. Preserve the existing `wireframes/` and `docs/` folders.

## Requirements

1. Four pages/tabs:
   - Home / Daily Brief
   - Active Projects
   - Operations
   - Wiki

2. Visual style:
   - Dark technical operating-system surface.
   - Flat planar fills.
   - Strict grid.
   - 1px hairline rules.
   - Sharp rectangles.
   - Restrained orange signal.
   - No emoji UI.
   - No glassmorphism.
   - No rounded dashboard panels.

3. Home page:
   - Greeting/headline.
   - Last 24h recap.
   - Wins, failures/blockers, moved projects.
   - Approvals waiting for Raz.
   - System health summary.
   - Today’s suggested focus.

4. Active Projects:
   - Project list with status/stage/owner/priority/last movement/blocker/next action.
   - Approval module placeholder with states: pending, approved, rejected, changes requested, blocked.

5. Operations — critical requirement:
   - UI can differ from Mission Control Online, but data/report categories must match Mission Control Online.
   - Include fixture-backed sections for:
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
   - Preserve/adapt these reference contracts: CanonicalProject, CanonicalTeamMember, SyncRun, SyncRequest, SourceHealthSnapshot, CronJobSnapshot, AgentTokenUsageDaily, ModelTokenUsageDaily, ToolUsageDaily, WorkspaceSignalSnapshot.

6. Wiki:
   - Fixture-backed searchable list.
   - Reader/detail preview.
   - Source path/link metadata.
   - AI/RAG clearly marked Phase 2.

7. Safety:
   - No secrets.
   - No raw transcripts.
   - No real write/publish/send/deploy actions.
   - Manual refresh is a request-state placeholder only.

## Suggested implementation

Create/update:

```text
package.json
index.html
tsconfig.json
vite.config.ts
src/main.tsx
src/App.tsx
src/styles.css
src/types/warung-os.ts
src/data/fixtures.ts
src/components/Shell.tsx
src/components/HomePage.tsx
src/components/ActiveProjectsPage.tsx
src/components/OperationsPage.tsx
src/components/WikiPage.tsx
README.md
```

Keep it simple. Do not over-engineer backend adapters yet.

## Validation

After building:

- Run dependency install if needed.
- Run `npm run build`.
- Report changed files.
- Report validation output.
- Report known limitations.

Do not use paid APIs. Do not deploy. Do not ask Raz for secrets.
