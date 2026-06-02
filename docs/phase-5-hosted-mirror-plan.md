# Warung OS — Phase 5 Hosted Mirror Plan

**Status:** Active — Raz approved hosted-mirror prep beyond local export
**Opened:** 2026-06-02
**Approval:** Raz approved continuing Phase 5 on 2026-06-02; live upload/deploy still requires local credentials and explicit command execution.
**Owner:** Raz
**Tech lead:** Mia  
**Scope rule:** Build hosted-mirror readiness now, but keep it fail-closed: no credentials committed, no service-role key in browser/Vercel, no paid services, and no upload unless the local publisher is explicitly run with real `.env.publish` credentials.

---

## In layman terms

Warung OS can stay safe on the Mac while we prepare the package that a hosted version would read later. This phase starts by making a clean, checked export file — not by putting anything online yet.

## Phase goal

Create an auth-gated hosted snapshot mirror path for Warung OS so Raz can eventually access the dashboard from other computers without exposing the local workstation, local filesystem, secrets, raw transcripts, or arbitrary command execution.

## Architecture direction

Use the existing snapshot-first architecture:

1. Local generator reads approved local sources.
2. Generator writes `public/snapshots/latest.json` locally and gitignored.
3. Phase 5 prep validates the snapshot for hosted safety.
4. Prep writes `hosted-export/latest.json` and `hosted-export/manifest.json` locally and gitignored.
5. Later publisher uploads that exact prepared payload to private Supabase Storage once hosting details are approved.
6. Hosted Vercel app authenticates Raz and reads the private snapshot only after auth.

## Non-negotiable safety rules

- Browser never gets arbitrary local command execution.
- Browser actions stay request/audit records unless Raz approves a specific local bridge action.
- Supabase service-role key stays local only and is never committed or sent to Vercel.
- Frontend only uses public Supabase URL + anon key.
- Snapshots must not contain absolute local paths, secrets, OAuth tokens, chat IDs, prompts, raw transcripts, raw memory dumps, or delivery targets.
- Operations scope remains Hermes-only across all Hermes profiles, never OpenClaw telemetry.

## Default choices for first implementation pass

These are implementation defaults, not irreversible product choices:

- Storage model: Supabase Storage bucket first, not DB tables.
- Publish mode: manual/local export first.
- Versioning: latest-only first.
- Freshness threshold: 60 minutes.
- Hosted domain: Vercel default subdomain first.

## Phase 5 milestones

### P5.1 — Local hosted export prep

**Status:** Done

Deliverables:

- Add `scripts/prepare-hosted-snapshot.mjs`.
- Add `npm run hosted:prepare`.
- Add `npm run snapshot:prepare-hosted`.
- Add safety validation for absolute paths, secret-like values, sensitive keys, and Hermes-only scope.
- Write gitignored `hosted-export/latest.json` and `hosted-export/manifest.json`.
- Add hosted metadata to the prepared export: `published_at`, `max_age_minutes`, `hosted_export`.

Acceptance:

- `npm run snapshot:prepare-hosted` passes.
- `npm run build` passes.
- `hosted-export/` remains gitignored.
- Manifest proves `upload_performed: false`.

### P5.2 — Hosted data-source boundary

**Status:** Done

Deliverables:

- Add hosted-mode loader abstraction that can use local snapshot, prepared export, or remote authenticated snapshot.
- Add explicit unavailable/auth/stale states.
- Keep local dev unchanged.

### P5.3 — Supabase/Vercel config templates

**Status:** Done as templates / live use still requires local credentials

Deliverables:

- `.env.example` entries for frontend public env vars.
- `.env.publish.example` template for local publisher secrets without real values.
- Supabase SQL/RLS reference doc for private Storage bucket.
- No real credentials committed.

### P5.4 — Local publisher script

**Status:** Done as fail-closed bridge / upload not performed

Deliverables:

- Upload prepared snapshot to Supabase Storage.
- Record publish metadata.
- Fail closed if `.env.publish` missing or validation fails.

### P5.5 — Auth-gated hosted app

**Status:** Not started / deployment gated

Deliverables:

- Supabase auth wall.
- Authenticated snapshot fetch.
- Vercel deployment only after Raz confirms target project/account/domain.

## Open decisions before real hosting

1. Which Supabase project should hold the private bucket?
2. Bucket name: keep default `warung-os-snapshots`?
3. Should publish remain manual, or should Hermes cron publish on a schedule?
4. Should snapshots remain latest-only, or should we keep dated versions?
5. Should the hosted app be Vercel default domain first?

## Current first slice

P5.1 through P5.4 are implemented as safe, fail-closed local readiness work:

- `npm run snapshot:prepare-hosted` prepares and validates the gitignored export.
- `npm run hosted:publish:dry-run` validates the prepared export and prints the Supabase target without upload.
- `npm run hosted:publish -- --upload` is the only command that can upload, and it requires real local `.env.publish` credentials.
- The frontend can now distinguish local/prepared/remote data sources plus unavailable/auth/stale states.

Next true product step is P5.5: implement the actual Supabase Auth wall and hosted deployment target after Raz provides/chooses the project/account/domain.

<!-- authored by Mia, 2026-06-02 -->
