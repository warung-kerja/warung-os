# Warung OS — Auth-Gated Hosted Mirror Architecture

**Status:** Phase 5 frozen / parked as of 2026-06-05. P5.1-P5.4 readiness is implemented fail-closed and Vercel deployment is live (public, no-auth), but hosted/auth work is no longer active.
**Owner:** Mia (tech lead), Raz (approval required before live deployment/account changes)
**Date:** 2026-06-01; reopened 2026-06-02; updated 2026-06-03 (auth gate deferred); frozen 2026-06-05
**Implements:** CLAUDE.md § Remote access direction; Epic Phase 5 — Hosted mirror

> **Note (2026-06-05):** Warung OS is live at `warung-os-online.vercel.app` (public, no-auth), and Raz froze Phase 5 for now.
> This document is retained as a future architecture reference only. Do not continue auth, Supabase, Vercel, deployment, or publisher work unless Raz explicitly reopens Phase 5. Current active work has moved back to the core product MVP.

---

## Goal

Allow Raz to access a read-only Warung OS dashboard from any computer without exposing
the local workstation, granting shell access, or running live local commands remotely.

Reference model: Mission Control Online (Supabase + Vercel, same Raz account).

---

## System boundary map

```
LOCAL MACHINE (Raz's workstation)
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Hermes profiles / Obsidian / TickTick / git        │
│         ↓  (read-only, sanitized)                   │
│  npm run snapshot:generate                          │
│         ↓                                           │
│  public/snapshots/latest.json  (gitignored)         │
│         ↓                                           │
│  npm run snapshot:prepare-hosted                      │
│         ↓                                           │
│  hosted-export/latest.json + manifest (gitignored) │
│         ↓                                           │
│  npm run hosted:publish -- --upload                 │
│         ↓  (never pushes secrets or transcripts)    │
└─────────────────────────────────────────────────────┘
               │
               │  HTTPS, service-role key (local only)
               ▼
HOSTED STORAGE (Supabase)
┌─────────────────────────────────────────────────────┐
│  Supabase Storage bucket  OR  Supabase DB tables    │
│  Private bucket / RLS enforced                      │
│  Auth: razifdjamaludin@gmail.com only               │
│  Sync_requests table (refresh / action requests)    │
└─────────────────────────────────────────────────────┘
               │
               │  Supabase Auth JWT (browser session)
               ▼
HOSTED APP (Vercel)
┌─────────────────────────────────────────────────────┐
│  Warung OS React/Vite app (static build)            │
│  Auth wall: magic link → razifdjamaludin@gmail.com  │
│  Reads snapshot from Supabase (read-only)           │
│  Browser actions → sync_requests only (no shell)    │
└─────────────────────────────────────────────────────┘
```

---

## Phase 5 components

### 1. Local snapshot publisher (new script)

`scripts/publish-snapshot.mjs`

Responsibilities:
- Runs after `npm run snapshot:prepare-hosted` validates and packages the local export.
- Verifies `hosted-export/latest.json` against `hosted-export/manifest.json` before upload.
- Defaults to dry-run via `npm run hosted:publish:dry-run`; no upload happens unless `--upload` is passed.
- Pushes the prepared snapshot to Supabase Storage when real local `.env.publish` credentials exist.
- Uses the Supabase service-role key from a local `.env.publish` file (never committed).
- Never executes browser-originated commands — publisher is always local/Hermes-side.

Trigger options:
- Dry-run validation: `npm run hosted:publish:dry-run`
- Manual upload: `npm run hosted:publish -- --upload`
- Scheduled: Hermes cron job later, on Raz's local machine only, after upload credentials are confirmed.

Safety contract:
- Same redaction rules as `generate-snapshot.mjs` (no secrets, OAuth tokens, transcripts, raw memories).
- Source scope `hermes-only` is preserved in the published payload.
- Platform credentials (Telegram/Discord tokens) are never in the snapshot — only platform names and connectivity states.
- `is_demo: false` snapshots are not committed to git; they live only in Supabase Storage.

### 2. Hosted storage (Supabase)

Two viable options — choose before implementing Phase 5:

**Option A — Supabase Storage bucket (recommended starting point)**

- Single private bucket `warung-os-snapshots`.
- Publisher uploads `latest.json` (and optionally versioned `snapshots/YYYY-MM-DD-HH-MM.json`).
- Hosted app fetches a signed URL via Supabase client (requires auth session).
- Simpler than DB tables; consistent with snapshot-first architecture already in place.
- No schema migrations needed; app deserializes the same `WarungSnapshot` type it already knows.

**Option B — Supabase DB tables (MCO-identical pattern)**

- Tables mirror snapshot sections: `projects`, `operations_cron_jobs`, `operations_source_health`, `sync_runs`, etc.
- Publisher upserts rows using service-role key.
- Hosted app reads via RLS-protected queries (anon key, auth session required).
- More structured; supports per-table queries and partial data fetching.
- Requires DB schema migrations and more complex publisher logic.
- Only prefer this if Warung OS needs server-side queries or filtering.

**Recommendation:** Start with Option A (Storage bucket). The snapshot model is already typed,
validated, and tested. Migrate to Option B only if query-level access control is needed.

### 3. Supabase Auth

- Provider: Supabase Auth (magic link / OTP, no OAuth providers needed).
- Allowlist: `razifdjamaludin@gmail.com` only.
- Enforced at **both** RLS policy level AND application middleware — frontend check alone is not sufficient.
- Session: Supabase JWT, persisted in browser localStorage or cookie.
- No new accounts, no social login, no shared passwords.

RLS policy sketch (Storage bucket):

```sql
-- Only authenticated users whose email matches the allowlist can read.
CREATE POLICY "raz_only_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    auth.email() = 'razifdjamaludin@gmail.com'
    AND bucket_id = 'warung-os-snapshots'
  );

-- Publisher uses service-role key (bypasses RLS) — runs locally only.
```

### 4. Hosted app (Vercel)

- Deploy the existing `npm run build` output to Vercel (free tier, existing account).
- Add a Supabase client with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars.
- Auth wall: unauthenticated visitors see a login page only; no data is fetched or rendered.
- On auth: fetch snapshot from Supabase Storage and initialize `WarungData` via `snapshotLoader.ts`.
- Data flow is identical to local mode — same `WarungSnapshot` type, same React components.
- No server-side rendering required; the app remains a static SPA.

New env vars (Vercel):
- `VITE_SUPABASE_URL` — Supabase project URL (not secret; safe in frontend bundle).
- `VITE_SUPABASE_ANON_KEY` — anon/public key (not secret; safe in frontend bundle).

Local-only (never in repo or Vercel):
- `SUPABASE_SERVICE_ROLE_KEY` — publisher only, stays in `.env.publish` on local machine.

### 5. Browser action model (request/approval)

The hosted app must never execute arbitrary commands. Browser actions follow a request/approval pattern:

```
Browser → POST to Supabase DB (sync_requests table, status: pending)
             ↓
Local publisher bridge polls sync_requests every 30s
             ↓
Publisher executes approved action locally (snapshot generate + publish)
             ↓
Publisher updates sync_requests row: status → running → completed / failed
             ↓
Browser sees updated status on next poll / real-time subscription
```

Approved browser-initiated actions:
| Action | What happens locally | Safety |
|--------|---------------------|--------|
| Refresh snapshot | Publisher runs generate + publish cycle | Local only, no remote shell |
| Mark stale / skip | Status-only DB update | No local execution |

Explicitly not supported without Raz approval:
- Triggering Hermes cron jobs remotely.
- Modifying local files from browser.
- Sending messages to external platforms.
- Any action that requires secret/credential access.

The `sync_requests` table shape (already in `src/types/warung-os.ts` as `SyncRequest`):

```typescript
interface SyncRequest {
  id: string
  requested_by: string | null   // 'raz-browser'
  requested_at: string          // ISO 8601
  status: 'pending' | 'running' | 'completed' | 'failed' | 'expired'
  started_at: string | null
  completed_at: string | null
  handled_by: string | null     // 'local-publisher'
  error: string | null
}
```

---

## Snapshot freshness in hosted context

The hosted app should show `DATA SOURCE: STALE` when the snapshot is older than a threshold.

Proposed `max_age_minutes` extension to `SnapshotMeta` (implemented in Phase 5):

```typescript
interface SnapshotMeta {
  // ... existing fields ...
  max_age_minutes?: number    // e.g. 60 — hosted app shows STALE after this
  published_at?: string       // ISO 8601 — when publisher pushed to Supabase
}
```

Freshness display logic (hosted only):
- `fresh`: snapshot age < `max_age_minutes`.
- `stale`: snapshot age >= `max_age_minutes`.
- `unavailable`: Supabase fetch failed or user is not authenticated.

---

## Security assumptions

| Assumption | Rationale |
|------------|-----------|
| Supabase service-role key stays on local machine only | Publisher runs locally; key is never committed or sent to Vercel |
| RLS enforces auth at DB/Storage level | Frontend auth check alone is insufficient — RLS is the real guard |
| Snapshot contains no secrets | Snapshot contract safety rules already enforce this |
| Browser cannot initiate shell commands | `sync_requests` model limits browser actions to data records only |
| Publisher is the only write path | Browser is read-only; no upsert or delete from Vercel app |
| Magic link auth only | No OAuth tokens needed; Supabase handles session lifecycle |
| Allowlist is email-based | Only `razifdjamaludin@gmail.com` can authenticate |

---

## What this document does NOT authorise

- Actual Supabase project creation or configuration changes.
- Actual Vercel deployment or domain setup.
- Use of any new paid accounts or services.
- Connecting to external systems beyond Raz's existing Supabase/Vercel account.

**All of the above require explicit Raz sign-off before implementation.**

---

## Implementation sequence (Phase 5)

1. Done: Safe local prep via `scripts/prepare-hosted-snapshot.mjs` validates and packages a hosted export without uploading anything.
2. Done: Hosted data-source boundary supports local/prepared/remote modes with stale/auth/unavailable states.
3. Done: Supabase/Vercel config templates document private bucket defaults and local-only publisher secrets.
4. Done: `scripts/publish-snapshot.mjs` validates the prepared export, defaults to dry-run, and fails closed without `.env.publish` + `--upload`.
5. Next: choose/confirm Supabase project and create private Storage bucket/RLS policy.
6. Next: add Supabase client and auth wall to the React app.
7. Next: deploy to Vercel with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set.
8. Later: write local publisher bridge with `sync_requests` poll loop if browser-originated refresh requests are still desired.
9. QA: verify RLS blocks unauthenticated access, stale label shows correctly, browser actions only write to `sync_requests`.

---

## Open decisions for Raz

| # | Decision | Options | Default if not decided |
|---|----------|---------|----------------------|
| 1 | Storage vs DB tables | Option A (Storage) or Option B (DB tables) | Option A |
| 2 | Supabase project | Reuse MCO project or create a new one in existing account | New project in existing account |
| 3 | Snapshot publish frequency | Manual only, or Hermes cron (e.g. hourly) | Manual only |
| 4 | Snapshot versioning | Latest-only or keep dated versions | Latest-only |
| 5 | `max_age_minutes` threshold | 30, 60, or 120 minutes | 60 minutes |
| 6 | Hosted domain | Vercel default subdomain or custom domain | Vercel default |

<!-- authored by Mia, 2026-06-01 — Phase 3 slice: hosted mirror architecture draft -->
