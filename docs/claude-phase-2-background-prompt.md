# Claude Code Task — Warung OS Phase 2 Background Build

You are working in `/Users/gabi/Documents/warung-repo/warung-os`.

Mia is tech director and owns architecture, QA, and final sign-off. Implement the first Phase 2 slice from `docs/phase-2-data-adapters-plan.md`.

## Non-negotiables

- Preserve `docs/` and `wireframes/`.
- No secrets, API keys, OAuth codes, service-role keys, raw transcripts, or private memory dumps.
- No paid APIs, no deploys, no external messaging/publishing.
- Operations data must be scoped to Raz's Hermes agents/environment only. Do not include OpenClaw agents or OpenClaw telemetry.
- Keep the app local-first and read-only.
- Keep fixture fallback working.
- Clearly label whether UI data is fixture, snapshot, stale, or unavailable.
- Do not commit or push. Leave changes in the worktree for Mia to inspect.

## Implement this slice

1. Add a data-source boundary so React components stop importing fixture data directly.
   - Suggested paths: `src/data/dataSource.ts`, `src/data/fixtureSource.ts`, `src/data/snapshotSource.ts`, or similar.
   - Existing UI should consume a single app data object/hook/provider rather than reaching into `fixtures.ts` everywhere.

2. Define a sanitized snapshot contract.
   - Suggested path: `src/types/snapshot.ts` or extend `src/types/warung-os.ts` cleanly.
   - Include source metadata: mode/source, generatedAt, freshness/staleness, unavailable states, adapter warnings.
   - Include Operations-specific metadata proving Hermes-only scope.

3. Add fixture fallback + local snapshot loading.
   - App should use fixture data if no snapshot is available.
   - If a snapshot exists, it should be possible to load it safely from a local static path such as `/snapshots/latest.json`.
   - Do not break Vite build if no snapshot file exists.

4. Add a local snapshot generator skeleton.
   - Suggested command: `npm run snapshot:generate`.
   - Suggested output: `public/snapshots/latest.json` or a documented local-only equivalent.
   - Generator should create sanitized placeholder/safe snapshot data from existing fixtures and include metadata that says it is not live telemetry yet.
   - Add `.gitignore` rules if generated snapshots should remain local-only; if you choose to commit a sample snapshot, it must be explicitly safe/demo-only and documented.

5. Add first Hermes-only Operations adapter skeleton.
   - Read only safe, non-secret local information if available.
   - It is acceptable for token usage to remain unavailable rather than fake real data.
   - Add explicit labels for unavailable metrics.
   - Never read raw session transcripts, raw memories, or secret config values.

6. Update docs.
   - README should explain fixture vs snapshot mode and new commands.
   - Phase 2 plan should mark implemented pieces or add a handoff note.

7. Validate.
   - Run `npm run build`.
   - If you add tests/lint commands, run them too.
   - Provide a concise final summary with:
     - changed files
     - implementation summary
     - validation evidence
     - known risks/limitations

## Design constraint

Preserve current Warung OS visual direction: dark technical dashboard, strict grid, hairline rules, sharp rectangles, restrained orange signal, no decorative slop.
